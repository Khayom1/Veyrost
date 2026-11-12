"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("assets/veyrost-i18n.js", "utf8");
const dictionaries = new Function(source.replace(
  "export const dictionaries = { en, ru, tj };",
  "return { en, ru, tj };"
))();
const pages = ["index.html","projects.html","company.html","contact.html","research.html","studio.html"];
const ignored = new Set(["VEYROST","EN","RU","TJ","01","02","03","04","05","06","07","19","TG","GH","AI","CV","NET","QA","DATA","LAB","V"]);

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .match(/>([^<>]+)</g) || [];
}

test("every visible static page text has Russian and Tajik translations", () => {
  for (const page of pages) {
    const html = fs.readFileSync(page, "utf8");
    for (const [, raw] of visibleText(html).map(x => [null, x.slice(1,-1)])) {
      const text = raw.replace(/\s+/g, " ").trim();
      if (text.length < 2 || ignored.has(text)) continue;
      for (const locale of ["ru","tj"]) {
        assert.ok(
          Object.hasOwn(dictionaries[locale], text) || Object.hasOwn(dictionaries.en, text),
          `${page}: missing ${locale} translation for "${text}"`
        );
      }
    }
  }
});

test("every dynamic project card field is localized in Russian and Tajik", () => {
  const data = fs.readFileSync("assets/projects-data.js", "utf8");
  const { projects, projectGroups } = new Function(data
    .replace("export const projects =", "const projects =")
    .replace("export const projectGroups =", "const projectGroups =") + "\nreturn { projects, projectGroups };"
  )();
  for (const locale of ["ru","tj"]) {
    for (const project of projects) {
      for (const field of ["group","type","status","description"]) {
        const value = project[field];
        assert.ok(
          Object.hasOwn(dictionaries[locale], value) || Object.hasOwn(dictionaries.en, value),
          `${locale}: missing project ${field} translation: "${value}"`
        );
      }
    }
    for (const group of projectGroups) {
      assert.ok(
        Object.hasOwn(dictionaries[locale], group) || Object.hasOwn(dictionaries.en, group),
        `${locale}: missing project filter translation: "${group}"`
      );
    }
  }
});

test("all six pages expose all three locales and load the shared localization module", () => {
  for (const page of pages) {
    const html = fs.readFileSync(page, "utf8");
    for (const locale of ["en","ru","tj"]) assert.match(html, new RegExp(`data-lang="${locale}"`));
    assert.match(html, /assets\/veyrost-site\.js/);
  }
  const site = fs.readFileSync("assets/veyrost-site.js", "utf8");
  assert.match(site, /veyrost-i18n\.js/);
  assert.match(site, /localStorage\.setItem\("veyrost-language"/);
  assert.match(site, /new MutationObserver/);
});

test("search controls, document metadata and accessibility labels are localized", () => {
  for (const locale of ["ru","tj"]) {
    for (const value of ["Search repositories, features, languages…","Filter by engineering domain","Main navigation","Open navigation","Interface language","VEYROST home"]) {
      assert.ok(Object.hasOwn(dictionaries[locale], value), `${locale}: missing UI translation "${value}"`);
    }
    for (const value of [
      "VEYROST · Engineering Group",
      "Projects and open-source portfolio · VEYROST",
      "Company and engineering model · VEYROST",
      "Contact · VEYROST",
      "Research and engineering domains · VEYROST",
      "Configurable engineering workspace · VEYROST"
    ]) assert.ok(Object.hasOwn(dictionaries[locale], value), `${locale}: missing page title "${value}"`);
  }
});

test("native select option labels are included in localization traversal", () => {
  const site = fs.readFileSync("assets/veyrost-site.js", "utf8");
  assert.match(site, /TEXTAREA\|INPUT\)/);
  assert.doesNotMatch(site, /TEXTAREA\|INPUT\|OPTION/);
  const page = fs.readFileSync("projects.html", "utf8");
  assert.match(page, /<option>Core platform<\/option>/);
});

test("localized repository search resolves locale data inside its renderer", () => {
  const site = fs.readFileSync("assets/veyrost-site.js", "utf8");
  assert.match(site, /const localeDictionary=dictionaries\[language\]\|\|\{\}/);
  assert.match(site, /localeDictionary\[p\.description\]/);
});
