import { kotakPostJData } from "@/lib/kotak";
import { getKotakSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const s = await getKotakSession();
  if (!s) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  let jData: Record<string, unknown>;
  try {
    jData = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    const data = await kotakPostJData(s, "/quick/order/vr/modify", jData);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Request failed" },
      { status: 502 }
    );
  }
}
