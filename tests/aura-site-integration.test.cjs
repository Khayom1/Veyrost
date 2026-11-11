"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const html = fs.readFileSync("index.html", "utf8");
const site = fs.readFileSync("assets/veyrost-site.js", "utf8");
const auraEngine = fs.readFileSync("aura-engine.mjs", "utf8");
const css = fs.readFileSync("assets/veyrost-corporate.css", "utf8");
const dataSource = fs.readFileSync("assets/projects-data.js", "utf8");
const projects = new Function(dataSource
  .replace("export const projects =", "const projects =")
  .replace("export const projectGroups =", "const projectGroups =") + "\nreturn projects;")();

test("main page is a corporate multi-page overview, not a single-page overlay", () => {
  assert.match(html, /ENGINEERING<br><span>WHAT'S NEXT\.<\/span>/);
  for (const page of ["projects.html","studio.html","company.html","research.html","contact.html"]) {
    assert.ok(fs.existsSync(page), `missing page: ${page}`);
  }
  assert.match(html, /assets\/veyrost-corporate\.css/);
  assert.match(html, /assets\/veyrost-site\.js/);
});

test("main navigation retains AURA and a separate opt-in layout control", () => {
  assert.match(html, /id="aura-toggle"[^>]*aria-pressed="false"/);
  assert.match(html, /id="layout-toggle"[^>]*hidden/);
  assert.match(html, /href="projects\.html"/);
  assert.match(html, /href="studio\.html"/);
});

test("camera is hidden and exactly one conventional arrow cursor is mounted", () => {
  assert.match(html, /id="aura-camera" class="aura-cam"[^>]*aria-hidden="true"/);
  assert.equal((html.match(/id="aura-pointer"/g) || []).length, 1);
  assert.match(html, /id="aura-pointer"[^>]*>\s*<svg/);
  assert.match(html, /<path d="M2 1 L2 27/);
  assert.match(css, /html\.aura-active,html\.aura-active \*\{cursor:none!important\}/);
});

test("shared AURA controller requests access only after the user activates the button", () => {
  assert.match(site, /import \{ AuraController \} from "\.\.\/aura-engine\.mjs"/);
  assert.match(site, /auraButton\.addEventListener\("click"/);
  assert.match(site, /await controller\.start\(\)/);
  assert.match(site, /await controller\.stop\(\)/);
  assert.match(auraEngine, /getUserMedia/);
});

test("layout editing requires AURA and the explicit MOVE ITEMS control", () => {
  assert.match(site, /editButton\.hidden=false/);
  assert.match(site, /editMode=Boolean\(value\)&&Boolean\(controller\?\.active\)/);
  assert.match(site, /layout-toggle/);
  assert.match(site, /veyrost-layout-editing/);
  assert.match(site, /startDrag\(detail\.x,detail\.y,"hand"\)/);
  assert.match(site, /moveDrag\(x,y,"hand"\)/);
});

test("categories and project cards can be moved with mouse, touch and hand pinch", () => {
  assert.match(site, /addEventListener\("pointerdown"/);
  assert.match(site, /addEventListener\("pointermove"/);
  assert.match(site, /data-veyrost-layout-item/);
  assert.match(site, /localStorage\.setItem\(LAYOUT_KEY/);
  assert.match(site, /Object\.assign\(positions,existing\)/);
});

test("the project directory contains all 19 public repositories and source links", () => {
  assert.equal(projects.length,19);
  assert.equal(new Set(projects.map(p=>p.id)).size,19);
  for (const project of projects) {
    assert.ok(project.name && project.repo && project.description);
    assert.match(project.url,/^https:\/\/github\.com\/Khayom1\//);
  }
  assert.ok(projects.some(p=>p.repo==="SkillGuard"));
  assert.ok(projects.some(p=>p.repo==="WAYLINE-RADIO"));
  assert.ok(projects.some(p=>p.repo==="Scancam"));
  assert.ok(projects.some(p=>p.repo==="textivo"));
});

test("project directory has real search, category filters and count feedback", () => {
  const page=fs.readFileSync("projects.html","utf8");
  assert.match(page,/id="project-search"/);
  assert.match(page,/id="project-filter"/);
  assert.match(page,/id="project-grid"/);
  assert.match(site,/const render=\(\)=>/);
  assert.match(site,/projectGroups|project-filter/);
});

test("interface language controls expose English, Russian and Tajik", () => {
  for (const lang of ["en","ru","tj"]) assert.match(html,new RegExp(`data-lang="${lang}"`));
  assert.match(site,/translations=/);
});

test("layout editor and project filtering are available on mobile", () => {
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/\.project-grid\{grid-template-columns:1fr\}/);
  assert.match(css,/\.studio-layout\{grid-template-columns:1fr\}/);
});
