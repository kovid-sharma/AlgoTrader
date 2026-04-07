import { getKotakSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET() {
  const s = await getKotakSession();
  if (!s) {
    return NextResponse.json({ loggedIn: false });
  }
  return NextResponse.json({
    loggedIn: true,
    greetingName: s.greetingName,
    baseUrl: s.baseUrl,
    dataCenter: s.dataCenter,
  });
}
