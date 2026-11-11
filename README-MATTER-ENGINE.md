# VEYROST MATTER ENGINE — development prototype

This branch introduces the first browser-native foundation for VEYROST's spatial interface.

## Included in this milestone
- Dependency-free 2D physics core for UI objects.
- Mass, elasticity, friction and bounded compression properties.
- AABB collision resolution with separation and impulse response.
- Viewport containment so an object cannot cross workspace walls.
- Protected-component state machine: first detach attempt resists; the second releases the component.
- Repair/reset API that restores a protected component to its original mount.
- Regression tests in tests/matter-engine.test.cjs.

## Not complete yet
The realistic 3D technicians, service vehicle, ladder and cable-reconnection sequence, character rigging, multilingual speech, spatial audio, camera-based AURA tracking and full-site integration are later milestones. This prototype does not claim those features are finished.

## Run checks
node --test tests/matter-engine.test.cjs
node --check matter-engine.js
