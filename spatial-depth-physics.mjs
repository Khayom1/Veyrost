/**
 * VEYROST depth-axis collision solver.
 * Hybrid 2.5D: Matter owns screen-plane X/Y; this solver owns Z impulses.
 * It is intentionally not a general 6-DoF rigid-body engine.
 */
const finiteOr = (value, fallback) => Number.isFinite(value) ? value : fallback;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class DepthPhysicsWorld {
  constructor(options = {}) {
    this.restitution = clamp(finiteOr(options.restitution, 0.42), 0, 1);
    this.friction = clamp(finiteOr(options.friction, 0.08), 0, 1);
    this.maxSpeed = Math.max(0.1, finiteOr(options.maxSpeed, 4));
    this.maxSubstep = 1 / 120;
    this.solverIterations = 6;
    this.bodies = new Map();
    this.collisions = 0;
  }

  add({ id, x, y, z = 0, width, height, depth = 0.18, mass = 1, velocityZ = 0, anchored = false }) {
    if (id === undefined || id === null || String(id).trim() === "") {
      throw new Error("Depth body IDs must be unique and non-empty.");
    }
    const key = String(id);
    if (this.bodies.has(key)) throw new Error("Depth body IDs must be unique and non-empty.");
    for (const [name, value] of Object.entries({ x, y, z, width, height, depth, mass, velocityZ })) {
      if (!Number.isFinite(value)) throw new TypeError(`Depth body ${name} must be finite.`);
    }
    if (width <= 0 || height <= 0 || depth <= 0 || mass <= 0) {
      throw new RangeError("Depth body dimensions and mass must be positive.");
    }
    const body = {
      id: key, x, y, z, initialZ: z, width, height, depth, mass,
      velocityZ: clamp(velocityZ, -this.maxSpeed, this.maxSpeed),
      anchored: Boolean(anchored), collisions: 0
    };
    if (body.anchored) body.velocityZ = 0;
    this.bodies.set(key, body);
    return body;
  }

  get(id) { return this.bodies.get(String(id)) ?? null; }

  remove(id) { return this.bodies.delete(String(id)); }

  reset() {
    for (const body of this.bodies.values()) {
      body.z = body.initialZ;
      body.velocityZ = 0;
      body.collisions = 0;
    }
    this.collisions = 0;
  }

  step(delta) {
    const frameDelta = clamp(finiteOr(delta, 0), 0, 1 / 20);
    this.collisions = 0;
    for (const body of this.bodies.values()) body.collisions = 0;
    if (!frameDelta) return 0;

    const substeps = Math.max(1, Math.ceil(frameDelta / this.maxSubstep));
    const dt = frameDelta / substeps;
    const bodies = [...this.bodies.values()];
    const contacts = new Set();

    // Substeps prevent fast depth motion from passing through thin panels.
    for (let step = 0; step < substeps; step++) {
      for (const body of bodies) {
        if (body.anchored) {
          body.velocityZ = 0;
          continue;
        }
        body.velocityZ = clamp(body.velocityZ, -this.maxSpeed, this.maxSpeed);
        body.z += body.velocityZ * dt;
        body.velocityZ *= Math.exp(-this.friction * dt);
      }

      for (let pass = 0; pass < this.solverIterations; pass++) {
        for (let i = 0; i < bodies.length; i++) {
          for (let j = i + 1; j < bodies.length; j++) {
            const a = bodies[i], b = bodies[j];
            if (!overlap2D(a, b)) continue;
            const penetration = (a.depth + b.depth) / 2 - Math.abs(a.z - b.z);
            if (penetration <= 0) continue;
            if (this._resolve(a, b, penetration)) contacts.add(i + ":" + j);
          }
        }
      }
    }

    for (const pair of contacts) {
      const [i, j] = pair.split(":").map(Number);
      bodies[i].collisions += 1;
      bodies[j].collisions += 1;
    }
    this.collisions = contacts.size;
    return this.collisions;
  }

  _resolve(a, b, penetration) {
    const inverseA = a.anchored ? 0 : 1 / a.mass;
    const inverseB = b.anchored ? 0 : 1 / b.mass;
    const inverseTotal = inverseA + inverseB;
    if (!inverseTotal) return false;

    const direction = a.z <= b.z ? 1 : -1;
    const correction = Math.max(0, penetration - 0.0005) / inverseTotal;
    if (inverseA) a.z -= direction * correction * inverseA;
    if (inverseB) b.z += direction * correction * inverseB;

    const relative = (b.velocityZ - a.velocityZ) * direction;
    if (relative < 0) {
      const impulse = -(1 + this.restitution) * relative / inverseTotal;
      if (inverseA) a.velocityZ -= impulse * inverseA * direction;
      if (inverseB) b.velocityZ += impulse * inverseB * direction;
    }
    return true;
  }
}

function overlap2D(a, b) {
  return Math.abs(a.x - b.x) * 2 < a.width + b.width &&
    Math.abs(a.y - b.y) * 2 < a.height + b.height;
}
