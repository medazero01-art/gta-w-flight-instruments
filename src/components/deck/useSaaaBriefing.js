"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// GTA World only. Reads our own /api/saaa (never SAAA directly). The browser copy is reused for 15 min
// so reloading the page doesn't even reach our server.
const CACHE_KEY = "gtawfi:en:saaa";
const CLIENT_TTL_MS = 15 * 60 * 1000;
// Even a manual refresh is ignored if the copy is younger than this.
const REFRESH_COOLDOWN_MS = 60 * 1000;

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY));
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // Storage full or blocked: the in-memory copy is enough.
  }
}

export function useSaaaBriefing({ enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inFlight = useRef(false);

  const load = useCallback(async (force) => {
    const cached = readCache();
    if (cached?.data) setData(cached.data);
    const age = cached ? Date.now() - cached.savedAt : Infinity;
    if (age < (force ? REFRESH_COOLDOWN_MS : CLIENT_TTL_MS)) return;
    if (inFlight.current) return;

    inFlight.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/saaa");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
      writeCache(json);
    } catch (err) {
      setError(err.message);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) load(false);
  }, [load, enabled]);

  return { data: enabled ? data : null, loading, error, refresh: () => enabled && load(true) };
}
