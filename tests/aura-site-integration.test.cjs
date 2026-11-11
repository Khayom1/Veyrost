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
