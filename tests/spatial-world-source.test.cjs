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

test("pause freezes physics and procedural animation without stopping rendering", () => {
  assert.match(source, /this\.animationTime = 0/);
  assert.match(source, /if \(!this\.paused\) this\.animationTime \+= frameDelta/);
  assert.match(source, /if \(!this\.paused\) \{[\s\S]*this\.physics\.step\(delta\)[\s\S]*this\.depthPhysics\.step\(delta\)[\s\S]*this\.core\.rotation\.y/);
  assert.match(source, /this\.renderer\.render\(this\.scene, this\.camera\)/);
});

test("render loop and GPU resources are disposed", () => {
  assert.match(source, /setAnimationLoop\(null\)/);
  assert.match(source, /renderer\?\.dispose/);
  assert.match(source, /geometry\?\.dispose/);
});

test("procedural panel rotations are assigned as bounded offsets, not accumulated", () => {
  assert.match(source, /panel\.group\.rotation\.x = Math\.sin\(elapsed \* 0\.31 \+ index\) \* 0\.00008/);
  assert.match(source, /panel\.group\.rotation\.y = Math\.cos\(elapsed \* 0\.27 \+ index \* 0\.7\) \* 0\.00007/);
  assert.doesNotMatch(source, /panel\.group\.rotation\.[xy] \+=/);
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

test("depth HUD stays clear of repair action and AURA pinches bypass its canvas raycast", () => {
  assert.match(source, /repairButton\?\.style\.display === "block"[\s\S]*max\(132px, env\(safe-area-inset-bottom\)\)/);
  assert.match(source, /elementFromPoint[\s\S]*spatial-depth-control[\s\S]*spatial-repair-control/);
});

test("responsive resize preserves panel centers, clamps bounds, and ends active drags", () => {
  assert.match(source, /if \(this\.activeDrag\) this\.physics\.endDrag\(0, 0\)/);
  assert.match(source, /\(\(body\.x \+ oldWidth \/ 2\) \/ Math\.max\(1, previousWidth\)\) \* width/);
  assert.match(source, /\(\(body\.y \+ oldHeight \/ 2\) \/ Math\.max\(1, previousHeight\)\) \* height/);
  assert.match(source, /body\.x = Math\.max\(0, Math\.min\(width - body\.width/);
  assert.match(source, /body\.y = Math\.max\(0, Math\.min\(height - body\.height/);
});

test("lost pointer capture, window blur, and hidden-page transitions cancel interactions", () => {
  assert.match(source, /addEventListener\("lostpointercapture", this\._pointerCancel\)/);
  assert.match(source, /addEventListener\("blur", this\._windowBlur/);
  assert.match(source, /addEventListener\("visibilitychange", this\._visibilityChange\)/);
  assert.match(source, /removeEventListener\("lostpointercapture", this\._pointerCancel\)/);
  assert.match(source, /removeEventListener\("visibilitychange", this\._visibilityChange\)/);
});
