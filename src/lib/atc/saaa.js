import snapshot from "./saaa-snapshot.json";

// Server-only. The SAAA API only allows its own origin in browsers, so we read it
// from Vercel and cache it there: whatever the number of visitors, SAAA sees at most
// one request per source per revalidate window.

const BASE_URL = "https://saaa.gta.world/api";
const SITE = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const USER_AGENT = `gtaw-flight-instruments/1.0${SITE ? ` (+https://${SITE})` : ""}`;
const TIMEOUT_MS = 8000;

const SOURCES = {
  airports: { path: "/airports", revalidate: 86400, pick: (json) => json.airports },
  weather: { path: "/weather", revalidate: 3600, pick: (json) => json.weather },
  notams: { path: "/notams/currently-effective", revalidate: 900, pick: (json) => json.notams },
};

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// One GET per source, never retried here: a failure falls back to the bundled snapshot.
async function loadSource(key) {
  const source = SOURCES[key];
  try {
    const res = await withTimeout(
      fetch(`${BASE_URL}${source.path}`, {
        headers: { Accept: "application/json", "User-Agent": USER_AGENT },
        next: { revalidate: source.revalidate },
      }),
      TIMEOUT_MS
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const list = source.pick(await res.json());
    if (!Array.isArray(list)) throw new Error("Unexpected payload");
    return { list, status: { live: true } };
  } catch (err) {
    return {
      list: snapshot[key],
      status: { live: false, error: err.message, snapshotAt: snapshot.capturedAt },
    };
  }
}

const normalizeAirport = (a) => ({
  icao: a.icao_code,
  name: a.name,
  elevation: a.elevation,
  atcAvailable: a.atc_available,
  runways: (a.runways || []).map((r) => r.designation),
  charts: (a.charts || [])
    .filter((c) => c.is_active && c.file_url)
    .map((c) => ({ name: c.name, type: c.type, url: c.file_url })),
});

const normalizeWeather = (w) => ({
  area: w.area_name,
  visibility: w.visibility,
  temperature: Number(w.temperature),
  windSpeed: w.wind_speed,
  windDirection: w.wind_direction,
  cloudCover: w.cloud_cover,
  cloudAltitude: w.cloud_altitude,
  precipitation: w.precipitation,
  fog: w.fog_mist,
  updatedAt: w.updated_at,
});

const normalizeNotam = (n) => ({
  id: n.id,
  number: n.notam_number,
  title: n.title,
  message: n.message,
  url: n.url,
  type: n.type,
  priority: n.priority,
  airportIcao: n.airport?.icao_code ?? null,
  effectiveFrom: n.effective_from,
  effectiveUntil: n.effective_until,
});

export async function getBriefingData() {
  const [airports, weather, notams] = await Promise.all([
    loadSource("airports"),
    loadSource("weather"),
    loadSource("notams"),
  ]);

  return {
    fetchedAt: new Date().toISOString(),
    status: { airports: airports.status, weather: weather.status, notams: notams.status },
    airports: airports.list.filter((a) => a.is_active !== false).map(normalizeAirport),
    weather: weather.list.filter((w) => w.is_active !== false).map(normalizeWeather),
    notams: notams.list.filter((n) => n.is_active !== false).map(normalizeNotam),
  };
}
