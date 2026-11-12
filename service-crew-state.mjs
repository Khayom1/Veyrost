export const SERVICE_CREW_PHASES = Object.freeze({
  ARRIVING: "arriving",
  PARKING: "parking",
  DEPLOYING: "deploying",
  CLIMBING: "climbing",
  READY: "ready",
  FOLDING: "folding",
  DEPARTING: "departing",
  COMPLETE: "complete"
});

const PHASE_DURATIONS = Object.freeze({
  [SERVICE_CREW_PHASES.ARRIVING]: 3.2,
  [SERVICE_CREW_PHASES.PARKING]: 0.65,
  [SERVICE_CREW_PHASES.DEPLOYING]: 1.8,
  [SERVICE_CREW_PHASES.CLIMBING]: 2.8,
  [SERVICE_CREW_PHASES.FOLDING]: 1.55,
  [SERVICE_CREW_PHASES.DEPARTING]: 3.1
});

const NEXT_PHASE = Object.freeze({
  [SERVICE_CREW_PHASES.ARRIVING]: SERVICE_CREW_PHASES.PARKING,
  [SERVICE_CREW_PHASES.PARKING]: SERVICE_CREW_PHASES.DEPLOYING,
  [SERVICE_CREW_PHASES.DEPLOYING]: SERVICE_CREW_PHASES.CLIMBING,
  [SERVICE_CREW_PHASES.CLIMBING]: SERVICE_CREW_PHASES.READY,
  [SERVICE_CREW_PHASES.FOLDING]: SERVICE_CREW_PHASES.DEPARTING,
  [SERVICE_CREW_PHASES.DEPARTING]: SERVICE_CREW_PHASES.COMPLETE
});

export class ServiceCrewSequence {
  constructor() {
    this.phase = SERVICE_CREW_PHASES.ARRIVING;
    this.elapsed = 0;
    this.revision = 0;
  }

  depart() {
    if (this.phase !== SERVICE_CREW_PHASES.READY) return false;
    this.phase = SERVICE_CREW_PHASES.FOLDING;
    this.elapsed = 0;
    this.revision += 1;
    return true;
  }

  update(deltaSeconds) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0 ||
        this.phase === SERVICE_CREW_PHASES.READY ||
        this.phase === SERVICE_CREW_PHASES.COMPLETE) return this.snapshot();

    let remaining = Math.min(deltaSeconds, 0.25);
    let transitions = 0;
    while (remaining > 0 && transitions < 8) {
      const duration = PHASE_DURATIONS[this.phase];
      if (!duration) break;
      const available = duration - this.elapsed;
      const consumed = Math.min(remaining, available);
      this.elapsed += consumed;
      remaining -= consumed;
      if (this.elapsed + 1e-9 >= duration) {
        this.phase = NEXT_PHASE[this.phase];
        this.elapsed = 0;
        this.revision += 1;
        transitions += 1;
      }
    }
    return this.snapshot();
  }

  recall() {
    if (this.phase !== SERVICE_CREW_PHASES.COMPLETE) return false;
    this.phase = SERVICE_CREW_PHASES.ARRIVING;
    this.elapsed = 0;
    this.revision += 1;
    return true;
  }

  snapshot() {
    const duration = PHASE_DURATIONS[this.phase] ?? 0;
    return Object.freeze({
      phase: this.phase,
      elapsed: this.elapsed,
      duration,
      progress: duration > 0 ? Math.max(0, Math.min(1, this.elapsed / duration)) : 1,
      revision: this.revision
    });
  }
}
