import { AIRPORTS } from "./airports";
import { bearing, cardinal, distance, formatNm, roundAltitude } from "./radar";
import { PHASES } from "./phases";

const ARRIVAL_SUGGEST_M = 3000;

// Flight fields the radar can fill for the current phase. Returns null when nothing changes.
export function radarPatch(flight, own) {
  if (!own) return null;
  const patch = {};
  if (own.airborne) {
    patch.alt = roundAltitude(own.altFt);
    patch.landmark = own.place;
    if (flight.phase === "enroute") patch.dir = cardinal(own.heading);
  }
  if (flight.phase === "arrival") patch.from = cardinal(bearing(AIRPORTS[flight.arr].position, own));
  return Object.entries(patch).some(([key, value]) => flight[key] !== value) ? patch : null;
}

// Phase changes the radar thinks are due. The pilot confirms with one click.
export function radarSuggestions(flight, own) {
  if (!own) return [];
  const arr = AIRPORTS[flight.arr];
  const toArr = distance(own, arr.position);
  const suggestions = [];
  const phase = (id) => PHASES.find((p) => p.id === id).label;

  if (own.airborne && ["ground", "clearance"].includes(flight.phase)) {
    suggestions.push({ phase: "enroute", text: `Airborne at ${own.altFt.toLocaleString("en-US")}ft: ${phase("enroute")}?` });
  }
  if (own.airborne && ["departure", "enroute"].includes(flight.phase) && toArr < ARRIVAL_SUGGEST_M && flight.dep !== flight.arr) {
    suggestions.push({ phase: "arrival", text: `${formatNm(toArr)} from ${arr.shortName}: ${phase("arrival")}?` });
  }
  if (!own.airborne && own.atAirport?.icao === flight.arr && ["arrival", "pattern"].includes(flight.phase) && (own.speedKt ?? 0) < 40) {
    suggestions.push({ phase: "taxiin", text: `On the ground at ${arr.shortName}: ${phase("taxiin")}?` });
  }
  return suggestions;
}
