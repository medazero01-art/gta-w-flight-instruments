import zoneData from "./zones.json";
import { AIRPORTS } from "./airports";

// Pure geometry on GTA world coordinates (meters, +x east, +y north).

const M_TO_FT = 3.28; // same factor as radar.gta.world, so altitudes match the official radar
const M_PER_NM = 1852;
const MS_TO_KT = 1.944;
const OCEAN_CODES = new Set(["Oceana", "OCEANA"]);
// Within this distance of an airport reference point we consider the aircraft "at" it.
export const AIRPORT_RADIUS_M = 3000;

const BOXES = zoneData.zones.flatMap(([code, name, boxes]) =>
  boxes.map(([x1, y1, x2, y2]) => ({ code, name, x1, y1, x2, y2, area: (x2 - x1) * (y2 - y1), ocean: OCEAN_CODES.has(code) }))
);

export const zoneBoxes = (codes) => BOXES.filter((b) => codes.includes(b.code));

const CARDINALS = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];

export const altitudeFt = (z) => Math.round(z * M_TO_FT);
// GTA headings turn counter-clockwise (90 = west); compass headings turn clockwise.
export const compassHeading = (gtaHeading) => (((360 - Math.floor(gtaHeading)) % 360) + 360) % 360;
const octant = (deg) => Math.round((((deg % 360) + 360) % 360) / 45) % 8;
export const cardinal = (deg) => CARDINALS[octant(deg)];
export const cardinalAbbr = (deg) => ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][octant(deg)];
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const toNm = (m) => m / M_PER_NM;
export const roundAltitude = (ft, step = 100) => Math.max(0, Math.round(ft / step) * step);

// Compass bearing from a to b, 0 = north, 90 = east.
export function bearing(a, b) {
  return ((Math.atan2(b.x - a.x, b.y - a.y) * 180) / Math.PI + 360) % 360;
}

export function distanceToBox(p, b) {
  const dx = Math.max(b.x1 - p.x, 0, p.x - b.x2);
  const dy = Math.max(b.y1 - p.y, 0, p.y - b.y2);
  return Math.hypot(dx, dy);
}

const inBox = (p, b) => p.x >= b.x1 && p.x <= b.x2 && p.y >= b.y1 && p.y <= b.y2;

// Most specific zone containing the point; land always wins over ocean.
export function zoneAt(p) {
  let best = null;
  for (const b of BOXES) {
    if (!inBox(p, b)) continue;
    if (!best || (best.ocean && !b.ocean) || (best.ocean === b.ocean && b.area < best.area)) best = b;
  }
  return best;
}

// Text used after "Passing over …": the zone name, or "the ocean west of Chumash" offshore.
export function describePlace(p) {
  const zone = zoneAt(p);
  if (zone && !zone.ocean) return zone.name;
  let nearest = null;
  let nearestDist = Infinity;
  for (const b of BOXES) {
    if (b.ocean) continue;
    const d = distanceToBox(p, b);
    if (d < nearestDist) {
      nearest = b;
      nearestDist = d;
    }
  }
  if (!nearest) return "the ocean";
  const anchor = { x: Math.min(Math.max(p.x, nearest.x1), nearest.x2), y: Math.min(Math.max(p.y, nearest.y1), nearest.y2) };
  return `the ocean ${cardinal(bearing(anchor, p))} of ${nearest.name}`;
}

export function nearestAirport(p) {
  let best = null;
  for (const airport of Object.values(AIRPORTS)) {
    const d = distance(p, airport.position);
    if (!best || d < best.distanceM) best = { airport, distanceM: d, bearingFrom: bearing(airport.position, p) };
  }
  return best;
}

const compact = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export function isOwnAircraft(aircraft, ids) {
  const keys = ids.map(compact).filter(Boolean);
  return keys.includes(compact(aircraft.callsign)) || keys.includes(compact(aircraft.plate));
}

// Ground speed from two radar samples of the same aircraft.
export function groundSpeedKt(prev, next) {
  if (!prev || prev.updatedAt === next.updatedAt) return null;
  const dt = (Date.parse(next.updatedAt) - Date.parse(prev.updatedAt)) / 1000;
  if (!(dt > 0) || dt > 120) return null;
  return (distance(prev, next) / dt) * MS_TO_KT;
}

// Everything the call generator and the UI need about one aircraft.
export function describeAircraft(aircraft) {
  const altFt = altitudeFt(aircraft.z);
  const heading = compassHeading(aircraft.heading);
  const near = nearestAirport(aircraft);
  const atAirport = near && near.distanceM < AIRPORT_RADIUS_M ? near.airport : null;
  const airborne = atAirport ? altFt > atAirport.elevationFt + 100 || (aircraft.speedKt ?? 0) > 45 : true;
  return { ...aircraft, altFt, heading, place: describePlace(aircraft), near, atAirport, airborne };
}

export const formatNm = (m) => `${toNm(m).toFixed(1)} NM`;
