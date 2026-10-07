/// <reference types="bun" />
import { describe, it, expect } from "bun:test";
import {
  colorToRgb,
  blendHexColors,
  getCoalitionGradient,
  getLightTint,
  getContrastTextColor,
} from "../utils/coalitionColors";

describe("coalitionColors utilities", () => {
  it("parses 6-digit hex colors into RGB", () => {
    expect(colorToRgb("#ffffff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(colorToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
    expect(colorToRgb("#e11d48")).toEqual({ r: 225, g: 29, b: 72 });
  });

  it("parses 3-digit hex colors into RGB", () => {
    expect(colorToRgb("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(colorToRgb("#f00")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("parses HSL colors into RGB", () => {
    const rgb = colorToRgb("hsl(0, 100%, 50%)");
    expect(rgb.r).toBe(255);
    expect(rgb.g).toBe(0);
    expect(rgb.b).toBe(0);
  });

  it("blends two colors by RGB average", () => {
    // #e11d48 (225, 29, 72) and #2563eb (37, 99, 235)
    // Avg: r = 131 (0x83), g = 64 (0x40), b = 154 (0x9a) -> #83409a
    const blended = blendHexColors(["#e11d48", "#2563eb"]);
    expect(blended).toBe("#83409a");
  });

  it("handles empty or single color in blendHexColors", () => {
    expect(blendHexColors([])).toBe("#7c3aed");
    expect(blendHexColors(["#2563eb"])).toBe("#2563eb");
  });

  it("generates CSS gradients for coalitions", () => {
    expect(getCoalitionGradient([])).toBe("#7c3aed");
    expect(getCoalitionGradient(["#2563eb"])).toBe("#2563eb");
    expect(getCoalitionGradient(["#e11d48", "#2563eb"])).toBe(
      "linear-gradient(135deg, #e11d48, #2563eb)",
    );
  });

  it("computes light tints with alpha", () => {
    expect(getLightTint("#ffffff", 0.5)).toBe("rgba(255, 255, 255, 0.5)");
  });

  it("determines contrast text color based on luminance", () => {
    expect(getContrastTextColor("#000000")).toBe("#ffffff");
    expect(getContrastTextColor("#ffffff")).toBe("#1f1b16");
  });
});
