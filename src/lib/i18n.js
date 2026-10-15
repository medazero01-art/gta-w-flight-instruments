// UI strings are written in English in the components and used as keys here:
// t("Flight plan") -> "Plan de vol" in the French edition. A missing key falls back to English.
// Radio calls are not translated here: each language has its own phraseology (lib/atc/phraseology).

const FR = {
  // Phases
  Clearance: "Clairance",
  Ground: "Sol",
  Departure: "Départ",
  "En route": "En route",
  Arrival: "Arrivée",
  Pattern: "Circuit",
  "Taxi in": "Roulage retour",

  // Directions (pushback, heading, inbound)
  N: "N",
  NE: "NE",
  E: "E",
  SE: "SE",
  S: "S",
  SW: "SO",
  W: "O",
  NW: "NO",

  // Header
  "Back to the edition choice": "Retour au choix du serveur",
  "COM frequency": "Fréquence COM",
  "122.800 · ATC OFF": "122.800 · SANS ATC",
  "SA CENTER": "SA CONTRÔLE",
  "ATC ONLINE": "ATC EN LIGNE",
  "[CALLSIGN]": "[INDICATIF]",

  // Flight plan
  "Flight plan": "Plan de vol",
  "New flight": "Nouveau vol",
  Done: "OK",
  Edit: "Modifier",
  "NO CALLSIGN": "PAS D'INDICATIF",
  "FLT OF {n}": "PATROUILLE DE {n}",
  Callsign: "Indicatif",
  "N123AB or IMEX Air 434": "N123AB ou IMEX Air 434",
  "Flight rules": "Règles de vol",
  Formation: "Patrouille",
  Aircraft: "Appareils",
  Type: "Type",
  "Dodos, helicopters…": "Dodos, hélicoptères…",
  "Runway format": "Format des pistes",
  "Runway 2-1": "Piste 2-1",
  "Runway 21": "Piste 21",
  "After copying a call": "Après la copie d'un message",
  "Next phase": "Phase suivante",
  Stay: "Rester",

  // Calls
  "Flight phase": "Phase de vol",
  "CLICK OR PRESS 1-9 TO COPY": "CLIQUEZ OU TOUCHE 1-9 POUR COPIER",
  "Nothing to call in this phase.": "Aucun message dans cette phase.",
  TGT: "CIBLE",
  PM: "MP",
  COPY: "COPIER",
  "COPIED ✓": "COPIÉ ✓",
  "CLICK TO COPY": "CLIQUEZ POUR COPIER",
  "Over the 300 character chat limit: shorten the position or split the call.":
    "Plus de 300 caractères, la limite du chat : raccourcissez la position ou coupez le message en deux.",
  "Phase settings": "Réglages de la phase",
  "No clearance on CTAF. Switch COM to {station} if a controller is online.":
    "Pas de clairance en CTAF. Passez la COM sur {station} si un contrôleur est en ligne.",
  Calling: "Station appelée",
  "Runway at {airport}": "Piste à {airport}",
  "Position at {airport}": "Position à {airport}",
  "Or type it (Gate 8…)": "Ou tapez-la (Porte 8…)",
  "Custom position": "Position personnalisée",
  "Taxi route from the diagram": "Itinéraire de roulage d'après la carte",
  Auto: "Auto",
  Manual: "Manuel",
  "No taxiway needed": "Aucun taxiway nécessaire",
  "hold short of {hold}": "point d'attente {hold}",
  Use: "Utiliser",
  "No route: pick a listed parking spot (or this airport has no taxiway diagram).":
    "Pas d'itinéraire : choisissez un parking de la liste (ou cet aéroport n'a pas de carte de roulage).",
  "Taxi via": "Roulage via",
  "Add taxiway": "Ajouter un taxiway",
  Undo: "Annuler",
  Clear: "Effacer",
  "Holding short of": "Point d'attente",
  "C1 (optional)": "C1 (facultatif)",
  "Pushback, facing": "Repoussage, face",
  "Heading to the": "Cap vers le",
  "Inbound from the": "En provenance du",
  "Over / passing": "Verticale / passage",
  "Type a place or pick one": "Tapez un lieu ou choisissez-en un",
  "Current altitude": "Altitude actuelle",
  "Target altitude": "Altitude cible",
  custom: "personnalisée",
  "Traffic pattern": "Tour de piste",
  Left: "Main gauche",
  Right: "Main droite",
  "Final call": "Annonce en finale",
  Landing: "Atterrissage",
  "Route (flight plan)": "Route (plan de vol)",

  // Readback
  Readback: "Collationnement",
  Paste: "Coller",
  "Controller message: N123AB. San Andreas Center. Wind 230 at 8. Cleared for takeoff, Runway 2-1.":
    "Message du contrôleur : N123AB. San Andreas Contrôle. Vent 230, 8 nœuds. Autorisé décollage piste 2-1.",
  "Your readback": "Votre collationnement",
  "No instruction found to read back.": "Aucune instruction à collationner.",
  "Answer this yourself:": "À vous de répondre :",
  "NOT READ BACK:": "NON COLLATIONNÉ :",

  // Emergency
  "Close · Esc": "Fermer · Échap",
  Situation: "Situation",
  Action: "Action",
  "Landing site": "Lieu d'atterrissage",
  "Senora Freeway, the beach…": "Senora Freeway, la plage…",
  Passing: "Verticale",
  Altitude: "Altitude",
  "Aviate · Navigate · Communicate. A short call is fine if you have no time to type.":
    "Piloter · Naviguer · Communiquer. Un message court suffit si vous n'avez pas le temps de taper.",

  // MFD
  MAP: "CARTE",
  CHART: "AÉROPORT",
  "Moving map": "Carte mobile",
  "Map dim": "Carte sombre",
  Bright: "Claire",
  Off: "Masquée",
  Fit: "Ajuster",
  "{airport} diagram": "Carte de {airport}",
  route: "itinéraire",
  "runway (click to select)": "piste (cliquez pour choisir)",
  "parking (click to select)": "parking (cliquez pour choisir)",
  "wheel = zoom · drag = pan": "molette = zoom · glisser = déplacer",

  // Preflight
  Preflight: "Prévol",
  "LAST FLIGHT LOADED": "DERNIER VOL CHARGÉ",
  "NEW PILOT": "NOUVEAU PILOTE",
  "Starting position": "Position de départ",
  "Custom starting position": "Position de départ personnalisée",
  "Takeoff runway": "Piste de décollage",
  "Landing runway": "Piste d'atterrissage",
  "Parking after landing": "Parking après l'atterrissage",
  Frequency: "Fréquence",
  "CTAF · ATC off": "CTAF · sans ATC",
  "Airport diagram": "Carte de l'aéroport",
  "Runway {rwy}": "Piste {rwy}",
  "runway end · click": "seuil de piste · clic",
  "parking · click": "parking · clic",
  "taxi route": "itinéraire de roulage",
  "No clickable diagram for this airport yet: pick from the list.":
    "Pas encore de carte cliquable pour cet aéroport : choisissez dans la liste.",
  "Resume last session as it was · Esc": "Reprendre la dernière session telle quelle · Échap",
  "Everything stays editable afterwards.": "Tout reste modifiable ensuite.",
  "Start flight ▸": "Commencer le vol ▸",
};

const DICTIONARIES = { fr: FR };

const fill = (text, vars) => (vars ? text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m)) : text);

export function translator(lang) {
  const dict = DICTIONARIES[lang];
  return (key, vars) => fill(dict?.[key] ?? key, vars);
}
