export const REPAIR_PHASES = Object.freeze({
  IDLE: "idle",
  LOCKING: "locking",
  TUG_OF_WAR: "tug-of-war",
  ALIGNING: "aligning",
  CONNECTING: "connecting",
  VERIFYING: "verifying",
  RESTORING: "restoring",
  COMPLETE: "complete",
  FAILED: "failed"
});

const DURATIONS = Object.freeze({
  [REPAIR_PHASES.LOCKING]: 0.75,
  [REPAIR_PHASES.TUG_OF_WAR]: 2.4,
  [REPAIR_PHASES.ALIGNING]: 1.15,
  [REPAIR_PHASES.CONNECTING]: 2.1,
  [REPAIR_PHASES.VERIFYING]: 1.0,
  [REPAIR_PHASES.RESTORING]: 1.25
});

const NEXT = Object.freeze({
  [REPAIR_PHASES.LOCKING]: REPAIR_PHASES.TUG_OF_WAR,
  [REPAIR_PHASES.TUG_OF_WAR]: REPAIR_PHASES.ALIGNING,
  [REPAIR_PHASES.ALIGNING]: REPAIR_PHASES.CONNECTING,
  [REPAIR_PHASES.CONNECTING]: REPAIR_PHASES.VERIFYING,
  [REPAIR_PHASES.VERIFYING]: REPAIR_PHASES.RESTORING,
  [REPAIR_PHASES.RESTORING]: REPAIR_PHASES.COMPLETE
});

export class RepairInteractionSequence {
  constructor() {
    this.phase = REPAIR_PHASES.IDLE;
    this.elapsed = 0;
    this.revision = 0;
    this.targetId = null;
  }

  begin(targetId) {
    if (this.phase !== REPAIR_PHASES.IDLE && this.phase !== REPAIR_PHASES.COMPLETE &&
        this.phase !== REPAIR_PHASES.FAILED) return false;
    if (targetId === null || targetId === undefined || String(targetId).trim() === "") return false;
    this.targetId = String(targetId).trim();
    this.phase = REPAIR_PHASES.LOCKING;
    this.elapsed = 0;
    this.revision += 1;
    return true;
  }

  fail() {
    if (this.phase === REPAIR_PHASES.IDLE || this.phase === REPAIR_PHASES.COMPLETE ||
        this.phase === REPAIR_PHASES.FAILED) return false;
    this.phase = REPAIR_PHASES.FAILED;
    this.elapsed = 0;
    this.revision += 1;
    return true;
  }

  reset() {
    this.phase = REPAIR_PHASES.IDLE;
    this.elapsed = 0;
    this.targetId = null;
    this.revision += 1;
    return this.snapshot();
  }

  update(deltaSeconds) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0 ||
        this.phase === REPAIR_PHASES.IDLE || this.phase === REPAIR_PHASES.COMPLETE ||
        this.phase === REPAIR_PHASES.FAILED) return this.snapshot();

    let remaining = Math.min(deltaSeconds, 0.25);
    let transitions = 0;
    while (remaining > 0 && transitions < 8) {
      const duration = DURATIONS[this.phase];
      if (!duration) break;
      const consumed = Math.min(remaining, duration - this.elapsed);
      this.elapsed += consumed;
      remaining -= consumed;
      if (this.elapsed + 1e-9 >= duration) {
        this.phase = NEXT[this.phase];
        this.elapsed = 0;
        this.revision += 1;
        transitions += 1;
      }
    }
    return this.snapshot();
  }

  snapshot() {
    const duration = DURATIONS[this.phase] ?? 0;
    return Object.freeze({
      phase: this.phase,
      targetId: this.targetId,
      elapsed: this.elapsed,
      duration,
      progress: duration > 0 ? Math.max(0, Math.min(1, this.elapsed / duration)) : 1,
      revision: this.revision,
      locked: ![REPAIR_PHASES.IDLE, REPAIR_PHASES.COMPLETE, REPAIR_PHASES.FAILED].includes(this.phase)
    });
  }
}
