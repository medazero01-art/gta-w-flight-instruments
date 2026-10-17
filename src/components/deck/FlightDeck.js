"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ATC_PREFIX, contextAirport } from "@/lib/atc/phases";
import { advanceLeg, defaultFlight, editPlan, heliPoint, isHeli, isLastLeg, radarIds, restoreFlight, startPlan, withPhase } from "@/lib/atc/flight";
import { STOP_TYPE_LABELS, isRepeated, stopLabel, stopType } from "@/lib/atc/plan";
import { bearing, cardinalAbbr, distance, isOwnAircraft } from "@/lib/atc/radar";
import { createMotionTracker } from "@/lib/atc/motion";
import { radarPatch, radarSuggestions } from "@/lib/atc/radarSync";
import { airspaceAlerts } from "@/lib/atc/airspace";
import { analyzeFeed } from "@/lib/atc/feed";
import { calibrateChart, worldToChart } from "@/lib/atc/geo";
import { nearestNode, taxiRoute } from "@/lib/atc/taxi";
import { storageKey } from "@/lib/editions";
import { EditionProvider, useEdition } from "./EditionContext";
import { Readout, actionClass, useCopy } from "./ui";
import { useIsomorphicLayoutEffect } from "./paint";
import { useSaaaBriefing } from "./useSaaaBriefing";
import { useRadar } from "./useRadar";
import PlanPanel from "./PlanPanel";
import Briefing from "./Briefing";
import CallsPanel from "./CallsPanel";
import ReadbackPanel from "./ReadbackPanel";
import EmergencyPanel from "./EmergencyPanel";
import NavPanel from "./NavPanel";
import ChartPanel from "./ChartPanel";
import AtcFeed from "./AtcFeed";
import FlightPlanDialog from "./FlightPlanDialog";

const isTyping = (el) => el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
// A controller message older than this is history, not something to read back now.
const AUTO_READBACK_MAX_AGE_MS = 10 * 60 * 1000;
const OUTBOUND_PHASES = ["clearance", "ground", "departure"];

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked: the value just won't survive a reload.
  }
}

export default function FlightDeck({ editionId }) {
  return (
    <EditionProvider editionId={editionId}>
      <Deck />
    </EditionProvider>
  );
}

function Deck() {
  const { edition, t, ph, airfields, airports, taxi, charts } = useEdition();
  const keys = useMemo(
    () => ({
      flight: storageKey(edition, "flight:v1"),
      charts: storageKey(edition, "charts:v1"),
      // Set once the plan dialog is closed: it comes back with the next browser session, not on reload.
      preflight: storageKey(edition, "preflight-done"),
    }),
    [edition]
  );

  const [flight, setFlight] = useState(() => defaultFlight(airfields));
  const [chartCal, setChartCal] = useState({});
  const [hydrated, setHydrated] = useState(false);
  const [emergency, setEmergency] = useState(null);
  const [incoming, setIncoming] = useState(null);
  // The flight plan dialog: null, "choose" (resume or new flight), "new" or "edit".
  const [dialog, setDialog] = useState(null);
  // Leg whose stop looks done: a small card offers to go on to the next stop.
  const [prompt, setPrompt] = useState(null);
  const autoReadbackId = useRef(null);
  const { copiedKey, copy } = useCopy();
  // radar.gta.world and saaa.gta.world belong to GTA World: the France edition never calls them.
  const saaa = useSaaaBriefing({ enabled: edition.saaa });

  useEffect(() => {
    document.documentElement.lang = edition.lang;
  }, [edition.lang]);

  // Restore after mount (localStorage doesn't exist during server render).
  useEffect(() => {
    const restored = restoreFlight(readJson(keys.flight), airfields);
    // No radar or controller station on GTA World France.
    setFlight({ ...restored, radarOn: edition.radar && restored.radarOn, mode: edition.center ? restored.mode : "CTAF" });
    setChartCal(readJson(keys.charts) || {});
    let done = false;
    try {
      done = sessionStorage.getItem(keys.preflight) === "1";
    } catch {
      // Session storage blocked: ask every time, it is only one dialog.
    }
    if (!done) setDialog(restored.callsign ? "choose" : "new");
    setHydrated(true);
  }, [keys, edition.radar, edition.center, airfields]);

  const closeDialog = useCallback(() => {
    try {
      sessionStorage.setItem(keys.preflight, "1");
    } catch {
      // See above.
    }
    setDialog(null);
  }, [keys]);

  // A fresh flight from the plan dialog. Spots and runways used elsewhere are kept for next time.
  const startFlight = (settings, plan) => {
    setFlight((f) => startPlan(f, settings, plan, airfields));
    setPrompt(null);
    closeDialog();
  };
  const savePlan = (settings, plan) => {
    setFlight((f) => editPlan(f, settings, plan, airports));
    closeDialog();
  };
  const nextStop = useCallback(() => {
    setFlight((f) => advanceLeg(f, airports));
    setPrompt(null);
  }, [airports]);

  useEffect(() => {
    if (hydrated) writeJson(keys.flight, flight);
  }, [flight, hydrated, keys]);

  const update = useCallback((patch) => setFlight((f) => ({ ...f, ...patch })), []);
  const setPhase = useCallback((phase) => setFlight((f) => withPhase(f, phase)), []);

  // ---- Charts: built-in calibration, replaced by the pilot's own radar fixes when taken ----
  const geoFor = useCallback((icao) => chartCal[icao] || charts[icao], [chartCal, charts]);
  const onCalibrate = (icao, fixes) => {
    const geo = calibrateChart(charts[icao], fixes);
    if (!geo) return;
    const next = { ...chartCal, [icao]: geo };
    setChartCal(next);
    writeJson(keys.charts, next);
  };
  const onResetCalibration = (icao) => {
    const next = { ...chartCal };
    delete next[icao];
    setChartCal(next);
    writeJson(keys.charts, next);
  };

  // ---- Radar (GTA World only) ----
  const { registration, callsign } = flight;
  const ids = useMemo(() => radarIds({ registration, callsign }), [registration, callsign]);
  const radar = useRadar({ enabled: hydrated && edition.radar && flight.radarOn, ids });
  const aircraft = radar.snapshot?.aircraft;
  const own = useMemo(() => aircraft?.find((a) => isOwnAircraft(a, ids)) || null, [aircraft, ids]);
  // Dead reckoning between radar samples, shared by the map and the airport chart.
  const [tracker] = useState(createMotionTracker);
  useIsomorphicLayoutEffect(() => {
    if (radar.snapshot) tracker.ingest(radar.snapshot.aircraft, radar.snapshot.fetchedAt, performance.now());
  }, [radar.snapshot, tracker]);
  const contextIcao = contextAirport(flight);
  const traffic = useMemo(() => {
    const center = own || airports[contextIcao].position;
    return (aircraft || [])
      .filter((a) => a !== own)
      .map((a) => ({ ...a, distanceM: distance(center, a), fromCenter: bearing(center, a) }))
      .sort((a, b) => a.distanceM - b.distanceM);
  }, [aircraft, own, airports, contextIcao]);

  // Altitude, place, heading and inbound direction follow the radar while auto-fill is on.
  useEffect(() => {
    if (!own || !flight.radarSync) return;
    setFlight((f) => {
      const patch = radarPatch(f, own);
      return patch ? { ...f, ...patch } : f;
    });
  }, [own, flight.radarSync, flight.phase, flight.arr]);

  const feed = useMemo(() => (radar.snapshot ? analyzeFeed(radar.snapshot.atc, ids) : null), [radar.snapshot, ids]);

  // A new controller message for us lands in the readback panel by itself.
  const latestForMe = feed?.latestForMe;
  useEffect(() => {
    if (!latestForMe || latestForMe.id === autoReadbackId.current) return;
    autoReadbackId.current = latestForMe.id;
    if (Date.now() - Date.parse(latestForMe.timestamp) < AUTO_READBACK_MAX_AGE_MS) setIncoming(latestForMe);
  }, [latestForMe]);

  const alerts = useMemo(() => airspaceAlerts(own, saaa.data?.notams), [own, saaa.data]);
  const suggestions = useMemo(() => radarSuggestions(flight, own), [flight, own]);

  // ---- Taxi route from the airport diagram ----
  const outbound = OUTBOUND_PHASES.includes(flight.phase);
  // A helicopter only taxis (hover taxi) when it uses a runway; from a spot or a site it lifts off right there.
  const taxiing = !isHeli(flight) || heliPoint(flight) === "runway";
  const routeIcao = !taxiing ? null : outbound ? flight.dep : flight.phase === "taxiin" ? flight.arr : null;
  const route = useMemo(() => {
    if (!routeIcao || !taxi[routeIcao]) return null;
    // With a calibrated chart, start from where the radar actually sees us on the ground.
    let startNode;
    if (own && !own.airborne && own.atAirport?.icao === routeIcao && chartCal[routeIcao]) {
      startNode = nearestNode(taxi[routeIcao], worldToChart(chartCal[routeIcao], own));
    }
    return taxiRoute({
      taxi,
      icao: routeIcao,
      spot: flight.spots[routeIcao],
      runway: flight.runways[routeIcao],
      direction: outbound ? "out" : "in",
      startNode,
    });
  }, [taxi, routeIcao, outbound, flight.spots, flight.runways, own, chartCal]);

  useEffect(() => {
    if (!flight.autoRoute || !route) return;
    setFlight((f) => {
      const sameVia = f.via.join("|") === route.via.join("|");
      const hold = route.hold ?? f.hold;
      return sameVia && f.hold === hold ? f : { ...f, via: route.via, hold };
    });
  }, [route, flight.autoRoute, flight.phase]);

  // ---- Calls ----
  const calls = useMemo(() => ph.buildCalls(flight), [ph, flight]);

  const copyCall = useCallback(
    (call) => {
      copy(call.channel === "atc" ? `${ATC_PREFIX}${call.text}` : call.text, `call-${call.id}`);
      if (flight.autoAdvance && call.next) setPhase(call.next);
      // Counting the touch and go (…) of this stop; the last one, or the last call after a
      // full stop on the way, offers to go on to the next stop.
      const { plan } = flight;
      const stop = plan.stops[plan.leg];
      if (isLastLeg(flight)) return;
      if (call.id === "final" && flight.phase === "pattern" && isRepeated(stop, isHeli(flight))) {
        const reps = plan.reps + 1;
        setFlight((f) => ({ ...f, plan: { ...f.plan, reps } }));
        if (reps >= stop.count) setPrompt(plan.leg);
      } else if (flight.phase === "taxiin" && call.id === calls[calls.length - 1]?.id) {
        setPrompt(plan.leg);
      }
    },
    [copy, flight, calls, setPhase]
  );

  // Number keys copy the matching call when no field is focused.
  useEffect(() => {
    const onKey = (e) => {
      if (emergency || dialog || isTyping(document.activeElement) || e.ctrlKey || e.metaKey || e.altKey) return;
      const n = Number(e.key);
      if (!n) return;
      const call = calls[n - 1];
      if (call?.text) {
        e.preventDefault();
        copyCall(call);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [calls, copyCall, emergency, dialog]);

  const pickRunway = (icao, rwy) => update({ runways: { ...flight.runways, [icao]: rwy } });

  const modes = [
    { value: "CTAF", label: "CTAF", sub: t("122.800 · ATC OFF") },
    { value: "CENTER", label: t("SA CENTER"), sub: t("ATC ONLINE") },
  ];

  return (
    <div
      className="relative flex h-screen w-screen flex-col overflow-hidden bg-av-bg text-av-text"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at 50% -20%, rgba(61,220,245,0.07), transparent 60%), linear-gradient(rgba(61,220,245,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(61,220,245,0.025) 1px, transparent 1px)",
        backgroundSize: "auto, 32px 32px, 32px 32px",
      }}
    >
      <header className="relative z-10 flex flex-wrap items-center gap-3 border-b border-av-bezel bg-black/60 px-4 py-2 backdrop-blur">
        <Link href="/" className="flex items-center gap-2" title={t("Back to the edition choice")}>
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-av-cyan" fill="currentColor" aria-hidden="true">
            <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
          </svg>
          <div className="leading-none">
            <div className="font-avmono text-[11px] font-bold tracking-[0.22em] text-av-text">FLIGHT INSTRUMENTS</div>
            <div className="mt-0.5 font-avmono text-[9px] tracking-[0.26em] text-av-mute">{edition.name.toUpperCase()}</div>
          </div>
        </Link>

        {edition.center && (
        <div className="flex items-stretch overflow-hidden rounded border border-av-line" role="group" aria-label={t("COM frequency")}>
          <span className="flex items-center bg-av-panel2 px-2 font-avmono text-[9px] font-bold tracking-widest text-av-mute">COM1</span>
          {modes.map((m) => {
            const active = flight.mode === m.value;
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => update({ mode: m.value })}
                className={`px-3 py-1 text-left font-avmono transition-colors ${active ? "bg-av-green/15 text-av-green" : "bg-black/40 text-av-mute hover:text-av-text"}`}
              >
                <div className="text-[12px] font-bold leading-tight">{m.label}</div>
                <div className="text-[8px] tracking-widest">{m.sub}</div>
              </button>
            );
          })}
        </div>
        )}

        {edition.radar && (
          <div className="flex items-center gap-1.5">
            <Readout label="ALT" value={own ? own.altFt.toLocaleString("en-US") : "----"} unit="FT" dim={!own} />
            <Readout label="HDG" value={own ? String(own.heading).padStart(3, "0") : "---"} unit={own ? cardinalAbbr(own.heading) : "°"} tone="text-av-magenta" dim={!own} />
            <Readout label="GS" value={own?.speedKt != null ? Math.round(own.speedKt) : "---"} unit="KT" dim={!own} />
            <div className={`hidden min-w-[140px] max-w-[220px] rounded border border-av-line bg-black/60 px-2 py-1 lg:block ${own ? "" : "opacity-40"}`}>
              <div className="font-avmono text-[9px] font-bold uppercase tracking-[0.16em] text-av-mute">POS</div>
              <div className="truncate font-avmono text-[12px] font-bold leading-tight text-av-cyan">{own ? own.place : "NO RADAR FIX"}</div>
            </div>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden font-avmono text-[11px] text-av-dim xl:inline">
            {isHeli(flight) && <span className="mr-1 text-av-magenta">🚁 {flight.heliRole === "civil" ? "HELI" : flight.heliRole.toUpperCase()} ·</span>}
            <span className="text-av-cyan">{flight.callsign || t("[CALLSIGN]")}</span> ·{" "}
            {flight.plan.stops.map((s, i) => (
              <span key={s.id} className={i === flight.plan.leg ? "font-bold text-av-magenta" : i < flight.plan.leg - 1 ? "text-av-mute" : ""}>
                {i > 0 && " ▸ "}
                {stopLabel(s, airports)}
              </span>
            ))}{" "}
            · {flight.rules}
          </span>
          {[
            { kind: "pan", label: "PAN-PAN", cls: "border-av-amber text-av-amber hover:bg-av-amber/20" },
            { kind: "mayday", label: "MAYDAY", cls: "border-av-red text-av-red hover:bg-av-red/20" },
          ].map((b) => (
            <button
              key={b.kind}
              type="button"
              onClick={() => setEmergency(b.kind)}
              className={`rounded border-2 px-3 py-1.5 font-avmono text-[11px] font-bold tracking-widest transition-colors ${b.cls}`}
              style={{ backgroundImage: "repeating-linear-gradient(135deg, transparent 0 6px, rgba(255,255,255,0.04) 6px 12px)" }}
            >
              {b.label}
            </button>
          ))}
        </div>
      </header>

      <main className="relative z-10 flex-1 overflow-y-auto p-3 xl:overflow-hidden">
        <div className="grid grid-cols-1 gap-3 xl:h-full xl:grid-cols-[330px_minmax(0,1fr)_minmax(400px,500px)]">
          <div className="space-y-3 xl:overflow-y-auto xl:pr-1">
            <PlanPanel
              flight={flight}
              update={update}
              onNewFlight={() => setDialog(flight.callsign ? "choose" : "new")}
              onEdit={() => setDialog("edit")}
              onNextStop={nextStop}
            />
            {edition.saaa && <Briefing flight={flight} saaa={saaa} onUseRunway={pickRunway} />}
            {edition.radar && <AtcFeed feed={feed} flight={flight} update={update} onUseForReadback={(m) => setIncoming({ ...m })} />}
          </div>

          <div className="xl:overflow-y-auto xl:pr-1">
            <CallsPanel
              flight={flight}
              update={update}
              setPhase={setPhase}
              calls={calls}
              copiedKey={copiedKey}
              onCopyCall={copyCall}
              saaaData={saaa.data}
              route={route}
              alerts={alerts}
              suggestions={suggestions}
              radarSynced={Boolean(own && flight.radarSync)}
              onNextStop={nextStop}
              readback={<ReadbackPanel flight={flight} copiedKey={copiedKey} copy={copy} incoming={incoming} />}
            />
          </div>

          <div className="space-y-3 xl:overflow-y-auto xl:pr-1">
            <NavPanel flight={flight} update={update} radar={radar} own={own} traffic={traffic} tracker={tracker} />
            <ChartPanel
              flight={flight}
              update={update}
              own={own}
              traffic={traffic}
              route={route}
              contextIcao={contextIcao}
              geoFor={geoFor}
              calibrated={chartCal}
              onCalibrate={onCalibrate}
              onResetCalibration={onResetCalibration}
              saaaData={saaa.data}
              tracker={tracker}
            />
          </div>
        </div>
      </main>

      {hydrated && prompt === flight.plan.leg && !dialog && !emergency && <StopPrompt flight={flight} onNext={nextStop} onDismiss={() => setPrompt(null)} />}
      {hydrated && dialog && (
        <FlightPlanDialog
          key={dialog}
          mode={dialog}
          flight={flight}
          saaaData={saaa.data}
          onStart={startFlight}
          onSave={savePlan}
          onResume={closeDialog}
          onClose={closeDialog}
        />
      )}
      {emergency && (
        <EmergencyPanel key={emergency} kind={emergency} flight={flight} update={update} copiedKey={copiedKey} copy={copy} onClose={() => setEmergency(null)} />
      )}
    </div>
  );
}

// The stop looks done (last touch and go copied, or parked after a full stop on the way):
// one click goes on to the next stop. Never automatic.
function StopPrompt({ flight, onNext, onDismiss }) {
  const { t, airports } = useEdition();
  const { plan } = flight;
  const stop = plan.stops[plan.leg];
  const next = plan.stops[plan.leg + 1];
  const heli = isHeli(flight);
  const type = stopType(stop, heli);
  const nextType = stopType(next, heli);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onDismiss();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  return (
    <div
      role="dialog"
      aria-label={t("Stop done?")}
      className="fixed bottom-4 left-1/2 z-40 w-[min(92vw,440px)] -translate-x-1/2 rounded-md border-2 border-av-amber bg-av-panel p-3 shadow-[0_18px_50px_rgba(0,0,0,0.7)]"
    >
      <div className="font-avmono text-[10px] font-bold uppercase tracking-[0.18em] text-av-amber">{t("Stop done?")}</div>
      <div className="mt-1 font-avmono text-[15px] font-bold text-av-text">
        {stopLabel(stop, airports)} ✓{" "}
        <span className="text-[12px] font-normal text-av-dim">
          {t(STOP_TYPE_LABELS[type])}
          {type !== "full" ? ` ${Math.min(plan.reps, stop.count)}/${stop.count}` : ""}
        </span>
      </div>
      <div className="font-avmono text-[12px] text-av-dim">
        {t("Next: {stop}", { stop: stopLabel(next, airports) })} · {t(STOP_TYPE_LABELS[nextType])}
        {nextType !== "full" && next.count > 1 ? ` ×${next.count}` : ""}
        {next.route.length > 0 ? ` · ${next.route.length} WP` : ""}
      </div>
      <div className="mt-2.5 flex gap-2">
        <button type="button" autoFocus onClick={onNext} className={`flex-1 px-3 py-2 text-[11px] ${actionClass("primary")}`}>
          {t("Next stop ▸")}
        </button>
        <button type="button" onClick={onDismiss} className={`px-3 py-2 text-[11px] ${actionClass()}`}>
          {t("Not yet · Esc")}
        </button>
      </div>
    </div>
  );
}
