# VEYROST — verified engineering status

**Audit date:** 2026-11-12  
**Branch:** fix/aura-pause-layout-and-spatial-loop  
**Audit source:** node scripts/project-status.mjs  
**CI:** source syntax, regression tests and source-evidence audit are required before merge.

## Current source-evidence result

The checklist uses binary source evidence. It does not measure visual quality, user experience, production readiness, or real-device reliability.

| Area | Implemented | Total | Result |
|---|---:|---:|---:|
| Website foundation and project inventory | 11 | 11 | 100.00% |
| Matter Engine 2D | 9 | 9 | 100.00% |
| AURA hand controller | 13 | 13 | 100.00% |
| Main-site AURA integration | 8 | 8 | 100.00% |
| 3D spatial engine source | 9 | 9 | 100.00% |
| Depth-axis collision physics | 6 | 6 | 100.00% |
| Interactive depth controls | 7 | 7 | 100.00% |
| Spatial layout persistence | 4 | 4 | 100.00% |
| Protected control lifecycle | 9 | 9 | 100.00% |
| Technician service sequence | 4 | 8 | 50.00% |
| Interaction and repair | 6 | 6 | 100.00% |
| Dialogue and spatial audio | 0 | 5 | 0.00% |
| Engineering agent system | 0 | 3 | 0.00% |
| Validation and release | 4 | 6 | 66.67% |
| **Total** | **90** | **104** | **86.54%** |

- Implemented source criteria: **90 / 104**
- Pending criteria: **14 / 104**
- Failed source criteria: **0**
- Any later source edit must be validated again before merge.

## What now matches the requested direction

### Corporate website and repository directory

- The website is a multi-page engineering portfolio, not a single-page landing page.
- Routes include Overview, Projects, Workspace, Company, Research and Contact.
- The inventory contains **19 public repositories and one private project record**.
- The private record has no public source URL and does not expose code or implementation details.
- Projects can be searched and filtered by engineering domain.
- The Workspace has seven movable category modules. Project cards and workspace cards use the same opt-in layout editor.
- AURA provides the cursor; MOVE ITEMS is a separate, explicit action.
- Layout positions are stored locally in the current browser. Cloud sync is not configured.

### Matter Engine and AURA

- The 2D Matter Engine core and protected-control lifecycle have source evidence and regression coverage.
- AURA requests camera access only after the user activates it; the shared site controller provides a conventional arrow cursor and hand gestures.
- Layout editing is opt-in and the project directory/category cards are movable with mouse, touch and hand pinch.
- Browser-storage failures are handled without aborting language/settings initialization.

## Phase 3 — protected component integrity

- Protected component IDs are validated, trimmed and canonicalized; duplicate registry keys are rejected.
- Lifecycle snapshots are immutable, and failed repair operations can return safely to the detached state.
- The two-stage release now verifies that the lifecycle and Matter physics agree before allowing detachment. A mismatch restores the protected mount rather than leaving inconsistent state.
- Repair requires both planar and depth bodies and completes only after the planar mount is restored.
- Four additional source-evidence checks cover these integrity guarantees.

## Phase 4 — service crew 3D

- Added a procedural 3D service vehicle with cab, windows, wheels and an amber warning beacon.
- Added two articulated technicians with helmets, safety vests, tool belts and differentiated uniforms.
- Added a roof-mounted metal ladder with rails and rungs, unfolding and folding animation.
- Added a bounded service sequence: vehicle arrival, parking, ladder deployment, technician climb and ready state.
- Added a guarded departure transition; the ladder folds and the technicians return to ground level before the vehicle exits.
- Crew animation updates only while the spatial simulation is active and is cleaned up with the scene.

The models are procedural low-poly geometry, not scanned or photorealistic rigged characters. Tug-of-war, maintenance lock, cable reconnection and post-repair UI restoration remain pending for later work.

## Phase 5 — interaction and repair

- Added a guarded repair transaction with bounded stages: maintenance lock, technician tug-of-war, panel alignment, cable reconnection, verification and mount restoration.
- The maintenance lock prevents mouse, touch and AURA input from moving the protected panel while technicians handle it.
- Both technicians animate their arm poses during the tugging and cable-connection work.
- A live 3D cable is drawn between the fixed mount and the detached panel; its connector travels to the panel and changes state after verification.
- The detached panel remains under the planar and depth physics lifecycle; the sequence secures it, simulates bounded tug forces, and restores both physics bodies and the protected-control state only after verification.
- Multiple detached protected controls are repaired sequentially. The service crew folds the ladder and departs after the final mount is restored.
- Pause freezes the sequence; layout reset cancels it; scene disposal releases its visual resources.

## Critical integration boundary

The 3D source modules are mounted on a dedicated experimental route: `spatial.html` via `spatial-page.mjs`. The Workspace page links to this route, and the normal corporate pages remain unchanged. AURA pinch, hand movement, cancellation, hand-loss and pause/resume are connected to the spatial controller. The floating 3D scene and depth HUD are available only after explicitly opening this experimental route. One explicit integration acceptance item remains pending.

The current physics scope is hybrid **2.5D**: Matter owns X/Y movement and a separate depth solver handles Z separation. This is not a full 6-DoF rigid-body engine.

## What remains

### VEYROST Service Crew — 4/8

- Photorealistic scanned or fully rigged technician assets (current characters are procedural low-poly models).
- Tug-of-war with a held detached interface component.
- Technician-controlled maintenance lock.
- Hand-animated cable reconnection and repair.
- Full repair sequence and interface restoration.

### Dialogue and spatial audio — 0/5

- Localized character voice lines (EN/RU/TJ).
- Emotion and dialogue state machine.
- Positional character audio.
- Synchronized mechanical sound effects.
- Mute, permission and accessibility controls.

### Engineering agent system — 0/3

- Repository planning and task orchestration runtime.
- Automated repository audit and issue-triage agents.
- Guarded implementation, review, test and release agents.

The current repository contains GitHub Actions for syntax and regression checks, but **it does not contain the autonomous multi-agent engineering system described in the original request**.

### Validation — 4/6

- Android physical-device camera and gesture acceptance remains pending. The new route has source-level regression coverage, not device certification.
- Cross-browser, lighting and sustained-performance validation remains pending.

## Reproduce the audit

From the repository root, with Node.js 22:

```sh
node --check aura-engine.mjs
node --check spatial-math.mjs
node --check spatial-world.mjs
node --test tests/*.test.cjs tests/*.test.mjs
node scripts/project-status.mjs
```

A CI pass proves these automated checks passed. It does not prove the camera works reliably on every phone or that the 3D scene is integrated into a public route.