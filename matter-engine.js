(function (root) {
  "use strict";
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const finite = (v, fallback) => Number.isFinite(v) ? v : fallback;

  function createBody(options) {
    const o = options || {};
    if (o.id === undefined || o.id === null || String(o.id).trim() === "") {
      throw new Error("Matter bodies require a non-empty id.");
    }
    const x = finite(o.x, 0), y = finite(o.y, 0);
    return {
      id: String(o.id), x, y,
      width: Math.max(12, finite(o.width, 120)), height: Math.max(12, finite(o.height, 52)),
      vx: 0, vy: 0, mass: Math.max(.1, finite(o.mass, 1)),
      elasticity: clamp(finite(o.elasticity, .42), 0, 1),
      friction: clamp(finite(o.friction, .22), 0, 1),
      maxCompression: clamp(finite(o.maxCompression, .16), 0, .35),
      compression: 0, compressionAxis: "y", compressionVelocity: 0,
      material: o.material || "hybrid", collisionEnabled: o.collisionEnabled !== false, anchored: Boolean(o.anchored),
      detached: Boolean(o.detached), detachAttempts: 0, dragging: false,
      pointerOffsetX: 0, pointerOffsetY: 0,
      initial: { x, y, anchored: Boolean(o.anchored) }
    };
  }

  class MatterWorld {
    constructor(width, height, options) {
      const o = options || {};
      this.width = Math.max(1, finite(width, 1));
      this.height = Math.max(1, finite(height, 1));
      this.gravity = finite(o.gravity, 0);
      this.positionCorrection = clamp(finite(o.positionCorrection, .82), .1, 1);
      this.bodies = new Map();
      this.draggedId = null;
      this.maxFrameDelta = 1 / 15;
      this.maxSubstep = 1 / 120;
      this.solverIterations = 8;
    }

    setBounds(width, height) {
      this.width = Math.max(1, finite(width, this.width));
      this.height = Math.max(1, finite(height, this.height));
      for (const body of this.bodies.values()) this._contain(body, 0);
    }

    add(options) {
      const body = createBody(options);
      if (this.bodies.has(body.id)) throw new Error("Matter bodies require unique ids.");
      this.bodies.set(body.id, body);
      this._contain(body, 0);
      return body;
    }

    get(id) { return this.bodies.get(String(id)) || null; }

    remove(id) {
      const key = String(id);
      const body = this.get(key);
      if (this.draggedId === key) {
        if (body) body.dragging = false;
        this.draggedId = null;
      }
      return this.bodies.delete(key);
    }

    beginDrag(id, pointerX, pointerY) {
      const body = this.get(id);
      if (!body || body.anchored) return false;
      // Only one pointer may own the world drag at a time.
      if (this.draggedId && this.draggedId !== body.id) {
        const previous = this.get(this.draggedId);
        if (previous) {
          previous.dragging = false;
          previous.pointerOffsetX = 0;
          previous.pointerOffsetY = 0;
          previous.vx = 0;
          previous.vy = 0;
        }
      }
      this.draggedId = body.id;
      body.dragging = true;
      body.pointerOffsetX = body.x - finite(pointerX, body.x);
      body.pointerOffsetY = body.y - finite(pointerY, body.y);
      body.vx = 0;
      body.vy = 0;
      return true;
    }

    dragTo(pointerX, pointerY) {
      const body = this.get(this.draggedId);
      if (!body || !body.dragging) return false;
      body.x = finite(pointerX, body.x) + body.pointerOffsetX;
      body.y = finite(pointerY, body.y) + body.pointerOffsetY;
      this._contain(body, 0);
      return true;
    }

    endDrag(vx, vy) {
      const body = this.get(this.draggedId);
      if (!body || !body.dragging) {
        this.draggedId = null;
        return false;
      }
      body.dragging = false;
      body.vx = clamp(finite(vx, 0), -1800, 1800);
      body.vy = clamp(finite(vy, 0), -1800, 1800);
      body.pointerOffsetX = 0;
      body.pointerOffsetY = 0;
      this.draggedId = null;
      return true;
    }

    tryDetach(id) {
      const body = this.get(id);
      if (!body || !body.anchored) return { detached: false, reason: "not-anchored" };
      body.detachAttempts += 1;
      if (body.detachAttempts < 2) return { detached: false, reason: "heavy-lock", attempts: body.detachAttempts };
      body.anchored = false;
      body.detached = true;
      body.vx = 0;
      body.vy = 0;
      return { detached: true, reason: "released", attempts: body.detachAttempts };
    }

    repair(id) {
      const body = this.get(id);
      if (!body) return false;
      if (this.draggedId === body.id) this.draggedId = null;
      body.anchored = true;
      body.detached = false;
      body.detachAttempts = 0;
      body.dragging = false;
      body.pointerOffsetX = 0;
      body.pointerOffsetY = 0;
      body.vx = 0;
      body.vy = 0;
      body.compression = 0;
      body.compressionVelocity = 0;
      body.x = body.initial.x;
      body.y = body.initial.y;
      return true;
    }

    reset() {
      this.draggedId = null;
      for (const body of this.bodies.values()) {
        body.x = body.initial.x;
        body.y = body.initial.y;
        body.vx = 0;
        body.vy = 0;
        body.compression = 0;
        body.compressionVelocity = 0;
        body.anchored = body.initial.anchored;
        body.detached = false;
        body.detachAttempts = 0;
        body.dragging = false;
        body.pointerOffsetX = 0;
        body.pointerOffsetY = 0;
      }
    }

    step(deltaSeconds) {
      const frameDelta = clamp(finite(deltaSeconds, 1 / 60), 0, this.maxFrameDelta);
      if (!frameDelta) return;
      const substeps = Math.max(1, Math.ceil(frameDelta / this.maxSubstep));
      const dt = frameDelta / substeps;
      const bodies = Array.from(this.bodies.values());

      // Bounded substeps reduce tunnelling at high release velocities while
      // keeping work predictable on mobile hardware.
      for (let step = 0; step < substeps; step++) {
        for (const body of bodies) {
          if (!body.dragging && !body.anchored) {
            body.vy += this.gravity * dt;
            body.x += body.vx * dt;
            body.y += body.vy * dt;
            const damping = Math.pow(.985, dt * 60);
            body.vx *= damping;
            body.vy *= damping;
            if (Math.abs(body.vx) < 2) body.vx = 0;
            if (Math.abs(body.vy) < 2) body.vy = 0;
            this._contain(body, .72);
          }
          body.compressionVelocity += (-30 * body.compression - 8 * body.compressionVelocity) * dt;
          body.compression = clamp(body.compression + body.compressionVelocity * dt, 0, body.maxCompression);
        }

        for (let pass = 0; pass < this.solverIterations; pass++) {
          for (let i = 0; i < bodies.length; i++) {
            for (let j = i + 1; j < bodies.length; j++) this._resolvePair(bodies[i], bodies[j]);
          }
          for (const body of bodies) this._contain(body, .5);
        }
      }
    }

    _contain(body, restitution) {
      const maxX = Math.max(0, this.width - body.width);
      const maxY = Math.max(0, this.height - body.height);
      if (body.x < 0) {
        body.x = 0;
        if (body.vx < 0) body.vx = -body.vx * restitution;
        this._compress(body, "x", Math.abs(body.vx));
      } else if (body.x > maxX) {
        body.x = maxX;
        if (body.vx > 0) body.vx = -body.vx * restitution;
        this._compress(body, "x", Math.abs(body.vx));
      }
      if (body.y < 0) {
        body.y = 0;
        if (body.vy < 0) body.vy = -body.vy * restitution;
        this._compress(body, "y", Math.abs(body.vy));
      } else if (body.y > maxY) {
        body.y = maxY;
        if (body.vy > 0) body.vy = -body.vy * restitution;
        this._compress(body, "y", Math.abs(body.vy));
      }
    }

    _compress(body, axis, speed) {
      body.compressionAxis = axis;
      const amount = clamp(speed / 1800, 0, 1) * body.maxCompression;
      body.compression = Math.max(body.compression, amount);
      body.compressionVelocity = Math.max(body.compressionVelocity, amount * 5);
    }

    _resolvePair(a, b) {
      if (!a.collisionEnabled || !b.collisionEnabled) return;
      const dx = (b.x + b.width / 2) - (a.x + a.width / 2);
      const dy = (b.y + b.height / 2) - (a.y + a.height / 2);
      const overlapX = (a.width + b.width) / 2 - Math.abs(dx);
      const overlapY = (a.height + b.height) / 2 - Math.abs(dy);
      if (overlapX <= 0 || overlapY <= 0) return;

      let nx = 0, ny = 0, penetration;
      if (overlapX < overlapY) {
        nx = dx < 0 ? -1 : 1;
        penetration = overlapX;
      } else {
        ny = dy < 0 ? -1 : 1;
        penetration = overlapY;
      }

      const inverseA = a.anchored ? 0 : 1 / a.mass;
      const inverseB = b.anchored ? 0 : 1 / b.mass;
      const inverseTotal = inverseA + inverseB;
      if (!inverseTotal) return;

      const correction = Math.max(penetration - .05, 0) * this.positionCorrection / inverseTotal;
      if (inverseA) { a.x -= nx * correction * inverseA; a.y -= ny * correction * inverseA; }
      if (inverseB) { b.x += nx * correction * inverseB; b.y += ny * correction * inverseB; }

      const relativeX = b.vx - a.vx;
      const relativeY = b.vy - a.vy;
      const normalSpeed = relativeX * nx + relativeY * ny;
      let impulse = 0;
      if (normalSpeed < 0) {
        impulse = -(1 + Math.min(a.elasticity, b.elasticity)) * normalSpeed / inverseTotal;
        const impulseX = impulse * nx, impulseY = impulse * ny;
        if (inverseA) { a.vx -= impulseX * inverseA; a.vy -= impulseY * inverseA; }
        if (inverseB) { b.vx += impulseX * inverseB; b.vy += impulseY * inverseB; }

        const tangentX0 = relativeX - normalSpeed * nx;
        const tangentY0 = relativeY - normalSpeed * ny;
        const tangentLength = Math.hypot(tangentX0, tangentY0);
        if (tangentLength > .0001) {
          const tangentX = tangentX0 / tangentLength;
          const tangentY = tangentY0 / tangentLength;
          const limit = impulse * Math.sqrt(a.friction * b.friction);
          const tangentImpulse = clamp(
            -(relativeX * tangentX + relativeY * tangentY) / inverseTotal,
            -limit,
            limit
          );
          if (inverseA) { a.vx -= tangentImpulse * tangentX * inverseA; a.vy -= tangentImpulse * tangentY * inverseA; }
          if (inverseB) { b.vx += tangentImpulse * tangentX * inverseB; b.vy += tangentImpulse * tangentY * inverseB; }
        }
      }

      const impact = Math.max(Math.abs(normalSpeed), penetration * 9);
      this._compress(a, nx ? "x" : "y", impact);
      this._compress(b, nx ? "x" : "y", impact);
    }
  }

  const api = { MatterWorld, createBody, clamp };
  root.VEYROST_MATTER = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
