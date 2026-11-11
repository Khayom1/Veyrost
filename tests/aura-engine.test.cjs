"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const apiPromise = import("../aura-engine.mjs");

function hand() {
  return Array.from({ length: 21 }, (_, i) => ({ x: 0.3 + i * 0.001, y: 0.5 }));
}
function setFinger(points, tip, pip, extended) {
  points[pip] = { x: 0.5, y: 0.6 };
  points[tip] = { x: 0.5, y: extended ? 0.25 : 0.72 };
}

test("distance2d measures normalized landmark distance", async () => {
  const { distance2d } = await apiPromise;
  assert.equal(distance2d({x:0,y:0},{x:3,y:4}),5);
  assert.equal(distance2d(null,{x:0,y:0}),Infinity);
});

test("pinch is classified before other finger poses", async () => {
  const { classifyHand } = await apiPromise;
  const points=hand();
  points[8]={x:0.52,y:0.25}; points[4]={x:0.51,y:0.25};
  setFinger(points,8,6,true);
  assert.equal(classifyHand(points),"pinch");
});

test("four extended fingers classify as an open palm", async () => {
  const { classifyHand } = await apiPromise;
  const points=hand();
  setFinger(points,8,6,true); setFinger(points,12,10,true);
  setFinger(points,16,14,true); setFinger(points,20,18,true);
  points[4]={x:0.1,y:0.1};
  assert.equal(classifyHand(points),"open_palm");
});

test("index and middle only classify as scroll", async () => {
  const { classifyHand } = await apiPromise;
  const points=hand();
  setFinger(points,8,6,true); setFinger(points,12,10,true);
  setFinger(points,16,14,false); setFinger(points,20,18,false);
  points[4]={x:0.1,y:0.1};
  assert.equal(classifyHand(points),"scroll");
});

test("closed fingers classify as fist", async () => {
  const { classifyHand } = await apiPromise;
  const points=hand();
  setFinger(points,8,6,false); setFinger(points,12,10,false);
  setFinger(points,16,14,false); setFinger(points,20,18,false);
  points[4]={x:0.1,y:0.1};
  assert.equal(classifyHand(points),"fist");
});

test("one extended index classifies as cursor movement", async () => {
  const { classifyHand } = await apiPromise;
  const points=hand();
  setFinger(points,8,6,true); setFinger(points,12,10,false);
  setFinger(points,16,14,false); setFinger(points,20,18,false);
  points[4]={x:0.1,y:0.1};
  assert.equal(classifyHand(points),"move");
});

test("invalid landmark arrays safely return none", async () => {
  const { classifyHand } = await apiPromise;
  assert.equal(classifyHand([]),"none");
  assert.equal(classifyHand(undefined),"none");
});

test("viewport mapping mirrors the selfie camera and clamps coordinates", async () => {
  const { mapHandToViewport } = await apiPromise;
  assert.deepEqual(mapHandToViewport({x:0.2,y:0.3},200,100),{x:160,y:30});
  assert.deepEqual(mapHandToViewport({x:2,y:-1},200,100),{x:0,y:0});
});

test("pinch emits start and end events for draggable spatial objects", async () => {
  const { AuraController } = await apiPromise;
  const events = [];
  const controller = new AuraController({
    video: {},
    cursor: { style: {} },
    windowRef: { innerWidth: 200, innerHeight: 100, scrollBy() {} },
    documentRef: { elementFromPoint: () => null, dispatchEvent() {} },
    navigatorRef: {},
    onGesture: (name, detail) => events.push({ name, detail })
  });
  controller.active = true;
  const pinched = hand();
  pinched[8] = { x: 0.52, y: 0.25 };
  pinched[4] = { x: 0.51, y: 0.25 };
  setFinger(pinched, 8, 6, true);
  controller._consume({ landmarks: [pinched] });
  controller._consume({ landmarks: [pinched] });

  const pointing = hand();
  setFinger(pointing, 8, 6, true);
  setFinger(pointing, 12, 10, false);
  setFinger(pointing, 16, 14, false);
  setFinger(pointing, 20, 18, false);
  pointing[4] = { x: 0.1, y: 0.1 };
  controller._consume({ landmarks: [pointing] });
  controller._consume({ landmarks: [pointing] });

  assert.ok(events.some(event => event.name === "pinch-start"));
  assert.ok(events.some(event => event.name === "pinch-end"));
});

test("losing the hand releases an active pinch", async () => {
  const { AuraController } = await apiPromise;
  const events = [];
  const controller = new AuraController({
    video: {},
    cursor: { style: {} },
    windowRef: { innerWidth: 200, innerHeight: 100, scrollBy() {} },
    documentRef: { elementFromPoint: () => null, dispatchEvent() {} },
    navigatorRef: {},
    onGesture: name => events.push(name)
  });
  controller.active = true;
  const pinched = hand();
  pinched[8] = { x: 0.52, y: 0.25 };
  pinched[4] = { x: 0.51, y: 0.25 };
  setFinger(pinched, 8, 6, true);
  controller._consume({ landmarks: [pinched] });
  controller._consume({ landmarks: [pinched] });
  controller._consume({ landmarks: [] });
  assert.ok(events.includes("pinch-cancel"));
  assert.ok(events.includes("hand-lost"));
  assert.equal(controller.lastGesture, "none");
  assert.equal(controller.cursor.style.visibility, "hidden");
});


test("pinch recognition scales with hand size and uses a wider release threshold", async () => {
  const { classifyHand } = await apiPromise;
  const points = hand();
  points[0] = {x:0.5,y:0.9};
  points[9] = {x:0.5,y:0.5};
  points[4] = {x:0.5,y:0.34};
  points[8] = {x:0.5,y:0.38};
  assert.equal(classifyHand(points), "pinch");
  points[4] = {x:0.5,y:0.1};
  points[8] = {x:0.5,y:0.38};
  assert.equal(classifyHand(points, undefined, "pinch"), "pinch");
  assert.equal(classifyHand(points), "move");
});

test("pinch must be stable for two frames before a click begins", async () => {
  const { AuraController } = await apiPromise;
  const events = [];
  const controller = new AuraController({
    video: {}, cursor: {style:{}},
    windowRef: {innerWidth:200,innerHeight:100,scrollBy(){}},
    documentRef: {elementFromPoint:()=>null,dispatchEvent(){}},
    navigatorRef: {}, onGesture:name=>events.push(name)
  });
  controller.active = true;
  const pinched = hand();
  pinched[8]={x:0.52,y:0.25}; pinched[4]={x:0.51,y:0.25};
  controller._consume({landmarks:[pinched]});
  assert.equal(events.includes("pinch-start"),false);
  controller._consume({landmarks:[pinched]});
  assert.equal(events.includes("pinch-start"),true);
});
