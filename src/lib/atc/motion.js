// Dead reckoning between radar samples. radar.gta.world moves each aircraft every 5s, so
// between two samples we carry it along its last measured velocity, projected to "now"
// (the sample is already a few seconds old when it reaches us), and ease into each new
// real position instead of jumping to it.

const MAX_EXTRAPOLATION_S = 8; // a missed update must not send the aircraft flying off
const STALE_S = 12; // older samples are not moving any more, as far as we know
const MAX_SPEED_MS = 150; // ~290kt: anything faster is a teleport, not flight
const MAX_BLEND_M = 1000; // a correction this big is a teleport: snap instead of gliding
const BLEND_MS = 900;
const MAX_SAMPLE_GAP_S = 15;

const radarTime = (s) => Date.parse(String(s).replace(" ", "T"));

function project(track, now) {
  if (track.stale) return { x: track.x, y: track.y };
  const elapsed = Math.min(track.ageS + (now - track.t0) / 1000, MAX_EXTRAPOLATION_S);
  return { x: track.x + track.vx * elapsed, y: track.y + track.vy * elapsed };
}

function position(track, now) {
  const p = project(track, now);
  const k = Math.max(0, 1 - (now - track.t0) / BLEND_MS);
  return { x: p.x + track.offX * k, y: p.y + track.offY * k };
}

export function createMotionTracker() {
  const tracks = new Map();

  // `now` is performance.now(); `fetchedAt` is when our server got the data (ISO).
  function ingest(aircraft, fetchedAt, now) {
    const lagS = fetchedAt ? Math.max(0, (Date.now() - Date.parse(fetchedAt)) / 1000) : 0;
    const seen = new Set();
    for (const a of aircraft) {
      seen.add(a.callsign);
      const prev = tracks.get(a.callsign);
      if (prev && prev.updatedAt === a.updatedAt) continue; // same sample as before

      let vx = 0;
      let vy = 0;
      if (prev) {
        const dt = (radarTime(a.updatedAt) - radarTime(prev.updatedAt)) / 1000;
        if (dt > 0 && dt <= MAX_SAMPLE_GAP_S) {
          vx = (a.x - prev.x) / dt;
          vy = (a.y - prev.y) / dt;
          if (Math.hypot(vx, vy) > MAX_SPEED_MS) vx = vy = 0;
        }
      }
      const ageS = a.ageS ?? 0;
      const track = { updatedAt: a.updatedAt, x: a.x, y: a.y, vx, vy, t0: now, ageS: ageS + lagS, stale: ageS > STALE_S, offX: 0, offY: 0 };
      if (prev) {
        const from = position(prev, now);
        const to = project(track, now);
        if (Math.hypot(from.x - to.x, from.y - to.y) < MAX_BLEND_M) {
          track.offX = from.x - to.x;
          track.offY = from.y - to.y;
        }
      }
      tracks.set(a.callsign, track);
    }
    for (const callsign of tracks.keys()) if (!seen.has(callsign)) tracks.delete(callsign);
  }

  // Where to draw the aircraft right now (world meters), or null if we never saw it.
  function predict(callsign, now) {
    const track = tracks.get(callsign);
    return track ? position(track, now) : null;
  }

  return { ingest, predict };
}
