import { clearKotakSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function POST() {
  await clearKotakSession();
  return NextResponse.json({ ok: true });
}
