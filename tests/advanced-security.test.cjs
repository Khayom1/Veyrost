"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "index_advanced.html"), "utf8");

test("provider credentials have empty source defaults", () => {
  assert.match(source, /deepKey:\s*""/);
  assert.match(source, /siliconKey:\s*""/);
  assert.doesNotMatch(source, /(?:deepKey|siliconKey):\s*["'][^"']{12,}["']/);
});

test("settings persistence explicitly blanks every primary secret", () => {
  assert.match(source, /const safeConfig = \{\s*\.\.\.CFG,\s*deepKey:\s*"",\s*siliconKey:\s*"",\s*ghToken:\s*"",\s*gKey:\s*""\s*\}/);
  assert.match(source, /localStorage\.setItem\("veyrost_cfg", JSON\.stringify\(safeConfig\)\)/);
  assert.doesNotMatch(source, /localStorage\.setItem\("veyrost_cfg",\s*JSON\.stringify\(CFG\)\)/);
});

test("legacy config secrets are scrubbed during startup", () => {
  assert.match(source, /One-time migration: scrub credentials previously stored in browser localStorage\.\s*saveCfg\(\);/);
});

test("legacy provider API keys are removed before provider initialization", () => {
  const seedStart = source.indexOf("memoryState=loadLocal();");
  const purge = source.indexOf("delete provider.apiKey", seedStart);
  const initialize = source.indexOf("Providers.init()", seedStart);
  assert.ok(seedStart >= 0 && purge > seedStart && initialize > purge,
    "legacy credentials must be purged after load and before provider initialization");
});

test("provider credentials are excluded from persisted workspace snapshots", () => {
  assert.match(source, /function compactState\(state\)\s*\{[\s\S]*?delete x\.apiKey;[\s\S]*?return x;/);
  assert.match(source, /API key \(kept in memory for this session only; re-enter after reload\)/);
});

test("SiliconFlow uses one consistent config key", () => {
  assert.doesNotMatch(source, /CFG\.silKey/);
  assert.match(source, /m\.siliconKey = normStr\(m\.siliconKey, DEFAULTS\.siliconKey\)/);
  assert.match(source, /key: \(\) => CFG\.siliconKey/);
  assert.match(source, /CFG\.siliconKey =[\s\S]{0,160}sSilicon/);
  assert.match(source, /id="sSilicon"/);
  assert.match(source, /text\(CFG\.siliconKey\)/);
});

test("secret redaction covers camelCase provider and credential property names", () => {
  assert.match(source, /api[_-]?key|apikey/);
  assert.match(source, /ghToken\|githubToken\|deepKey\|siliconKey\|gKey\|googleApiKey/);
  assert.match(source, /Utils\.safeText\(CFG\.siliconKey\)\.trim\(\)/);
});

test("custom provider URLs must be HTTPS and public", () => {
  assert.match(source, /provider\.baseURL must use HTTPS/);
  assert.match(source, /provider\.baseURL must target a public host/);
  assert.match(source, /invalid_provider_url_https_public_host_required/);
});

test("Supabase endpoint rejects non-public or non-HTTPS URLs", () => {
  assert.match(source, /Supabase URL must use HTTPS and a public hostname/);
});

test("provider chat requests send credentials in Authorization headers", () => {
  assert.match(source, /Authorization.*providerCfg\.apiKey/);
  assert.match(source, /Cache-Control.*no-store/);
});

test("web fetch validates URL before forwarding it to the reader service", () => {
  const registryStart = source.indexOf("const TOOL_REGISTRY");
  const start = source.indexOf("web_fetch: {", registryStart);
  assert.ok(start >= 0);
  const section = source.slice(start, start + 1500);
  assert.ok(section.indexOf("Utils.isValidHttpUrl(u)") >= 0);
  assert.ok(section.indexOf("https://r.jina.ai/") > section.indexOf("Utils.isValidHttpUrl(u)"));
});

test("URL validator rejects localhost, private and metadata destinations", () => {
  const match = source.match(/isValidHttpUrl\(u\)\s*\{([\s\S]*?)\n\},\n\nvalidateArgs/);
  assert.ok(match, "URL validator body must be found");
  const validator = new Function("Utils", "LIMITS", "return function(u) { " + match[1] + " }")(
    { safeText: value => String(value ?? "") },
    { maxWebUrlChars: 4096 }
  );
  assert.equal(validator("https://example.com/path"), true);
  assert.equal(validator("http://localhost/"), false);
  assert.equal(validator("http://127.0.0.1/"), false);
  assert.equal(validator("http://10.0.0.5/"), false);
  assert.equal(validator("http://192.168.1.1/"), false);
  assert.equal(validator("http://169.254.169.254/latest/meta-data/"), false);
  assert.equal(validator("http://metadata.google.internal/"), false);
  assert.equal(validator("file:///etc/passwd"), false);
  assert.equal(validator("https://user:pass@example.com/"), false);
});

test("Gmail and Drive are explicitly unavailable without OAuth", () => {
  assert.match(source, /Gmail requires OAuth 2\.0/);
  assert.match(source, /Drive requires OAuth 2\.0/);
});
