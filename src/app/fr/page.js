import FlightDeck from "@/components/deck/FlightDeck";

export const metadata = {
  title: "GTA World France · Flight Instruments",
  description: "Messages radio, cartes d'aéroport et itinéraires de roulage pour les pilotes de GTA World France.",
};

export default function GtaWorldFrancePage() {
  return <FlightDeck editionId="fr" />;
}
