"use client";

import { useEffect, useState } from "react";
import { AIRPORTS } from "@/lib/atc/airports";
import { ageLabel, closedRunwayEnds, recommendedRunway, relevantNotams, weatherFor } from "@/lib/atc/briefing";
import { CHART_GEO } from "@/lib/atc/geo";
import { TAXI, taxiRoute } from "@/lib/atc/taxi";
import { useEdition } from "./EditionContext";
import { ChipGroup, FieldLabel, softkeyClass } from "./ui";
import { metar } from "./Briefing";

const airportOptions = Object.values(AIRPORTS).map((a) => ({ value: a.icao, label: a.icao, title: a.name }));
const inputClass =
  "w-full rounded border border-av-line bg-black/50 px-2.5 py-1.5 font-avmono text-sm text-av-cyan placeholder-av-mute focus:outline-none focus:border-av-cyan";
const PRIORITY_STYLES = {
  urgent: "text-av-red border-av-red/60",
  high: "text-av-amber border-av-amber/60",
  medium: "text-av-amber/80 border-av-amber/40",
  low: "text-av-green border-av-green/50",
};

// Runway ends the weather and the NOTAMs have something to say about.
function runwayHints(icao, saaaData) {
  const airport = AIRPORTS[icao];
  const closed = closedRunwayEnds(saaaData?.notams, airport);
  return { closed, best: recommendedRunway(airport, weatherFor(airport, saaaData?.weather), closed) };
}

/* ----------------------------------------------------- airport diagram */

// The SAAA diagram with every parking spot and runway end clickable, and the taxi route
// between the chosen spot and runway drawn on it. Zoomed out, only the chosen spot is named
// (the others would pile up); hovering a spot names it too.
function ChartPicker({ icao, spot, runway, direction, closed, best, onSpot, onRunway }) {
  const { t } = useEdition();
  const airport = AIRPORTS[icao];
  const geo = CHART_GEO[icao];
  const graph = TAXI[icao];
  const [hover, setHover] = useState(null);
  const k = geo.width / 60;
  const route = graph ? taxiRoute({ icao, spot, runway, direction }) : null;
  const spots = graph ? Object.entries(graph.spots) : [];

  return (
    <div className="space-y-1.5">
      <svg
        viewBox={`0 0 ${geo.width} ${geo.height}`}
        className="w-full select-none rounded border border-av-line bg-[#0b0f14]"
        style={{ aspectRatio: `${geo.width} / ${geo.height}`, maxHeight: "52vh" }}
        role="img"
        aria-label={t("{airport} diagram", { airport: airport.name })}
      >
        <image href={airport.chart} x={0} y={0} width={geo.width} height={geo.height} style={{ filter: "invert(0.92) hue-rotate(180deg) contrast(0.95)" }} />

        {route && route.points.length > 1 && (
          <polyline
            points={route.points.map((p) => p.join(",")).join(" ")}
            fill="none"
            className="stroke-av-magenta"
            strokeWidth={k * 0.35}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {graph &&
          Object.entries(graph.thresholds).map(([rwy, node]) => {
            const [x, y] = graph.nodes[node];
            const active = runway === rwy;
            const isClosed = closed.includes(rwy);
            return (
              <g
                key={rwy}
                transform={`translate(${x} ${y})`}
                onClick={() => !isClosed && onRunway(rwy)}
                style={{ cursor: isClosed ? "not-allowed" : "pointer" }}
                opacity={isClosed ? 0.35 : 1}
              >
                <title>{isClosed ? `Runway ${rwy} closed by NOTAM` : t("Runway {rwy}", { rwy })}</title>
                <circle r={k * 2.2} fill="transparent" />
                <circle r={k * 1.3} className={active ? "fill-av-magenta" : "fill-av-cyan/80"} />
                <text y={-k * 1.8} fontSize={k * 1.7} textAnchor="middle" className={`font-avmono font-bold ${active ? "fill-av-magenta" : "fill-av-cyan"}`}>
                  {rwy}
                  {rwy === best ? " ★" : ""}
                </text>
              </g>
            );
          })}

        {spots.map(([name, node], i) => {
          const [x, y] = graph.nodes[node];
          const active = spot === name;
          const stack = spots.slice(0, i).filter(([, n]) => n === node).length;
          return (
            <g
              key={name}
              transform={`translate(${x} ${y + stack * k * 1.8})`}
              onClick={() => onSpot(name)}
              onMouseEnter={() => setHover(name)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer" }}
            >
              <title>{name}</title>
              <rect x={-k * 1.4} y={-k * 1.4} width={k * 2.8} height={k * 2.8} fill="transparent" />
              <rect x={-k * 0.8} y={-k * 0.8} width={k * 1.6} height={k * 1.6} className={active ? "fill-av-green" : "fill-av-green/40 stroke-av-green"} strokeWidth={k * 0.15} />
              {(active || hover === name) && (
                <text x={k * 1.3} y={k * 0.55} fontSize={k * 1.4} className="fill-av-green font-avmono font-bold" paintOrder="stroke" stroke="#0b0f14" strokeWidth={k * 0.4}>
                  {name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 font-avmono text-[10px] text-av-dim">
        {graph ? (
          <>
            <span className="text-av-cyan">● {t("runway end · click")}</span>
            <span className="text-av-green">■ {t("parking · click")}</span>
            <span className="text-av-magenta">━ {t("taxi route")}</span>
          </>
        ) : (
          <span>{t("No clickable diagram for this airport yet: pick from the list.")}</span>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------- reminder strip */

function Reminder({ dep, arr, saaaData }) {
  const icaos = [...new Set([dep, arr])];
  const notams = relevantNotams(saaaData?.notams, icaos);
  return (
    <div className="space-y-1.5 border-t border-av-bezel bg-black/30 px-4 py-2.5">
      <div className="font-avmono text-[9px] font-bold uppercase tracking-[0.18em] text-av-mute">Reminder · weather &amp; NOTAM</div>
      {!saaaData ? (
        <div className="font-avmono text-[10px] text-av-mute">Loading the SAAA briefing…</div>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 font-avmono text-[11px]">
            {icaos.map((icao) => {
              const w = weatherFor(AIRPORTS[icao], saaaData.weather);
              return (
                <span key={icao} className={w ? "text-av-green" : "text-av-mute"}>
                  {w ? metar(icao, w) : `${icao} no weather`}
                  {w && <span className="text-av-mute"> · {ageLabel(w.updatedAt)}</span>}
                </span>
              );
            })}
          </div>
          {notams.length === 0 ? (
            <div className="font-avmono text-[10px] text-av-mute">NOTAM: nil</div>
          ) : (
            <ul className="max-h-16 space-y-0.5 overflow-y-auto pr-1">
              {notams.map((n) => (
                <li key={n.id} className="flex items-baseline gap-2 text-[11px] leading-snug text-av-dim">
                  <span className={`shrink-0 rounded border px-1 font-avmono text-[8px] uppercase ${PRIORITY_STYLES[n.priority] || "text-av-dim border-av-line"}`}>{n.priority}</span>
                  <span className="min-w-0">{n.message}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ dialog */

// Shown once per browser session, filled with the last flight (restored from localStorage):
// the pilot checks the few things that change between flights and starts right away.
export default function PreflightDialog({ flight, saaaData, onStart, onResume }) {
  const { edition, t, ph } = useEdition();
  const [draft, setDraft] = useState(() => ({
    callsign: flight.callsign,
    registration: flight.registration,
    dep: flight.dep,
    arr: flight.arr,
    rules: flight.rules,
    mode: flight.mode,
    radarOn: flight.radarOn,
    spot: flight.spots[flight.dep] || "",
    runway: flight.runways[flight.dep],
    arrSpot: flight.spots[flight.arr] || "",
    arrRunway: flight.runways[flight.arr],
  }));
  const [showReg, setShowReg] = useState(Boolean(flight.registration));
  const [chartTab, setChartTab] = useState("dep");
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  // Same airport both ways (pattern work): one runway, one parking, one diagram.
  const roundTrip = draft.dep === draft.arr;
  const tab = roundTrip ? "dep" : chartTab;
  const dep = AIRPORTS[draft.dep];
  const arr = AIRPORTS[draft.arr];
  const depHints = runwayHints(draft.dep, saaaData);
  const arrHints = runwayHints(draft.arr, saaaData);
  const ready = draft.callsign.trim().length > 1 && draft.runway && !depHints.closed.includes(draft.runway);

  // Changing an airport brings back what was used there last time.
  const pickDeparture = (icao) =>
    set({ dep: icao, spot: flight.spots[icao] || AIRPORTS[icao].spots[0], runway: flight.runways[icao] || AIRPORTS[icao].defaultRunway });
  const pickArrival = (icao) =>
    set({ arr: icao, arrSpot: flight.spots[icao] || AIRPORTS[icao].spots[0], arrRunway: flight.runways[icao] || AIRPORTS[icao].defaultRunway });

  // Escape resumes the previous flight, when there is one to resume.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && flight.callsign && onResume();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flight.callsign, onResume]);

  const submit = (e) => {
    e.preventDefault();
    if (ready) onStart(roundTrip ? { ...draft, arrSpot: draft.spot, arrRunway: draft.runway } : draft);
  };

  const runwayChips = (airport, hints, value, onChange) => (
    <ChipGroup
      size="sm"
      options={airport.runwayEnds.map((end) => ({
        value: end.id,
        label: end.id,
        disabled: hints.closed.includes(end.id),
        badge: end.id === hints.best ? "★" : hints.closed.includes(end.id) ? "CLSD" : null,
      }))}
      value={value}
      onChange={onChange}
    />
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        role="dialog"
        aria-label={t("Preflight")}
        className="my-6 w-full max-w-6xl rounded-md border border-av-bezel bg-av-panel shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_24px_60px_rgba(0,0,0,0.6)]"
      >
        <header className="flex items-center justify-between gap-2 border-b border-av-bezel bg-av-panel2/70 px-4 py-2">
          <h2 className="flex items-center gap-2 font-avmono text-[11px] font-bold uppercase tracking-[0.18em] text-av-dim">
            <span className="h-2.5 w-[3px] rounded-sm bg-av-magenta" aria-hidden="true" />
            {t("Preflight")}
          </h2>
          <span className="font-avmono text-[10px] text-av-mute">{flight.callsign ? t("LAST FLIGHT LOADED") : t("NEW PILOT")}</span>
        </header>

        <div className="grid grid-cols-1 gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          {/* ---- the form ---- */}
          <div className="space-y-4">
            <div className={`grid grid-cols-1 gap-3 ${edition.radar ? "sm:grid-cols-[1fr_auto]" : ""}`}>
              <label className="block">
                <FieldLabel>{t("Callsign")}</FieldLabel>
                <input
                  value={draft.callsign}
                  onChange={(e) => set({ callsign: e.target.value.replace(/\s+/g, " ").trimStart() })}
                  placeholder={t("N123AB or IMEX Air 434")}
                  autoFocus={!draft.callsign}
                  className={`${inputClass} !py-2 !text-lg font-bold`}
                />
              </label>
              {edition.radar && (
              <div>
                <FieldLabel>Live radar</FieldLabel>
                <ChipGroup
                  tone="green"
                  options={[
                    { value: true, label: "● On" },
                    { value: false, label: "Off" },
                  ]}
                  value={draft.radarOn}
                  onChange={(radarOn) => set({ radarOn })}
                />
              </div>
              )}
            </div>
            {!edition.radar ? null : showReg ? (
              <label className="block">
                <FieldLabel>Radar registration (only if different)</FieldLabel>
                <input
                  value={draft.registration}
                  onChange={(e) => set({ registration: e.target.value.toUpperCase().replace(/\s+/g, "") })}
                  placeholder="N434IA for IMEX Air 434"
                  className={inputClass}
                />
              </label>
            ) : (
              <button type="button" onClick={() => setShowReg(true)} className="font-avmono text-[10px] uppercase tracking-wider text-av-mute hover:text-av-cyan">
                + Radar registration differs from callsign
              </button>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ChipGroup label={t("Departure")} options={airportOptions} value={draft.dep} onChange={pickDeparture} />
              <ChipGroup label={t("Arrival")} options={airportOptions} value={draft.arr} onChange={pickArrival} />
            </div>

            <div className="space-y-2 rounded border border-av-line/70 bg-black/20 p-3">
              <div className="font-avmono text-[10px] font-bold uppercase tracking-[0.14em] text-av-cyan">{t("Departure")} · {dep.shortName}</div>
              <div>
                <FieldLabel>{t("Starting position")}</FieldLabel>
                <ChipGroup
                  size="sm"
                  options={dep.spots.map((s) => ({ value: s, label: s }))}
                  value={draft.spot}
                  onChange={(spot) => {
                    set({ spot });
                    setChartTab("dep");
                  }}
                />
                <input
                  value={draft.spot}
                  onChange={(e) => set({ spot: e.target.value })}
                  onFocus={() => setChartTab("dep")}
                  placeholder={t("Or type it (Gate 8…)")}
                  aria-label={t("Custom starting position")}
                  className={`${inputClass} mt-1.5 !text-xs`}
                />
              </div>
              <div>
                <FieldLabel>{t("Takeoff runway")}</FieldLabel>
                {runwayChips(dep, depHints, draft.runway, (runway) => {
                  set({ runway });
                  setChartTab("dep");
                })}
              </div>
            </div>

            {!roundTrip && (
              <div className="space-y-2 rounded border border-av-line/70 bg-black/20 p-3">
                <div className="font-avmono text-[10px] font-bold uppercase tracking-[0.14em] text-av-cyan">{t("Arrival")} · {arr.shortName}</div>
                <div>
                  <FieldLabel>{t("Landing runway")}</FieldLabel>
                  {runwayChips(arr, arrHints, draft.arrRunway, (arrRunway) => {
                    set({ arrRunway });
                    setChartTab("arr");
                  })}
                </div>
                <div>
                  <FieldLabel>{t("Parking after landing")}</FieldLabel>
                  <ChipGroup
                    size="sm"
                    options={arr.spots.map((s) => ({ value: s, label: s }))}
                    value={draft.arrSpot}
                    onChange={(arrSpot) => {
                      set({ arrSpot });
                      setChartTab("arr");
                    }}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ChipGroup
                label={t("Flight rules")}
                size="sm"
                options={[
                  { value: "VFR", label: "VFR" },
                  { value: "IFR", label: "IFR" },
                ]}
                value={draft.rules}
                onChange={(rules) => set({ rules })}
              />
              <ChipGroup
                label={t("Frequency")}
                size="sm"
                options={[
                  { value: "CTAF", label: t("CTAF · ATC off") },
                  { value: "CENTER", label: ph.STATION },
                ]}
                value={draft.mode}
                onChange={(mode) => set({ mode })}
              />
            </div>
          </div>

          {/* ---- the diagram ---- */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <FieldLabel>{t("Airport diagram")}</FieldLabel>
              {!roundTrip && (
                <ChipGroup
                  size="sm"
                  options={[
                    { value: "dep", label: `${t("Departure")} · ${draft.dep}` },
                    { value: "arr", label: `${t("Arrival")} · ${draft.arr}` },
                  ]}
                  value={tab}
                  onChange={setChartTab}
                />
              )}
            </div>
            {tab === "dep" ? (
              <ChartPicker
                key={`dep-${draft.dep}`}
                icao={draft.dep}
                spot={draft.spot}
                runway={draft.runway}
                direction="out"
                closed={depHints.closed}
                best={depHints.best}
                onSpot={(spot) => set({ spot })}
                onRunway={(runway) => set({ runway })}
              />
            ) : (
              <ChartPicker
                key={`arr-${draft.arr}`}
                icao={draft.arr}
                spot={draft.arrSpot}
                runway={draft.arrRunway}
                direction="in"
                closed={arrHints.closed}
                best={arrHints.best}
                onSpot={(arrSpot) => set({ arrSpot })}
                onRunway={(arrRunway) => set({ arrRunway })}
              />
            )}
          </div>
        </div>

        {edition.saaa && <Reminder dep={draft.dep} arr={draft.arr} saaaData={saaaData} />}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-av-bezel px-4 py-3">
          {flight.callsign ? (
            <button type="button" onClick={onResume} className="font-avmono text-[10px] uppercase tracking-wider text-av-mute hover:text-av-text">
              {t("Resume last session as it was · Esc")}
            </button>
          ) : (
            <span className="font-avmono text-[10px] text-av-mute">{t("Everything stays editable afterwards.")}</span>
          )}
          <button type="submit" disabled={!ready} className={`px-5 py-2 text-[12px] uppercase tracking-widest ${softkeyClass(true, "magenta")}`}>
            {t("Start flight ▸")}
          </button>
        </footer>
      </form>
    </div>
  );
}
