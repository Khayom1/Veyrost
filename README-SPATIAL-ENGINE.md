# VEYROST Spatial Interface — experimental engine

## Current website status

The corporate website is now a multi-page engineering portfolio:

- `index.html` — overview and engineering domains
- `projects.html` — 19 public repositories plus one restricted private-project record
- `studio.html` — seven movable workspace categories and local preferences
- `company.html`, `research.html`, and `contact.html` — supporting company pages

AURA is integrated through `assets/veyrost-site.js`. It provides a conventional hand-controlled cursor and an opt-in layout editor for workspace categories and project cards.

**Important integration boundary:** `spatial-world.mjs`, `spatial-math.mjs`, and `spatial-depth-physics.mjs` remain experimental engine modules. The current multi-page website does not mount `SpatialWorldController` from a public route. Therefore the 3D floating-panel scene, depth HUD, and protected 3D repair flow must not be described as live website features. The source modules and source-level tests exist, but end-to-end website integration is still pending.

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

## Still required before public integration

1. Add a deliberate 3D workspace route or an explicitly enabled mode inside `studio.html`.
2. Connect AURA pinch, drag, cancel, hand-loss and pause states to the spatial controller.
3. Add responsive controls and a clear exit path without replacing the corporate site unexpectedly.
4. Run the full regression suite and verify camera/gesture interaction on Android and desktop browsers.
5. Only then mark the spatial scene as a live feature.

## Still not implemented from the Service Crew concept

- Rigged realistic technicians.
- Service-vehicle arrival/departure and physical ladder handling.
- Tug-of-war with a held detached component.
- Technician-controlled maintenance lock and repair sequence.
- Cable reconnection animation.
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
