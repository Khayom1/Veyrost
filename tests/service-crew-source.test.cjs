"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const runtime = fs.readFileSync("spatial-world.mjs", "utf8");
const visual = fs.readFileSync("service-crew.mjs", "utf8");
const state = fs.readFileSync("service-crew-state.mjs", "utf8");

test("spatial engine mounts the 3D service crew and updates it inside the simulation loop", () => {
  assert.match(runtime, /import \{ ServiceCrew3D \} from "\.\/service-crew\.mjs"/);
  assert.match(runtime, /new ServiceCrew3D\(THREE, this\.scene/);
  assert.match(runtime, /this\.serviceCrew\?\.update\(delta\)/);
});

test("service vehicle has a detailed body, cab, glass, wheels and warning beacon", () => {
  assert.match(visual, /function makeServiceVehicle/);
  assert.match(visual, /new THREE\.CylinderGeometry\(0\.27, 0\.27, 0\.16, 16\)/);
  assert.match(visual, /vehicle\.userData\.wheels/);
  assert.match(visual, /vehicle\.userData\.beacon/);
  assert.match(visual, /vehicle\.userData\.beacon\.emissiveIntensity/);
});

test("two articulated technicians include safety helmets, vests and tool gear", () => {
  assert.match(visual, /function makeTechnician/);
  assert.match(visual, /new THREE\.SphereGeometry\(0\.145/);
  assert.match(visual, /root\.userData\.limbs = limbs/);
  assert.match(visual, /this\.leadTechnician = makeTechnician/);
  assert.match(visual, /this\.supportTechnician = makeTechnician/);
});

test("ladder is built from metal rails and evenly spaced rungs", () => {
  assert.match(visual, /function makeExtensionLadder/);
  assert.match(visual, /for \(let x = 0\.16; x < railLength; x \+= 0\.28\)/);
  assert.match(visual, /this\.ladderPivot\.rotation\.z = 1\.04 \* deployed/);
});

test("technician climbing animation drives body position and articulated limbs", () => {
  assert.match(visual, /const climbing = phase === SERVICE_CREW_PHASES\.CLIMBING/);
  assert.match(visual, /this\.leadTechnician\.position\.set\(/);
  assert.match(visual, /leadLimbs\.leftLeg\.rotation\.x/);
  assert.match(visual, /phase === SERVICE_CREW_PHASES\.FOLDING \? 1 - state\.progress : 0/);
});

test("service crew exposes controlled ladder folding and vehicle departure", () => {
  assert.match(state, /FOLDING: "folding"/);
  assert.match(state, /DEPARTING: "departing"/);
  assert.match(visual, /depart\(\)[\s\S]*this\.sequence\.depart\(\)/);
  assert.match(visual, /this\.vehicle\.position\.x = -12 \+ 7\.3 \* arrival/);
});

test("service crew disposal detaches its scene graph", () => {
  assert.match(visual, /dispose\(\)[\s\S]*this\.scene\.remove\(this\.group\)/);
});
