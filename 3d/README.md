# VEYROST 3D Service Simulation — Parallel Track

This scene is an isolated prototype. The existing production repair animation remains untouched until the 3D track passes visual, performance and interaction acceptance tests.

## Selected direction
- Visual target: cinematic presentation, mobile-adaptive rendering.
- Asset strategy: hybrid. Load authored GLB assets when present; procedural stand-ins keep the scene inspectable during asset production.
- Integration: parallel route at `3d/`; no replacement of the existing SVG/CSS repair sequence yet.

## Runtime architecture
- Three.js WebGL renderer, physically based materials, ACES tone mapping, shadow-map quality tiers.
- GLTFLoader asset boundary for Blender-authored vehicle and humanoid rigs.
- Scene orchestration as a deterministic finite-state sequence.
- Skinned GLB rigs are bound through `AnimationMixer`; clips are selected by semantic names (`idle`, `walk`, `repair`, `board`). The procedural proxy remains as a fallback when assets are absent.
- Current procedural IK is a planar two-bone approximation. It is not yet a calibrated full-3D skeletal IK solver; physical wire insertion and collision constraints remain pending.
- Reduced-motion and low-power device profiles.

## Asset contract
Place optimized glTF 2.0 files in `3d/assets/`:
- `service-vehicle.glb`
- `robot-technician.glb`
- `robot-assistant.glb`

Expected robot nodes/animations should be documented alongside each delivered model. Recommended Blender export: apply transforms, meters, -Z forward, Y up, embedded PBR textures, animation clips for idle/walk/door-entry/repair. Rigged characters need named hand, wrist, elbow, shoulder, hip, knee and ankle bones. Vehicle needs separate left/right door pivot nodes.

## Run
Open `3d/index.html` through a static web server. The page imports Three.js modules from jsDelivr, so an internet connection is required. On Android, use a local HTTP server rather than opening the file URL directly.

## Acceptance gates before integration
1. Both doors rotate around correct hinge pivots and robots enter their own side.
2. Walk cycles use rigged skeletons and foot-ground alignment; no sliding.
3. The MENU object is detached, held by two hands, then reinstalled.
4. Each wire is individually gripped, routed, inserted into a socket and locked.
5. Scene can complete and reset deterministically.
6. Test on target Android hardware; maintain adaptive quality and graceful WebGL failure.
