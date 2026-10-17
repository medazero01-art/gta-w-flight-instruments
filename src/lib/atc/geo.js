// Image <-> GTA world transforms (world: meters, +x east, +y north).

// Satellite map of the island, 5944x8075 at 1.5 m per pixel, world origin at pixel
// (2548, 5500). Registered against the previous atlas map (calibrated on the game's zone
// boxes) by matching coastlines, then checked on the three runways below.
// Served as a pyramid of 512px WebP tiles: public/maps/sat/{z}/{x}_{y}.webp, z = 0 (12 m/px)
// to 3 (full resolution), so only what is on screen at the right sharpness gets loaded.
export const SAT_MAP = {
  width: 5944,
  height: 8075,
  metersPerPx: 1.5,
  originPx: { x: 2548, y: 5500 },
  tileSize: 512,
  levels: [
    { width: 743, height: 1009 },
    { width: 1486, height: 2019 },
    { width: 2972, height: 4038 },
    { width: 5944, height: 8075 },
  ],
};

// World rectangle covered by the map image, for placing it in world-space SVG.
export const mapWorldBounds = () => {
  const { width, height, metersPerPx: s, originPx: o } = SAT_MAP;
  return { left: -o.x * s, right: (width - o.x) * s, top: o.y * s, bottom: (o.y - height) * s, width: width * s, height: height * s };
};

// Airport diagrams. Each is a similarity transform defined by one anchor pair, a scale and
// the world bearing of the chart's "up" direction (the SAAA diagrams are north-up; the
// McKenzie diagram is drawn with runway 06/24 horizontal, so its up points to 330°).
// Anchors come from matching runways on the GTA map: expect tens of meters of error until
// the pilot calibrates with two radar fixes (see calibrateChart).
export const CHART_GEO = {
  KLSI: { width: 5693, height: 7942, chart: { x: 2247, y: 2620 }, world: { x: -1425, y: -2493 }, metersPerPx: 0.344, upBearing: 0 },
  KSSA: { width: 7448, height: 4486, chart: { x: 3088, y: 2437 }, world: { x: 1419, y: 3174 }, metersPerPx: 0.1744, upBearing: 0 },
  KLGP: { width: 3840, height: 2160, chart: { x: 1925, y: 1085 }, world: { x: 2040, y: 4728 }, metersPerPx: 0.0528, upBearing: 330 },
};

const rad = (deg) => (deg * Math.PI) / 180;

// Unit vectors (in world space) of the chart's right and up directions.
function axes(geo) {
  const b = rad(geo.upBearing);
  return { up: { x: Math.sin(b), y: Math.cos(b) }, right: { x: Math.cos(b), y: -Math.sin(b) } };
}

export function chartToWorld(geo, p) {
  const { up, right } = axes(geo);
  const u = (p.x - geo.chart.x) * geo.metersPerPx;
  const v = -(p.y - geo.chart.y) * geo.metersPerPx;
  return { x: geo.world.x + u * right.x + v * up.x, y: geo.world.y + u * right.y + v * up.y };
}

export function worldToChart(geo, w) {
  const { up, right } = axes(geo);
  const dx = w.x - geo.world.x;
  const dy = w.y - geo.world.y;
  const u = (dx * right.x + dy * right.y) / geo.metersPerPx;
  const v = (dx * up.x + dy * up.y) / geo.metersPerPx;
  return { x: geo.chart.x + u, y: geo.chart.y - v };
}

// Exact similarity from two (chart point, world point) fixes taken in-game.
export function calibrateChart(base, fixes) {
  const [a, b] = fixes;
  const chartDx = b.chart.x - a.chart.x;
  const chartDy = -(b.chart.y - a.chart.y); // chart y grows downwards
  const worldDx = b.world.x - a.world.x;
  const worldDy = b.world.y - a.world.y;
  const chartLen = Math.hypot(chartDx, chartDy);
  const worldLen = Math.hypot(worldDx, worldDy);
  if (chartLen < 50 || worldLen < 20) return null; // fixes too close together to be useful
  const bearing = (v) => (Math.atan2(v.x, v.y) * 180) / Math.PI;
  const upBearing = (((bearing({ x: worldDx, y: worldDy }) - bearing({ x: chartDx, y: chartDy })) % 360) + 360) % 360;
  return {
    ...base,
    chart: { x: Math.round(a.chart.x), y: Math.round(a.chart.y) },
    world: { x: Math.round(a.world.x), y: Math.round(a.world.y) },
    metersPerPx: Number((worldLen / chartLen).toFixed(5)),
    upBearing: Number(upBearing.toFixed(2)),
  };
}
