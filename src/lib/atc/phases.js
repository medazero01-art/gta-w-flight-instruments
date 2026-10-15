// Shared by both editions and every phraseology.

export const CHAT_LIMIT = 300;
export const ATC_PREFIX = "/atc ";

// Labels are English keys, translated by the UI (see lib/i18n.js). `heliLabel` replaces the
// label for helicopters, who may land straight on a helipad or a site instead of flying a pattern.
export const PHASES = [
  { id: "clearance", label: "Clearance", airport: "dep" },
  { id: "ground", label: "Ground", airport: "dep" },
  { id: "departure", label: "Departure", airport: "dep" },
  { id: "enroute", label: "En route", airport: null },
  { id: "arrival", label: "Arrival", airport: "arr" },
  { id: "pattern", label: "Pattern", heliLabel: "Landing", airport: "arr" },
  { id: "taxiin", label: "Taxi in", heliLabel: "After landing", airport: "arr" },
];

// The airport the current call is about: the one we're calling on CTAF, else the phase's airport.
export function contextAirport(flight) {
  if (flight.calling !== "SA") return flight.calling;
  const phase = PHASES.find((p) => p.id === flight.phase);
  return phase?.airport === "dep" ? flight.dep : flight.arr;
}

// Joins sentence fragments, adding the final period where missing.
export const joinSentences = (parts) =>
  parts
    .filter(Boolean)
    .map((p) => (/[.!?]$/.test(p) ? p : `${p}.`))
    .join(" ");

// Tail numbers are uppercased ("n123ab" -> "N123AB"); airline callsigns keep their case ("IMEX Air 434").
export function displayCallsign(typed) {
  const trimmed = typed.trim();
  return (/\s/.test(trimmed) ? trimmed : trimmed.toUpperCase()) || "[CALLSIGN]";
}
