import * as en from "./en";
import * as fr from "./fr";

// Same API in every language: buildCalls, buildEmergency, emergencyActions, formatAltitude,
// formatVia, STATION, callingLabel, comLabel, FLIGHT_RULES, LANDING_TYPES, FINAL_TYPES,
// MAYDAY/PAN_SITUATIONS. Optional: RUNWAY_STYLES, controlKeys(flight) (the phase settings,
// else CallsPanel's own lists) and tip(flight) (a reminder under the calls).
const PHRASEOLOGIES = { en, fr };

export const phraseologyFor = (lang) => PHRASEOLOGIES[lang] || en;
