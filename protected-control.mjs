export const PROTECTED_CONTROL_STATES = Object.freeze({
  MOUNTED: "mounted",
  RESISTING: "resisting",
  DETACHED: "detached",
  REPAIRING: "repairing"
});

export class ProtectedControlState {
  constructor(id) {
    this.id = String(id);
    this.state = PROTECTED_CONTROL_STATES.MOUNTED;
    this.pullCount = 0;
    this.revision = 0;
  }

  pull() {
    if (this.state === PROTECTED_CONTROL_STATES.REPAIRING) {
      return { accepted: false, state: this.state, reason: "repair-in-progress" };
    }
    if (this.state === PROTECTED_CONTROL_STATES.DETACHED) {
      return { accepted: true, state: this.state, reason: "already-detached" };
    }
    this.pullCount += 1;
    if (this.pullCount === 1) {
      this.state = PROTECTED_CONTROL_STATES.RESISTING;
      this.revision += 1;
      return { accepted: false, state: this.state, reason: "first-pull-resisted" };
    }
    this.state = PROTECTED_CONTROL_STATES.DETACHED;
    this.revision += 1;
    return { accepted: true, state: this.state, reason: "mount-released" };
  }

  beginRepair() {
    if (this.state !== PROTECTED_CONTROL_STATES.DETACHED) return false;
    this.state = PROTECTED_CONTROL_STATES.REPAIRING;
    this.revision += 1;
    return true;
  }

  completeRepair() {
    if (this.state !== PROTECTED_CONTROL_STATES.REPAIRING) return false;
    this.state = PROTECTED_CONTROL_STATES.MOUNTED;
    this.pullCount = 0;
    this.revision += 1;
    return true;
  }

  reset() {
    this.state = PROTECTED_CONTROL_STATES.MOUNTED;
    this.pullCount = 0;
    this.revision += 1;
    return this.snapshot();
  }

  snapshot() {
    return Object.freeze({
      id: this.id,
      state: this.state,
      pullCount: this.pullCount,
      revision: this.revision
    });
  }
}

export function createProtectedControlRegistry(ids = []) {
  const controls = new Map();
  for (const id of ids) {
    const key = String(id);
    if (!key || controls.has(key)) throw new Error("Protected control IDs must be unique.");
    controls.set(key, new ProtectedControlState(key));
  }
  return controls;
}
