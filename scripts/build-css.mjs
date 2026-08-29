import { readFileSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import postcss from "postcss";
import cssnano from "cssnano";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const CSS_FILES = [
  "src/theme/tokens.css",
  "src/theme/themes.css",
  "src/theme/base.css",
  "src/layout/layout.css",
  "src/components/components.css",
];

export async function buildStylesCss(outDir, options = {}) {
  const { minify = true, version = "1.0.0" } = options;

  // Bundle the stylesheets with esbuild: it inlines the @imports in source
  // order (keeping @layer/@supports/@media blocks intact) and emits a source
  // map that references the real src/**/*.css files.
  const entryFile = path.join(root, ".styles-entry.tmp.css");
  const bundleFile = path.join(outDir, ".styles-bundle.tmp.css");
  writeFileSync(
    entryFile,
    CSS_FILES.map((file) => `@import "./${file}";`).join("\n") + "\n",
    "utf8",
  );

  let result;
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
    // esbuild writes sources relative to the map location (outDir) — resolve
    // them to absolute paths so postcss re-relativizes them against the final
    // output location.
    prevMap.sources = prevMap.sources.map((source) =>
      path.resolve(outDir, source),
    );

    result = await postcss(
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
  } finally {
    rmSync(entryFile, { force: true });
    rmSync(bundleFile, { force: true });
    rmSync(`${bundleFile}.map`, { force: true });
  }

  const header = `/*! @wpdev/polaris-stack v${version} | MIT | layout/style separated design foundation */\n`;
  const mapRef = result.map ? "\n/*# sourceMappingURL=styles.css.map */\n" : "";

  writeFileSync(
    path.join(outDir, "styles.css"),
    header + result.css + mapRef,
    "utf8",
  );

  if (result.map) {
    const map = result.map.toJSON();
    // Ship relative sources (relative to the map location) so the build stays
    // reproducible across machines and the map is portable.
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