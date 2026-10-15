import { getFeed } from "@/lib/atc/radarUpstream";

export const dynamic = "force-dynamic";

// Aircraft and the /atc frequency in one response, so a client poll is one request.
export async function GET() {
  const [aircraft, atc] = await Promise.all([getFeed("aircraft"), getFeed("atc")]);
  return Response.json(
    { aircraft: aircraft.data, atc: atc.data, fetchedAt: aircraft.fetchedAt, errors: { aircraft: aircraft.error, atc: atc.error } },
    // Shared CDN cache (2s) on Vercel; browsers always ask again.
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=2, stale-while-revalidate=1" } }
  );
}
