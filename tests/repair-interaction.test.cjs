"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const api = import("../repair-interaction.mjs");

test("repair cannot start without a valid detached target identifier", async () => {
  const { RepairInteractionSequence } = await api;
  const sequence = new RepairInteractionSequence();
  for (const id of [null, undefined, "", "  "]) assert.equal(sequence.begin(id), false);
  assert.equal(sequence.snapshot().phase, "idle");
});

test("repair begins with a maintenance lock and normalized target ID", async () => {
  const { RepairInteractionSequence } = await api;
  const sequence = new RepairInteractionSequence();
  assert.equal(sequence.begin(" home "), true);
  assert.equal(sequence.snapshot().targetId, "home");
  assert.equal(sequence.snapshot().phase, "locking");
  assert.equal(sequence.snapshot().locked, true);
});

test("sequence follows lock, tug-of-war, alignment, cable connection, verification and restoration", async () => {
  const { RepairInteractionSequence } = await api;
  const sequence = new RepairInteractionSequence();
  sequence.begin("home");
  const expected = ["tug-of-war", "aligning", "connecting", "verifying", "restoring", "complete"];
  for (const phase of expected) {
    for (let i = 0; i < 10; i++) sequence.update(0.1);
    assert.equal(sequence.snapshot().phase, phase);
  }
});

test("large frame deltas are bounded and cannot skip multiple repair stages", async () => {
  const { RepairInteractionSequence } = await api;
  const sequence = new RepairInteractionSequence();
  sequence.begin("home");
  sequence.update(30);
  assert.equal(sequence.snapshot().phase, "locking");
  assert.ok(sequence.snapshot().elapsed <= 0.25);
});

test("invalid deltas cannot advance repair progress", async () => {
  const { RepairInteractionSequence } = await api;
  const sequence = new RepairInteractionSequence();
  sequence.begin("home");
  sequence.update(Number.NaN);
  sequence.update(Number.POSITIVE_INFINITY);
  sequence.update(-1);
  assert.equal(sequence.snapshot().elapsed, 0);
});

test("active maintenance sequence rejects concurrent starts", async () => {
  const { RepairInteractionSequence } = await api;
  const sequence = new RepairInteractionSequence();
  assert.equal(sequence.begin("home"), true);
  assert.equal(sequence.begin("ai-systems"), false);
  assert.equal(sequence.snapshot().targetId, "home");
});

test("failure is terminal and unlocks the maintenance state", async () => {
  const { RepairInteractionSequence } = await api;
  const sequence = new RepairInteractionSequence();
  sequence.begin("home");
  assert.equal(sequence.fail(), true);
  assert.equal(sequence.snapshot().phase, "failed");
  assert.equal(sequence.snapshot().locked, false);
  assert.equal(sequence.fail(), false);
});

test("completed sequence is immutable and stable under additional updates", async () => {
  const { RepairInteractionSequence } = await api;
  const sequence = new RepairInteractionSequence();
  sequence.begin("home");
  for (let i = 0; i < 120; i++) sequence.update(0.1);
  const snapshot = sequence.snapshot();
  assert.equal(snapshot.phase, "complete");
  assert.equal(Object.isFrozen(snapshot), true);
  sequence.update(10);
  assert.equal(sequence.snapshot().revision, snapshot.revision);
});

test("reset clears target and allows a new repair transaction", async () => {
  const { RepairInteractionSequence } = await api;
  const sequence = new RepairInteractionSequence();
  sequence.begin("home");
  sequence.reset();
  assert.equal(sequence.snapshot().phase, "idle");
  assert.equal(sequence.snapshot().targetId, null);
  assert.equal(sequence.begin("ai-systems"), true);
});
