// Builds a pilot readback from an ATC transmission: keep the instructions,
// drop the addressing and advisory parts, then tag the callsign at the end.

// English and French (GTA World France) station names and courtesy phrases.
const ADDRESSING =
  /^((san andreas|sa|los santos|ls|lsia|sandy shores|sandy|mckenzie|paleto)?\s*(center|tower|ground|traffic|contr[ôo]le|tour|sol|trafic)|lsx|sda|gbc)$/i;
const ADVISORY =
  /^(winds?\b|altimeter\b|(mayday|pan-pan|pan pan) (received|re[çc]u)$|good day|roger|thank(s| you)|vent\b|calage\b|qnh\b|bonne (journ[ée]e|soir[ée]e)|au revoir|re[çc]u$|merci)/i;

const compact = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

// Chat/radar lines look like "[15:10] [CH: ATC] Name (240) says: ..." or "** [CH: ATC] Name says: ...".
function stripChatPrefix(raw) {
  const says = raw.match(/\bsays:\s*([\s\S]*)$/i);
  return (says ? says[1] : raw).trim();
}

// Matches the full callsign (or registration) or a controller-shortened suffix of it
// (e.g. "3AB" for "N123AB"). Returns how we should sign the readback.
function matchIdentity(sentence, callsign, ids) {
  const s = compact(sentence);
  if (!s) return null;
  for (const id of ids) {
    const full = compact(id);
    if (!full) continue;
    if (s === full) return id === callsign ? callsign : sentence.trim();
    if (s.length >= 3 && full.endsWith(s)) return sentence.trim();
  }
  return null;
}

export function buildReadback(raw, callsign, aliases = []) {
  const ids = [callsign, ...aliases];
  const asCallsign = (sentence) => matchIdentity(sentence, callsign, ids);
  const text = stripChatPrefix(raw || "");
  if (!text) return { readback: "", questions: [], dropped: [] };

  let addressedAs = callsign;
  const instructions = [];
  const questions = [];
  const dropped = [];

  for (let sentence of text.split(/(?<=[.!?])\s+/)) {
    sentence = sentence.trim();
    if (!sentence) continue;
    const bare = sentence.replace(/[.!]+$/, "").trim();

    // Leading "N123AB, ..." inside the same sentence
    const lead = bare.match(/^([A-Z0-9-]+),\s*(.+)$/i);
    if (lead && asCallsign(lead[1])) {
      addressedAs = asCallsign(lead[1]);
      instructions.push(`${lead[2].charAt(0).toUpperCase()}${lead[2].slice(1)}.`);
      continue;
    }

    const asCs = asCallsign(bare);
    if (asCs) {
      addressedAs = asCs;
      continue;
    }
    if (ADDRESSING.test(bare) || ADVISORY.test(bare)) {
      dropped.push(sentence);
      continue;
    }
    if (sentence.endsWith("?")) {
      questions.push(sentence);
      continue;
    }
    instructions.push(/[.!]$/.test(sentence) ? sentence.replace(/!+$/, ".") : `${sentence}.`);
  }

  const readback = instructions.length ? `${instructions.join(" ")} ${addressedAs}.` : "";
  return { readback, questions, dropped };
}
