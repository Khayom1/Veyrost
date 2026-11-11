"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { MatterWorld, createBody } = require("../matter-engine.js");

test("creates bodies with mass and bounded compression", () => {
  const body = createBody({ id: "button", x: 5, y: 8, width: 120, height: 52, mass: 4 });
  assert.equal(body.mass, 4);
  assert.equal(body.width, 120);
  assert.ok(body.maxCompression <= 0.35);
});

test("screen edges contain bodies", () => {
  const world = new MatterWorld(400, 300);
  const body = world.add({ id: "edge", x: 360, y: 270, width: 100, height: 60 });
  assert.equal(body.x, 300);
  assert.equal(body.y, 240);
  body.x = 800; body.y = 700; world.step(1/60);
  assert.ok(body.x <= 300); assert.ok(body.y <= 240);
});

test("hidden anchored components do not obstruct visible bodies", () => {
  const world = new MatterWorld(500, 300);
  const hidden = world.add({ id: "hidden", x: 0, y: 0, width: 100, height: 50, anchored: true, collisionEnabled: false });
  const visible = world.add({ id: "visible", x: 10, y: 10, width: 100, height: 50 });
  world.step(1/60);
  assert.equal(visible.x, 10);
  assert.equal(visible.y, 10);
  assert.equal(hidden.anchored, true);
});

test("protected components resist first pull and detach on second", () => {
  const world = new MatterWorld(800, 600);
  const item = world.add({ id: "menu", x: 10, y: 10, width: 100, height: 40, anchored: true });
  assert.equal(world.tryDetach("menu").reason, "heavy-lock");
  assert.equal(item.anchored, true);
  assert.equal(world.tryDetach("menu").detached, true);
  assert.equal(item.detached, true);
});

test("repair restores protected component to original mount", () => {
  const world = new MatterWorld(800, 600);
  const item = world.add({ id: "settings", x: 24, y: 16, width: 112, height: 40, anchored: true });
  world.tryDetach("settings"); world.tryDetach("settings");
  item.x = 300; item.y = 200;
  assert.equal(world.repair("settings"), true);
  assert.equal(item.x, 24); assert.equal(item.y, 16);
  assert.equal(item.anchored, true); assert.equal(item.detached, false);
});

test("collisions separate bodies and compression stays within material limits", () => {
  const world = new MatterWorld(800, 500);
  const a = world.add({ id: "a", x: 100, y: 100, width: 100, height: 50 });
  const b = world.add({ id: "b", x: 150, y: 105, width: 100, height: 50 });
  world.step(1/60);
  const ox = Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x);
  const oy = Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y);
  assert.ok(ox <= 0.1 || oy <= 0.1);
  assert.ok(a.compression >= 0 && a.compression <= a.maxCompression);
  assert.ok(b.compression >= 0 && b.compression <= b.maxCompression);
});
