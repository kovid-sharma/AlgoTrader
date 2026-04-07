import { kotakQuotesGet } from "@/lib/kotak";
import { getKotakSession } from "@/lib/session";
import { NextResponse } from "next/server";

/**
 * GET /api/kotak/quotes?q=nse_cm|26000,nse_cm|Nifty 50&filter=all
 * `q` is passed as the neosymbol path segment (comma-separated queries).
 */
export async function GET(req: Request) {
  const s = await getKotakSession();
  if (!s) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const filter = searchParams.get("filter") ?? "all";
  if (!q?.trim()) {
    return NextResponse.json(
      { error: "Query parameter q is required (e.g. nse_cm|26000 or nse_cm|Nifty 50)" },
      { status: 400 }
    );
  }
  const parts = q
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const encodedQuery = parts.map((p) => encodeURIComponent(p)).join(",");
  const path = `${encodedQuery}/${encodeURIComponent(filter)}`;
  try {
    const data = await kotakQuotesGet(s.accessToken, s.baseUrl, path);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Request failed" },
      { status: 502 }
    );
  }
}
