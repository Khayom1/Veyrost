/**
 * VEYROST AURA — browser-local hand input controller.
 * Camera frames stay in the browser and are processed by MediaPipe Tasks Vision.
 */
export const AURA_CONFIG = Object.freeze({
  visionModuleUrl: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/vision_bundle.mjs",
  wasmRoot: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm",
  modelUrl: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
  // Pinch is measured against hand length, not raw camera pixels.
  pinchEngageRatio: 0.28,
  pinchReleaseRatio: 0.42,
  pinchThreshold: 0.055,
  pinchStableFrames: 2,
  maxInferenceHz: 25,
  smoothing: 0.5,
  fastSmoothing: 0.72,
  scrollGain: 2.2
});

export function distance2d(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  return Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.y ?? 0) - (b.y ?? 0));
}

export function classifyHand(landmarks, pinchThreshold = AURA_CONFIG.pinchThreshold, previousGesture = "none") {
  if (!Array.isArray(landmarks) || landmarks.length < 21) return "none";

  // Normalize thumb/index distance by wrist-to-middle-knuckle length so
  // the gesture remains usable when the hand moves closer to the camera.
  const palmLength = distance2d(landmarks[0], landmarks[9]);
  const pinchDistance = distance2d(landmarks[4], landmarks[8]);
  const pinchRatio = palmLength > 0.08 ? pinchDistance / palmLength : pinchDistance;
  const engage = palmLength > 0.08 ? AURA_CONFIG.pinchEngageRatio : pinchThreshold;
  const release = palmLength > 0.08 ? AURA_CONFIG.pinchReleaseRatio : pinchThreshold * 1.45;

  if (previousGesture === "pinch" ? pinchRatio <= release : pinchRatio <= engage) {
    return "pinch";
  }

  const extended = [8, 12, 16, 20].map((tip, index) => {
    const pip = [6, 10, 14, 18][index];
    return Number(landmarks[tip]?.y) < Number(landmarks[pip]?.y) - 0.015;
  });
  const count = extended.filter(Boolean).length;

  if (count === 4) return "open_palm";
  if (count === 0) return "fist";
  if (extended[0] && extended[1] && !extended[2] && !extended[3]) return "scroll";
  if (extended[0]) return "move";
  return "none";
}
export function mapHandToViewport(point, width, height) {
  const x = Math.min(1, Math.max(0, Number(point?.x) || 0));
  const y = Math.min(1, Math.max(0, Number(point?.y) || 0));
  return {
    x: (1 - x) * Math.max(0, width),
    y: y * Math.max(0, height)
  };
}

export class AuraController {
  constructor(options = {}) {
    this.video = options.video;
    this.cursor = options.cursor;
    this.window = options.windowRef ?? globalThis.window;
    this.document = options.documentRef ?? globalThis.document;
    this.navigator = options.navigatorRef ?? globalThis.navigator;
    this.onStatus = options.onStatus ?? (() => {});
    this.onGesture = options.onGesture ?? (() => {});
    this.onCursorMove = options.onCursorMove ?? (() => {});
    this.visionModuleUrl = options.visionModuleUrl ?? AURA_CONFIG.visionModuleUrl;
    this.wasmRoot = options.wasmRoot ?? AURA_CONFIG.wasmRoot;
    this.modelUrl = options.modelUrl ?? AURA_CONFIG.modelUrl;
    this.active = false;
    this.paused = false;
    this.stream = null;
    this.landmarker = null;
    this.rafId = null;
    this.lastVideoTime = -1;
    this.lastInferenceAt = 0;
    this.lastGesture = "none";
    this.gestureCandidate = "none";
    this.gestureCandidateFrames = 0;
    this.lastPosition = null;
    this.smoothedPosition = null;
    this._loop = this._loop.bind(this);
    this._onVisibilityChange = () => {
      if (this.document?.hidden && this.active) {
        void this.stop({ message: "Camera stopped because the page became hidden." });
      }
    };
    this._onPageHide = () => {
      void this.stop({ message: "Camera released." });
    };
  }

  _status(state, message = "") {
    try { this.onStatus(state, message); } catch (_) {}
  }

  _gesture(name, extra = {}) {
    try { this.onGesture(name, extra); } catch (_) {}
    if (this.document && typeof CustomEvent !== "undefined") {
      this.document.dispatchEvent(new CustomEvent("veyrost:aura-gesture", {
        detail: { gesture: name, ...extra }
      }));
    }
  }

  async _createLandmarker() {
    const { FilesetResolver, HandLandmarker } = await import(this.visionModuleUrl);
    const vision = await FilesetResolver.forVisionTasks(this.wasmRoot);
    let lastError;
    for (const delegate of ["GPU", "CPU"]) {
      try {
        return await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: this.modelUrl, delegate },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.62,
          minHandPresenceConfidence: 0.58,
          minTrackingConfidence: 0.58
        });
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError ?? new Error("Hand tracking could not be initialized.");
  }

  async start() {
    if (this.active) return true;
    if (!this.video || !this.cursor) throw new Error("AURA requires a video source and a cursor element.");
    const host = this.window?.location?.hostname;
    const localHost = host === "localhost" || host === "127.0.0.1";
    if (this.window?.isSecureContext === false && !localHost) {
      throw new Error("Camera access requires HTTPS or localhost.");
    }
    const getUserMedia = this.navigator?.mediaDevices?.getUserMedia;
    if (typeof getUserMedia !== "function") {
      throw new Error("This browser does not provide camera access.");
    }

    this._status("starting", "Requesting camera permission…");
    try {
      this.stream = await getUserMedia.call(this.navigator.mediaDevices, {
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 25, max: 30 }
        }
      });
      this.video.muted = true;
      this.video.playsInline = true;
      this.video.srcObject = this.stream;
      await this.video.play();
      this._status("loading", "Loading on-device hand tracking…");
      this.landmarker = await this._createLandmarker();

      this.active = true;
      this.paused = false;
      this.lastVideoTime = -1;
      this.lastInferenceAt = 0;
      this.lastGesture = "none";
      this.gestureCandidate = "none";
      this.gestureCandidateFrames = 0;
      this.lastPosition = null;
      this.smoothedPosition = null;
      this.cursor.style.visibility = "hidden";
      this.document?.addEventListener("visibilitychange", this._onVisibilityChange);
      this.window?.addEventListener("pagehide", this._onPageHide);
      this._status("active", "AURA is active. Camera frames are processed on this device.");
      this.rafId = this.window.requestAnimationFrame(this._loop);
      return true;
    } catch (error) {
      await this.stop({ notify: false });
      this._status("error", error?.message || "AURA could not start.");
      throw error;
    }
  }

  _loop(timestamp) {
    if (!this.active) return;
    try {
      const ready = this.video.readyState >= 2;
      const interval = 1000 / AURA_CONFIG.maxInferenceHz;
      if (ready && this.video.currentTime !== this.lastVideoTime && timestamp - this.lastInferenceAt >= interval) {
        this.lastVideoTime = this.video.currentTime;
        this.lastInferenceAt = timestamp;
        const result = this.landmarker.detectForVideo(this.video, timestamp);
        this._consume(result);
      }
      this.rafId = this.window.requestAnimationFrame(this._loop);
    } catch (error) {
      void this.stop({ notify: false });
      this._status("error", error?.message || "Hand tracking stopped unexpectedly.");
    }
  }

  _consume(result) {
    const landmarks = result?.landmarks?.[0];
    if (!landmarks || landmarks.length < 21) {
      if (this.lastGesture === "pinch") {
        this._gesture("pinch-cancel", this.lastPosition || {});
      }
      if (this.lastPosition) this._gesture("hand-lost");
      if (this.cursor) this.cursor.style.visibility = "hidden";
      this.lastGesture = "none";
      this.lastPosition = null;
      this.smoothedPosition = null;
      return;
    }

    const viewport = mapHandToViewport(
      landmarks[8],
      this.window.innerWidth,
      this.window.innerHeight
    );
    if (!this.smoothedPosition) {
      this.smoothedPosition = viewport;
    } else {
      const movement = Math.hypot(viewport.x - this.smoothedPosition.x, viewport.y - this.smoothedPosition.y);
      const alpha = movement > 35 ? AURA_CONFIG.fastSmoothing : AURA_CONFIG.smoothing;
      this.smoothedPosition = {
        x: this.smoothedPosition.x + (viewport.x - this.smoothedPosition.x) * alpha,
        y: this.smoothedPosition.y + (viewport.y - this.smoothedPosition.y) * alpha
      };
    }
    const point = this.smoothedPosition;
    this.cursor.style.left = point.x + "px";
    this.cursor.style.top = point.y + "px";
    this.cursor.style.visibility = "visible";
    try { this.onCursorMove({ ...point }); } catch (_) {}

    const rawGesture = classifyHand(landmarks, AURA_CONFIG.pinchThreshold, this.lastGesture);
    let gesture = rawGesture;
    if (rawGesture === "pinch" && this.lastGesture !== "pinch") {
      if (this.gestureCandidate === rawGesture) this.gestureCandidateFrames += 1;
      else {
        this.gestureCandidate = rawGesture;
        this.gestureCandidateFrames = 1;
      }
      if (this.gestureCandidateFrames < AURA_CONFIG.pinchStableFrames) {
        gesture = this.lastGesture;
      } else {
        this.gestureCandidate = "none";
        this.gestureCandidateFrames = 0;
      }
    } else {
      this.gestureCandidate = "none";
      this.gestureCandidateFrames = 0;
    }
    if (gesture === "pinch" && this.lastGesture !== "pinch") {
      this._gesture("pinch-start", { x: point.x, y: point.y });
    } else if (gesture !== "pinch" && this.lastGesture === "pinch") {
      const eventName = gesture === "open_palm" || gesture === "fist" ? "pinch-cancel" : "pinch-end";
      this._gesture(eventName, { x: point.x, y: point.y });
    }
    if (gesture !== this.lastGesture) this._gesture(gesture, { x: point.x, y: point.y });

    if (gesture === "fist") {
      if (!this.paused) {
        this.paused = true;
        this._gesture("emergency-pause");
      }
      this.lastPosition = point;
      this.lastGesture = gesture;
      return;
    }

    if (this.paused) {
      if (gesture === "open_palm") {
        this.paused = false;
        this._gesture("resume");
      } else {
        this.lastPosition = point;
        this.lastGesture = gesture;
        return;
      }
    }

    if (gesture === "open_palm" && this.lastGesture !== "open_palm") {
      this._gesture("cancel");
    } else if (gesture === "pinch" && this.lastGesture !== "pinch") {
      this._activateAt(point.x, point.y);
    } else if (gesture === "scroll" && this.lastGesture === "scroll" && this.lastPosition) {
      const deltaY = point.y - this.lastPosition.y;
      if (Math.abs(deltaY) > 0.7) this.window.scrollBy(0, -deltaY * AURA_CONFIG.scrollGain);
    }

    this.lastPosition = point;
    this.lastGesture = gesture;
  }

  _activateAt(x, y) {
    const element = this.document?.elementFromPoint(x, y);
    const target = element?.closest?.('button,a,[role="button"],input[type="button"],input[type="checkbox"],summary');
    if (!target || target.hasAttribute("disabled") || target.getAttribute("aria-disabled") === "true") return;
    if (target.closest?.("[data-veyrost-layout-item]") && this.document?.documentElement?.classList?.contains("veyrost-layout-editing")) return;
    if (target.closest("[data-aura-ignore]")) return;
    target.click();
  }

  async stop(options = {}) {
    const { notify = true, message = "Camera is off. Camera tracks released." } = options;
    this.active = false;
    if (this.rafId !== null && this.window?.cancelAnimationFrame) {
      this.window.cancelAnimationFrame(this.rafId);
    }
    this.rafId = null;
    this.document?.removeEventListener("visibilitychange", this._onVisibilityChange);
    this.window?.removeEventListener("pagehide", this._onPageHide);

    try { this.landmarker?.close?.(); } catch (_) {}
    this.landmarker = null;

    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        try { track.stop(); } catch (_) {}
      }
    }
    this.stream = null;
    if (this.video) {
      try { this.video.pause(); } catch (_) {}
      this.video.srcObject = null;
    }
    if (this.cursor) this.cursor.style.visibility = "hidden";
    this.paused = false;
    this.lastGesture = "none";
    this.gestureCandidate = "none";
    this.gestureCandidateFrames = 0;
    this.lastPosition = null;
    this.smoothedPosition = null;
    if (notify) this._status("off", message);
  }
}
