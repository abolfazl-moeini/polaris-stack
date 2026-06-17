# Polaris Stack — Context for AI Agents

> Reference document for agents working inside `wp-starter-kit/packages/polaris-stack/`.

This file consolidates the essential rules and decisions from the original planning documents (`idea.md`, `v1.md`, `integrate.md`) that lived in the parent `PolarisStack/` folder. Treat this as the primary source of truth when editing the package.

---

## 1. Core Principle

**Layout and visual styling MUST be completely separated.**

Definitions:
- **Layout**: spacing, stacking, alignment, grids, sizing, flow. Controlled only by layout primitives.
- **Style**: colors, typography, borders, shadows, radii, backgrounds, visual variants.

Rules:
- A layout component must **never** set colors, backgrounds, fonts, borders, or shadows.
- A styled component must **never** accept or apply layout/spacing props (`gap`, `p`, `mt`, `gridColumn`, etc.).
- When spacing is needed around a styled component, wrap it in a layout primitive.

---

## 2. Technical Foundations (v1)

### 2.1 Theming via CSS Custom Properties only
- All design tokens live as `--ps-*` CSS variables.
- Light theme in `:root`.
- Dark theme overrides under `[data-theme="dark"]`.
- Switching is done by setting `document.documentElement.dataset.theme`.
- Zero React re-renders. SSR-safe. No `ThemeProvider` or context in v1.

### 2.2 Styling = Global BEM (Path B)
- Current approach: global CSS with `ps-` prefix (`.ps-stack`, `.ps-button-solid`, `.ps-card`).
- Single public stylesheet: `dist/styles.css` (tokens + themes + base + layout + components).
- Consumers import it once: `import "@wpdev/polaris-stack/styles.css";`
- No `*.module.css` in v1. No CSS Modules plugin required.

### 2.3 Layout Primitives (Every Layout / Bedrock style)
- Components: `Box`, `Stack`, `Cluster`, `Center`, `Grid`, `Sidebar`, `Switcher`.
- Use **logical properties** only: `padding-block`, `padding-inline`, `inline-size`, `max-inline-size`, etc.
- Use relative units: `rem`, `em`, `ch`, `%`, `fr`. No `px` for layout decisions.
- Inline style is **only** allowed to set `--ps-*` custom properties (via `StyleWithVars`).

### 2.4 No Runtime CSS-in-JS
- Do not use emotion, styled-components, stitches, or equivalent.
- All styling is static CSS. No `<style>` tags generated at runtime.

### 2.5 React + Preact Compatibility
- Write source using automatic JSX runtime (`jsx: "react-jsx"`).
- `import type { ElementType, ReactNode, ... } from "react";` (types only).
- No `import React`, no `/** @jsx h */` pragmas in source files.
- The consuming environment chooses the runtime:
  - Inside wp-starter-kit: `react` is aliased to `@preact/compat` via package.json.
  - Real React projects install `react` normally.
- Return types for components should be `ReactElement` (for clean `.d.ts` output).

---

## 3. Token Naming Convention

All tokens use the `--ps-` prefix:

```css
--ps-color-bg, --ps-color-fg, --ps-color-muted, --ps-color-border,
--ps-color-primary, --ps-color-primary-fg, --ps-color-soft, ...

--ps-font-body, --ps-font-heading

--ps-space-0, --ps-space-1, --ps-space-2, --ps-space-3,
--ps-space-4, --ps-space-6, --ps-space-8

--ps-size-content, --ps-size-wide

--ps-radius-1, --ps-radius-2

--ps-shadow-1, --ps-shadow-2
```

Layout primitives reference spacing via `spaceVar("4")` → `var(--ps-space-4)` and set it as `--ps-gap` etc.

---

## 4. Public API Shape

```ts
// Main entry
export * from "./theme";
export * from "./layout";
export * from "./components";

// Theme script (usable without React)
export {
  setPolarisTheme,
  getStoredPolarisTheme,
  resolvePolarisTheme,
  createPolarisThemeInitScript,
} from "./theme/script";

export type PolarisTheme = "light" | "dark" | "system";
```

Exports map in `package.json`:
- `.` → components + layout + theme
- `./styles.css`
- `./theme-script`

---

## 5. Layout Component Contracts

Shared:
```ts
type Space = "0" | "1" | "2" | "3" | "4" | "6" | "8";

type BaseLayoutProps = {
  as?: ElementType;
  className?: string;
  children?: ReactNode;
  style?: StyleWithVars;   // only for --ps-* vars
};
```

Per-primitive (only the documented props):
- `Box`: `p`, `px`, `py`, `pt`, `pr`, `pb`, `pl`
- `Stack`: `gap`
- `Cluster`: `gap`, `justify`, `align`
- `Center`: `max`, `gutters`
- `Grid`: `gap`, `min`
- `Sidebar`: `gap`, `side`, `sideWidth`, `contentMin`
- `Switcher`: `gap`, `threshold`, `limit`

Implementation rules:
- Always destructure layout-specific props.
- Use `cx("ps-xxx", className)`.
- Set CSS vars via inline style using `StyleWithVars` + `spaceVar`.
- Spread only the remaining `...rest` (valid DOM props).

---

## 6. Styled Components (v1)

Only these exist:
- `Button` — variants: `solid` | `soft` | `ghost`. Renders real `<button type="button">`.
- `Card`
- `Text` — polymorphic via `as`
- `Heading` — `level` prop (1–6) renders real `h1`–`h6`

Rules:
- May only set visual/typographic properties.
- Must forward standard accessibility props (`disabled`, `aria-*`, etc.).
- Use tokens exclusively via `var(--ps-...)`.
- `Heading` must produce semantic heading elements.

---

## 7. Theme Script

```ts
setPolarisTheme(theme: PolarisTheme, storageKey?: string): void;
getStoredPolarisTheme(storageKey?: string): PolarisTheme | null;
resolvePolarisTheme(theme: PolarisTheme): "light" | "dark";
createPolarisThemeInitScript(options?: {
  storageKey?: string;
  defaultTheme?: PolarisTheme;
}): string;   // returns inline-safe <script> body
```

- The init script must run before paint (typically via `wp_head` inline script or early in entry).
- Storage key default: `"polaris-theme"`.
- `"system"` respects `prefers-color-scheme`.

---

## 8. Package Structure (do not deviate)

```
packages/polaris-stack/
├── package.json
├── tsconfig.json
├── build.config.mjs          # esbuild (JS) + manual concat of global CSS
├── react.d.ts                # kit-only type bridge (never shipped)
├── src/
│   ├── index.ts
│   ├── theme/{index.ts, tokens.css, themes.css, base.css, script.ts, types.ts}
│   ├── layout/{index.ts, types.ts, layout.css, Box.tsx ... Switcher.tsx}
│   ├── components/{index.ts, components.css, Button.tsx, Card.tsx, Text.tsx, Heading.tsx}
│   └── utilities/{cx.ts, props.ts}
├── dist/                     # produced by build
└── README.md
```

- `build.config.mjs` builds two entries (`src/index.ts`, `src/theme/script.ts`) + concatenates all CSS into `dist/styles.css`.
- Always run `node build.config.mjs && tsc --emitDeclarationOnly --outDir dist` for a full build.
- `sideEffects: ["**/*.css"]` in package.json.

---

## 9. Rules for AI Agents

1. **Never mix layout and style.** If a change touches both concerns, split it.
2. Prefer editing the global `.css` files + the component that sets the var. Keep them in sync.
3. Use `StyleWithVars` (not plain `CSSProperties`) for any style prop that may carry `--ps-*`.
4. All new layout primitives must follow the existing `cx` + var-setting pattern and update `layout.css`.
5. Theme tokens must be defined in both light and dark.
6. When you change source, the generator in `@wpdev/create-wp-project` will pick it up dynamically via `_polaris-template.js` (it walks `src/` at generation time).
7. Tests live outside this package at `../../tests/packages/polaris-stack/`. Run from the wp-starter-kit root.
8. Keep the package framework-neutral. Do not add Preact-specific or React-specific imports in source.
9. `react.d.ts` is a build-time shim for the kit only — do not copy it into generated projects.

---

## 10. Relationship to the Rest of the Kit

- This package is the **implementation** of the Polaris design foundation.
- It is optionally copied into generated plugins under `src/polaris/` (see `frontendStack` generator).
- Generated projects also get a `PolarisDemo` module as a usage example.
- The kit's esbuild pipeline (`wpdev-build-components`) discovers and builds entries that import from the copied `polaris/` folder.
- Do not add dependencies to this package unless they are peer (React is optional peer only).

---

## 11. Non-Goals (v1)

- No responsive array props (use intrinsic container-based responsiveness).
- No `sx` prop or full theme object.
- No complex interactive components (Dialog, Menu, etc.).
- No Tailwind. Polaris conflicts with `css=tailwind`.
- TypeScript only.

For historical phased implementation plans, the original documents were located in `../../PolarisStack/` before being consolidated here.
