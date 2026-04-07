export const NEO_FIN_KEY = "neotradeapi";
export const LOGIN_BASE = "https://mis.kotaksecurities.com";

export type KotakSession = {
  accessToken: string;
  auth: string;
  sid: string;
  baseUrl: string;
  dataCenter?: string;
  greetingName?: string;
};

export type LoginTotpBody = {
  mobileNumber: string;
  ucc: string;
  totp: string;
};

export type LoginValidateBody = {
  mpin: string;
};

export async function tradeApiLogin(
  accessToken: string,
  body: LoginTotpBody
): Promise<Response> {
  return fetch(`${LOGIN_BASE}/login/1.0/tradeApiLogin`, {
    method: "POST",
    headers: {
      Authorization: accessToken,
      "neo-fin-key": NEO_FIN_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function tradeApiValidate(
  accessToken: string,
  viewSid: string,
  viewToken: string,
  body: LoginValidateBody
): Promise<Response> {
  return fetch(`${LOGIN_BASE}/login/1.0/tradeApiValidate`, {
    method: "POST",
    headers: {
      Authorization: accessToken,
      "neo-fin-key": NEO_FIN_KEY,
      "Content-Type": "application/json",
      sid: viewSid,
      Auth: viewToken,
    },
    body: JSON.stringify(body),
  });
}

function trimBaseUrl(u: string) {
  return u.replace(/\/+$/, "");
}

function throwIfStatNotOk(data: unknown) {
  if (data && typeof data === "object" && "stat" in data) {
    const stat = (data as { stat?: string }).stat;
    if (stat === "Not_Ok") {
      const emsg = (data as { emsg?: string }).emsg;
      throw new Error(emsg ?? "Not_Ok");
    }
  }
}

export function tradeHeaders(session: KotakSession) {
  return {
    Accept: "application/json",
    Auth: session.auth,
    Sid: session.sid,
    "neo-fin-key": NEO_FIN_KEY,
  } as Record<string, string>;
}

/** Quotes: plain access token; optional Accept/Content-Type per Kotak examples. */
export function quotesHeaders(accessToken: string) {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: accessToken,
  };
}

/** Scrip master file-paths: Authorization only (no neo-fin-key, no Auth/Sid). */
export function scripPathsHeaders(accessToken: string) {
  return { Authorization: accessToken };
}

export async function kotakGetJson<T = unknown>(
  session: KotakSession,
  path: string
): Promise<T> {
  const url = `${trimBaseUrl(session.baseUrl)}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "GET",
    headers: tradeHeaders(session),
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(
      typeof data === "object" && data && "emsg" in data && (data as { emsg?: string }).emsg
        ? String((data as { emsg?: string }).emsg)
        : `HTTP ${res.status}: ${text.slice(0, 200)}`
    );
  }
  throwIfStatNotOk(data);
  return data as T;
}

export async function kotakPostJData<T = unknown>(
  session: KotakSession,
  path: string,
  jData: Record<string, unknown>
): Promise<T> {
  const url = `${trimBaseUrl(session.baseUrl)}${path.startsWith("/") ? path : `/${path}`}`;
  const body = new URLSearchParams();
  body.set("jData", JSON.stringify(jData));
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...tradeHeaders(session),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(
      typeof data === "object" && data && "emsg" in data && (data as { emsg?: string }).emsg
        ? String((data as { emsg?: string }).emsg)
        : `HTTP ${res.status}: ${text.slice(0, 200)}`
    );
  }
  throwIfStatNotOk(data);
  return data as T;
}

export async function kotakQuotesGet<T = unknown>(
  accessToken: string,
  baseUrl: string,
  queryPath: string
): Promise<T> {
  const url = `${trimBaseUrl(baseUrl)}/script-details/1.0/quotes/neosymbol/${queryPath}`;
  const res = await fetch(url, {
    headers: quotesHeaders(accessToken),
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(
      typeof data === "object" && data && "emsg" in data && (data as { emsg?: string }).emsg
        ? String((data as { emsg?: string }).emsg)
        : `HTTP ${res.status}: ${text.slice(0, 200)}`
    );
  }
  if (!Array.isArray(data)) throwIfStatNotOk(data);
  return data as T;
}

export async function kotakScripPathsGet<T = unknown>(
  accessToken: string,
  baseUrl: string
): Promise<T> {
  const url = `${trimBaseUrl(baseUrl)}/script-details/1.0/masterscrip/file-paths`;
  const res = await fetch(url, {
    headers: scripPathsHeaders(accessToken),
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  throwIfStatNotOk(data);
  return data as T;
}
