"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("spatial-world.mjs", "utf8");

test("spatial renderer is pinned to Three.js r187", () => {
  assert.match(source, /three@0\.187\.0\/build\/three\.module\.js/);
});

test("3D runtime uses a WebGL renderer and responsive orthographic camera", () => {
  assert.match(source, /new THREE\.WebGLRenderer/);
  assert.match(source, /new THREE\.OrthographicCamera/);
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
