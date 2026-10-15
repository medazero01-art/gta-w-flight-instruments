// Airport data the SAAA API doesn't provide: spoken names, parking spots,
// taxiways and runway headings (read from the official SAAA diagrams).
// Runway designations and chart links come live from /api/saaa. `code` is the identifier
// shown and said for the airport (the ICAO code here, the IATA code on GTA World France).
// `position` is an approximate reference point in GTA world coordinates (meters,
// +x east, +y north), `elevationFt` the field elevation from the diagrams.

export const AIRPORTS = {
  KLSI: {
    icao: "KLSI",
    code: "KLSI",
    name: "Los Santos International Airport",
    shortName: "Los Santos International",
    traffic: "Los Santos",
    weatherArea: "Los Santos",
    chart: "/charts/lsia.png",
    position: { x: -1336, y: -3044 },
    elevationFt: 46,
    defaultRunway: "30L",
    runwayEnds: [
      { id: "30L", heading: 300.1 },
      { id: "12R", heading: 120.1 },
      { id: "30R", heading: 300.1 },
      { id: "12L", heading: 120.1 },
      { id: "03", heading: 30.1 },
      { id: "21", heading: 210.1 },
    ],
    spots: [
      "Devin Weston Apron",
      "GA Parking",
      "IMEX Hangar",
      "South Terminal",
      "Pegasus Hangar",
      "South Aircraft Maintenance Area",
      "Dale-Kelly Apron",
      "Fuel Farm",
    ],
    taxiways: ["A", "B", "C", "D", "E", "F"],
  },
  KSSA: {
    icao: "KSSA",
    code: "KSSA",
    name: "Sandy Shores Airfield",
    shortName: "Sandy Shores",
    traffic: "Sandy Shores",
    weatherArea: "Sandy Shores",
    chart: "/charts/sandy_shores.png",
    position: { x: 1718, y: 3255 },
    elevationFt: 135,
    defaultRunway: "25",
    runwayEnds: [
      { id: "25", heading: 254.5 },
      { id: "07", heading: 74.5 },
      { id: "22", heading: 224.9 },
      { id: "04", heading: 44.7 },
    ],
    spots: ["GA Parking", "Hangar", "Maintenance Area", "Terminal", "Helipad"],
    taxiways: ["A", "A1"],
  },
  KLGP: {
    icao: "KLGP",
    code: "KLGP",
    name: "McKenzie Field",
    shortName: "McKenzie",
    traffic: "McKenzie",
    // No SAAA weather area for Grapeseed, Sandy Shores is the closest one.
    weatherArea: "Sandy Shores",
    chart: "/charts/mckenzie.png",
    position: { x: 2121, y: 4796 },
    elevationFt: 135,
    defaultRunway: "24",
    runwayEnds: [
      { id: "24", heading: 240 },
      { id: "06", heading: 60 },
    ],
    spots: ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "H1", "H2", "H3", "H4", "H5", "H6"],
    taxiways: [],
  },
};

export const AIRPORT_IDS = Object.keys(AIRPORTS);

// Named places for position reports when the radar is off (with radar, the GTA zone is used).
export const LANDMARKS = [
  "Paleto Bay",
  "Mount Chiliad",
  "Grapeseed",
  "Sandy Shores",
  "Alamo Sea",
  "Grand Senora Desert",
  "Harmony",
  "Route 68",
  "Senora Freeway",
  "Great Ocean Highway",
  "Zancudo River",
  "Lago Zancudo",
  "Chumash",
  "Tongva Hills",
  "Vinewood Hills",
  "Vinewood Sign",
  "Land Act Dam",
  "Palomino Highlands",
  "Tataviam Mountains",
  "Mount Josiah",
  "Raton Canyon",
  "Cassidy Creek",
  "Braddock Pass",
  "Del Perro Pier",
  "Vespucci Beach",
  "Port of Los Santos",
  "Elysian Island",
  "Palmer-Taylor Power Station",
  "Humane Labs",
  "Stab City",
];

export const DIRECTIONS = [
  { value: "north", label: "N" },
  { value: "northeast", label: "NE" },
  { value: "east", label: "E" },
  { value: "southeast", label: "SE" },
  { value: "south", label: "S" },
  { value: "southwest", label: "SW" },
  { value: "west", label: "W" },
  { value: "northwest", label: "NW" },
];

export const ALTITUDES = [500, 1000, 1500, 2000, 2500, 3000, 3500];
