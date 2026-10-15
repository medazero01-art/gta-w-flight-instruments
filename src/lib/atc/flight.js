import { AIRFIELDS } from "./airfields";
import { PHASES } from "./phases";

const byAirport = (airports, pick) =>
  Object.fromEntries(Object.values(airports).map((airport) => [airport.icao, pick(airport)]));

// `airfields` is the edition's entry in AIRFIELDS: runways and stands differ between servers.
export const defaultFlight = (airfields = AIRFIELDS.en) => ({
  airfields: airfields.version,
  // Setup
  // "airplane" or "helicopter" (rotorcraft calls, hover taxi, helipads, off-site landings).
  aircraft: "airplane",
  // Helicopter mission: "civil", "medevac" (MEDEVAC callsign prefix) or "sd".
  heliRole: "civil",
  // Helicopter departure / arrival point: "spot" (parking or helipad, lift-off/landing right there),
  // "runway" (hover taxi to/from the runway) or "site" (off-airfield: hospital, scene… named below).
  depPoint: "spot",
  arrPoint: "spot",
  depSite: "",
  arrSite: "",
  // Where the takeoff briefing says we autorotate to after an engine failure.
  autoSite: "",
  callsign: "",
  // Tail number shown on radar.gta.world when the radio callsign differs (e.g. "IMEX Air 434" flies N434IA).
  registration: "",
  rules: "VFR",
  dep: "KLSI",
  arr: "KSSA",
  medevac: false,
  formation: false,
  formationCount: 2,
  // Blank = "aircraft" / "appareils" in the calls.
  formationType: "",
  runwayStyle: "spoken",
  autoAdvance: true,
  radarOn: false,
  // When on, altitude, place, heading and inbound direction follow the radar.
  radarSync: true,
  // Taxi via/hold computed from the airport diagram for the chosen spot and runway.
  autoRoute: true,
  // GTA map under the radar: "dim" (night cockpit), "bright" or "off".
  mapStyle: "dim",
  // Live
  mode: "CTAF",
  phase: "ground",
  calling: "KLSI",
  runways: byAirport(airfields.airports, (a) => a.defaultRunway),
  spots: byAirport(airfields.airports, (a) => a.spots[0]),
  via: [],
  hold: "",
  face: "west",
  dir: "north",
  from: "west",
  landmark: "",
  alt: 1500,
  target: 1500,
  pattern: "left",
  landing: "full",
  // "on" (On final) or "turning" (Turning final).
  finalVerb: "on",
  route: "",
  // GTA World France: what we do at the stand after landing ("parking", "loading", "standby"),
  // a flight plan destination that is not an airport ("Océan pacifique") and the mission.
  purpose: "parking",
  planDest: "",
  mission: "",
});

export const isHeli = (flight) => flight.aircraft === "helicopter";

// Where a helicopter is for this phase: "spot", "runway" or "site". Airplanes always use runways.
export function heliPoint(flight, phaseId = flight.phase) {
  if (!isHeli(flight)) return "runway";
  const side = PHASES.find((p) => p.id === phaseId)?.airport;
  if (side === "dep") return flight.depPoint;
  if (side === "arr") return flight.arrPoint;
  return null;
}

// Who we talk to on CTAF follows the phase: departure airport, then San Andreas, then arrival.
// A helicopter at an off-airfield site talks to San Andreas Traffic.
export function callingForPhase(phaseId, flight) {
  const phase = PHASES.find((p) => p.id === phaseId);
  if (heliPoint(flight, phaseId) === "site") return "SA";
  if (phase?.airport === "dep") return flight.dep;
  if (phase?.airport === "arr") return flight.arr;
  return "SA";
}

// First phase of a new flight: a helicopter lifting off from its spot or a site has no taxi call.
export function firstPhase(flight) {
  if (flight.mode === "CENTER") return "clearance";
  return isHeli(flight) && flight.depPoint !== "runway" ? "departure" : "ground";
}

export function withPhase(flight, phaseId) {
  return { ...flight, phase: phaseId, calling: callingForPhase(phaseId, flight), via: [] };
}

export const radarIds = (flight) => [flight.registration, flight.callsign].filter(Boolean);

// A new flight keeps the pilot's identity and preferences, resets everything else.
export function newFlight(flight, airfields) {
  const kept = [
    "callsign", "registration", "rules", "dep", "arr", "medevac", "formation", "formationCount", "formationType",
    "runwayStyle", "autoAdvance", "radarOn", "radarSync", "autoRoute", "mapStyle", "mode",
    "aircraft", "heliRole", "depPoint", "arrPoint", "depSite", "arrSite", "autoSite",
  ];
  const base = defaultFlight(airfields);
  const next = { ...base, ...Object.fromEntries(kept.map((key) => [key, flight[key] ?? base[key]])) };
  const phase = firstPhase(next);
  return { ...next, phase, calling: callingForPhase(phase, next) };
}

// Saved state from an older version may miss keys: defaults fill the gaps. Runways and stands
// saved for another set of airfields (flights saved before GTA World France got its own) are dropped.
export function restoreFlight(saved, airfields = AIRFIELDS.en) {
  const base = defaultFlight(airfields);
  if (!saved || typeof saved !== "object") return base;
  const sameAirfields = (saved.airfields ?? AIRFIELDS.en.version) === airfields.version;
  const runways = { ...base.runways };
  for (const [icao, rwy] of Object.entries((sameAirfields && saved.runways) || {})) {
    if (airfields.airports[icao]?.runwayEnds.some((end) => end.id === rwy)) runways[icao] = rwy;
  }
  return {
    ...base,
    ...saved,
    airfields: airfields.version,
    runways,
    spots: { ...base.spots, ...(sameAirfields ? saved.spots : {}) },
    via: Array.isArray(saved.via) ? saved.via : [],
    finalVerb: saved.finalVerb === "turning" ? "turning" : "on",
  };
}
