import test from "node:test";
import assert from "node:assert/strict";
import { SEQUENCE, SEQUENCE_DURATION, stageAt, wireProgress } from "../3d/src/sequence-contract.mjs";

test("sequence timeline is contiguous and ends at 46 seconds", () => {
  assert.equal(SEQUENCE[0][1], 0);
  for (let i = 1; i < SEQUENCE.length; i++) assert.equal(SEQUENCE[i - 1][2], SEQUENCE[i][1]);
  assert.equal(SEQUENCE_DURATION, 46);
});
test("all major stages resolve at their boundaries", () => {
  assert.equal(stageAt(0), "VEHICLE_APPROACH");
  assert.equal(stageAt(3), "SIDE_DOORS_OPEN");
  assert.equal(stageAt(11), "INDIVIDUAL_WIRE_CONNECTIONS");
  assert.equal(stageAt(31), "MENU_REINSTALL");
  assert.equal(stageAt(46), "VEHICLE_DEPARTURE");
  assert.equal(stageAt(999), "VEHICLE_DEPARTURE");
});
test("seven wire connections progress independently and monotonically", () => {
  for (let i = 0; i < 7; i++) {
    assert.equal(wireProgress(14 + i * 1.8, i), 0);
    assert.equal(wireProgress(14 + i * 1.8 + 1.1, i), 1);
    assert.ok(wireProgress(14 + i * 1.8 + .55, i) > 0.49);
  }
});
test("wire index outside supported connector range is rejected", () => {
  assert.throws(() => wireProgress(0, 7), RangeError);
});
