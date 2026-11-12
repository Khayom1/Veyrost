"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "assets", "veyrost-backend.js"), "utf8");
const PUBLIC_KEY = "sb_publishable_EZp3LgM4zcqtFKBUkphGaQ_FmWpyOWz";

function createClientHarness(expiresIn = 3600) {
  let now = 1_000;
  const calls = [];
  const FakeDate = class extends Date { static now() { return now; } };
  const fakeFetch = async (url, init = {}) => {
    calls.push({ url:String(url), init });
    if (String(url).endsWith("/veyrost-auth")) {
      const body = JSON.parse(init.body || "{}");
      if (body.action === "sign_in") return Response.json({access_token:"user.jwt",refresh_token:"refresh-1",expires_in:expiresIn,publishable_key:PUBLIC_KEY});
      if (body.action === "refresh") return Response.json({access_token:"refreshed.jwt",refresh_token:"refresh-2",expires_in:3600,publishable_key:PUBLIC_KEY});
      return Response.json({ok:true,publishable_key:PUBLIC_KEY});
    }
    return Response.json({ok:true});
  };
  const window = {};
  vm.runInNewContext(source, { window, fetch:fakeFetch, Headers, Response, Date:FakeDate, JSON, String, Object, Error, Number, Promise });
  return { api:window.VeyrostBackend, calls, setNow(value) { now=value; } };
}

test("sign-in uses public Supabase key, then proxies requests with the user JWT only", async () => {
  const h=createClientHarness();
  await h.api.signIn("user@example.com","password123");
  assert.equal(h.calls[0].url.endsWith("/veyrost-auth"),true);
  assert.equal(new Headers(h.calls[0].init.headers).get("apikey"),PUBLIC_KEY);
  assert.equal(new Headers(h.calls[0].init.headers).has("authorization"),false);

  await h.api.fetch("https://api.deepseek.com/chat/completions",{
    method:"POST",
    headers:{"Authorization":"Bearer browser-provider-secret","Content-Type":"application/json"},
    body:"{}"
  });
  const proxy=h.calls[1];
  assert.equal(proxy.url.endsWith("/veyrost-proxy"),true);
  assert.equal(new Headers(proxy.init.headers).get("authorization"),"Bearer user.jwt");
  assert.equal(new Headers(proxy.init.headers).get("apikey"),PUBLIC_KEY);
  const payload=JSON.parse(proxy.init.body);
  assert.equal(payload.target,"https://api.deepseek.com/chat/completions");
  assert.equal(payload.headers.authorization,undefined);
  assert.equal(payload.headers["content-type"],"application/json");
});

test("expired user JWT is refreshed before the proxy request", async () => {
  const h=createClientHarness(1);
  await h.api.signIn("user@example.com","password123");
  h.setNow(3_000);
  await h.api.fetch("https://api.github.com/user/repos",{method:"GET"});
  const refresh=h.calls.find(x=>x.url.endsWith("/veyrost-auth") && JSON.parse(x.init.body).action==="refresh");
  assert.ok(refresh,"refresh request should be sent");
  assert.equal(JSON.parse(refresh.init.body).refresh_token,"refresh-1");
  const proxy=h.calls.at(-1);
  assert.equal(new Headers(proxy.init.headers).get("authorization"),"Bearer refreshed.jwt");
});

test("sign-out clears the in-memory session", async () => {
  const h=createClientHarness();
  await h.api.signIn("user@example.com","password123");
  await h.api.signOut();
  assert.equal(h.api.isAuthenticated(),false);
  await assert.rejects(()=>h.api.fetch("https://api.deepseek.com/chat/completions",{method:"POST",body:"{}"}),/ворид шавед/);
});
