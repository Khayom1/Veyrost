import { ServiceCrewSequence, SERVICE_CREW_PHASES } from "./service-crew-state.mjs";

function makeMaterial(THREE, color, metalness = 0.18, roughness = 0.62) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

function addBox(THREE, parent, material, size, position) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function addCylinder(THREE, parent, material, radiusTop, radiusBottom, height, position, segments = 12) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    material
  );
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function makeTechnician(THREE, palette, position) {
  const root = new THREE.Group();
  const materials = {
    suit: makeMaterial(THREE, palette.suit),
    vest: makeMaterial(THREE, palette.vest, 0.08, 0.72),
    helmet: makeMaterial(THREE, 0xf1f6fa, 0.12, 0.36),
    skin: makeMaterial(THREE, 0xb97852),
    boots: makeMaterial(THREE, 0x182332),
    trim: makeMaterial(THREE, 0xf4b84c, 0.24, 0.4)
  };

  const torso = addCylinder(THREE, root, materials.suit, 0.19, 0.23, 0.48, [0, 0.79, 0], 10);
  torso.rotation.z = -0.035;
  addBox(THREE, root, materials.vest, [0.32, 0.31, 0.055], [0, 0.81, 0.14]);
  addBox(THREE, root, materials.trim, [0.34, 0.045, 0.065], [0, 0.78, 0.18]);
  addCylinder(THREE, root, materials.skin, 0.095, 0.105, 0.19, [0, 1.13, 0], 12);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.145, 12, 8), materials.helmet);
  helmet.scale.set(1.12, 0.68, 1);
  helmet.position.set(0, 1.27, 0);
  root.add(helmet);
  addBox(THREE, root, materials.trim, [0.25, 0.025, 0.19], [0, 1.24, 0.01]);

  const limbs = {};
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.105, 0.49, 0);
    addCylinder(THREE, leg, materials.suit, 0.075, 0.085, 0.39, [0, -0.19, 0], 8);
    addBox(THREE, leg, materials.boots, [0.16, 0.09, 0.23], [0, -0.4, 0.045]);
    root.add(leg);
    limbs[side < 0 ? "leftLeg" : "rightLeg"] = leg;

    const arm = new THREE.Group();
    arm.position.set(side * 0.235, 0.97, 0);
    addCylinder(THREE, arm, materials.suit, 0.065, 0.075, 0.38, [0, -0.17, 0], 8);
    addCylinder(THREE, arm, materials.skin, 0.052, 0.058, 0.13, [0, -0.39, 0], 8);
    root.add(arm);
    limbs[side < 0 ? "leftArm" : "rightArm"] = arm;
  }

  const belt = addBox(THREE, root, materials.boots, [0.34, 0.075, 0.22], [0, 0.54, -0.015]);
  belt.position.y = 0.55;
  addBox(THREE, root, materials.trim, [0.1, 0.16, 0.1], [0.22, 0.57, 0.04]);

  root.position.set(...position);
  root.userData.limbs = limbs;
  root.userData.palette = palette;
  return root;
}

function makeServiceVehicle(THREE) {
  const vehicle = new THREE.Group();
  const body = makeMaterial(THREE, 0xdce7ed, 0.34, 0.38);
  const dark = makeMaterial(THREE, 0x1b2b3b, 0.48, 0.42);
  const glass = new THREE.MeshStandardMaterial({
    color: 0x173b55, metalness: 0.42, roughness: 0.18,
    transparent: true, opacity: 0.88
  });
  const amber = new THREE.MeshStandardMaterial({
    color: 0xffb84f, emissive: 0x7c3c08, emissiveIntensity: 0.75
  });
  addBox(THREE, vehicle, body, [2.8, 0.82, 0.9], [0, 0.53, 0]);
  addBox(THREE, vehicle, body, [1.02, 0.76, 0.86], [0.78, 1.22, 0]);
  addBox(THREE, vehicle, glass, [0.76, 0.43, 0.035], [0.79, 1.27, 0.45]);
  addBox(THREE, vehicle, glass, [0.76, 0.43, 0.035], [0.79, 1.27, -0.45]);
  addBox(THREE, vehicle, dark, [1.55, 0.16, 0.94], [-0.52, 0.99, 0]);
  addBox(THREE, vehicle, amber, [0.62, 0.09, 0.13], [-0.08, 0.99, 0.49]);

  const wheels = [];
  for (const x of [-0.9, 0.9]) {
    for (const z of [-0.47, 0.47]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.27, 0.27, 0.16, 16),
        dark
      );
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.28, z);
      vehicle.add(wheel);
      wheels.push(wheel);
    }
  }
  for (const z of [-0.36, 0.36]) {
    addBox(THREE, vehicle, amber, [0.18, 0.13, 0.04], [1.39, 0.62, z]);
  }
  addBox(THREE, vehicle, dark, [0.3, 0.16, 0.95], [-1.43, 0.49, 0]);
  vehicle.userData.wheels = wheels;
  vehicle.userData.beacon = amber;
  return vehicle;
}

function makeExtensionLadder(THREE) {
  const ladder = new THREE.Group();
  const metal = makeMaterial(THREE, 0x9fb4c4, 0.78, 0.28);
  const railLength = 3.65;
  for (const y of [-0.16, 0.16]) {
    addBox(THREE, ladder, metal, [railLength, 0.055, 0.055], [railLength / 2, y, 0]);
  }
  for (let x = 0.16; x < railLength; x += 0.28) {
    addBox(THREE, ladder, metal, [0.055, 0.27, 0.055], [x, 0, 0]);
  }
  ladder.userData.length = railLength;
  return ladder;
}

export class ServiceCrew3D {
  constructor(THREE, scene, options = {}) {
    if (!THREE || !scene) throw new TypeError("Service crew requires Three.js and a scene.");
    this.THREE = THREE;
    this.scene = scene;
    this.onState = typeof options.onState === "function" ? options.onState : () => {};
    this.sequence = new ServiceCrewSequence();
    this.group = new THREE.Group();
    this.group.name = "VEYROST-Service-Crew";
    this.vehicle = makeServiceVehicle(THREE);
    this.vehicle.position.set(-12, -4.55, 0.18);
    this.group.add(this.vehicle);

    this.ladderPivot = new THREE.Group();
    this.ladderPivot.position.set(-0.2, 1.0, 0.54);
    this.vehicle.add(this.ladderPivot);
    this.ladder = makeExtensionLadder(THREE);
    this.ladderPivot.add(this.ladder);

    this.leadTechnician = makeTechnician(THREE, { suit: 0x243b58, vest: 0xefa93f }, [-2.5, -4.6, 0.55]);
    this.supportTechnician = makeTechnician(THREE, { suit: 0x34465b, vest: 0x66c9bc }, [-1.45, -4.6, 0.55]);
    this.group.add(this.leadTechnician, this.supportTechnician);
    this.scene.add(this.group);
    this.lastPhase = this.sequence.snapshot().phase;
    this.departed = false;
  }

  depart() {
    const accepted = this.sequence.depart();
    if (accepted) this.onState("crew-folding-ladder");
    return accepted;
  }

  update(deltaSeconds) {
    if (this.departed) return this.sequence.snapshot();
    const state = this.sequence.update(deltaSeconds);
    const phase = state.phase;
    if (phase !== this.lastPhase) {
      this.lastPhase = phase;
      this.onState(`crew-${phase}`);
    }

    const arrival = phase === SERVICE_CREW_PHASES.ARRIVING ? state.progress :
      phase === SERVICE_CREW_PHASES.PARKING || phase === SERVICE_CREW_PHASES.DEPLOYING ||
      phase === SERVICE_CREW_PHASES.CLIMBING || phase === SERVICE_CREW_PHASES.READY ||
      phase === SERVICE_CREW_PHASES.FOLDING ? 1 : 1 - state.progress;
    this.vehicle.position.x = -12 + 7.3 * arrival;
    this.vehicle.userData.wheels.forEach(wheel => { wheel.rotation.x += deltaSeconds * 3.2; });
    this.vehicle.userData.beacon.material.emissiveIntensity = 0.55 + Math.sin(state.elapsed * 8) * 0.18;

    const deployed = phase === SERVICE_CREW_PHASES.DEPLOYING ? state.progress :
      phase === SERVICE_CREW_PHASES.CLIMBING || phase === SERVICE_CREW_PHASES.READY ? 1 :
      phase === SERVICE_CREW_PHASES.FOLDING ? 1 - state.progress : 0;
    this.ladderPivot.rotation.z = 1.04 * deployed;

    const climbing = phase === SERVICE_CREW_PHASES.CLIMBING ? state.progress :
      phase === SERVICE_CREW_PHASES.READY ? 1 :
      phase === SERVICE_CREW_PHASES.FOLDING || phase === SERVICE_CREW_PHASES.DEPARTING ? 1 : 0;
    this.leadTechnician.position.set(
      -2.5 + 0.95 * climbing,
      -4.6 + 3.0 * climbing,
      0.58 + 0.18 * climbing
    );
    this.leadTechnician.rotation.z = -0.12 * climbing;
    const leadLimbs = this.leadTechnician.userData.limbs;
    leadLimbs.leftArm.rotation.z = -0.5 - 0.35 * Math.sin(state.elapsed * 7);
    leadLimbs.rightArm.rotation.z = 0.5 + 0.35 * Math.sin(state.elapsed * 7 + 1);
    leadLimbs.leftLeg.rotation.x = Math.sin(state.elapsed * 8) * 0.45 * (phase === SERVICE_CREW_PHASES.CLIMBING ? 1 : 0);
    leadLimbs.rightLeg.rotation.x = -Math.sin(state.elapsed * 8) * 0.45 * (phase === SERVICE_CREW_PHASES.CLIMBING ? 1 : 0);

    const supportLimbs = this.supportTechnician.userData.limbs;
    supportLimbs.leftArm.rotation.z = -0.65;
    supportLimbs.rightArm.rotation.z = 0.65;
    if (phase === SERVICE_CREW_PHASES.DEPARTING || phase === SERVICE_CREW_PHASES.COMPLETE) {
      this.supportTechnician.position.x = -1.45 - state.progress * 3.8;
      this.leadTechnician.position.x = -1.55 - state.progress * 3.8;
    }
    if (phase === SERVICE_CREW_PHASES.COMPLETE) {
      this.departed = true;
      this.onState("crew-departed");
    }
    return state;
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.clear();
    this.vehicle.clear();
    this.ladderPivot.clear();
    this.leadTechnician.clear();
    this.supportTechnician.clear();
  }
}
