"use client";

import { createContext, useContext, useMemo } from "react";
import { EDITIONS } from "@/lib/editions";
import { translator } from "@/lib/i18n";
import { phraseologyFor } from "@/lib/atc/phraseology";

const EditionContext = createContext(null);

// Everything that differs between GTA World and GTA World France, in one hook:
// the edition flags (radar, saaa), the UI translator and the radio phraseology.
export function EditionProvider({ editionId, children }) {
  const value = useMemo(() => {
    const edition = EDITIONS[editionId];
    return { edition, t: translator(edition.lang), ph: phraseologyFor(edition.lang) };
  }, [editionId]);
  return <EditionContext.Provider value={value}>{children}</EditionContext.Provider>;
}

export function useEdition() {
  const value = useContext(EditionContext);
  if (!value) throw new Error("useEdition must be used inside <EditionProvider>");
  return value;
}
