# @wpdev/polaris-stack

Polaris Stack is a lightweight design foundation that separates **layout** (spacing, flow, grids) from **style** (colors, typography, themes).

## Install

```bash
npm install @wpdev/polaris-stack
```

## Consumed two ways

1. **npm package** — install in any TypeScript + React/Preact project.
2. **Copied source** — wp-starter-kit scaffolds with `frontendStack: polaris` and copies this package into `src/polaris/`. The kit esbuild pipeline walks `src/` at build time.

Both paths must work. Do not add build steps that only run in one path.

## Usage

```ts
import "@wpdev/polaris-stack/styles.css";
import { Button, Card, Stack, setPolarisTheme } from "@wpdev/polaris-stack";
```

Subpath imports:

```ts
import { Stack } from "@wpdev/polaris-stack/layout";
import { Button } from "@wpdev/polaris-stack/components";
import { setPolarisTheme } from "@wpdev/polaris-stack/theme";
import { createPolarisThemeInitScript } from "@wpdev/polaris-stack/theme-script";
```

Wrap admin UI in `.ps-scope` so base typography does not clobber WordPress admin `body` styles:

```tsx
<div className="ps-scope">
  <Stack gap="4">...</Stack>
</div>
```

## Exports

- `@wpdev/polaris-stack` — all layout primitives + styled components + theme functions + types.
- `@wpdev/polaris-stack/styles.css` — single global stylesheet (tokens + themes + base + layout + components). Import once.
- `@wpdev/polaris-stack/layout` — layout primitives only.
- `@wpdev/polaris-stack/components` — styled components only.
- `@wpdev/polaris-stack/theme` — theme utilities (includes React-free script re-exports).
- `@wpdev/polaris-stack/theme-script` — theme utilities only (no React, safe for inline scripts).

## Layout primitives

`Box`, `Stack`, `Cluster`, `Center`, `Container`, `Grid`, `Sidebar`, `Switcher`, `Divider`, `Cover`, `Frame`, `Reel`, `Imposter`.

All accept `as`, `className`, `children`, and spacing props (`gap`, `p*`, etc.). They set only layout CSS variables inline and rely on global `.ps-*` rules.

## Styled components

`Button`, `IconButton`, `Card`, `Text`, `Heading`, `Badge`, `Alert`, `Spinner`, `Kbd`.

These set colors, radii, shadows, typography using tokens only. Do not pass layout props to them.

## Tokens

All design tokens are `--ps-*` CSS custom properties in `styles.css`.

| Category | Examples |
|----------|----------|
| Colors | `--ps-color-bg`, `--ps-color-primary`, `--ps-color-danger` |
| Spacing | `--ps-space-1` … `--ps-space-8` |
| Typography | `--ps-font-body`, `--ps-font-heading`, `--ps-font-mono` |
| Elevation | `--ps-shadow-1` … `--ps-shadow-4` |
| Z-index | `--ps-z-dropdown`, `--ps-z-modal`, `--ps-z-toast` |

### Overriding tokens

Rebrand by overriding variables on a wrapper or `:root`:

```css
.ps-scope {
  --ps-color-primary: #7c3aed;
  --ps-color-primary-fg: #ffffff;
}
```

Never set `background-color` or `color` directly on Polaris components — override the token instead so dark mode and high-contrast themes keep working.

## Dark mode

```ts
import { setPolarisTheme, subscribePolarisTheme } from "@wpdev/polaris-stack";

setPolarisTheme("dark"); // "light" | "dark" | "system" | "hc" | "brand"

subscribePolarisTheme((resolved) => {
  console.log(resolved); // follows OS when stored preference is "system"
});
```

Themes are driven by `[data-theme]` on `<html>` and CSS custom properties. No `ThemeProvider`, no React context, no re-renders.

## FOUC / SSR

Inject the init script in `<head>` **before** the stylesheet, or the first paint flashes light theme:

```ts
const init = createPolarisThemeInitScript({ defaultTheme: "system" });
// <script dangerouslySetInnerHTML={{ __html: init }} />
// then <link rel="stylesheet" href="styles.css" />
```

The init script is ES5-safe (`var`, no imports) for inline use in WordPress `wp_head`.

## RTL

Layout primitives use logical properties (`padding-inline`, `margin-block`, `inline-size`). They work in RTL without extra props. Wrap content in `dir="rtl"` as usual.

## Accessibility

- `Button` / `IconButton` use `:focus-visible` outlines that contrast in light and dark themes.
- `Spinner` exposes `role="status"` and `aria-label`.
- `Alert` defaults to `role="status"`.
- `Card` with `interactive` is keyboard-focusable (`tabIndex={0}`).
- Animations respect `prefers-reduced-motion`.
- Windows High Contrast / `forced-colors: active` remaps tokens to system colors.

## Layout vs style (core rule)

- Layout primitives control flow, alignment, spacing via props + CSS vars.
- Styled components never accept or apply spacing/layout props.
- Wrap styled components in `Stack` / `Cluster` etc. when spacing is needed.

## What's not here

- No Tailwind (conflicts with Polaris token model).
- No `ThemeProvider` / React context for theme.
- No runtime CSS-in-JS (`emotion`, `styled-components`, etc.).
- No `sx` prop or theme object in TypeScript.
- No interactive widgets (`Dialog`, `Menu`, `Tabs`, etc.) — primitives + styled surfaces only.
- No responsive array props — use intrinsic layout (Grid, Switcher, Reel) instead.

## React and Preact

Write framework-neutral TSX using the automatic JSX runtime. The host chooses Preact (`react` → `@preact/compat` alias) or real React.

## API

See [docs/api/js-reference.md](../../docs/api/js-reference.md#wpdevpolaris-stack).

## Part of wp-starter-kit

This package is part of [wp-starter-kit](../../README.md).