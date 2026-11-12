"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

const api = import("../protected-control.mjs");

test("protected control resists the first pull and detaches on the second", async () => {
  const { ProtectedControlState } = await api;
  const control = new ProtectedControlState("menu");
  assert.equal(control.pull().reason, "first-pull-resisted");
  assert.equal(control.snapshot().state, "resisting");
  assert.equal(control.pull().reason, "mount-released");
  assert.equal(control.snapshot().state, "detached");
});

test("repair requires a detached control and explicit completion", async () => {
  const { ProtectedControlState } = await api;
  const control = new ProtectedControlState("settings");
  assert.equal(control.beginRepair(), false);
  control.pull();
  control.pull();
  assert.equal(control.beginRepair(), true);
  assert.equal(control.pull().reason, "repair-in-progress");
  assert.equal(control.completeRepair(), true);
  assert.equal(control.snapshot().state, "mounted");
  assert.equal(control.snapshot().pullCount, 0);
});

test("reset returns every lifecycle to mounted and advances revision", async () => {
  const { ProtectedControlState } = await api;
  const control = new ProtectedControlState("menu");
  control.pull();
  const before = control.snapshot().revision;
  const result = control.reset();
  assert.equal(result.state, "mounted");
  assert.equal(result.pullCount, 0);
  assert.ok(result.revision > before);
});

test("registry rejects duplicate protected control IDs", async () => {
  const { createProtectedControlRegistry } = await api;
  assert.throws(() => createProtectedControlRegistry(["menu", "menu"]), /unique/);
});

test("control IDs reject null, missing, empty and whitespace-only values", async () => {
  const { ProtectedControlState, createProtectedControlRegistry } = await api;
  for (const id of [null, undefined, "", "   "]) {
    assert.throws(() => new ProtectedControlState(id), /non-empty/);
  }
  assert.throws(() => createProtectedControlRegistry(["home", " home "]), /unique/);
});

test("registry accepts iterable IDs and canonicalizes numeric identifiers", async () => {
  const { createProtectedControlRegistry } = await api;
  const registry = createProtectedControlRegistry(new Set([1, "two"]));
  assert.deepEqual([...registry.keys()], ["1", "two"]);
  assert.throws(() => createProtectedControlRegistry([1, "1"]), /unique/);
  assert.throws(() => createProtectedControlRegistry(null), /iterable/);
});

test("failed repair can be cancelled without losing detached state", async () => {
  const { ProtectedControlState } = await api;
  const control = new ProtectedControlState("network");
  control.pull();
  control.pull();
  assert.equal(control.beginRepair(), true);
  assert.equal(control.cancelRepair(), true);
  assert.equal(control.snapshot().state, "detached");
  assert.equal(control.snapshot().pullCount, 2);
  assert.equal(control.cancelRepair(), false);
});

test("snapshots are immutable and do not expose mutable lifecycle state", async () => {
  const { ProtectedControlState } = await api;
  const control = new ProtectedControlState("display");
  const snapshot = control.snapshot();
  assert.equal(Object.isFrozen(snapshot), true);
  assert.throws(() => { snapshot.state = "detached"; }, TypeError);
  assert.equal(control.snapshot().state, "mounted");
});
