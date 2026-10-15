import { AIRPORTS as SAAA_AIRPORTS } from "./airports";
import { CHART_GEO as SAAA_CHART_GEO } from "./geo";

// GTA World France airfields, from the server's own diagrams and ATC guide. Same airports
// (and same internal keys) as GTA World, but the French server names them by their IATA
// code (LSX, SDA, GBC), uses different charts, runway designators and stand names, and
// only LSX has taxiways. `code` is what is said on the radio ("ABC123 pour LSX").

export const AIRPORTS = {
  KLSI: {
    icao: "KLSI",
    code: "LSX",
    name: "Aéroport de Los Santos",
    shortName: "Los Santos",
    chart: "/charts/fr/lsx.png",
    position: SAAA_AIRPORTS.KLSI.position,
    elevationFt: 45,
    defaultRunway: "30L",
    runwayEnds: [
      { id: "30L", heading: 300.1 },
      { id: "12R", heading: 120.1 },
      { id: "30R", heading: 300.1 },
      { id: "12L", heading: 120.1 },
      { id: "3", heading: 30.1 },
      { id: "21", heading: 210.1 },
    ],
    // Stand names as written on the diagram. H1/H2 are the helipads named in the server's ATC guide.
    spots: ["Remote Gates", "Pegasus", "General Aviation", "South Ramp", "Devin Weston", "Cargo Ramp", "Fire Station", "H1", "H2"],
    taxiways: ["A", "B", "C", "D", "A1", "A2", "A3", "A4", "A5", "B1", "B2", "B3", "B4", "B5", "B6", "C1", "C2", "C3", "C4", "C5", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10"],
  },
  KSSA: {
    icao: "KSSA",
    code: "SDA",
    name: "Aéroport de Sandy Shores",
    shortName: "Sandy Shores",
    chart: "/charts/fr/sda.png",
    position: SAAA_AIRPORTS.KSSA.position,
    elevationFt: 140,
    defaultRunway: "26R",
    runwayEnds: [
      { id: "26R", heading: 260 },
      { id: "8L", heading: 80 },
      { id: "26L", heading: 260 },
      { id: "8R", heading: 80 },
      { id: "23", heading: 230 },
      { id: "5", heading: 50 },
    ],
    spots: ["Hangar", "Helipad"],
    taxiways: ["A"],
  },
  KLGP: {
    icao: "KLGP",
    code: "GBC",
    name: "Aéroport de Grapeseed",
    shortName: "Grapeseed",
    // No GTA W France diagram for Grapeseed yet: the strip's chart from GTA World.
    chart: SAAA_AIRPORTS.KLGP.chart,
    position: SAAA_AIRPORTS.KLGP.position,
    elevationFt: SAAA_AIRPORTS.KLGP.elevationFt,
    defaultRunway: "24",
    runwayEnds: SAAA_AIRPORTS.KLGP.runwayEnds,
    spots: SAAA_AIRPORTS.KLGP.spots,
    taxiways: [],
  },
};

// Diagram <-> world transforms (see geo.js). Only used with the radar, which GTA World France
// doesn't have: anchors are the 12L and 8L thresholds matched against the GTA World charts.
export const CHART_GEO = {
  KLSI: { width: 1304, height: 1876, chart: { x: 408, y: 846 }, world: { x: -1552, y: -2898 }, metersPerPx: 1.27, upBearing: 0 },
  // Drawn with runway 8L/26R vertical: the chart's "up" points east-northeast.
  KSSA: { width: 940, height: 1388, chart: { x: 346, y: 1196 }, world: { x: 1108, y: 3061 }, metersPerPx: 0.743, upBearing: 74.5 },
  KLGP: SAAA_CHART_GEO.KLGP,
};

// Taxi networks in chart pixels, same format as taxi.js. LSX was traced from the GTA W France
// diagram; SDA has no taxiway but taxiway A, so its "network" is the runways themselves.
const chain = (name, ids) => ids.slice(1).map((id, i) => [ids[i], id, name]);

const LSX_NODES = {
  A_W: [429, 801], A_A5: [533, 860], A5H: [517, 888], A_A4: [682, 946], A4H: [666, 974], A_A3: [825, 1027], A3H: [809, 1055],
  A_DW: [898, 1069], A_A2: [969, 1110], A2H: [953, 1138], A_A1: [1012, 1135], A1H: [996, 1162],
  D_W: [354, 912], D_D8: [423, 952], D_D7: [486, 987], D_D56: [668, 1092], D_D4: [843, 1192], D_D3: [951, 1254], D_D2: [994, 1279], D_D1: [1090, 1333],
  D8N: [444, 887], D8S: [405, 1011], D7N: [520, 931], D7S: [456, 1040], D5N: [654, 1008], D5S: [676, 1166], D6N: [749, 1062], D6S: [600, 1122],
  D4N: [874, 1134], D4S: [815, 1245], D3N: [999, 1206], D3S: [905, 1297], D2N: [1029, 1222], D2S: [963, 1330], D1N: [1121, 1275], D1S: [1062, 1386],
  D9H: [324, 950], D10H: [380, 862],
  B_B6: [399, 1118], B6H: [427, 1069], B_B5: [540, 1198], B5H: [568, 1150], B_B4: [566, 1213], B4H: [594, 1165], B_B3: [639, 1255], B3H: [667, 1206],
  B_B2: [764, 1327], B2H: [792, 1278], B_GA: [806, 1351], B_B1: [859, 1381], B1H: [887, 1333],
  C_C5: [478, 698], C5H: [457, 686], C_C4: [558, 555], C4H: [537, 543], C3E: [667, 565], C_C2: [642, 405], C_N: [702, 298], C1H: [691, 274],
  PEG: [364, 1144], RG: [500, 1244], SRAMP: [644, 1300], GA: [794, 1430], DW: [910, 1014], FIRE: [804, 544], CARGO: [756, 350],
  RWY21: [678, 260], RWY3: [368, 816], RWY12L: [408, 846], RWY30R: [1116, 1252], RWY12R: [300, 972], RWY30L: [1040, 1398],
};

const LSX_EDGES = [
  ...chain("C", ["A_W", "C_C5", "C_C4", "C_C2", "C_N"]),
  ["C_N", "C1H", "C1"], ["C_C5", "C5H", "C5"], ["C_C4", "C4H", "C4"], ["C_C4", "C3E", "C3"], ["C_C2", "CARGO", "C2"], ["C3E", "FIRE", ""],
  ...chain("A", ["A_W", "A_A5", "A_A4", "A_A3", "A_DW", "A_A2", "A_A1"]),
  ["A_A5", "A5H", "A5"], ["A_A4", "A4H", "A4"], ["A_A3", "A3H", "A3"], ["A_A2", "A2H", "A2"], ["A_A1", "A1H", "A1"], ["A_DW", "DW", ""],
  ...chain("D", ["D_W", "D_D8", "D_D7", "D_D56", "D_D4", "D_D3", "D_D2", "D_D1"]),
  ["D_W", "D9H", "D9"], ["D_W", "D10H", "D10"], ["D10H", "A_W", ""],
  ...["D8", "D7", "D4", "D3", "D2", "D1"].flatMap((d) => [[`D_${d}`, `${d}N`, d], [`D_${d}`, `${d}S`, d]]),
  // D5 and D6 cross each other between the runways.
  ["D_D56", "D5N", "D5"], ["D_D56", "D5S", "D5"], ["D_D56", "D6N", "D6"], ["D_D56", "D6S", "D6"],
  ...chain("B", ["B_B6", "B_B5", "B_B4", "B_B3", "B_B2", "B_GA", "B_B1"]),
  ...["B6", "B5", "B4", "B3", "B2", "B1"].map((b) => [`B_${b}`, `${b}H`, b]),
  ["PEG", "B_B6", ""], ["RG", "B_B5", ""], ["SRAMP", "B_B3", ""], ["GA", "B_GA", ""],
  ["A5H", "D7N", "X:12L/30R"], ["A4H", "D5N", "X:12L/30R"], ["A3H", "D6N", "X:12L/30R"], ["A2H", "D4N", "X:12L/30R"], ["A1H", "D3N", "X:12L/30R"],
  ["D7S", "B6H", "X:12R/30L"], ["D6S", "B5H", "X:12R/30L"], ["D5S", "B3H", "X:12R/30L"], ["D4S", "B2H", "X:12R/30L"], ["D3S", "B1H", "X:12R/30L"],
];

const SDA_NODES = {
  HANGAR: [300, 196], HELI: [416, 180], APRON: [364, 256],
  L_TOP: [346, 320], L_J23: [346, 424], L_BOT: [346, 1176], R_TOP: [474, 544], R_BOT: [474, 1176], J_26L: [464, 524], D_END: [784, 848],
  RWY26R: [346, 304], RWY8L: [346, 1196], RWY8R: [474, 1196], RWY26L: [474, 532], RWY23: [372, 412], RWY5: [804, 864],
};

const SDA_EDGES = [
  ["HANGAR", "APRON", ""], ["HELI", "APRON", ""], ["APRON", "L_TOP", ""],
  ["L_TOP", "L_J23", ""], ["L_J23", "L_BOT", ""], ["L_BOT", "R_BOT", "A"],
  ["L_J23", "J_26L", ""], ["J_26L", "R_TOP", ""], ["R_TOP", "R_BOT", ""], ["J_26L", "D_END", ""],
];

export const TAXI = {
  KLSI: {
    nodes: LSX_NODES,
    edges: LSX_EDGES,
    spots: {
      "Remote Gates": "RG", Pegasus: "PEG", "General Aviation": "GA", "South Ramp": "SRAMP",
      "Devin Weston": "DW", "Cargo Ramp": "CARGO", "Fire Station": "FIRE",
    },
    holds: { "21": ["C1H"], "3": ["A_W", "D10H"], "12L": ["A_W", "D10H"], "30R": ["A1H", "D1N"], "12R": ["D9H", "B6H"], "30L": ["D1S", "B1H"] },
    thresholds: { "21": "RWY21", "3": "RWY3", "12L": "RWY12L", "30R": "RWY30R", "12R": "RWY12R", "30L": "RWY30L" },
  },
  KSSA: {
    nodes: SDA_NODES,
    edges: SDA_EDGES,
    spots: { Hangar: "HANGAR", Helipad: "HELI" },
    holds: { "26R": ["L_TOP"], "8L": ["L_BOT"], "26L": ["R_TOP"], "8R": ["R_BOT"], "23": ["L_J23"], "5": ["D_END"] },
    thresholds: { "26R": "RWY26R", "8L": "RWY8L", "26L": "RWY26L", "8R": "RWY8R", "23": "RWY23", "5": "RWY5" },
  },
};
