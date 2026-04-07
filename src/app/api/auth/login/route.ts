import { tradeApiLogin, tradeApiValidate, type KotakSession } from "@/lib/kotak";
import { setKotakSession } from "@/lib/session";
import { NextResponse } from "next/server";

type LoginBody = {
  accessToken?: string;
  mobileNumber?: string;
  ucc?: string;
  totp?: string;
  mpin?: string;
};

function errMessage(body: unknown, fallback: string) {
  if (body && typeof body === "object") {
    const o = body as Record<string, unknown>;
    if (typeof o.message === "string") return o.message;
    if (typeof o.emsg === "string") return o.emsg;
  }
  return fallback;
}

export async function POST(req: Request) {
  let json: LoginBody;
  try {
    json = (await req.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { accessToken, mobileNumber, ucc, totp, mpin } = json;
  if (!accessToken?.trim() || !mobileNumber?.trim() || !ucc?.trim() || !totp?.trim() || !mpin?.trim()) {
    return NextResponse.json(
      { error: "accessToken, mobileNumber, ucc, totp, and mpin are required" },
      { status: 400 }
    );
  }

  const totpRes = await tradeApiLogin(accessToken.trim(), {
    mobileNumber: mobileNumber.trim(),
    ucc: ucc.trim(),
    totp: totp.trim(),
  });
  const totpJson = (await totpRes.json()) as Record<string, unknown>;

  if (!totpRes.ok) {
    return NextResponse.json(
      { error: errMessage(totpJson, "TOTP login failed") },
      { status: 401 }
    );
  }

  const data = totpJson.data as Record<string, unknown> | undefined;
  if (!data || data.status !== "success" || data.kType !== "View") {
    return NextResponse.json(
      { error: errMessage(totpJson, "TOTP login was not successful") },
      { status: 401 }
    );
  }

  const viewSid = String(data.sid ?? "");
  const viewToken = String(data.token ?? "");
  if (!viewSid || !viewToken) {
    return NextResponse.json({ error: "Missing view session from TOTP step" }, { status: 502 });
  }

  const mpinRes = await tradeApiValidate(accessToken.trim(), viewSid, viewToken, {
    mpin: mpin.trim(),
  });
  const mpinJson = (await mpinRes.json()) as Record<string, unknown>;

  if (!mpinRes.ok) {
    return NextResponse.json(
      { error: errMessage(mpinJson, "MPIN validation failed") },
      { status: 401 }
    );
  }

  const tradeData = mpinJson.data as Record<string, unknown> | undefined;
  if (!tradeData || tradeData.status !== "success" || tradeData.kType !== "Trade") {
    return NextResponse.json(
      { error: errMessage(mpinJson, "MPIN validation was not successful") },
      { status: 401 }
    );
  }

  const baseUrl = String(tradeData.baseUrl ?? "").trim();
  const auth = String(tradeData.token ?? "").trim();
  const sid = String(tradeData.sid ?? "").trim();
  if (!baseUrl || !auth || !sid) {
    return NextResponse.json({ error: "Incomplete trade session from broker" }, { status: 502 });
  }

  const session: KotakSession = {
    accessToken: accessToken.trim(),
    auth,
    sid,
    baseUrl,
    dataCenter:
      typeof tradeData.dataCenter === "string" ? tradeData.dataCenter : undefined,
    greetingName:
      typeof tradeData.greetingName === "string" ? tradeData.greetingName : undefined,
  };

  await setKotakSession(session);

  return NextResponse.json({
    ok: true,
    greetingName: session.greetingName,
    baseUrl: session.baseUrl,
  });
}
