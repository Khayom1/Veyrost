# VEYROST — verified technical status

**Audit date:** 2026-11-11  
**Branch:** `feat/spatial-persistence-hardening`  
**Audit source:** `node scripts/project-status.mjs`  
**Validation:** GitHub Actions run `43058327625` — all steps passed, including regression tests and the source-evidence calculator.

## Current source-evidence result

| Area | Implemented checks | Total checks | Result |
|---|---:|---:|---:|
| Website foundation | 8 | 8 | 100.00% |
| Matter Engine 2D | 9 | 9 | 100.00% |
| AURA hand controller | 13 | 13 | 100.00% |
| Main-site AURA integration | 7 | 7 | 100.00% |
| Spatial rendered interface (2.5D scope) | 6 | 6 | 100.00% |
| Spatial layout persistence | 4 | 4 | 100.00% |
| Technician service sequence | 0 | 8 | 0.00% |
| Dialogue and spatial audio | 0 | 5 | 0.00% |
| Validation and release | 4 | 6 | 66.67% |
| **Total** | **51** | **66** | **77.27%** |

- Implemented source criteria: **51 / 66**
- Pending source criteria: **15 / 66**
- Failed evidence checks: **0**
- The latest successful run passed syntax checks, the combined regression suite, and the source-evidence calculator.

## Scope and limitations

The score is a binary checklist ratio:

`implemented source criteria / all declared criteria × 100`

Every criterion has equal weight. It measures whether the defined source-level evidence exists. It is not a score for visual quality, production readiness, engineering effort, or physical-device reliability.

The spatial interface is a Three.js-rendered, mostly planar **2.5D** scene with an orthographic camera. Panel movement and collisions are backed by the existing **2D** Matter Engine. The checklist's 6/6 means the six declared source-level criteria for this limited renderer scope are present; it does not mean a complete 3D physics environment exists.

Layout persistence is now implemented:
- Versioned localStorage payload.
- Normalized panel positions.
- Validation of saved versions, panel IDs, duplicates and numeric coordinates.
- Responsive position scaling on viewport changes.
- Reset clears saved data and restores the default layout.
- Storage errors fall back without crashing the scene.

## Still not implemented

- Rigged, realistic service technicians.
- Service vehicle arrival/departure and physical ladder handling.
- Tug-of-war with a held detached interface control.
- Technician-controlled interface lock and repair sequence.
- Cable reconnection animation.
- Localized character dialogue and emotion state machine.
- Spatial character audio and synchronized mechanical sound.
- Physical Android device camera/gesture testing.
- Cross-browser, lighting and sustained-performance validation.

## Reproduce the audit

From the repository root:

```sh
node --check aura-engine.mjs
node --check spatial-math.mjs
node --check spatial-world.mjs
node --test tests/*.test.cjs
node scripts/project-status.mjs
```

GitHub Actions is supplementary. If Actions is blocked by plan limits, use the commands above in a local Node.js environment; a blocked runner is not proof of a source-code defect.
