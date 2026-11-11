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
