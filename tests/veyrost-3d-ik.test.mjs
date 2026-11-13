import test from "node:test";
import assert from "node:assert/strict";
import { solvePlanarTwoBone } from "../3d/src/ik.mjs";
test("IK solves reachable target",()=>{const r=solvePlanarTwoBone(.35,-.55);assert.ok(Number.isFinite(r.shoulder));assert.ok(Number.isFinite(r.elbow));assert.equal(r.reachable,true)});
test("IK clamps unreachable targets",()=>{const r=solvePlanarTwoBone(8,0);assert.ok(Number.isFinite(r.shoulder));assert.equal(r.reachable,false);assert.equal(solvePlanarTwoBone(0,-.01).reachable,false)});