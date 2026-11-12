import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js";
import "./matter-engine.js";
import { DepthPhysicsWorld } from "./spatial-depth-physics.mjs";
import { createProtectedControlRegistry, PROTECTED_CONTROL_STATES } from "./protected-control.mjs";
import { ServiceCrew3D } from "./service-crew.mjs";
import { RepairInteractionSequence, REPAIR_PHASES } from "./repair-interaction.mjs";
import {
  computeSpatialLayout,
  screenToWorld,
  validateSavedLayout,
  SPATIAL_UNITS_PER_PIXEL
} from "./spatial-math.mjs";

const COPY = {
  en: {
    title: "VEYROST / SPATIAL INTERFACE",
    help: "Point to a panel. Pinch and drag to move it. Release to open.",
    reset: "RESET LAYOUT",
    exit: "AURA OFF",
    repair: "REPAIR MOUNT",
    repairing: "MAINTENANCE IN PROGRESS",
    depth: "PANEL DEPTH",
    depthHint: "Wheel or adjust to move the selected panel in depth.",
    status: "3D SPATIAL MODE ACTIVE",
    panels: {
      home: ["HOME", "Overview and direction"],
      projects: ["PROJECTS", "Builds and experiments"],
      "ai-systems": ["AI SYSTEMS", "SkillGuard and DevKit"],
      matter: ["MATTER LAB", "Physical interface editor"],
      founder: ["FOUNDER", "People behind VEYROST"],
      contact: ["CONTACT", "Connect with the lab"]
    }
  },
  ru: {
    title: "VEYROST / ПРОСТРАНСТВЕННЫЙ ИНТЕРФЕЙС",
    help: "Укажите на панель. Зажмите и переместите. Отпустите, чтобы открыть.",
    reset: "СБРОСИТЬ РАСКЛАДКУ",
    exit: "ВЫКЛЮЧИТЬ AURA",
    repair: "ВОССТАНОВИТЬ КРЕПЛЕНИЕ",
    repairing: "ИДЁТ ОБСЛУЖИВАНИЕ",
    depth: "ГЛУБИНА ПАНЕЛИ",
    depthHint: "Колесо мыши или ползунок меняют глубину выбранной панели.",
    status: "АКТИВЕН 3D-РЕЖИМ",
    panels: {
      home: ["ГЛАВНАЯ", "Обзор и направление"],
      projects: ["ПРОЕКТЫ", "Разработки и эксперименты"],
      "ai-systems": ["СИСТЕМЫ ИИ", "SkillGuard и DevKit"],
      matter: ["MATTER LAB", "Редактор физических объектов"],
      founder: ["ОСНОВАТЕЛЬ", "Команда VEYROST"],
      contact: ["КОНТАКТЫ", "Связь с лабораторией"]
    }
  },
  tj: {
    title: "VEYROST / МУҲИТИ ФАЗОӢ",
    help: "Ба панел ишора кун. Бо pinch онро ҳаракат деҳ. Барои кушодан раҳо кун.",
    reset: "БАРҚАРОРИ ЧИДАШ",
    exit: "AURA-РО ХОМӮШ КУН",
    repair: "ПАЙВАСТКУНИРО БАРҚАРОР КУН",
    repairing: "ТАЪМИР ДАВОМ ДОРАД",
    depth: "ЧУҚУРИИ ПАНЕЛ",
    depthHint: "Бо чархи муш ё лағжонак чуқурии панели интихобшударо тағйир деҳ.",
    status: "ҲОЛАТИ ФАЗОИИ 3D ФАЪОЛ АСТ",
    panels: {
      home: ["АСОСӢ", "Шарҳ ва самт"],
      projects: ["ЛОИҲАҲО", "Таҳияҳо ва таҷрибаҳо"],
      "ai-systems": ["СИСТЕМАҲОИ AI", "SkillGuard ва DevKit"],
      matter: ["MATTER LAB", "Муҳаррири объектҳои физикӣ"],
      founder: ["МУАССИС", "Одамони VEYROST"],
      contact: ["ТАМОС", "Пайвастшавӣ бо лаборатория"]
    }
  }
};

function roundedShape(width, height, radius) {
  const x = width / 2, y = height / 2, r = Math.min(radius, width / 3, height / 3);
  const shape = new THREE.Shape();
  shape.moveTo(-x + r, -y);
  shape.lineTo(x - r, -y);
  shape.quadraticCurveTo(x, -y, x, -y + r);
  shape.lineTo(x, y - r);
  shape.quadraticCurveTo(x, y, x - r, y);
  shape.lineTo(-x + r, y);
  shape.quadraticCurveTo(-x, y, -x, y - r);
  shape.lineTo(-x, -y + r);
  shape.quadraticCurveTo(-x, -y, -x + r, -y);
  return shape;
}

function makeLabelTexture(documentRef, definition, localized) {
  const canvas = documentRef.createElement("canvas");
  canvas.width = 640;
  canvas.height = 220;
  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 640, 220);
  gradient.addColorStop(0, "rgba(10,31,53,0.98)");
  gradient.addColorStop(1, "rgba(9,15,29,0.97)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(122,224,255,0.34)";
  context.lineWidth = 3;
  context.strokeRect(2, 2, 636, 216);
  context.fillStyle = "#6fe7ff";
  context.fillRect(26, 31, 7, 154);
  context.font = "700 21px system-ui, sans-serif";
  context.fillStyle = "#7edff6";
  context.fillText(definition.code, 58, 58);
  context.font = "800 43px system-ui, sans-serif";
  context.fillStyle = "#f0f8ff";
  context.fillText(localized[0], 58, 119, 540);
  context.font = "500 22px system-ui, sans-serif";
  context.fillStyle = "#9bb1c8";
  context.fillText(localized[1], 60, 166, 530);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  return texture;
}

export class SpatialWorldController {
  constructor(options = {}) {
    this.mount = options.mount;
    this.onNavigate = options.onNavigate ?? (() => {});
    this.onStatus = options.onStatus ?? (() => {});
    this.window = options.windowRef ?? globalThis.window;
    this.document = options.documentRef ?? globalThis.document;
    this.language = options.language ?? this.document?.documentElement?.lang ?? "en";
    this.running = false;
    this.destroyed = false;
    this.paused = false;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.physics = null;
    this.depthPhysics = null;
    this.clock = null;
    this.resizeObserver = null;
    this.panelGroups = new Map();
    this.panelMeshes = [];
    this.protectedIds = new Set(["home", "ai-systems"]);
    this.protectedControls = createProtectedControlRegistry(this.protectedIds);
    this.protectedSockets = new Map();
    this.repairButton = null;
    this.repairSequence = new RepairInteractionSequence();
    this.maintenanceLock = false;
    this.repairTargetId = null;
    this.repairVisual = null;
    this.repairCable = null;
    this.repairConnector = null;
    this.repairCableMaterial = null;
    this._repairStart = new THREE.Vector3();
    this._repairEnd = new THREE.Vector3();
    this.depthControl = null;
    this.depthRange = null;
    this.depthValue = null;
    this.depthMinus = null;
    this.depthPlus = null;
    this.selectedId = null;
    this.hoveredId = null;
    this.activeDrag = null;
    this.pointer = { x: 0, y: 0 };
    this.lastFrame = 0;
    this.animationTime = 0;
    this.units = SPATIAL_UNITS_PER_PIXEL;
    this.storageKey = "veyrost:spatial-layout:v1";
    this.hasCustomLayout = false;
    this.viewport = null;
    this._animate = this._animate.bind(this);
    this._resize = this._resize.bind(this);
    this._pointerMove = this._pointerMove.bind(this);
    this._pointerDown = this._pointerDown.bind(this);
    this._pointerUp = this._pointerUp.bind(this);
    this._pointerCancel = this._pointerCancel.bind(this);
    this._wheel = this._wheel.bind(this);
    this._visibilityChange = this._visibilityChange.bind(this);
    this._windowBlur = this._windowBlur.bind(this);
  }

  start() {
    if (!this.mount) throw new Error("Spatial mode requires a mount element.");
    if (this.running) return this;

    const Matter = globalThis.VEYROST_MATTER;
    if (!Matter?.MatterWorld) throw new Error("Matter Engine was not loaded.");

    const width = Math.max(1, this.window.innerWidth);
    const height = Math.max(1, this.window.innerHeight);
    this.physics = new Matter.MatterWorld(width, height, {
      gravity: 0,
      positionCorrection: 0.86
    });
    this.depthPhysics = new DepthPhysicsWorld({ restitution: 0.38, friction: 0.1, maxSpeed: 2.8 });

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: width > 680,
      powerPreference: "low-power",
      depth: true,
      stencil: false
    });
    this.renderer.setPixelRatio(Math.min(this.window.devicePixelRatio || 1, width < 680 ? 1.2 : 1.5));
    this.renderer.setSize(width, height, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setClearColor(0x030916, 1);
    this.renderer.domElement.dataset.auraIgnore = "true";
    this.renderer.domElement.setAttribute("aria-label", "Interactive VEYROST three-dimensional interface");
    this.renderer.domElement.style.touchAction = "none";
    this.mount.replaceChildren(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x030916);
    this.scene.fog = new THREE.FogExp2(0x07101c, 0.018);
    this.camera = new THREE.PerspectiveCamera(
      THREE.MathUtils.radToDeg(2 * Math.atan(height / (2 * this.units * 18))),
      width / height,
      0.1,
      100
    );
    this.camera.position.set(0, 0, 18);
    this.camera.lookAt(0, 0, 0);

    this._buildEnvironment();
    this._buildPanels();
    this.serviceCrew = new ServiceCrew3D(THREE, this.scene, { onState: name => this._emitStatus(name) });
    this._buildRepairVisual();
    this._buildProtectedRepairControl();
    this._buildDepthControl();
    this._restoreLayout();
    this._buildCursor();
    this._bindEvents();
    this._resize();

    this.clock = new THREE.Clock();
    this.running = true;
    this.renderer.setAnimationLoop(this._animate);
    this.setLanguage(this.language);
    this._emitStatus("ready");
    return this;
  }

  _emitStatus(name) {
    try { this.onStatus(name); } catch (_) {}
  }

  _buildEnvironment() {
    this.scene.add(new THREE.AmbientLight(0x8db8d7, 0.72));

    const key = new THREE.PointLight(0x66dfff, 3.1, 24);
    key.position.set(-4, 5, 7);
    this.scene.add(key);

    const fill = new THREE.PointLight(0x8f79ff, 2.5, 22);
    fill.position.set(5, -3, 5);
    this.scene.add(fill);

    const grid = new THREE.GridHelper(80, 64, 0x214b6a, 0x14283d);
    grid.rotation.x = Math.PI / 2;
    grid.position.z = -1.5;
    if (Array.isArray(grid.material)) {
      for (const material of grid.material) {
        material.transparent = true;
        material.opacity = 0.34;
      }
    }
    this.scene.add(grid);
    this.grid = grid;

    const starCount = this.window.innerWidth < 680 ? 180 : 360;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 13;
      positions[i * 3 + 2] = -2.5 - Math.random() * 7;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0x8edfff,
      size: 0.018,
      transparent: true,
      opacity: 0.62,
      sizeAttenuation: false
    });
    this.stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.stars);

    this.core = new THREE.Group();
    const orb = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.39, 2),
      new THREE.MeshPhysicalMaterial({
        color: 0x122f4c,
        metalness: 0.6,
        roughness: 0.2,
        clearcoat: 1,
        emissive: 0x0b5980,
        emissiveIntensity: 0.9
      })
    );
    this.core.add(orb);
    const wire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.49, 1),
      new THREE.MeshBasicMaterial({
        color: 0x78e9ff,
        wireframe: true,
        transparent: true,
        opacity: 0.55
      })
    );
    this.core.add(wire);

    this.rings = [];
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.64 + i * 0.14, 0.008, 6, 120),
        new THREE.MeshBasicMaterial({
          color: i === 1 ? 0x9a8cff : 0x61e2ff,
          transparent: true,
          opacity: 0.62 - i * 0.1
        })
      );
      ring.rotation.x = i * 0.32;
      ring.rotation.y = i * 0.2;
      this.core.add(ring);
      this.rings.push(ring);
    }

    this.core.position.z = 0.2;
    this.scene.add(this.core);
  }

  _buildPanels() {
    const layout = computeSpatialLayout(this.window.innerWidth, this.window.innerHeight);
    this.layout = layout;
    for (const definition of layout.panels) {
      const group = new THREE.Group();
      const width = definition.width / this.units;
      const height = definition.height / this.units;
      const geometry = new THREE.ExtrudeGeometry(
        roundedShape(width, height, 0.12),
        {
          depth: 0.11,
          bevelEnabled: true,
          bevelSegments: 3,
          bevelSize: 0.025,
          bevelThickness: 0.025,
          curveSegments: 6
        }
      );
      geometry.center();

      const bodyMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x0c2338,
        metalness: 0.48,
        roughness: 0.24,
        clearcoat: 0.92,
        clearcoatRoughness: 0.2,
        emissive: 0x082640,
        emissiveIntensity: 0.58
      });
      const body = new THREE.Mesh(geometry, bodyMaterial);
      group.add(body);

      const faceTexture = makeLabelTexture(
        this.document,
        definition,
        COPY[this.language]?.panels[definition.id] ?? COPY.en.panels[definition.id]
      );
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(width - 0.055, height - 0.055),
        new THREE.MeshBasicMaterial({
          map: faceTexture,
          transparent: true,
          side: THREE.DoubleSide,
          toneMapped: false
        })
      );
      face.position.z = 0.085;
      group.add(face);

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({
          color: 0x72e8ff,
          transparent: true,
          opacity: 0.55
        })
      );
      group.add(edges);

      const accent = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, Math.max(0.22, height * 0.55), 0.035),
        new THREE.MeshBasicMaterial({ color: 0x7deaff })
      );
      accent.position.set(-width / 2 + 0.07, 0, 0.1);
      group.add(accent);

      const hitArea = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      );
      hitArea.position.z = 0.16;
      group.add(hitArea);

      group.userData.panelId = definition.id;
      const panelIndex = layout.panels.indexOf(definition);
      group.userData.depth = [-0.22, 0.18, -0.12, 0.24, -0.18, 0.12][panelIndex] ?? 0;
      group.rotation.set(
        panelIndex % 2 ? -0.035 : 0.035,
        panelIndex % 3 === 0 ? -0.055 : 0.055,
        panelIndex % 2 ? 0.012 : -0.012
      );
      this.scene.add(group);
      this.panelGroups.set(definition.id, { group, bodyMaterial, definition, hitArea });

      const isProtected = this.protectedIds.has(definition.id);
      if (isProtected) this._buildProtectedSocket(definition, panelIndex);

      const bodyState = this.physics.add({
        id: definition.id,
        x: definition.x,
        y: definition.y,
        width: definition.width,
        height: definition.height,
        mass: 1.35,
        elasticity: 0.56,
        friction: 0.2,
        maxCompression: 0.16,
        material: "hybrid",
        collisionEnabled: true,
        anchored: isProtected
      });
      this.depthPhysics.add({
        id: definition.id,
        x: definition.x + definition.width / 2,
        y: definition.y + definition.height / 2,
        z: group.userData.depth,
        width: definition.width,
        height: definition.height,
        depth: 0.22,
        mass: isProtected ? 2.4 : 1.2,
        anchored: isProtected
      });
      this._syncPanel(bodyState, this.panelGroups.get(definition.id));
      this.panelMeshes.push(group);
    }

    const corePoint = screenToWorld(
      layout.core.x,
      layout.core.y,
      layout.width,
      layout.height,
      this.units
    );
    this.core.position.x = corePoint.x;
    this.core.position.y = corePoint.y;
  }

  _buildProtectedSocket(definition, panelIndex) {
    const socket = new THREE.Group();
    const width = definition.width / this.units;
    const height = definition.height / this.units;
    const frame = new THREE.Mesh(
      new THREE.RingGeometry(Math.min(width, height) * 0.34, Math.min(width, height) * 0.43, 48),
      new THREE.MeshBasicMaterial({ color: 0xffb45e, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
    );
    socket.add(frame);
    const center = screenToWorld(
      definition.x + definition.width / 2,
      definition.y + definition.height / 2,
      this.window.innerWidth,
      this.window.innerHeight,
      this.units
    );
    socket.position.set(center.x, center.y, ([-0.22, 0.18, -0.12, 0.24, -0.18, 0.12][panelIndex] ?? 0) - 0.08);
    socket.visible = false;
    this.scene.add(socket);
    this.protectedSockets.set(definition.id, socket);
  }

  _buildProtectedRepairControl() {
    const button = this.document.createElement("button");
    button.type = "button";
    button.className = "spatial-repair-control";
    button.textContent = COPY[this.language]?.repair ?? COPY.en.repair;
    button.setAttribute("aria-label", "Repair detached protected interface controls");
    Object.assign(button.style, {
      position: "absolute",
      right: "max(16px, env(safe-area-inset-right))",
      bottom: "max(76px, env(safe-area-inset-bottom))",
      zIndex: "20",
      display: "none",
      padding: "13px 17px",
      border: "1px solid rgba(255,180,94,.8)",
      borderRadius: "999px",
      background: "rgba(22,25,35,.94)",
      color: "#ffd39b",
      font: "700 11px system-ui,sans-serif",
      letterSpacing: ".12em",
      boxShadow: "0 0 28px rgba(255,180,94,.18)",
      cursor: "pointer",
      touchAction: "manipulation"
    });
    button.addEventListener("click", () => this.startProtectedRepair());
    this.mount.appendChild(button);
    this.repairButton = button;
  }


  _buildDepthControl() {
    const panel = this.document.createElement("section");
    panel.className = "spatial-depth-control";
    panel.setAttribute("aria-label", "Spatial panel depth controls");
    Object.assign(panel.style, {
      position: "absolute",
      left: "max(14px, env(safe-area-inset-left))",
      bottom: "max(72px, env(safe-area-inset-bottom))",
      zIndex: "19",
      display: "none",
      width: "min(276px, calc(100vw - 28px))",
      boxSizing: "border-box",
      padding: "12px 14px",
      border: "1px solid rgba(111,231,255,.34)",
      borderRadius: "16px",
      background: "rgba(5,16,29,.92)",
      color: "#e9f8ff",
      font: "600 11px system-ui,sans-serif",
      letterSpacing: ".08em",
      boxShadow: "0 10px 32px rgba(0,0,0,.32)",
      backdropFilter: "blur(12px)",
      pointerEvents: "auto"
    });

    const heading = this.document.createElement("div");
    heading.style.display = "flex";
    heading.style.alignItems = "center";
    heading.style.justifyContent = "space-between";
    heading.style.gap = "8px";
    const title = this.document.createElement("span");
    title.textContent = COPY[this.language]?.depth ?? COPY.en.depth;
    const value = this.document.createElement("output");
    value.textContent = "0.00";
    value.setAttribute("aria-live", "polite");
    value.style.color = "#73e5ff";
    value.style.fontVariantNumeric = "tabular-nums";
    heading.append(title, value);

    const row = this.document.createElement("div");
    row.style.display = "grid";
    row.style.gridTemplateColumns = "36px minmax(0,1fr) 36px";
    row.style.alignItems = "center";
    row.style.gap = "8px";
    const makeStepButton = (label, ariaLabel) => {
      const button = this.document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.setAttribute("aria-label", ariaLabel);
      Object.assign(button.style, {
        minHeight: "36px",
        border: "1px solid rgba(111,231,255,.35)",
        borderRadius: "10px",
        background: "rgba(26,55,76,.9)",
        color: "#c7f5ff",
        font: "700 18px system-ui,sans-serif",
        touchAction: "manipulation",
        cursor: "pointer"
      });
      return button;
    };
    const minus = makeStepButton("−", "Move selected panel farther away");
    const plus = makeStepButton("+", "Move selected panel closer");
    const range = this.document.createElement("input");
    range.type = "range";
    range.min = "-1.25";
    range.max = "1.25";
    range.step = "0.01";
    range.value = "0";
    range.setAttribute("aria-label", "Selected panel depth");
    range.style.width = "100%";
    range.style.accentColor = "#69dff9";
    row.append(minus, range, plus);

    const hint = this.document.createElement("div");
    hint.textContent = COPY[this.language]?.depthHint ?? COPY.en.depthHint;
    hint.style.marginTop = "7px";
    hint.style.color = "#91a9bd";
    hint.style.font = "500 10px/1.4 system-ui,sans-serif";
    panel.append(heading, row, hint);

    const stop = event => event.stopPropagation();
    panel.addEventListener("pointerdown", stop);
    panel.addEventListener("pointerup", stop);
    panel.addEventListener("wheel", stop, { passive: true });
    range.addEventListener("input", () => {
      if (this.selectedId) this.setPanelDepth(this.selectedId, Number(range.value), false);
    });
    range.addEventListener("change", () => this.saveLayout());
    minus.addEventListener("click", () => this.adjustSelectedDepth(-0.05, true));
    plus.addEventListener("click", () => this.adjustSelectedDepth(0.05, true));

    this.mount.appendChild(panel);
    this.depthControl = panel;
    this.depthRange = range;
    this.depthValue = value;
    this.depthMinus = minus;
    this.depthPlus = plus;
    this._refreshDepthControl();
  }

  setPanelDepth(id, value, persist = false) {
    const body = this.depthPhysics?.get(id);
    if (!body || body.anchored || !Number.isFinite(Number(value))) return false;
    const next = Math.max(-1.25, Math.min(1.25, Number(value)));
    body.z = next;
    body.velocityZ = 0;
    const panel = this.panelGroups.get(id);
    if (panel) panel.group.userData.depth = next;
    if (this.selectedId === id || this.hoveredId === id) this._refreshDepthControl();
    if (persist) this.saveLayout();
    return true;
  }

  adjustSelectedDepth(delta, persist = false) {
    const id = this.selectedId ?? this.hoveredId;
    const body = id ? this.depthPhysics?.get(id) : null;
    if (!body) return false;
    return this.setPanelDepth(id, body.z + delta, persist);
  }

  _refreshDepthControl() {
    if (!this.depthControl) return;
    const id = this.selectedId ?? this.hoveredId;
    const body = id ? this.depthPhysics?.get(id) : null;
    const available = Boolean(body && !body.anchored);
    this.depthControl.style.display = available ? "block" : "none";
    this.depthControl.style.bottom = this.repairButton?.style.display === "block"
      ? "max(132px, env(safe-area-inset-bottom))"
      : "max(72px, env(safe-area-inset-bottom))";
    if (!body) return;
    if (this.depthRange) {
      this.depthRange.value = String(body.z);
      this.depthRange.disabled = !available;
    }
    if (this.depthValue) this.depthValue.textContent = body.z.toFixed(2);
    if (this.depthMinus) this.depthMinus.disabled = !available;
    if (this.depthPlus) this.depthPlus.disabled = !available;
  }

  repairDetachedControls() {
    let repaired = 0;
    for (const [id, control] of this.protectedControls) {
      const body = this.physics?.get(id);
      const depthBody = this.depthPhysics?.get(id);
      if (!body || !depthBody || !control.beginRepair()) continue;
      body.vx = 0;
      body.vy = 0;
      body.dragging = false;
      const planarRestored = this.physics.repair(id);
      if (!planarRestored) {
        control.cancelRepair();
        continue;
      }
      depthBody.anchored = true;
      depthBody.z = depthBody.initialZ;
      depthBody.velocityZ = 0;
      const depthPanel = this.panelGroups.get(id);
      if (depthPanel) depthPanel.group.userData.depth = depthBody.z;
      if (!control.completeRepair()) {
        control.cancelRepair();
        continue;
      }
      const socket = this.protectedSockets.get(id);
      if (socket) socket.visible = false;
      const panel = this.panelGroups.get(id);
      if (panel) {
        panel.group.visible = true;
        panel.group.scale.set(1, 1, 1);
      }
      repaired += 1;
    }
    if (this.repairButton && !this._hasDetachedProtectedControl()) {
      this.repairButton.style.display = "none";
    }
    if (repaired) {
      this.selectedId = null;
      this._refreshDepthControl();
      this.saveLayout();
    }
    return repaired;
  }

  _hasDetachedProtectedControl() {
    for (const control of this.protectedControls.values()) {
      if (control.snapshot().state === PROTECTED_CONTROL_STATES.DETACHED) return true;
    }
    return false;
  }

  _buildCursor() {
    // A familiar desktop-style arrow: white face, dark outline, no halo or reticle.
    // The group origin is the arrow tip, so the tracked fingertip maps to the click point.
    this.cursor3D = new THREE.Group();
    const arrow = new THREE.Shape();
    arrow.moveTo(0, 0);
    arrow.lineTo(0.018, -0.205);
    arrow.lineTo(0.067, -0.151);
    arrow.lineTo(0.105, -0.226);
    arrow.lineTo(0.135, -0.211);
    arrow.lineTo(0.096, -0.137);
    arrow.lineTo(0.169, -0.127);
    arrow.closePath();

    const face = new THREE.Mesh(
      new THREE.ShapeGeometry(arrow),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false
      })
    );
    const outlinePoints = [
      new THREE.Vector3(0, 0, 0.002),
      new THREE.Vector3(0.018, -0.205, 0.002),
      new THREE.Vector3(0.067, -0.151, 0.002),
      new THREE.Vector3(0.105, -0.226, 0.002),
      new THREE.Vector3(0.135, -0.211, 0.002),
      new THREE.Vector3(0.096, -0.137, 0.002),
      new THREE.Vector3(0.169, -0.127, 0.002),
      new THREE.Vector3(0, 0, 0.002)
    ];
    const outline = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(outlinePoints),
      new THREE.LineBasicMaterial({
        color: 0x111827,
        depthTest: false,
        depthWrite: false,
        linewidth: 1
      })
    );
    this.cursor3D.add(face, outline);
    this.cursor3D.position.z = 1.4;
    this.cursor3D.renderOrder = 1000;
    this.cursor3D.visible = false;
    this.scene.add(this.cursor3D);
  }

  _bindEvents() {
    this.canvas = this.renderer.domElement;
    this.canvas.addEventListener("pointermove", this._pointerMove, { passive: true });
    this.canvas.addEventListener("pointerdown", this._pointerDown);
    this.canvas.addEventListener("pointerup", this._pointerUp);
    this.canvas.addEventListener("pointercancel", this._pointerCancel);
    this.canvas.addEventListener("lostpointercapture", this._pointerCancel);
    this.canvas.addEventListener("wheel", this._wheel, { passive: false });
    this.window.addEventListener("blur", this._windowBlur, { passive: true });
    this.document.addEventListener("visibilitychange", this._visibilityChange);
    this.canvas.addEventListener("contextmenu", event => event.preventDefault());
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(this._resize);
      this.resizeObserver.observe(this.mount);
    } else {
      this.window.addEventListener("resize", this._resize, { passive: true });
    }
  }

  _resize() {
    if (!this.renderer || !this.camera || this.destroyed) return;
    const width = Math.max(1, this.window.innerWidth);
    const height = Math.max(1, this.window.innerHeight);
    this.renderer.setPixelRatio(Math.min(this.window.devicePixelRatio || 1, width < 680 ? 1.2 : 1.5));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.fov = THREE.MathUtils.radToDeg(
      2 * Math.atan(height / (2 * this.units * this.camera.position.z))
    );
    this.camera.updateProjectionMatrix();

    const previousWidth = this.viewport?.width ?? width;
    const previousHeight = this.viewport?.height ?? height;
    const layout = computeSpatialLayout(width, height);
    this.layout = layout;
    if (this.physics) {
      // A viewport change invalidates the active pointer's screen-space origin.
      // End the drag through the physics API before moving any bodies.
      if (this.activeDrag) this.physics.endDrag(0, 0);
      this.activeDrag = null;
      this.physics.draggedId = null;

      for (const definition of layout.panels) {
        const body = this.physics.get(definition.id);
        if (!body) continue;
        const wasInitial = !this.hasCustomLayout && previousWidth === width && previousHeight === height;
        const oldWidth = Math.max(1, body.width);
        const oldHeight = Math.max(1, body.height);
        const centerX = wasInitial
          ? definition.centerX
          : ((body.x + oldWidth / 2) / Math.max(1, previousWidth)) * width;
        const centerY = wasInitial
          ? definition.centerY
          : ((body.y + oldHeight / 2) / Math.max(1, previousHeight)) * height;

        body.width = definition.width;
        body.height = definition.height;
        body.x = Math.max(0, Math.min(width - body.width, centerX - body.width / 2));
        body.y = Math.max(0, Math.min(height - body.height, centerY - body.height / 2));

        const initialCenterX = wasInitial
          ? definition.centerX
          : ((body.initial.x + oldWidth / 2) / Math.max(1, previousWidth)) * width;
        const initialCenterY = wasInitial
          ? definition.centerY
          : ((body.initial.y + oldHeight / 2) / Math.max(1, previousHeight)) * height;
        body.initial.x = Math.max(0, Math.min(width - body.width, initialCenterX - body.width / 2));
        body.initial.y = Math.max(0, Math.min(height - body.height, initialCenterY - body.height / 2));

        this._syncPanel(body, this.panelGroups.get(definition.id));
        const socket = this.protectedSockets.get(definition.id);
        if (socket) {
          const mountPoint = screenToWorld(
            body.initial.x + body.width / 2,
            body.initial.y + body.height / 2,
            width,
            height,
            this.units
          );
          socket.position.x = mountPoint.x;
          socket.position.y = mountPoint.y;
        }
      }
      this.physics.setBounds(width, height);
    }
    this.viewport = { width, height };
    if (this.core) {
      const point = screenToWorld(layout.core.x, layout.core.y, width, height, this.units);
      this.core.position.x = point.x;
      this.core.position.y = point.y;
    }
  }

  _pointerMove(event) {
    this._movePointer(event.clientX, event.clientY, "mouse");
  }

  _wheel(event) {
    if (!this.running || this.paused) return;
    const id = this.hoveredId ?? this.selectedId;
    const body = id ? this.depthPhysics?.get(id) : null;
    if (!body || body.anchored) return;
    event.preventDefault();
    const fine = event.shiftKey ? 0.01 : 0.035;
    const direction = event.deltaY > 0 ? -1 : 1;
    this.setPanelDepth(id, body.z + direction * fine, true);
  }

  _pointerDown(event) {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    this.canvas.setPointerCapture?.(event.pointerId);
    this._beginPress(event.clientX, event.clientY, "mouse");
  }

  _pointerUp(event) {
    if (this.activeDrag?.source === "mouse") this._finishPress(event.clientX, event.clientY, "mouse");
    this.canvas.releasePointerCapture?.(event.pointerId);
  }

  _pointerCancel() {
    this.cancelActiveInteraction();
  }

  _windowBlur() {
    this.cancelActiveInteraction();
    if (this.cursor3D) this.cursor3D.visible = false;
  }

  _visibilityChange() {
    if (this.document?.visibilityState === "hidden") this._windowBlur();
  }

  _pointerVector(x, y) {
    return new THREE.Vector2((x / this.window.innerWidth) * 2 - 1, -(y / this.window.innerHeight) * 2 + 1);
  }

  _raycastPanel(x, y) {
    if (!this.camera) return null;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(this._pointerVector(x, y), this.camera);
    const hits = raycaster.intersectObjects(this.panelMeshes, true);
    if (!hits.length) return null;
    let target = hits[0].object;
    while (target && !target.userData.panelId) target = target.parent;
    return target?.userData?.panelId ? target.userData.panelId : null;
  }

  _movePointer(x, y, source = "hand") {
    if (!this.running || this.paused) return;
    this.pointer.x = x;
    this.pointer.y = y;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(this._pointerVector(x, y), this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -1.4);
    const position = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, position)) {
      this.cursor3D.position.copy(position);
    }

    if (this.activeDrag?.source === source) this._updateDrag(x, y);
    else if (!this.activeDrag) this._setHover(this._raycastPanel(x, y));
  }

  _beginPress(x, y, source) {
    if (!this.running || this.paused || this.maintenanceLock || this.activeDrag) return false;
    const overlay = this.document?.elementFromPoint?.(x, y)?.closest?.(".spatial-depth-control, .spatial-repair-control");
    if (overlay) return false;
    const id = this._raycastPanel(x, y);
    if (!id) {
      this.selectedId = null;
      this._refreshDepthControl();
      return false;
    }
    const body = this.physics.get(id);
    if (!body) return false;
    if (this.protectedIds.has(id) && body.anchored) {
      const lifecycle = this.protectedControls.get(id);
      if (!lifecycle) return false;
      const result = lifecycle.pull();
      const isValidAttempt = result.reason === "first-pull-resisted" ||
        result.reason === "mount-released";
      const release = isValidAttempt
        ? this.physics.tryDetach(id)
        : { detached: false, reason: "invalid-lifecycle-transition" };
      const synchronized = result.reason === "first-pull-resisted"
        ? !release.detached && body.anchored
        : result.reason === "mount-released" && release.detached && body.detached && !body.anchored;
      if (!synchronized) {
        this.physics.repair(id);
        lifecycle.reset();
        const depthBody = this.depthPhysics?.get(id);
        if (depthBody) {
          depthBody.anchored = true;
          depthBody.z = depthBody.initialZ;
          depthBody.velocityZ = 0;
        }
        const socket = this.protectedSockets.get(id);
        if (socket) socket.visible = false;
        this._emitStatus("protected-integrity-reset");
        return false;
      }
      if (!result.accepted) {
        const panel = this.panelGroups.get(id);
        if (panel) {
          panel.group.position.x += 0.035;
          panel.group.rotation.z += 0.025;
          panel.bodyMaterial.emissiveIntensity = 1.65;
        }
        this._emitStatus("protected-resisting");
        return false;
      }
      const depthBody = this.depthPhysics?.get(id);
      if (depthBody) depthBody.anchored = false;
      const socket = this.protectedSockets.get(id);
      if (socket) socket.visible = true;
      if (this.repairButton) this.repairButton.style.display = "block";
      this._emitStatus("protected-detached");
    }
    if (!this.physics.beginDrag(id, x, y)) return false;
    this.selectedId = id;
    this._refreshDepthControl();
    this.activeDrag = {
      id,
      source,
      startX: x,
      startY: y,
      lastX: x,
      lastY: y,
      lastAt: this.window.performance?.now?.() ?? Date.now(),
      vx: 0,
      vy: 0,
      moved: false
    };
    this._setHover(id);
    return true;
  }

  _updateDrag(x, y) {
    const drag = this.activeDrag;
    if (!drag || this.paused) return;
    const now = this.window.performance?.now?.() ?? Date.now();
    const elapsed = Math.max(1, now - drag.lastAt) / 1000;
    drag.vx = (x - drag.lastX) / elapsed;
    drag.vy = (y - drag.lastY) / elapsed;
    if (Math.hypot(x - drag.startX, y - drag.startY) > 7) drag.moved = true;
    this.physics.dragTo(x, y);
    drag.lastX = x;
    drag.lastY = y;
    drag.lastAt = now;
  }

  _finishPress(x, y, source) {
    const drag = this.activeDrag;
    if (!drag || drag.source !== source) return;
    this._updateDrag(x, y);
    this.physics.endDrag(drag.vx, drag.vy);
    this.activeDrag = null;
    if (this.protectedIds.has(drag.id) && this.physics.get(drag.id)?.detached) return;
    if (drag.moved) this.saveLayout();
    else {
      const panel = this.layout.panels.find(item => item.id === drag.id);
      if (panel) this.onNavigate(panel.target, panel.id);
    }
  }

  beginHandPress(x, y) {
    return this._beginPress(x, y, "hand");
  }

  endHandPress(x, y) {
    this._finishPress(x, y, "hand");
  }

  onHandMove(x, y) {
    if (this.cursor3D) this.cursor3D.visible = true;
    this._movePointer(x, y, "hand");
  }

  onHandLost() {
    if (this.activeDrag?.source === "hand") {
      this.physics.endDrag(0, 0);
      this.activeDrag = null;
    }
    if (this.cursor3D) this.cursor3D.visible = false;
  }

  setPaused(paused) {
    this.paused = Boolean(paused);
    if (this.paused) this.cancelActiveInteraction();
  }

  cancelActiveInteraction() {
    if (this.activeDrag) {
      this.physics.endDrag(0, 0);
      this.activeDrag = null;
    }
    this._setHover(null);
  }

  _setHover(id) {
    if (this.hoveredId === id) return;
    if (this.hoveredId) {
      const previous = this.panelGroups.get(this.hoveredId);
      if (previous) previous.bodyMaterial.emissiveIntensity = 0.58;
    }
    this.hoveredId = id;
    if (id) {
      const current = this.panelGroups.get(id);
      if (current) current.bodyMaterial.emissiveIntensity = 1.12;
    }
    if (this.canvas) this.canvas.style.cursor = id ? "grab" : "default";
    this._refreshDepthControl();
  }

  _syncPanel(body, panel) {
    if (!body || !panel) return;
    const position = screenToWorld(
      body.x + body.width / 2,
      body.y + body.height / 2,
      this.window.innerWidth,
      this.window.innerHeight,
      this.units
    );
    panel.group.position.set(position.x, position.y, panel.group.userData.depth ?? 0);
    const amount = Math.min(0.22, body.compression || 0);
    panel.group.scale.x = body.compressionAxis === "x" ? 1 - amount : 1 + amount * 0.18;
    panel.group.scale.y = body.compressionAxis === "y" ? 1 - amount : 1 + amount * 0.18;
  }

  _animate() {
    if (!this.running || !this.renderer) return;
    const frameDelta = Math.min(this.clock.getDelta(), 1 / 30);
    if (!this.paused) this.animationTime += frameDelta;
    const delta = this.paused ? 0 : frameDelta;
    const elapsed = this.animationTime;

    // Pause freezes simulation and procedural motion, but keeps rendering alive
    // so the HUD and the user's explicit resume interaction remain responsive.
    if (!this.paused) {
      this.physics.step(delta);
      this.serviceCrew?.update(delta);
      this._updateRepairInteraction(delta);
      if (this.depthPhysics) {
        for (const [id, depthBody] of this.depthPhysics.bodies) {
          const planar = this.physics.get(id);
          if (!planar) continue;
          depthBody.x = planar.x + planar.width / 2;
          depthBody.y = planar.y + planar.height / 2;
          depthBody.width = planar.width;
          depthBody.height = planar.height;
        }
        this.depthPhysics.step(delta);
        for (const depthBody of this.depthPhysics.bodies.values()) {
          const boundedZ = Math.max(-1.25, Math.min(1.25, depthBody.z));
          if (boundedZ !== depthBody.z) {
            depthBody.z = boundedZ;
            depthBody.velocityZ = 0;
          }
        }
      }

      for (const [id, panel] of this.panelGroups) {
        const body = this.physics.get(id);
        this._syncPanel(body, panel);
        const index = this.layout.panels.findIndex(item => item.id === id);
        panel.group.rotation.z = Math.sin(elapsed * 0.42 + index * 1.1) * 0.012;
        const depthBody = this.depthPhysics?.get(id);
        if (depthBody) panel.group.position.z = depthBody.z + Math.sin(elapsed * 0.8 + index) * 0.035;
        // Assign bounded procedural offsets; incremental rotation accumulates
        // forever and eventually destroys the intended panel orientation.
        panel.group.rotation.x = Math.sin(elapsed * 0.31 + index) * 0.00008;
        panel.group.rotation.y = Math.cos(elapsed * 0.27 + index * 0.7) * 0.00007;
      }
      if (this.selectedId || this.hoveredId) this._refreshDepthControl();

      this.core.rotation.y = elapsed * 0.24;
      this.core.rotation.x = Math.sin(elapsed * 0.19) * 0.18;
      this.rings.forEach((ring, index) => {
        ring.rotation.z = elapsed * (index % 2 ? -0.18 : 0.13) * (index + 1);
      });
      this.stars.rotation.z = Math.sin(elapsed * 0.025) * 0.025;
    }

    this.renderer.render(this.scene, this.camera);
  }

  setLanguage(language) {
    this.language = COPY[language] ? language : "en";
    const copy = COPY[this.language];
    const setText = (id, value) => {
      const element = this.document.getElementById(id);
      if (element) element.textContent = value;
    };
    setText("spatial-title", copy.title);
    setText("spatial-help", copy.help);
    setText("spatial-reset", copy.reset);
    setText("spatial-exit", copy.exit);
    if (this.repairButton) this.repairButton.textContent = this.maintenanceLock ? copy.repairing : copy.repair;
    if (this.depthControl) {
      const title = this.depthControl.querySelector("div > span");
      const hint = this.depthControl.querySelector("div + div + div");
      if (title) title.textContent = copy.depth;
      if (hint) hint.textContent = copy.depthHint;
    }
    for (const [id, panel] of this.panelGroups) {
      const texture = makeLabelTexture(
        this.document,
        panel.definition,
        copy.panels[id]
      );
      const face = panel.group.children.find(child => child.material?.map);
      if (face) {
        const old = face.material.map;
        face.material.map = texture;
        face.material.needsUpdate = true;
        old?.dispose?.();
      }
    }
  }

  _restoreLayout() {
    try {
      const raw = this.window.localStorage?.getItem(this.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const saved = validateSavedLayout(parsed);
      if (!saved) return;
      for (const item of saved) {
        const body = this.physics.get(item.id);
        if (!body || body.detached) continue;
        body.x = Math.max(0, Math.min(this.physics.width - body.width, item.x * this.window.innerWidth));
        body.y = Math.max(0, Math.min(this.physics.height - body.height, item.y * this.window.innerHeight));
        const depthBody = this.depthPhysics?.get(item.id);
        if (depthBody && Number.isFinite(item.z)) depthBody.z = item.z;
      }
      this.hasCustomLayout = true;
    } catch (_) {
      // Storage can be unavailable in private browsing or restricted contexts.
    }
  }

  saveLayout() {
    if (!this.physics) return false;
    try {
      const panels = [];
      for (const definition of this.layout.panels) {
        const body = this.physics.get(definition.id);
        if (!body || body.detached) continue;
        const depthBody = this.depthPhysics?.get(definition.id);
        panels.push({
          id: definition.id,
          x: Number((body.x / Math.max(1, this.physics.width)).toFixed(6)),
          y: Number((body.y / Math.max(1, this.physics.height)).toFixed(6)),
          z: Number((depthBody?.z ?? 0).toFixed(4))
        });
      }
      this.window.localStorage?.setItem(this.storageKey, JSON.stringify({ version: 1, panels }));
      this.hasCustomLayout = true;
      return true;
    } catch (_) {
      return false;
    }
  }

  resetLayout() {
    if (!this.physics) return;
    try { this.window.localStorage?.removeItem(this.storageKey); } catch (_) {}
    this.hasCustomLayout = false;
    this.physics.reset();
    this.depthPhysics?.reset();
    for (const [id, depthBody] of this.depthPhysics?.bodies ?? []) {
      const panel = this.panelGroups.get(id);
      if (panel) panel.group.userData.depth = depthBody.z;
    }
    this.selectedId = null;
    this._refreshDepthControl();
    for (const control of this.protectedControls.values()) control.reset();
    for (const socket of this.protectedSockets.values()) socket.visible = false;
    for (const panel of this.panelGroups.values()) panel.group.visible = true;
    if (this.repairButton) this.repairButton.style.display = "none";
    this.cancelActiveInteraction();
    this._resize();
  }

  departServiceCrew() {
    return this.serviceCrew?.depart() ?? false;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.running = false;
    this.renderer?.setAnimationLoop(null);
    this.resizeObserver?.disconnect();
    this.window.removeEventListener("resize", this._resize);
    if (this.canvas) {
      this.canvas.removeEventListener("pointermove", this._pointerMove);
      this.canvas.removeEventListener("pointerdown", this._pointerDown);
      this.canvas.removeEventListener("pointerup", this._pointerUp);
      this.canvas.removeEventListener("pointercancel", this._pointerCancel);
      this.canvas.removeEventListener("lostpointercapture", this._pointerCancel);
      this.canvas.removeEventListener("wheel", this._wheel);
    }
    this.window.removeEventListener("blur", this._windowBlur);
    this.document.removeEventListener("visibilitychange", this._visibilityChange);
    if (this.scene) {
      this.scene.traverse(object => {
        object.geometry?.dispose?.();
        if (Array.isArray(object.material)) {
          for (const material of object.material) {
            material.map?.dispose?.();
            material.dispose?.();
          }
        } else if (object.material) {
          object.material.map?.dispose?.();
          object.material.dispose?.();
        }
      });
    }
    this.renderer?.dispose();
    this.renderer?.domElement?.remove();
    this.repairButton?.remove();
    this.repairButton = null;
    this.depthControl?.remove();
    this.depthControl = null;
    this.depthRange = null;
    this.depthValue = null;
    this.serviceCrew?.dispose();
    this.serviceCrew = null;
    this.protectedSockets.clear();
    this.panelGroups.clear();
    this.panelMeshes = [];
    this.physics = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this._emitStatus("disposed");
  }
}
