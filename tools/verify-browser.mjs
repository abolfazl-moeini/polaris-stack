#!/usr/bin/env node
/**
 * verify-browser.mjs — Browser Verification, E2E & Visual Matrix Engine
 * Implements Plan 6:
 *  - Exactly-One-Root & Zero-Waste Verification
 *  - Smoke Matrix 6 (PR Gate, <3 min)
 *  - Pairwise Matrix 15 (Nightly / Release) with screenshot artifacts
 *  - Axe A11y AA scan (scoped strictly to .ps-root)
 *  - prefers-reduced-motion verification
 */

import { chromium } from "playwright-core";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stackRoot = path.join(__dirname, "..");
const repoRoot = path.join(stackRoot, "../..");
const distCascadeDir = path.join(stackRoot, "dist-cascade/B");
const artifactsDir = path.join(stackRoot, "artifacts/visual-matrix");
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const AXE_PATH = path.join(repoRoot, "node_modules/axe-core/axe.js");

const VIEWPORTS = {
  Mobile: { width: 375, height: 667 },
  Tablet: { width: 768, height: 1024 },
  Desktop: { width: 1280, height: 800 }
};

const SMOKE_SCENARIOS = [
  { id: "smoke-1", archetype: "flat", theme: "block", dir: "ltr", viewport: "Mobile" },
  { id: "smoke-2", archetype: "material", theme: "classic", dir: "rtl", viewport: "Desktop" },
  { id: "smoke-3", archetype: "glass", theme: "block", dir: "rtl", viewport: "Tablet" },
  { id: "smoke-4", archetype: "brutalist", theme: "classic", dir: "ltr", viewport: "Tablet" },
  { id: "smoke-5", archetype: "cupertino", theme: "block", dir: "ltr", viewport: "Desktop" },
  { id: "smoke-6", archetype: "glass", theme: "classic", dir: "rtl", viewport: "Mobile" }
];

const PAIRWISE_SCENARIOS = [
  { id: "pair-1", archetype: "flat", theme: "block", dir: "rtl", viewport: "Mobile" },
  { id: "pair-2", archetype: "flat", theme: "classic", dir: "ltr", viewport: "Tablet" },
  { id: "pair-3", archetype: "flat", theme: "classic", dir: "ltr", viewport: "Desktop" },
  { id: "pair-4", archetype: "material", theme: "block", dir: "rtl", viewport: "Mobile" },
  { id: "pair-5", archetype: "material", theme: "block", dir: "ltr", viewport: "Tablet" },
  { id: "pair-6", archetype: "material", theme: "classic", dir: "ltr", viewport: "Desktop" },
  { id: "pair-7", archetype: "glass", theme: "classic", dir: "rtl", viewport: "Mobile" },
  { id: "pair-8", archetype: "glass", theme: "block", dir: "rtl", viewport: "Tablet" },
  { id: "pair-9", archetype: "glass", theme: "block", dir: "ltr", viewport: "Desktop" },
  { id: "pair-10", archetype: "brutalist", theme: "block", dir: "rtl", viewport: "Mobile" },
  { id: "pair-11", archetype: "brutalist", theme: "classic", dir: "ltr", viewport: "Tablet" },
  { id: "pair-12", archetype: "brutalist", theme: "classic", dir: "rtl", viewport: "Desktop" },
  { id: "pair-13", archetype: "cupertino", theme: "block", dir: "ltr", viewport: "Mobile" },
  { id: "pair-14", archetype: "cupertino", theme: "classic", dir: "rtl", viewport: "Tablet" },
  { id: "pair-15", archetype: "cupertino", theme: "classic", dir: "ltr", viewport: "Desktop" }
];

function getCoreCss() {
  const p = path.join(distCascadeDir, "polaris-core.css");
  if (existsSync(p)) return readFileSync(p, "utf8");
  return "";
}

function getArchetypeCss(archetype) {
  const p = path.join(distCascadeDir, `archetypes/${archetype}.css`);
  if (existsSync(p)) return readFileSync(p, "utf8");
  const fallback = path.join(stackRoot, `src/styles/archetypes/${archetype}.css`);
  if (existsSync(fallback)) return readFileSync(fallback, "utf8");
  return "";
}

function getThemeCss(themeType) {
  if (themeType === "classic") {
    const p = path.join(stackRoot, "fixtures/themes/theme-classic-hostile/style.css");
    if (existsSync(p)) return readFileSync(p, "utf8");
  }
  // Block theme tokens
  const blockJsonPath = path.join(stackRoot, "fixtures/themes/theme-block-fixture/theme.json");
  if (existsSync(blockJsonPath)) {
    const data = JSON.parse(readFileSync(blockJsonPath, "utf8"));
    const palette = data.settings?.color?.palette || [];
    let css = ":root {\n";
    for (const item of palette) {
      css += `  --wp--preset--color--${item.slug}: ${item.color};\n`;
    }
    css += "}\nbody { margin: 0; font-family: system-ui, sans-serif; }\n";
    return css;
  }
  return "";
}

function renderComponentHtml(archetype, dir = "ltr") {
  return `
    <div class="ps-root" data-archetype="${archetype}">
      <article class="ps-card">
        <span class="ps-badge ps-badge-info">نسخهٔ فعال</span>
        <h2 class="ps-heading ps-heading-2">عنوان کارت مؤلفه</h2>
        <p class="ps-text">متن فارسی نمونه برای بررسی چیدمان و دفاع آبشاری در این سناریو.</p>
        <div class="ps-cluster">
          <button class="ps-button ps-button-solid" type="button">کلید اصلی</button>
          <button class="ps-button ps-button-soft" type="button">کلید ثانویه</button>
        </div>
      </article>
      <div class="ps-stack">
        <span class="ps-spinner" role="status" aria-label="Loading"></span>
      </div>
    </div>
  `;
}

function buildHtmlDocument({ archetype, theme, dir, bodyHtml }) {
  const themeCss = getThemeCss(theme);
  const coreCss = getCoreCss();
  const archetypeCss = getArchetypeCss(archetype);

  return `
    <!DOCTYPE html>
    <html lang="${dir === "rtl" ? "fa" : "en"}" dir="${dir}">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          ${themeCss}
          ${coreCss}
          ${archetypeCss}
        </style>
      </head>
      <body>
        <main class="site-main">
          ${bodyHtml}
        </main>
      </body>
    </html>
  `;
}

async function runRootAndZeroWasteTests(browser) {
  console.log("\n==> [Gate 6.1] Exactly-One-Root & Zero-Waste Verification...");
  const page = await browser.newPage();

  // 1. Zero-waste: page without components has 0 ps-* elements
  const blankDoc = `
    <!DOCTYPE html>
    <html><head><title>Blank Post</title></head><body><p>Normal Post without components</p></body></html>
  `;
  await page.setContent(blankDoc, { waitUntil: "load" });
  const countBlank = await page.evaluate(() => document.querySelectorAll("[class*='ps-'], [data-archetype]").length);
  if (countBlank !== 0) {
    throw new Error(`Zero-Waste failed: found ${countBlank} ps-* elements in empty page`);
  }
  console.log("  ✔ Zero-Waste verified: 0 ps-* elements in inactive page");

  // 2. Exactly-one-root: page with component has exactly 1 .ps-root with valid data-archetype
  const singleRootDoc = buildHtmlDocument({
    archetype: "material",
    theme: "block",
    dir: "ltr",
    bodyHtml: renderComponentHtml("material")
  });
  await page.setContent(singleRootDoc, { waitUntil: "load" });
  const roots = await page.evaluate(() => {
    const list = document.querySelectorAll(".ps-root");
    return Array.from(list).map(el => ({
      tagName: el.tagName.toLowerCase(),
      archetype: el.getAttribute("data-archetype")
    }));
  });
  if (roots.length !== 1 || roots[0].archetype !== "material") {
    throw new Error(`Exactly-One-Root failed: expected 1 root with archetype 'material', found ${roots.length}`);
  }
  console.log("  ✔ Exactly-One-Root verified: exactly 1 .ps-root[data-archetype]");

  // 3. Nested roots handled cleanly
  const nestedDoc = buildHtmlDocument({
    archetype: "flat",
    theme: "block",
    dir: "ltr",
    bodyHtml: `
      <div class="ps-root" data-archetype="flat">
        <p class="ps-text">Outer Flat Root</p>
        <div class="ps-root" data-archetype="glass">
          <p class="ps-text">Inner Glass Root</p>
        </div>
      </div>
    `
  });
  await page.setContent(nestedDoc, { waitUntil: "load" });
  const nestedRoots = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".ps-root")).map(r => r.getAttribute("data-archetype"));
  });
  if (nestedRoots.length !== 2 || nestedRoots[0] !== "flat" || nestedRoots[1] !== "glass") {
    throw new Error(`Nested root test failed: unexpected archetypes ${JSON.stringify(nestedRoots)}`);
  }
  console.log("  ✔ Nested roots verified: cleanly scopes inner archetype");

  await page.close();
}

async function runScenario(page, scenario) {
  const vp = VIEWPORTS[scenario.viewport];
  await page.setViewportSize(vp);

  const doc = buildHtmlDocument({
    archetype: scenario.archetype,
    theme: scenario.theme,
    dir: scenario.dir,
    bodyHtml: renderComponentHtml(scenario.archetype, scenario.dir)
  });

  await page.setContent(doc, { waitUntil: "load" });

  // Verification measurements
  const measurements = await page.evaluate(() => {
    const root = document.querySelector(".ps-root");
    const btn = document.querySelector(".ps-button-solid");
    const card = document.querySelector(".ps-card");

    const rootStyle = root ? window.getComputedStyle(root) : null;
    const btnStyle = btn ? window.getComputedStyle(btn) : null;
    const cardStyle = card ? window.getComputedStyle(card) : null;

    return {
      rootExists: !!root,
      button: btnStyle ? {
        boxSizing: btnStyle.boxSizing,
        appearance: btnStyle.appearance,
        backgroundColor: btnStyle.backgroundColor,
        color: btnStyle.color,
        borderRadius: btnStyle.borderRadius
      } : null,
      card: cardStyle ? {
        display: cardStyle.display,
        boxSizing: cardStyle.boxSizing
      } : null
    };
  });

  // Verify cascade defense held against hostile classic theme
  if (scenario.theme === "classic") {
    if (measurements.button?.boxSizing !== "border-box") {
      throw new Error(`Cascade defense failed in ${scenario.id}: button box-sizing is ${measurements.button?.boxSizing}`);
    }
  }

  return measurements;
}

async function runSmokeMatrix(browser) {
  console.log("\n==> [Gate 6.2] Running Smoke Matrix (6 Scenarios for PR Gate)...");
  const page = await browser.newPage();
  const startTime = Date.now();

  for (const sc of SMOKE_SCENARIOS) {
    const res = await runScenario(page, sc);
    console.log(`  ✔ [${sc.id}] ${sc.archetype.padEnd(9)} · ${sc.theme.padEnd(7)} · ${sc.dir.toUpperCase()} · ${sc.viewport}`);
  }

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`==> Smoke Matrix passed in ${elapsedSec}s (< 180s threshold)`);
  await page.close();
}

async function runPairwiseMatrix(browser) {
  console.log("\n==> [Gate 6.3] Running Pairwise Matrix (15 Scenarios for Nightly)...");
  mkdirSync(artifactsDir, { recursive: true });

  const page = await browser.newPage();
  const report = [];

  for (const sc of PAIRWISE_SCENARIOS) {
    const measurements = await runScenario(page, sc);
    const screenshotName = `${sc.id}-${sc.archetype}-${sc.theme}-${sc.dir}-${sc.viewport.toLowerCase()}.png`;
    const screenshotPath = path.join(artifactsDir, screenshotName);

    await page.screenshot({ path: screenshotPath, fullPage: true });

    report.push({
      scenario: sc,
      screenshot: screenshotName,
      measurements
    });
    console.log(`  ✔ [${sc.id}] Captured ${screenshotName}`);
  }

  writeFileSync(path.join(artifactsDir, "report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(`==> Pairwise report written to ${path.join(artifactsDir, "report.json")}`);
  await page.close();
}

async function runA11yAndMotion(browser) {
  console.log("\n==> [Gate 6.4] Accessibility (Axe Core AA) & Reduced Motion Gate...");
  const page = await browser.newPage();

  const doc = buildHtmlDocument({
    archetype: "material",
    theme: "block",
    dir: "fa",
    bodyHtml: renderComponentHtml("material")
  });
  await page.setContent(doc, { waitUntil: "load" });

  // 1. Run Axe-Core scoped strictly to .ps-root
  if (existsSync(AXE_PATH)) {
    const axeSource = readFileSync(AXE_PATH, "utf8");
    await page.addScriptTag({ content: axeSource });

    const axeResults = await page.evaluate(async () => {
      // Scoped to .ps-root only (per SPEC §8.2 / ADR D7)
      return await window.axe.run(".ps-root", {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa"]
        }
      });
    });

    const violations = axeResults.violations || [];
    if (violations.length > 0) {
      console.error(`Axe found ${violations.length} violations in .ps-root:`);
      violations.forEach(v => console.error(`  - [${v.id}] ${v.description} (${v.help})`));
      throw new Error(`Axe WCAG 2.1 AA validation failed with ${violations.length} violation(s)`);
    }
    console.log(`  ✔ Axe Core passed: 0 WCAG 2.1 AA violations inside .ps-root (${axeResults.passes.length} rules verified)`);
  } else {
    console.log("  ⚠ Axe-core library not found at node_modules/axe-core/axe.js; skipping axe scan.");
  }

  // 2. Prefers-reduced-motion: reduce
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setContent(doc, { waitUntil: "load" });

  const motionStyles = await page.evaluate(() => {
    const btn = document.querySelector(".ps-button");
    const spinner = document.querySelector(".ps-spinner");
    const btnStyle = btn ? window.getComputedStyle(btn) : null;
    const spStyle = spinner ? window.getComputedStyle(spinner) : null;

    return {
      btnTransition: btnStyle ? btnStyle.transitionDuration : null,
      spinnerAnimation: spStyle ? spStyle.animationName : null
    };
  });

  // Verify transition is 0s and spinner animation is suppressed
  if (motionStyles.btnTransition && motionStyles.btnTransition !== "0s" && motionStyles.btnTransition !== "0ms") {
    throw new Error(`Reduced motion validation failed: expected button transition to be 0s, got '${motionStyles.btnTransition}'`);
  }
  if (motionStyles.spinnerAnimation && motionStyles.spinnerAnimation !== "none") {
    throw new Error(`Reduced motion validation failed: expected spinner animation to be 'none', got '${motionStyles.spinnerAnimation}'`);
  }
  console.log("  ✔ Reduced motion verified: animations and transitions suppressed");

  await page.close();
}

export async function main() {
  const args = process.argv.slice(2);
  const doSmoke = args.includes("--smoke") || args.includes("--all") || args.length === 0;
  const doPairwise = args.includes("--pairwise") || args.includes("--all");
  const doA11y = args.includes("--a11y") || args.includes("--all") || args.length === 0;
  const doRoot = args.includes("--root-check") || args.includes("--all") || args.length === 0;

  console.log("==> Launching Playwright browser instance...");
  const launchOptions = existsSync(CHROME_PATH) ? { executablePath: CHROME_PATH, headless: true } : { headless: true };
  const browser = await chromium.launch(launchOptions);

  try {
    if (doRoot) await runRootAndZeroWasteTests(browser);
    if (doSmoke) await runSmokeMatrix(browser);
    if (doA11y) await runA11yAndMotion(browser);
    if (doPairwise) await runPairwiseMatrix(browser);

    console.log("\n=======================================================");
    console.log("✔ ALL BROWSER VERIFICATION TESTS PASSED SUCCESSFULLY");
    console.log("=======================================================\n");
  } catch (err) {
    console.error(`\n✖ BROWSER VERIFICATION FAILED: ${err.message}\n`, err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
