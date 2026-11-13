import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const root = process.cwd();
const assetDir = path.join(root, "3d", "assets");
const names = ["service-vehicle", "robot-technician", "robot-assistant"];

function readGlb(name) {
  const file = path.join(assetDir, name + ".glb.gz");
  assert.ok(fs.existsSync(file), "missing asset: " + path.basename(file));
  const bytes = zlib.gunzipSync(fs.readFileSync(file));
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, name + " GLB magic");
  assert.equal(bytes.readUInt32LE(4), 2, name + " GLB version");
  assert.equal(bytes.readUInt32LE(8), bytes.length, name + " GLB declared length");
  let offset = 12;
  let json;
  let bin;
  while (offset < bytes.length) {
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    offset += 8;
    const chunk = bytes.subarray(offset, offset + length);
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString("utf8").trim());
    if (type === 0x004e4942) bin = chunk;
    offset += length;
  }
  assert.ok(json && bin, name + " requires JSON and BIN chunks");
  for (const view of json.bufferViews || []) {
    const start = view.byteOffset || 0;
    assert.ok(start + view.byteLength <= bin.length, name + " bufferView bounds");
  }
  return { json, bin, bytes };
}

test("all three compressed assets contain valid glTF 2.0 binary containers", () => {
  for (const name of names) {
    const { json } = readGlb(name);
    assert.equal(json.asset.version, "2.0");
  }
});

test("service vehicle exposes two independent hinged side doors", () => {
  const { json } = readGlb("service-vehicle");
  const nodes = json.nodes || [];
  const find = name => nodes.find(node => node.name === name);
  for (const side of ["left", "right"]) {
    const pivot = find("door_" + side + "_pivot");
    const panel = find("door_" + side + "_panel");
    assert.ok(pivot, "missing " + side + " door hinge pivot");
    assert.ok(panel, "missing " + side + " door panel");
    assert.ok((pivot.children || []).includes(nodes.indexOf(panel)), side + " door panel must be parented to hinge");
  }
});

test("both robots have weighted 50-joint hand and finger rigs plus semantic clips", () => {
  for (const name of ["robot-technician", "robot-assistant"]) {
    const { json, bin } = readGlb(name);
    assert.equal(json.skins?.length, 1, name + " skin count");
    const skin = json.skins[0];
    assert.equal(skin.joints.length, 50, name + " joint count");
    const nodeNames = new Set(json.nodes.map(node => node.name));
    for (const bone of ["hips", "spine", "chest", "head", "upper_arm_l", "forearm_l", "hand_l",
      "upper_arm_r", "forearm_r", "hand_r"]) {
      assert.ok(nodeNames.has(bone), name + " missing bone " + bone);
    }
    for (const side of ["l", "r"]) {
      for (const finger of ["thumb", "index", "middle", "ring", "pinky"]) {
        for (let segment = 1; segment <= 3; segment++) {
          assert.ok(nodeNames.has(finger + "_" + side + "_" + segment), name + " missing articulated finger joint");
        }
      }
    }
    const clips = new Set((json.animations || []).map(clip => clip.name));
    for (const clip of ["Idle", "Walk", "Repair", "Board"]) assert.ok(clips.has(clip), name + " missing clip " + clip);
    for (const mesh of json.meshes) {
      for (const primitive of mesh.primitives) {
        const attrs = primitive.attributes;
        assert.ok(attrs.JOINTS_0 !== undefined && attrs.WEIGHTS_0 !== undefined, name + " mesh must be skinned");
        const position = json.accessors[attrs.POSITION];
        const joints = json.accessors[attrs.JOINTS_0];
        const weights = json.accessors[attrs.WEIGHTS_0];
        assert.equal(joints.count, position.count);
        assert.equal(weights.count, position.count);
        assert.equal(weights.componentType, 5121);
        const view = json.bufferViews[weights.bufferView];
        const start = (view.byteOffset || 0) + (weights.byteOffset || 0);
        const values = bin.subarray(start, start + weights.count * 4);
        for (let i = 0; i < values.length; i += 4) {
          assert.equal(values[i] + values[i + 1] + values[i + 2] + values[i + 3], 255,
            name + " vertex weights must be normalized");
        }
      }
    }
    for (const clip of json.animations) {
      assert.ok(clip.channels.length > 0, name + " animation clip must have channels");
      for (const channel of clip.channels) assert.ok(channel.target?.node !== undefined);
    }
  }
});
