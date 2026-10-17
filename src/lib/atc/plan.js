import { bearing, cardinal, distance } from "./radar";

// A flight plan is a list of stops flown in order. The first one is the departure; at each of
// the others the pilot makes a full stop (lands, taxis to a parking, then departs again for
// the next leg) or works the runway `count` times (touch and go, stop and go, low approach)
// before flying on. The last stop is always a full stop.
//
// stop = {
//   id,
//   icao,          // airport; for an off-airfield site, the nearest one (who we call around it)
//   type,          // "full" | "touch" | "stop" | "low"
//   count,         // how many times the runway is worked, for the repeated types
//   runway, spot,  // chosen in the plan, or "" to choose during the flight
//   point,         // helicopters: "spot" | "runway" | "site"
//   site,          // helicopters: { name, x, y } of an off-airfield site, else null
//   route,         // [{ x, y }] waypoints drawn on the map, flown before reaching this stop
// }
// plan = { stops, leg, reps }: `leg` is the index of the stop we are flying to (from 1),
// `reps` how many touch and go (…) are done at that stop.

export const STOP_TYPES = ["full", "touch", "stop", "low"];
// English UI labels (translated with t()).
export const STOP_TYPE_LABELS = { full: "Full stop", touch: "Touch & go", stop: "Stop & go", low: "Low approach" };
export const REPEATED_TYPES = ["touch", "stop", "low"];
export const MAX_REPS = 9;

let seq = 0;
export const newStopId = () => `s${Date.now().toString(36)}${(seq++).toString(36)}`;

export const makeStop = (icao, patch = {}) => ({
  id: newStopId(),
  icao,
  type: "full",
  count: 1,
  runway: "",
  spot: "",
  point: "spot",
  site: null,
  route: [],
  ...patch,
});

// Fixed ids: the default plan is built during the server render too.
export const defaultPlan = (dep = "KLSI", arr = "KSSA") => ({
  stops: [makeStop(dep, { id: "dep" }), makeStop(arr, { id: "arr" })],
  leg: 1,
  reps: 0,
});

export const isSite = (stop) => Boolean(stop?.site);
export const stopPoint = (stop, heli) => (!heli ? "runway" : isSite(stop) ? "site" : stop.point === "runway" ? "runway" : "spot");
// A helicopter landing on a spot or a site does not work a runway: always a full stop there.
export const stopType = (stop, heli) => (stopPoint(stop, heli) === "runway" ? stop.type : "full");
export const isRepeated = (stop, heli) => REPEATED_TYPES.includes(stopType(stop, heli));

export const stopPosition = (stop, airports) => (isSite(stop) && Number.isFinite(stop.site.x) ? { x: stop.site.x, y: stop.site.y } : airports[stop.icao].position);
export const stopLabel = (stop, airports) => (isSite(stop) ? stop.site.name || "site" : airports[stop.icao].code);
// Same place twice in a row: pattern work, no flying away in between.
export const samePlace = (a, b) => (isSite(a) || isSite(b) ? a.id === b.id : a.icao === b.icao);

// Points of the leg flown into stops[i]: the previous stop, the drawn waypoints, the stop.
export function legPath(plan, i, airports) {
  const stop = plan.stops[i];
  return [stopPosition(plan.stops[i - 1], airports), ...stop.route, stopPosition(stop, airports)];
}

// Direction we leave stops[i - 1] in, towards the first point of leg i.
export function outboundDir(plan, i, airports) {
  if (!plan.stops[i]) return null;
  const [a, b] = legPath(plan, i, airports);
  return distance(a, b) > 50 ? cardinal(bearing(a, b)) : null;
}

// Direction we come into stops[i] from: from its airport towards the last point before it.
export function inboundDir(plan, i, airports) {
  const path = legPath(plan, i, airports);
  const end = path[path.length - 1];
  const before = path[path.length - 2];
  return distance(end, before) > 50 ? cardinal(bearing(end, before)) : null;
}

// What the radio calls need to know about the current stop, or null without a plan.
// `leaving`: this is the last touch and go (…) here and the next stop is somewhere else, so
// the final call announces where we go next instead of "remaining in the pattern".
export function legInfo(flight, airports) {
  const plan = flight.plan;
  const stop = plan?.stops[plan.leg];
  if (!stop) return null;
  const heli = flight.aircraft === "helicopter";
  const after = plan.stops[plan.leg + 1] || null;
  const lastRep = (plan.reps || 0) + 1 >= (stop.count || 1);
  const leaving = Boolean(after && lastRep && !samePlace(stop, after));
  return {
    stop,
    after,
    type: stopType(stop, heli),
    rep: (plan.reps || 0) + 1,
    count: stop.count || 1,
    lastRep,
    leaving,
    onwardDir: after ? outboundDir(plan, plan.leg + 1, airports) : null,
    onwardName: after ? (isSite(after) ? after.site.name || "[site]" : airports[after.icao].shortName) : null,
    onwardCode: after ? stopLabel(after, airports) : null,
    // Departing for pattern work at the same airport.
    patternWork: samePlace(plan.stops[plan.leg - 1], stop),
  };
}

// Flight fields that follow from the current leg: who we fly from and to, how we land,
// the runway and parking chosen in the plan, and the directions read off the drawn route.
// `choices`: whose runway and parking from the plan to apply. "both" when the flight starts;
// "arrival" on the next legs, where the departure keeps what was used live on landing there.
export function legFields(flight, airports, choices = "both") {
  const { stops, leg } = flight.plan;
  const from = stops[leg - 1];
  const to = stops[leg];
  const heli = flight.aircraft === "helicopter";
  const runways = { ...flight.runways };
  const spots = { ...flight.spots };
  // The arrival's choices first: at the same airport, the departure's win (we start on the ground).
  if (choices !== "none") {
    if (to.runway) runways[to.icao] = to.runway;
    if (to.spot) spots[to.icao] = to.spot;
  }
  if (choices === "both") {
    if (from.runway) runways[from.icao] = from.runway;
    if (from.spot) spots[from.icao] = from.spot;
  }
  return {
    dep: from.icao,
    arr: to.icao,
    depPoint: heli ? stopPoint(from, true) : flight.depPoint,
    arrPoint: heli ? stopPoint(to, true) : flight.arrPoint,
    depSite: isSite(from) ? from.site.name : flight.depSite,
    arrSite: isSite(to) ? to.site.name : flight.arrSite,
    landing: stopType(to, heli),
    runways,
    spots,
    dir: outboundDir(flight.plan, leg, airports) || flight.dir,
    from: inboundDir(flight.plan, leg, airports) || flight.from,
  };
}

// Closest point to p on segment ab, and how far along it (0..1).
function project(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const k = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0;
  return { x: a.x + k * dx, y: a.y + k * dy, k };
}

// Where we are on the current leg: the next point of the drawn route, and what is left to fly.
// Stateless: the segment closest to the aircraft tells which waypoint comes next, so a skipped
// or overflown waypoint never leaves the guidance stuck behind.
export function nextWaypoint(path, p) {
  if (!p || path.length < 2) return null;
  let best = null;
  for (let i = 0; i < path.length - 1; i += 1) {
    const q = project(p, path[i], path[i + 1]);
    const d = distance(p, q);
    if (!best || d < best.d) best = { d, index: i + 1 };
  }
  // Right over a waypoint: aim for the one after it.
  let index = best.index;
  if (index < path.length - 1 && distance(p, path[index]) < 250) index += 1;
  const target = path[index];
  let remaining = distance(p, target);
  for (let i = index; i < path.length - 1; i += 1) remaining += distance(path[i], path[i + 1]);
  return { index, target, isStop: index === path.length - 1, distanceM: distance(p, target), bearing: bearing(p, target), remainingM: remaining, offTrackM: best.d };
}

// Saved plans from an older version, or for other airfields, are rebuilt from dep/arr.
export function sanitizePlan(plan, airports, fallback) {
  const valid =
    plan &&
    Array.isArray(plan.stops) &&
    plan.stops.length >= 2 &&
    plan.stops.every((s) => s && airports[s.icao] && Array.isArray(s.route));
  if (!valid) return fallback;
  const stops = plan.stops.map((s) => ({ ...makeStop(s.icao), ...s, count: Math.min(MAX_REPS, Math.max(1, Number(s.count) || 1)) }));
  const leg = Math.min(Math.max(1, Number(plan.leg) || 1), stops.length - 1);
  return { stops, leg, reps: Math.max(0, Number(plan.reps) || 0) };
}

export const withStop = (plan, index, patch) => ({ ...plan, stops: plan.stops.map((s, i) => (i === index ? { ...s, ...patch } : s)) });

// Runways and parkings changed in an edited plan; the others keep what the pilot set live.
export function changedChoices(oldPlan, plan, runways, spots) {
  const next = { runways: { ...runways }, spots: { ...spots } };
  for (const stop of plan.stops) {
    const old = oldPlan.stops.find((s) => s.id === stop.id);
    if (stop.runway && stop.runway !== old?.runway) next.runways[stop.icao] = stop.runway;
    if (stop.spot && stop.spot !== old?.spot) next.spots[stop.icao] = stop.spot;
  }
  return next;
}
