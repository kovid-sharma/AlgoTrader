import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { KotakSession } from "./kotak";

const COOKIE_NAME = "kotak_sess";

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET must be set (at least 16 characters).");
  }
  return s;
}

export function signSession(data: KotakSession): string {
  const secret = getSecret();
  const payload = Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySessionString(raw: string | undefined): KotakSession | null {
  if (!raw) return null;
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as KotakSession;
  } catch {
    return null;
  }
}

export async function getKotakSession(): Promise<KotakSession | null> {
  const c = await cookies();
  return verifySessionString(c.get(COOKIE_NAME)?.value);
}

export async function setKotakSession(session: KotakSession) {
  const c = await cookies();
  c.set(COOKIE_NAME, signSession(session), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

export async function clearKotakSession() {
  const c = await cookies();
  c.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}
