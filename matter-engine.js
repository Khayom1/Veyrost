(function (root) {
  "use strict";
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const finite = (v, fallback) => Number.isFinite(v) ? v : fallback;

  function createBody(o) {
    o = o || {};
    return {
      id: String(o.id), x: finite(o.x, 0), y: finite(o.y, 0),
      width: Math.max(12, finite(o.width, 120)), height: Math.max(12, finite(o.height, 52)),
      vx: 0, vy: 0, mass: Math.max(.1, finite(o.mass, 1)),
      elasticity: clamp(finite(o.elasticity, .42), 0, 1),
      friction: clamp(finite(o.friction, .22), 0, 1),
      maxCompression: clamp(finite(o.maxCompression, .16), 0, .35),
      compression: 0, compressionAxis: "y", compressionVelocity: 0,
      material: o.material || "hybrid", collisionEnabled: o.collisionEnabled !== false, anchored: Boolean(o.anchored),
      detached: Boolean(o.detached), detachAttempts: 0, dragging: false,
      pointerOffsetX: 0, pointerOffsetY: 0,
      initial: { x: finite(o.x, 0), y: finite(o.y, 0), anchored: Boolean(o.anchored) }
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
    }
    setBounds(width, height) {
      this.width = Math.max(1, finite(width, this.width));
      this.height = Math.max(1, finite(height, this.height));
      for (const body of this.bodies.values()) this._contain(body, 0);
    }
    add(options) {
      const body = createBody(options);
      if (!body.id || this.bodies.has(body.id)) throw new Error("Matter bodies require unique ids.");
      this.bodies.set(body.id, body);
      this._contain(body, 0);
      return body;
    }
    get(id) { return this.bodies.get(String(id)) || null; }
    remove(id) {
      if (this.draggedId === String(id)) this.draggedId = null;
      return this.bodies.delete(String(id));
    }
    beginDrag(id, pointerX, pointerY) {
      const body = this.get(id);
      if (!body || body.anchored) return false;
      this.draggedId = body.id;
      body.dragging = true;
      body.pointerOffsetX = body.x - finite(pointerX, body.x);
      body.pointerOffsetY = body.y - finite(pointerY, body.y);
      body.vx = 0; body.vy = 0;
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
      if (!body) return false;
      body.dragging = false;
      body.vx = clamp(finite(vx, 0), -1800, 1800);
      body.vy = clamp(finite(vy, 0), -1800, 1800);
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
      body.vx = 0; body.vy = 0;
      return { detached: true, reason: "released", attempts: body.detachAttempts };
    }
    repair(id) {
      const body = this.get(id);
      if (!body) return false;
      body.anchored = true; body.detached = false; body.detachAttempts = 0;
      body.dragging = false; body.vx = 0; body.vy = 0; body.compression = 0;
      body.x = body.initial.x; body.y = body.initial.y;
      return true;
    }
    reset() {
      this.draggedId = null;
      for (const b of this.bodies.values()) {
        b.x = b.initial.x; b.y = b.initial.y; b.vx = 0; b.vy = 0;
        b.compression = 0; b.compressionVelocity = 0;
        b.anchored = b.initial.anchored; b.detached = false;
        b.detachAttempts = 0; b.dragging = false;
      }
    }
    step(deltaSeconds) {
      const dt = clamp(finite(deltaSeconds, 1/60), 0, 1/30);
      if (!dt) return;
      const bodies = Array.from(this.bodies.values());
      for (const b of bodies) {
        if (!b.dragging && !b.anchored) {
          b.vy += this.gravity * dt;
          b.x += b.vx * dt; b.y += b.vy * dt;
          const damping = Math.pow(.985, dt * 60);
          b.vx *= damping; b.vy *= damping;
          if (Math.abs(b.vx) < 2) b.vx = 0;
          if (Math.abs(b.vy) < 2) b.vy = 0;
          this._contain(b, .72);
        }
        b.compressionVelocity += (-30 * b.compression - 8 * b.compressionVelocity) * dt;
        b.compression = clamp(b.compression + b.compressionVelocity * dt, 0, b.maxCompression);
      }
      for (let pass = 0; pass < 8; pass++) {
        for (let i = 0; i < bodies.length; i++)
          for (let j = i + 1; j < bodies.length; j++) this._resolvePair(bodies[i], bodies[j]);
        for (const b of bodies) this._contain(b, .5);
      }
    }
    _contain(b, restitution) {
      const maxX = Math.max(0, this.width - b.width), maxY = Math.max(0, this.height - b.height);
      if (b.x < 0) { b.x = 0; if (b.vx < 0) b.vx = -b.vx * restitution; this._compress(b, "x", Math.abs(b.vx)); }
      else if (b.x > maxX) { b.x = maxX; if (b.vx > 0) b.vx = -b.vx * restitution; this._compress(b, "x", Math.abs(b.vx)); }
      if (b.y < 0) { b.y = 0; if (b.vy < 0) b.vy = -b.vy * restitution; this._compress(b, "y", Math.abs(b.vy)); }
      else if (b.y > maxY) { b.y = maxY; if (b.vy > 0) b.vy = -b.vy * restitution; this._compress(b, "y", Math.abs(b.vy)); }
    }
    _compress(b, axis, speed) {
      b.compressionAxis = axis;
      const amount = clamp(speed / 1800, 0, 1) * b.maxCompression;
      b.compression = Math.max(b.compression, amount);
      b.compressionVelocity = Math.max(b.compressionVelocity, amount * 5);
    }
    _resolvePair(a, b) {
      if (!a.collisionEnabled || !b.collisionEnabled) return;
      const dx = (b.x + b.width/2) - (a.x + a.width/2);
      const dy = (b.y + b.height/2) - (a.y + a.height/2);
      const ox = (a.width + b.width)/2 - Math.abs(dx);
      const oy = (a.height + b.height)/2 - Math.abs(dy);
      if (ox <= 0 || oy <= 0) return;
      let nx = 0, ny = 0, penetration;
      if (ox < oy) { nx = dx < 0 ? -1 : 1; penetration = ox; }
      else { ny = dy < 0 ? -1 : 1; penetration = oy; }
      const ia = a.anchored ? 0 : 1/a.mass, ib = b.anchored ? 0 : 1/b.mass, total = ia + ib;
      if (!total) return;
      const correction = Math.max(penetration - .05, 0) * this.positionCorrection / total;
      if (ia) { a.x -= nx * correction * ia; a.y -= ny * correction * ia; }
      if (ib) { b.x += nx * correction * ib; b.y += ny * correction * ib; }
      const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
      const normalSpeed = rvx * nx + rvy * ny;
      let impulse = 0;
      if (normalSpeed < 0) {
        impulse = -(1 + Math.min(a.elasticity, b.elasticity)) * normalSpeed / total;
        const ix = impulse * nx, iy = impulse * ny;
        if (ia) { a.vx -= ix * ia; a.vy -= iy * ia; }
        if (ib) { b.vx += ix * ib; b.vy += iy * ib; }
        const tx0 = rvx - normalSpeed * nx, ty0 = rvy - normalSpeed * ny;
        const tl = Math.hypot(tx0, ty0);
        if (tl > .0001) {
          const tx = tx0/tl, ty = ty0/tl;
          const limit = impulse * Math.sqrt(a.friction * b.friction);
          const jt = clamp(-(rvx*tx + rvy*ty)/total, -limit, limit);
          if (ia) { a.vx -= jt*tx*ia; a.vy -= jt*ty*ia; }
          if (ib) { b.vx += jt*tx*ib; b.vy += jt*ty*ib; }
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
