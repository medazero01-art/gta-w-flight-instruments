"use client";

import { useEffect, useRef, useState } from "react";
import { worldToChart } from "@/lib/atc/geo";
import { distance } from "@/lib/atc/radar";
import { useEdition } from "./EditionContext";
import { planePath, useFramePainter } from "./paint";
import { ChipGroup, Panel, actionClass } from "./ui";

const STALE_S = 60;

// The airport diagram of the airport we're working with: taxi route, clickable runways and
// parkings, our aircraft and the traffic on the ground (radar), chart calibration.
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
            <button key={b.label} type="button" onClick={b.onClick} className={`px-2.5 py-1 text-[11px] ${actionClass()}`}>
              {b.label}
            </button>
          ))}
          {ownPt && (
            <button
              type="button"
              onClick={() => setView((v) => ({ ...v, x: ownPt.x - v.w / 2, y: ownPt.y - v.h / 2 }))}
              className={`px-2.5 py-1 text-[11px] ${actionClass()}`}
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
              className={`px-2 py-1 text-[10px] ${actionClass("secondary", calibrating)}`}
              title={own ? "" : "Turn the radar on and find your aircraft first"}
            >
              {calibrating ? "Cancel" : "Calibrate"}
            </button>
            {isCalibrated && (
              <button type="button" onClick={() => onResetCalibration(icao)} className={`px-2 py-1 text-[10px] ${actionClass()}`}>
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

export default function ChartPanel({ flight, update, own, traffic, route, contextIcao, geoFor, calibrated, onCalibrate, onResetCalibration, saaaData, tracker }) {
  const { t } = useEdition();
  const [icao, setIcao] = useState(contextIcao);
  // The chart follows the airport we're working with.
  useEffect(() => setIcao(contextIcao), [contextIcao]);
  return (
    <Panel title={t("Airport chart")} bodyClassName="p-2.5">
      <ChartPage
        icao={icao}
        setIcao={setIcao}
        flight={flight}
        update={update}
        own={own}
        traffic={traffic}
        route={route}
        geo={geoFor(icao)}
        onCalibrate={onCalibrate}
        onResetCalibration={onResetCalibration}
        isCalibrated={Boolean(calibrated[icao])}
        saaaData={saaaData}
        tracker={tracker}
      />
    </Panel>
  );
}
