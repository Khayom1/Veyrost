import { AuraController } from "./aura-engine.mjs";
import { SpatialWorldController } from "./spatial-world.mjs";

const mount = document.querySelector("#spatial-world");
const status = document.querySelector("#spatial-status");
const auraButton = document.querySelector("#aura-toggle");
const video = document.querySelector("#aura-camera");
const cursor = document.querySelector("#aura-pointer");
const resetButton = document.querySelector("#reset-layout");
let world;
let aura;

function setStatus(message) {
  if (status) status.textContent = String(message || "READY").toUpperCase();
}

function navigate(target) {
  const routes = {
    home: "index.html",
    projects: "projects.html",
    "ai-systems": "research.html",
    matter: "matter-lab.html",
    founder: "company.html",
    contact: "contact.html"
  };
  const route = routes[target];
  if (route) window.location.assign(route);
}

try {
  world = new SpatialWorldController({
    mount,
    language: document.documentElement.lang || "en",
    onNavigate: navigate,
    onStatus: state => setStatus(state === "ready" ? "3D SPATIAL MODE ACTIVE" : state)
  }).start();
} catch (error) {
  setStatus(error?.message || "SPATIAL ENGINE FAILED TO START");
  auraButton.disabled = true;
}

if (world && video && cursor && auraButton) {
  aura = new AuraController({
    video,
    cursor,
    onStatus: (state, message) => {
      const active = state === "active" || state === "paused";
      auraButton.setAttribute("aria-pressed", String(active));
      auraButton.textContent = active ? "AURA ON" : "AURA OFF";
      auraButton.disabled = state === "starting" || state === "loading";
      world.setPaused(state === "paused");
      if (message) setStatus(message);
      else if (state === "off") setStatus("3D SPATIAL MODE ACTIVE");
    },
    onGesture: (name, detail = {}) => {
      if (name === "pinch-start" && Number.isFinite(detail.x) && Number.isFinite(detail.y)) {
        world.beginHandPress(detail.x, detail.y);
      }
      if (name === "pinch-end" && Number.isFinite(detail.x) && Number.isFinite(detail.y)) {
        world.endHandPress(detail.x, detail.y);
      }
      if (["pinch-cancel", "cancel", "hand-lost"].includes(name)) world.onHandLost();
      if (name === "emergency-pause") world.setPaused(true);
      if (name === "resume") world.setPaused(false);
    },
    onCursorMove: ({ x, y }) => world.onHandMove(x, y)
  });

  auraButton.addEventListener("click", async () => {
    if (aura.active) {
      await aura.stop();
      world.onHandLost();
      return;
    }
    try {
      await aura.start();
    } catch (error) {
      setStatus(error?.message || "AURA COULD NOT START");
    }
  });
}

resetButton?.addEventListener("click", () => {
  world?.resetLayout();
  setStatus("SPATIAL LAYOUT RESET");
});

window.addEventListener("pagehide", () => {
  world?.destroy();
  void aura?.stop({ notify: false });
}, { once: true });
