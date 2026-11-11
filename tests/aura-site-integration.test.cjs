"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const html = fs.readFileSync("index.html", "utf8");
const auraEngine = fs.readFileSync("aura-engine.mjs", "utf8");

test("main navigation keeps its original accessible AURA switch", () => {
  assert.match(html, /id="aura-toggle"[^>]*aria-pressed="false"/);
  assert.match(html, /data-t="auraMode"/);
  assert.match(html, /id="aura-layout-toggle"[^>]*hidden/);
});

test("AURA preserves the original website instead of replacing it with a spatial scene", () => {
  assert.match(html, /ENGINEERING<br><span>WHAT'S NEXT\.<\/span>/);
  assert.match(html, /id="about"/);
  assert.match(html, /id="focus"/);
  assert.match(html, /id="projects"/);
  assert.doesNotMatch(html, /spatial-stage|openSpatialMode|SpatialWorldController/);
});

test("main page keeps the camera source hidden and uses one conventional arrow cursor", () => {
  assert.match(html, /id="aura-camera-source" class="aura-camera-source"[^>]*aria-hidden="true"/);
  assert.match(html, /\.aura-camera-source\{[^}]*left:-10000px/s);
  assert.equal((html.match(/id="aura-cursor"/g) || []).length, 1);
  assert.match(html, /id="aura-cursor" class="aura-cursor" aria-hidden="true">\s*<svg/);
  assert.match(html, /<path d="M2 1 L2 27/);
  assert.doesNotMatch(html, /aura-cursor:after|<div[^>]*class="aura-cursor"[^>]*>\s*<\/div>/);
});

test("AURA uses the shared engine and releases the camera on stop or page exit", () => {
  assert.match(html, /import \{ AuraController \} from "\.\/aura-engine\.mjs"/);
  assert.match(html, /await controller\.start\(\)/);
  assert.match(html, /await controller\.stop\(\)/);
  assert.match(html, /addEventListener\("pagehide"/);
});

test("the layout editor is visible only while AURA is active and is opt-in", () => {
  assert.match(html, /layoutButton\.hidden=!active/);
  assert.match(html, /layoutButton\.addEventListener\("click",\(\)=>setLayoutEditing\(!layoutEditing\)\)/);
  assert.match(html, /if\(!layoutEditing \|\| activeDrag\) return false/);
  assert.match(html, /veyrost-layout-editing/);
});

test("button positions can be moved by hand pinch or pointer only in edit mode", () => {
  assert.match(html, /beginDrag\(extra\.x,extra\.y,"hand"\)/);
  assert.match(html, /moveDrag\(x,y,"hand"\)/);
  assert.match(html, /addEventListener\("pointerdown"/);
  assert.match(html, /addEventListener\("pointermove"/);
  assert.match(html, /localStorage\.setItem\(LAYOUT_KEY/);
  assert.match(html, /localStorage\.getItem\(LAYOUT_KEY/);
});

test("AURA does not synthesize navigation clicks on movable links during layout editing", () => {
  assert.match(auraEngine, /target\.closest\?\.\("\[data-veyrost-layout-item\]"\)[\s\S]*veyrost-layout-editing/);
});

test("main website still exposes the AURA entry point in all site languages", () => {
  assert.match(html, /href="aura-lab\.html" data-t="auraLab"/);
  assert.match(html, /auraLab:"AURA Hand Control ↗"/);
  assert.match(html, /auraLab:"Лаборатория управления AURA ↗"/);
  assert.match(html, /auraLab:"Идоракунии дастӣ бо AURA ↗"/);
});

test("no literal escaped newline is left after the AURA module", () => {
  assert.doesNotMatch(html, /<\/script>\\n<\/body>/);
});
