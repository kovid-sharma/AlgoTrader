import { kotakPostJData } from "@/lib/kotak";
import { getKotakSession } from "@/lib/session";
import { NextResponse } from "next/server";

const paths = {
  regular: "/quick/order/cancel",
  co: "/quick/order/co/exit",
  bo: "/quick/order/bo/exit",
} as const;

export async function POST(req: Request) {
  const s = await getKotakSession();
  if (!s) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const kind = (searchParams.get("kind") ?? "regular") as keyof typeof paths;
  const path = paths[kind] ?? paths.regular;

  let jData: Record<string, unknown>;
  try {
    jData = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    const data = await kotakPostJData(s, path, jData);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Request failed" },
      { status: 502 }
    );
  }
}
