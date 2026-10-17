import { AIRPORTS } from "../france";
import { heliPoint } from "../flight";
import { contextAirport, displayCallsign } from "../phases";
import { legInfo } from "../plan";

// GTA World France, from the server's ATC guide. There is no live controller: the pilot
// announces each step, in the present tense with "nous", in short sentences:
//   [Immatriculation] pour [LSX | SDA | GBC | TRAFFIC], [ce que l'on fait]. [Nous recontactons.]
// The airport (IATA code) is called on the ground and around it; TRAFFIC everywhere else:
// en route, zone B, flight plan changes, helicopters on an off-airfield site.
// Kept in one place so the wording can follow what instructors on the server expect.

export const STATION = "TRAFFIC";
export const callingLabel = (airport) => (airport ? airport.code : STATION);
export const comLabel = () => "ATC";
// NVFR: VFR de nuit.
export const FLIGHT_RULES = ["VFR", "NVFR", "IFR"];
// No traffic pattern calls on GTA World France: the touch and go (…) of the flight plan are
// announced in the final call, with where we go next.
export const LANDING_TYPES = [];
const REPEATED = { touch: "touch and go", stop: "stop and go", low: "passage bas" };
export const FINAL_TYPES = [];

export const MAYDAY_SITUATIONS = ["Panne moteur totale", "Panne moteur partielle", "Feu à bord", "Feu moteur", "Dommages structurels"];
export const PAN_SITUATIONS = ["Train d'atterrissage bloqué", "Passager malade à bord", "Carburant bas", "Moteur qui tourne irrégulièrement", "Collision aviaire"];
export const HELI_MAYDAY_SITUATIONS = ["Panne moteur", "Panne du rotor de queue", "Feu à bord", "Feu moteur", "Dommages structurels"];
export const HELI_PAN_SITUATIONS = ["Voyant limaille allumé", "Carburant bas", "Passager malade à bord", "Moteur qui tourne irrégulièrement", "Collision aviaire"];

// 1500 -> "1500 pieds", as the guide writes it.
export const formatAltitude = (ft) => `${Math.round(Number(ft) || 0)} pieds`;

// ["B2", "B"] -> "B2 et B"
export const formatList = (items) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;

// Route tokens come from the taxi graph in English ("crossing Runway 12R/30L").
export function formatVia(tokens) {
  const parts = [];
  let group = [];
  for (const token of tokens) {
    const crossing = token.match(/^crossing Runway (.+)$/);
    if (crossing) {
      if (group.length) parts.push(formatList(group));
      parts.push(`traversée de la ${crossing[1]}`);
      group = [];
    } else {
      group.push(token);
    }
  }
  if (group.length) parts.push(formatList(group));
  return parts.join(", ");
}

// Any runway, as long as the aircraft is on its axis, is the "Main Ramp" for a takeoff.
const MAIN_RAMP = "Main Ramp";
const RECONTACT = "Nous recontactons";
const PURPOSES = { parking: "parking", loading: "chargement", standby: "stand-by" };
const orPlaceholder = (value, placeholder) => (value || "").trim() || placeholder;

// A helicopter climbs vertically to this height before flying horizontally, and hovers at
// this height above its landing point: 500 ft, 1000 ft at LSX (zone B).
const verticalFt = (icao, point) => (icao === "KLSI" && point !== "site" ? 1000 : 500);
const liftFt = (flight) => {
  const cap = verticalFt(flight.dep, flight.depPoint);
  return Math.min(Number(flight.target) || cap, cap);
};

function buildContext(flight) {
  const icao = contextAirport(flight);
  const dep = AIRPORTS[flight.dep];
  const arr = AIRPORTS[flight.arr];

  let who = `${flight.medevac ? "MEDEVAC " : ""}${displayCallsign(flight.callsign)}`;
  if (flight.formation) who += `, patrouille de ${flight.formationCount} ${flight.formationType.trim() || "appareils"}`;

  const arrSite = orPlaceholder(flight.arrSite, "[site]");
  const heliSite = flight.aircraft === "helicopter" && flight.arrPoint === "site";
  const dest = flight.planDest.trim() || (heliSite ? arrSite : arr.code);
  const mission = flight.mission.trim();
  const target = formatAltitude(flight.target);
  const leg = legInfo(flight, AIRPORTS);

  return {
    repeated: flight.landing !== "full" && REPEATED[flight.landing],
    leg,
    who,
    to: flight.calling === "SA" ? STATION : AIRPORTS[flight.calling].code,
    dep,
    arr,
    rwy: flight.runways[icao] || "[piste]",
    spot: orPlaceholder(flight.spots[icao], "[position]"),
    via: formatVia(flight.via),
    // After landing: the taxiway we vacated onto, first leg of the route to the stand.
    exit: flight.via.find((token) => !token.startsWith("crossing")),
    landmark: flight.landmark.trim(),
    alt: formatAltitude(flight.alt),
    altFt: Number(flight.alt),
    target,
    targetFt: Number(flight.target),
    dest,
    // Destination (or area), mission for LSAS flights, flight rules, cruise altitude.
    plan: `plan de vol ${dest}${mission ? ` pour ${mission}` : ""} en ${flight.rules}, niveau de vol ${target}`,
    purpose: PURPOSES[flight.purpose] ? flight.purpose : "parking",
    // Helicopters: where we lift off and land.
    depWhere:
      flight.depPoint === "site" ? orPlaceholder(flight.depSite, "[site]") : flight.depPoint === "runway" ? MAIN_RAMP : orPlaceholder(flight.spots[flight.dep], "[position]"),
    arrWhere: flight.arrPoint === "site" ? arrSite : orPlaceholder(flight.spots[flight.arr], "[position]"),
    liftAlt: formatAltitude(liftFt(flight)),
    hoverAlt: formatAltitude(verticalFt(flight.arr, flight.arrPoint)),
  };
}

// "ABC123 pour LSX, nous rejoignons Main Ramp pour décollage en 30L, translation par B et B6. Nous recontactons."
function say(who, to, clauses, ...after) {
  return [`${who} pour ${to}, ${clauses.filter(Boolean).join(", ")}.`, ...after.map((s) => `${s}.`)].join(" ");
}
const atc = (c, clauses, ...after) => say(c.who, c.to, clauses, ...after);
const traffic = (c, clauses, ...after) => say(c.who, STATION, clauses, ...after);
const translation = (c) => (c.via ? `translation par ${c.via}` : null);

const startCall = (c, where) => ({ id: "start", label: "Démarrage moteurs", text: atc(c, [`nous démarrons moteurs sur ${where}`]) });

function atStand(c, where) {
  if (c.purpose === "loading") return atc(c, [`nous sommes sur ${where} pour chargement`]);
  if (c.purpose === "standby") return atc(c, [`nous sommes sur ${where}`, "nous restons en stand-by"]);
  return atc(c, [`nous sommes sur ${where}`, "nous parkons et nous quittons la fréquence"]);
}

const LANDMARK_HINT = "Indiquez où vous passez la limite (Chumash, Vinewood Hills…).";
const TARGET_HINT = "Choisissez une altitude cible différente de l'altitude actuelle.";

const enrouteCalls = (c) => [
  {
    id: "zone-b-exit",
    label: "Sortie de zone B",
    text: c.landmark ? traffic(c, [`nous quittons la zone B au niveau de ${c.landmark}`, `maintenons ${c.alt}`]) : null,
    hint: LANDMARK_HINT,
  },
  {
    id: "zone-b-entry",
    label: "Entrée en zone B",
    text: c.landmark ? traffic(c, [`nous entrons en zone B au niveau de ${c.landmark}`, c.plan]) : null,
    hint: LANDMARK_HINT,
  },
  {
    id: "plan-altitude",
    label: "Plan de vol modifié : altitude",
    text:
      c.targetFt === c.altFt
        ? null
        : traffic(c, ["modification de notre plan de vol", `nous ${c.targetFt > c.altFt ? "montons" : "descendons"} à ${c.target}`]),
    hint: TARGET_HINT,
  },
  {
    id: "plan-destination",
    label: "Plan de vol modifié : destination",
    text: traffic(c, ["modification de notre plan de vol", `direction ${c.dest}`, `maintenons ${c.alt}`]),
  },
];

const PLANE_CALLS = {
  ground: (c) => [
    startCall(c, c.spot),
    {
      id: "taxi",
      label: "Roulage vers la Main Ramp",
      text: atc(c, [`nous rejoignons ${MAIN_RAMP} pour décollage en ${c.rwy}`, translation(c)], RECONTACT),
      next: "departure",
    },
  ],
  departure: (c) => [
    { id: "lineup", label: "Alignement, plan de vol", text: atc(c, [`nous alignons sur ${MAIN_RAMP} pour décollage en ${c.rwy}`, c.plan], "Nous alignons") },
    { id: "takeoff", label: "Décollage", text: atc(c, [`nous décollons en ${c.rwy}`]), next: "enroute" },
  ],
  enroute: enrouteCalls,
  arrival: (c) => [
    { id: "approach", label: "Approche", text: atc(c, [`nous sommes en approche pour atterrissage en ${c.rwy}`], RECONTACT), next: "pattern" },
  ],
  pattern: (c) => [
    c.repeated
      ? {
          id: "final",
          label: `Piste en vue, ${c.repeated}`,
          text: atc(c, ["piste en vue et alignés", `${c.repeated} en ${c.rwy}`, c.leg?.leaving ? `puis direction ${c.leg.onwardCode}` : "nous restons dans le circuit"]),
        }
      : { id: "final", label: "Piste en vue, atterrissage imminent", text: atc(c, ["piste en vue et alignés", `atterrissage sur ${c.rwy} imminent`]), next: "taxiin" },
    { id: "go-around", label: "Remise de gaz", text: atc(c, ["nous remettons les gaz"], RECONTACT) },
  ],
  taxiin: (c) => [
    {
      id: "landed",
      label: "Atterrissage réussi",
      text: atc(c, [`atterrissage sur ${c.rwy} réussi`, c.exit && `nous sommes actuellement sur ${c.exit}`], RECONTACT),
    },
    {
      id: "to-stand",
      label: `Roulage vers ${c.spot}`,
      text: atc(c, [`nous rejoignons ${c.spot} pour ${PURPOSES[c.purpose]}`, translation(c)], RECONTACT),
    },
    { id: "at-stand", label: `Arrivée sur ${c.spot}`, text: atStand(c, c.spot) },
  ],
};

// Helicopters take off and land vertically, from a helipad, a stand, a site or the Main Ramp.
// On a runway (translation to and from it) they follow the airplane calls.
const HELI_CALLS = {
  ground: (c, point) => (point === "runway" ? PLANE_CALLS.ground(c) : []),
  departure: (c, point) => [
    ...(point === "runway" ? [] : [startCall(c, c.depWhere)]),
    {
      id: "prepare",
      label: "Préparation du décollage vertical",
      text: atc(c, [`nous préparons décollage vertical depuis ${c.depWhere}`, c.plan], RECONTACT),
    },
    {
      id: "lift-off",
      label: "Décollage vertical",
      text: atc(c, [`nous décollons verticalement depuis ${c.depWhere}`, `montée à ${c.liftAlt} avant de passer en vol horizontal`]),
    },
    { id: "horizontal", label: "Passage en vol horizontal", text: atc(c, [c.liftAlt, "nous passons en vol horizontal"]), next: "enroute" },
  ],
  enroute: enrouteCalls,
  arrival: (c, point) =>
    point === "runway"
      ? PLANE_CALLS.arrival(c)
      : [
          {
            id: "approach",
            label: "Approche",
            text: atc(c, [`nous sommes actuellement en approche pour atterrissage vertical sur ${c.arrWhere}`]),
            next: "pattern",
          },
        ],
  pattern: (c, point) =>
    point === "runway"
      ? PLANE_CALLS.pattern(c)
      : [
          {
            id: "landing",
            label: "Alignés au-dessus, atterrissage vertical",
            text: atc(c, [`nous sommes alignés à ${c.hoverAlt} au-dessus de ${c.arrWhere}`, `nous atterrissons verticalement sur ${c.arrWhere}`]),
            next: "taxiin",
          },
          { id: "go-around", label: "Remise de gaz", text: atc(c, ["nous remettons les gaz"], RECONTACT) },
        ],
  taxiin: (c, point) =>
    point === "runway"
      ? PLANE_CALLS.taxiin(c)
      : [
          {
            id: "landed",
            label: "Atterrissage réussi",
            text: atc(c, [`atterrissage vertical sur ${c.arrWhere} réussi`, `nous sommes actuellement sur ${c.arrWhere}`]),
          },
          { id: "shutdown", label: "Arrêt moteurs, fin de vol", text: atc(c, [`nous sommes sur ${c.arrWhere}`, "nous coupons moteurs et nous quittons la fréquence"]) },
        ],
};

export function buildCalls(flight) {
  const c = buildContext(flight);
  const calls = flight.aircraft === "helicopter" ? HELI_CALLS[flight.phase]?.(c, heliPoint(flight)) : PLANE_CALLS[flight.phase]?.(c);
  return (calls || []).map((call) => ({ channel: "atc", ...call }));
}

/* ------------------------------------------------------------ phase settings */

const PLANE_CONTROLS = {
  ground: ["calling", "spot", "runway", "taxiroute", "via"],
  departure: ["calling", "runway", "target", "plan"],
  enroute: ["landmark", "alt", "target", "arr", "plan"],
  arrival: ["calling", "runway"],
  pattern: ["calling", "runway"],
  taxiin: ["calling", "runway", "spot", "purpose", "taxiroute", "via"],
};

const onSpot = (pointKey) => [pointKey, "calling", "spot"];
const HELI_CONTROLS = {
  ground: { runway: ["depPoint", ...PLANE_CONTROLS.ground], spot: ["depPoint"], site: ["depPoint"] },
  departure: {
    runway: ["depPoint", "calling", "target", "plan"],
    spot: ["depPoint", "calling", "spot", "target", "plan"],
    site: ["depPoint", "depSite", "target", "plan"],
  },
  arrival: { runway: ["arrPoint", ...PLANE_CONTROLS.arrival], spot: onSpot("arrPoint"), site: ["arrPoint", "arrSite"] },
  pattern: { runway: ["arrPoint", ...PLANE_CONTROLS.pattern], spot: onSpot("arrPoint"), site: ["arrPoint", "arrSite"] },
  taxiin: { runway: ["arrPoint", ...PLANE_CONTROLS.taxiin], spot: onSpot("arrPoint"), site: ["arrPoint", "arrSite"] },
};

export function controlKeys(flight) {
  if (flight.aircraft !== "helicopter" || flight.phase === "enroute") return PLANE_CONTROLS[flight.phase] || [];
  return HELI_CONTROLS[flight.phase]?.[heliPoint(flight)] || [];
}

/* ------------------------------------------------------------ reminders */

const GUIDE = "Guide ATC GTA W FR";
const LAW = "Loi sur la réglementation aérienne";

// The rules of the guide and of the law worth having in front of you at each phase.
export function tip(flight) {
  const heli = flight.aircraft === "helicopter";
  const vertical = heli && heliPoint(flight) !== "runway";
  switch (flight.phase) {
    case "ground":
      return vertical
        ? null
        : {
            icon: "⚠",
            source: GUIDE,
            text: "Arrêtez-vous avant la Main Ramp : interdit d'entrer sur la piste sans avoir prévenu la tour. Inutile de rejoindre le seuil exact, il suffit d'être sur l'axe.",
          };
    case "departure":
      return vertical
        ? { icon: "🚁", source: GUIDE, text: `Décollage vertical jusqu'à ${formatAltitude(liftFt(flight))}, puis passage en vol horizontal, annoncé à chaque étape.` }
        : { icon: "✈", source: GUIDE, text: "Plan de vol en s'alignant, puis « nous décollons » : plein gaz si ni la tour ni un autre aéronef ne vous interrompt." };
    case "enroute":
      return {
        icon: "🗺",
        source: LAW,
        text: "Zone B (Los Santos) : 1000 pieds minimum, aéronefs avec feux uniquement ; entrée (avec plan de vol) et sortie annoncées à TRAFFIC. Zones C, E et G : 500 pieds minimum, la zone E se traverse seulement. Ultraléger : pas de survol des zones jaunes.",
      };
    case "arrival":
    case "pattern":
      return vertical
        ? { icon: "🚁", source: GUIDE, text: "Gardez 500 pieds minimum (1000 pieds sur LSX) et placez-vous au-dessus du point de poser avant de descendre verticalement." }
        : flight.phase === "pattern"
          ? { icon: "⚠", source: GUIDE, text: "Une fois posé, dégagez la piste le plus vite possible (surtout à LSX)." }
          : null;
    case "taxiin":
      return { icon: "📻", source: GUIDE, text: "Si vous quittez l'aéronef, prévenez la tour que vous quittez la fréquence." };
    default:
      return null;
  }
}

/* ------------------------------------------------------------ emergencies */

export const emergencyActions = (flight) =>
  flight.aircraft === "helicopter"
    ? [
        { value: "autorotation", label: "Autorotation vers…" },
        { value: "land-site", label: "Poser de précaution sur…" },
        { value: "land-runway", label: "Atterrir sur la piste" },
        { value: "return-dep", label: `Retour à ${AIRPORTS[flight.dep].code}` },
      ]
    : [
        { value: "land-runway", label: "Atterrir sur la piste" },
        { value: "land-site", label: "Atterrir sur…" },
        { value: "return-dep", label: `Retour à ${AIRPORTS[flight.dep].code}` },
        { value: "direct-arr", label: `Direct ${AIRPORTS[flight.arr].code}` },
      ];

export function buildEmergency(flight, emergency) {
  const c = buildContext(flight);
  const declaration = emergency.kind === "mayday" ? "Mayday, Mayday, Mayday" : "Pan Pan, Pan Pan, Pan Pan";
  const site = emergency.site.trim() || "[lieu]";
  const actions = {
    "land-runway": `nous atterrissons en urgence en ${c.rwy}`,
    "land-site": flight.aircraft === "helicopter" ? `nous nous posons par précaution sur ${site}` : `nous atterrissons en urgence sur ${site}`,
    autorotation: `nous effectuons une autorotation vers ${site}`,
    "return-dep": `nous faisons demi-tour vers ${c.dep.code}`,
    "direct-arr": `nous nous dirigeons directement vers ${c.arr.code}`,
  };
  const situation = emergency.situation.charAt(0).toLowerCase() + emergency.situation.slice(1);
  const where = c.landmark ? `au niveau de ${c.landmark}, ${c.alt}` : c.alt;
  return `${declaration}. ${atc(c, [situation, where, actions[emergency.action]])}`;
}
