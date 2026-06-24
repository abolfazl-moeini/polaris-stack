import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

  const sources = CSS_FILES.map((file) => ({
    file,
    content: readFileSync(path.join(root, file), "utf8"),
  }));

  const combined = sources.map((s) => s.content).join("\n");

  const plugins = minify
    ? [
        cssnano({
          preset: [
            "default",
            {
              discardComments: { removeAll: false },
            },
          ],
        }),
      ]
    : [];

  const result = await postcss(plugins).process(combined, {
    from: undefined,
    to: path.join(outDir, "styles.css"),
    map: minify
      ? false
      : {
          inline: false,
          sourcesContent: true,
        },
  });

  const header = `/*! @wpdev/polaris-stack v${version} | MIT | layout/style separated design foundation */\n`;
  const mapRef = result.map ? "\n/*# sourceMappingURL=styles.css.map */\n" : "";

  writeFileSync(path.join(outDir, "styles.css"), header + result.css + mapRef, "utf8");

  if (result.map) {
    writeFileSync(
      path.join(outDir, "styles.css.map"),
      result.map.toString(),
      "utf8",
    );
  }

  return result.css;
}