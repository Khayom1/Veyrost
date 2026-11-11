"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const runtime = fs.readFileSync("spatial-world.mjs", "utf8");
const lifecycle = fs.readFileSync("protected-control.mjs", "utf8");

test("protected navigation panels start anchored", () => {
  assert.match(runtime, /protectedIds = new Set\(\["home", "ai-systems"\]\)/);
  assert.match(runtime, /anchored: isProtected/);
});

test("first and second pulls are routed through the protected lifecycle and physics mount", () => {
  assert.match(runtime, /lifecycle\?\.pull\(\)/);
  assert.match(runtime, /this\.physics\.tryDetach\(id\)/);
  assert.match(lifecycle, /first-pull-resisted/);
  assert.match(lifecycle, /mount-released/);
});

test("detached controls reveal a fixed mount socket and repair action", () => {
  assert.match(runtime, /_buildProtectedSocket/);
  assert.match(runtime, /socket\.visible = true/);
  assert.match(runtime, /spatial-repair-control/);
  assert.match(runtime, /repairDetachedControls\(\)/);
});

test("repair lifecycle restores original body position and hides socket", () => {
  assert.match(runtime, /control\.beginRepair\(\)/);
  assert.match(runtime, /this\.physics\.repair\(id\)/);
  assert.match(runtime, /control\.completeRepair\(\)/);
  assert.match(runtime, /socket\.visible = false/);
});

test("reset restores all protected controls and removes repair affordance", () => {
  assert.match(runtime, /for \(const control of this\.protectedControls\.values\(\)\) control\.reset\(\)/);
  assert.match(runtime, /this\.repairButton\.style\.display = "none"/);
});

test("protected repair restores the original depth layer and socket alignment", () => {
  assert.match(runtime, /depthBody\.z = depthBody\.initialZ/);
  assert.match(runtime, /socket\.position\.set\(center\.x, center\.y, \(\[-0\.22, 0\.18, -0\.12, 0\.24, -0\.18, 0\.12\]\[panelIndex\] \?\? 0\) - 0\.08\)/);
});
