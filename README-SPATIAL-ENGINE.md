# VEYROST Spatial Interface — experimental engine

## Current website status

The corporate website is now a multi-page engineering portfolio:

- `index.html` — overview and engineering domains
- `projects.html` — 19 public repositories plus one restricted private-project record
- `studio.html` — seven movable workspace categories and local preferences
- `company.html`, `research.html`, and `contact.html` — supporting company pages

AURA is integrated through `assets/veyrost-site.js`. It provides a conventional hand-controlled cursor and an opt-in layout editor for workspace categories and project cards.

**Public experimental route:** `spatial.html` mounts `SpatialWorldController` through `spatial-page.mjs`. The Workspace page links to this route explicitly; it does not replace the normal corporate website. The route connects AURA pinch-start/end, hand movement, hand-loss cancellation, and pause/resume to the spatial controller. Camera permission is requested only after the user activates AURA. This is an experimental browser feature, not an Android-certified release.

## Experimental engine architecture

- `spatial-world.mjs` — Three.js perspective scene, panel meshes, raycasting, and render loop.
- `matter-engine.js` — 2D panel motion and collision response.
- `spatial-depth-physics.mjs` — Z-axis separation and restitution impulses for overlapping X/Y projections.
- `spatial-math.mjs` — screen/world mapping, panel layout and saved-layout validation.
- `protected-control.mjs` — protected component state machine and repair lifecycle.

The physics combination is hybrid **2.5D**: Matter owns X/Y motion and a separate solver owns Z separation. It is not a general six-degree-of-freedom rigid-body engine.

## Implemented source capabilities

- Perspective camera and responsive Three.js renderer.
- Physical-material panels, lights, depth layers and motion.
- Raycast selection methods for pointer and hand input.
- Matter-backed X/Y collisions and bounded compression.
- Z-axis overlap resolution with mass weighting and restitution.
- Depth slider, step controls, wheel adjustment and persistence.
- Versioned panel-layout validation and responsive restoration.
- Protected HOME and AI SYSTEMS lifecycle: first pull resists, second releases, repair restores the mount.

These are source-level capabilities. They do not mean the 3D engine is currently connected to the corporate website or certified on an Android device.

## Integration and remaining validation

- `spatial.html` is the dedicated, explicitly opened 3D route.
- `studio.html` links to the route; the default corporate pages remain unchanged.
- `spatial-page.mjs` connects AURA pinch, drag, cancel, hand-loss and pause/resume states.
- The route includes reset, depth controls, repair action, and an explicit exit to Workspace.
- Full regression CI and physical Android camera/gesture acceptance must still pass before calling this production-ready.

## Still not implemented from the Service Crew concept

- Photorealistic scanned or production-grade rigged technician assets (current models are procedural low-poly geometry).
- Tug-of-war with a held detached component.
- Technician-controlled maintenance lock and protected-component repair sequence.
- Hand-animated cable reconnection and post-repair interface restoration.
- Localized character dialogue and emotion state machine.
- Spatially positioned voices and synchronized mechanical sounds.

## Validation

Run on Node.js 22:

```sh
node --check spatial-math.mjs
node --check spatial-world.mjs
node --test tests/*.test.cjs tests/*.test.mjs
node scripts/project-status.mjs
```

The CI suite validates module syntax and deterministic source-level behavior. It does not replace physical-device, lighting, cross-browser or sustained-performance testing.

## Phase 1 — engine stabilization

The code-level stabilization pass covers saved-layout coordinate validation, pause-safe simulation, bounded procedural motion, viewport-resize recentering with bounds clamping, and interaction cancellation on lost pointer capture, window blur, or hidden-page transitions. Automated regression and CI checks are required before the phase is marked complete. Physical Android camera/gesture acceptance remains a separate device-level gate and must not be inferred from CI.

## Phase 2 — Matter 2.5D solver hardening

The planar Matter solver now advances in bounded substeps (up to 120 Hz) to reduce high-speed X/Y tunnelling, and its drag ownership is exclusive and cleaned up on repair/removal/reset. Empty body identifiers are rejected. The depth solver now validates tuning parameters, canonicalizes IDs, bounds velocity before integration, uses bounded substeps, resolves projected Z contacts iteratively, and reports unique contact pairs rather than counting repeated solver passes.

The 2.5D contract remains explicit: Matter resolves planar X/Y motion and this depth solver resolves Z separation only where projected X/Y bounds overlap. This is not a general 6-DoF engine. CI and regression tests validate deterministic engine behavior; they do not certify GPU performance or device-specific browser rendering.


## Phase 3 — protected component integrity

Protected controls now validate and canonicalize identifiers, reject duplicate registry keys, and expose immutable snapshots. The lifecycle supports an explicit repair rollback path. Spatial detachment is coordinated with the Matter solver: the first pull must remain anchored, and the second pull must produce a matching detached state in both systems. A mismatch triggers a safe reset instead of leaving the visual, lifecycle and physics states divergent. Repair requires both planar and depth bodies and only completes after the planar mount has been restored; failed repair transitions return to the detached state.

These checks harden the source lifecycle. They do not replace browser interaction testing or Android camera/gesture acceptance.


## Phase 4 — service crew 3D scene

The spatial route now mounts a procedural 3D maintenance vehicle and two articulated technicians with helmets, safety vests and tool gear. The vehicle enters and parks; a roof-mounted metal ladder unfolds; the lead technician climbs while the support technician remains at ground level. The sequence uses a deterministic, bounded state machine and pauses with the spatial simulation. A guarded departure action folds the ladder before the crew and vehicle leave. Tug-of-war, protected-control locking during maintenance, cable repair, dialogue and sound remain later-phase work. The character assets are procedural low-poly models, not scanned or photorealistic rigged characters.
