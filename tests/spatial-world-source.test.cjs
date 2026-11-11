"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("spatial-world.mjs", "utf8");

test("spatial renderer is pinned to Three.js r187", () => {
  assert.match(source, /three@0\.187\.0\/build\/three\.module\.js/);
});

test("3D runtime uses a WebGL renderer and responsive perspective camera", () => {
  assert.match(source, /new THREE\.WebGLRenderer/);
  assert.match(source, /new THREE\.PerspectiveCamera/);
  assert.match(source, /camera\.fov/);
  assert.match(source, /userData\.depth/);
  assert.match(source, /ResizeObserver/);
});

test("3D panels use lit physical materials and point lighting", () => {
  assert.match(source, /new THREE\.MeshPhysicalMaterial/);
  assert.match(source, /new THREE\.PointLight/);
});

test("3D panels are backed by Matter Engine collision physics", () => {
  assert.match(source, /new Matter\.MatterWorld/);
  assert.match(source, /this\.physics\.step\(delta\)/);
  assert.match(source, /body\.compression/);
});

test("raycasting connects mouse, touch and AURA hand input", () => {
  assert.match(source, /new THREE\.Raycaster/);
  assert.match(source, /beginHandPress\(x, y\)/);
  assert.match(source, /endHandPress\(x, y\)/);
  assert.match(source, /onHandMove\(x, y\)/);
  assert.match(source, /onHandLost\(\)/);
});

test("3D renderer caps pixel ratio for mobile performance", () => {
  assert.match(source, /setPixelRatio\(Math\.min/);
  assert.match(source, /width < 680 \? 1\.2 : 1\.5/);
});

test("render loop and GPU resources are disposed", () => {
  assert.match(source, /setAnimationLoop\(null\)/);
  assert.match(source, /renderer\?\.dispose/);
  assert.match(source, /geometry\?\.dispose/);
});

test("selected panels expose depth slider and accessible step buttons", () => {
  assert.match(source, /_buildDepthControl\(\)/);
  assert.match(source, /type = "range"/);
  assert.match(source, /setAttribute\("aria-label", "Selected panel depth"\)/);
  assert.match(source, /adjustSelectedDepth\(-0\.05, true\)/);
  assert.match(source, /adjustSelectedDepth\(0\.05, true\)/);
});

test("mouse wheel adjusts selected panel depth with fine-control modifier", () => {
  assert.match(source, /addEventListener\("wheel", this\._wheel, \{ passive: false \}\)/);
  assert.match(source, /event\.preventDefault\(\)/);
  assert.match(source, /event\.shiftKey \? 0\.01 : 0\.035/);
  assert.match(source, /setPanelDepth\(id, body\.z \+ direction \* fine, true\)/);
});

test("depth manipulation is bounded and anchored controls cannot move", () => {
  assert.match(source, /if \(!body \|\| body\.anchored \|\| !Number\.isFinite/);
  assert.match(source, /Math\.max\(-1\.25, Math\.min\(1\.25/);
});

test("custom depth is serialized and restored with legacy layout compatibility", () => {
  assert.match(source, /z: Number\(\(depthBody\?\.z \?\? 0\)\.toFixed\(4\)\)/);
  assert.match(source, /if \(depthBody && Number\.isFinite\(item\.z\)\) depthBody\.z = item\.z/);
  assert.match(source, /this\.depthControl\?\.remove\(\)/);
});
