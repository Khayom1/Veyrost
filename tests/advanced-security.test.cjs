"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index_advanced.html"), "utf8");
const backend = fs.readFileSync(path.join(root, "assets", "veyrost-backend.js"), "utf8");
const proxy = fs.readFileSync(path.join(root, "supabase", "functions", "veyrost-proxy", "proxy-core.ts"), "utf8");
const auth = fs.readFileSync(path.join(root, "supabase", "functions", "veyrost-auth", "auth-core.ts"), "utf8");
const config = fs.readFileSync(path.join(root, "supabase", "config.toml"), "utf8");

test("browser config contains no provider or integration secret values", () => {
  assert.doesNotMatch(html, /CFG\.(?:deepKey|siliconKey|ghToken|gKey|gcx)/);
  for (const id of ["sDeep", "sSilicon", "sGh", "sGKey", "sGcx"]) assert.doesNotMatch(html, new RegExp('id="' + id + '"'));
});
test("legacy browser credentials are removed during startup migration", () => {
  assert.match(html, /for \(const secretField of \["deepKey","siliconKey","ghToken","gKey","gcx"\]\) delete m\[secretField\]/);
  assert.match(html, /delete provider\.apiKey/);
  assert.match(html, /integration\.config = Security\.redactAny\(integration\.config\)/);
  assert.match(html, /delete safeConfig\[secretField\]/);
});
test("provider and shared HTTP traffic is sent only through the authenticated proxy client", () => {
  assert.match(html, /window\.VeyrostBackend\.fetch\(url/);
  assert.match(html, /window\.VeyrostBackend\.fetch\(\s*providerCfg\.baseURL/);
  assert.doesNotMatch(html, /await fetch\(\s*providerCfg\.baseURL/);
  assert.doesNotMatch(html, /providerCfg\.apiKey/);
});
test("browser proxy client keeps user tokens in memory and never persists them", () => {
  assert.match(backend, /let session = null/);
  assert.match(backend, /fetch\(PROXY_URL/);
  assert.match(backend, /"Authorization": "Bearer " \+ session\.accessToken/);
  assert.match(backend, /"apikey": publishableKey/);
  assert.match(backend, /sb_publishable_[A-Za-z0-9_-]+/);
  assert.doesNotMatch(backend, /localStorage|sessionStorage/);
  assert.match(backend, /action: "refresh"/);
  assert.match(html, /id="sAuthPassword" type="password"/);
  assert.doesNotMatch(html, /sSupabasePublicKey/);
});
test("Supabase gateway enforces JWT on proxy and allows only auth bootstrap without JWT", () => {
  assert.match(config, /\[functions\.veyrost-proxy\]\s*verify_jwt = true/);
  assert.match(config, /\[functions\.veyrost-auth\]\s*verify_jwt = false/);
  assert.match(proxy, /claims\.role!=="authenticated"/);
  assert.match(proxy, /typeof claims\.sub!=="string"/);
});
test("provider and integration credentials are injected only from Edge Function secrets", () => {
  for (const name of ["DEEPSEEK_API_KEY", "SILICONFLOW_API_KEY", "GITHUB_TOKEN", "GOOGLE_API_KEY", "GOOGLE_CX"]) {
    assert.ok(proxy.includes('env.get("' + name + '")'), "missing server secret " + name);
  }
  assert.match(auth, /SUPABASE_PUBLISHABLE_KEYS/);
  assert.match(auth, /SUPABASE_ANON_KEY/);
  assert.match(auth, /req\.headers\.get\("apikey"\)!==key/);
  assert.match(html, /\(\?:key\|authorization/);
});
test("proxy allowlists upstream hosts and restricts GitHub routes", () => {
  for (const host of ["api.deepseek.com", "api.siliconflow.com", "api.github.com", "www.googleapis.com", "s.jina.ai", "r.jina.ai"]) {
    assert.ok(proxy.includes('host==="' + host + '"'), "missing allowlisted host " + host);
  }
  assert.match(proxy, /function githubRoute/);
  assert.match(proxy, /actions.*secrets/);
  assert.match(proxy, /redirect:"manual"/);
});
test("proxy rejects private targets and Jina Reader nested private URLs", () => {
  assert.match(proxy, /function blockedHost/);
  assert.match(proxy, /function validHttps/);
  assert.match(proxy, /jina_target_not_allowed/);
  assert.match(proxy, /169/);
});
test("proxy applies request size, user rate and origin limits", () => {
  assert.match(proxy, /MAX_BODY_BYTES = 1_000_000/);
  assert.match(proxy, /maxRequestsPerMinute\?\?90/);
  assert.match(proxy, /origin_not_allowed/);
  assert.match(proxy, /rate_limit_exceeded/);
});
test("Google API key is not embedded in the browser URL", () => {
  assert.match(html, /https:\/\/www\.googleapis\.com\/customsearch\/v1\?q=/);
  assert.doesNotMatch(html, /customsearch\/v1\?key=/);
});
test("Gmail and Drive remain unavailable until a real OAuth integration exists", () => {
  assert.match(html, /Gmail requires OAuth 2\.0/);
  assert.match(html, /Drive requires OAuth 2\.0/);
});
test("deployment guide documents secrets without embedding their values", () => {
  const guide = fs.readFileSync(path.join(root, "supabase", "DEPLOYMENT.md"), "utf8");
  assert.match(guide, /DEEPSEEK_API_KEY/);
  assert.match(guide, /SILICONFLOW_API_KEY/);
  assert.match(guide, /GITHUB_TOKEN/);
  assert.match(guide, /GOOGLE_API_KEY/);
  assert.match(guide, /supabase secrets set/);
  assert.doesNotMatch(guide, /sk-[A-Za-z0-9_-]{12,}/);
});
