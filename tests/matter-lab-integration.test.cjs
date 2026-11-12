"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "matter-lab.html"), "utf8");
const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1]).filter((value) => value.trim()).join("\n");

test("Matter Lab measures workspace bounds before creating initial bodies", () => {
  const initializer = script.match(/function addDefaultItems\(\)\s*\{([\s\S]*?)\n  \}/);
  assert.ok(initializer, "addDefaultItems initializer must exist");
  const body = initializer[1];
  const measured = body.indexOf("measure();");
  assert.ok(measured >= 0, "workspace bounds must be measured");
  assert.ok(measured < body.indexOf("createProtectedBody("),
    "bounds must be set before the first body is added");
  assert.ok(measured < body.indexOf("createItem("),
    "bounds must be set before visible bodies are added");
});

test("Matter Lab updates physics bounds on viewport resize", () => {
  assert.match(script, /world\.setBounds\(r\.width,r\.height\)/);
  assert.match(script, /window\.addEventListener\("resize",measure\)/);
});
