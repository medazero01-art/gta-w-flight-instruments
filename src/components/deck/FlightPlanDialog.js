"use client";

import { useEffect, useState } from "react";
import { ageLabel, closedRunwayEnds, recommendedRunway, relevantNotams, weatherFor } from "@/lib/atc/briefing";
import { taxiRoute } from "@/lib/atc/taxi";
import { describePlace, distance, formatNm, nearestAirport } from "@/lib/atc/radar";
import { MAX_REPS, STOP_TYPE_LABELS, inboundDir, isRepeated, isSite, legPath, makeStop, newStopId, stopLabel, stopPoint, stopPosition, stopType } from "@/lib/atc/plan";
import { useEdition } from "./EditionContext";
import WorldMap, { AirportsLayer, PlanLayer } from "./WorldMap";
import { ChipGroup, FieldLabel, actionClass } from "./ui";
import { metar } from "./Briefing";

const inputClass =
  "w-full rounded border border-av-line bg-black/50 px-2.5 py-1.5 font-avmono text-sm text-av-cyan placeholder-av-mute focus:outline-none focus:border-av-cyan";
const PRIORITY_STYLES = {
  urgent: "text-av-red border-av-red/60",
  high: "text-av-amber border-av-amber/60",
  medium: "text-av-amber/80 border-av-amber/40",
  low: "text-av-green border-av-green/50",
};

// Runway ends the weather and the NOTAMs have something to say about.
function runwayHints(airport, saaaData) {
  const closed = closedRunwayEnds(saaaData?.notams, airport);
  return { closed, best: recommendedRunway(airport, weatherFor(airport, saaaData?.weather), closed) };
}

/* ----------------------------------------------------- airport diagram */

// The SAAA diagram with every parking spot and runway end clickable, and the taxi route
// between the chosen spot and runway drawn on it. Zoomed out, only the chosen spot is named
// (the others would pile up); hovering a spot names it too.
// `showRoute` is off for a helicopter lifting off from / landing on its spot: no taxi there.
function ChartPicker({ icao, spot, runway, direction, showRoute = true, closed, best, onSpot, onRunway }) {
  const { t, airports, taxi, charts } = useEdition();
  const airport = airports[icao];
  const geo = charts[icao];
  const graph = taxi[icao];
  const [hover, setHover] = useState(null);
  const k = geo.width / 60;
  const route = graph && showRoute ? taxiRoute({ taxi, icao, spot, runway, direction }) : null;
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

function Reminder({ icaos, saaaData }) {
  const { airports } = useEdition();
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
              const w = weatherFor(airports[icao], saaaData.weather);
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

const AIRCRAFT_OPTIONS = (t) => [
  { value: "airplane", label: `✈ ${t("Airplane")}` },
  { value: "helicopter", label: `🚁 ${t("Helicopter")}` },
];
const ROLE_OPTIONS = (t) => [
  { value: "civil", label: t("Civil") },
  { value: "medevac", label: "MEDEVAC" },
  { value: "sd", label: "SD" },
];

const pathLength = (path) => path.slice(1).reduce((sum, p, i) => sum + distance(path[i], p), 0);

// One line per stop: "KLSI ▸ KSSA T&G×2 ▸ KLGP", the stops already done ticked.
export function PlanSummary({ plan, airports, heli, doneBefore = 0, className = "" }) {
  const { t } = useEdition();
  return (
    <div className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 font-avmono text-[12px] ${className}`}>
      {plan.stops.map((s, i) => {
        const type = i > 0 ? stopType(s, heli) : null;
        const done = i < doneBefore;
        return (
          <span key={s.id} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-av-magenta">▸</span>}
            <span className={done ? "text-av-green/70 line-through" : i === doneBefore ? "font-bold text-av-magenta" : "text-av-text"}>
              {done && "✓ "}
              {stopLabel(s, airports)}
              {type && type !== "full" && <span className="ml-1 text-av-amber">{t(STOP_TYPE_LABELS[type])}{s.count > 1 ? ` ×${s.count}` : ""}</span>}
            </span>
          </span>
        );
      })}
    </div>
  );
}

// Fresh ids, so a new flight never mixes up with the progress of the previous one.
const copyStops = (stops) => stops.map((s) => ({ ...s, id: newStopId(), route: s.route.map((p) => ({ ...p })) }));

// `mode`: "choose" (a flight is saved: resume it or start a new one), "new" or "edit".
// Shown with each new browser session and by the New flight / Edit buttons.
export default function FlightPlanDialog({ mode, flight, saaaData, onStart, onSave, onResume, onClose }) {
  const { edition, t, ph, airports } = useEdition();
  const isEdit = mode === "edit";
  const [screen, setScreen] = useState(mode === "choose" ? "choose" : "form");
  const [draft, setDraft] = useState(() => ({
    callsign: flight.callsign,
    registration: flight.registration,
    aircraft: flight.aircraft,
    heliRole: flight.heliRole,
    rules: flight.rules,
    mode: flight.mode,
    radarOn: flight.radarOn,
  }));
  const [stops, setStops] = useState(() => (isEdit ? flight.plan.stops : copyStops(flight.plan.stops)));
  const [selected, setSelected] = useState(() => (isEdit ? flight.plan.leg : 1));
  const [tab, setTab] = useState("map");
  const [showReg, setShowReg] = useState(Boolean(flight.registration));
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const heli = draft.aircraft === "helicopter";
  const plan = { stops, leg: 1, reps: 0 };
  const sel = Math.min(selected, stops.length - 1);
  const selStop = stops[sel];
  const activeLeg = Math.max(1, sel);
  const placing = heli && isSite(selStop) && !Number.isFinite(selStop.site.x);

  const setStop = (i, patch) => setStops((list) => list.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const firstOther = (icao) => Object.keys(airports).find((k) => k !== icao) || icao;
  const addStop = () => {
    const last = stops[stops.length - 1];
    setStops([...stops, makeStop(firstOther(isSite(last) ? null : last.icao), { point: heli ? "spot" : "runway" })]);
    setSelected(stops.length);
    setTab("map");
  };
  const removeStop = (i) => {
    // The waypoints drawn to the removed stop now lead to the next one.
    const next = stops.filter((_, j) => j !== i).map((s, j) => (j === i ? { ...s, route: [...stops[i].route, ...s.route] } : s));
    setStops(next);
    setSelected(Math.max(1, Math.min(i, next.length - 1)));
  };
  const restart = () => {
    // From where the last plan ended (the nearest airport for a site).
    const last = stops[stops.length - 1];
    setStops([makeStop(last.icao, { spot: isSite(last) ? "" : last.spot }), makeStop(firstOther(last.icao))]);
    setSelected(1);
  };

  const hintsFor = (stop) => runwayHints(airports[stop.icao], saaaData);
  const closedPicked = stops.some((s) => s.runway && hintsFor(s).closed.includes(s.runway));
  const siteMissing = heli && stops.some((s) => isSite(s) && (!s.site.name.trim() || !Number.isFinite(s.site.x)));
  const problem =
    draft.callsign.trim().length < 2
      ? t("Enter your callsign.")
      : siteMissing
        ? t("Name every off-airfield site and place it on the map.")
        : closedPicked
          ? t("A chosen runway is closed by NOTAM.")
          : null;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (isEdit) onClose();
      else if (flight.callsign) onResume();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isEdit, flight.callsign, onClose, onResume]);

  const submit = (e) => {
    e.preventDefault();
    if (problem) return;
    // The helicopter mission sets the MEDEVAC prefix; airplanes keep their own toggle.
    const settings = { ...draft, callsign: draft.callsign.trim(), medevac: heli ? draft.heliRole === "medevac" : flight.medevac };
    const clean = stops.map((s, i) => ({
      ...s,
      // Airplanes always use runways and airports; the last stop is where the flight ends.
      point: heli ? s.point : "runway",
      site: heli && s.site ? { ...s.site, name: s.site.name.trim() } : null,
      ...(i === stops.length - 1 || i === 0 ? { type: "full", count: 1 } : {}),
    }));
    (isEdit ? onSave : onStart)(settings, { stops: clean });
  };

  // ---- map clicks: place the selected site, or add a waypoint to the selected leg ----
  const onMapClick = (p) => {
    const point = { x: Math.round(p.x), y: Math.round(p.y) };
    if (placing) {
      setStop(sel, { icao: nearestAirport(point).airport.icao, site: { ...selStop.site, ...point } });
      return;
    }
    setStop(activeLeg, { route: [...stops[activeLeg].route, point] });
  };

  if (screen === "choose") {
    const done = flight.plan.leg - 1;
    return (
      <Shell title={t("Preflight")} badge={t("FLIGHT SAVED")}>
        <div className="space-y-4 p-5">
          <div className="space-y-1.5 rounded border border-av-line bg-black/30 p-3">
            <div className="flex flex-wrap items-baseline gap-2 font-avmono">
              <span className="text-xl font-bold text-av-cyan">{flight.callsign}</span>
              <span className="text-[11px] text-av-dim">
                {flight.aircraft === "helicopter" ? `🚁 ${t("Helicopter")}` : `✈ ${t("Airplane")}`} · {flight.rules}
              </span>
            </div>
            <PlanSummary plan={flight.plan} airports={airports} heli={flight.aircraft === "helicopter"} doneBefore={done} />
            <div className="font-avmono text-[10px] text-av-mute">
              {t("Leg {n}/{total}", { n: flight.plan.leg, total: flight.plan.stops.length - 1 })} · {t(PHASE_LABELS[flight.phase] || flight.phase)}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button type="button" autoFocus onClick={onResume} className={`px-4 py-4 text-[13px] ${actionClass("secondary")}`}>
              ▶ {t("Resume this flight")}
              <div className="mt-1 text-[10px] font-normal normal-case tracking-normal opacity-80">{t("Everything as you left it · Esc")}</div>
            </button>
            <button type="button" onClick={() => setScreen("form")} className={`px-4 py-4 text-[13px] ${actionClass("primary")}`}>
              ＋ {t("New flight")}
              <div className="mt-1 text-[10px] font-normal normal-case tracking-normal opacity-80">{t("New plan, starting from the same route")}</div>
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  const selPoint = stopPoint(selStop, heli);

  return (
    <Shell title={isEdit ? t("Edit the flight plan") : t("New flight plan")} badge={isEdit ? t("IN FLIGHT") : flight.callsign ? t("LAST FLIGHT LOADED") : t("NEW PILOT")} onSubmit={submit}>
      <div className="grid grid-cols-1 gap-5 p-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {/* ---- identity and stops ---- */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr]">
            <ChipGroup label={t("Aircraft type")} options={AIRCRAFT_OPTIONS(t)} value={draft.aircraft} onChange={(aircraft) => set({ aircraft })} tone="magenta" />
            {heli && <ChipGroup label={t("Mission")} options={ROLE_OPTIONS(t)} value={draft.heliRole} onChange={(heliRole) => set({ heliRole })} tone="magenta" />}
          </div>

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
            <button type="button" onClick={() => setShowReg(true)} className="font-avmono text-[10px] uppercase tracking-wider text-av-dim hover:text-av-cyan">
              + Radar registration differs from callsign
            </button>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ChipGroup label={t("Flight rules")} size="sm" options={ph.FLIGHT_RULES.map((r) => ({ value: r, label: r }))} value={draft.rules} onChange={(rules) => set({ rules })} />
            {edition.center && (
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
            )}
          </div>

          {/* ---- the stops ---- */}
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <FieldLabel>{t("Stops of the flight")}</FieldLabel>
              <button type="button" onClick={restart} className={`px-2 py-0.5 text-[9px] ${actionClass()}`}>
                {t("Start from scratch")}
              </button>
            </div>
            <ol className="space-y-1.5">
              {stops.map((s, i) => (
                <StopCard
                  key={s.id}
                  stop={s}
                  index={i}
                  last={i === stops.length - 1}
                  plan={plan}
                  heli={heli}
                  selected={i === sel}
                  hints={hintsFor(s)}
                  onSelect={() => setSelected(i)}
                  onChange={(patch) => setStop(i, patch)}
                  onRemove={stops.length > 2 && i > 0 ? () => removeStop(i) : null}
                  onDraw={() => {
                    setSelected(i);
                    setTab("map");
                  }}
                  onChart={() => {
                    setSelected(i);
                    setTab("chart");
                  }}
                  lastSpot={flight.spots[s.icao]}
                />
              ))}
            </ol>
            <button type="button" onClick={addStop} className={`mt-2 w-full px-3 py-2 text-[11px] ${actionClass()}`}>
              ＋ {t("Add a stop")}
            </button>
          </div>
        </div>

        {/* ---- route map and airport diagram ---- */}
        <div className="space-y-2 lg:sticky lg:top-0 lg:self-start">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1">
              <button type="button" onClick={() => setTab("map")} className={`px-3 py-1 text-[10px] ${actionClass("secondary", tab === "map")}`}>
                🗺 {t("Route map")}
              </button>
              <button
                type="button"
                disabled={isSite(selStop)}
                onClick={() => setTab("chart")}
                className={`px-3 py-1 text-[10px] ${actionClass("secondary", tab === "chart")}`}
              >
                {t("Diagram")} · {stopLabel(selStop, airports)}
              </button>
            </div>
            {tab === "map" && stops[activeLeg].route.length > 0 && (
              <div className="flex gap-1">
                <button type="button" onClick={() => setStop(activeLeg, { route: stops[activeLeg].route.slice(0, -1) })} className={`px-2 py-1 text-[10px] ${actionClass()}`}>
                  ↶ {t("Undo point")}
                </button>
                <button type="button" onClick={() => setStop(activeLeg, { route: [] })} className={`px-2 py-1 text-[10px] ${actionClass()}`}>
                  {t("Direct (clear)")}
                </button>
              </div>
            )}
          </div>

          {tab === "chart" && !isSite(selStop) ? (
            <ChartPicker
              key={`${selStop.id}-${selStop.icao}`}
              icao={selStop.icao}
              spot={selStop.spot}
              runway={selStop.runway || airports[selStop.icao].defaultRunway}
              direction={sel === 0 ? "out" : "in"}
              showRoute={selPoint === "runway" && Boolean(selStop.spot)}
              closed={hintsFor(selStop).closed}
              best={hintsFor(selStop).best}
              onSpot={(spot) => setStop(sel, { spot })}
              onRunway={(runway) => setStop(sel, { runway, ...(heli && selPoint !== "runway" ? { point: "runway" } : {}) })}
            />
          ) : (
            <>
              <div className={`rounded border px-2.5 py-1.5 font-avmono text-[11px] ${placing ? "border-av-amber bg-av-amber/10 text-av-amber" : "border-av-magenta/40 bg-av-magenta/5 text-av-text"}`}>
                {placing ? (
                  t("Click the map where {site} is.", { site: selStop.site.name.trim() || t("the site") })
                ) : (
                  <>
                    <span className="font-bold text-av-magenta">
                      {t("Leg {n}", { n: activeLeg })} · {stopLabel(stops[activeLeg - 1], airports)} ▸ {stopLabel(stops[activeLeg], airports)}
                    </span>{" "}
                    · {t("click the map to add a waypoint, drag one to move it, double-click (or right-click) to delete it, drag a ＋ to insert one.")}
                  </>
                )}
              </div>
              <WorldMap
                fit={stops.flatMap((s) => [stopPosition(s, airports), ...s.route])}
                fitKey={stops.map((s) => s.icao).join("|")}
                mapStyle="bright"
                onMapClick={onMapClick}
                cursor="crosshair"
                style={{ height: "min(64vh, 680px)", minHeight: 360 }}
              >
                {({ k, beginDrag }) => (
                  <>
                    <AirportsLayer airports={airports} k={k} />
                    <PlanLayer
                      plan={plan}
                      airports={airports}
                      k={k}
                      heli={heli}
                      activeLeg={activeLeg}
                      editable
                      beginDrag={beginDrag}
                      onChange={(next) => setStops(next.stops)}
                      onSelectStop={setSelected}
                    />
                  </>
                )}
              </WorldMap>
            </>
          )}
        </div>
      </div>

      {edition.saaa && <Reminder icaos={[...new Set(stops.map((s) => s.icao))]} saaaData={saaaData} />}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-av-bezel px-4 py-3">
        {isEdit ? (
          <button type="button" onClick={onClose} className={`px-3 py-1.5 text-[10px] ${actionClass()}`}>
            {t("Cancel · Esc")}
          </button>
        ) : flight.callsign ? (
          <button type="button" onClick={onResume} className={`px-3 py-1.5 text-[10px] ${actionClass()}`}>
            {t("Resume last session as it was · Esc")}
          </button>
        ) : (
          <span className="font-avmono text-[10px] text-av-mute">{t("Everything stays editable afterwards.")}</span>
        )}
        <div className="flex items-center gap-3">
          {problem && <span className="font-avmono text-[11px] text-av-amber">{problem}</span>}
          <button type="submit" disabled={Boolean(problem)} className={`px-5 py-2 text-[12px] ${actionClass("primary")}`}>
            {isEdit ? t("Save the plan ✓") : t("Start flight ▸")}
          </button>
        </div>
      </footer>
    </Shell>
  );
}

const PHASE_LABELS = { clearance: "Clearance", ground: "Ground", departure: "Departure", enroute: "En route", arrival: "Arrival", pattern: "Pattern", taxiin: "Taxi in" };

function Shell({ title, badge, onSubmit, children }) {
  const { t } = useEdition();
  const Tag = onSubmit ? "form" : "div";
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
      <Tag
        onSubmit={onSubmit}
        role="dialog"
        aria-label={title || t("Preflight")}
        className="my-6 w-full max-w-7xl rounded-md border border-av-bezel bg-av-panel shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_24px_60px_rgba(0,0,0,0.6)]"
      >
        <header className="flex items-center justify-between gap-2 border-b border-av-bezel bg-av-panel2/70 px-4 py-2">
          <h2 className="flex items-center gap-2 font-avmono text-[11px] font-bold uppercase tracking-[0.18em] text-av-dim">
            <span className="h-2.5 w-[3px] rounded-sm bg-av-amber" aria-hidden="true" />
            {title}
          </h2>
          <span className="font-avmono text-[10px] text-av-mute">{badge}</span>
        </header>
        {children}
      </Tag>
    </div>
  );
}

/* ------------------------------------------------------------ one stop */

function StopCard({ stop, index, last, plan, heli, selected, hints, onSelect, onChange, onRemove, onDraw, onChart, lastSpot }) {
  const { t, airports } = useEdition();
  const airport = airports[stop.icao];
  const point = stopPoint(stop, heli);
  const type = index > 0 ? stopType(stop, heli) : null;
  const repeated = index > 0 && !last && isRepeated(stop, heli);
  const path = index > 0 ? legPath(plan, index, airports) : null;
  const inbound = index > 0 ? inboundDir(plan, index, airports) : null;
  const ground = index === 0 || type === "full";

  const pickAirport = (icao) => onChange({ icao, runway: "", spot: index === 0 ? lastSpot || "" : "" });
  const pickPoint = (p) =>
    onChange(p === "site" ? { point: "site", site: stop.site || { name: "", x: null, y: null }, type: "full", count: 1 } : { point: p, site: null, ...(p === "spot" ? { type: "full", count: 1 } : {}) });

  const later = { value: "", label: t("Later") };
  const typeOptions = ["full", "touch", "stop", "low"].map((v) => ({ value: v, label: t(STOP_TYPE_LABELS[v]) }));

  return (
    <li className={`rounded border ${selected ? "border-av-amber/70 bg-av-amber/5" : "border-av-line/70 bg-black/20"}`}>
      {index > 0 && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-av-line/50 px-2.5 py-1 font-avmono text-[10px] text-av-dim">
          <span className="text-av-magenta">↓</span>
          <span>
            {stop.route.length > 0 ? t("{n} waypoints", { n: stop.route.length }) : t("direct")} · {formatNm(pathLength(path))}
            {inbound && ` · ${t("inbound from the {dir}", { dir: t(inbound) })}`}
          </span>
          <button type="button" onClick={onDraw} className={`ml-auto px-2 py-0.5 text-[9px] ${actionClass()}`}>
            ✎ {t("Draw the route")}
          </button>
        </div>
      )}
      <div className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left">
        <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full font-avmono text-[11px] font-bold text-black ${index === 0 ? "bg-av-cyan" : isSite(stop) ? "bg-av-amber" : "bg-av-cyan"}`}>
            {index === 0 ? "D" : index}
          </span>
          <span className="min-w-0 font-avmono text-[12px]">
            <span className="font-bold text-av-text">{stopLabel(stop, airports)}</span>
            <span className="ml-2 text-av-dim">
              {index === 0 ? t("Departure") : last ? t("Arrival · full stop") : t(STOP_TYPE_LABELS[type])}
              {repeated && stop.count > 1 ? ` ×${stop.count}` : ""}
              {stop.runway ? ` · ${stop.runway}` : ""}
              {stop.spot && ground ? ` · ${stop.spot}` : ""}
            </span>
          </span>
        </button>
        {onRemove && (
          <button type="button" onClick={onRemove} className="px-1.5 font-avmono text-[13px] text-av-red/80 hover:text-av-red" aria-label={t("Remove this stop")}>
            ✕
          </button>
        )}
      </div>

      {selected && (
        <div className="space-y-2.5 border-t border-av-line/50 px-2.5 pb-2.5 pt-2">
          {heli && (
            <ChipGroup
              size="sm"
              tone="magenta"
              label={index === 0 ? t("Lift off from") : t("Land on")}
              options={[
                { value: "spot", label: t("Parking / helipad") },
                { value: "runway", label: t("Runway") },
                { value: "site", label: t("Off-airfield site") },
              ]}
              value={point}
              onChange={pickPoint}
            />
          )}

          {point === "site" ? (
            <div className="space-y-1">
              <label className="block">
                <FieldLabel>{t("Site")}</FieldLabel>
                <input
                  value={stop.site.name}
                  onChange={(e) => onChange({ site: { ...stop.site, name: e.target.value } })}
                  placeholder={t("Pillbox Hill Medical Center, the scene…")}
                  className={inputClass}
                />
              </label>
              <div className="flex flex-wrap items-center gap-2 font-avmono text-[10px]">
                {Number.isFinite(stop.site.x) ? (
                  <>
                    <span className="text-av-green">
                      ✓ {describePlace(stop.site)} · {t("nearest airport {code}", { code: airport.code })}
                    </span>
                    <button type="button" onClick={() => onChange({ site: { ...stop.site, x: null, y: null } })} className={`px-2 py-0.5 text-[9px] ${actionClass()}`}>
                      {t("Place again")}
                    </button>
                  </>
                ) : (
                  <span className="text-av-amber">{t("Click the map to place it.")}</span>
                )}
              </div>
            </div>
          ) : (
            <ChipGroup size="sm" label={t("Airport")} options={Object.values(airports).map((a) => ({ value: a.icao, label: a.code, title: a.name }))} value={stop.icao} onChange={pickAirport} />
          )}

          {index > 0 && !last && point === "runway" && (
            <div className="flex flex-wrap items-end gap-3">
              <ChipGroup size="sm" label={t("What we do here")} options={typeOptions} value={stop.type} onChange={(v) => onChange({ type: v })} />
              {repeated && (
                <div>
                  <FieldLabel>{t("Times")}</FieldLabel>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => onChange({ count: Math.max(1, stop.count - 1) })} className={`h-7 w-7 ${actionClass()}`}>
                      −
                    </button>
                    <span className="w-6 text-center font-avmono text-[14px] font-bold text-av-amber">{stop.count}</span>
                    <button type="button" onClick={() => onChange({ count: Math.min(MAX_REPS, stop.count + 1) })} className={`h-7 w-7 ${actionClass()}`}>
                      ＋
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {last && index > 0 && <div className="font-avmono text-[10px] text-av-mute">{t("Last stop: the flight ends with a full stop here.")}</div>}

          {point === "runway" && (
            <ChipGroup
              size="sm"
              label={index === 0 ? t("Takeoff runway") : t("Landing runway")}
              options={[
                later,
                ...airport.runwayEnds.map((end) => ({
                  value: end.id,
                  label: end.id,
                  disabled: hints.closed.includes(end.id),
                  badge: end.id === hints.best ? "★" : hints.closed.includes(end.id) ? "CLSD" : null,
                })),
              ]}
              value={stop.runway}
              onChange={(runway) => onChange({ runway })}
            />
          )}

          {point !== "site" && ground && (
            <div>
              <ChipGroup
                size="sm"
                label={index === 0 ? (heli ? t("Parking / helipad") : t("Starting position")) : heli && point === "spot" ? t("Parking / helipad") : t("Parking after landing")}
                options={[later, ...airport.spots.map((s) => ({ value: s, label: s }))]}
                value={airport.spots.includes(stop.spot) || !stop.spot ? stop.spot : null}
                onChange={(spot) => onChange({ spot })}
              />
              <div className="mt-1.5 flex gap-1">
                <input value={stop.spot} onChange={(e) => onChange({ spot: e.target.value })} placeholder={t("Or type it (Gate 8…)")} aria-label={t("Custom position")} className={`${inputClass} !text-xs`} />
                <button type="button" onClick={onChart} className={`shrink-0 px-2 text-[9px] ${actionClass()}`}>
                  {t("On the diagram")}
                </button>
              </div>
            </div>
          )}
          <div className="font-avmono text-[9px] text-av-mute">{t("“Later”: chosen during the flight, in the phase settings.")}</div>
        </div>
      )}
    </li>
  );
}
