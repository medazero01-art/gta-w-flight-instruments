import { headers } from "next/headers";
import Landing from "@/components/landing/Landing";

// The browser sends the device/browser languages in Accept-Language: reading it here renders
// the landing directly in French for French systems, without an English flash first.
function preferredLang() {
  const first = headers().get("accept-language")?.split(",")[0]?.trim().toLowerCase() || "";
  return first.startsWith("fr") ? "fr" : "en";
}

export default function Home() {
  return <Landing initialLang={preferredLang()} />;
}
