# VEYROST AURA — hand-control prototype

AURA is a browser-local hand-input layer for the VEYROST spatial interface.

## Gesture contract

| Hand pose | Action |
|---|---|
| Index finger extended | Move the on-screen cursor |
| Thumb + index pinch | Activate the clickable element below the cursor |
| Index + middle fingers extended | Scroll the page |
| Open palm | Cancel / back event |
| Closed fist | Emergency pause; open palm resumes |

## Privacy and runtime

- Camera permission is requested only after the user presses **Start AURA**.
- The camera feed is attached to a hidden video element; no camera preview or hand skeleton is rendered.
- Video frames are passed to MediaPipe Tasks Vision in the browser. MediaPipe documents on-device processing of input data and says those inputs are not sent to Google servers; its SDK may send usage/performance metrics.
- The vision package, WASM runtime and hand model are fetched from their configured CDN/model endpoints.
- No application code uploads, records or stores camera frames.
- Stop, page hide and page unload release the camera tracks and dispose of the landmarker.
- GPU initialization is attempted first, with CPU fallback.

## Requirements and limitations

- HTTPS (GitHub Pages satisfies this) or localhost.
- A modern browser with camera permission, WebAssembly and WebGL/GPU support where available.
- This is an input prototype, not the final full-site AURA layer. It still needs physical-device tuning, calibration controls, long-session performance checks and integration across the website.
- Hand pose thresholds are heuristic and may need tuning across camera angles, lighting and hand sizes.

## Run checks

`node --check aura-engine.mjs`

`node --test tests/*.test.cjs`
