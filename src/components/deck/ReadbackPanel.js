"use client";

import { useEffect, useState } from "react";
import { buildReadback } from "@/lib/atc/readback";
import { ATC_PREFIX } from "@/lib/atc/phases";
import { useEdition } from "./EditionContext";
import { Panel, softkeyClass } from "./ui";

// `incoming` is the latest controller message addressed to us on the live frequency (GTA World
// radar only): it replaces the textarea content so the readback is ready before we even look.
export default function ReadbackPanel({ flight, copiedKey, copy, incoming }) {
  const { t } = useEdition();
  const [input, setInput] = useState("");
  const callsign = flight.callsign || "[CALLSIGN]";
  const aliases = flight.registration ? [flight.registration] : [];
  const { readback, questions, dropped } = buildReadback(input, callsign, aliases);
  const full = readback ? `${ATC_PREFIX}${readback}` : "";

  useEffect(() => {
    if (incoming) setInput(incoming.text);
  }, [incoming]);

  const pasteFromClipboard = async () => {
    try {
      setInput(await navigator.clipboard.readText());
    } catch {
      // Clipboard read refused: the textarea still works.
    }
  };

  return (
    <Panel
      title={t("Readback")}
      action={
        <button type="button" onClick={pasteFromClipboard} className={`px-2 py-0.5 text-[10px] uppercase ${softkeyClass(false)}`}>
          {t("Paste")}
        </button>
      }
    >
      {incoming && input === incoming.text && (
        <div className="mb-1.5 font-avmono text-[10px] text-av-green">▼ FROM FREQUENCY · {incoming.speaker || "ATC"}</div>
      )}
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={2}
        placeholder={t("Controller message: N123AB. San Andreas Center. Wind 230 at 8. Cleared for takeoff, Runway 2-1.")}
        className="w-full resize-y rounded border border-av-line bg-black/50 px-2.5 py-1.5 font-avmono text-xs text-av-green placeholder-av-mute focus:outline-none focus:border-av-cyan"
      />

      {readback && (
        <button
          type="button"
          onClick={() => copy(full, "readback")}
          className={`mt-1.5 w-full rounded border text-left transition-colors ${
            copiedKey === "readback" ? "border-av-green bg-av-green/10" : "border-av-line bg-black/40 hover:border-av-cyan"
          }`}
        >
          <div className="flex justify-between border-b border-av-line/70 px-3 py-1 font-avmono text-[10px] uppercase">
            <span className="font-bold text-av-dim">{t("Your readback")}</span>
            <span className={copiedKey === "readback" ? "font-bold text-av-green" : "text-av-dim"}>{copiedKey === "readback" ? t("COPIED ✓") : t("COPY")}</span>
          </div>
          <div className="px-3 py-2 font-avmono text-[13px] text-av-cyan break-words">{full}</div>
        </button>
      )}
      {input && !readback && <div className="mt-1.5 font-avmono text-[11px] text-av-mute">{t("No instruction found to read back.")}</div>}

      {questions.length > 0 && (
        <div className="mt-1.5 rounded border border-av-amber/40 bg-av-amber/10 px-2 py-1 text-[11px] text-av-amber">
          {t("Answer this yourself:")} {questions.join(" ")}
        </div>
      )}
      {dropped.length > 0 && (
        <div className="mt-1.5 font-avmono text-[9px] text-av-mute">
          {t("NOT READ BACK:")} {dropped.join(" ")}
        </div>
      )}
    </Panel>
  );
}
