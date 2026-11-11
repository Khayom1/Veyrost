# VEYROST — verified technical status

**Audit date:** 2026-11-11  
**Audit source:** `node scripts/project-status.mjs`  
**Audit implementation:** source-evidence checks run in GitHub Actions

## Current result

| Area | Implemented checks | Total checks | Result |
|---|---:|---:|---:|
| Website foundation | 8 | 8 | 100.00% |
| Matter Engine 2D | 9 | 9 | 100.00% |
| AURA hand controller | 13 | 13 | 100.00% |
| Main-site AURA integration | 7 | 7 | 100.00% |
| 3D spatial environment | 0 | 6 | 0.00% |
| Technician service sequence | 0 | 8 | 0.00% |
| Dialogue and spatial audio | 0 | 5 | 0.00% |
| Validation and release | 4 | 6 | 66.67% |
| **Total** | **41** | **62** | **66.13%** |

- Implemented: **41 / 62**
- Pending: **21 / 62**
- Evidence mismatches: **0**
- Combined automated regression tests: **20 passed, 0 failed**.
- Engine syntax, AURA lab module syntax and main-site AURA module syntax: **passed**.

## What this percentage means

The overall result is a binary checklist ratio:

`implemented criteria / all declared criteria × 100`

Every checklist item has equal weight. The score measures the presence of specified source-level implementation evidence. It is **not** a measure of engineering hours, visual fidelity, production quality, or how difficult each feature is.

The AURA engine and main-page integration checks confirm that the corresponding code paths exist and pass automated syntax/regression checks. They do **not** certify camera behavior on every phone. The following are still pending:
- Android physical-device camera permission and hand-gesture test.
- Cross-browser, lighting and sustained-performance validation.

## Remaining major milestones

1. Build the 3D spatial world and depth-aware interface.
2. Bring Matter Engine interaction into the actual 3D interface.
3. Build rigged service technicians, vehicle, tug interaction, ladder and cable-repair sequence.
4. Add localized character dialogue, emotion states and spatial audio.
5. Complete physical-device and browser performance validation.

## Reproduce the audit

Run from the repository root:

```sh
node scripts/project-status.mjs
node --test tests/*.test.cjs
```

The CI job runs both commands on pushes to feature branches and pull requests targeting `main`.
