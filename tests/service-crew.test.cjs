"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

const api = import("../service-crew-state.mjs");

test("service crew sequence begins with vehicle arrival", async () => {
  const { ServiceCrewSequence, SERVICE_CREW_PHASES } = await api;
  const sequence = new ServiceCrewSequence();
  assert.equal(sequence.snapshot().phase, SERVICE_CREW_PHASES.ARRIVING);
});

test("arrival, parking, ladder deployment and technician climb are ordered", async () => {
  const { ServiceCrewSequence, SERVICE_CREW_PHASES } = await api;
  const sequence = new ServiceCrewSequence();
  sequence.update(0.25); // bounded frame delta
  assert.equal(sequence.snapshot().phase, SERVICE_CREW_PHASES.ARRIVING);
  for (let i = 0; i < 60; i++) sequence.update(0.1);
  assert.equal(sequence.snapshot().phase, SERVICE_CREW_PHASES.DEPLOYING);
  for (let i = 0; i < 18; i++) sequence.update(0.1);
  assert.equal(sequence.snapshot().phase, SERVICE_CREW_PHASES.CLIMBING);
  for (let i = 0; i < 28; i++) sequence.update(0.1);
  assert.equal(sequence.snapshot().phase, SERVICE_CREW_PHASES.READY);
});

test("large frame deltas are bounded to prevent skipping service beats", async () => {
  const { ServiceCrewSequence, SERVICE_CREW_PHASES } = await api;
  const sequence = new ServiceCrewSequence();
  sequence.update(20);
  assert.equal(sequence.snapshot().phase, SERVICE_CREW_PHASES.ARRIVING);
  assert.ok(sequence.snapshot().elapsed <= 0.25);
});

test("non-finite and negative deltas cannot advance the crew sequence", async () => {
  const { ServiceCrewSequence } = await api;
  const sequence = new ServiceCrewSequence();
  sequence.update(Number.NaN);
  sequence.update(Number.POSITIVE_INFINITY);
  sequence.update(-1);
  assert.equal(sequence.snapshot().elapsed, 0);
});

test("phase snapshots are immutable and progress remains normalized", async () => {
  const { ServiceCrewSequence } = await api;
  const sequence = new ServiceCrewSequence();
  const snapshot = sequence.snapshot();
  assert.equal(Object.isFrozen(snapshot), true);
  assert.ok(snapshot.progress >= 0 && snapshot.progress <= 1);
  assert.throws(() => { snapshot.phase = "ready"; }, TypeError);
});

test("departure cannot begin before the crew reaches its service position", async () => {
  const { ServiceCrewSequence } = await api;
  const sequence = new ServiceCrewSequence();
  assert.equal(sequence.depart(), false);
});

test("departure folds the ladder before vehicle departure completes", async () => {
  const { ServiceCrewSequence, SERVICE_CREW_PHASES } = await api;
  const sequence = new ServiceCrewSequence();
  for (let i = 0; i < 80; i++) sequence.update(0.1);
  assert.equal(sequence.snapshot().phase, SERVICE_CREW_PHASES.READY);
  assert.equal(sequence.depart(), true);
  assert.equal(sequence.snapshot().phase, SERVICE_CREW_PHASES.FOLDING);
  for (let i = 0; i < 16; i++) sequence.update(0.1);
  assert.equal(sequence.snapshot().phase, SERVICE_CREW_PHASES.DEPARTING);
  for (let i = 0; i < 32; i++) sequence.update(0.1);
  assert.equal(sequence.snapshot().phase, SERVICE_CREW_PHASES.COMPLETE);
});

test("departure is a one-shot transition", async () => {
  const { ServiceCrewSequence } = await api;
  const sequence = new ServiceCrewSequence();
  for (let i = 0; i < 80; i++) sequence.update(0.1);
  assert.equal(sequence.depart(), true);
  assert.equal(sequence.depart(), false);
});

test("ready and completed states remain stable under additional updates", async () => {
  const { ServiceCrewSequence, SERVICE_CREW_PHASES } = await api;
  const sequence = new ServiceCrewSequence();
  for (let i = 0; i < 80; i++) sequence.update(0.1);
  sequence.update(5);
  assert.equal(sequence.snapshot().phase, SERVICE_CREW_PHASES.READY);
  sequence.depart();
  for (let i = 0; i < 80; i++) sequence.update(0.1);
  const revision = sequence.snapshot().revision;
  sequence.update(5);
  assert.equal(sequence.snapshot().phase, SERVICE_CREW_PHASES.COMPLETE);
  assert.equal(sequence.snapshot().revision, revision);
});
