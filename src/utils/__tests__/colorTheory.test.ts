import { describe, expect, it } from "bun:test";
import {
  getContrastTextColor,
  generateDivergentPalette,
  getBuildingStartingColor,
  colorDistance,
} from "../colorTheory";
import { BUILDING_COLORS } from "../../types/game";
describe("getContrastTextColor", () => {
  it("selects light (#ffffff) text for mid-tone and dark colors", () => {
    // Building 1 default (Scarlet red)
    expect(getContrastTextColor("#c95e4e")).toBe("#ffffff");

    // Building 3 default (Cobalt blue)
    expect(getContrastTextColor("#3e69b9")).toBe("#ffffff");

    // Building 4 default (Cerulean / Ocean teal)
    expect(getContrastTextColor("#2c9dc1")).toBe("#ffffff");

    // Building 5 default (Crimson ruby)
    expect(getContrastTextColor("#a3447b")).toBe("#ffffff");

    // Other midtone palette presets (Sage green, Ochre, Muted teal, Terracotta, Forest green)
    expect(getContrastTextColor("#4e9072")).toBe("#ffffff");
    expect(getContrastTextColor("#c48452")).toBe("#ffffff");
    expect(getContrastTextColor("#4f8ea3")).toBe("#ffffff");
    expect(getContrastTextColor("#ce724f")).toBe("#ffffff");
    expect(getContrastTextColor("#559c64")).toBe("#ffffff");
    expect(getContrastTextColor("#ba9155")).toBe("#ffffff");

    // Pure black and dark tones
    expect(getContrastTextColor("#000000")).toBe("#ffffff");
    expect(getContrastTextColor("#1f1b16")).toBe("#ffffff");
  });

  it("selects dark (#1f1b16) text for bright, pale, and yellow backgrounds", () => {
    // Building 2 default (Sunny gold yellow)
    expect(getContrastTextColor("#dbbf5f")).toBe("#1f1b16");

    // Amber gold
    expect(getContrastTextColor("#db8d43")).toBe("#1f1b16");

    // Pure white, creams, and pale colors
    expect(getContrastTextColor("#ffffff")).toBe("#1f1b16");
    expect(getContrastTextColor("#f5efe4")).toBe("#1f1b16");
    expect(getContrastTextColor("#ffff00")).toBe("#1f1b16");
    expect(getContrastTextColor("#ffeb3b")).toBe("#1f1b16");
  });

  it("handles invalid color inputs gracefully", () => {
    expect(getContrastTextColor("")).toBe("#ffffff");
    expect(getContrastTextColor("not-a-color")).toBe("#ffffff");
  });
});

describe("generateDivergentPalette and getBuildingStartingColor", () => {
  it("generates 7 completely unique colors without repetition", () => {
    const colors = generateDivergentPalette(7);
    expect(colors).toHaveLength(7);

    // No duplicate colors
    const unique = new Set(colors.map((c) => c.toLowerCase()));
    expect(unique.size).toBe(7);

    // High mutual distinction (Delta E >= 0.08)
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const dist = colorDistance(colors[i]!, colors[j]!);
        expect(dist).toBeGreaterThanOrEqual(0.08);
      }
    }
  });

  it("prioritizes iconic high-contrast colors for first picks", () => {
    const colors = generateDivergentPalette(4);
    expect(colors).toEqual([
      BUILDING_COLORS[0]!, // Rose Red
      BUILDING_COLORS[1]!, // Royal Blue
      BUILDING_COLORS[2]!, // Sunny Gold
      BUILDING_COLORS[3]!, // Emerald Green
    ]);
  });

  it("supports palettes beyond 12 without repeating colors", () => {
    const colors = generateDivergentPalette(16);
    expect(colors).toHaveLength(16);

    const unique = new Set(colors.map((c) => c.toLowerCase()));
    expect(unique.size).toBe(16);
  });

  it("getBuildingStartingColor returns stable colors matching BUILDING_COLORS", () => {
    expect(getBuildingStartingColor(1, 7)).toBe(BUILDING_COLORS[0]!);
    expect(getBuildingStartingColor(2, 7)).toBe(BUILDING_COLORS[1]!);
    expect(getBuildingStartingColor(3, 7)).toBe(BUILDING_COLORS[2]!);
    expect(getBuildingStartingColor(7, 7)).toBe(BUILDING_COLORS[6]!);
  });
});
