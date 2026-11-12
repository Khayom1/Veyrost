(function () {
  "use strict";
  const BASE = "https://bgfcpnlxztziigrsyuqp.supabase.co/functions/v1";
  const AUTH_URL = BASE + "/veyrost-auth";
  const PROXY_URL = BASE + "/veyrost-proxy";
  let session = null;
  let publishableKey = "";

  async function authRequest(payload) {
    const response = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store"
    });
    let data = {};
    try { data = await response.json(); } catch (_) {}
    if (!response.ok) throw Object.assign(new Error(data.error || "Supabase authentication failed"), { code: "auth_" + response.status, status: response.status });
    if (data.publishable_key) publishableKey = data.publishable_key;
    if (data.access_token) {
      session = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || "",
        expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000
      };
    }
    return data;
  }

  async function signIn(email, password) {
    return authRequest({ action: "sign_in", email, password });
  }
  async function signUp(email, password) {
    return authRequest({ action: "sign_up", email, password });
  }
  async function signOut() {
    const current = session;
    try {
      if (current) await authRequest({ action: "sign_out", access_token: current.accessToken });
    } finally {
      session = null;
      publishableKey = "";
    }
  }
  function isAuthenticated() {
    return !!(session && session.accessToken && (session.expiresAt > Date.now() || session.refreshToken));
  }
  function accessToken() {
    return session && session.accessToken ? session.accessToken : "";
  }
  function authError() {
    return Object.assign(new Error("Аввал бо ҳисоби Supabase ворид шавед."), { code: "not_configured", retryable: false });
  }
  async function ensureSession() {
    if (!session || !session.accessToken) throw authError();
    if (session.expiresAt > Date.now() + 60_000) return;
    if (!session.refreshToken) { session = null; throw authError(); }
    try {
      const result = await authRequest({ action: "refresh", refresh_token: session.refreshToken });
      if (!result.access_token) throw authError();
    } catch (error) {
      session = null;
      publishableKey = "";
      throw error;
    }
  }

  async function proxyRequest(payload, signal) {
    await ensureSession();
    if (!publishableKey) throw authError();
    return fetch(PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + session.accessToken,
        "apikey": publishableKey
      },
      body: JSON.stringify(payload),
      signal,
      cache: "no-store"
    });
  }
  async function fetchThroughProxy(target, options, signal) {
    const opts = options || {};
    const headers = {};
    const source = new Headers(opts.headers || {});
    for (const name of ["accept", "content-type", "x-github-api-version"]) {
      const value = source.get(name);
      if (value) headers[name] = value;
    }
    return proxyRequest({
      target: String(target),
      method: String(opts.method || "GET").toUpperCase(),
      headers,
      body: typeof opts.body === "string" ? opts.body : undefined
    }, signal || opts.signal);
  }
  async function health() {
    const response = await proxyRequest({ action: "health" });
    let data = {};
    try { data = await response.json(); } catch (_) {}
    return { ok: response.ok && data.ok === true, status: response.status, data };
  }

  window.VeyrostBackend = Object.freeze({
    signIn, signUp, signOut, isAuthenticated, accessToken,
    fetch: fetchThroughProxy, health,
    authUrl: AUTH_URL, proxyUrl: PROXY_URL
  });
})();