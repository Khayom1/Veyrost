/**
 * VEYROST depth-axis collision solver.
 * Hybrid 2.5D: Matter owns screen-plane X/Y; this solver owns Z impulses.
 * It is intentionally not marketed as a general 6-DoF rigid-body engine.
 */
export class DepthPhysicsWorld {
  constructor(options = {}) {
    this.restitution = clamp(options.restitution ?? 0.42, 0, 1);
    this.friction = clamp(options.friction ?? 0.08, 0, 1);
    this.maxSpeed = Math.max(0.1, options.maxSpeed ?? 4);
    this.bodies = new Map();
    this.collisions = 0;
  }

  add({ id, x, y, z = 0, width, height, depth = 0.18, mass = 1, velocityZ = 0, anchored = false }) {
    if (!id || this.bodies.has(id)) throw new Error("Depth body IDs must be unique and non-empty.");
    for (const [key, value] of Object.entries({ x, y, z, width, height, depth, mass, velocityZ })) {
      if (!Number.isFinite(value)) throw new TypeError(`Depth body ${key} must be finite.`);
    }
    if (width <= 0 || height <= 0 || depth <= 0 || mass <= 0) throw new RangeError("Depth body dimensions and mass must be positive.");
    const body = { id, x, y, z, initialZ: z, width, height, depth, mass, velocityZ, anchored: Boolean(anchored), collisions: 0 };
    this.bodies.set(id, body);
    return body;
  }

  get(id) { return this.bodies.get(id) ?? null; }

  remove(id) { return this.bodies.delete(id); }

  reset() {
    for (const body of this.bodies.values()) {
      body.z = body.initialZ;
      body.velocityZ = 0;
      body.collisions = 0;
    }
    this.collisions = 0;
  }

  step(delta) {
    const dt = clamp(Number.isFinite(delta) ? delta : 0, 0, 1 / 20);
    this.collisions = 0;
    if (!dt) return 0;
    for (const body of this.bodies.values()) {
      if (body.anchored) { body.velocityZ = 0; continue; }
      body.z += body.velocityZ * dt;
      body.velocityZ *= Math.max(0, 1 - this.friction * dt);
      body.velocityZ = clamp(body.velocityZ, -this.maxSpeed, this.maxSpeed);
    }
    const bodies = [...this.bodies.values()];
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i], b = bodies[j];
        if (!overlap2D(a, b)) continue;
        const penetration = (a.depth + b.depth) / 2 - Math.abs(a.z - b.z);
        if (penetration <= 0) continue;
        this._resolve(a, b, penetration);
      }
    }
    return this.collisions;
  }

  _resolve(a, b, penetration) {
    const invA = a.anchored ? 0 : 1 / a.mass;
    const invB = b.anchored ? 0 : 1 / b.mass;
    const inverseTotal = invA + invB;
    if (!inverseTotal) return;
    const direction = a.z <= b.z ? 1 : -1;
    const correction = Math.max(0, penetration - 0.0005) * 1 / inverseTotal;
    if (invA) a.z -= direction * correction * invA;
    if (invB) b.z += direction * correction * invB;

    const relative = (b.velocityZ - a.velocityZ) * direction;
    if (relative < 0) {
      const impulse = -(1 + this.restitution) * relative / inverseTotal;
      if (invA) a.velocityZ -= impulse * invA * direction;
      if (invB) b.velocityZ += impulse * invB * direction;
    }
    a.collisions += 1;
    b.collisions += 1;
    this.collisions += 1;
  }
}

function overlap2D(a, b) {
  return Math.abs(a.x - b.x) * 2 < a.width + b.width &&
    Math.abs(a.y - b.y) * 2 < a.height + b.height;
}
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
