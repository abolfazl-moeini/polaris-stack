import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stackRoot = path.join(__dirname, "..");
const repoRoot = path.join(stackRoot, "../..");
const manifestPath = path.join(stackRoot, "contract/components.manifest.json");
const schemaPath = path.join(stackRoot, "contract/components.schema.json");

const tsOutPath = path.join(stackRoot, "src/generated/classNames.ts");
const phpOutDir = path.join(repoRoot, "packages/framework/src/Chameleon/Generated");
const phpOutPath = path.join(phpOutDir, "ClassNames.php");

function validateManifest(manifest, schema) {
  const errors = [];
  const validNameRegex = /^ps-[a-z0-9]+(-[a-z0-9]+)*$/;

  if (!manifest.version) errors.push("Missing version");
  if (!manifest.components) errors.push("Missing components");

  for (const [name, comp] of Object.entries(manifest.components || {})) {
    if (!comp.rootClass || !validNameRegex.test(comp.rootClass)) {
      errors.push(`Invalid rootClass for component '${name}': ${comp.rootClass}`);
    }
    if (comp.rootClass.includes("--") || comp.rootClass.includes("ps-btn")) {
      errors.push(`Forbidden naming in component '${name}': ${comp.rootClass}`);
    }
    if (comp.parts) {
      for (const part of comp.parts) {
        if (!validNameRegex.test(part) || part.includes("--") || part.includes("ps-btn")) {
          errors.push(`Invalid part class in component '${name}': ${part}`);
        }
      }
    }
  }

  for (const [name, layout] of Object.entries(manifest.layouts || {})) {
    if (!layout.rootClass || !validNameRegex.test(layout.rootClass)) {
      errors.push(`Invalid rootClass for layout '${name}': ${layout.rootClass}`);
    }
  }

  for (const [name, island] of Object.entries(manifest.islands || {})) {
    if (!island.rootClass || !validNameRegex.test(island.rootClass)) {
      errors.push(`Invalid rootClass for island '${name}': ${island.rootClass}`);
    }
  }

  if (errors.length > 0) {
    console.error("Manifest validation failed:");
    errors.forEach((e) => console.error(" - " + e));
    process.exit(1);
  }
}

function toConstantName(str) {
  return str
    .replace(/^ps-/, "")
    .replace(/-/g, "_")
    .toUpperCase();
}

function generateContracts() {
  const rawManifest = readFileSync(manifestPath, "utf8");
  const manifest = JSON.parse(rawManifest);
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));

  validateManifest(manifest, schema);

  const manifestHash = createHash("sha256").update(rawManifest).digest("hex").slice(0, 16);

  // Collect all constants and mapping
  const constantMap = new Map();
  const componentCatalog = {};

  // 1. Components
  for (const [cName, comp] of Object.entries(manifest.components)) {
    constantMap.set(toConstantName(comp.rootClass), comp.rootClass);
    componentCatalog[cName] = {
      root: comp.rootClass,
      variants: {},
      parts: comp.parts || [],
      states: comp.states || [],
    };

    if (comp.variants) {
      for (const [axis, vals] of Object.entries(comp.variants)) {
        componentCatalog[cName].variants[axis] = [];
        for (const v of vals) {
          let cls = `${comp.rootClass}-${v}`;
          let constKey = `${toConstantName(comp.rootClass)}_${axis.toUpperCase()}_${toConstantName(v)}`;

          if (cName === "card" && axis === "elevation") {
            cls = `ps-card-elevation-${v}`;
            constKey = `CARD_ELEVATION_${v}`;
          } else if (cName === "card" && axis === "interactive") {
            cls = `ps-card-interactive`;
            constKey = `CARD_INTERACTIVE`;
          } else if (cName === "heading") {
            cls = `ps-heading-${v}`;
            constKey = `HEADING_${v}`;
          } else if (cName === "text") {
            if (axis === "size") {
              cls = `ps-text-${v}`;
              constKey = `TEXT_SIZE_${toConstantName(v)}`;
            } else if (axis === "weight") {
              cls = `ps-text-weight-${v}`;
              constKey = `TEXT_WEIGHT_${toConstantName(v)}`;
            } else if (axis === "tone") {
              cls = `ps-text-tone-${v}`;
              constKey = `TEXT_TONE_${toConstantName(v)}`;
            } else if (axis === "overflow") {
              cls = `ps-text-${v}`;
              constKey = `TEXT_${toConstantName(v)}`;
            }
          } else if (axis === "variant") {
            constKey = `${toConstantName(comp.rootClass)}_${toConstantName(v)}`;
          } else if (axis === "size") {
            constKey = `${toConstantName(comp.rootClass)}_SIZE_${toConstantName(v)}`;
          }

          constantMap.set(constKey, cls);
          componentCatalog[cName].variants[axis].push(cls);
        }
      }
    }

    if (comp.parts) {
      for (const p of comp.parts) {
        constantMap.set(toConstantName(p), p);
      }
    }

    if (comp.states) {
      for (const s of comp.states) {
        constantMap.set(toConstantName(s), s);
      }
    }
  }

  // 2. Layouts
  for (const [lName, layout] of Object.entries(manifest.layouts)) {
    constantMap.set(toConstantName(layout.rootClass), layout.rootClass);
    if (layout.modifiers) {
      for (const m of layout.modifiers) {
        constantMap.set(toConstantName(m), m);
      }
    }
  }

  // 3. Islands
  for (const [iName, island] of Object.entries(manifest.islands)) {
    constantMap.set(toConstantName(island.rootClass), island.rootClass);
    if (island.parts) {
      for (const p of island.parts) {
        constantMap.set(toConstantName(p), p);
      }
    }
    if (island.modifiers) {
      for (const m of island.modifiers) {
        constantMap.set(toConstantName(m), m);
      }
    }
  }

  // 4. Internal
  for (const intCls of manifest.internal || []) {
    constantMap.set(toConstantName(intCls), intCls);
  }

  // Generate TypeScript
  mkdirSync(path.dirname(tsOutPath), { recursive: true });
  const sortedConstants = [...constantMap.entries()].sort(([a], [b]) => a.localeCompare(b));

  const tsContent = `/**
 * GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: contract/components.manifest.json (hash: ${manifestHash})
 * Run: node packages/polaris-stack/tools/generate-contracts.mjs
 */

export const ClassNames = {
${sortedConstants.map(([k, v]) => `  ${k}: "${v}",`).join("\n")}
} as const;

export type ClassNameKey = keyof typeof ClassNames;
export type ClassNameValue = (typeof ClassNames)[ClassNameKey];
`;

  writeFileSync(tsOutPath, tsContent, "utf8");
  console.log(`==> TypeScript classNames written to: ${tsOutPath}`);

  // Generate PHP (PHP 7.4 compatible)
  mkdirSync(phpOutDir, { recursive: true });
  const phpConstants = sortedConstants
    .map(([k, v]) => `    public const ${k} = '${v}';`)
    .join("\n");

  function toPhpArray(val, indent = "    ") {
    if (Array.isArray(val)) {
      const items = val.map((item) => `${indent}    ${toPhpArray(item, indent + "    ")}`).join(",\n");
      return `[\n${items}\n${indent}]`;
    }
    if (val !== null && typeof val === "object") {
      const items = Object.entries(val)
        .map(([k, v]) => `${indent}    '${k}' => ${toPhpArray(v, indent + "    ")}`)
        .join(",\n");
      return `[\n${items}\n${indent}]`;
    }
    return `'${val}'`;
  }

  const phpCatalogStr = toPhpArray(componentCatalog);

  const phpContent = `<?php
/**
 * GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: contract/components.manifest.json (hash: ${manifestHash})
 * Run: node packages/polaris-stack/tools/generate-contracts.mjs
 *
 * @package WPDev\\Chameleon\\Generated
 */

namespace WPDev\\Chameleon\\Generated;

final class ClassNames {
${phpConstants}

    /**
     * Component taxonomy and rules catalog.
     *
     * @var array<string, mixed>
     */
    private static $catalog = ${phpCatalogStr};

    /**
     * Compose a standardized ps-* class string for a component.
     *
     * @param string $component Component name (e.g. 'button', 'card', 'badge').
     * @param array<string, string> $modifiers Modifier map (e.g. ['variant' => 'solid', 'size' => 'md']).
     * @param string $extra Additional classes (e.g. 'custom-wp-class').
     * @return string Validated class string.
     */
    public static function compose(string $component, array $modifiers = [], string $extra = ''): string {
        if (!isset(self::$catalog[$component])) {
            if (function_exists('_doing_it_wrong')) {
                _doing_it_wrong(__METHOD__, sprintf('Unknown Polaris component "%s"', esc_html($component)), '1.0.0');
            }
            return trim($extra);
        }

        $conf = self::$catalog[$component];
        $classes = [$conf['root']];

        foreach ($modifiers as $axis => $value) {
            if (!isset($conf['variants'][$axis])) {
                if (function_exists('_doing_it_wrong')) {
                    _doing_it_wrong(__METHOD__, sprintf('Unknown variant axis "%s" for component "%s"', esc_html($axis), esc_html($component)), '1.0.0');
                }
                continue;
            }

            $candidate = $conf['root'] . '-' . $value;
            // Handle specialized axes
            if ($component === 'card' && $axis === 'elevation') {
                $candidate = 'ps-card-elevation-' . $value;
            } elseif ($component === 'heading') {
                $candidate = 'ps-heading-' . $value;
            } elseif ($component === 'text') {
                if ($axis === 'weight') {
                    $candidate = 'ps-text-weight-' . $value;
                } elseif ($axis === 'tone') {
                    $candidate = 'ps-text-tone-' . $value;
                } else {
                    $candidate = 'ps-text-' . $value;
                }
            }

            if (in_array($candidate, $conf['variants'][$axis], true)) {
                $classes[] = $candidate;
            } elseif (function_exists('_doing_it_wrong')) {
                _doing_it_wrong(__METHOD__, sprintf('Invalid value "%s" for axis "%s" on component "%s"', esc_html($value), esc_html($axis), esc_html($component)), '1.0.0');
            }
        }

        if ($extra !== '') {
            $classes[] = trim($extra);
        }

        return implode(' ', array_filter($classes));
    }
}
`;

  writeFileSync(phpOutPath, phpContent, "utf8");
  console.log(`==> PHP ClassNames written to: ${phpOutPath}`);
}

generateContracts();
