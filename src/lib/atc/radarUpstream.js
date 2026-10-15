// Server-only. Reads radar.gta.world for every visitor at once:
// - one upstream request per feed per TTL window, shared by all callers of this instance
//   (aircraft move every 5s upstream, so a 2s window shows each move within ~2s),
// - concurrent callers wait for the same in-flight request instead of starting another,
// - after a failure we wait ERROR_BACKOFF_MS before trying again and serve the last good data.
// The route also sets s-maxage so Vercel's CDN absorbs most polls before they reach us.

const BASE_URL = "https://radar.gta.world/api";
const SITE = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const USER_AGENT = `gtaw-flight-instruments/1.0${SITE ? ` (+https://${SITE})` : ""}`;
const ERROR_BACKOFF_MS = 15000;
const TIMEOUT_MS = 6000;

// "[15:10:31] [CH: ATC] Jane Doe (240) says: message"; the (240) in-game id is dropped.
const ATC_LINE = /^\[(\d{2}:\d{2}:\d{2})\]\s*\[CH:\s*ATC\]\s*(.+?)\s*(?:\(\d+\))?\s+says:\s*([\s\S]*)$/i;

const FEEDS = {
  aircraft: {
    path: "/aircraft",
    ttlMs: 2000,
    normalize: (json) => {
      const serverTime = Date.parse(String(json.timestamp).replace(" ", "T"));
      return (json.data || []).map((a) => {
        const updated = Date.parse(String(a.last_updated).replace(" ", "T"));
        return {
          callsign: a.callsign,
          plate: a.plate,
          model: a.model,
          x: a.x,
          y: a.y,
          z: a.z,
          heading: a.heading,
          updatedAt: a.last_updated,
          // Age computed against the radar's own clock, so time zones never matter.
          ageS: Number.isFinite(serverTime - updated) ? Math.max(0, Math.round((serverTime - updated) / 1000)) : null,
        };
      });
    },
  },
  atc: {
    path: "/discord",
    ttlMs: 3000,
    normalize: (json) =>
      (json.messages || []).map((m) => {
        const match = String(m.content).match(ATC_LINE);
        return {
          id: m.id,
          timestamp: m.timestamp,
          speaker: match ? match[2] : null,
          text: (match ? match[3] : m.content).trim(),
        };
      }),
  },
};

const state = Object.fromEntries(Object.keys(FEEDS).map((k) => [k, { data: null, at: 0, errorAt: 0, error: null, pending: null }]));

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function refresh(key) {
  const feed = FEEDS[key];
  const entry = state[key];
  try {
    const res = await withTimeout(
      fetch(`${BASE_URL}${feed.path}`, {
        headers: { Accept: "application/json", "User-Agent": USER_AGENT },
        cache: "no-store",
      }),
      TIMEOUT_MS
    );
    // The radar answers 404 when a list is empty.
    if (res.status === 404) {
      entry.data = [];
    } else {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      entry.data = feed.normalize(await res.json());
    }
    entry.at = Date.now();
    entry.error = null;
    entry.errorAt = 0;
  } catch (err) {
    entry.error = err.message;
    entry.errorAt = Date.now();
  }
}

export async function getFeed(key) {
  const entry = state[key];
  const now = Date.now();
  const fresh = entry.data && now - entry.at < FEEDS[key].ttlMs;
  const backingOff = entry.errorAt && now - entry.errorAt < ERROR_BACKOFF_MS;
  if (!fresh && !backingOff) {
    entry.pending ??= refresh(key).finally(() => {
      entry.pending = null;
    });
    await entry.pending;
  }
  return {
    data: entry.data ?? [],
    fetchedAt: entry.at ? new Date(entry.at).toISOString() : null,
    error: entry.error,
  };
}
