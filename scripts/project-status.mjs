import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [
  // Website foundation: exact source-level acceptance checks.
  ["WEB-01","Website foundation","Canonical production URL","index.html",/<link rel="canonical"/],
  ["WEB-02","Website foundation","Open Graph metadata","index.html",/<meta property="og:title"/],
  ["WEB-03","Website foundation","Mobile responsive breakpoint","index.html",/@media\(max-width:650px\)/],
  ["WEB-04","Website foundation","EN/RU/TJ language selectors","index.html",/data-lang="en"[\s\S]*data-lang="ru"[\s\S]*data-lang="tj"/],
  ["WEB-05","Website foundation","Primary section navigation","index.html",/href="#about"[\s\S]*href="#focus"[\s\S]*href="#projects"/],
  ["WEB-06","Website foundation","Core content sections exist","index.html",/id="about"[\s\S]*id="focus"[\s\S]*id="projects"/],
  ["WEB-07","Website foundation","Matter Engine lab linked from home","index.html",/href="matter-lab\.html"/],
  ["WEB-08","Website foundation","AURA hand-control lab linked from home","index.html",/href="aura-lab\.html"/],

  // Matter Engine: prototype behavior present in source.
  ["MAT-01","Matter Engine 2D","Physics world implementation","matter-engine.js",/class MatterWorld/],
  ["MAT-02","Matter Engine 2D","Mass parameter","matter-engine.js",/mass/],
  ["MAT-03","Matter Engine 2D","Elasticity parameter","matter-engine.js",/elasticity/],
  ["MAT-04","Matter Engine 2D","Friction parameter","matter-engine.js",/friction/],
  ["MAT-05","Matter Engine 2D","Collision resolution and impulse response","matter-engine.js",/normalSpeed[\s\S]*impulse/],
  ["MAT-06","Matter Engine 2D","Bounded material compression","matter-engine.js",/maxCompression/],
  ["MAT-07","Matter Engine 2D","Protected two-stage detachment","matter-engine.js",/tryDetach[\s\S]*heavy-lock/],
  ["MAT-08","Matter Engine 2D","Protected component repair","matter-engine.js",/repair\(/],
  ["MAT-09","Matter Engine 2D","Pointer/touch editing and local persistence","matter-lab.html",/pointerdown[\s\S]*localStorage/],

  // AURA hand-input controller: source checks, not a physical-camera certification.
  ["AUR-01","AURA hand controller","Explicit browser camera permission request","aura-engine.mjs",/getUserMedia/],
  ["AUR-02","AURA hand controller","MediaPipe Tasks Vision integration","aura-engine.mjs",/tasks-vision/],
  ["AUR-03","AURA hand controller","Live video landmark inference","aura-engine.mjs",/detectForVideo/],
  ["AUR-04","AURA hand controller","Mirrored selfie-camera coordinate mapping","aura-engine.mjs",/\(1\s*-\s*x\)/],
  ["AUR-05","AURA hand controller","Smoothed cursor coordinates","aura-engine.mjs",/AURA_CONFIG\.smoothing/],
  ["AUR-06","AURA hand controller","Cursor visibility controlled by hand tracking","aura-engine.mjs",/cursor\.style\.visibility = "visible"/],
  ["AUR-07","AURA hand controller","Pinch gesture classification","aura-engine.mjs",/pinchThreshold/],
  ["AUR-08","AURA hand controller","Pinch activates underlying control","aura-engine.mjs",/target\.click\(\)/],
  ["AUR-09","AURA hand controller","Two-finger scrolling","aura-engine.mjs",/scrollBy\(/],
  ["AUR-10","AURA hand controller","Open-palm cancel event","aura-engine.mjs",/gesture === "open_palm"[\s\S]*"cancel"/],
  ["AUR-11","AURA hand controller","Fist emergency pause and open-palm resume","aura-engine.mjs",/emergency-pause[\s\S]*"resume"/],
  ["AUR-12","AURA hand controller","GPU initialization with CPU fallback","aura-engine.mjs",/\["GPU", "CPU"\]/],
  ["AUR-13","AURA hand controller","Camera stream tracks explicitly stopped","aura-engine.mjs",/getTracks\(\)[\s\S]*track\.stop\(\)/],

  // Main-page AURA integration.
  ["INT-01","Main-site AURA integration","AURA toggle embedded in main navigation","index.html",/id="aura-toggle"/],
  ["INT-02","Main-site AURA integration","Main page imports shared AURA controller","index.html",/import \{ AuraController \} from "\.\/aura-engine\.mjs"/],
  ["INT-03","Main-site AURA integration","Camera source is hidden from the page","index.html",/class="aura-camera-source"[\s\S]*aria-hidden="true"/],
  ["INT-04","Main-site AURA integration","Hand cursor overlay is mounted","index.html",/id="aura-cursor"/],
  ["INT-05","Main-site AURA integration","AURA status HUD is mounted","index.html",/id="aura-status"/],
  ["INT-06","Main-site AURA integration","AURA-only CATCH ME control","index.html",/id="aura-catch"[\s\S]*relocateCatch/],
  ["INT-07","Main-site AURA integration","EN/RU/TJ AURA interface labels","index.html",/auraMode:"AURA OFF"[\s\S]*auraMode:"AURA ВЫКЛ"[\s\S]*auraMode:"AURA ХОМӮШ"/],

  // Not yet implemented: each row is a specific acceptance requirement.
  ["3D-01","3D spatial environment","Three.js WebGL scene renderer","spatial-world.mjs",/new THREE\.WebGLRenderer/],
  ["3D-02","3D spatial environment","Perspective camera with responsive field of view","spatial-world.mjs",/new THREE\.PerspectiveCamera[\s\S]*camera\.fov[\s\S]*_resize/],
  ["3D-03","3D spatial environment","Lit physical 3D interface panels","spatial-world.mjs",/new THREE\.MeshPhysicalMaterial/],
  ["3D-04","3D spatial environment","2D Matter-backed planar collision and bounded deformation","spatial-world.mjs",/new Matter\.MatterWorld[\s\S]*this\.physics\.step\(delta\)/],
  ["3D-05","3D spatial environment","Raycast selection and hand-driven object control","spatial-world.mjs",/new THREE\.Raycaster[\s\S]*beginHandPress\(x, y\)[\s\S]*onHandMove\(x, y\)/],
  ["3D-06","3D spatial environment","Mobile pixel-ratio cap and responsive layout","spatial-world.mjs",/setPixelRatio\(Math\.min[\s\S]*width < 680 \? 1\.2 : 1\.5/],
  ["3D-07","3D spatial environment","Independent panel depth layers in perspective scene","spatial-world.mjs",/userData\.depth = \[[-0-9., ]+\][\s\S]*position\.set\(position\.x, position\.y, panel\.group\.userData\.depth/],
  ["3D-08","3D spatial environment","Depth-aware panel tilt and floating animation","spatial-world.mjs",/group\.rotation\.set\([\s\S]*group\.rotation\.y \+=/],
  ["DPH-01","Depth-axis collision physics","Dedicated Z-axis physics world and body registry","spatial-depth-physics.mjs",/export class DepthPhysicsWorld[\s\S]*this\.bodies = new Map\(\)/],
  ["DPH-02","Depth-axis collision physics","Projected X/Y overlap gates depth collision","spatial-depth-physics.mjs",/function overlap2D[\s\S]*a\.width \+ b\.width[\s\S]*a\.height \+ b\.height/],
  ["DPH-03","Depth-axis collision physics","Mass-weighted positional correction","spatial-depth-physics.mjs",/1 \/ a\.mass[\s\S]*correction \* invA[\s\S]*correction \* invB/],
  ["DPH-04","Depth-axis collision physics","Restitution-based depth impulse response","spatial-depth-physics.mjs",/1 \+ this\.restitution[\s\S]*velocityZ/],
  ["DPH-05","Depth-axis collision physics","Matter X/Y synchronization and depth-render integration","spatial-world.mjs",/depthBody\.x = planar\.x \+ planar\.width \/ 2[\s\S]*this\.depthPhysics\.step\(delta\)[\s\S]*panel\.group\.position\.z = depthBody\.z/],
  ["DPH-06","Depth-axis collision physics","Layout reset restores initial depth and clears Z velocity","spatial-world.mjs",/this\.physics\.reset\(\)[\s\S]*this\.depthPhysics\?\.reset\(\)/],
  ["DUI-01","Interactive depth controls","Touch-friendly depth slider and step buttons","spatial-world.mjs",/_buildDepthControl\(\)[\s\S]*type = "range"[\s\S]*adjustSelectedDepth\(-0\.05, true\)[\s\S]*adjustSelectedDepth\(0\.05, true\)/],
  ["DUI-02","Interactive depth controls","Mouse wheel and precision modifier change panel depth","spatial-world.mjs",/addEventListener\("wheel", this\._wheel, \{ passive: false \}\)[\s\S]*event\.shiftKey \? 0\.01 : 0\.035[\s\S]*setPanelDepth\(id, body\.z \+ direction \* fine, true\)/],
  ["DUI-03","Interactive depth controls","Depth range is clamped and anchored controls are immutable","spatial-world.mjs",/body\.anchored \|\| !Number\.isFinite[\s\S]*Math\.max\(-1\.25, Math\.min\(1\.25/],
  ["DUI-04","Interactive depth controls","Depth values are persisted and restored in the existing layout format","spatial-world.mjs",/depthBody\.z = item\.z[\s\S]*z: Number\(\(depthBody\?\.z \?\? 0\)\.toFixed\(4\)\)/],
  ["DUI-05","Interactive depth controls","Depth controls have EN/RU/TJ labels and instructions","spatial-world.mjs",/depth: "PANEL DEPTH"[\s\S]*depth: "ГЛУБИНА ПАНЕЛИ"[\s\S]*depth: "ЧУҚУРИИ ПАНЕЛ"/],
  ["DUI-06","Interactive depth controls","AURA pinch can activate the depth step buttons","aura-engine.mjs",/elementFromPoint\(x, y\)[\s\S]*target\.click\(\)/],
  ["LAY-01","Spatial layout persistence","Versioned local layout serialization","spatial-world.mjs",/version: 1, panels/],
  ["LAY-02","Spatial layout persistence","Saved layout validation and unknown-ID rejection","spatial-math.mjs",/validateSavedLayout[\s\S]*allowed\.has\(panel\.id\)/],
  ["LAY-03","Spatial layout persistence","Normalized panel coordinates restored from local storage","spatial-world.mjs",/localStorage\?\.getItem[\s\S]*item\.x \* this\.window\.innerWidth/],
  ["LAY-04","Spatial layout persistence","Reset clears saved layout and restores initial layout","spatial-world.mjs",/removeItem\(this\.storageKey\)[\s\S]*this\.physics\.reset\(\)/],
  ["PRO-01","Protected control lifecycle","Protected navigation controls are anchored on mount","spatial-world.mjs",/protectedIds = new Set\(\["home", "ai-systems"\]\)[\s\S]*anchored: isProtected/],
  ["PRO-02","Protected control lifecycle","First pull resists and second pull detaches","protected-control.mjs",/first-pull-resisted[\s\S]*mount-released/],
  ["PRO-03","Protected control lifecycle","Detached control reveals fixed 3D mount socket","spatial-world.mjs",/_buildProtectedSocket[\s\S]*socket\.visible = true/],
  ["PRO-04","Protected control lifecycle","Repair restores the mounted control and hides socket","spatial-world.mjs",/control\.beginRepair\(\)[\s\S]*this\.physics\.repair\(id\)[\s\S]*control\.completeRepair\(\)[\s\S]*socket\.visible = false/],
  ["PRO-05","Protected control lifecycle","Repair action is localized in EN/RU/TJ","spatial-world.mjs",/repair: "REPAIR MOUNT"[\s\S]*repair: "ВОССТАНОВИТЬ КРЕПЛЕНИЕ"[\s\S]*repair: "ПАЙВАСТКУНИРО БАРҚАРОР КУН"/],


  ["CREW-01","Technician service sequence","Rigged realistic technician character models",null,null],
  ["CREW-02","Technician service sequence","Service vehicle arrival and departure animation",null,null],
  ["CREW-03","Technician service sequence","Physical tug-of-war interaction with held UI object",null,null],
  ["CREW-04","Technician service sequence","Interface lock state controlled by technician sequence",null,null],
  ["CREW-05","Technician service sequence","Vehicle ladder extraction and unfolding",null,null],
  ["CREW-06","Technician service sequence","Technician ladder climbing animation",null,null],
  ["CREW-07","Technician service sequence","Hand-animated cable reconnection and repair",null,null],
  ["CREW-08","Technician service sequence","Ladder folding, vehicle exit and UI restoration",null,null],

  ["AUD-01","Dialogue and spatial audio","Localized character voice lines (EN/RU/TJ)",null,null],
  ["AUD-02","Dialogue and spatial audio","Emotion and dialogue state machine",null,null],
  ["AUD-03","Dialogue and spatial audio","Spatially positioned character audio",null,null],
  ["AUD-04","Dialogue and spatial audio","Action-synchronized mechanical sound effects",null,null],
  ["AUD-05","Dialogue and spatial audio","Audio mute, permission and accessibility controls",null,null],

  // Test/acceptance: source checks that are part of the current CI pipeline.
  ["QA-01","Validation and release","AURA engine syntax validation in CI",".github/workflows/aura-engine-tests.yml",/node --check aura-engine\.mjs/],
  ["QA-02","Validation and release","Standalone AURA lab module syntax validation in CI",".github/workflows/aura-engine-tests.yml",/aura-lab\.html[\s\S]*node --check \/tmp\/aura-lab\.mjs/],
  ["QA-03","Validation and release","Main-site AURA module syntax validation in CI",".github/workflows/aura-engine-tests.yml",/index\.html[\s\S]*node --check \/tmp\/index-aura\.mjs/],
  ["QA-04","Validation and release","Combined regression suite covers AURA and Matter engines",".github/workflows/aura-engine-tests.yml",/node --test tests\/\*\.test\.cjs/],
  ["QA-05","Validation and release","Android physical-device camera and gesture test",null,null],
  ["QA-06","Validation and release","Cross-browser, lighting and sustained-performance validation",null,null]
];

const groups = new Map();
let implemented = 0;
let failed = 0;
for (const [id, group, label, file, pattern] of checks) {
  const record = groups.get(group) ?? { total: 0, implemented: 0, pending: 0, failed: 0 };
  record.total += 1;
  if (file && pattern) {
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute)) {
      failed += 1;
      record.failed += 1;
      console.error("MISSING FILE", id, file);
    } else if (pattern.test(fs.readFileSync(absolute, "utf8"))) {
      implemented += 1;
      record.implemented += 1;
    } else {
      failed += 1;
      record.failed += 1;
      console.error("MISSING EVIDENCE", id, file, label);
    }
  } else {
    record.pending += 1;
  }
  groups.set(group, record);
}
const total = checks.length;
const pct = value => (100 * value / total).toFixed(2);
const output = {
  methodology: "Equal-weight binary source-evidence checklist. This measures implemented source criteria, not effort, visual quality, or physical-device readiness.",
  implemented,
  pending: total - implemented - failed,
  failed,
  total,
  percentage: Number(pct(implemented)),
  groups: Object.fromEntries([...groups.entries()].map(([name, v]) => [name, {
    ...v, percentage: Number((100 * v.implemented / v.total).toFixed(2))
  }]))
};
console.log(JSON.stringify(output, null, 2));
if (failed > 0) process.exitCode = 1;
