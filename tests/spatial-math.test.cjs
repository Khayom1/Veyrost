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

test("saved spatial layouts reject invalid records and unknown panel IDs", async () => {
  const { validateSavedLayout } = await apiPromise;
  assert.deepEqual(validateSavedLayout({ version: 1, panels: [
    { id: "home", x: 0.2, y: 0.3 },
    { id: "unknown", x: 0.1, y: 0.1 },
    { id: "projects", x: Infinity, y: 0.2 }
  ] }), [{ id: "home", x: 0.2, y: 0.3 }]);
  assert.equal(validateSavedLayout({ version: 2, panels: [{ id: "home", x: 0, y: 0 }] }), null);
});

test("saved spatial layouts reject normalized coordinates outside the viewport", async () => {
  const { validateSavedLayout } = await apiPromise;
  assert.deepEqual(validateSavedLayout({ version: 1, panels: [
    { id: "home", x: -0.01, y: 0.5 },
    { id: "projects", x: 1.01, y: 0.5 },
    { id: "ai-systems", x: 0.5, y: -0.01 },
    { id: "matter", x: 0.5, y: 1.01 },
    { id: "founder", x: 0.5, y: 0.5 }
  ] }), [{ id: "founder", x: 0.5, y: 0.5 }]);
});

test("responsive layout scaling preserves normalized panel positions", async () => {
  const { scalePanelLayout } = await apiPromise;
  const scaled = scalePanelLayout([{ id: "home", x: 100, y: 200, width: 120, height: 50 }], 400, 800, 800, 400);
  assert.deepEqual(scaled, [{ id: "home", x: 200, y: 100, width: 240, height: 25 }]);
});

test("saved spatial layouts preserve validated depth and remain backward compatible", async () => {
  const { validateSavedLayout } = await apiPromise;
  assert.deepEqual(validateSavedLayout({ version: 1, panels: [
    { id: "home", x: 0.2, y: 0.3, z: 0.85 },
    { id: "projects", x: 0.4, y: 0.5, z: 9 }
  ] }), [{ id: "home", x: 0.2, y: 0.3, z: 0.85 }]);
  assert.deepEqual(validateSavedLayout({ version: 1, panels: [
    { id: "home", x: 0.2, y: 0.3 }
  ] }), [{ id: "home", x: 0.2, y: 0.3 }]);
});
