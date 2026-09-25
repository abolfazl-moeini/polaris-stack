import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function fail(message) {
  process.stderr.write(message + "\n");
  process.exit(1);
}

function readJson(file) {
  if (!existsSync(file)) {
    fail("Missing file: " + file);
  }
  return JSON.parse(readFileSync(file, "utf8"));
}

function isList(value) {
  return Array.isArray(value) && value.every((item) => item && typeof item === "object");
}

function mergeBySlug(existing, incoming, { sizeKey }) {
  const map = new Map();
  for (const item of existing) {
    if (item && item.slug) map.set(item.slug, item);
  }
  for (const item of incoming) {
    if (!item || !item.slug || map.has(item.slug)) continue;
    map.set(item.slug, item);
  }
  return Array.from(map.values()).map((item) => {
    if (sizeKey && item[sizeKey] === undefined && item.size) return item;
    return item;
  });
}

export function themeTokenEntries(tokens, group, sizeKey) {
  return Object.entries(tokens[group] || {}).map(([slug, item]) => {
    const entry = {
      slug,
      name: slug.charAt(0).toUpperCase() + slug.slice(1),
    };
    entry[sizeKey] = item.$value;
    return entry;
  });
}

export function mergeTheme(themeJson, tokens) {
  const next = structuredClone(themeJson);
  next.settings = next.settings || {};
  next.settings.color = next.settings.color || {};
  next.settings.spacing = next.settings.spacing || {};
  const palette = Array.isArray(next.settings.color.palette) ? next.settings.color.palette : [];
  const spacing = Array.isArray(next.settings.spacing.spacingSizes) ? next.settings.spacing.spacingSizes : [];
  const radius = next.settings.border && Array.isArray(next.settings.border.radiusSizes)
    ? next.settings.border.radiusSizes
    : [];
  next.settings.color.palette = mergeBySlug(palette, themeTokenEntries(tokens, "color", "color"), { sizeKey: "color" });
  next.settings.spacing.spacingSizes = mergeBySlug(spacing, themeTokenEntries(tokens, "spacing", "size"), { sizeKey: "size" });
  next.settings.border = next.settings.border || {};
  next.settings.border.radiusSizes = mergeBySlug(radius, themeTokenEntries(tokens, "radius", "size"), { sizeKey: "size" });
  return next;
}

function cssBlock(tokens) {
  const lines = ["/* wpdev-design-tokens:start */"];
  for (const [slug, item] of Object.entries(tokens.color || {})) {
    lines.push(`  --ps-color-${slug}: ${item.$value};`);
  }
  for (const [slug, item] of Object.entries(tokens.spacing || {})) {
    lines.push(`  --ps-space-${slug}: ${item.$value};`);
  }
  for (const [slug, item] of Object.entries(tokens.radius || {})) {
    lines.push(`  --ps-radius-${slug}: ${item.$value};`);
  }
  lines.push("/* wpdev-design-tokens:end */");
  return lines.join("\n");
}

function writeMarked(file, block) {
  const current = existsSync(file) ? readFileSync(file, "utf8") : ":root {\n}\n";
  const start = "/* wpdev-design-tokens:start */";
  const end = "/* wpdev-design-tokens:end */";
  if (current.includes(start) && current.includes(end)) {
    const pattern = /\/\* wpdev-design-tokens:start \*\/[\s\S]*\/\* wpdev-design-tokens:end \*\//;
    writeFileSync(file, current.replace(pattern, block));
    return;
  }
  writeFileSync(file, current.replace(/\}\s*$/, "\n" + block + "\n}\n"));
}

function writeTypes(file, tokens) {
  const colors = Object.keys(tokens.color || {});
  const spacing = Object.keys(tokens.spacing || {});
  const radius = Object.keys(tokens.radius || {});
  const body = [
    "export type DesignTokenColor = " + colors.map((item) => JSON.stringify(item)).join(" | ") + ";",
    "export type DesignTokenSpacing = " + spacing.map((item) => JSON.stringify(item)).join(" | ") + ";",
    "export type DesignTokenRadius = " + radius.map((item) => JSON.stringify(item)).join(" | ") + ";",
    "",
  ].join("\n");
  writeFileSync(file, body);
}

export function buildTokens(argv = process.argv.slice(2)) {
  const tokensPath = path.join(root, "tokens.json");
  const tokens = readJson(tokensPath);
  for (const group of ["color", "spacing", "radius"]) {
    for (const [slug, item] of Object.entries(tokens[group] || {})) {
      if (!item || typeof item.$value !== "string" || typeof item.$type !== "string") {
        fail("Invalid internal token " + group + "." + slug);
      }
    }
  }
  writeMarked(path.join(root, "src/theme/tokens.css"), cssBlock(tokens));
  writeTypes(path.join(root, "src/theme/tokens.d.ts"), tokens);

  const themeFlag = argv.indexOf("--theme");
  if (themeFlag === -1) {
    return { merged: false };
  }
  const themePath = argv[themeFlag + 1];
  if (!themePath) {
    fail("Missing path after --theme");
  }
  const resolved = path.resolve(themePath);
  if (!existsSync(resolved)) {
    fail("Missing file: " + resolved);
  }
  const theme = readJson(resolved);
  const merged = mergeTheme(theme, tokens);
  if (!isList(merged.settings.color.palette)) {
    fail("Theme palette merge did not produce a list");
  }
  writeFileSync(resolved, JSON.stringify(merged, null, "\t") + "\n");
  return { merged: true, theme: resolved };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildTokens();
}
