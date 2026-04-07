import { getKotakSession } from "@/lib/session";
import { NextResponse } from "next/server";

/**
 * Returns credentials needed for the browser WebSocket (HSM / HSI).
 * The trade token and sid are sensitive; only call when the user explicitly opens the feed panel.
 */
export async function GET() {
  const s = await getKotakSession();
  if (!s) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  return NextResponse.json({
    sid: s.sid,
    auth: s.auth,
    dataCenter: s.dataCenter ?? "",
    wsUrl: process.env.NEXT_PUBLIC_KOTAK_WS_URL ?? "",
  });
}
