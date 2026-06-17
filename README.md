# @wpdev/polaris-stack

Polaris Stack is a lightweight design foundation that separates **layout** (spacing, flow, grids) from **style** (colors, typography, themes).

## Install

Inside a wp-starter-kit project, Polaris is copied to `src/polaris/` by the `wpdev` installer (`--frontend-stack=polaris`).

As a workspace package:

```ts
import "@wpdev/polaris-stack/styles.css";
import { Button, Card, Stack, setPolarisTheme } from "@wpdev/polaris-stack";
```

You can also import the theme script without components or CSS:

```ts
import { createPolarisThemeInitScript, setPolarisTheme } from "@wpdev/polaris-stack/theme-script";
```

## Exports

- `@wpdev/polaris-stack` — all layout primitives + styled components + theme functions + types.
- `@wpdev/polaris-stack/styles.css` — the single global stylesheet (tokens + themes + base + layout + component rules). Import once.
- `@wpdev/polaris-stack/theme-script` — theme utilities only (no React, safe for inline scripts).

## Layout primitives

`Box`, `Stack`, `Cluster`, `Center`, `Grid`, `Sidebar`, `Switcher`.

All accept `as`, `className`, `children`, and a small set of spacing props (`gap`, `p*` etc). They set only layout CSS variables inline and rely on global `.ps-*` rules.

## Styled components

`Button` (variants: solid | soft | ghost), `Card`, `Text`, `Heading` (semantic h1–h6 via `level`).

These set colors, radii, shadows, typography using tokens only. Do not pass layout props to them.

## Theme switching

```ts
import { setPolarisTheme, createPolarisThemeInitScript } from "@wpdev/polaris-stack";

setPolarisTheme("dark"); // or "light" | "system"

// For FOUC-free SSR: output early in <head>
const init = createPolarisThemeInitScript({ defaultTheme: "system" });
// <script dangerouslySetInnerHTML={{ __html: init }} />
```

Themes are driven by `[data-theme="dark"]` on `<html>` and CSS custom properties (`--ps-*`).

## Layout vs style (core rule)

- Layout primitives control flow, alignment, spacing via props + CSS vars.
- Styled components never accept or apply spacing/layout props.
- Wrap styled components in `Stack` / `Cluster` etc. when spacing is needed.

## Do not do this

```tsx
// Wrong — mixing layout into a styled component API
<Card mt="8" gridColumn="1 / 3">...</Card>

// Wrong — hardcoded colors in components
<div style={{ color: "#2563eb" }}>...</div>
```

## React and Preact

Write framework-neutral TSX using the automatic JSX runtime (no `import React`, no pragma). The host chooses Preact (via `react` → `@preact/compat` alias) or real React.

See the kit docs for alias setup.
