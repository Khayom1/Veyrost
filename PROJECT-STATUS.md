# VEYROST — verified technical status

**Audit date:** 2026-11-11  
**Branch:** `feat/spatial-persistence-hardening`  
**Audit source:** `node scripts/project-status.mjs`  
**Validation:** GitHub Actions was not used for this continuation, per instruction. The source-evidence patterns for the five new protected-control criteria were checked against the committed files. No full regression run was performed after these changes. The five depth-physics source-evidence patterns were checked directly; the Node test cases were added but not executed in this environment.

## Current source-evidence result

| Area | Implemented checks | Total checks | Result |
|---|---:|---:|---:|
| Website foundation | 8 | 8 | 100.00% |
| Matter Engine 2D | 9 | 9 | 100.00% |
| AURA hand controller | 13 | 13 | 100.00% |
| Main-site AURA integration | 7 | 7 | 100.00% |
| Spatial rendered interface (perspective depth-rendered scope) | 8 | 8 | 100.00% |
| Depth-axis collision physics (hybrid 2.5D) | 5 | 5 | 100.00% |
| Spatial layout persistence | 4 | 4 | 100.00% |
| Protected control lifecycle | 5 | 5 | 100.00% |
| Technician service sequence | 0 | 8 | 0.00% |
| Dialogue and spatial audio | 0 | 5 | 0.00% |
| Validation and release | 4 | 6 | 66.67% |
| **Total** | **63** | **78** | **80.77%** |

- Implemented source criteria: **63 / 78**
- Pending source criteria: **15 / 78**
- New protected-control evidence mismatches: **0 / 5** (direct source-pattern verification; not a runtime test)
- The last full CI pass (`43058327625`) predates the perspective-depth, protected-control, and depth-physics changes; it is not validation of the latest branch head.

## Scope and limitations

The score is a binary checklist ratio:

`implemented source criteria / all declared criteria × 100`

Every criterion has equal weight. It measures whether the defined source-level evidence exists. It is not a score for visual quality, production readiness, engineering effort, or physical-device reliability.

The protected-control lifecycle is implemented for HOME and AI SYSTEMS: first-pull resistance, second-pull release, fixed mount socket, localized repair action, and restoration to original coordinates. This is a functional interface repair flow, not the planned technician animation.

The spatial interface now uses a Three.js **perspective camera** and six independently layered panel depths, with per-panel tilt and floating motion. Matter handles panel movement and collision in X/Y; the new depth solver adds Z-axis collision resolution for panels whose X/Y projections overlap. The combined system is hybrid **2.5D**, not a full 6-DoF rigid-body engine.

Depth-axis collision is now integrated: projected X/Y overlap checks, mass-weighted positional correction, restitution impulses, anchored-body handling, and synchronization with Matter panel positions. This has not yet been confirmed by a full runtime regression or on a physical phone.

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
