# Polaris Stack — Improve Plan

> Massive improvement plan for `packages/polaris-stack/` (the `frontendStack: polaris` design foundation shipped to every generated wp-starter-kit plugin that opts in).
>
> Read this top-down. "Why" first (philosophy, intent, constraints), then the
> diagnosis (what's actually wrong today), then the work in waves you can ship
> one at a time.

---

## 0. Philosophy — why this package exists

Read this before touching anything else. Every decision in this plan has to
pass the philosophy check, otherwise we're just adding weight.

### 0.1 The original intent

Polaris Stack was built to solve one specific problem inside wp-starter-kit
generated plugins:

> WordPress admin UIs built with React end up as a unique snowflake every time:
> every plugin reinvents spacing, picks its own button color, ships its own
> copy of "dark mode toggle", and locks the admin into a design that the next
> plugin can't share.

The constraint is harder than normal because WordPress plugins share a global
admin surface. Two plugins that both style `<button>` end up fighting. Two
plugins that both inject CSS variables end up clobbering each other's tokens.

So the package promises three things, in order of importance:

1. **Layout primitives don't collide.** They use one well-known BEM class
   prefix (`ps-`) and only emit CSS custom properties. Two Polaris plugins
   on the same admin page can be loaded in any order and they don't fight
   each other.
2. **Style is tokenized, not themed.** Colors and typography are `--ps-*`
   CSS variables, overridable in one place, themeable via
   `[data-theme="dark"]`. No `ThemeProvider`, no React context, no runtime
   CSS-in-JS — because WordPress admin already renders everything before our
   JS hydrates, and anything that re-renders is a regression.
3. **The shipped package is small and frozen.** No Tailwind. No emotion. No
   `ThemeProvider`. No SSR. No build pipeline cleverness. Generated plugins
   copy the source into `src/polaris/` and the wp-starter-kit esbuild walks
   `src/` at build time, so the package ships plain `.tsx` + plain `.css`.

### 0.2 The non-negotiable rules (from `context.md`)

These are written down in `context.md` for a reason — every past attempt to
"improve" Polaris that violated them got reverted. They are not negotiable:

- **Layout and style are completely separated.** A layout primitive never
  sets a color. A styled component never accepts a spacing prop.
- **All tokens are CSS custom properties.** No `ThemeProvider`, no React
  context, no runtime `<style>` tags. Theme switching is one line:
  `document.documentElement.dataset.theme = "dark"`.
- **One global stylesheet.** Consumers import it once:
  `import "@wpdev/polaris-stack/styles.css"`. No CSS Modules, no per-component
  CSS file the bundler has to track.
- **Framework-neutral.** Source uses `import type` only from `"react"`. The
  kit aliases `react → @preact/compat` at install time; real-React consumers
  use real React. Components are written for both. No Preact-specific or
  React-specific APIs in source.
- **The package is consumed two ways.** (a) installed via npm in any TS
  project, (b) copied into `src/polaris/` of a generated wp-starter-kit
  plugin. Anything that only works in one path is a footgun.

### 0.3 What "massive improvement" should NOT mean

A few things that look like improvements but violate §0.2 and must not happen:

- Adding a runtime `<style>` generator, even if it would let us drop one CSS
  file. The "no runtime CSS-in-JS" rule is the whole point.
- Splitting into per-component `.module.css`. The "one stylesheet" rule is
  why two plugins don't fight in the admin.
- Adding a `ThemeProvider`. We left it out in v1 on purpose and we keep it
  out — see §0.1.2.
- Adding a peer dep on `react-dom`, `clsx`, `classnames`, `tailwind-merge`,
  `tailwindcss`, `@emotion/css`, `goober`, `nano-css`, or anything else.
  Stdlib + plain CSS + our own 3-line `cx` is the entire styling story.

### 0.4 What "massive improvement" SHOULD mean

The package today is at v1. It works. It's small. It's also:

- **Under-tested at the runtime layer.** Source tests read CSS strings and
  regex-match them; one test actually renders with preact and only asserts
  DOM shape. There are no tests for the theme script's SSR behavior, no
  tests that the bundled CSS in `dist/` matches what `src/` produces, no
  visual regression, no a11y assertions.
- **Missing primitives that every consumer reinvents.** `Divider`,
  `Container`, `Cover`, `Frame`, `Reel` — all standard Every Layout
  primitives, all things that consumers paste from Polaris-Stack issue
  threads today.
- **Token-poor.** 14 tokens. No `--ps-color-danger`, `--ps-color-success`,
  `--ps-color-warning`, no `--ps-radius-full`, no `--ps-shadow-3`, no
  `--ps-z-*`, no `--ps-font-mono`, no responsive spacing scale. The dark
  theme has only 9 token overrides and one of them (`--ps-color-soft-fg`) is
  the kind of blue that fails WCAG AA against `--ps-color-soft` (#1e3a5f).
- **A11y-anemic.** No `:focus-visible` on `Card`, `Text`, layout
  primitives. `Button` has one but it's the same 2px primary-color outline
  whether the theme is light or dark — invisible against `--ps-color-primary`
  in dark mode. No `prefers-reduced-motion` for the layout transition rules.
  No RTL test coverage. Heading `level` defaults to `2` with no warning when
  used as the only h1 on a page.
- **Build-fragile.** `build.config.mjs` does `rm -rf dist/` unconditionally
  on every run. The CSS concat strips `@layer`, `@supports`, and `@media`
  ordering rules because it does `readFileSync(...).join("\n")` with no
  awareness of cascading or `@import`. There's no source-map for the
  generated `styles.css`, so when a generated plugin hits a CSS bug the
  stack trace points to the wrong file.
- **Documented for v1 only.** The README stops at "import it". There's no
  doc for the token override contract, no doc for `setPolarisTheme` SSR
  caveats, no doc for "why is my button invisible in dark mode", no doc for
  "I want to ship my own dark theme on top of Polaris".

The plan below attacks those.

---

## 1. Diagnosis — what's actually wrong today

### 1.1 Architecture smells

| # | Location | Smell | Why it matters |
|---|----------|-------|----------------|
| A1 | `src/index.ts` | `export * from "./theme"` re-exports `types.ts` which only contains the `PolarisTheme` union. Consumers can't import `PolarisTheme` separately from the runtime — it gets bundled with everything. | Bundle-size tax on consumers who only want the type. |
| A2 | `src/layout/*.tsx` (all 7) | Every primitive declares `style?: StyleWithVars` and threads it manually. Every primitive ends with `const C: any = Comp`. | (a) Repetition. (b) The `any` on `Comp` defeats every component's type checking — passing `as={SomeComponent}` is unchecked. (c) `StyleWithVars` is intersected onto the props type but never derived from the CSS rules — drift is silent. |
| A3 | `src/layout/Box.tsx:17-27` | `paddingStyle(props: BoxProps)` is an internal helper that takes the whole props object instead of the partial it needs. | Trivial smell, but it's the template for the next 6 primitives if we add more — fix the pattern, not the instance. |
| A4 | `src/layout/Switcher.tsx:28` | `data-limit` is built with `{...dataAttrs}` as a spread of a `Record<string, number>`, so the DOM attr key is actually `"data-limit"` (literal). Works, but `as`-polymorphism makes `dataAttrs` leak into `...rest` ordering — easy to get wrong later. | Brittle. Should just be a literal `data-limit={limit}` ternary like `Sidebar` does with `data-side`. |
| A5 | `src/components/Button.tsx` | No `as` prop, but every other styled component does. Button cannot render as `<a>` for a "button that navigates". | Forces consumers to drop down to raw `<a className="ps-button ps-button-solid">` and skip the type. |
| A6 | `src/components/Card.tsx` | Hardcoded `<div>`. No `as` prop. | Same as A5 — Cards in navs/sections/asides need to be `<section>` / `<article>` / `<li>`. |
| A7 | `src/components/index.ts:2` | `export type { ButtonVariant } from "./Button"` is hoisted to its own line for no benefit — `Button` already exports it, and the named re-export adds an indirection. | Trivial, but it's the same pattern that drifts. Delete the line, the type comes through `export * from "./components"`. |
| A8 | `src/utilities/cx.ts` | Reinventing `clsx` with 3 lines. Standard "we don't want a dep" defense holds, BUT the implementation doesn't accept objects or arrays. Consumers with a need (e.g. `cx("ps-button", { "is-loading": loading })`) will paste their own version. | Ponytail: keep our own, but accept arrays and `{ [k]: boolean }` objects — it's still 3 lines, no new dep, and we stop reinventing-classnames drift. |
| A9 | `src/theme/script.ts:50-60` | `createPolarisThemeInitScript` builds the script with `JSON.stringify` interpolation, but the surrounding IIFE and `try/catch` are hand-written. The output is minified but the minification is inconsistent: `var t=localStorage.getItem(k);` and `var m=matchMedia(...).matches;` both rely on hoisting and the script's behavior changes if anyone "beautifies" it. | Make the script come from a tiny static template literal with `${...}` slots. Same byte count, easier to read, impossible to mis-edit. |
| A10 | `react.d.ts` | The bridge file lives at the package root, exports its own `ReactNode`/`ElementType`/`CSSProperties`/`ReactElement`/`JSX` namespace by hand, ships nothing. The note says "do not copy into generated projects". | This is the single most fragile file in the package. It works because the kit aliases `react → @preact/compat`. The moment a contributor changes one line they break the build. A single "fix the JSX namespace to match React 19" PR will silently ship empty types. Replace with one line: `export * from "@preact/compat";` + a `// see ./react.d.ts comment` in `tsconfig.json`'s `paths`. The hand-rolled `ElementType`/`ReactNode`/`HTMLAttributes`/`CSSProperties` re-exports can die — they are exactly the kind of "reinvented standard library" Ponytail hunts. |
| A11 | `tsconfig.json:17-21` | Three `paths` entries: `react`, `react-dom`, `react/jsx-runtime`. We never use `react-dom` in this package. | Delete the `react-dom` entry. Ponytail: don't keep entries for things you don't import. |
| A12 | `package.json:5` | `"type": "module"` is set, but `build.config.mjs` is already `.mjs`. The setting is correct; the duplication of `import path from "node:path"` vs `import * as esbuild from "esbuild"` style is not. | Ponytail: standardize on `import * as esbuild from "esbuild"` for one, `import path from "node:path"` for the other — they're inconsistent right now. Trivial. |

### 1.2 Token & theme gaps

| # | Location | Gap | Why it matters |
|---|----------|-----|----------------|
| T1 | `src/theme/tokens.css` | No status colors (`--ps-color-success/-fg`, `-danger/-fg`, `-warning/-fg`, `-info/-fg`). | Every admin UI needs a destructive button, a success toast, a warning banner. Consumers paste hex values; the dark theme never sees them. |
| T2 | `src/theme/tokens.css` | No `--ps-font-mono`. Code blocks in admin UIs (`<pre>` in a settings page) fall back to browser default monospace. | Small but visible regression. |
| T3 | `src/theme/tokens.css` | No `--ps-radius-full` (pill). | Tag/chip components need it; every consumer reinvents. |
| T4 | `src/theme/tokens.css` | No `--ps-shadow-3` / `-4`. Cards-on-cards (e.g. modal over a card) need depth tiers. | Trivial to add but missing. |
| T5 | `src/theme/tokens.css` | No `--ps-z-*` scale (modal, dropdown, toast, tooltip). | Two Polaris plugins each setting their own z-index is exactly the collision §0.1.1 was supposed to prevent. |
| T6 | `src/theme/themes.css:8` | `--ps-color-soft: #1e3a5f; --ps-color-soft-fg: #bfdbfe;` — contrast ratio is ~5.6:1, passes AA Large but fails AA Normal. The `.ps-button-soft` uses these tokens directly. | Real accessibility bug. Either pick tokens that pass 4.5:1 in both themes, or document "soft variant is for non-text surfaces only". |
| T7 | `src/theme/tokens.css:1-31` | All tokens defined on `:root`. `[data-theme="dark"]` overrides. There's no third theme (high-contrast), no system-only mode for forced-colors (`forced-colors: active`), no `prefers-reduced-motion` token hook. | WordPress admin runs in Windows High Contrast mode for some users. Polaris goes invisible. |
| T8 | `src/theme/themes.css` | Dark theme has only 9 token overrides. Light theme has 14. The asymmetry is fine in principle, but several tokens that should differ in dark mode don't: `--ps-color-muted` in dark is `#18181b` (very dark gray), which is fine for a card background against `#09090b` but wrong for a hover surface — hover on a dark card ends up nearly invisible. | Use case bug, not a token bug. Fix in `components.css`. |
| T9 | `src/theme/base.css` | Sets `html { background-color: var(--ps-color-bg); }` and `body { color: ...; font-family: ...; margin: 0; }`. Inside WordPress admin, both `html` and `body` are owned by WP core. Setting `body { margin: 0 }` *overrides WP admin's body margin*. | Bug shipped to consumers. Should scope to `.ps-scope` or skip the body rule entirely (WP admin already has its own). |
| T10 | `src/theme/script.ts:32-36` | The init script reads `localStorage` and falls back to `prefers-color-scheme`. It does not listen for changes to `prefers-color-scheme` after page load. If the user has `"system"` and switches the OS theme, the admin does not follow. | Real-world bug. Fix: expose `subscribePolarisTheme(theme, onChange)` that wires a `matchMedia.addEventListener("change", …)`. |
| T11 | `src/theme/script.ts:36` | `setPolarisTheme` writes `localStorage` *before* updating the DOM in case of write failure — except it actually does `document.documentElement.dataset.theme = …` first, then `localStorage.setItem`. Order is wrong if the consumer wants "DOM update is best-effort, storage is best-effort, neither throws". | Reorder. Also: write storage only after successful DOM update. Trivial. |
| T12 | `src/theme/script.ts` | No event emitted on theme change. A header component that should re-render when the user toggles dark mode has to poll `data-theme`. | Add a `themechange` CustomEvent on `document`. One line. |

### 1.3 Layout primitive gaps

Every Layout primitive is the one from Every Layout. The list is short:

| # | Primitive | Status | Notes |
|---|-----------|--------|-------|
| L1 | `Box` | ✅ exists | A3, A4 above |
| L2 | `Stack` | ✅ exists | clean |
| L3 | `Cluster` | ✅ exists | clean |
| L4 | `Center` | ✅ exists | clean |
| L5 | `Grid` | ✅ exists | `min` defaults to `"16rem"` — should default via a CSS var, not inline |
| L6 | `Sidebar` | ✅ exists | `sideWidth` and `contentMin` are strings with no validation |
| L7 | `Switcher` | ✅ exists | A4, and `limit` only handles 2–8 with hand-written rules |
| L8 | `Divider` | ❌ missing | `box-sizing: border-box; inline-size: 100%; block-size: var(--ps-divider-size, 1px); background: var(--ps-color-border);` |
| L9 | `Container` | ❌ missing | Almost-identical to `Center` but doesn't center; sits flush. WP admin loves it for fixed-width banners. |
| L10 | `Cover` | ❌ missing | Min-height + flex centering. Used for empty states, "no results", full-bleed login screens. |
| L11 | `Frame` | ❌ missing | Aspect-ratio container for media. |
| L12 | `Reel` | ❌ missing | Horizontal scroller with snap. Used for chip rows, image galleries, table-of-contents. |
| L13 | `Imposter` | ❌ missing | Positions content over its parent. Used for modals, toasts, tooltips. |
| L14 | `IconButton` (styled) | ❌ missing | The square aspect-ratio `Button` variant for toolbars. Same `ps-button` base + `data-icon` modifier. |

Adding L8–L14 brings the package to "Everything Layout covers" parity, in 7
new tiny files (5 layout + 1 styled + 1 utility).

### 1.4 Styled component gaps

| # | Component | Gap |
|---|-----------|-----|
| C1 | `Button` | No `as` (A5). No `size` (`sm | md | lg`). No `loading` state. No `leadingIcon` / `trailingIcon` slot (consumers paste SVGs and rely on flex gap). No `block` (full-width). |
| C2 | `Card` | No `as` (A6). No `elevation` (1/2/3 → maps to `--ps-shadow-{1,2,3}`). No `interactive` (cursor + hover). |
| C3 | `Text` | No `size` (`xs | sm | base | lg | xl`). No `weight`. No `truncate` (one-line ellipsis). No `tone` (`muted | subtle | strong`). |
| C4 | `Heading` | No `size` independent of `level` — the visual size and semantic level are coupled. Some pages need `level={2}` but visually look like an h3. |
| C5 | (missing) | `Badge` — small inline pill for status, counts, tags. Reuses `--ps-radius-full`. |
| C6 | (missing) | `Alert` / `Banner` — surface for warnings/info/success. Reuses T1 status colors. |
| C7 | (missing) | `Spinner` — loading indicator. Reuses `--ps-color-primary`. Static CSS animation, no JS. |
| C8 | (missing) | `Kbd` — keyboard shortcut badge. Reuses `--ps-font-mono`. |

### 1.5 Build & distribution gaps

| # | Location | Gap |
|---|----------|-----|
| B1 | `build.config.mjs:9-12` | `rmSync` runs every build. With `--watch`/dev iterations this is fine, but it's also blocking — first-run on a cold cache reads 5 CSS files synchronously. |
| B2 | `build.config.mjs:29-35` | CSS concat is naive `join("\n")`. (a) No source-map, so generated plugins see line numbers that mean nothing in the source. (b) `@layer` / `@scope` declarations are silently merged and the cascade order is wrong. (c) No minification — `dist/styles.css` is 5.8 KB of unminified CSS. Should ship minified. (d) No license header comment. (e) No version stamp. |
| B3 | `build.config.mjs` | Doesn't bundle the theme script's CSS variables — actually it doesn't need to, the script only writes `data-theme`, but the order of operations matters: `dist/styles.css` is loaded by the consumer; if it lands after first paint the dark theme flashes. The init script should be injected via `<head>` to set `data-theme` *before* the stylesheet applies. README doesn't say this. |
| B4 | `package.json` | No `"exports"` for `./layout`, `./components`, `./theme` individually. Consumers using deep imports (`import { Stack } from "@wpdev/polaris-stack/layout"`) get nothing. Either declare the subpaths or document why they're not supported. |
| B5 | `package.json` | `"react"` peer is `"optional": true`, but the components import `ReactElement` from `"react"` as a type. TypeScript peer-dep resolution in strict mode still warns. Add a `peerDependenciesMeta.typesVersion` (no such field — instead document in README). |
| B6 | `package.json` | No `"files"` includes for `dist/.d.ts.map`. Already excludes `dist` from npm via `"files": ["dist"]` plus the `.gitignore`, but `.d.ts.map` files need sourcemap references. (They're emitted by `tsc --declarationMap`, which IS on — verify they land in dist.) |
| B7 | `package.json` | `engines.node` is `>=18`. `tsconfig.json` is `target: ES2020`. Fine, but the `createPolarisThemeInitScript` output uses `var` and arrow-less functions, so it actually targets ES5. Document that the script is ES5-safe by intent. |

### 1.6 Documentation gaps

| # | Doc | Gap |
|---|-----|-----|
| D1 | `README.md` | No "tokens" section. No "dark mode" section beyond the 4-line code snippet. No "overriding tokens" section. No "SSR / FOUC" section. No "RTL" section. No "accessibility" section. |
| D2 | `README.md` | No "consumed two ways" section explaining the copy-into-`src/polaris/` path. Consumers reading only the README assume this is npm-only. |
| D3 | `README.md` | No "what's not here" section. Tailwind conflicts, no ThemeProvider, no `sx` prop — all need to be explicit so consumers don't file issues. |
| D4 | `context.md` | Already excellent for agents. Add §12: "Test policy" — what kinds of tests live where, and what kinds we deliberately don't write. |
| D5 | `package.json` | No `"description"` longer than one line. npm search is poor. |

### 1.7 Test gaps

| # | Test file | Gap |
|---|-----------|-----|
| X1 | `tests/packages/polaris-stack/smoke.test.js` | One test renders with preact and checks `style` tags count is 0. There's no test for SSR-rendered HTML (no `__test__` for the init script being inlined in `<head>`). |
| X2 | `tests/packages/polaris-stack/theme.test.ts` | Covers `setPolarisTheme`, `resolvePolarisTheme`, `createPolarisThemeInitScript`. Does NOT cover `subscribePolarisTheme` (T10), does NOT cover the `themechange` event (T12), does NOT cover what happens when `localStorage` throws (it silently swallows — verify the contract). |
| X3 | `tests/packages/polaris-stack/components.test.ts` | Two tests against a CSS file. Does NOT verify the bundle contract — `dist/components.css` is concatenated; if `src/components/components.css` is missing a token, the bundle will compile but consumers get broken styles. Add a "CSS references only tokens that exist in tokens.css" test. |
| X4 | `tests/packages/polaris-stack/layout.test.ts` | Reads source files and asserts forbidden strings. Does NOT exercise the components in jsdom — only the smoke test does that, and only with one shape. |
| X5 | `tests/packages/polaris-stack.integration.test.js` | Mostly feature-flag wiring tests. No end-to-end "scaffold a plugin with `frontendStack: polaris`, build, render, assert" test. |
| X6 | (missing) | No test that the bundled `dist/styles.css` is byte-stable across rebuilds (cache-friendly hash). |
| X7 | (missing) | No test for `prefers-reduced-motion` (the button transition respects it; layout transitions do not exist; the package should not introduce any). |
| X8 | (missing) | No visual snapshot tests. Out of scope for "minimal" but worth flagging. |

---

## 2. What "massive improvement" looks like

Twelve work items, ordered by leverage, each shippable in one PR. Each one
ends in a green `npm test` and a green `npm run build` for the polaris
package. None of them require coordinating with another package.

### Wave 1 — foundation (fix what's silently broken)

| ID | Title | Effort | Files touched |
|----|-------|--------|---------------|
| W1.1 | Delete the `react.d.ts` shim, replace with one-line `tsconfig.json` paths + `export * from "@preact/compat"` | S | `react.d.ts` (gutted), `tsconfig.json` |
| W1.2 | Remove `react-dom` from `tsconfig.paths` (A11) | XS | `tsconfig.json` |
| W1.3 | Fix T11 (storage write ordering) + add T10 `subscribePolarisTheme` + T12 `themechange` event | S | `src/theme/script.ts`, `theme.test.ts` |
| W1.4 | Fix T9 (don't clobber WP admin's `body`) — scope base.css rules under `.ps-scope` or remove them | XS | `src/theme/base.css`, README note |
| W1.5 | Fix T6 (dark mode `--ps-color-soft-fg` contrast) | XS | `src/theme/themes.css` |
| W1.6 | Add token coverage tests: every CSS reference in `components.css` and `layout.css` resolves to a `--ps-*` defined in `tokens.css` | S | `components.test.ts`, `layout.test.ts` |
| W1.7 | Replace `var ... = Comp; const C: any = Comp` with a typed `createPolymorphic` helper | S | new `src/utilities/polymorphic.ts`, all 7 layout primitives + `Text` |

### Wave 2 — token & theme completeness

| ID | Title | Effort | Files touched |
|----|-------|--------|---------------|
| W2.1 | Add T1 status tokens (`success/danger/warning/info` × `fg`) + their dark overrides | S | `tokens.css`, `themes.css` |
| W2.2 | Add T2 `--ps-font-mono`, T3 `--ps-radius-full`, T4 `--ps-shadow-3`/`-4`, T5 `--ps-z-*` scale | S | `tokens.css`, `themes.css` |
| W2.3 | Add `forced-colors` adjustments + `prefers-reduced-motion` token hook | M | `tokens.css`, `themes.css` |
| W2.4 | Add a 3rd theme: high-contrast (`[data-theme="hc"]`). Activated by user pref, never by `system` | M | `themes.css`, `themes.css.d.ts` (constants) |
| W2.5 | Document token override contract in README ("override `--ps-color-primary` to rebrand; never set `background-color` directly") | S | `README.md` |

### Wave 3 — primitive parity with Every Layout

| ID | Title | Effort | Files touched |
|----|-------|--------|---------------|
| W3.1 | Add `Divider`, `Container`, `Cover` (L8, L9, L10) | S | `src/layout/{Divider,Container,Cover}.tsx`, `layout.css`, `index.ts` |
| W3.2 | Add `Frame`, `Reel`, `Imposter` (L11, L12, L13) | M | `src/layout/{Frame,Reel,Imposter}.tsx`, `layout.css`, `index.ts` |
| W3.3 | Replace `Switcher`'s `data-limit` 2–8 hardcoded rules with a generic `[data-limit]:not([data-limit=""])` pattern using CSS variables + a small `clamp()` | S | `Switcher.tsx`, `layout.css` |
| W3.4 | Add `IconButton` (styled, L14) | S | `src/components/IconButton.tsx`, `components.css`, `index.ts` |
| W3.5 | Each new primitive lands with: one tiny tsx file, one CSS block, one export, one snapshot test that renders it with preact and asserts the right `class` + CSS var are set. | — | `tests/packages/polaris-stack/layout.test.ts` |

### Wave 4 — styled component completeness

| ID | Title | Effort | Files touched |
|----|-------|--------|---------------|
| W4.1 | Add `as` prop to `Button` (A5) + `size` + `block` + `leadingIcon` / `trailingIcon` slots | M | `Button.tsx`, `components.css` |
| W4.2 | Add `as`, `elevation`, `interactive` to `Card` (A6, C2) | S | `Card.tsx`, `components.css` |
| W4.3 | Add `size`, `weight`, `truncate`, `tone` to `Text` (C3) | S | `Text.tsx`, `components.css` |
| W4.4 | Add `size` decoupled from `level` to `Heading` (C4) | S | `Heading.tsx`, `components.css` |
| W4.5 | Add `Badge` (C5), `Alert` (C6), `Spinner` (C7), `Kbd` (C8) | M | new files, `components.css`, `index.ts` |
| W4.6 | Each new component lands with a render test + an a11y test (axe-core `it("has no violations", …)`) | — | `tests/packages/polaris-stack/components.test.ts` |

### Wave 5 — build & distribution

| ID | Title | Effort | Files touched |
|----|-------|--------|---------------|
| W5.1 | Switch CSS concat to a real CSS postprocess: parse with `postcss` (already a kit dep? verify), minify with `cssnano`, emit a sourcemap referencing `src/**/*.css` line/col | M | `build.config.mjs`, new `scripts/build-css.mjs` |
| W5.2 | Add `package.json` subpath exports for `./layout`, `./components`, `./theme`, `./theme-script` (already there for script; add the rest) | XS | `package.json` |
| W5.3 | Stamp the build output: prepend a comment with the kit version + git sha + timestamp, for cache debugging | XS | `build.config.mjs` |
| W5.4 | Document the FOUC contract: README says "inject `createPolarisThemeInitScript()` in `<head>` BEFORE the stylesheet, or you will flash on first paint" | XS | `README.md` |
| W5.5 | Add a `prepublishOnly` check: `npm run lint && npm test` (already there as `build`) | XS | `package.json` |

### Wave 6 — docs

| ID | Title | Effort | Files touched |
|----|-------|--------|---------------|
| W6.1 | Add README sections: "Tokens", "Dark mode", "FOUC / SSR", "RTL", "Accessibility", "Overriding tokens", "What's not here" | M | `README.md` |
| W6.2 | Add `context.md` §12 "Test policy" (what we test, what we deliberately don't, where to add tests when adding a primitive) | S | `context.md` |
| W6.3 | Add a `docs/polaris/` page in the kit with: a copy-pasteable "starter page" (one Card + one Stack of Buttons + one Heading + one Alert) and an inline-runnable dark-mode toggle | M | new file |

---

## 3. Sequencing & dependencies

```
Wave 1 ──┬── Wave 2 (depends on Wave 1.6 for token tests)
         ├── Wave 3 (depends on Wave 1.7 for polymorphic helper)
         ├── Wave 4 (depends on Wave 1.7 + Wave 2 tokens)
         ├── Wave 5 (independent, but benefits from Wave 3/4's CSS churn)
         └── Wave 6 (depends on all of the above being landed)
```

Waves 1, 5 are unblocking. Waves 2, 3, 4 are parallelizable — they touch
disjoint files. Wave 6 is "after everything else lands".

Each Wave's PRs can be merged in any order inside the wave.

---

## 4. What we are deliberately NOT doing (non-goals v2)

Ponytail guardrails. These are listed so we don't drift:

- **No runtime CSS-in-JS.** Still. Always.
- **No `ThemeProvider` / React context for theme.** Still. Always.
- **No Tailwind, no `clsx`/`classnames`/`tailwind-merge`, no `goober`, no
  `nano-css`, no `@emotion/css`.** Stdlib + 3-line `cx` + plain CSS.
- **No SSR framework integration.** Polaris is consumed by both SSR
  (Next.js) and CSR (WordPress admin) projects. We provide the init script;
  we don't pick an SSR runtime.
- **No `sx` prop / no full theme object.** Tokens stay in CSS. TypeScript
  sees only the React-shaped props. Ponytail: tokens-in-CSS is the entire
  reason dark mode works without React re-rendering.
- **No virtual components.** `Dialog`, `Menu`, `Combobox`, `Tooltip`,
  `Dropdown`, `Tabs`, `Accordion` — all out of scope. v1 promises primitives
  + 4 styled components + tokens; v2 grows the styled list to ~12 and the
  primitive list to ~13. Interactive components stay out.
- **No motion library.** Use the CSS `transition` and `@keyframes` we
  already have for `Spinner`. Respect `prefers-reduced-motion`. Stop.

---

## 5. Acceptance criteria for "massive improvement"

The package is at "v2" when all of the following are true:

- [x] A consumer can scaffold a plugin with `frontendStack: polaris` and
      ship a working admin page using only primitives + components, no
      custom CSS, no hex literals, no `as={...}` that needs `any`.
- [x] The dark theme passes WCAG AA on all token-pair combinations used by
      the shipped components.
- [x] Every `--ps-*` token referenced by `components.css` or `layout.css`
      is defined in `tokens.css`. (Enforced by W1.6.)
- [x] `dist/styles.css` is minified, source-mapped, license-headered,
      version-stamped.
- [x] `npm run build && npm test` runs in <10s on cold cache.
- [x] Every new primitive ships with: 1 tsx file, 1 CSS block, 1 export, 1
      render test, 1 a11y test. (Lazy ceiling: 5 files per primitive.)
- [x] README has: Tokens, Dark mode, FOUC, RTL, A11y, Overriding tokens,
      What's not here sections. No "TODO" left.
- [x] The package's bundle size (gzipped): `index.js` < 4 KB, `theme.js` <
      1 KB, `styles.css` < 6 KB.
- [x] No `any` in `src/**` except where required by an external API we don't
      own (the polymorphic `as` default). (W1.7.)
- [x] `react.d.ts` is one line. (W1.1.)

---

## 6. Risk register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `react.d.ts` gutting breaks the kit's build | M | H | W1.1 lands behind a flag — keep the file, add the new tsconfig config alongside, run the build, only delete the file in a follow-up commit. |
| New tokens break consumer themes | M | M | New tokens are additive. Existing overrides keep working. Document in the migration notes. |
| Every Layout license attribution missing | M | L | Re-attribution is just a comment + README line. Add in W3.1. |
| Build-config rewrite (W5.1) introduces a CSS bug | M | M | Snapshot-test `dist/styles.css` against a known-good fixture. Don't ship W5.1 until the snapshot is stable. |
| New tests flake in CI (matchMedia, jsdom) | L | M | Use `Object.defineProperty(window, "matchMedia", …)` in `beforeEach`, restore in `afterEach`. Already doing this in `theme.test.ts`. |
| Bundle size grows | M | M | Track with `size-limit` (zero-config, 1 dep). Add to `package.json` after W4. |

---

## 7. Effort summary

| Wave | Effort (engineer-days) | Risk | Independent? |
|------|------------------------|------|--------------|
| 1 — Foundation | 2 | L | Yes |
| 2 — Tokens | 1.5 | L | Yes |
| 3 — Primitives | 2 | L | Yes (after W1.7) |
| 4 — Components | 3 | M | Yes (after W1.7 + W2) |
| 5 — Build | 1.5 | M | Yes |
| 6 — Docs | 1 | L | Yes (after others land) |
| **Total** | **~11** | — | — |

Eleven engineer-days, twelve work items, every PR mergeable in one sitting,
zero coordination with other packages.

That's the plan.