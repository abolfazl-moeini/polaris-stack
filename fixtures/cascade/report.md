# Spike-P: Cascade Defense Verification Report

## 1. Decision & Verdict
**Winner: Option B (Scoped Unlayered Components)**
- **H1 (Normal Unlayered Styles):** Option B wins (Polaris style preserved). Option A loses to unlayered theme CSS per CSS Cascade Level 5.
- **H3 (Structural !important):** Both Option A and B win because `ps.harden` uses layered `!important`, which in CSS Cascade Level 5 inverts priority and beats unlayered `!important`.
- **H6 (Form Resets):** Option B wins over generic unlayered `input` resets.
- **T4-4 (Token Flow):** Both Option A and B properly respect tokens defined in `@layer ps.host` and `@layer ps.tenant`.

## 2. Documented Limitations
- **H2 (High Specificity ID Selectors):** Neither A nor B can beat `#page .site-main button` (1,1,1) without entering a specificity arms race. Solution: Host Theme Adapters, not specificity wars.
- **H4 (Visual !important):** Unlayered `button { background: red !important }` beats normal rules. We deliberately do NOT put visual properties in `ps.harden` to avoid locking out host themes.
- **H5 (Inline !important):** Overrides external stylesheets by browser specification.

## 3. Results Matrix

| Scenario | Attack Type | Option A (Layered) | Option B (Scoped) | Verdict |
|---|---|---|---|---|
| **H1** | Normal theme styles (`button { background: red }`) | ❌ Theme Overrides (rgb(185, 28, 28)) | ✅ Polaris Wins (rgb(14, 95, 99)) | **B Wins** |
| **H2** | Monster ID selector (`#page button`) | ❌ Theme Overrides | ❌ Theme Overrides | **Documented Limit** |
| **H3** | Theme structural `!important` (`margin: 24px !important`) | ✅ Harden Wins (`margin: 0px`) | ✅ Harden Wins (`margin: 0px`) | **Tie (Both Win)** |
| **H4** | Theme visual `!important` (`bg: red !important`) | ❌ Theme Overrides | ❌ Theme Overrides | **Documented Limit** |
| **H5** | Inline `style="margin: 0 !important"` | ❌ Inline Overrides | ❌ Inline Overrides | **Documented Limit** |
| **H6** | Classic form reset (`input { border: 2px solid red }`) | ❌ Theme Overrides | ✅ Polaris Wins | **B Wins** |
| **T4-4** | Token flow (`--ps-color-primary`) | ✅ Reactive (rgb(18, 52, 86)) | ✅ Reactive (rgb(18, 52, 86)) | **Tie (Both Win)** |
