import { getBriefingData } from "@/lib/atc/saaa";

// Regenerated at most every 15 min (NOTAMs window); airports and weather keep their
// own longer cache inside getBriefingData, so SAAA is hit even less for those.
export const revalidate = 900;

export async function GET() {
  return Response.json(await getBriefingData());
}
