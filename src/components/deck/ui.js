"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Glass-cockpit building blocks. Colors follow avionics conventions:
// cyan = selectable/selected, magenta = active, green = live/OK, amber = caution, red = warning.

export function Panel({ title, action, children, className = "", bodyClassName = "p-3" }) {
  return (
    <section className={`rounded-md border border-av-bezel bg-av-panel shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_10px_30px_rgba(0,0,0,0.45)] ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-av-bezel bg-av-panel2/70">
          <h2 className="flex items-center gap-2 font-avmono text-[10px] font-bold uppercase tracking-[0.18em] text-av-dim">
            <span className="h-2.5 w-[3px] rounded-sm bg-av-cyan" aria-hidden="true" />
            {title}
          </h2>
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function FieldLabel({ children }) {
  return <div className="font-avmono text-[10px] font-bold uppercase tracking-[0.14em] text-av-mute mb-1.5">{children}</div>;
}

export const softkeyClass = (active, tone = "cyan") => {
  const tones = {
    cyan: "border-av-cyan text-av-cyan bg-av-cyan/10 shadow-[0_0_12px_rgba(61,220,245,0.18)]",
    magenta: "border-av-magenta text-av-magenta bg-av-magenta/10 shadow-[0_0_12px_rgba(230,76,246,0.2)]",
    green: "border-av-green text-av-green bg-av-green/10",
    amber: "border-av-amber text-av-amber bg-av-amber/15 shadow-[0_0_12px_rgba(255,178,36,0.25)]",
  };
  return `font-avmono font-bold rounded border transition-colors duration-100 disabled:opacity-30 disabled:cursor-not-allowed ${
    active ? tones[tone] : "border-av-dim/45 bg-av-panel2 text-av-text/85 hover:text-av-cyan hover:border-av-cyan/70"
  }`;
};

// Buttons that change the flight itself (new flight, edit the plan, next stop) and the map
// options: amber so they stand out from the cyan choices, and never mistaken for MAYDAY red.
// "primary" is filled, "secondary" outlined; `on` lights an outlined toggle up.
export const actionClass = (kind = "secondary", on = false) =>
  `font-avmono font-bold uppercase tracking-wider rounded border-2 transition-colors duration-100 disabled:opacity-30 disabled:cursor-not-allowed ${
    kind === "primary"
      ? "border-av-amber bg-av-amber text-black hover:bg-[#ffc457] shadow-[0_0_14px_rgba(255,178,36,0.35)]"
      : on
        ? "border-av-amber bg-av-amber/25 text-av-amber shadow-[0_0_12px_rgba(255,178,36,0.3)]"
        : "border-av-amber/70 bg-av-amber/5 text-av-amber hover:bg-av-amber/20"
  }`;

// Softkey row. `badge` lets an option carry a hint (★ into the wind, closed…).
export function ChipGroup({ label, options, value, onChange, size = "md", tone = "cyan" }) {
  const pad = size === "sm" ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]";
  return (
    <div>
      {label && <FieldLabel>{label}</FieldLabel>}
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            title={opt.title}
            className={`${pad} uppercase tracking-wide ${softkeyClass(opt.value === value, tone)}`}
          >
            {opt.label}
            {opt.badge && <span className="ml-1 text-av-amber">{opt.badge}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TextInput({ label, value, onChange, placeholder, className = "", ...rest }) {
  return (
    <label className={`block ${className}`}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded border border-av-line bg-black/50 px-2.5 py-1.5 font-avmono text-sm text-av-cyan placeholder-av-mute focus:outline-none focus:border-av-cyan"
        {...rest}
      />
    </label>
  );
}

export function Toggle({ label, checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`px-3 py-1.5 text-[11px] uppercase ${softkeyClass(checked)}`}>
      {checked ? "■ " : "□ "}
      {label}
    </button>
  );
}

// PFD-style readout box.
export function Readout({ label, value, unit, tone = "text-av-green", dim }) {
  return (
    <div className={`min-w-[74px] rounded border border-av-line bg-black/60 px-2 py-1 ${dim ? "opacity-40" : ""}`}>
      <div className="font-avmono text-[9px] font-bold uppercase tracking-[0.16em] text-av-mute">{label}</div>
      <div className={`font-avmono text-[15px] font-bold leading-tight tabular-nums ${tone}`}>
        {value}
        {unit && <span className="ml-0.5 text-[10px] text-av-dim">{unit}</span>}
      </div>
    </div>
  );
}

export function useCopy() {
  const [copiedKey, setCopiedKey] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const copy = useCallback((text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      clearTimeout(timeoutRef.current);
      setCopiedKey(key);
      timeoutRef.current = setTimeout(() => setCopiedKey(null), 1500);
    });
  }, []);

  return { copiedKey, copy };
}
