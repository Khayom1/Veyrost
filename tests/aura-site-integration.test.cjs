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
  assert.ok(html.includes("ENGINEERING") && html.includes("WHAT'S NEXT."));
  for (const page of ["projects.html","studio.html","company.html","research.html","contact.html"]) {
    assert.ok(fs.existsSync(page), `missing page: ${page}`);
  }
  assert.match(html, /assets\/veyrost-corporate\.css/);
  assert.match(html, /assets\/veyrost-site\.js/);
});

test("main navigation retains AURA and a separate opt-in layout control", () => {
  assert.match(html, /id="aura-toggle"[^>]*aria-pressed="false"/);
  assert.match(html, /id="layout-toggle"[^>]*aria-pressed="false"/);
  assert.doesNotMatch(html, /id="layout-toggle"[^>]*hidden/);
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

test("layout editing is always available independently of AURA", () => {
  assert.ok(site.includes("editButton.hidden=false"));
  assert.ok(site.includes("editMode=Boolean(value);"));
  assert.equal(site.includes("editMode=Boolean(value)&&Boolean(controller?.active)"), false);
  assert.ok(site.includes("layout-toggle"));
  assert.ok(site.includes("veyrost-layout-editing"));
  assert.ok(site.includes('startDrag(detail.x,detail.y,"hand")'));
  assert.ok(site.includes('moveDrag(x,y,"hand")'));
});

test("workspace categories and project cards are movable, including the private category", () => {
  const studio=fs.readFileSync("studio.html","utf8");
  assert.match(site, /addEventListener\("pointerdown"/);
  assert.match(site, /addEventListener\("pointermove"/);
  assert.match(site, /data-veyrost-layout-item/);
  assert.match(site, /localStorage\.setItem\(LAYOUT_KEY/);
  assert.match(site, /Object\.assign\(positions,existing\)/);
  assert.equal((studio.match(/class="card workspace-module" data-veyrost-layout-item/g)||[]).length,7);
  assert.match(studio,/data-layout-id="workspace-private"/);
  assert.match(studio,/1 PRIVATE PROJECT/);
});

test("the directory contains every repository record without exposing private source links", () => {
  assert.equal(projects.length,20);
  assert.equal(new Set(projects.map(p=>p.id)).size,20);
  const publicProjects=projects.filter(p=>p.visibility!=="private");
  const privateProjects=projects.filter(p=>p.visibility==="private");
  assert.equal(publicProjects.length,19);
  assert.equal(privateProjects.length,1);
  for (const project of publicProjects) {
    assert.ok(project.name && project.repo && project.description);
    assert.match(project.url,/^https:\/\/github\.com\/Khayom1\//);
  }
  assert.equal(privateProjects[0].repo,"telegram-channel-mcp");
  assert.equal(privateProjects[0].url,null);
  assert.match(site,/p\.visibility==="private"[\s\S]*OWNER ACCESS ONLY/);
  assert.ok(projects.some(p=>p.repo==="SkillGuard"));
  assert.ok(projects.some(p=>p.repo==="WAYLINE-RADIO"));
  assert.ok(projects.some(p=>p.repo==="Scancam"));
  assert.ok(projects.some(p=>p.repo==="textivo"));
});

test("shared script binds all three language buttons and keeps selectors valid", () => {
  assert.ok(site.includes('$$("[data-lang]").forEach(button=>button.addEventListener("click"'));
  assert.equal(site.includes("$$$"), false);
  assert.equal(/^\\s*\\$\\("\\[data-lang\\]"\\)/m.test(site), false);
  for (const locale of ["en","ru","tj"]) assert.ok(html.includes('data-lang="' + locale + '"'));
  assert.ok(site.includes('auraButton.addEventListener("click"'));
  assert.ok(site.includes('editButton?.addEventListener("click"'));
  assert.ok(css.includes("@media(max-width:760px)") && css.includes(".language-switch{display:flex}"));
});

test("navigation menu and settings entry are visible and available on every page", () => {
  for (const page of ["index.html","projects.html","studio.html","company.html","research.html","contact.html"]) {
    const html = fs.readFileSync(page, "utf8");
    assert.match(html, /id="menu-toggle"/);
    assert.match(html, /id="mobile-nav"/);
    assert.match(html, /href="studio.html#workspace-settings"/);
    assert.ok(html.includes("veyrost-corporate.css?v=20261112-6"));
  }
  assert.match(css, /\.menu-toggle\\{display:inline-flex/);
  assert.match(css, /\.mobile-nav\.open\\{display:grid/);
  const studioHtml = fs.readFileSync("studio.html", "utf8");
  assert.match(studioHtml, /id="workspace-settings"/);
});
test("shared initialization uses querySelectorAll for every multi-element control list", () => {
  for (const selector of [
    '[data-close-menu]',
    '[placeholder],[title],[aria-label],[data-label]',
    '[data-lang]',
    '[data-local-toggle]'
  ]) {
    assert.ok(site.includes('$$("' + selector + '")'), 'querySelectorAll missing for ' + selector);
  }
  assert.ok(site.includes('const statusNode=$("#aura-status");'));
});

test("browser storage failures do not abort language or settings controls", () => {
  assert.match(site,/try\{language=localStorage\.getItem\("veyrost-language"\)/);
  assert.match(site,/try\{saved=localStorage\.getItem\(key\)\}catch\(_\)\{\}/);
  assert.match(site,/try\{localStorage\.setItem\(key,String\(next\)\)\}catch\(_\)\{persisted=false\}/);
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
  assert.match(site,/const\s+translations\s*=/);
});

test("layout editor and project filtering are available on mobile", () => {
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/\.project-grid\{grid-template-columns:1fr\}/);
  assert.match(css,/\.studio-layout\{grid-template-columns:1fr\}/);
});

test("mobile menus and footers do not repeat the Contact destination", () => {
  for (const page of ["index.html","projects.html","studio.html","company.html","research.html"]) {
    const source=fs.readFileSync(page,"utf8");
    assert.doesNotMatch(source,/data-close-menu data-label="contact">Contact<\/a><a href="contact\.html" data-label="contact">Contact/);
    assert.doesNotMatch(source,/<a href="contact\.html">Contact<\/a><a href="contact\.html" data-label="contact">Contact/);
  }
});

test("the public project directory explains its private entry without claiming a public source link", () => {
  const page=fs.readFileSync("projects.html","utf8");
  assert.match(page,/19 public repositories and one private project record/);
  assert.match(page,/private source code and implementation details remain hidden/);
  assert.match(page,/19 PUBLIC \+ 1 PRIVATE/);
});
