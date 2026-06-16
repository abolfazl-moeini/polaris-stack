import * as esbuild from "esbuild";
import { readFileSync, writeFileSync, rmSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const isDev = process.argv.includes("--dev");
const outDir = "dist";

// Clean for reliable builds (no stale artifacts)
if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true, force: true });
}
mkdirSync(outDir, { recursive: true });

await esbuild.build({
  entryPoints: ["src/index.ts", "src/theme/script.ts"],
  outdir: outDir,
  format: "esm",
  platform: "neutral",
  target: "es2020",
  sourcemap: isDev,
  bundle: true,
  splitting: false,
  treeShaking: true,
  external: ["react", "react-dom"],
  loader: { ".css": "css" },
  outExtension: { ".js": ".js" },
});

const globalCss = [
  readFileSync("src/theme/tokens.css", "utf8"),
  readFileSync("src/theme/themes.css", "utf8"),
  readFileSync("src/theme/base.css", "utf8"),
  readFileSync("src/layout/layout.css", "utf8"),
  readFileSync("src/components/components.css", "utf8"),
].join("\n");
writeFileSync(path.join(outDir, "styles.css"), globalCss, "utf8");