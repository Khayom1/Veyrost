"use strict";
import test from "node:test";
import assert from "node:assert/strict";
async function loadDepthWorld() { return (await import("../spatial-depth-physics.mjs")).DepthPhysicsWorld; }

test("depth solver resolves overlapping panels along Z", async () => {
  const DepthPhysicsWorld = await loadDepthWorld();
  const world = new DepthPhysicsWorld({ restitution: 0 });
  const a = world.add({ id: "a", x: 0, y: 0, z: 0, width: 4, height: 3, depth: 0.4, mass: 1 });
  const b = world.add({ id: "b", x: 0, y: 0, z: 0.1, width: 4, height: 3, depth: 0.4, mass: 1 });
  assert.equal(world.step(1 / 60), 1);
  assert.ok(Math.abs(a.z - b.z) >= 0.399);
});

test("depth-only contact requires X/Y projected overlap", async () => {
  const DepthPhysicsWorld = await loadDepthWorld();
  const world = new DepthPhysicsWorld();
  world.add({ id: "a", x: 0, y: 0, z: 0, width: 2, height: 2, depth: 0.4 });
  world.add({ id: "b", x: 3, y: 0, z: 0.1, width: 2, height: 2, depth: 0.4 });
  assert.equal(world.step(1 / 60), 0);
});

test("anchored body transfers the depth impulse to the movable body", async () => {
  const DepthPhysicsWorld = await loadDepthWorld();
  const world = new DepthPhysicsWorld({ restitution: 0 });
  const anchor = world.add({ id: "anchor", x: 0, y: 0, z: 0, width: 2, height: 2, depth: 0.5, anchored: true });
  const moving = world.add({ id: "moving", x: 0, y: 0, z: 0.1, width: 2, height: 2, depth: 0.5, velocityZ: -1 });
  world.step(1 / 60);
  assert.equal(anchor.z, 0);
  assert.ok(moving.z > 0.1);
  assert.ok(moving.velocityZ >= 0);
});

test("mass ratio controls positional correction", async () => {
  const DepthPhysicsWorld = await loadDepthWorld();
  const world = new DepthPhysicsWorld({ restitution: 0 });
  const light = world.add({ id: "light", x: 0, y: 0, z: 0, width: 2, height: 2, depth: 0.5, mass: 1 });
  const heavy = world.add({ id: "heavy", x: 0, y: 0, z: 0.1, width: 2, height: 2, depth: 0.5, mass: 10 });
  world.step(1 / 60);
  assert.ok(Math.abs(light.z - 0) > Math.abs(heavy.z - 0.1) * 5);
});

test("invalid dimensions and duplicate IDs are rejected", async () => {
  const DepthPhysicsWorld = await loadDepthWorld();
  const world = new DepthPhysicsWorld();
  assert.throws(() => world.add({ id: "x", x: 0, y: 0, z: 0, width: 0, height: 1, depth: 1 }), /positive/);
  world.add({ id: "x", x: 0, y: 0, z: 0, width: 1, height: 1, depth: 1 });
  assert.throws(() => world.add({ id: "x", x: 0, y: 0, z: 0, width: 1, height: 1, depth: 1 }), /unique/);
});

test("reset restores initial depth and clears velocity", async () => {
  const DepthPhysicsWorld = await loadDepthWorld();
  const world = new DepthPhysicsWorld();
  const body = world.add({ id: "reset", x: 0, y: 0, z: 0.35, width: 2, height: 2, depth: 0.2, velocityZ: 1 });
  world.step(1 / 60);
  world.reset();
  assert.equal(body.z, 0.35);
  assert.equal(body.velocityZ, 0);
});
