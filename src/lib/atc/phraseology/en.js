import { AIRPORTS } from "../airports";
import { contextAirport, displayCallsign, joinSentences as join } from "../phases";

// GTA World (English). Calls follow the SAAA ATC guide:
// CTAF   -> [Who calling] Traffic. [Who you are]. [Where]. [What]. [Who calling].
// Center -> San Andreas Center. [Who you are]. [Where]. [Request].   (readback handled separately)

export const STATION = "San Andreas Center";
export const trafficLabel = (name) => `${name} Traffic`;

export const LANDING_TYPES = [
  { value: "full", label: "Full stop" },
  { value: "touch", label: "Touch & go" },
  { value: "stop", label: "Stop & go" },
];

export const FINAL_TYPES = [
  { value: "on", label: "On final" },
  { value: "turning", label: "Turning final" },
];

export const MAYDAY_SITUATIONS = [
  "Total engine failure",
  "Partial engine failure",
  "Fire on board",
  "Engine fire",
  "Structural damage",
];

export const PAN_SITUATIONS = [
  "We have a stuck landing gear",
  "We have a sick passenger",
  "Low fuel",
  "Rough running engine",
  "Bird strike",
];

export const formatAltitude = (ft) => `${Number(ft).toLocaleString("en-US")}ft`;

export function formatRunway(id, style = "spoken") {
  if (!id) return "Runway";
  if (style === "compact") return `Runway ${id}`;
  const match = id.match(/^(\d{1,2})([LRC])?$/);
  if (!match) return `Runway ${id}`;
  const digits = match[1].padStart(2, "0").split("").join("-");
  const side = { L: " Left", R: " Right", C: " Center" }[match[2]] || "";
  return `Runway ${digits}${side}`;
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// ["A", "C", "D"] -> "A, C and D"
export const formatList = (items) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

// Taxiways grouped between runway crossings:
// ["E1", "A", "crossing Runway 12L/30R", "D"] -> "E1 and A, crossing Runway 12L/30R, D"
export function formatVia(tokens) {
  const parts = [];
  let group = [];
  for (const token of tokens) {
    if (token.startsWith("crossing")) {
      if (group.length) parts.push(formatList(group));
      parts.push(token);
      group = [];
    } else {
      group.push(token);
    }
  }
  if (group.length) parts.push(formatList(group));
  return parts.join(", ");
}

function buildContext(flight) {
  const icao = contextAirport(flight);
  const airport = AIRPORTS[icao];
  const dep = AIRPORTS[flight.dep];
  const arr = AIRPORTS[flight.arr];
  const callingName = flight.calling === "SA" ? "San Andreas" : AIRPORTS[flight.calling].traffic;

  const callsign = displayCallsign(flight.callsign);
  let who = `${flight.medevac ? "MEDEVAC " : ""}${callsign}`;
  if (flight.formation) who += `, flight of ${flight.formationCount} ${flight.formationType.trim() || "aircraft"}`;

  const pattern = flight.pattern;
  const landing = {
    full: "Full stop",
    touch: `Touch and go, remaining in the ${pattern} pattern`,
    stop: `Stop and go, remaining in the ${pattern} pattern`,
  }[flight.landing];

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
    spot: flight.spots[icao] || "the apron",
    via: formatVia(flight.via),
    hold: flight.hold.trim(),
    face: flight.face,
    dir: flight.dir,
    from: flight.from,
    landmark: flight.landmark.trim(),
    alt: formatAltitude(flight.alt),
    altFt: Number(flight.alt),
    target: formatAltitude(flight.target),
    targetFt: Number(flight.target),
    pattern,
    Pattern: capitalize(pattern),
    landing,
    landingKey: flight.landing,
    finalVerb: flight.finalVerb === "turning" ? "Turning final" : "On final",
    route: flight.route.trim(),
    rules: flight.rules,
    // Helicopter: where we lift off from / land, as said on the radio.
    depSpot: flight.spots[flight.dep] || "the apron",
    arrSpot: flight.spots[flight.arr] || "the apron",
    depSite: flight.depSite.trim() || "[site]",
    arrSite: flight.arrSite.trim() || "[site]",
    depPoint: flight.depPoint,
    arrPoint: flight.arrPoint,
    autoSite: flight.autoSite.trim(),
  };
}

const ctaf = (c, ...body) => join([c.open, c.who, ...body, c.close]);
const center = (c, ...body) => join([STATION, c.who, ...body]);

const overhead = (c) => (c.landmark ? `Passing over ${c.landmark} at ${c.alt}` : `At ${c.alt}`);
const altitudeChange = (c) =>
  c.targetFt === c.altFt ? null : `${c.targetFt > c.altFt ? "Climbing" : "Descending"} to ${c.target}`;
const TARGET_HINT = "Set a target altitude different from the current one.";

const CTAF_CALLS = {
  clearance: () => [],
  ground: (c) => [
    { id: "pushback", label: "Pushback", text: ctaf(c, `At ${c.spot}`, `Pushing back to face ${c.face}`) },
    {
      id: "taxi",
      label: "Taxi to runway",
      text: ctaf(c, `At ${c.spot}`, `Taxiing to ${c.rwy}${c.via ? ` via ${c.via}` : ""}`),
      next: "departure",
    },
  ],
  departure: (c) => [
    {
      id: "takeoff",
      label: "Takeoff, departing",
      text: ctaf(c, `Entering ${c.rwy} for departure`, `Departing to the ${c.dir}`, `Climbing and maintaining ${c.target}`),
      next: "enroute",
    },
    {
      id: "takeoff-pattern",
      label: "Takeoff, staying in the pattern",
      text: ctaf(c, `Entering ${c.rwy} for departure`, `Remaining in the ${c.pattern} traffic pattern`),
      next: "pattern",
    },
  ],
  enroute: (c) => [
    {
      id: "position",
      label: "Position update",
      text: ctaf(c, overhead(c), `Continuing ${c.dir} to ${c.arr.shortName}`),
    },
    {
      id: "position-turn",
      label: "Position update, turning",
      text: ctaf(c, overhead(c), `Turning ${c.dir} towards ${c.arr.shortName}`),
    },
    {
      id: "altitude",
      label: "Altitude change",
      text: altitudeChange(c) ? ctaf(c, overhead(c), altitudeChange(c)) : null,
      hint: TARGET_HINT,
    },
  ],
  arrival: (c) => {
    const joining = c.targetFt < c.altFt ? `Descending to ${c.target} and joining` : "Joining";
    const inbound = `Inbound from the ${c.from}${c.landmark ? ` over ${c.landmark}` : ""} at ${c.alt}`;
    return [
      {
        id: "pattern-entry",
        label: "Pattern entry",
        text: ctaf(c, inbound, `${joining} ${c.pattern} downwind for ${c.rwy}`),
        next: "pattern",
      },
      {
        id: "straight-in",
        label: "Straight-in approach",
        text: ctaf(c, inbound, `Straight-in for ${c.rwy}`),
        next: "pattern",
      },
    ];
  },
  pattern: (c) => [
    { id: "downwind", label: "Downwind", text: ctaf(c, `${c.Pattern} downwind for ${c.rwy}`) },
    { id: "base", label: "Base", text: ctaf(c, `${c.Pattern} base for ${c.rwy}`) },
    {
      id: "final",
      label: "Final",
      text: ctaf(c, `${c.finalVerb} for ${c.rwy}`, c.landing),
      next: c.landingKey === "full" ? "taxiin" : undefined,
    },
    {
      id: "go-around",
      label: "Go around",
      text: ctaf(c, `Going around ${c.rwy}`, `Remaining in the ${c.pattern} pattern`),
    },
    {
      id: "leave-pattern",
      label: "Leaving the pattern",
      text: ctaf(c, `Departing the pattern to the ${c.dir}`, altitudeChange(c)),
      next: "enroute",
    },
  ],
  taxiin: (c) => [
    {
      id: "vacated",
      label: "Runway vacated, taxi to parking",
      text: ctaf(c, `Clear of ${c.rwy}`, `Taxiing to ${c.spot}${c.via ? ` via ${c.via}` : ""}`),
    },
  ],
};

const CENTER_CALLS = {
  clearance: (c) =>
    c.vfr
      ? [
          {
            id: "vfr-clearance",
            label: "VFR clearance",
            text: center(c, `At ${c.spot} at ${c.dep.name}`, `Request VFR clearance to ${c.arr.name} at ${c.target}`),
          },
        ]
      : [
          {
            id: "flight-plan",
            label: "Flight plan (PM to the controller)",
            channel: "pm",
            text: `${c.callsign} | DEP: ${c.dep.icao} | ARR: ${c.arr.icao} | RTE: ${c.route || "DCT"} | ALT: ${formatAltitude(c.targetFt).toUpperCase()}`,
          },
          {
            id: "ifr-clearance",
            label: "IFR clearance",
            text: center(c, `At ${c.spot} at ${c.dep.name}`, `IFR to ${c.arr.name}`, "Ready to copy"),
          },
        ],
  ground: (c) => [
    { id: "pushback", label: "Request pushback", text: center(c, `At ${c.spot} at ${c.dep.name}`, "Request pushback") },
    {
      id: "taxi",
      label: "Ready to taxi",
      text: center(c, `At ${c.spot} at ${c.dep.name}`, "Ready to taxi"),
      next: "departure",
    },
  ],
  departure: (c) => [
    {
      id: "ready",
      label: "Ready for departure",
      text: center(c, c.hold ? `Holding short of ${c.hold} for ${c.rwy}` : `Holding short of ${c.rwy}`, "Ready for departure"),
      next: "enroute",
    },
  ],
  enroute: (c) => [
    { id: "position", label: "Position report", text: center(c, overhead(c)) },
    {
      id: "altitude",
      label: c.targetFt > c.altFt ? "Request climb" : "Request descent",
      text:
        c.targetFt === c.altFt
          ? null
          : center(c, overhead(c), `Requesting ${c.targetFt > c.altFt ? "climb" : "descent"} to ${c.target}`),
      hint: TARGET_HINT,
    },
    { id: "lower", label: "Request lower", text: center(c, overhead(c), "Request lower") },
  ],
  arrival: (c) => [
    {
      id: "inbound",
      label: "Inbound for landing",
      text: center(c, `Inbound from the ${c.from}${c.landmark ? ` over ${c.landmark}` : ""} at ${c.alt}`, `Request landing at ${c.arr.name}`),
      next: "pattern",
    },
  ],
  pattern: (c) => [
    {
      id: "final",
      label: "Final",
      text: center(c, `${c.finalVerb} for ${c.rwy}`, c.vfr ? c.landing : null),
      next: c.landingKey === "full" ? "taxiin" : undefined,
    },
    { id: "go-around", label: "Go around", text: center(c, `Going around ${c.rwy}`) },
  ],
  taxiin: (c) => [
    {
      id: "vacated",
      label: "Runway vacated",
      text: center(c, `Clear of ${c.rwy}${c.via ? ` at ${c.via}` : ""}`, `Request taxi to ${c.spot}`),
    },
  ],
};

/* ---------------------------------------------------------------- helicopters */

// SAAA Rotorcraft Syllabus: hover taxi at 10ft, lift-off from a runway, a helipad or a spot,
// on-airfield landings on a runway or directly on a helipad/spot, off-airfield landings
// after assessing the site from above. Runway work uses the airplane calls.
const depWhere = (c) => (c.depPoint === "site" ? c.depSite : c.depSpot);
const arrWhere = (c) => (c.arrPoint === "site" ? c.arrSite : c.arrSpot);
const depLong = (c) => (c.depPoint === "site" ? c.depSite : `${c.depSpot} at ${c.dep.name}`);
const arrLong = (c) => (c.arrPoint === "site" ? c.arrSite : c.arrPoint === "spot" ? `${c.arrSpot} at ${c.arr.name}` : c.arr.name);
const heliInbound = (c) => `Inbound from the ${c.from}${c.landmark ? ` over ${c.landmark}` : ""} at ${c.alt}`;

// The takeoff briefing format from the syllabus, said to the crew (not on the frequency).
// Two lines so each one stays under the chat limit: intentions, then emergencies.
function briefingCalls(c) {
  const from = c.depPoint === "runway" ? `${c.rwy} at ${c.dep.name}` : depLong(c);
  const over = c.landmark ? ` over ${c.landmark}` : "";
  return [
    {
      id: "briefing-1",
      label: "Takeoff briefing 1/2 (crew)",
      channel: "say",
      text: join([`We are taking off from ${from}`, `After takeoff, we will climb to ${c.target} and proceed ${c.dir}bound${over}, and be ${c.rules} to ${arrLong(c)}`]),
    },
    {
      id: "briefing-2",
      label: "Takeoff briefing 2/2 (crew)",
      channel: "say",
      text: join([
        "In case of an emergency, we will deal with it accordingly on the climb",
        `If we have an engine failure, we will perform an autorotation landing on ${c.autoSite || "the safest open area ahead of us"}`,
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
            label: "Hover taxi to runway",
            text: ctaf(c, `At ${c.depSpot}`, `Hover taxiing to ${c.rwy}${c.via ? ` via ${c.via}` : ""}`),
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
            label: "Lift-off, departing",
            text: ctaf(c, `Lifting off from ${depWhere(c)}`, `Departing to the ${c.dir}`, `Climbing to ${c.target}`),
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
          label: "Inbound, assessing the site",
          text: ctaf(c, heliInbound(c), `Orbiting over ${c.arrSite} to assess the landing zone`),
          next: "pattern",
        },
      ];
    }
    return [
      {
        id: "inbound-spot",
        label: "Inbound, direct to the spot",
        text: ctaf(c, heliInbound(c), `Landing directly at ${c.arrSpot}`),
        next: "pattern",
      },
    ];
  },
  pattern: (c) =>
    c.arrPoint === "runway"
      ? CTAF_CALLS.pattern(c)
      : [
          { id: "landing", label: c.arrPoint === "site" ? "Landing at the site" : "Short final", text: ctaf(c, c.arrPoint === "site" ? `Landing at ${c.arrSite}` : `Short final for ${c.arrSpot}`), next: "taxiin" },
          { id: "go-around", label: "Go around", text: ctaf(c, `Going around`, c.arrPoint === "site" ? `Remaining over ${c.arrSite}` : null) },
        ],
  taxiin: (c) =>
    c.arrPoint === "runway"
      ? [
          {
            id: "vacated",
            label: "Runway vacated, hover taxi to parking",
            text: ctaf(c, `Clear of ${c.rwy}`, `Hover taxiing to ${c.arrSpot}${c.via ? ` via ${c.via}` : ""}`),
          },
        ]
      : [{ id: "down", label: "On the ground", text: ctaf(c, `On the ground at ${arrWhere(c)}`) }],
};

const HELI_CENTER_CALLS = {
  clearance: (c) =>
    c.vfr
      ? [{ id: "vfr-clearance", label: "VFR clearance", text: center(c, `At ${depLong(c)}`, `Request VFR clearance to ${arrLong(c)} at ${c.target}`) }]
      : CENTER_CALLS.clearance(c),
  ground: (c) =>
    c.depPoint === "runway"
      ? [{ id: "hover-taxi", label: "Request hover taxi", text: center(c, `At ${c.depSpot} at ${c.dep.name}`, `Request hover taxi to ${c.rwy}`), next: "departure" }]
      : [],
  departure: (c) => [
    ...(c.depPoint === "runway"
      ? CENTER_CALLS.departure(c)
      : [{ id: "ready", label: "Ready for departure", text: center(c, `At ${depLong(c)}`, `Ready for departure to the ${c.dir}`), next: "enroute" }]),
    ...briefingCalls(c),
  ],
  enroute: (c) => CENTER_CALLS.enroute(c),
  arrival: (c) =>
    c.arrPoint === "runway"
      ? CENTER_CALLS.arrival(c)
      : [{ id: "inbound", label: "Inbound for landing", text: center(c, heliInbound(c), `Request landing at ${arrLong(c)}`), next: "pattern" }],
  pattern: (c) =>
    c.arrPoint === "runway"
      ? CENTER_CALLS.pattern(c)
      : [
          { id: "final", label: "Short final", text: center(c, `Short final for ${arrWhere(c)}`), next: "taxiin" },
          { id: "go-around", label: "Go around", text: center(c, "Going around") },
        ],
  taxiin: (c) =>
    c.arrPoint === "runway"
      ? [{ id: "vacated", label: "Runway vacated", text: center(c, `Clear of ${c.rwy}${c.via ? ` at ${c.via}` : ""}`, `Request hover taxi to ${c.arrSpot}`) }]
      : [{ id: "down", label: "On the ground", text: center(c, `On the ground at ${arrWhere(c)}`) }],
};

export function buildCalls(flight) {
  const c = buildContext(flight);
  const heli = flight.aircraft === "helicopter";
  const table = c.center ? (heli ? HELI_CENTER_CALLS : CENTER_CALLS) : heli ? HELI_CTAF_CALLS : CTAF_CALLS;
  return table[flight.phase](c).map((call) => ({ channel: "atc", ...call }));
}

export const HELI_MAYDAY_SITUATIONS = ["Engine failure", "Tail rotor failure", "Fire on board", "Engine fire", "Structural damage"];
export const HELI_PAN_SITUATIONS = ["Chip light on", "Low fuel", "We have a sick passenger", "Rough running engine", "Bird strike"];

export const emergencyActions = (flight) =>
  flight.aircraft === "helicopter"
    ? [
        { value: "autorotation", label: "Autorotate to…" },
        { value: "land-site", label: "Precautionary landing on…" },
        { value: "land-runway", label: "Land on the runway" },
        { value: "return-dep", label: `Return to ${AIRPORTS[flight.dep].shortName}` },
        ...(flight.mode === "CENTER" ? [{ value: "vectors", label: "Priority vectors" }] : []),
      ]
    : [
        { value: "land-runway", label: "Land on the runway" },
        { value: "land-site", label: "Land on…" },
        { value: "return-dep", label: `Return to ${AIRPORTS[flight.dep].shortName}` },
        { value: "join-downwind", label: "Join downwind" },
        ...(flight.mode === "CENTER" ? [{ value: "vectors", label: "Priority vectors" }] : []),
      ];

export function buildEmergency(flight, emergency) {
  const c = buildContext(flight);
  const declaration = emergency.kind === "mayday" ? "Mayday, Mayday, Mayday" : "Pan-Pan, Pan-Pan, Pan-Pan";
  const where = c.landmark ? `Passing ${c.landmark} at ${c.alt}` : `At ${c.alt}`;

  const actions = {
    "land-runway": `Executing an emergency landing on ${c.rwy}`,
    "land-site": `Executing ${flight.aircraft === "helicopter" ? "a precautionary" : "an emergency"} landing on ${emergency.site.trim() || "[landing site]"}`,
    autorotation: `Autorotating to ${emergency.site.trim() || "[landing site]"}`,
    "return-dep": `Returning to ${c.dep.name}`,
    "join-downwind": `Joining ${c.pattern} downwind for ${c.rwy}`,
    vectors: `Request priority vectors to ${c.arr.name}`,
  };
  const action = actions[emergency.action];

  return c.center
    ? join([declaration, STATION, c.who, emergency.situation, where, action])
    : join([declaration, c.open, c.who, emergency.situation, where, action, c.close]);
}
