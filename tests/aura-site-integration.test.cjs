"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const html = fs.readFileSync("index.html", "utf8");

test("main navigation contains an accessible AURA mode switch", () => {
  assert.match(html, /id="aura-toggle"[^>]*aria-pressed="false"/);
  assert.match(html, /data-t="auraMode"/);
});

test("main page keeps the camera source hidden and renders only the cursor", () => {
  assert.match(html, /id="aura-camera-source" class="aura-camera-source"[^>]*aria-hidden="true"/);
  assert.match(html, /\.aura-camera-source\{[^}]*left:-10000px/s);
  assert.match(html, /id="aura-cursor" class="aura-cursor" aria-hidden="true"/);
  assert.doesNotMatch(html, /<canvas[^>]*hand-skeleton/i);
});

test("main page uses the shared AURA engine and explicit start-stop lifecycle", () => {
  assert.match(html, /import \{ AuraController \} from "\.\/aura-engine\.mjs"/);
  assert.match(html, /await controller\.start\(\)/);
  assert.match(html, /await controller\.stop\(\)/);
  assert.match(html, /addEventListener\("pagehide"/);
});

test("AURA catch-me Easter egg is present and localized", () => {
  assert.match(html, /id="aura-catch"/);
  assert.match(html, /auraCatch:"CATCH ME"/);
  assert.match(html, /auraCatch:"ПОЙМАЙ МЕНЯ"/);
  assert.match(html, /auraCatch:"МАРО БИГИР"/);
});

test("main website exposes the AURA entry point in all site languages", () => {
  assert.match(html, /href="aura-lab\.html" data-t="auraLab"/);
  assert.match(html, /auraLab:"AURA Hand Control ↗"/);
  assert.match(html, /auraLab:"Лаборатория управления AURA ↗"/);
  assert.match(html, /auraLab:"Идоракунии дастӣ бо AURA ↗"/);
});

test("no literal escaped newline is left after the AURA module", () => {
  assert.doesNotMatch(html, /<\/script>\\n<\/body>/);
});

test("AURA activation opens the integrated spatial scene", () => {
  assert.match(html, /id="spatial-stage"/);
  assert.match(html, /id="spatial-canvas-mount"/);
  assert.match(html, /import\("\.\/spatial-world\.mjs"\)/);
  assert.match(html, /new SpatialWorldController/);
});

test("3D controls expose reset and camera-safe exit actions", () => {
  assert.match(html, /id="spatial-reset"/);
  assert.match(html, /id="spatial-exit"/);
  assert.match(html, /spatialWorld\?\.resetLayout\(\)/);
  assert.match(html, /spatialWorld\?\.destroy\(\)/);
});

test("AURA pinch lifecycle is connected to 3D drag and release", () => {
  assert.match(html, /name === "pinch-start"[\s\S]*beginHandPress/);
  assert.match(html, /name === "pinch-end"[\s\S]*endHandPress/);
  assert.match(html, /name === "pinch-cancel"/);
  assert.match(html, /spatialWorld\?\.onHandMove/);
});

test("spatial navigation maps cards back to site sections and Matter Lab", () => {
  assert.match(html, /function navigateFromSpatial/);
  assert.match(html, /document\.querySelector\(target\)/);
  assert.match(html, /window\.location\.href = target/);
});
