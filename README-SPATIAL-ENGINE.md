# VEYROST Spatial Interface

## Current implementation

This branch contains the experimental spatial interface integrated with the existing AURA hand controller and Matter Engine.

### Runtime architecture

- `index.html` owns AURA permission, lifecycle, language switching, and the spatial-mode mount.
- `aura-engine.mjs` requests camera access only after a user action, classifies hand landmarks, and emits cursor/gesture events.
- `spatial-world.mjs` owns the Three.js perspective scene, depth-layered panel meshes, raycasting, pointer/hand interaction, animation loop, and GPU cleanup.
- `spatial-math.mjs` contains deterministic screen/world transforms, responsive panel layout, and versioned layout validation.
- `matter-engine.js` supplies 2D rigid-body-like panel motion and collision resolution. It is not a 3D physics solver.
- `spatial-depth-physics.mjs` adds a depth-axis collision layer: projected X/Y overlap checks, mass-weighted Z separation, restitution impulses, and anchored-body handling. Matter remains responsible for X/Y motion; the combined runtime is hybrid 2.5D, not a full 6-DoF rigid-body engine.

## Layout persistence

The spatial layout is stored in browser `localStorage` under `veyrost:spatial-layout:v1`.

- Normalized X/Y positions and the panel's bounded Z position are persisted.
- The payload remains versioned (`version: 1`); Z is an optional field so layouts saved by older builds remain valid.
- Unknown panel IDs, duplicates, malformed coordinates, and unsupported versions are rejected.
- Layout is restored within current viewport bounds; valid Z values are restored within `-1.25` to `1.25`.
- Resizing scales panel positions relative to the previous viewport before applying new bounds.
- Reset clears the saved layout and restores the default arrangement.
- Storage failures are non-fatal; private browsing or storage restrictions fall back to the default layout.

## Interaction model

- Mouse and touch use Pointer Events.
- AURA hand cursor movement and pinch are forwarded to the same spatial interaction methods.
- Losing the tracked hand cancels a held interaction.
- Emergency pause stops spatial interaction until resumed.
- Selecting a panel without moving opens its destination; dragging moves the panel.
- Selecting a movable panel also opens a depth HUD. Its range control and step buttons adjust the panel on the Z axis; mouse-wheel input adjusts the hovered/selected panel, and Shift+wheel uses finer steps.
- The depth HUD is localized in English, Russian and Tajik. Its step buttons are compatible with AURA pinch activation; touch users can use the range control and buttons. The selected depth is saved in the existing `version: 1` payload; older records without `z` remain valid.

## Protected controls and mount repair

Two navigation panels (`HOME` and `AI SYSTEMS`) are mounted as protected controls. The first pull is resisted; the second pull releases the mount. The detached control can then be moved, while a fixed amber socket remains at its original mount position. A repair action appears only while at least one protected control is detached. Repair returns the control to its original X/Y coordinates and initial Z layer, re-anchors both physics representations, hides the socket, and removes the repair action when all protected controls are restored. The lifecycle is isolated in `protected-control.mjs` and covered by deterministic Node tests. The repair is currently a direct user-triggered restoration; technician characters, cable animation, vehicle/ladder sequence, and audio are not part of this implementation.

## Honest scope boundary

The current scene is a 3D-rendered perspective scene with independent depth layers, beveled physical panel meshes, animated tilt and a responsive perspective camera. Matter handles X/Y panel motion; the dedicated depth solver resolves Z-axis collisions when panel projections overlap. This is a hybrid 2.5D simulation, not a full 3D rigid-body engine with angular momentum or unrestricted 3-axis motion. It does **not** yet provide:

- Full 6-DoF rigid-body simulation and angular momentum. Z editing is currently clamped to a safe range rather than unrestricted.
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
