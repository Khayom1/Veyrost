# VEYROST 3D model assets

The browser consumes the three GLB 2.0 assets through the gzip transport files in this directory. They are decompressed with the browser `DecompressionStream("gzip")` API and then parsed by Three.js GLTFLoader.

| Runtime model | Stored file | Structure |
|---|---|---|
| `service-vehicle.glb` | `service-vehicle.glb.gz` | Separate body meshes; left/right hinge pivots and door panels |
| `robot-technician.glb` | `robot-technician.glb.gz` | Skinned humanoid; 50 joints; articulated fingers; Idle, Walk, Repair, Board clips |
| `robot-assistant.glb` | `robot-assistant.glb.gz` | Independent skinned humanoid; 50 joints; articulated fingers; Idle, Walk, Repair, Board clips |

## Rig naming contract

Both humanoid skeletons expose `root`, `hips`, `spine`, `chest`, `neck`, `head`, left/right `clavicle`, `upper_arm`, `forearm`, `hand`, `thigh`, `shin`, and `foot` bones. Each hand has three joints per finger: `thumb`, `index`, `middle`, `ring`, and `pinky`, with `_l_1..3` / `_r_1..3` suffixes.

The vehicle exposes `door_left_pivot` and `door_right_pivot`; the door panels are children of their respective pivots.

## Scope and quality note

These are deterministic procedural starter assets, not bespoke Blender sculpts or final photorealistic production models. Their purpose is to replace the old geometric proxies with actual GLB meshes, weighted skeletons, animation clips, and named mechanical pivots. Material detailing, calibrated full-body motion capture, finger pose animation, collision-aware IK, and final cinematic art direction remain separate refinement work.

The source-level runtime contract and structural acceptance tests are in `3d/src/scene.js` and `tests/veyrost-3d-assets.test.mjs`.
