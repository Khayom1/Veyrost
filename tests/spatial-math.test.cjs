"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const apiPromise = import("../spatial-math.mjs");

test("screen and world coordinate conversion are inverse operations", async () => {
  const { screenToWorld, worldToScreen } = await apiPromise;
  const point = { x: 713, y: 248 };
  const world = screenToWorld(point.x, point.y, 1440, 900);
  const screen = worldToScreen(world.x, world.y, 1440, 900);
  assert.ok(Math.abs(screen.x - point.x) < 1e-9);
  assert.ok(Math.abs(screen.y - point.y) < 1e-9);
});

test("viewport center maps to the spatial origin", async () => {
  const { screenToWorld, worldToScreen } = await apiPromise;
  assert.deepEqual(screenToWorld(200, 400, 400, 800), { x: 0, y: 0 });
  assert.deepEqual(worldToScreen(0, 0, 400, 800), { x: 200, y: 400 });
});

test("compact layout uses six panels in two columns", async () => {
  const { computeSpatialLayout } = await apiPromise;
  const layout = computeSpatialLayout(390, 844);
  assert.equal(layout.compact, true);
  assert.equal(layout.panels.length, 6);
  assert.equal(layout.panels[0].centerY, layout.panels[1].centerY);
  assert.notEqual(layout.panels[0].centerX, layout.panels[1].centerX);
});

test("desktop layout uses six panels in three columns", async () => {
  const { computeSpatialLayout } = await apiPromise;
  const layout = computeSpatialLayout(1440, 900);
  assert.equal(layout.compact, false);
  assert.equal(layout.panels.length, 6);
  assert.ok(layout.panels[0].centerX < layout.panels[1].centerX);
  assert.ok(layout.panels[1].centerX < layout.panels[2].centerX);
});

test("all panels have unique stable IDs and valid navigation targets", async () => {
  const { SPATIAL_PANELS } = await apiPromise;
  assert.equal(new Set(SPATIAL_PANELS.map(panel => panel.id)).size, 6);
  for (const panel of SPATIAL_PANELS) {
    assert.ok(panel.title.length > 0);
    assert.ok(panel.target.startsWith("#") || panel.target.endsWith(".html"));
  }
});

test("compact panel bounds remain inside a narrow mobile viewport", async () => {
  const { computeSpatialLayout } = await apiPromise;
  const layout = computeSpatialLayout(320, 720);
  for (const panel of layout.panels) {
    assert.ok(panel.x >= 0);
    assert.ok(panel.x + panel.width <= 320);
  }
});
