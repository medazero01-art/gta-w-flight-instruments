// Reading the live /atc frequency relayed by radar.gta.world.

const CENTER = /\b(san andreas|sa)\s+center\b/i;
const CENTER_FIRST = /^\s*(san andreas|sa)\s+center\b/i;
// A controller is considered gone after this long without transmitting.
export const CENTER_ACTIVE_MS = 30 * 60 * 1000;

const compact = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

// Pilots open with "San Andreas Center, …"; the controller answers "N123AB. San Andreas Center. …".
export const isControllerMessage = (text) => CENTER.test(text) && !CENTER_FIRST.test(text);

// Full callsign/registration anywhere, or a controller-shortened suffix ("3AB", "738IA").
export function mentions(text, ids) {
  const words = String(text).toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  const joined = words.join("");
  return ids.some((id) => {
    const full = compact(id);
    if (full.length < 3) return false;
    if (joined.includes(full)) return true;
    return words.some((w) => w.length >= 3 && /\d/.test(w) && /[A-Z]/.test(w) && full.endsWith(w));
  });
}

export function analyzeFeed(messages, ids, now = Date.now()) {
  let lastControllerAt = null;
  let latestForMe = null;
  const items = (messages || []).map((m) => {
    const controller = isControllerMessage(m.text);
    const forMe = ids.length > 0 && mentions(m.text, ids);
    const at = Date.parse(m.timestamp);
    if (controller && (!lastControllerAt || at > lastControllerAt)) lastControllerAt = at;
    if (controller && forMe) latestForMe = m;
    return { ...m, controller, forMe };
  });
  const centerActive = lastControllerAt != null && now - lastControllerAt < CENTER_ACTIVE_MS;
  return { items, lastControllerAt, centerActive, latestForMe };
}
