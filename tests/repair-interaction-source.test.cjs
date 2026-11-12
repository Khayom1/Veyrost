"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const runtime = fs.readFileSync("spatial-world.mjs", "utf8");
const visual = fs.readFileSync("service-crew.mjs", "utf8");
const sequence = fs.readFileSync("repair-interaction.mjs", "utf8");

test("repair action begins a guarded technician sequence instead of bypassing maintenance", () => {
  assert.match(runtime, /button\.addEventListener\("click", \(\) => this\.startProtectedRepair\(\)\)/);
  assert.match(runtime, /startProtectedRepair\(\)/);
  assert.match(runtime, /this\.serviceCrew\.sequence\.snapshot\(\)\.phase !== "ready"/);
});

test("maintenance lock blocks user drag while technicians handle the detached panel", () => {
  assert.match(runtime, /if \(!this\.running \|\| this\.paused \|\| this\.maintenanceLock \|\| this\.activeDrag\)/);
  assert.match(runtime, /body\.anchored = true/);
  assert.match(runtime, /this\.maintenanceLock = true/);
});

test("repair sequence includes tug-of-war, cable reconnection and verification stages", () => {
  assert.match(sequence, /TUG_OF_WAR: "tug-of-war"/);
  assert.match(sequence, /CONNECTING: "connecting"/);
  assert.match(sequence, /VERIFYING: "verifying"/);
  assert.match(runtime, /_updateRepairVisual\(snapshot\)/);
});

test("dynamic repair cable connects the protected socket and moving panel", () => {
  assert.match(runtime, /new THREE\.Line\(/);
  assert.match(runtime, /repairCable\.geometry\.attributes\.position/);
  assert.match(runtime, /repairConnector\.position\.copy/);
});

test("technician arms animate during tug-of-war and cable connection", () => {
  assert.match(runtime, /leadTechnician\.userData\.limbs/);
  assert.match(runtime, /supportTechnician\.userData\.limbs/);
  assert.match(runtime, /REPAIR_PHASES\.TUG_OF_WAR/);
});

test("verified repair restores planar and depth mounts before releasing the UI lock", () => {
  assert.match(runtime, /snapshot\.phase === REPAIR_PHASES\.COMPLETE/);
  assert.match(runtime, /this\.repairDetachedControls\(\)/);
  assert.match(runtime, /this\.maintenanceLock = false/);
  assert.match(runtime, /this\.serviceCrew\.depart\(\)/);
});

test("repair visual resources are removed with the spatial scene", () => {
  assert.match(runtime, /this\.repairVisual\?\.removeFromParent\(\)/);
  assert.match(runtime, /this\.repairCable\?\.geometry\?\.dispose\(\)/);
});
