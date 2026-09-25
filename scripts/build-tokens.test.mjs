import assert from "node:assert/strict";
import test from "node:test";
import { mergeTheme } from "./build-tokens.mjs";

test("theme merge keeps existing slugs and appends only missing ones", () => {
  const theme = {
    settings: {
      color: {
        palette: [
          { slug: "teal", color: "#0e5f63", name: "Deep teal" },
          { slug: "sand", color: "#e9d8b4", name: "Sand" },
        ],
      },
      spacing: { spacingSizes: [{ slug: "10", size: "0.25rem", name: "Hairline" }] },
      border: { radiusSizes: [{ slug: "sm", size: "8px", name: "Small" }] },
      layout: { contentSize: "720px" },
    },
    customTemplates: [{ name: "blank" }],
  };
  const tokens = {
    color: {
      teal: { $value: "#14b8a6", $type: "color" },
      sand: { $value: "#f8fafc", $type: "color" },
      primary: { $value: "#0e5f63", $type: "color" },
    },
    spacing: {
      "10": { $value: "9rem", $type: "dimension" },
      "15": { $value: "0.75rem", $type: "dimension" },
    },
    radius: {
      sm: { $value: "4px", $type: "dimension" },
      base: { $value: "8px", $type: "dimension" },
    },
  };
  const next = mergeTheme(theme, tokens);
  assert.equal(next.settings.color.palette.find((item) => item.slug === "teal").color, "#0e5f63");
  assert.equal(next.settings.color.palette.find((item) => item.slug === "sand").color, "#e9d8b4");
  assert.equal(next.settings.color.palette.find((item) => item.slug === "primary").color, "#0e5f63");
  assert.equal(next.settings.spacing.spacingSizes.find((item) => item.slug === "10").size, "0.25rem");
  assert.equal(next.settings.spacing.spacingSizes.find((item) => item.slug === "15").size, "0.75rem");
  assert.equal(next.settings.border.radiusSizes.find((item) => item.slug === "sm").size, "8px");
  assert.equal(next.settings.border.radiusSizes.find((item) => item.slug === "base").size, "8px");
  assert.equal(next.settings.layout.contentSize, "720px");
  assert.equal(next.customTemplates[0].name, "blank");
});
