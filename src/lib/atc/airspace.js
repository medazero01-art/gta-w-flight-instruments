import { AIRPORTS } from "./airports";
import { distance, distanceToBox, zoneBoxes } from "./radar";

// SAAA Aviation Code, "Minimum Safe Altitude & Airspace Restrictions" (order 25.002).
// We only have MSL altitude from the radar, so MSA floors below add a rough ground
// elevation to the 1,000ft rule and the alerts say "about".

// Restricted airspace (permanent). Fort Zancudo and Bolingbroke are GTA zones; the
// State Capitol and helipads have no zone and are not checked.
const RESTRICTED = [
  { codes: ["ArmyB"], label: "Fort Zancudo" },
  { codes: ["Jail"], label: "Bolingbroke Penitentiary" },
];

// Densely populated areas: 1,000ft above the ground. `strict` areas are the ones where
// the Code forbids flying below MSA at all (Downtown, Mirror Park, Port of LS, Vespucci Canals).
const MSA_AREAS = [
  { codes: ["Downt", "PBOX", "SKID", "LegSqu", "TEXTI"], label: "Downtown Los Santos", floorFt: 1100, strict: true },
  { codes: ["Mirr"], label: "Mirror Park", floorFt: 1300, strict: true },
  { codes: ["Termina", "Elysian", "ZP_ORT"], label: "Port of Los Santos", floorFt: 1050, strict: true },
  { codes: ["VCana"], label: "Vespucci Canals", floorFt: 1050, strict: true },
  {
    codes: [
      "STRAW", "Davis", "ChamH", "RANCHO", "East_V", "Vine", "DTVine", "Hawick", "Alta", "Burton", "Rockf",
      "WVine", "DelPe", "Morn", "Movie", "Koreat", "Vesp", "DelSol", "LosPuer", "LMesa", "Murri", "Banning",
      "Cypre", "Stad", "Richm", "Beach", "DeLBe", "Delbe",
    ],
    label: "Los Santos",
    floorFt: 1150,
  },
  { codes: ["Paleto"], label: "Paleto Bay", floorFt: 1100 },
  { codes: ["Sandy"], label: "Sandy Shores", floorFt: 1150 },
  { codes: ["Harmo"], label: "Harmony", floorFt: 1250 },
];

const RESTRICTED_WARNING_M = 600;
// Takeoffs and landings legitimately happen below MSA near airports, and the Sandy Shores
// pattern runs right next to Bolingbroke: near airports only "inside" alerts are raised.
const AIRPORT_EXEMPTION_M = 1500;

const RESTRICTED_AREAS = RESTRICTED.map((r) => ({ ...r, boxes: zoneBoxes(r.codes) }));
const MSA_ZONES = MSA_AREAS.map((a) => ({ ...a, boxes: zoneBoxes(a.codes) }));

// Zones named in active airspace NOTAMs (e.g. "… Downtown Los Santos (DTLS)") also count as restricted.
function notamAreas(notams) {
  const areas = [];
  for (const notam of notams || []) {
    if (notam.type !== "airspace") continue;
    const text = `${notam.title} ${notam.message}`.toLowerCase();
    for (const area of [...RESTRICTED_AREAS, ...MSA_ZONES.filter((a) => a.strict)]) {
      if (text.includes(area.label.toLowerCase()) || (area.label === "Downtown Los Santos" && text.includes("dtls"))) {
        areas.push({ ...area, notam: notam.number });
      }
    }
  }
  return areas;
}

const nearestBoxDistance = (p, boxes) => Math.min(...boxes.map((b) => distanceToBox(p, b)));

// Alerts for an aircraft position, most severe first.
export function airspaceAlerts(aircraft, notams) {
  if (!aircraft?.airborne) return [];
  const alerts = [];
  const seen = new Set();
  const nearAirport = Object.values(AIRPORTS).some((a) => distance(aircraft, a.position) < AIRPORT_EXEMPTION_M);

  for (const area of [...RESTRICTED_AREAS, ...notamAreas(notams)]) {
    if (seen.has(area.label)) continue;
    seen.add(area.label);
    const d = nearestBoxDistance(aircraft, area.boxes);
    const source = area.notam || "restricted airspace";
    if (d === 0) alerts.push({ level: "danger", text: `Inside ${area.label} (${source}). Leave the area unless cleared.` });
    else if (d < RESTRICTED_WARNING_M && !nearAirport) alerts.push({ level: "warning", text: `${Math.round(d)}m from ${area.label} (${source}).` });
  }

  if (!nearAirport) {
    for (const area of MSA_ZONES) {
      if (nearestBoxDistance(aircraft, area.boxes) > 0 || aircraft.altFt >= area.floorFt) continue;
      alerts.push({
        level: area.strict ? "danger" : "warning",
        text: `Below the minimum safe altitude over ${area.label}: about ${area.floorFt.toLocaleString("en-US")}ft MSL required.`,
      });
    }
  }

  return alerts.sort((a, b) => (a.level === "danger" ? -1 : 1) - (b.level === "danger" ? -1 : 1));
}

export const restrictedBoxes = () => RESTRICTED_AREAS.flatMap((a) => a.boxes);
export const strictMsaBoxes = () => MSA_ZONES.filter((a) => a.strict).flatMap((a) => a.boxes);
