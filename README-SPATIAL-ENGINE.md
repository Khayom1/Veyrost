# VEYROST Spatial Interface

## Current implementation

This branch contains the experimental spatial interface integrated with the existing AURA hand controller and Matter Engine.

### Runtime architecture

- `index.html` owns AURA permission, lifecycle, language switching, and the spatial-mode mount.
- `aura-engine.mjs` requests camera access only after a user action, classifies hand landmarks, and emits cursor/gesture events.
- `spatial-world.mjs` owns the Three.js perspective scene, depth-layered panel meshes, raycasting, pointer/hand interaction, animation loop, and GPU cleanup.
- `spatial-math.mjs` contains deterministic screen/world transforms, responsive panel layout, and versioned layout validation.
- `matter-engine.js` supplies 2D rigid-body-like panel motion and collision resolution. It is not a 3D physics solver.

## Layout persistence

The spatial layout is stored in browser `localStorage` under `veyrost:spatial-layout:v1`.

- Only normalized panel positions are persisted.
- The payload is versioned (`version: 1`).
- Unknown panel IDs, duplicates, malformed coordinates, and unsupported versions are rejected.
- Layout is restored within current viewport bounds.
- Resizing scales panel positions relative to the previous viewport before applying new bounds.
- Reset clears the saved layout and restores the default arrangement.
- Storage failures are non-fatal; private browsing or storage restrictions fall back to the default layout.

## Interaction model

- Mouse and touch use Pointer Events.
- AURA hand cursor movement and pinch are forwarded to the same spatial interaction methods.
- Losing the tracked hand cancels a held interaction.
- Emergency pause stops spatial interaction until resumed.
- Selecting a panel without moving opens its destination; dragging moves the panel.

## Protected controls and mount repair

Two navigation panels (`HOME` and `AI SYSTEMS`) are mounted as protected controls. The first pull is resisted; the second pull releases the mount. The detached control can then be moved, while a fixed amber socket remains at its original mount position. A repair action appears only while at least one protected control is detached. Repair returns the control to its original coordinates, re-anchors its Matter body, hides the socket, and removes the repair action when all protected controls are restored. The lifecycle is isolated in `protected-control.mjs` and covered by deterministic Node tests. The repair is currently a direct user-triggered restoration; technician characters, cable animation, vehicle/ladder sequence, and audio are not part of this implementation.

## Honest scope boundary

The current scene is a 3D-rendered perspective scene with independent depth layers, beveled physical panel meshes, animated tilt and a responsive perspective camera. Panel movement and collision still use a 2D Matter physics world; the interface is therefore depth-rendered but not a full 3D rigid-body simulation. It does **not** yet provide:

- Full 3D rigid-body simulation, depth-aware collision, or unrestricted depth manipulation.
- Realistic rigged technician characters.
- Service vehicle, ladder, climb, cable reconnection, or tug-of-war animation.
- Localized character dialogue or spatial audio.
- Certification on physical Android devices, different browsers, lighting conditions, or sustained sessions.

These are separate acceptance requirements and must not be counted as implemented because a placeholder or source file exists.

## Validation

Run the project checks locally with Node.js 22:

```sh
node --check aura-engine.mjs
node --check spatial-math.mjs
node --check spatial-world.mjs
node --test tests/*.test.cjs
node scripts/project-status.mjs
```

GitHub Actions is supplementary. A blocked or quota-limited Actions run does not replace local validation and must not be interpreted as a code failure.

## Mobile acceptance checklist

Before production release, test on an actual Android phone:

1. Open the site over HTTPS.
2. Start AURA and grant camera permission.
3. Confirm no camera preview or landmark skeleton is visible.
4. Move the hand cursor and drag each spatial panel.
5. Pinch-release and confirm click/navigation behavior.
6. Lose the hand from camera view while dragging; confirm the panel is released safely.
7. Turn AURA off; confirm camera tracks stop and the WebGL canvas is removed.
8. Move panels, reload the page, and confirm positions persist.
9. Rotate the device and resize the viewport; confirm panels remain visible and keep their relative positions.
10. Reset layout, reload, and confirm the default arrangement returns.
11. Repeat in low light and after several minutes of continuous use; record frame drops, heat, and camera tracking loss.

Do not claim device readiness until these checks have been performed and recorded.
