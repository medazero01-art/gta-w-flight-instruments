"use client";

import { useEffect, useRef, useState } from "react";
import { SAT_MAP, mapWorldBounds } from "@/lib/atc/geo";
import { describePlace } from "@/lib/atc/radar";
import { isSite, legPath, stopLabel, stopPosition, stopType, withStop } from "@/lib/atc/plan";
import { useEdition } from "./EditionContext";
import { useFramePainter } from "./paint";
import { actionClass } from "./ui";

// The whole island as a pan/zoom map, drawn in world meters inside one SVG (x east, y flipped
// so north is up). Tiles of the satellite map are picked for the zoom level: the coarse level
// is always under them, so the map never goes blank while sharper tiles load.

const BOUNDS = mapWorldBounds();
const LEVELS = SAT_MAP.levels;
// Zoomed in no further than about one screen pixel per meter: the map has 1.5 m per pixel.
const MIN_W = 600;
const MAX_W = BOUNDS.height * 1.1;
const M_PER_NM = 1852;
const FILTERS = { dim: "brightness(0.55) saturate(0.7) contrast(1.05)", bright: "none" };
const SCALES_NM = [0.25, 0.5, 1, 2, 5, 10];

export const toSvg = (p) => ({ x: p.x, y: -p.y });
const clampW = (w) => Math.min(MAX_W, Math.max(MIN_W, w));

// The view showing all these world points, with some margin.
function fitView(points, aspect) {
  if (!points?.length) return { cx: 0, cy: -2000, w: MAX_W * 0.75 };
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => -p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: clampW(Math.max(x1 - x0, (y1 - y0) / aspect) * 1.35 + 1500) };
}

function levelTiles(z, rect) {
  const level = LEVELS[z];
  const T = SAT_MAP.tileSize;
  const mx = BOUNDS.width / level.width;
  const my = BOUNDS.height / level.height;
  const nx = Math.ceil(level.width / T);
  const ny = Math.ceil(level.height / T);
  const top = -BOUNDS.top;
  let [x0, x1, y0, y1] = [0, nx - 1, 0, ny - 1];
  if (rect) {
    x0 = Math.max(0, Math.floor((rect.x - BOUNDS.left) / (T * mx)));
    x1 = Math.min(nx - 1, Math.floor((rect.x + rect.w - BOUNDS.left) / (T * mx)));
    y0 = Math.max(0, Math.floor((rect.y - top) / (T * my)));
    y1 = Math.min(ny - 1, Math.floor((rect.y + rect.h - top) / (T * my)));
  }
  const tiles = [];
  for (let ty = y0; ty <= y1; ty += 1) {
    for (let tx = x0; tx <= x1; tx += 1) {
      const w = Math.min(T, level.width - tx * T) * mx;
      const h = Math.min(T, level.height - ty * T) * my;
      // A hair of overlap hides the seams between neighbouring tiles.
      tiles.push(
        <image
          key={`${z}/${tx}_${ty}`}
          href={`/maps/sat/${z}/${tx}_${ty}.webp`}
          x={BOUNDS.left + tx * T * mx}
          y={top + ty * T * my}
          width={w + mx * 0.6}
          height={h + my * 0.6}
          preserveAspectRatio="none"
        />
      );
    }
  }
  return tiles;
}

function Tiles({ rect, pw }) {
  const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const metersPerScreenPx = rect.w / Math.max(1, pw * dpr);
  // The coarsest level still about as sharp as the screen.
  let z = LEVELS.findIndex((level) => BOUNDS.width / level.width <= metersPerScreenPx * 1.4);
  if (z < 0) z = LEVELS.length - 1;
  return (
    <>
      {levelTiles(0, null)}
      {z > 0 && levelTiles(z, rect)}
    </>
  );
}

function ScaleBar({ k }) {
  const nm = SCALES_NM.find((n) => (n * M_PER_NM) / k >= 70) || SCALES_NM[SCALES_NM.length - 1];
  return (
    <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-1 font-avmono text-[10px] text-av-text">
      <div className="h-1.5 border-x-2 border-b-2 border-av-text" style={{ width: (nm * M_PER_NM) / k }} />
      {nm} NM
    </div>
  );
}

// `children(ctx)` draws in world space: ctx.k is meters per screen pixel (marker sizes),
// ctx.beginDrag(e, onMove, onEnd) lets a marker be dragged instead of panning the map.
// `follow()` returns the world point to keep centered on every frame (or null).
export default function WorldMap({ fit, fitKey, mapStyle = "dim", follow, onUserPan, onMapClick, cursor, className = "", style, overlay, children, label }) {
  const { t } = useEdition();
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const [size, setSize] = useState({ pw: 0, ph: 0 });
  const [view, setView] = useState(() => fitView(fit, 1));
  const viewRef = useRef(view);
  viewRef.current = view;
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const dragged = useRef(false);

  useEffect(() => {
    const el = wrapRef.current;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ pw: width, ph: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const measured = size.pw > 0;
  const aspect = measured ? size.ph / size.pw : 1;
  const fitRef = useRef(fit);
  fitRef.current = fit;
  useEffect(() => {
    if (measured) setView(fitView(fitRef.current, aspect));
    // Refit when asked (fitKey) or once the map knows its size, not on every plan edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, measured]);

  const h = view.w * aspect;
  const rect = { x: view.cx - view.w / 2, y: view.cy - h / 2, w: view.w, h };
  const k = measured ? view.w / size.pw : view.w / 600;

  const toWorld = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    const v = viewRef.current;
    const vh = v.w * (r.height / r.width);
    return { x: v.cx - v.w / 2 + ((e.clientX - r.left) / r.width) * v.w, y: -(v.cy - vh / 2 + ((e.clientY - r.top) / r.height) * vh) };
  };

  const zoomAround = (base, p, factor) => {
    const w = clampW(base.w * factor);
    const f = w / base.w;
    return { cx: p.x - (p.x - base.cx) * f, cy: p.y - (p.y - base.cy) * f, w };
  };

  useEffect(() => {
    const el = svgRef.current;
    const onWheel = (e) => {
      e.preventDefault();
      const p = toSvg(toWorld(e));
      setView((v) => zoomAround(v, p, e.deltaY > 0 ? 1.25 : 1 / 1.25));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Turning follow on also zooms in around the aircraft (about 2.5 NM across), when further out.
  const following = Boolean(follow);
  useEffect(() => {
    if (following) setView((v) => ({ ...v, w: Math.min(v.w, 4500) }));
  }, [following]);

  // Following: the view is moved every frame without React, and React catches up now and
  // then so the right tiles get loaded.
  useFramePainter(() => {
    const p = follow?.();
    if (!p || !svgRef.current) return;
    const v = viewRef.current;
    const vh = v.w * aspect;
    svgRef.current.setAttribute("viewBox", `${p.x - v.w / 2} ${-p.y - vh / 2} ${v.w} ${vh}`);
    if (Math.hypot(p.x - v.cx, -p.y - v.cy) > v.w * 0.08) setView({ ...v, cx: p.x, cy: -p.y });
  });

  const pinchState = () => {
    const [a, b] = [...pointers.current.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y), mid: { clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 } };
  };

  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragged.current = false;
    if (pointers.current.size === 2) {
      const { d, mid } = pinchState();
      gesture.current = { type: "pinch", d0: d, view: viewRef.current, p: toSvg(toWorld(mid)), moved: true };
    } else if (pointers.current.size === 1) {
      gesture.current = { type: "pan", start: { x: e.clientX, y: e.clientY }, view: viewRef.current, moved: false };
    }
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    if (g.type === "item") {
      g.moved = true;
      g.onMove(toWorld(e));
      return;
    }
    if (g.type === "pinch" && pointers.current.size === 2) {
      setView(zoomAround(g.view, g.p, g.d0 / Math.max(10, pinchState().d)));
      return;
    }
    if (g.type !== "pan") return;
    const r = svgRef.current.getBoundingClientRect();
    if (Math.abs(e.clientX - g.start.x) + Math.abs(e.clientY - g.start.y) > 4 && !g.moved) {
      g.moved = true;
      onUserPan?.();
    }
    if (!g.moved) return;
    const m = g.view.w / r.width;
    setView({ ...g.view, cx: g.view.cx - (e.clientX - g.start.x) * m, cy: g.view.cy - (e.clientY - g.start.y) * m });
  };

  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (g) dragged.current = dragged.current || g.moved;
    if (g?.type === "item") g.onEnd?.();
    gesture.current = null;
  };

  const ctx = {
    k,
    view: rect,
    toWorld,
    beginDrag: (e, onMove, onEnd) => {
      e.stopPropagation();
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      dragged.current = false;
      gesture.current = { type: "item", onMove, onEnd, moved: false };
    },
  };

  const zoomButton = (factor) => setView((v) => zoomAround(v, { x: v.cx, y: v.cy }, factor));

  return (
    <div ref={wrapRef} className={`relative overflow-hidden rounded border border-av-line bg-[#061019] ${className}`} style={style}>
      <svg
        ref={svgRef}
        viewBox={`${rect.x} ${rect.y} ${rect.w} ${rect.h}`}
        className="absolute inset-0 h-full w-full touch-none select-none"
        style={{ cursor: cursor || "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
        onClick={(e) => {
          if (dragged.current) {
            dragged.current = false;
            return;
          }
          onMapClick?.(toWorld(e));
        }}
        role="img"
        aria-label={label || t("Map of San Andreas")}
      >
        {mapStyle !== "off" && measured && (
          <g style={{ filter: FILTERS[mapStyle] }}>
            <Tiles rect={rect} pw={size.pw} />
          </g>
        )}
        {measured && children?.(ctx)}
      </svg>

      <div className="absolute right-2 top-2 flex flex-col gap-1">
        <button type="button" onClick={() => zoomButton(1 / 1.5)} className={`h-8 w-8 text-[15px] ${actionClass()} !bg-black/70`} aria-label={t("Zoom in")}>
          +
        </button>
        <button type="button" onClick={() => zoomButton(1.5)} className={`h-8 w-8 text-[15px] ${actionClass()} !bg-black/70`} aria-label={t("Zoom out")}>
          −
        </button>
        <button type="button" onClick={() => setView(fitView(fit, aspect))} className={`h-8 w-8 text-[9px] ${actionClass()} !bg-black/70`} title={t("Show the whole plan")}>
          {t("FIT")}
        </button>
      </div>
      {overlay}
      {measured && <ScaleBar k={k} />}
    </div>
  );
}

/* ------------------------------------------------------------------ layers */

const shortType = (stop, heli, t) => {
  if (isSite(stop) || (heli && stop.point !== "runway")) return null;
  const type = stopType(stop, heli);
  if (type === "full") return null;
  const label = { touch: "T&G", stop: "S&G", low: t("LOW") }[type];
  return stop.count > 1 ? `${label}×${stop.count}` : label;
};

// Airports of the edition, named.
export function AirportsLayer({ airports, k }) {
  return Object.values(airports).map((a) => (
    <g key={a.icao} transform={`translate(${a.position.x} ${-a.position.y})`} pointerEvents="none">
      <circle r={k * 9} className="fill-none stroke-av-cyan/80" strokeWidth={k * 1.5} />
      <text y={-k * 13} fontSize={k * 12} textAnchor="middle" className="fill-av-cyan font-avmono font-bold" paintOrder="stroke" stroke="#000" strokeWidth={k * 3}>
        {a.code}
      </text>
    </g>
  ));
}

// The flight plan: legs from `fromLeg` on (the stops already done are not drawn), the leg
// being flown or edited in magenta, the others dashed cyan. With `editable`, waypoints of the
// active leg can be dragged, removed (double click or right click) and inserted (drag a +).
export function PlanLayer({ plan, airports, k, heli, fromLeg = 1, activeLeg, editable, beginDrag, onChange, onSelectStop }) {
  const { t } = useEdition();
  const stops = plan.stops;
  const legs = [];
  for (let i = Math.max(1, fromLeg); i < stops.length; i += 1) legs.push(i);
  const stop = (e) => e.stopPropagation();

  const moveWaypoint = (i, route, index) => (p) => onChange(withStop(plan, i, { route: route.map((q, j) => (j === index ? { x: Math.round(p.x), y: Math.round(p.y) } : q)) }));
  const removeWaypoint = (i, index) => onChange(withStop(plan, i, { route: stops[i].route.filter((_, j) => j !== index) }));

  return (
    <g>
      {legs.map((i) => {
        const path = legPath(plan, i, airports).map(toSvg);
        const active = i === activeLeg;
        const points = path.map((p) => `${p.x},${p.y}`).join(" ");
        return (
          <g key={stops[i].id}>
            <polyline points={points} fill="none" stroke="#000" strokeOpacity={0.55} strokeWidth={k * (active ? 7 : 5)} strokeLinejoin="round" strokeLinecap="round" pointerEvents="none" />
            <polyline
              points={points}
              fill="none"
              className={active ? "stroke-av-magenta" : "stroke-av-cyan"}
              strokeWidth={k * (active ? 3.5 : 2.5)}
              strokeDasharray={active ? undefined : `${k * 10} ${k * 7}`}
              strokeLinejoin="round"
              strokeLinecap="round"
              pointerEvents="none"
            />
            {path.slice(0, -1).map((a, j) => {
              const b = path[j + 1];
              const len = Math.hypot(b.x - a.x, b.y - a.y);
              if (len < k * 40) return null;
              const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
              const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
              if (editable && active) {
                // Drag (or click) the + to put a new waypoint on this segment.
                const insert = (e) => {
                  const route = [...stops[i].route];
                  route.splice(j, 0, { x: Math.round(mid.x), y: Math.round(-mid.y) });
                  onChange(withStop(plan, i, { route }));
                  beginDrag(e, moveWaypoint(i, route, j));
                };
                return (
                  <g key={j} transform={`translate(${mid.x} ${mid.y})`} onPointerDown={insert} onClick={stop} style={{ cursor: "copy" }}>
                    <title>{t("Drag to add a waypoint here")}</title>
                    <circle r={k * 7} className="fill-black/70 stroke-av-magenta" strokeWidth={k * 1.5} />
                    <path d={`M${-k * 3.5} 0 H${k * 3.5} M0 ${-k * 3.5} V${k * 3.5}`} className="stroke-av-magenta" strokeWidth={k * 1.6} />
                  </g>
                );
              }
              return (
                <path
                  key={j}
                  d={`M${-k * 5} ${-k * 4.5} L${k * 5} 0 L${-k * 5} ${k * 4.5} Z`}
                  transform={`translate(${mid.x} ${mid.y}) rotate(${angle})`}
                  className={active ? "fill-av-magenta" : "fill-av-cyan"}
                  stroke="#000"
                  strokeWidth={k}
                  pointerEvents="none"
                />
              );
            })}
            {stops[i].route.map((p, j) => {
              const q = toSvg(p);
              const interactive = editable && active;
              return (
                <g
                  key={j}
                  transform={`translate(${q.x} ${q.y})`}
                  onPointerDown={interactive ? (e) => beginDrag(e, moveWaypoint(i, stops[i].route, j)) : undefined}
                  onDoubleClick={interactive ? (e) => (stop(e), removeWaypoint(i, j)) : undefined}
                  onContextMenu={interactive ? (e) => (e.preventDefault(), removeWaypoint(i, j)) : undefined}
                  onClick={interactive ? stop : undefined}
                  style={{ cursor: interactive ? "move" : undefined }}
                  pointerEvents={interactive ? undefined : "none"}
                >
                  <title>{describePlace(p)}</title>
                  {interactive && <circle r={k * 11} fill="transparent" />}
                  <circle r={k * (active ? 6 : 4.5)} className={active ? "fill-white stroke-av-magenta" : "fill-av-cyan stroke-black"} strokeWidth={k * 2} />
                  {active && (
                    <text x={k * 9} y={k * 4} fontSize={k * 11} className="fill-white font-avmono font-bold" paintOrder="stroke" stroke="#000" strokeWidth={k * 3}>
                      {j + 1}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}

      {stops.map((s, idx) => {
        if (idx < Math.max(1, fromLeg) - 1) return null;
        const p = toSvg(stopPosition(s, airports));
        const current = idx === activeLeg;
        const origin = idx === Math.max(1, fromLeg) - 1;
        const badge = shortType(s, heli, t);
        // The same airport visited twice: the second label goes below the first.
        const stack = stops.slice(Math.max(1, fromLeg) - 1, idx).filter((o) => !isSite(o) && !isSite(s) && o.icao === s.icao).length;
        return (
          <g
            key={s.id}
            transform={`translate(${p.x} ${p.y})`}
            onClick={onSelectStop ? (e) => (stop(e), onSelectStop(idx)) : undefined}
            onPointerDown={onSelectStop ? stop : undefined}
            style={{ cursor: onSelectStop ? "pointer" : undefined }}
            pointerEvents={onSelectStop ? undefined : "none"}
            opacity={origin && !editable ? 0.75 : 1}
          >
            <circle r={k * 10} className={current ? "fill-av-magenta" : isSite(s) ? "fill-av-amber" : "fill-av-cyan"} stroke="#000" strokeWidth={k * 2} />
            <text y={k * 4} fontSize={k * 11} textAnchor="middle" className="fill-black font-avmono font-bold">
              {idx === 0 ? "D" : idx}
            </text>
            <text
              x={k * 14}
              y={k * (5 + stack * 15)}
              fontSize={k * 12}
              className={`font-avmono font-bold ${current ? "fill-av-magenta" : "fill-white"}`}
              paintOrder="stroke"
              stroke="#000"
              strokeWidth={k * 3}
            >
              {isSite(s) ? stopLabel(s, airports) : ""}
              {badge ? `${isSite(s) ? " " : ""}${badge}` : ""}
            </text>
          </g>
        );
      })}
    </g>
  );
}
