"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { distance2d, classifyHand, mapHandToViewport } = await import("../aura-engine.mjs");

function hand() {
  return Array.from({ length: 21 }, (_, i) => ({ x: 0.3 + i * 0.001, y: 0.5 }));
}
function setFinger(points, tip, pip, extended) {
  points[pip] = { x: 0.5, y: 0.6 };
  points[tip] = { x: 0.5, y: extended ? 0.25 : 0.72 };
}

test("distance2d measures normalized landmark distance", () => {
  assert.equal(distance2d({x:0,y:0},{x:3,y:4}),5);
  assert.equal(distance2d(null,{x:0,y:0}),Infinity);
});

test("pinch is classified before other finger poses", () => {
  const points=hand();
  points[4]={x:0.5,y:0.4}; points[8]={x:0.52,y:0.4};
  setFinger(points,8,6,true);
  assert.equal(classifyHand(points),"pinch");
});

test("four extended fingers classify as an open palm", () => {
  const points=hand();
  setFinger(points,8,6,true); setFinger(points,12,10,true);
  setFinger(points,16,14,true); setFinger(points,20,18,true);
  points[4]={x:0.1,y:0.1};
  assert.equal(classifyHand(points),"open_palm");
});

test("index and middle only classify as scroll", () => {
  const points=hand();
  setFinger(points,8,6,true); setFinger(points,12,10,true);
  setFinger(points,16,14,false); setFinger(points,20,18,false);
  points[4]={x:0.1,y:0.1};
  assert.equal(classifyHand(points),"scroll");
});

test("closed fingers classify as fist", () => {
  const points=hand();
  setFinger(points,8,6,false); setFinger(points,12,10,false);
  setFinger(points,16,14,false); setFinger(points,20,18,false);
  points[4]={x:0.1,y:0.1};
  assert.equal(classifyHand(points),"fist");
});

test("one extended index classifies as cursor movement", () => {
  const points=hand();
  setFinger(points,8,6,true); setFinger(points,12,10,false);
  setFinger(points,16,14,false); setFinger(points,20,18,false);
  points[4]={x:0.1,y:0.1};
  assert.equal(classifyHand(points),"move");
});

test("invalid landmark arrays safely return none", () => {
  assert.equal(classifyHand([]),"none");
  assert.equal(classifyHand(undefined),"none");
});

test("viewport mapping mirrors the selfie camera and clamps coordinates", () => {
  assert.deepEqual(mapHandToViewport({x:0.2,y:0.3},200,100),{x:160,y:30});
  assert.deepEqual(mapHandToViewport({x:2,y:-1},200,100),{x:0,y:0});
});
