import { AIRPORTS } from "../airports";
import { contextAirport, displayCallsign } from "../phases";

// GTA World France. Same structure as the English calls, worded the French way
// (auto-information style on CTAF):
// CTAF     -> [Terrain] Trafic. [Indicatif]. [Position]. [Intention]. [Terrain].
// Contrôle -> San Andreas Contrôle. [Indicatif]. [Position]. [Demande].
// Kept in one place so the wording can follow what instructors on the server expect.

export const STATION = "San Andreas Contrôle";
export const trafficLabel = (name) => `${name} Trafic`;

export const LANDING_TYPES = [
  { value: "full", label: "Complet" },
  { value: "touch", label: "Touch & go" },
  { value: "stop", label: "Stop & go" },
];

export const FINAL_TYPES = [
  { value: "on", label: "En finale" },
  { value: "turning", label: "Dernier virage" },
];

export const MAYDAY_SITUATIONS = [
  "Panne moteur totale",
  "Panne moteur partielle",
  "Feu à bord",
  "Feu moteur",
  "Dommages structurels",
];

export const PAN_SITUATIONS = [
  "Train d'atterrissage bloqué",
  "Passager malade à bord",
  "Carburant bas",
  "Moteur qui tourne irrégulièrement",
  "Collision aviaire",
];

// 1500 -> "1 500 ft" (plain space: the game chat may not like narrow no-break spaces).
export const formatAltitude = (ft) => `${String(Math.round(Number(ft) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ft`;

export function formatRunway(id, style = "spoken") {
  if (!id) return "piste";
  if (style === "compact") return `piste ${id}`;
  const match = id.match(/^(\d{1,2})([LRC])?$/);
  if (!match) return `piste ${id}`;
  const digits = match[1].padStart(2, "0").split("").join("-");
  const side = { L: " gauche", R: " droite", C: " centre" }[match[2]] || "";
  return `piste ${digits}${side}`;
}

// ["A", "C", "D"] -> "A, C et D"
export const formatList = (items) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;

// Route tokens come from the taxi graph in English ("crossing Runway 12L/30R").
export function formatVia(tokens) {
  const parts = [];
  let group = [];
  for (const token of tokens) {
    const crossing = token.match(/^crossing Runway (.+)$/);
    if (crossing) {
      if (group.length) parts.push(formatList(group));
      parts.push(`en traversant la piste ${crossing[1]}`);
      group = [];
    } else {
      group.push(token);
    }
  }
  if (group.length) parts.push(formatList(group));
  return parts.join(", ");
}

const DIRECTIONS = {
  north: { le: "le nord", du: "du nord", au: "au nord" },
  northeast: { le: "le nord-est", du: "du nord-est", au: "au nord-est" },
  east: { le: "l'est", du: "de l'est", au: "à l'est" },
  southeast: { le: "le sud-est", du: "du sud-est", au: "au sud-est" },
  south: { le: "le sud", du: "du sud", au: "au sud" },
  southwest: { le: "le sud-ouest", du: "du sud-ouest", au: "au sud-ouest" },
  west: { le: "l'ouest", du: "de l'ouest", au: "à l'ouest" },
  northwest: { le: "le nord-ouest", du: "du nord-ouest", au: "au nord-ouest" },
};
const dir = (value) => DIRECTIONS[value] || DIRECTIONS.north;

// Parking spots keep their chart names in the UI; on the radio they get French words and an article.
const SPOTS = {
  "Devin Weston Apron": "l'aire de trafic Devin Weston",
  "GA Parking": "le parking aviation générale",
  "IMEX Hangar": "le hangar IMEX",
  "South Terminal": "le terminal sud",
  "Pegasus Hangar": "le hangar Pegasus",
  "South Aircraft Maintenance Area": "la zone de maintenance sud",
  "Dale-Kelly Apron": "l'aire de trafic Dale-Kelly",
  "Fuel Farm": "le dépôt carburant",
  Hangar: "le hangar",
  "Maintenance Area": "la zone de maintenance",
  Terminal: "le terminal",
  Helipad: "l'hélisurface",
};

function spotPhrase(spot) {
  const name = (spot || "").trim();
  if (!name) return "l'aire de trafic";
  if (SPOTS[name]) return SPOTS[name];
  if (/^P\d+$/i.test(name)) return `le parking ${name.toUpperCase()}`;
  if (/^H\d+$/i.test(name)) return `le hangar ${name.toUpperCase()}`;
  return name;
}

// "le hangar IMEX" -> "au hangar IMEX", "l'aire…" -> "à l'aire…", "Gate 8" -> "à Gate 8".
function at(phrase) {
  if (phrase.startsWith("le ")) return `au ${phrase.slice(3)}`;
  if (phrase.startsWith("les ")) return `aux ${phrase.slice(4)}`;
  return `à ${phrase}`;
}

// "le hangar IMEX" -> "du hangar IMEX", "l'hélisurface" -> "de l'hélisurface".
function from(phrase) {
  if (phrase.startsWith("le ")) return `du ${phrase.slice(3)}`;
  if (phrase.startsWith("les ")) return `des ${phrase.slice(4)}`;
  return `de ${phrase}`;
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Like the shared joinSentences, but fragments are written lowercase and capitalized here.
const join = (parts) =>
  parts
    .filter(Boolean)
    .map((p) => capitalize(/[.!?]$/.test(p) ? p : `${p}.`))
    .join(" ");

function buildContext(flight) {
  const icao = contextAirport(flight);
  const airport = AIRPORTS[icao];
  const dep = AIRPORTS[flight.dep];
  const arr = AIRPORTS[flight.arr];
  const callingName = flight.calling === "SA" ? "San Andreas" : AIRPORTS[flight.calling].traffic;

  const callsign = displayCallsign(flight.callsign);
  let who = `${flight.medevac ? "MEDEVAC " : ""}${callsign}`;
  if (flight.formation) who += `, patrouille de ${flight.formationCount} ${flight.formationType.trim() || "appareils"}`;

  const side = flight.pattern === "right" ? "main droite" : "main gauche";
  const landing = {
    full: "atterrissage complet",
    touch: `touch and go, reste dans le circuit ${side}`,
    stop: `stop and go, reste dans le circuit ${side}`,
  }[flight.landing];
  const spot = spotPhrase(flight.spots[icao]);

  return {
    center: flight.mode === "CENTER",
    vfr: flight.rules === "VFR",
    callsign,
    who,
    open: trafficLabel(callingName),
    close: callingName,
    airport,
    dep,
    arr,
    rwy: formatRunway(flight.runways[icao], flight.runwayStyle),
    spot,
    atSpot: at(spot),
    via: formatVia(flight.via),
    hold: flight.hold.trim(),
    face: dir(flight.face),
    dir: dir(flight.dir),
    from: dir(flight.from),
    landmark: flight.landmark.trim(),
    alt: formatAltitude(flight.alt),
    altFt: Number(flight.alt),
    target: formatAltitude(flight.target),
    targetFt: Number(flight.target),
    side,
    landing,
    landingKey: flight.landing,
    finalVerb: flight.finalVerb === "turning" ? "dernier virage" : "en finale",
    route: flight.route.trim(),
    rules: flight.rules,
    // Helicopter: where we lift off from / land, as said on the radio.
    depSpot: spotPhrase(flight.spots[flight.dep]),
    arrSpot: spotPhrase(flight.spots[flight.arr]),
    depSite: flight.depSite.trim() || "[site]",
    arrSite: flight.arrSite.trim() || "[site]",
    depPoint: flight.depPoint,
    arrPoint: flight.arrPoint,
    autoSite: flight.autoSite.trim(),
  };
}

const ctaf = (c, ...body) => join([c.open, c.who, ...body, c.close]);
const center = (c, ...body) => join([STATION, c.who, ...body]);

const overhead = (c) => (c.landmark ? `verticale ${c.landmark} à ${c.alt}` : `à ${c.alt}`);
const altitudeChange = (c) =>
  c.targetFt === c.altFt ? null : `${c.targetFt > c.altFt ? "monte" : "descend"} vers ${c.target}`;
const inbound = (c) => `en provenance ${c.from.du}${c.landmark ? `, verticale ${c.landmark},` : ""} à ${c.alt}`;
const TARGET_HINT = "Choisissez une altitude cible différente de l'altitude actuelle.";

const CTAF_CALLS = {
  clearance: () => [],
  ground: (c) => [
    { id: "pushback", label: "Repoussage", text: ctaf(c, c.atSpot, `repousse face ${c.face.au}`) },
    {
      id: "taxi",
      label: "Roulage vers la piste",
      text: ctaf(c, c.atSpot, `roule vers la ${c.rwy}${c.via ? ` via ${c.via}` : ""}`),
      next: "departure",
    },
  ],
  departure: (c) => [
    {
      id: "takeoff",
      label: "Décollage, départ",
      text: ctaf(c, `s'aligne et décolle ${c.rwy}`, `départ vers ${c.dir.le}`, `montée vers ${c.target}`),
      next: "enroute",
    },
    {
      id: "takeoff-pattern",
      label: "Décollage, tour de piste",
      text: ctaf(c, `s'aligne et décolle ${c.rwy}`, `reste dans le circuit ${c.side}`),
      next: "pattern",
    },
  ],
  enroute: (c) => [
    {
      id: "position",
      label: "Compte rendu de position",
      text: ctaf(c, overhead(c), `poursuit vers ${c.dir.le} en direction de ${c.arr.shortName}`),
    },
    {
      id: "position-turn",
      label: "Position, virage",
      text: ctaf(c, overhead(c), `vire vers ${c.dir.le} en direction de ${c.arr.shortName}`),
    },
    {
      id: "altitude",
      label: "Changement d'altitude",
      text: altitudeChange(c) ? ctaf(c, overhead(c), altitudeChange(c)) : null,
      hint: TARGET_HINT,
    },
  ],
  arrival: (c) => {
    const joining = c.targetFt < c.altFt ? `descend vers ${c.target} et rejoint` : "rejoint";
    return [
      {
        id: "pattern-entry",
        label: "Intégration du circuit",
        text: ctaf(c, inbound(c), `${joining} la vent arrière ${c.side} ${c.rwy}`),
        next: "pattern",
      },
      {
        id: "straight-in",
        label: "Finale directe",
        text: ctaf(c, inbound(c), `pour une finale directe ${c.rwy}`),
        next: "pattern",
      },
    ];
  },
  pattern: (c) => [
    { id: "downwind", label: "Vent arrière", text: ctaf(c, `vent arrière ${c.side} ${c.rwy}`) },
    { id: "base", label: "Étape de base", text: ctaf(c, `étape de base ${c.side} ${c.rwy}`) },
    {
      id: "final",
      label: "Finale",
      text: ctaf(c, `${c.finalVerb} ${c.rwy}`, c.landing),
      next: c.landingKey === "full" ? "taxiin" : undefined,
    },
    {
      id: "go-around",
      label: "Remise de gaz",
      text: ctaf(c, `remise de gaz ${c.rwy}`, `reste dans le circuit ${c.side}`),
    },
    {
      id: "leave-pattern",
      label: "Sortie du circuit",
      text: ctaf(c, `quitte le circuit vers ${c.dir.le}`, altitudeChange(c)),
      next: "enroute",
    },
  ],
  taxiin: (c) => [
    {
      id: "vacated",
      label: "Piste dégagée, roulage au parking",
      text: ctaf(c, `${c.rwy} dégagée`, `roule vers ${c.spot}${c.via ? ` via ${c.via}` : ""}`),
    },
  ],
};

const CENTER_CALLS = {
  clearance: (c) =>
    c.vfr
      ? [
          {
            id: "vfr-clearance",
            label: "Clairance VFR",
            text: center(c, `${c.atSpot} à ${c.dep.name}`, `demande clairance VFR vers ${c.arr.name} à ${c.target}`),
          },
        ]
      : [
          {
            id: "flight-plan",
            label: "Plan de vol (MP au contrôleur)",
            channel: "pm",
            text: `${c.callsign} | DEP: ${c.dep.icao} | ARR: ${c.arr.icao} | RTE: ${c.route || "DCT"} | ALT: ${formatAltitude(c.targetFt).toUpperCase()}`,
          },
          {
            id: "ifr-clearance",
            label: "Clairance IFR",
            text: center(c, `${c.atSpot} à ${c.dep.name}`, `IFR vers ${c.arr.name}`, "prêt à copier"),
          },
        ],
  ground: (c) => [
    { id: "pushback", label: "Demande de repoussage", text: center(c, `${c.atSpot} à ${c.dep.name}`, "demande repoussage") },
    {
      id: "taxi",
      label: "Prêt à rouler",
      text: center(c, `${c.atSpot} à ${c.dep.name}`, "prêt à rouler"),
      next: "departure",
    },
  ],
  departure: (c) => [
    {
      id: "ready",
      label: "Prêt au départ",
      text: center(c, c.hold ? `au point d'attente ${c.hold}, ${c.rwy}` : `au point d'attente ${c.rwy}`, "prêt au départ"),
      next: "enroute",
    },
  ],
  enroute: (c) => [
    { id: "position", label: "Compte rendu de position", text: center(c, overhead(c)) },
    {
      id: "altitude",
      label: c.targetFt > c.altFt ? "Demande de montée" : "Demande de descente",
      text:
        c.targetFt === c.altFt
          ? null
          : center(c, overhead(c), `demande ${c.targetFt > c.altFt ? "montée" : "descente"} vers ${c.target}`),
      hint: TARGET_HINT,
    },
    { id: "lower", label: "Demande une altitude inférieure", text: center(c, overhead(c), "demande une altitude inférieure") },
  ],
  arrival: (c) => [
    {
      id: "inbound",
      label: "Arrivée pour atterrissage",
      text: center(c, inbound(c), `demande atterrissage à ${c.arr.name}`),
      next: "pattern",
    },
  ],
  pattern: (c) => [
    {
      id: "final",
      label: "Finale",
      text: center(c, `${c.finalVerb} ${c.rwy}`, c.vfr ? c.landing : null),
      next: c.landingKey === "full" ? "taxiin" : undefined,
    },
    { id: "go-around", label: "Remise de gaz", text: center(c, `remise de gaz ${c.rwy}`) },
  ],
  taxiin: (c) => [
    {
      id: "vacated",
      label: "Piste dégagée",
      text: center(c, `${c.rwy} dégagée${c.via ? ` par ${c.via}` : ""}`, `demande roulage vers ${c.spot}`),
    },
  ],
};

/* ---------------------------------------------------------------- hélicoptères */

// Syllabus Rotorcraft de la SAAA : translation (roulage en stationnaire) à 10 ft, décollage
// d'une piste, d'une hélisurface ou d'un parking, poser sur piste ou direct sur l'hélisurface,
// poser hors aérodrome après reconnaissance de la zone. Le travail sur piste reprend les messages avion.
const depWhere = (c) => (c.depPoint === "site" ? c.depSite : c.depSpot);
const depLong = (c) => (c.depPoint === "site" ? c.depSite : `${c.depSpot} à ${c.dep.name}`);
const arrLong = (c) => (c.arrPoint === "site" ? c.arrSite : c.arrPoint === "spot" ? `${c.arrSpot} à ${c.arr.name}` : c.arr.name);
// "à Pillbox Hill Medical Center" for a site, "au hangar IMEX à …" for a spot.
const atDep = (c) => (c.depPoint === "site" ? `à ${c.depSite}` : at(depLong(c)));
const atArr = (c) => (c.arrPoint === "site" ? `à ${c.arrSite}` : at(c.arrSpot));

// Le briefing de décollage du syllabus, dit à l'équipage (pas sur la fréquence).
// En deux lignes pour rester sous la limite du chat : intentions, puis urgences.
function briefingCalls(c) {
  const where = c.depPoint === "runway" ? `de la ${c.rwy} à ${c.dep.name}` : from(depLong(c));
  const over = c.landmark ? `, verticale ${c.landmark},` : "";
  return [
    {
      id: "briefing-1",
      label: "Briefing décollage 1/2 (équipage)",
      channel: "say",
      text: join([`nous décollons ${where}`, `après le décollage, nous monterons à ${c.target} et poursuivrons vers ${c.dir.le}${over} en ${c.rules} vers ${arrLong(c)}`]),
    },
    {
      id: "briefing-2",
      label: "Briefing décollage 2/2 (équipage)",
      channel: "say",
      text: join([
        "en cas d'urgence, nous la traiterons en montée",
        `en cas de panne moteur, nous effectuerons une autorotation vers ${c.autoSite || "la zone dégagée la plus sûre devant nous"}`,
      ]),
    },
  ];
}

const HELI_CTAF_CALLS = {
  clearance: () => [],
  ground: (c) =>
    c.depPoint === "runway"
      ? [
          {
            id: "hover-taxi",
            label: "Translation vers la piste",
            text: ctaf(c, at(c.depSpot), `en translation vers la ${c.rwy}${c.via ? ` via ${c.via}` : ""}`),
            next: "departure",
          },
        ]
      : [],
  departure: (c) => [
    ...(c.depPoint === "runway"
      ? CTAF_CALLS.departure(c)
      : [
          {
            id: "lift-off",
            label: "Décollage, départ",
            text: ctaf(c, `décolle ${from(depWhere(c))}`, `départ vers ${c.dir.le}`, `montée vers ${c.target}`),
            next: "enroute",
          },
        ]),
    ...briefingCalls(c),
  ],
  enroute: (c) => CTAF_CALLS.enroute(c),
  arrival: (c) => {
    if (c.arrPoint === "runway") return CTAF_CALLS.arrival(c);
    if (c.arrPoint === "site") {
      return [
        {
          id: "assess",
          label: "Arrivée, reconnaissance de la zone",
          text: ctaf(c, inbound(c), `en orbite au-dessus de ${c.arrSite} pour reconnaître la zone de poser`),
          next: "pattern",
        },
      ];
    }
    return [
      {
        id: "inbound-spot",
        label: "Arrivée, poser direct",
        text: ctaf(c, inbound(c), `poser direct ${at(c.arrSpot)}`),
        next: "pattern",
      },
    ];
  },
  pattern: (c) =>
    c.arrPoint === "runway"
      ? CTAF_CALLS.pattern(c)
      : [
          {
            id: "landing",
            label: c.arrPoint === "site" ? "Poser sur la zone" : "Courte finale",
            text: ctaf(c, c.arrPoint === "site" ? `se pose à ${c.arrSite}` : `courte finale, poser ${at(c.arrSpot)}`),
            next: "taxiin",
          },
          { id: "go-around", label: "Remise de gaz", text: ctaf(c, "remise de gaz", c.arrPoint === "site" ? `reste au-dessus de ${c.arrSite}` : null) },
        ],
  taxiin: (c) =>
    c.arrPoint === "runway"
      ? [
          {
            id: "vacated",
            label: "Piste dégagée, translation au parking",
            text: ctaf(c, `${c.rwy} dégagée`, `en translation vers ${c.arrSpot}${c.via ? ` via ${c.via}` : ""}`),
          },
        ]
      : [{ id: "down", label: "Posé", text: ctaf(c, `posé ${atArr(c)}`) }],
};

const HELI_CENTER_CALLS = {
  clearance: (c) =>
    c.vfr
      ? [{ id: "vfr-clearance", label: "Clairance VFR", text: center(c, atDep(c), `demande clairance VFR vers ${arrLong(c)} à ${c.target}`) }]
      : CENTER_CALLS.clearance(c),
  ground: (c) =>
    c.depPoint === "runway"
      ? [{ id: "hover-taxi", label: "Demande de translation", text: center(c, atDep(c), `demande translation vers la ${c.rwy}`), next: "departure" }]
      : [],
  departure: (c) => [
    ...(c.depPoint === "runway"
      ? CENTER_CALLS.departure(c)
      : [{ id: "ready", label: "Prêt au départ", text: center(c, atDep(c), `prêt au départ vers ${c.dir.le}`), next: "enroute" }]),
    ...briefingCalls(c),
  ],
  enroute: (c) => CENTER_CALLS.enroute(c),
  arrival: (c) =>
    c.arrPoint === "runway"
      ? CENTER_CALLS.arrival(c)
      : [
          {
            id: "inbound",
            label: "Arrivée pour poser",
            text: center(c, inbound(c), `demande à se poser ${c.arrPoint === "site" ? `à ${c.arrSite}` : at(arrLong(c))}`),
            next: "pattern",
          },
        ],
  pattern: (c) =>
    c.arrPoint === "runway"
      ? CENTER_CALLS.pattern(c)
      : [
          { id: "final", label: "Courte finale", text: center(c, `courte finale, poser ${atArr(c)}`), next: "taxiin" },
          { id: "go-around", label: "Remise de gaz", text: center(c, "remise de gaz") },
        ],
  taxiin: (c) =>
    c.arrPoint === "runway"
      ? [{ id: "vacated", label: "Piste dégagée", text: center(c, `${c.rwy} dégagée${c.via ? ` par ${c.via}` : ""}`, `demande translation vers ${c.arrSpot}`) }]
      : [{ id: "down", label: "Posé", text: center(c, `posé ${atArr(c)}`) }],
};

export function buildCalls(flight) {
  const c = buildContext(flight);
  const heli = flight.aircraft === "helicopter";
  const table = c.center ? (heli ? HELI_CENTER_CALLS : CENTER_CALLS) : heli ? HELI_CTAF_CALLS : CTAF_CALLS;
  return table[flight.phase](c).map((call) => ({ channel: "atc", ...call }));
}

export const HELI_MAYDAY_SITUATIONS = ["Panne moteur", "Panne du rotor de queue", "Feu à bord", "Feu moteur", "Dommages structurels"];
export const HELI_PAN_SITUATIONS = ["Voyant limaille allumé", "Carburant bas", "Passager malade à bord", "Moteur qui tourne irrégulièrement", "Collision aviaire"];

export const emergencyActions = (flight) =>
  flight.aircraft === "helicopter"
    ? [
        { value: "autorotation", label: "Autorotation vers…" },
        { value: "land-site", label: "Poser de précaution sur…" },
        { value: "land-runway", label: "Atterrir sur la piste" },
        { value: "return-dep", label: `Retour à ${AIRPORTS[flight.dep].shortName}` },
        ...(flight.mode === "CENTER" ? [{ value: "vectors", label: "Guidage prioritaire" }] : []),
      ]
    : [
        { value: "land-runway", label: "Atterrir sur la piste" },
        { value: "land-site", label: "Atterrir sur…" },
        { value: "return-dep", label: `Retour à ${AIRPORTS[flight.dep].shortName}` },
        { value: "join-downwind", label: "Rejoindre la vent arrière" },
        ...(flight.mode === "CENTER" ? [{ value: "vectors", label: "Guidage prioritaire" }] : []),
      ];

export function buildEmergency(flight, emergency) {
  const c = buildContext(flight);
  const declaration = emergency.kind === "mayday" ? "Mayday, Mayday, Mayday" : "Pan Pan, Pan Pan, Pan Pan";
  const where = overhead(c);

  const actions = {
    "land-runway": `atterrissage d'urgence ${c.rwy}`,
    "land-site": `${flight.aircraft === "helicopter" ? "poser de précaution" : "atterrissage d'urgence"} sur ${emergency.site.trim() || "[lieu d'atterrissage]"}`,
    autorotation: `autorotation vers ${emergency.site.trim() || "[lieu d'atterrissage]"}`,
    "return-dep": `retour vers ${c.dep.name}`,
    "join-downwind": `rejoint la vent arrière ${c.side} ${c.rwy}`,
    vectors: `demande un guidage prioritaire vers ${c.arr.name}`,
  };
  const action = actions[emergency.action];

  return c.center
    ? join([declaration, STATION, c.who, emergency.situation, where, action])
    : join([declaration, c.open, c.who, emergency.situation, where, action, c.close]);
}
