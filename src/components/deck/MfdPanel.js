"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { GTA_MAP, mapWorldBounds, worldToChart } from "@/lib/atc/geo";
import { bearing, cardinal, distance, formatNm } from "@/lib/atc/radar";
import { restrictedBoxes, strictMsaBoxes } from "@/lib/atc/airspace";
import { createMotionTracker } from "@/lib/atc/motion";
import { useEdition } from "./EditionContext";
import { ChipGroup, Panel, softkeyClass } from "./ui";

const M_PER_NM = 1852;
const RANGES = [1, 2, 4, 8];
const RESTRICTED = restrictedBoxes();
const STRICT_MSA = strictMsaBoxes();
const STALE_S = 60;
const MAP_BOUNDS = mapWorldBounds();
// Rounded so the server render and the browser agree to the decimal (no hydration mismatch).
const r1 = (n) => Math.round(n * 10) / 10;
// Layout effects warn during the server render; there is nothing to paint there anyway.
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
const MAP_FILTERS = { dim: "brightness(0.42) saturate(0.55) contrast(1.1)", bright: "brightness(0.85) saturate(0.9)" };

// Aircraft symbol pointing up, rotated by heading.
const planePath = (s) =>
  `M0 ${-s} L${s * 0.18} ${-s * 0.35} L${s} ${s * 0.15} L${s} ${s * 0.32} L${s * 0.18} ${s * 0.05} L${s * 0.14} ${s * 0.62} L${s * 0.42} ${s * 0.85} L${s * 0.42} ${s} L0 ${s * 0.88} L${-s * 0.42} ${s} L${-s * 0.42} ${s * 0.85} L${-s * 0.14} ${s * 0.62} L${-s * 0.18} ${s * 0.05} L${-s} ${s * 0.32} L${-s} ${s * 0.15} L${-s * 0.18} ${-s * 0.35} Z`;

/* ------------------------------------------------------------------ MAP page */

// Calls `paint(now)` on every animation frame while mounted, and once right after each render.
function useFramePainter(paint) {
  const paintRef = useRef(paint);
  paintRef.current = paint;
  useIsomorphicLayoutEffect(() => paintRef.current(performance.now()));
  useEffect(() => {
    let raf;
    const frame = (now) => {
      paintRef.current(now);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);
}

// Everything on the map is drawn in world meters (y flipped for SVG) inside one group that
// is translated to keep our aircraft centered: animating the view is one attribute per frame.
function MapPage({ flight, update, own, traffic, center, rangeNm, setRangeNm, tracker }) {
  const { edition, t, airports } = useEdition();
  const r = rangeNm * M_PER_NM;
  const fs = r / 17;
  const worldRef = useRef(null);
  const ownRef = useRef(null);
  const trafficRefs = useRef(new Map());

  useFramePainter((now) => {
    const ownPos = own ? tracker.predict(own.callsign, now) || own : null;
    const c = ownPos || center;
    worldRef.current?.setAttribute("transform", `translate(${-c.x} ${c.y})`);
    if (ownPos) ownRef.current?.setAttribute("transform", `translate(${ownPos.x} ${-ownPos.y}) rotate(${own.heading})`);
    for (const t of traffic) {
      const p = tracker.predict(t.callsign, now);
      if (p) trafficRefs.current.get(t.callsign)?.setAttribute("transform", `translate(${p.x} ${-p.y})`);
    }
  });

  const box = (b, i, cls, dashed) => (
    <rect
      key={i}
      x={b.x1}
      y={-b.y2}
      width={b.x2 - b.x1}
      height={b.y2 - b.y1}
      className={cls}
      strokeDasharray={dashed ? "4 3" : undefined}
      vectorEffect="non-scaling-stroke"
    />
  );

  return (
    <div className="space-y-2">
      <svg viewBox={`${-r} ${-r} ${2 * r} ${2 * r}`} className="w-full aspect-square rounded border border-av-line bg-[#061019]" role="img" aria-label={t("Moving map")}>
        <defs>
          <clipPath id="mfd-clip">
            <circle cx={0} cy={0} r={r} />
          </clipPath>
          <radialGradient id="mfd-vignette">
            <stop offset="70%" stopColor="black" stopOpacity="0" />
            <stop offset="100%" stopColor="black" stopOpacity="0.55" />
          </radialGradient>
        </defs>
        <g clipPath="url(#mfd-clip)">
          <g ref={worldRef} transform={`translate(${-center.x} ${center.y})`}>
            {flight.mapStyle !== "off" && (
              <image
                href={GTA_MAP.src}
                x={MAP_BOUNDS.left}
                y={-MAP_BOUNDS.top}
                width={MAP_BOUNDS.width}
                height={MAP_BOUNDS.height}
                preserveAspectRatio="none"
                style={{ filter: MAP_FILTERS[flight.mapStyle] }}
              />
            )}
            {RESTRICTED.map((b, i) => box(b, `r${i}`, "fill-av-red/20 stroke-av-red"))}
            {/* Minimum safe altitude areas come from the SAAA Aviation Code: GTA World only. */}
            {edition.saaa && STRICT_MSA.map((b, i) => box(b, `m${i}`, "fill-av-amber/5 stroke-av-amber/70", true))}
            {Object.values(airports).map((a) => (
              <g key={a.icao} transform={`translate(${a.position.x} ${-a.position.y})`}>
                <circle r={r / 45} className="fill-none stroke-av-cyan" strokeWidth={2} vectorEffect="non-scaling-stroke" />
                <text y={-r / 30} fontSize={fs} textAnchor="middle" className="fill-av-cyan font-avmono font-bold">{a.code}</text>
              </g>
            ))}
            {traffic.map((t) => {
              const a = (t.heading * Math.PI) / 180;
              const len = r / 9;
              return (
                <g
                  key={t.callsign}
                  ref={(el) => (el ? trafficRefs.current.set(t.callsign, el) : trafficRefs.current.delete(t.callsign))}
                  transform={`translate(${t.x} ${-t.y})`}
                  opacity={t.ageS > STALE_S ? 0.4 : 1}
                >
                  <line x1={0} y1={0} x2={Math.sin(a) * len} y2={-Math.cos(a) * len} className="stroke-av-green" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                  <path d={`M0 ${-r / 55} L${r / 55} 0 L0 ${r / 55} L${-r / 55} 0 Z`} className="fill-av-green" />
                  <text x={r / 40} y={-r / 80} fontSize={fs * 0.9} className="fill-av-green font-avmono">{t.callsign}</text>
                  <text x={r / 40} y={fs * 0.85} fontSize={fs * 0.8} className="fill-av-green/80 font-avmono">
                    {String(Math.round(t.altFt / 100)).padStart(3, "0")}
                  </text>
                </g>
              );
            })}
            {own && (
              <g ref={ownRef} transform={`translate(${own.x} ${-own.y}) rotate(${own.heading})`}>
                <line x1={0} y1={0} x2={0} y2={-r} className="stroke-av-magenta/70" strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />
                <path d={planePath(r / 26)} className="fill-white stroke-black" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              </g>
            )}
          </g>
          <circle cx={0} cy={0} r={r} fill="url(#mfd-vignette)" />
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <circle key={f} cx={0} cy={0} r={r * f} className="fill-none stroke-av-cyan/25" strokeDasharray={f === 1 ? undefined : "2 4"} vectorEffect="non-scaling-stroke" />
          ))}
          {Array.from({ length: 36 }, (_, i) => {
            const a = (i * 10 * Math.PI) / 180;
            const inner = i % 3 === 0 ? r * 0.93 : r * 0.965;
            return (
              <line key={i} x1={r1(Math.sin(a) * inner)} y1={r1(-Math.cos(a) * inner)} x2={r1(Math.sin(a) * r)} y2={r1(-Math.cos(a) * r)} className="stroke-av-cyan/50" vectorEffect="non-scaling-stroke" />
            );
          })}
        </g>
        <text x={-r + r / 25} y={-r + fs * 1.1} fontSize={fs} className="fill-av-cyan font-avmono font-bold">N↑</text>
        <text x={r - r / 25} y={-r + fs * 1.1} fontSize={fs} textAnchor="end" className="fill-av-cyan font-avmono">{rangeNm} NM</text>
        <text x={r * 0.5 + 4} y={-fs * 0.2} fontSize={fs * 0.75} className="fill-av-cyan/60 font-avmono">{rangeNm / 2}</text>
      </svg>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <ChipGroup size="sm" options={RANGES.map((n) => ({ value: n, label: `${n} NM` }))} value={rangeNm} onChange={setRangeNm} />
        <ChipGroup
          size="sm"
          options={[
            { value: "dim", label: t("Map dim") },
            { value: "bright", label: t("Bright") },
            { value: "off", label: t("Off") },
          ]}
          value={flight.mapStyle}
          onChange={(mapStyle) => update({ mapStyle })}
        />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- CHART page */

function ChartPage({ icao, setIcao, flight, update, own, traffic, route, geo, onCalibrate, onResetCalibration, isCalibrated, saaaData, tracker }) {
  const { edition, t, airports, taxi } = useEdition();
  const airport = airports[icao];
  const graph = taxi[icao];
  const full = { x: 0, y: 0, w: geo.width, h: geo.height };
  const [view, setView] = useState(full);
  const [calibrating, setCalibrating] = useState(false);
  const [fixes, setFixes] = useState([]);
  const svgRef = useRef(null);
  const drag = useRef(null);
  // Set on pointer up, read by the click that follows: a drag must not select a spot.
  const dragged = useRef(false);

  useEffect(() => {
    setView({ x: 0, y: 0, w: geo.width, h: geo.height });
    setCalibrating(false);
    setFixes([]);
  }, [icao, geo.width, geo.height]);

  const toChart = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    return { x: view.x + ((e.clientX - rect.left) / rect.width) * view.w, y: view.y + ((e.clientY - rect.top) / rect.height) * view.h };
  };

  const zoomAt = (p, factor) => {
    setView((v) => {
      const w = Math.min(geo.width * 1.2, Math.max(geo.width / 12, v.w * factor));
      const h = (w / v.w) * v.h;
      return { x: p.x - ((p.x - v.x) / v.w) * w, y: p.y - ((p.y - v.y) / v.h) * h, w, h };
    });
  };

  // Wheel zoom needs a non-passive listener to stop the page from scrolling.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      setView((v) => {
        const p = { x: v.x + ((e.clientX - rect.left) / rect.width) * v.w, y: v.y + ((e.clientY - rect.top) / rect.height) * v.h };
        const factor = e.deltaY > 0 ? 1.2 : 1 / 1.2;
        const w = Math.min(geo.width * 1.2, Math.max(geo.width / 12, v.w * factor));
        const h = (w / v.w) * v.h;
        return { x: p.x - ((p.x - v.x) / v.w) * w, y: p.y - ((p.y - v.y) / v.h) * h, w, h };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [geo.width]);

  const onPointerDown = (e) => {
    if (calibrating) return;
    // No pointer capture: it would retarget the click and spots/runways couldn't be picked.
    drag.current = { start: { x: e.clientX, y: e.clientY }, view, moved: false };
    dragged.current = false;
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const rect = svgRef.current.getBoundingClientRect();
    const dx = ((e.clientX - d.start.x) / rect.width) * d.view.w;
    const dy = ((e.clientY - d.start.y) / rect.height) * d.view.h;
    if (Math.abs(e.clientX - d.start.x) + Math.abs(e.clientY - d.start.y) > 3) d.moved = true;
    setView({ ...d.view, x: d.view.x - dx, y: d.view.y - dy });
  };
  const onPointerUp = () => {
    dragged.current = Boolean(drag.current?.moved);
    drag.current = null;
  };

  const onChartClick = (e) => {
    if (!calibrating || !own || dragged.current) return;
    const next = [...fixes, { chart: toChart(e), world: { x: own.x, y: own.y } }];
    if (next.length >= 2) {
      onCalibrate(icao, next);
      setFixes([]);
      setCalibrating(false);
    } else {
      setFixes(next);
    }
  };

  const k = view.w / 60; // marker size relative to the zoom level
  const ownPt = own && own.atAirport?.icao === icao ? worldToChart(geo, own) : null;
  const groundTraffic = traffic.filter((t) => distance(t, airport.position) < 3000).map((t) => ({ ...t, pt: worldToChart(geo, t) }));
  const ownRef = useRef(null);
  const trafficRefs = useRef(new Map());

  useFramePainter((now) => {
    if (ownPt) {
      const p = worldToChart(geo, tracker.predict(own.callsign, now) || own);
      ownRef.current?.setAttribute("transform", `translate(${p.x} ${p.y})`);
    }
    for (const t of groundTraffic) {
      const w = tracker.predict(t.callsign, now);
      if (!w) continue;
      const p = worldToChart(geo, w);
      trafficRefs.current.get(t.callsign)?.setAttribute("transform", `translate(${p.x} ${p.y}) rotate(${t.heading})`);
    }
  });
  const routeHere = route && route.icao === icao ? route : null;
  const spots = graph ? Object.entries(graph.spots) : [];
  const official = saaaData?.airports.find((a) => a.icao === icao)?.charts || [];

  const pickSpot = (name) => update({ spots: { ...flight.spots, [icao]: name } });
  const pickRunway = (rwy) => update({ runways: { ...flight.runways, [icao]: rwy } });
  const clickable = (handler) => ({
    onClick: (e) => {
      e.stopPropagation();
      if (!dragged.current && !calibrating) handler();
    },
    style: { cursor: calibrating ? "crosshair" : "pointer" },
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ChipGroup
          size="sm"
          options={Object.values(airports).map((a) => ({ value: a.icao, label: a.code }))}
          value={icao}
          onChange={setIcao}
        />
        <div className="flex gap-1">
          {[
            { label: "+", onClick: () => zoomAt({ x: view.x + view.w / 2, y: view.y + view.h / 2 }, 1 / 1.4) },
            { label: "−", onClick: () => zoomAt({ x: view.x + view.w / 2, y: view.y + view.h / 2 }, 1.4) },
            { label: t("Fit"), onClick: () => setView(full) },
          ].map((b) => (
            <button key={b.label} type="button" onClick={b.onClick} className={`px-2.5 py-1 text-[11px] ${softkeyClass(false)}`}>
              {b.label}
            </button>
          ))}
          {ownPt && (
            <button
              type="button"
              onClick={() => setView((v) => ({ ...v, x: ownPt.x - v.w / 2, y: ownPt.y - v.h / 2 }))}
              className={`px-2.5 py-1 text-[11px] ${softkeyClass(false)}`}
            >
              Me
            </button>
          )}
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        className={`w-full rounded border border-av-line bg-[#0b0f14] touch-none select-none ${calibrating ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}`}
        style={{ aspectRatio: `${geo.width} / ${geo.height}`, maxHeight: "62vh" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onClick={onChartClick}
        role="img"
        aria-label={t("{airport} diagram", { airport: airport.name })}
      >
        <defs>
          <filter id="route-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={k * 0.35} />
          </filter>
        </defs>
        {/* Charts are black-on-white: inverted they read like a night-mode avionics page. */}
        <image href={airport.chart} x={0} y={0} width={geo.width} height={geo.height} style={{ filter: "invert(0.92) hue-rotate(180deg) contrast(0.95)" }} />

        {routeHere && (
          <g>
            <polyline points={routeHere.points.map((p) => p.join(",")).join(" ")} fill="none" className="stroke-av-magenta" strokeWidth={k * 0.6} strokeLinejoin="round" strokeLinecap="round" opacity={0.55} filter="url(#route-glow)" />
            <polyline points={routeHere.points.map((p) => p.join(",")).join(" ")} fill="none" className="stroke-av-magenta" strokeWidth={k * 0.28} strokeLinejoin="round" strokeLinecap="round" />
          </g>
        )}

        {graph &&
          Object.entries(graph.thresholds).map(([rwy, node]) => {
            const [x, y] = graph.nodes[node];
            const active = flight.runways[icao] === rwy;
            return (
              <g key={rwy} transform={`translate(${x} ${y})`} {...clickable(() => pickRunway(rwy))}>
                <circle r={k * 1.3} className={active ? "fill-av-magenta" : "fill-av-cyan/80"} />
                <text y={-k * 1.8} fontSize={k * 1.6} textAnchor="middle" className={`font-avmono font-bold ${active ? "fill-av-magenta" : "fill-av-cyan"}`}>
                  {rwy}
                </text>
              </g>
            );
          })}

        {spots.map(([name, node], i) => {
          const [x, y] = graph.nodes[node];
          const active = flight.spots[icao] === name;
          // Several spots can share a node (IMEX Hangar / South Maintenance): stack their labels.
          const stack = spots.slice(0, i).filter(([, n]) => n === node).length;
          return (
            <g key={name} transform={`translate(${x} ${y + stack * k * 1.6})`} {...clickable(() => pickSpot(name))}>
              <rect x={-k * 0.8} y={-k * 0.8} width={k * 1.6} height={k * 1.6} className={active ? "fill-av-green" : "fill-av-green/40 stroke-av-green"} strokeWidth={k * 0.15} />
              <text x={k * 1.2} y={k * 0.5} fontSize={k * 1.2} className={`font-avmono ${active ? "fill-av-green font-bold" : "fill-av-green/80"}`}>{name}</text>
            </g>
          );
        })}

        {groundTraffic.map((t) => (
          <g
            key={t.callsign}
            ref={(el) => (el ? trafficRefs.current.set(t.callsign, el) : trafficRefs.current.delete(t.callsign))}
            transform={`translate(${t.pt.x} ${t.pt.y}) rotate(${t.heading})`}
            opacity={t.ageS > STALE_S ? 0.4 : 1}
          >
            <path d={planePath(k * 1.4)} className="fill-av-green stroke-black" strokeWidth={k * 0.1} />
          </g>
        ))}

        {ownPt && (
          <g ref={ownRef} transform={`translate(${ownPt.x} ${ownPt.y})`}>
            <circle r={k * 3} className="fill-white/10 stroke-white" strokeWidth={k * 0.12} strokeDasharray={`${k * 0.5} ${k * 0.4}`} />
            <g transform={`rotate(${own.heading})`}>
              <path d={planePath(k * 1.8)} className="fill-white stroke-black" strokeWidth={k * 0.15} />
            </g>
          </g>
        )}

        {fixes.map((f, i) => (
          <circle key={i} cx={f.chart.x} cy={f.chart.y} r={k} className="fill-av-amber" />
        ))}
      </svg>

      <div className="flex flex-wrap items-center gap-2 font-avmono text-[10px] text-av-dim">
        <span className="text-av-magenta">━ {t("route")}</span>
        <span className="text-av-cyan">● {t("runway (click to select)")}</span>
        <span className="text-av-green">■ {t("parking (click to select)")}</span>
        <span>{t("wheel = zoom · drag = pan")}</span>
      </div>

      {/* Calibration needs radar fixes and the official chart links come from the SAAA: GTA World only. */}
      {(edition.radar || official.length > 0) && (
      <div className="rounded border border-av-line bg-black/30 p-2 space-y-1.5">
        {edition.radar && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-avmono text-[10px] text-av-dim">
            You-are-here: {isCalibrated ? <span className="text-av-green">calibrated</span> : <span className="text-av-amber">approximate (±50m)</span>}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={!own}
              onClick={() => {
                setCalibrating(!calibrating);
                setFixes([]);
              }}
              className={`px-2 py-1 text-[10px] uppercase ${softkeyClass(calibrating, "magenta")}`}
              title={own ? "" : "Turn the radar on and find your aircraft first"}
            >
              {calibrating ? "Cancel" : "Calibrate"}
            </button>
            {isCalibrated && (
              <button type="button" onClick={() => onResetCalibration(icao)} className={`px-2 py-1 text-[10px] uppercase ${softkeyClass(false)}`}>
                Reset
              </button>
            )}
          </div>
        </div>
        )}
        {calibrating && (
          <p className="font-avsans text-[11px] text-av-amber">
            Fix {fixes.length + 1}/2: stop your aircraft on a spot you can recognise on the chart (a runway threshold is ideal), then click
            that exact spot. Take the second fix far from the first.
          </p>
        )}
        {official.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {official.map((c) => (
              <a key={c.url} href={c.url} target="_blank" rel="noopener noreferrer" className="font-avmono text-[10px] text-av-cyan hover:underline">
                {c.name} ↗
              </a>
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- MFD wrapper */

export default function MfdPanel({ flight, update, radar, own, route, contextIcao, geoFor, calibrated, onCalibrate, onResetCalibration, saaaData }) {
  const { edition, t, airports } = useEdition();
  const [page, setPage] = useState("MAP");
  const [rangeNm, setRangeNm] = useState(2);
  const [chartIcao, setChartIcao] = useState(contextIcao);
  const { snapshot, status } = radar;
  const [tracker] = useState(createMotionTracker);
  useIsomorphicLayoutEffect(() => {
    if (snapshot) tracker.ingest(snapshot.aircraft, snapshot.fetchedAt, performance.now());
  }, [snapshot, tracker]);

  // The chart follows the airport we're working with.
  useEffect(() => setChartIcao(contextIcao), [contextIcao]);
  // On the ground the chart is what matters; in the air, the map.
  const phaseGroup = ["clearance", "ground", "taxiin"].includes(flight.phase) ? "CHART" : "MAP";
  useEffect(() => setPage(phaseGroup), [phaseGroup]);

  const center = own || airports[contextIcao].position;
  const traffic = (snapshot?.aircraft || [])
    .filter((a) => a !== own)
    .map((a) => ({ ...a, distanceM: distance(center, a), fromCenter: bearing(center, a) }))
    .sort((a, b) => a.distanceM - b.distanceM);

  const statusText = !flight.radarOn
    ? "RADAR OFF"
    : status.role === "follower"
      ? "LIVE · OTHER TAB POLLING"
      : status.error
        ? `ERR ${status.error} · RETRY ${Math.round((status.delayMs || 0) / 1000)}S`
        : `LIVE · ${Math.round((status.delayMs || 5000) / 1000)}S`;

  return (
    <Panel
      title="MFD"
      bodyClassName="p-2.5 space-y-2.5"
      action={
        <div className="flex items-center gap-1">
          {["MAP", "CHART"].map((p) => (
            <button key={p} type="button" onClick={() => setPage(p)} className={`px-2.5 py-0.5 text-[10px] ${softkeyClass(page === p)}`}>
              {t(p)}
            </button>
          ))}
          {edition.radar && (
          <button
            type="button"
            onClick={() => update({ radarOn: !flight.radarOn })}
            className={`ml-1 px-2.5 py-0.5 text-[10px] ${softkeyClass(flight.radarOn, "green")}`}
          >
            {flight.radarOn ? "● RADAR" : "○ RADAR"}
          </button>
          )}
        </div>
      }
    >
      {edition.radar && (
      <div className={`font-avmono text-[10px] ${status.error ? "text-av-amber" : flight.radarOn ? "text-av-green" : "text-av-mute"}`}>
        {statusText} · radar.gta.world
        {flight.radarOn && !own && snapshot && (
          <span className="text-av-amber"> · {flight.registration || flight.callsign || "your aircraft"} not on radar (check registration / engine on)</span>
        )}
      </div>
      )}

      {page === "MAP" ? (
        <MapPage flight={flight} update={update} own={own} traffic={traffic} center={center} rangeNm={rangeNm} setRangeNm={setRangeNm} tracker={tracker} />
      ) : (
        <ChartPage
          icao={chartIcao}
          setIcao={setChartIcao}
          flight={flight}
          update={update}
          own={own}
          traffic={traffic}
          route={route}
          geo={geoFor(chartIcao)}
          onCalibrate={onCalibrate}
          onResetCalibration={onResetCalibration}
          isCalibrated={Boolean(calibrated[chartIcao])}
          saaaData={saaaData}
          tracker={tracker}
        />
      )}

      {edition.radar && flight.radarOn && (
        <>
          <ChipGroup
            size="sm"
            label="Auto-fill calls from radar"
            options={[
              { value: true, label: "On" },
              { value: false, label: "Off (manual)" },
            ]}
            value={flight.radarSync}
            onChange={(radarSync) => update({ radarSync })}
          />
          <div>
            <div className="font-avmono text-[10px] font-bold uppercase tracking-[0.14em] text-av-mute mb-1">Traffic ({traffic.length})</div>
            {traffic.length === 0 && <div className="font-avmono text-[11px] text-av-mute">No other aircraft on the radar.</div>}
            <ul className="space-y-1">
              {traffic.map((t) => (
                <li
                  key={t.callsign}
                  className={`grid grid-cols-[1fr_auto] gap-x-2 rounded border border-av-line/60 bg-black/30 px-2 py-1 font-avmono text-[11px] ${t.ageS > STALE_S ? "opacity-50" : ""}`}
                >
                  <span className="truncate font-bold text-av-green">
                    {t.callsign} <span className="font-normal text-av-mute">{t.model}</span>
                  </span>
                  <span className="text-right text-av-text">{t.altFt.toLocaleString("en-US")}ft</span>
                  <span className="truncate text-av-dim">
                    {formatNm(t.distanceM)} {cardinal(t.fromCenter).toUpperCase()} · {t.place}
                  </span>
                  <span className="text-right text-av-dim">
                    {t.speedKt != null ? `${Math.round(t.speedKt)}kt` : ""}
                    {t.ageS > STALE_S ? ` · ${Math.round(t.ageS / 60)}m old` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </Panel>
  );
}
