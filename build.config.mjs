import * as esbuild from "esbuild";
import { readFileSync, rmSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildStylesCss } from "./scripts/build-css.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.argv.includes("--dev");
const outDir = path.join(__dirname, "dist");

const pkg = JSON.parse(
  readFileSync(path.join(__dirname, "package.json"), "utf8"),
);

if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true, force: true });
}
mkdirSync(outDir, { recursive: true });

await esbuild.build({
  entryPoints: [
    "src/index.ts",
    "src/layout/index.ts",
    "src/components/index.ts",
    "src/theme/index.ts",
    "src/theme/script.ts",
  ],
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

await buildStylesCss(outDir, {
  minify: !isDev,
  version: pkg.version,
});