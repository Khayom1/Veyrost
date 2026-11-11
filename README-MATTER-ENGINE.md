# VEYROST MATTER ENGINE — development prototype

This repository contains a browser-native 2D interaction-physics core and experimental 3D spatial-engine modules.

## Included in the current source

- Dependency-free 2D physics core for UI objects.
- Mass, elasticity, friction and bounded compression properties.
- AABB collision resolution with separation and impulse response.
- Viewport containment so an object cannot cross workspace walls.
- Protected-component state machine: first detach attempt resists; the second releases the component.
- Repair/reset API that restores a protected component to its original mount.
- Experimental Three.js perspective scene and independent depth-axis collision module.
- Regression tests for physics, spatial math, depth physics and protected controls.

## Website integration status

The corporate VEYROST website now uses a shared AURA controller for a conventional hand cursor and opt-in movement of project/category cards. The 2D Matter lab remains a separate interactive test page. The experimental 3D spatial scene is **not yet mounted on a public website route**, so the 3D panels and protected 3D repair flow are not live features of the corporate website.

## Not complete yet

- 3D spatial scene route and end-to-end AURA integration.
- Realistic rigged technicians, service vehicle, ladder and cable-reconnection sequence.
- Tug-of-war, technician-controlled repair state and maintenance lockdown.
- Localized dialogue, character voice and spatial audio.
- Android physical-device and cross-browser acceptance tests.

Do not infer completion from the presence of an engine module or a source-level test.

## Run checks

```sh
node --check matter-engine.js
node --check spatial-math.mjs
node --check spatial-world.mjs
node --test tests/*.test.cjs tests/*.test.mjs
node scripts/project-status.mjs
```
