"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const page = fs.readFileSync("spatial.html", "utf8");
const runtime = fs.readFileSync("spatial-page.mjs", "utf8");

test("spatial workspace is an explicit standalone route with an exit path", () => {
  assert.match(page, /id="spatial-world"/);
  assert.match(page, /href="studio\.html"/);
  assert.match(page, /id="reset-layout"/);
  assert.match(page, /id="aura-toggle"/);
});

test("spatial route mounts the existing engine without replacing corporate pages", () => {
  assert.match(runtime, /new SpatialWorldController/);
  assert.match(runtime, /\.start\(\)/);
  assert.match(runtime, /world\?\.destroy\(\)/);
});

test("AURA gestures are connected to spatial pointer lifecycle", () => {
  assert.match(runtime, /beginHandPress\(detail\.x, detail\.y\)/);
  assert.match(runtime, /endHandPress\(detail\.x, detail\.y\)/);
  assert.match(runtime, /world\.onHandMove\(x, y\)/);
  assert.match(runtime, /world\.onHandLost\(\)/);
  assert.match(runtime, /world\.setPaused\(true\)/);
  assert.match(runtime, /world\.setPaused\(false\)/);
});

test("camera activation remains explicit and is stopped on route exit", () => {
  assert.match(runtime, /auraButton\.addEventListener\("click"/);
  assert.match(runtime, /aura\.start\(\)/);
  assert.match(runtime, /aura\?\.stop\(\{ notify: false \}\)/);
});
