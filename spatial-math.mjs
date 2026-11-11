export const SPATIAL_UNITS_PER_PIXEL = 120;

export const SPATIAL_PANELS = Object.freeze([
  { id: "home", code: "01 / HOME", title: "HOME", subtitle: "Overview and direction", target: "#home" },
  { id: "projects", code: "02 / PROJECTS", title: "PROJECTS", subtitle: "Builds and experiments", target: "#projects" },
  { id: "ai-systems", code: "03 / ECOSYSTEM", title: "AI SYSTEMS", subtitle: "SkillGuard and DevKit", target: "#ecosystem" },
  { id: "matter", code: "04 / PHYSICS", title: "MATTER LAB", subtitle: "Physical interface editor", target: "matter-lab.html" },
  { id: "founder", code: "05 / FOUNDER", title: "FOUNDER", subtitle: "People behind VEYROST", target: "#founder" },
  { id: "contact", code: "06 / CONTACT", title: "CONTACT", subtitle: "Connect with the lab", target: "#contact" }
]);

function finite(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

export function screenToWorld(x, y, width, height, unitsPerPixel = SPATIAL_UNITS_PER_PIXEL) {
  const w = Math.max(1, finite(width, 1));
  const h = Math.max(1, finite(height, 1));
  const scale = Math.max(1, finite(unitsPerPixel, SPATIAL_UNITS_PER_PIXEL));
  return {
    x: (finite(x, w / 2) - w / 2) / scale,
    y: (h / 2 - finite(y, h / 2)) / scale
  };
}

export function worldToScreen(x, y, width, height, unitsPerPixel = SPATIAL_UNITS_PER_PIXEL) {
  const w = Math.max(1, finite(width, 1));
  const h = Math.max(1, finite(height, 1));
  const scale = Math.max(1, finite(unitsPerPixel, SPATIAL_UNITS_PER_PIXEL));
  return {
    x: w / 2 + finite(x, 0) * scale,
    y: h / 2 - finite(y, 0) * scale
  };
}

export function computeSpatialLayout(width, height) {
  const w = Math.max(320, Math.round(finite(width, 320)));
  const h = Math.max(400, Math.round(finite(height, 400)));
  const compact = w < 680;
  const panelWidth = compact
    ? Math.min(176, Math.max(126, (w - 44) / 2))
    : Math.min(238, Math.max(190, w * 0.235));
  const panelHeight = compact ? 66 : 78;
  const centers = compact
    ? [[0.27, 0.32], [0.73, 0.32], [0.27, 0.51], [0.73, 0.51], [0.27, 0.70], [0.73, 0.70]]
    : [[0.18, 0.36], [0.50, 0.34], [0.82, 0.36], [0.18, 0.69], [0.50, 0.71], [0.82, 0.69]];

  const panels = SPATIAL_PANELS.map((panel, index) => {
    const [rx, ry] = centers[index];
    const centerX = Math.round(w * rx);
    const centerY = Math.round(h * ry);
    return {
      ...panel,
      centerX,
      centerY,
      width: panelWidth,
      height: panelHeight,
      x: centerX - panelWidth / 2,
      y: centerY - panelHeight / 2,
      world: screenToWorld(centerX, centerY, w, h)
    };
  });

  return {
    width: w,
    height: h,
    compact,
    panelWidth,
    panelHeight,
    panels,
    core: {
      x: w / 2,
      y: compact ? h * 0.155 : h * 0.535,
      radius: compact ? 0.26 : 0.43
    }
  };
}

export function scalePanelLayout(panels, oldWidth, oldHeight, newWidth, newHeight) {
  const fromWidth = Math.max(1, finite(oldWidth, 1));
  const fromHeight = Math.max(1, finite(oldHeight, 1));
  const toWidth = Math.max(1, finite(newWidth, 1));
  const toHeight = Math.max(1, finite(newHeight, 1));
  const sx = toWidth / fromWidth;
  const sy = toHeight / fromHeight;
  return (Array.isArray(panels) ? panels : []).map(panel => ({
    id: String(panel.id),
    x: finite(panel.x, 0) * sx,
    y: finite(panel.y, 0) * sy,
    width: Math.max(1, finite(panel.width, 1) * sx),
    height: Math.max(1, finite(panel.height, 1) * sy)
  }));
}

export function validateSavedLayout(value, allowedIds = SPATIAL_PANELS.map(panel => panel.id)) {
  if (!value || value.version !== 1 || !Array.isArray(value.panels)) return null;
  const allowed = new Set(allowedIds);
  const seen = new Set();
  const panels = [];
  for (const panel of value.panels) {
    if (!panel || typeof panel.id !== "string" || !allowed.has(panel.id) || seen.has(panel.id)) continue;
    const x = Number(panel.x), y = Number(panel.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    seen.add(panel.id);
    panels.push({ id: panel.id, x, y });
  }
  return panels.length ? panels : null;
}
