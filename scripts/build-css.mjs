import { readFileSync, writeFileSync, rmSync, existsSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import postcss from "postcss";
import cssnano from "cssnano";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function resolveBuildMeta(overrides = {}) {
  let sha = overrides.sha;
  if (!sha) {
    try {
      sha = execSync("git rev-parse --short HEAD", {
        cwd: root,
        stdio: ["ignore", "pipe", "ignore"],
      })
        .toString()
        .trim();
    } catch {
      // Not a git checkout (e.g. packed tarball) — stamp is informational.
      sha = "unknown";
    }
  }
  const builtAt = overrides.builtAt ?? new Date().toISOString();
  return { sha, builtAt };
}

const BASE_FILES = [
  "src/theme/tokens.css",
  "src/theme/themes.css",
  "src/theme/base.css",
  "src/layout/layout.css",
  "src/components/components.css",
  "src/components/islands.css",
];

async function compileLayeredCore(outDir, options = {}) {
  const { minify = true } = options;

  const entryLines = [
    '@import "./src/theme/layers.css";',
    '@import "./src/theme/harden.css";',
    ...BASE_FILES.map((file) => `@import "./${file}" layer(ps.base);`),
  ];

  const entryFile = path.join(root, ".styles-entry.tmp.css");
  const bundleFile = path.join(outDir, ".styles-bundle.tmp.css");
  writeFileSync(entryFile, entryLines.join("\n") + "\n", "utf8");

  try {
    await esbuild.build({
      entryPoints: [entryFile],
      outfile: bundleFile,
      bundle: true,
      write: true,
      minify: false,
      sourcemap: true,
      logLevel: "silent",
    });

    const combined = readFileSync(bundleFile, "utf8");
    const prevMap = JSON.parse(readFileSync(`${bundleFile}.map`, "utf8"));
    prevMap.sources = prevMap.sources.map((source) =>
      path.resolve(outDir, source),
    );

    const result = await postcss(
      minify
        ? [
            cssnano({
              preset: ["default", { discardComments: { removeAll: false } }],
            }),
          ]
        : [],
    ).process(combined, {
      from: bundleFile,
      to: path.join(outDir, "styles.css"),
      map: {
        prev: prevMap,
        inline: false,
        annotation: false,
        sourcesContent: true,
      },
    });

    return result;
  } finally {
    rmSync(entryFile, { force: true });
    rmSync(bundleFile, { force: true });
    rmSync(`${bundleFile}.map`, { force: true });
  }
}

export async function buildStylesCss(outDir, options = {}) {
  const { version = "1.0.0" } = options;
  const result = await compileLayeredCore(outDir, options);

  const { sha, builtAt } = resolveBuildMeta(options);
  const header = `/*! @wpdev/polaris-stack v${version}+${sha} @ ${builtAt} | MIT | layout/style separated design foundation */\n`;
  const mapRef = result.map ? "\n/*# sourceMappingURL=styles.css.map */\n" : "";

  writeFileSync(
    path.join(outDir, "styles.css"),
    header + result.css + mapRef,
    "utf8",
  );

  if (result.map) {
    const map = result.map.toJSON();
    map.sources = map.sources.map((source) =>
      path.isAbsolute(source) ? path.relative(outDir, source) : source,
    );
    writeFileSync(
      path.join(outDir, "styles.css.map"),
      JSON.stringify(map),
      "utf8",
    );
  }

  return result.css;
}

export async function compileScopedCore(outDir, options = {}) {
  const { minify = true } = options;

  // 1. Layered tokens + themes + base + harden
  const layeredEntryLines = [
    '@import "./src/theme/layers.css";',
    '@import "./src/theme/harden.css";',
    '@import "./src/theme/tokens.css" layer(ps.base);',
    '@import "./src/theme/themes.css" layer(ps.base);',
    '@import "./src/theme/base.css" layer(ps.base);',
  ];
  const layeredTmp = path.join(root, ".b-layered.tmp.css");
  const layeredBundle = path.join(outDir, ".b-layered.bundle.tmp.css");
  writeFileSync(layeredTmp, layeredEntryLines.join("\n") + "\n", "utf8");

  await esbuild.build({
    entryPoints: [layeredTmp],
    outfile: layeredBundle,
    bundle: true,
    write: true,
    minify: false,
    logLevel: "silent",
  });
  const layeredCss = readFileSync(layeredBundle, "utf8");
  rmSync(layeredTmp, { force: true });
  rmSync(layeredBundle, { force: true });

  // 2. Unlayered scoped components + layout + islands
  const scopedFiles = [
    "src/layout/layout.css",
    "src/components/components.css",
    "src/components/islands.css",
  ];
  const scopedTmp = path.join(root, ".b-scoped.tmp.css");
  const scopedBundle = path.join(outDir, ".b-scoped.bundle.tmp.css");
  writeFileSync(scopedTmp, scopedFiles.map((f) => `@import "./${f}";`).join("\n") + "\n", "utf8");

  await esbuild.build({
    entryPoints: [scopedTmp],
    outfile: scopedBundle,
    bundle: true,
    write: true,
    minify: false,
    logLevel: "silent",
  });
  const rawScopedCss = readFileSync(scopedBundle, "utf8");
  rmSync(scopedTmp, { force: true });
  rmSync(scopedBundle, { force: true });

  // Prefix selector plugin: prepends .ps-root to all component rules
  const prefixPlugin = {
    postcssPlugin: "postcss-prefix-scoped",
    Rule(rule) {
      if (rule.parent && rule.parent.type === "atrule" && rule.parent.name === "keyframes") return;
      rule.selectors = rule.selectors.map((sel) => {
        sel = sel.trim();
        if (sel === ":root" || sel === "body" || sel === "html") return sel;
        if (sel.startsWith(".ps-root") || sel.includes(".ps-root")) return sel;
        return `.ps-root ${sel}`;
      });
    },
  };

  const plugins = [prefixPlugin];
  if (minify) {
    plugins.push(cssnano({ preset: ["default", { discardComments: { removeAll: false } }] }));
  }

  const prefixedResult = await postcss(plugins).process(rawScopedCss, { from: scopedBundle });
  return layeredCss + "\n\n/* Scoped Unlayered Components (Option B) */\n" + prefixedResult.css;
}

export async function buildChameleonStyles(outDir, options = {}) {
  const { version = "1.0.0", cascade = "scoped" } = options;
  const { sha, builtAt } = resolveBuildMeta(options);
  const header = `/*! @wpdev/polaris-stack v${version}+${sha} @ ${builtAt} | MIT | chameleon engine */\n`;

  // 1. Build polaris-core.css (Default: Option B Scoped)
  let coreContent;
  if (cascade === "layered") {
    const result = await compileLayeredCore(outDir, options);
    coreContent = header + result.css + "\n";
  } else {
    const scopedCss = await compileScopedCore(outDir, options);
    coreContent = header + scopedCss + "\n";
  }
  writeFileSync(path.join(outDir, "polaris-core.css"), coreContent, "utf8");

  // 2. Build archetypes/*.css
  const archetypesSrcDir = path.join(root, "src/styles/archetypes");
  const archetypesOutDir = path.join(outDir, "archetypes");
  mkdirSync(archetypesOutDir, { recursive: true });

  const archetypes = ["flat.css", "material.css", "glass.css", "brutalist.css", "cupertino.css"];
  for (const file of archetypes) {
    const filePath = path.join(archetypesSrcDir, file);
    if (existsSync(filePath)) {
      const srcCss = readFileSync(filePath, "utf8");
      const processed = (options.minify ?? true)
        ? (await postcss([cssnano({ preset: ["default", { discardComments: { removeAll: false } }] })]).process(srcCss, { from: filePath })).css
        : srcCss;
      writeFileSync(path.join(archetypesOutDir, file), header + processed, "utf8");
    }
  }
}

export async function buildCascadeTwin(outBaseDir = path.join(root, "dist-cascade"), options = {}) {
  const dirA = path.join(outBaseDir, "A");
  const dirB = path.join(outBaseDir, "B");
  mkdirSync(dirA, { recursive: true });
  mkdirSync(dirB, { recursive: true });

  // Option A (Layered)
  await buildChameleonStyles(dirA, { ...options, cascade: "layered", minify: false });

  // Option B (Scoped)
  await buildChameleonStyles(dirB, { ...options, cascade: "scoped", minify: false });
}