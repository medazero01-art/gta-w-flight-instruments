"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

// Layout effects warn during the server render; there is nothing to paint there anyway.
export const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// Calls `paint(now)` on every animation frame while mounted, and once right after each render.
// Moving aircraft are animated by setting one attribute per frame, outside React.
export function useFramePainter(paint) {
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

// Aircraft symbol pointing up, rotated by heading.
export const planePath = (s) =>
  `M0 ${-s} L${s * 0.18} ${-s * 0.35} L${s} ${s * 0.15} L${s} ${s * 0.32} L${s * 0.18} ${s * 0.05} L${s * 0.14} ${s * 0.62} L${s * 0.42} ${s * 0.85} L${s * 0.42} ${s} L0 ${s * 0.88} L${-s * 0.42} ${s} L${-s * 0.42} ${s * 0.85} L${-s * 0.14} ${s * 0.62} L${-s * 0.18} ${s * 0.05} L${-s} ${s * 0.32} L${-s} ${s * 0.15} L${-s * 0.18} ${-s * 0.35} Z`;
