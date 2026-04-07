"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Me = { loggedIn: boolean; greetingName?: string; baseUrl?: string; dataCenter?: string };

type TabId =
  | "login"
  | "quotes"
  | "orders"
  | "portfolio"
  | "limits"
  | "scrip"
  | "websocket";

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const j = (await r.json()) as T & { error?: string };
  if (!r.ok && j && typeof j === "object" && "error" in j && j.error) {
    throw new Error(String((j as { error: string }).error));
  }
  if (!r.ok) {
    throw new Error(`Request failed (${r.status})`);
  }
  return j as T;
}

const defaultPlaceOrder = {
  am: "NO",
  dq: "0",
  es: "nse_cm",
  mp: "0",
  pc: "CNC",
  pf: "N",
  pr: "0",
  pt: "MKT",
  qt: "1",
  rt: "DAY",
  tp: "0",
  ts: "ITBEES-EQ",
  tt: "B",
};

export function Dashboard() {
  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTab] = useState<TabId>("login");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [accessToken, setAccessToken] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [ucc, setUcc] = useState("");
  const [totp, setTotp] = useState("");
  const [mpin, setMpin] = useState("");

  const [quoteQ, setQuoteQ] = useState("nse_cm|26000");
  const [quoteFilter, setQuoteFilter] = useState("all");
  const [quoteOut, setQuoteOut] = useState<string>("");

  const [ordersOut, setOrdersOut] = useState<string>("");
  const [placeJson, setPlaceJson] = useState(JSON.stringify(defaultPlaceOrder, null, 2));
  const [modifyJson, setModifyJson] = useState(
    JSON.stringify(
      {
        am: "NO",
        dq: "0",
        es: "nse_cm",
        mp: "0",
        pc: "NRML",
        pf: "N",
        pr: "0",
        pt: "MKT",
        qt: "1",
        rt: "DAY",
        tp: "0",
        ts: "TATAPOWER-EQ",
        tt: "B",
        no: "<orderNo>",
      },
      null,
      2
    )
  );
  const [cancelOn, setCancelOn] = useState("");
  const [cancelTs, setCancelTs] = useState("");
  const [cancelAm, setCancelAm] = useState("NO");
  const [cancelKind, setCancelKind] = useState<"regular" | "co" | "bo">("regular");
  const [historyOrd, setHistoryOrd] = useState("");

  const [portfolioTab, setPortfolioTab] = useState<"holdings" | "positions" | "trades">("holdings");
  const [portfolioOut, setPortfolioOut] = useState("");

  const [limitsJson, setLimitsJson] = useState(
    JSON.stringify({ seg: "ALL", exch: "ALL", prod: "ALL" }, null, 2)
  );
  const [limitsOut, setLimitsOut] = useState("");

  const [marginJson, setMarginJson] = useState(
    JSON.stringify(
      {
        brkName: "KOTAK",
        brnchId: "ONLINE",
        exSeg: "nse_cm",
        prc: "12500",
        prcTp: "L",
        prod: "CNC",
        qty: "1",
        tok: "11536",
        trnsTp: "B",
      },
      null,
      2
    )
  );
  const [marginOut, setMarginOut] = useState("");

  const [scripOut, setScripOut] = useState("");

  const [wsUrl, setWsUrl] = useState("");
  const [wsLog, setWsLog] = useState<string[]>([]);
  const [wsConn, setWsConn] = useState<WebSocket | null>(null);

  const refreshMe = useCallback(async () => {
    try {
      const m = await apiJson<Me>("/api/auth/me");
      setMe(m);
      if (m.loggedIn) {
        setTab((t) => (t === "login" ? "quotes" : t));
      }
    } catch {
      setMe({ loggedIn: false });
    }
  }, []);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const loggedIn = me?.loggedIn ?? false;

  const tabs = useMemo(
    () =>
      [
        { id: "login" as const, label: "Session" },
        { id: "quotes" as const, label: "Quotes" },
        { id: "orders" as const, label: "Orders" },
        { id: "portfolio" as const, label: "Portfolio" },
        { id: "limits" as const, label: "Limits & margin" },
        { id: "scrip" as const, label: "Scrip master" },
        { id: "websocket" as const, label: "WebSocket" },
      ].filter((x) => x.id === "login" || loggedIn),
    [loggedIn]
  );

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await apiJson("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          accessToken,
          mobileNumber,
          ucc,
          totp,
          mpin,
        }),
      });
      setTotp("");
      setMpin("");
      await refreshMe();
      setTab("quotes");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function doLogout() {
    setErr(null);
    setBusy(true);
    try {
      await apiJson("/api/auth/logout", { method: "POST" });
      setMe({ loggedIn: false });
      setTab("login");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Logout failed");
    } finally {
      setBusy(false);
    }
  }

  async function runQuotes() {
    setErr(null);
    setBusy(true);
    try {
      const u = new URL("/api/kotak/quotes", window.location.origin);
      u.searchParams.set("q", quoteQ);
      u.searchParams.set("filter", quoteFilter);
      const data = await apiJson<unknown>(u.toString());
      setQuoteOut(JSON.stringify(data, null, 2));
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Quotes failed");
    } finally {
      setBusy(false);
    }
  }

  async function loadOrders() {
    setErr(null);
    setBusy(true);
    try {
      const data = await apiJson<unknown>("/api/kotak/orders");
      setOrdersOut(JSON.stringify(data, null, 2));
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Order book failed");
    } finally {
      setBusy(false);
    }
  }

  async function placeOrder() {
    setErr(null);
    setBusy(true);
    try {
      const body = JSON.parse(placeJson) as Record<string, unknown>;
      const data = await apiJson<unknown>("/api/kotak/orders/place", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setOrdersOut(JSON.stringify(data, null, 2));
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Place order failed");
    } finally {
      setBusy(false);
    }
  }

  async function modifyOrder() {
    setErr(null);
    setBusy(true);
    try {
      const body = JSON.parse(modifyJson) as Record<string, unknown>;
      const data = await apiJson<unknown>("/api/kotak/orders/modify", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setOrdersOut(JSON.stringify(data, null, 2));
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Modify failed");
    } finally {
      setBusy(false);
    }
  }

  async function cancelOrder() {
    setErr(null);
    setBusy(true);
    try {
      const j: Record<string, string> = { on: cancelOn, am: cancelAm };
      if (cancelTs.trim()) j.ts = cancelTs.trim();
      const u = new URL("/api/kotak/orders/cancel", window.location.origin);
      u.searchParams.set("kind", cancelKind);
      const data = await apiJson<unknown>(u.toString(), {
        method: "POST",
        body: JSON.stringify(j),
      });
      setOrdersOut(JSON.stringify(data, null, 2));
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Cancel failed");
    } finally {
      setBusy(false);
    }
  }

  async function orderHistory() {
    setErr(null);
    setBusy(true);
    try {
      const data = await apiJson<unknown>("/api/kotak/orders/history", {
        method: "POST",
        body: JSON.stringify({ nOrdNo: historyOrd.trim() }),
      });
      setOrdersOut(JSON.stringify(data, null, 2));
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "History failed");
    } finally {
      setBusy(false);
    }
  }

  async function loadPortfolio() {
    setErr(null);
    setBusy(true);
    try {
      const path =
        portfolioTab === "holdings"
          ? "/api/kotak/holdings"
          : portfolioTab === "positions"
            ? "/api/kotak/positions"
            : "/api/kotak/trades";
      const data = await apiJson<unknown>(path);
      setPortfolioOut(JSON.stringify(data, null, 2));
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Portfolio request failed");
    } finally {
      setBusy(false);
    }
  }

  async function loadLimits() {
    setErr(null);
    setBusy(true);
    try {
      const body = JSON.parse(limitsJson) as Record<string, unknown>;
      const data = await apiJson<unknown>("/api/kotak/limits", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setLimitsOut(JSON.stringify(data, null, 2));
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Limits failed");
    } finally {
      setBusy(false);
    }
  }

  async function checkMargin() {
    setErr(null);
    setBusy(true);
    try {
      const body = JSON.parse(marginJson) as Record<string, unknown>;
      const data = await apiJson<unknown>("/api/kotak/margin", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setMarginOut(JSON.stringify(data, null, 2));
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Margin check failed");
    } finally {
      setBusy(false);
    }
  }

  async function loadScripPaths() {
    setErr(null);
    setBusy(true);
    try {
      const data = await apiJson<unknown>("/api/kotak/scrip-paths");
      setScripOut(JSON.stringify(data, null, 2));
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Scrip paths failed");
    } finally {
      setBusy(false);
    }
  }

  function connectWs() {
    setErr(null);
    wsConn?.close();
    setWsConn(null);
    void (async () => {
      try {
        const cfg = await apiJson<{
          sid: string;
          auth: string;
          dataCenter: string;
          wsUrl: string;
        }>("/api/kotak/ws-config");
        const url = (wsUrl || cfg.wsUrl || "").trim();
        if (!url) {
          setErr("Set WebSocket URL or NEXT_PUBLIC_KOTAK_WS_URL.");
          return;
        }
        setWsLog((l) => [
          ...l,
          `[open] ${url} sid=${cfg.sid.slice(0, 8)}… dataCenter=${cfg.dataCenter}`,
        ]);
        const ws = new WebSocket(url);
        ws.onopen = () => {
          setWsLog((l) => [...l, "[connected]"]);
          const payload = {
            type: "connect",
            token: cfg.auth,
            sid: cfg.sid,
            dataCenter: cfg.dataCenter,
          };
          try {
            ws.send(JSON.stringify(payload));
          } catch {
            setWsLog((l) => [...l, "[info] Use Kotak Neo.js for binary protocol."]);
          }
        };
        ws.onmessage = (ev) => {
          const msg =
            typeof ev.data === "string" ? ev.data : `[binary ${(ev.data as ArrayBuffer).byteLength ?? "?"} bytes]`;
          setWsLog((l) => [...l, msg.slice(0, 2000)]);
        };
        ws.onerror = () => setWsLog((l) => [...l, "[error]"]);
        ws.onclose = () => setWsLog((l) => [...l, "[closed]"]);
        setWsConn(ws);
      } catch (e2) {
        setErr(e2 instanceof Error ? e2.message : "WS config failed");
      }
    })();
  }

  function disconnectWs() {
    wsConn?.close();
    setWsConn(null);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 flex flex-col gap-4 border-b border-[var(--border)] pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">Kotak Neo</p>
          <h1 className="mt-1 font-semibold text-2xl tracking-tight md:text-3xl">AutoTrade</h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
            Trade API dashboard: TOTP + MPIN session, quotes, orders, portfolio, limits, scrip paths. Tokens stay
            server-side (signed cookie).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {loggedIn ? (
            <>
              <span className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[var(--muted)]">
                {me?.greetingName ? <>Hi, {me.greetingName}</> : <>Session active</>}
              </span>
              <button
                type="button"
                onClick={() => void doLogout()}
                disabled={busy}
                className="rounded-md border border-[var(--danger)]/50 bg-[var(--surface)] px-3 py-1.5 text-[var(--danger)] hover:opacity-90 disabled:opacity-50"
              >
                Log out
              </button>
            </>
          ) : (
            <span className="text-[var(--muted)]">Not signed in</span>
          )}
        </div>
      </header>

      {err ? (
        <div className="mb-6 rounded-lg border border-[var(--danger)]/40 bg-[var(--surface)] px-4 py-3 text-sm text-[var(--danger)]">
          {err}
        </div>
      ) : null}

      <nav className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              tab === t.id
                ? "bg-[var(--accent)]/15 text-[var(--accent)] ring-1 ring-[var(--accent)]/40"
                : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "login" && (
        <section className="grid gap-6 rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-6 backdrop-blur">
          <h2 className="text-lg font-medium">Login (TOTP + MPIN)</h2>
          <p className="text-sm text-[var(--muted)]">
            NEO access token (plain), mobile with country code, UCC, TOTP, MPIN. Server runs tradeApiLogin and
            tradeApiValidate.
          </p>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={(e) => void doLogin(e)}>
            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="text-[var(--muted)]">Access token</span>
              <input
                className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono text-sm"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                autoComplete="off"
                required
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-[var(--muted)]">Mobile number</span>
              <input
                className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="+91XXXXXXXXXX"
                required
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-[var(--muted)]">UCC</span>
              <input
                className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                value={ucc}
                onChange={(e) => setUcc(e.target.value)}
                required
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-[var(--muted)]">TOTP</span>
              <input
                className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                value={totp}
                onChange={(e) => setTotp(e.target.value)}
                inputMode="numeric"
                required
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-[var(--muted)]">MPIN</span>
              <input
                type="password"
                className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                value={mpin}
                onChange={(e) => setMpin(e.target.value)}
                required
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--bg)] hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </div>
          </form>
        </section>
      )}

      {tab === "quotes" && loggedIn && (
        <section className="grid gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-6">
          <h2 className="text-lg font-medium">Quotes</h2>
          <p className="text-sm text-[var(--muted)]">
            Comma-separated <code className="text-[var(--accent)]">exchange|instrument</code> (pSymbol or index name).
          </p>
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <label className="grid flex-1 gap-1 text-sm">
              <span className="text-[var(--muted)]">Query</span>
              <input
                className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono text-sm"
                value={quoteQ}
                onChange={(e) => setQuoteQ(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm md:w-40">
              <span className="text-[var(--muted)]">Filter</span>
              <select
                className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                value={quoteFilter}
                onChange={(e) => setQuoteFilter(e.target.value)}
              >
                {["all", "52W", "scrip_details", "circuit_limits", "ohlc", "oi", "depth", "ltp"].map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void runQuotes()}
              disabled={busy}
              className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--bg)] disabled:opacity-50"
            >
              Fetch
            </button>
          </div>
          <pre className="max-h-[420px] overflow-auto rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 font-mono text-xs leading-relaxed text-[var(--muted)]">
            {quoteOut || "—"}
          </pre>
        </section>
      )}

      {tab === "orders" && loggedIn && (
        <section className="grid gap-6 rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium">Orders</h2>
            <button
              type="button"
              onClick={() => void loadOrders()}
              disabled={busy}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:opacity-90 disabled:opacity-50"
            >
              Refresh order book
            </button>
          </div>
          <pre className="max-h-[220px] overflow-auto rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 font-mono text-xs text-[var(--muted)]">
            {ordersOut || "—"}
          </pre>

          <div>
            <h3 className="text-sm font-medium text-[var(--muted)]">Place order (jData)</h3>
            <textarea
              className="mt-2 min-h-[200px] w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 font-mono text-xs"
              value={placeJson}
              onChange={(e) => setPlaceJson(e.target.value)}
            />
            <button
              type="button"
              onClick={() => void placeOrder()}
              disabled={busy}
              className="mt-2 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--bg)] disabled:opacity-50"
            >
              Place order
            </button>
          </div>

          <div>
            <h3 className="text-sm font-medium text-[var(--muted)]">Modify order (jData)</h3>
            <textarea
              className="mt-2 min-h-[200px] w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 font-mono text-xs"
              value={modifyJson}
              onChange={(e) => setModifyJson(e.target.value)}
            />
            <button
              type="button"
              onClick={() => void modifyOrder()}
              disabled={busy}
              className="mt-2 rounded-md border border-[var(--border)] px-4 py-2 text-sm hover:opacity-90 disabled:opacity-50"
            >
              Modify
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="text-[var(--muted)]">Cancel — on</span>
              <input
                className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono text-sm"
                value={cancelOn}
                onChange={(e) => setCancelOn(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-[var(--muted)]">ts (AMO)</span>
              <input
                className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                value={cancelTs}
                onChange={(e) => setCancelTs(e.target.value)}
                placeholder="Optional"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-[var(--muted)]">am</span>
              <select
                className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                value={cancelAm}
                onChange={(e) => setCancelAm(e.target.value)}
              >
                <option value="NO">NO</option>
                <option value="YES">YES</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-[var(--muted)]">Endpoint</span>
              <select
                className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                value={cancelKind}
                onChange={(e) => setCancelKind(e.target.value as "regular" | "co" | "bo")}
              >
                <option value="regular">Regular cancel</option>
                <option value="co">Cover exit</option>
                <option value="bo">Bracket exit</option>
              </select>
            </label>
          </div>
          <button
            type="button"
            onClick={() => void cancelOrder()}
            disabled={busy || !cancelOn.trim()}
            className="w-fit rounded-md border border-[var(--danger)]/50 px-4 py-2 text-sm text-[var(--danger)] hover:opacity-90 disabled:opacity-50"
          >
            Cancel / exit
          </button>

          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm">
              <span className="text-[var(--muted)]">Order history — nOrdNo</span>
              <input
                className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono text-sm"
                value={historyOrd}
                onChange={(e) => setHistoryOrd(e.target.value)}
              />
            </label>
            <button
              type="button"
              onClick={() => void orderHistory()}
              disabled={busy || !historyOrd.trim()}
              className="rounded-md border border-[var(--border)] px-4 py-2 text-sm hover:opacity-90 disabled:opacity-50"
            >
              Load history
            </button>
          </div>
        </section>
      )}

      {tab === "portfolio" && loggedIn && (
        <section className="grid gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-6">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["holdings", "Holdings"],
                ["positions", "Positions"],
                ["trades", "Trade book"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPortfolioTab(id)}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  portfolioTab === id
                    ? "bg-[var(--accent)]/15 text-[var(--accent)] ring-1 ring-[var(--accent)]/40"
                    : "bg-[var(--surface)] text-[var(--muted)]"
                }`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void loadPortfolio()}
              disabled={busy}
              className="ml-auto rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:opacity-90 disabled:opacity-50"
            >
              Load
            </button>
          </div>
          <pre className="max-h-[480px] overflow-auto rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 font-mono text-xs text-[var(--muted)]">
            {portfolioOut || "—"}
          </pre>
        </section>
      )}

      {tab === "limits" && loggedIn && (
        <section className="grid gap-6 rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-6">
          <div>
            <h2 className="text-lg font-medium">Limits</h2>
            <textarea
              className="mt-2 min-h-[120px] w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 font-mono text-xs"
              value={limitsJson}
              onChange={(e) => setLimitsJson(e.target.value)}
            />
            <button
              type="button"
              onClick={() => void loadLimits()}
              disabled={busy}
              className="mt-2 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--bg)] disabled:opacity-50"
            >
              Fetch limits
            </button>
            <pre className="mt-4 max-h-[280px] overflow-auto rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 font-mono text-xs text-[var(--muted)]">
              {limitsOut || "—"}
            </pre>
          </div>
          <div>
            <h2 className="text-lg font-medium">Check margin</h2>
            <textarea
              className="mt-2 min-h-[200px] w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 font-mono text-xs"
              value={marginJson}
              onChange={(e) => setMarginJson(e.target.value)}
            />
            <button
              type="button"
              onClick={() => void checkMargin()}
              disabled={busy}
              className="mt-2 rounded-md border border-[var(--border)] px-4 py-2 text-sm hover:opacity-90 disabled:opacity-50"
            >
              Check margin
            </button>
            <pre className="mt-4 max-h-[280px] overflow-auto rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 font-mono text-xs text-[var(--muted)]">
              {marginOut || "—"}
            </pre>
          </div>
        </section>
      )}

      {tab === "scrip" && loggedIn && (
        <section className="grid gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-6">
          <h2 className="text-lg font-medium">Scrip master file paths</h2>
          <button
            type="button"
            onClick={() => void loadScripPaths()}
            disabled={busy}
            className="w-fit rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--bg)] disabled:opacity-50"
          >
            Load paths
          </button>
          <pre className="max-h-[480px] overflow-auto rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 font-mono text-xs text-[var(--muted)]">
            {scripOut || "—"}
          </pre>
        </section>
      )}

      {tab === "websocket" && loggedIn && (
        <section className="grid gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-6">
          <h2 className="text-lg font-medium">WebSocket</h2>
          <p className="text-sm text-[var(--muted)]">
            Paste <code className="text-[var(--accent)]">wss://</code> from Kotak demo or set{" "}
            <code className="text-[var(--accent)]">NEXT_PUBLIC_KOTAK_WS_URL</code>. Binary protocol may require Neo.js.
          </p>
          <label className="grid gap-1 text-sm">
            <span className="text-[var(--muted)]">Override WebSocket URL</span>
            <input
              className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono text-sm"
              value={wsUrl}
              onChange={(e) => setWsUrl(e.target.value)}
              placeholder="wss://…"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => connectWs()}
              disabled={busy || !!wsConn}
              className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--bg)] disabled:opacity-50"
            >
              Connect
            </button>
            <button
              type="button"
              onClick={() => disconnectWs()}
              disabled={!wsConn}
              className="rounded-md border border-[var(--border)] px-4 py-2 text-sm disabled:opacity-50"
            >
              Disconnect
            </button>
            <button type="button" onClick={() => setWsLog([])} className="rounded-md border border-[var(--border)] px-4 py-2 text-sm">
              Clear log
            </button>
          </div>
          <pre className="max-h-[360px] overflow-auto rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 font-mono text-xs text-[var(--muted)]">
            {wsLog.length ? wsLog.join("\n") : "—"}
          </pre>
        </section>
      )}

      <footer className="mt-12 border-t border-[var(--border)] pt-6 text-center text-xs text-[var(--muted)]">
        Trading involves risk. Respect rate limits. Never expose API tokens.
      </footer>
    </div>
  );
}
