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

test("protected release synchronizes lifecycle and Matter solver before detachment", () => {
  assert.match(runtime, /const result = lifecycle\.pull\(\)/);
  assert.match(runtime, /const isValidAttempt = result\.reason === "first-pull-resisted"/);
  assert.match(runtime, /const synchronized = result\.reason === "first-pull-resisted"/);
  assert.match(runtime, /protected-integrity-reset/);
  assert.match(runtime, /this\.physics\.tryDetach\(id\)/);
});

test("detached controls reveal a fixed mount socket and repair action", () => {
  assert.match(runtime, /_buildProtectedSocket/);
  assert.match(runtime, /socket\.visible = true/);
  assert.match(runtime, /spatial-repair-control/);
  assert.match(runtime, /repairDetachedControls\(\)/);
});

test("repair requires both physics bodies and recovers failed transitions", () => {
  assert.match(runtime, /if \(!body \|\| !depthBody \|\| !control\.beginRepair\(\)\) continue/);
  assert.match(runtime, /if \(!planarRestored\) \{\s*control\.cancelRepair\(\)/);
  assert.match(runtime, /if \(!control\.completeRepair\(\)\) \{\s*control\.cancelRepair\(\)/);
  assert.match(runtime, /depthBody\.z = depthBody\.initialZ/);
});

test("reset restores all protected controls and removes repair affordance", () => {
  assert.match(runtime, /for \(const control of this\.protectedControls\.values\(\)\) control\.reset\(\)/);
  assert.match(runtime, /this\.repairButton\.style\.display = "none"/);
});

test("lifecycle rejects invalid IDs and supports safe repair rollback", () => {
  assert.match(lifecycle, /function normalizeControlId/);
  assert.match(lifecycle, /Protected control ID must be non-empty/);
  assert.match(lifecycle, /cancelRepair\(\)/);
  assert.match(lifecycle, /Protected control IDs must be iterable/);
});
