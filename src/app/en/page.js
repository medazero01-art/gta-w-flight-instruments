import FlightDeck from "@/components/deck/FlightDeck";

export const metadata = {
  title: "GTA World · Flight Instruments",
  description: "CTAF and San Andreas Center calls, SAAA briefing and live radar for GTA World pilots.",
};

export default function GtaWorldPage() {
  return <FlightDeck editionId="en" />;
}
