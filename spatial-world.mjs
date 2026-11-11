import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js";
import "./matter-engine.js";
import {
  computeSpatialLayout,
  screenToWorld,
  SPATIAL_UNITS_PER_PIXEL
} from "./spatial-math.mjs";

const COPY = {
  en: {
    title: "VEYROST / SPATIAL INTERFACE",
    help: "Point to a panel. Pinch and drag to move it. Release to open.",
    reset: "RESET LAYOUT",
    exit: "AURA OFF",
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
    this.clock = null;
    this.resizeObserver = null;
    this.panelGroups = new Map();
    this.panelMeshes = [];
    this.hoveredId = null;
    this.activeDrag = null;
    this.pointer = { x: 0, y: 0 };
    this.lastFrame = 0;
    this.units = SPATIAL_UNITS_PER_PIXEL;
    this._animate = this._animate.bind(this);
    this._resize = this._resize.bind(this);
    this._pointerMove = this._pointerMove.bind(this);
    this._pointerDown = this._pointerDown.bind(this);
    this._pointerUp = this._pointerUp.bind(this);
    this._pointerCancel = this._pointerCancel.bind(this);
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
    this.camera = new THREE.OrthographicCamera(
      -width / (2 * this.units),
      width / (2 * this.units),
      height / (2 * this.units),
      -height / (2 * this.units),
      0.1,
      100
    );
    this.camera.position.set(0, 0, 24);
    this.camera.lookAt(0, 0, 0);

    this._buildEnvironment();
    this._buildPanels();
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
      group.rotation.set(0.012 * (layout.panels.indexOf(definition) % 2 ? 1 : -1), 0, 0);
      this.scene.add(group);
      this.panelGroups.set(definition.id, { group, bodyMaterial, definition, hitArea });

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
        anchored: false
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

  _buildCursor() {
    this.cursor3D = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.105, 0.012, 8, 40),
      new THREE.MeshBasicMaterial({
        color: 0xb6f7ff,
        transparent: true,
        opacity: 0.95
      })
    );
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xeaffff })
    );
    this.cursor3D.add(ring, dot);
    this.cursor3D.position.z = 1.4;
    this.cursor3D.visible = false;
    this.scene.add(this.cursor3D);
  }

  _bindEvents() {
    this.canvas = this.renderer.domElement;
    this.canvas.addEventListener("pointermove", this._pointerMove, { passive: true });
    this.canvas.addEventListener("pointerdown", this._pointerDown);
    this.canvas.addEventListener("pointerup", this._pointerUp);
    this.canvas.addEventListener("pointercancel", this._pointerCancel);
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
    this.camera.left = -width / (2 * this.units);
    this.camera.right = width / (2 * this.units);
    this.camera.top = height / (2 * this.units);
    this.camera.bottom = -height / (2 * this.units);
    this.camera.updateProjectionMatrix();

    const layout = computeSpatialLayout(width, height);
    this.layout = layout;
    if (this.physics) {
      this.physics.setBounds(width, height);
      for (const definition of layout.panels) {
        const body = this.physics.get(definition.id);
        if (!body) continue;
        body.x = definition.x;
        body.y = definition.y;
        body.width = definition.width;
        body.height = definition.height;
        body.initial.x = definition.x;
        body.initial.y = definition.y;
        this._syncPanel(body, this.panelGroups.get(definition.id));
      }
      this.physics.draggedId = null;
      this.activeDrag = null;
    }
    if (this.core) {
      const point = screenToWorld(layout.core.x, layout.core.y, width, height, this.units);
      this.core.position.x = point.x;
      this.core.position.y = point.y;
    }
  }

  _pointerMove(event) {
    this._movePointer(event.clientX, event.clientY, "mouse");
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
    if (!this.running || this.paused || this.activeDrag) return false;
    const id = this._raycastPanel(x, y);
    if (!id) return false;
    const body = this.physics.get(id);
    if (!body || !this.physics.beginDrag(id, x, y)) return false;
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
    if (!drag.moved) {
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
    panel.group.position.set(position.x, position.y, 0);
    const amount = Math.min(0.22, body.compression || 0);
    panel.group.scale.x = body.compressionAxis === "x" ? 1 - amount : 1 + amount * 0.18;
    panel.group.scale.y = body.compressionAxis === "y" ? 1 - amount : 1 + amount * 0.18;
  }

  _animate() {
    if (!this.running || !this.renderer) return;
    const delta = Math.min(this.clock.getDelta(), 1 / 30);
    const elapsed = this.clock.elapsedTime;
    this.physics.step(delta);

    for (const [id, panel] of this.panelGroups) {
      const body = this.physics.get(id);
      this._syncPanel(body, panel);
      const index = this.layout.panels.findIndex(item => item.id === id);
      panel.group.rotation.z = Math.sin(elapsed * 0.42 + index * 1.1) * 0.012;
      panel.group.position.z = 0.04 + Math.sin(elapsed * 0.8 + index) * 0.025;
    }

    this.core.rotation.y = elapsed * 0.24;
    this.core.rotation.x = Math.sin(elapsed * 0.19) * 0.18;
    this.rings.forEach((ring, index) => {
      ring.rotation.z = elapsed * (index % 2 ? -0.18 : 0.13) * (index + 1);
    });
    this.stars.rotation.z = Math.sin(elapsed * 0.025) * 0.025;
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

  resetLayout() {
    if (!this.physics) return;
    this.physics.reset();
    this.cancelActiveInteraction();
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
    }
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
    this.panelGroups.clear();
    this.panelMeshes = [];
    this.physics = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this._emitStatus("disposed");
  }
}
