import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Forbidden WordPress packages in public frontend bundles (SPEC §6, Plan 7, ADR D10).
 * Bundling heavy admin UI/data packages into consumer storefronts is disallowed.
 */
export const FORBIDDEN_PACKAGES = [
  "@wordpress/components",
  "@wordpress/ui",
  "@wordpress/preferences",
  "@wordpress/block-editor",
  "@wordpress/editor",
  "@wordpress/data",
];

/**
 * Standard WordPress core package mappings to runtime globals and script handles.
 */
export const WP_GLOBAL_MAPPINGS = {
  "@wordpress/i18n": {
    global: "window.wp.i18n",
    handle: "wp-i18n",
  },
  "@wordpress/api-fetch": {
    global: "window.wp.apiFetch",
    handle: "wp-api-fetch",
  },
  "@wordpress/url": {
    global: "window.wp.url",
    handle: "wp-url",
  },
  "@wordpress/hooks": {
    global: "window.wp.hooks",
    handle: "wp-hooks",
  },
  "@wordpress/dom-ready": {
    global: "window.wp.domReady",
    handle: "wp-dom-ready",
  },
  "@wordpress/a11y": {
    global: "window.wp.a11y",
    handle: "wp-a11y",
  },
};

/**
 * Zero-dependency esbuild plugin for WordPress externals & *.asset.php generation.
 *
 * Features:
 * - Deterministic mapping of @wordpress/* to window.wp.* globals
 * - Fatal build failure when forbidden admin packages are imported
 * - Support for both IIFE and ESM (with @wordpress/interactivity marked external)
 * - Automatic generation of matching *.asset.php containing sorted dependencies and content hash
 *
 * @param {Object} options
 * @param {Array<string>} [options.forbiddenPackages]
 * @param {Record<string, {global: string, handle: string}>} [options.extraMappings]
 * @param {boolean} [options.writeAssetPhp=true]
 * @return {import('esbuild').Plugin}
 */
export function wpExternalsPlugin(options = {}) {
  const forbidden = options.forbiddenPackages || FORBIDDEN_PACKAGES;
  const mappings = {
    ...WP_GLOBAL_MAPPINGS,
    ...(options.extraMappings || {}),
  };
  const writeAssetPhp = options.writeAssetPhp !== false;

  return {
    name: "wp-externals",
    setup(build) {
      // Force metafile so we can accurately inspect inputs/imports per output file in onEnd
      build.initialOptions.metafile = true;

      const format = build.initialOptions.format || "esm";

      // 1. Intercept Forbidden Packages
      const forbiddenFilter = new RegExp(
        `^(${forbidden.map((pkg) => pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(/.*)?$`
      );
      build.onResolve({ filter: forbiddenFilter }, (args) => {
        throw new Error(
          `[esbuild-wp-externals] FATAL: Forbidden package "${args.path}" imported in "${args.importer || "entry"}". Public frontend bundles MUST NOT import heavy admin components (SPEC §6, Plan 7, ADR D10).`
        );
      });

      // 2. Intercept Interactivity API
      build.onResolve({ filter: /^@wordpress\/interactivity(\/.*)?$/ }, (args) => {
        if (format === "esm") {
          return { path: args.path, external: true };
        }
        return {
          path: args.path,
          namespace: "wp-externals",
        };
      });

      // 3. Intercept Mapped WordPress Core Packages
      const mappedFilter = new RegExp(
        `^(${Object.keys(mappings).map((pkg) => pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})$`
      );
      build.onResolve({ filter: mappedFilter }, (args) => {
        return {
          path: args.path,
          namespace: "wp-externals",
        };
      });

      // 4. Load Virtual Modules for Global References
      build.onLoad({ filter: /.*/, namespace: "wp-externals" }, (args) => {
        if (args.path === "@wordpress/interactivity") {
          return {
            contents: "module.exports = (typeof window !== 'undefined' && window.wp && window.wp.interactivity) ? window.wp.interactivity : {};",
            loader: "js",
          };
        }

        const mapping = mappings[args.path];
        if (!mapping) {
          throw new Error(`[esbuild-wp-externals] Unknown mapped package "${args.path}"`);
        }

        // Using module.exports allows esbuild to synthesize both default and named imports seamlessly.
        // Guard against SSR / Node environments where window or window.wp is not defined.
        return {
          contents: `module.exports = (typeof window !== 'undefined' && window.wp && ${mapping.global}) ? ${mapping.global} : {};`,
          loader: "js",
        };
      });

      // 5. Generate *.asset.php on build completion
      build.onEnd(async (result) => {
        if (!writeAssetPhp || !result.metafile || result.errors.length > 0) {
          return;
        }

        const outputs = result.metafile.outputs;
        for (const [outPath, meta] of Object.entries(outputs)) {
          // Only process JavaScript bundle files
          if (!outPath.endsWith(".js")) {
            continue;
          }

          const deps = new Set();

          // Check virtual module inputs
          if (meta.inputs) {
            for (const inputPath of Object.keys(meta.inputs)) {
              if (inputPath.startsWith("wp-externals:")) {
                const pkg = inputPath.replace(/^wp-externals:/, "");
                if (pkg === "@wordpress/interactivity") {
                  deps.add("@wordpress/interactivity");
                } else if (mappings[pkg]) {
                  deps.add(mappings[pkg].handle);
                }
              }
            }
          }

          // Check external imports (e.g. @wordpress/interactivity in ESM mode)
          if (meta.imports) {
            for (const imp of meta.imports) {
              if (imp.path === "@wordpress/interactivity") {
                deps.add("@wordpress/interactivity");
              } else if (mappings[imp.path]) {
                deps.add(mappings[imp.path].handle);
              }
            }
          }

          // Sort dependencies alphabetically
          const sortedDeps = Array.from(deps).sort();

          // Calculate content hash of the output file
          let hash = "";
          const resolvedOutPath = path.isAbsolute(outPath)
            ? outPath
            : path.resolve(process.cwd(), outPath);

          if (fs.existsSync(resolvedOutPath)) {
            const content = fs.readFileSync(resolvedOutPath);
            hash = crypto.createHash("md5").update(content).digest("hex").slice(0, 16);
          } else if (result.outputFiles) {
            const matchedFile = result.outputFiles.find(
              (f) => path.normalize(f.path) === path.normalize(resolvedOutPath)
            );
            if (matchedFile) {
              hash = crypto.createHash("md5").update(matchedFile.contents).digest("hex").slice(0, 16);
            }
          }

          // Build PHP asset array
          const phpDepsArray = sortedDeps.map((d) => `'${d}'`).join(", ");
          const assetContent = `<?php return array('dependencies' => array(${phpDepsArray}), 'version' => '${hash}');\n`;

          const assetPath = resolvedOutPath.replace(/\.js$/, ".asset.php");
          fs.writeFileSync(assetPath, assetContent, "utf8");
        }
      });
    },
  };
}

export default wpExternalsPlugin;
