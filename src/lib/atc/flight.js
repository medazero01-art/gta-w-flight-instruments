import { AIRPORTS } from "./airports";
import { PHASES } from "./phases";

const byAirport = (pick) =>
  Object.fromEntries(Object.values(AIRPORTS).map((airport) => [airport.icao, pick(airport)]));

export const DEFAULT_FLIGHT = {
  // Setup
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
  runways: byAirport((a) => a.defaultRunway),
  spots: byAirport((a) => a.spots[0]),
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
};

// Who we talk to on CTAF follows the phase: departure airport, then San Andreas, then arrival.
export function callingForPhase(phaseId, flight) {
  const phase = PHASES.find((p) => p.id === phaseId);
  if (phase?.airport === "dep") return flight.dep;
  if (phase?.airport === "arr") return flight.arr;
  return "SA";
}

export function withPhase(flight, phaseId) {
  return { ...flight, phase: phaseId, calling: callingForPhase(phaseId, flight), via: [] };
}

export const radarIds = (flight) => [flight.registration, flight.callsign].filter(Boolean);

// A new flight keeps the pilot's identity and preferences, resets everything else.
export function newFlight(flight) {
  const kept = [
    "callsign", "registration", "rules", "dep", "arr", "medevac", "formation", "formationCount", "formationType",
    "runwayStyle", "autoAdvance", "radarOn", "radarSync", "autoRoute", "mapStyle", "mode",
  ];
  const { mode, dep } = flight;
  return {
    ...DEFAULT_FLIGHT,
    ...Object.fromEntries(kept.map((key) => [key, flight[key]])),
    phase: mode === "CENTER" ? "clearance" : "ground",
    calling: dep,
  };
}

// Saved state from an older version may miss keys: defaults fill the gaps.
export function restoreFlight(saved) {
  if (!saved || typeof saved !== "object") return DEFAULT_FLIGHT;
  return {
    ...DEFAULT_FLIGHT,
    ...saved,
    runways: { ...DEFAULT_FLIGHT.runways, ...saved.runways },
    spots: { ...DEFAULT_FLIGHT.spots, ...saved.spots },
    via: Array.isArray(saved.via) ? saved.via : [],
    finalVerb: saved.finalVerb === "turning" ? "turning" : "on",
  };
}
