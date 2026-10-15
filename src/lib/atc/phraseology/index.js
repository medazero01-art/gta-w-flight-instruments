import * as en from "./en";
import * as fr from "./fr";

// Same API in every language: buildCalls, buildEmergency, emergencyActions, formatAltitude,
// formatVia, STATION, trafficLabel, LANDING_TYPES, FINAL_TYPES, MAYDAY/PAN_SITUATIONS.
const PHRASEOLOGIES = { en, fr };

export const phraseologyFor = (lang) => PHRASEOLOGIES[lang] || en;
