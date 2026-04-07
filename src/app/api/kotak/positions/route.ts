import { kotakGetJson } from "@/lib/kotak";
import { getKotakSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET() {
  const s = await getKotakSession();
  if (!s) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  try {
    const data = await kotakGetJson(s, "/quick/user/positions");
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Request failed" },
      { status: 502 }
    );
  }
}
