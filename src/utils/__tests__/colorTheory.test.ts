import { describe, expect, it } from "bun:test";
import {
  generatePrimaryPalette,
  generateDivergentPalette,
  getRandomPrimaryColor,
  getBuildingStartingColor,
  combineTwoColors,
  mergeColors,
  computeCoalitionColor,
  colorToOklch,
  colorDistance,
  getContrastTextColor,
} from "../colorTheory";

describe("colorTheory primary color generation", () => {
  it("generates correct number of colors for various building counts", () => {
    expect(generatePrimaryPalette(0)).toEqual([]);
    expect(generatePrimaryPalette(1)).toHaveLength(1);
    expect(generatePrimaryPalette(2)).toHaveLength(2);
    expect(generatePrimaryPalette(3)).toHaveLength(3);
    expect(generatePrimaryPalette(4)).toHaveLength(4);
    expect(generatePrimaryPalette(8)).toHaveLength(8);
  });

  it("generates randomized colors that differ on consecutive runs", () => {
    const run1 = generatePrimaryPalette(4);
    const run2 = generatePrimaryPalette(4);
    const run3 = generatePrimaryPalette(4);

    expect(run1).toHaveLength(4);
    expect(run2).toHaveLength(4);
    expect(run3).toHaveLength(4);

    // Palettes should not all be identical
    const allIdentical = run1.every((c, i) => c === run2[i] && c === run3[i]);
    expect(allIdentical).toBe(false);
  });

  it("generates colors close to the primary families (Red, Yellow, Blue)", () => {
    const palette = generatePrimaryPalette(6);

    for (const hex of palette) {
      const { h } = colorToOklch(hex);
      // Hue should belong to Red (scarlet ~26..34 or crimson ~342..352),
      // Yellow (amber ~56..66 or gold ~88..98),
      // or Blue (cerulean ~218..230 or cobalt ~256..268)
      const isRed = (h >= 20 && h <= 45) || h >= 335 || h <= 5;
      const isYellow = h >= 50 && h <= 105;
      const isBlue = h >= 210 && h <= 275;
      const isPrimary = isRed || isYellow || isBlue;
      expect(isPrimary).toBe(true);
    }
  });

  it("supports deterministic option for stable repeatable previews", () => {
    const d1 = generatePrimaryPalette(4, { deterministic: true });
    const d2 = generatePrimaryPalette(4, { deterministic: true });
    expect(d1).toEqual(d2);
  });

  it("getRandomPrimaryColor generates colors matching requested primary families", () => {
    const red = getRandomPrimaryColor("red");
    const yellow = getRandomPrimaryColor("yellow");
    const blue = getRandomPrimaryColor("blue");

    const lchR = colorToOklch(red);
    const lchY = colorToOklch(yellow);
    const lchB = colorToOklch(blue);

    const isRed = (lchR.h >= 20 && lchR.h <= 45) || lchR.h >= 335 || lchR.h <= 5;
    const isYellow = lchY.h >= 50 && lchY.h <= 105;
    const isBlue = lchB.h >= 210 && lchB.h <= 275;

    expect(isRed).toBe(true);
    expect(isYellow).toBe(true);
    expect(isBlue).toBe(true);
  });

  it("generateDivergentPalette defaults to primary colors, and supports custom baseHue", () => {
    const randomColors = generateDivergentPalette(4);
    expect(randomColors).toHaveLength(4);

    // Custom baseHue mode
    const customColors = generateDivergentPalette(4, { baseHue: 180 });
    expect(customColors).toHaveLength(4);
    // Hues should be spaced by 90 degrees around 180
    const lch0 = colorToOklch(customColors[0]!);
    expect(Math.round(lch0.h)).toBe(180);
  });

  it("getBuildingStartingColor provides consistent default colors per index", () => {
    const b1a = getBuildingStartingColor(1, 4);
    const b1b = getBuildingStartingColor(1, 4);
    const b2a = getBuildingStartingColor(2, 4);
    const b2b = getBuildingStartingColor(2, 4);

    expect(b1a).toBe(b1b);
    expect(b2a).toBe(b2b);
    expect(b1a).not.toBe(b2a);
  });
  it("ensures initial colors are far apart from each other across buildings", () => {
    // Test N=2: colors should be very far apart (Delta E >= 0.20)
    for (let trial = 0; trial < 10; trial++) {
      const p2 = generatePrimaryPalette(2);
      expect(colorDistance(p2[0]!, p2[1]!)).toBeGreaterThanOrEqual(0.2);
    }

    // Test N=3: all 3 pairs should be very far apart (Delta E >= 0.20)
    for (let trial = 0; trial < 10; trial++) {
      const p3 = generatePrimaryPalette(3);
      for (let i = 0; i < p3.length; i++) {
        for (let j = i + 1; j < p3.length; j++) {
          expect(colorDistance(p3[i]!, p3[j]!)).toBeGreaterThanOrEqual(0.2);
        }
      }
    }

    // Test N=4: all 6 pairs must be distinctly separated (Delta E >= 0.14)
    for (let trial = 0; trial < 25; trial++) {
      const p4 = generatePrimaryPalette(4);
      for (let i = 0; i < p4.length; i++) {
        for (let j = i + 1; j < p4.length; j++) {
          const dist = colorDistance(p4[i]!, p4[j]!);
          expect(dist).toBeGreaterThanOrEqual(0.14);
        }
      }
    }
  });
});

describe("colorTheory color combination logic", () => {
  const primaryRed = "#e53935";
  const primaryYellow = "#fbc02d";
  const primaryBlue = "#1976d2";

  it("combines Red + Yellow to form Orange", () => {
    const orange = combineTwoColors(primaryRed, primaryYellow);
    const { h } = colorToOklch(orange);
    // Orange hue in OKLCH is ~45..70
    expect(h).toBeGreaterThanOrEqual(45);
    expect(h).toBeLessThanOrEqual(70);
  });

  it("combines Yellow + Blue to form Green", () => {
    const green = combineTwoColors(primaryYellow, primaryBlue);
    const { h } = colorToOklch(green);
    // Green hue in OKLCH is ~140..185
    expect(h).toBeGreaterThanOrEqual(140);
    expect(h).toBeLessThanOrEqual(185);
  });

  it("combines Blue + Red to form Purple / Violet", () => {
    const purple = combineTwoColors(primaryBlue, primaryRed);
    const { h } = colorToOklch(purple);
    // Purple hue in OKLCH is ~290..340
    expect(h).toBeGreaterThanOrEqual(290);
    expect(h).toBeLessThanOrEqual(340);
  });

  it("is commutative when blending colors with equal weights", () => {
    expect(combineTwoColors(primaryRed, primaryYellow)).toBe(
      combineTwoColors(primaryYellow, primaryRed),
    );
    expect(combineTwoColors(primaryYellow, primaryBlue)).toBe(
      combineTwoColors(primaryBlue, primaryYellow),
    );
    expect(combineTwoColors(primaryBlue, primaryRed)).toBe(
      combineTwoColors(primaryRed, primaryBlue),
    );
  });

  it("combines same-family colors smoothly within the family", () => {
    const scarlet = "#f03120";
    const crimson = "#d32247";
    const blendedRed = combineTwoColors(scarlet, crimson);
    const { h } = colorToOklch(blendedRed);
    expect(h).toBeGreaterThanOrEqual(15);
    expect(h).toBeLessThanOrEqual(35);
  });

  it("shifts hue proportionally with weights", () => {
    // 70% yellow + 30% blue = lime green (closer to yellow)
    const lime = combineTwoColors(primaryYellow, primaryBlue, 0.7, 0.3);
    const { h: limeH } = colorToOklch(lime);

    // 30% yellow + 70% blue = teal cyan (closer to blue)
    const teal = combineTwoColors(primaryYellow, primaryBlue, 0.3, 0.7);
    const { h: tealH } = colorToOklch(teal);

    expect(limeH).toBeLessThan(tealH);
    expect(limeH).toBeGreaterThanOrEqual(100);
    expect(tealH).toBeLessThanOrEqual(240);
  });

  it("merges multiple colors using mergeColors", () => {
    const blended2 = mergeColors([primaryRed, primaryYellow]);
    expect(blended2).toBe(combineTwoColors(primaryRed, primaryYellow));

    const blended3 = mergeColors([primaryRed, primaryYellow, primaryBlue]);
    expect(typeof blended3).toBe("string");
    expect(blended3.startsWith("#")).toBe(true);
  });

  it("merges 3+ colors in an order-independent, commutative manner", () => {
    const p1 = mergeColors([primaryRed, primaryYellow, primaryBlue]);
    const p2 = mergeColors([primaryYellow, primaryBlue, primaryRed]);
    const p3 = mergeColors([primaryBlue, primaryRed, primaryYellow]);

    expect(p1).toBe(p2);
    expect(p2).toBe(p3);
  });

  it("combines Amber (warm yellow) + Cobalt (royal blue) to form Green, not Magenta", () => {
    const amber = "#e6a100"; // hue ~61°
    const cobalt = "#1d5fe2"; // hue ~262°

    const green = combineTwoColors(amber, cobalt);
    const { h } = colorToOklch(green);
    // Must be in the Green hue range (~130..190°), NOT Magenta (~330..360°)
    expect(h).toBeGreaterThanOrEqual(130);
    expect(h).toBeLessThanOrEqual(190);
  });

  it("safely handles invalid color inputs without throwing", () => {
    expect(combineTwoColors("not-a-color", primaryRed)).toBe(primaryRed);
    expect(combineTwoColors("invalid1", "invalid2")).toBe("#7c3aed");
    expect(mergeColors([])).toBe("#7c3aed");
  });

  it("computes coalition colors for connected buildings", () => {
    const buildings = [
      { id: "b-1", color: primaryRed },
      { id: "b-2", color: primaryYellow },
      { id: "b-3", color: primaryBlue },
    ];
    const connections = [{ sourceId: "b-1", targetId: "b-2", createdAt: 100 }];

    const coalitionColor = computeCoalitionColor([buildings[0]!, buildings[1]!], connections);
    // B1 + B2 should form Orange
    const { h } = colorToOklch(coalitionColor);
    expect(h).toBeGreaterThanOrEqual(45);
    expect(h).toBeLessThanOrEqual(70);
  });

  it("returns appropriate high-contrast text color", () => {
    // Light yellows need dark text (#1f1b16)
    expect(getContrastTextColor(primaryYellow)).toBe("#1f1b16");
    // Deep reds and blues need white text (#ffffff)
    expect(getContrastTextColor(primaryRed)).toBe("#ffffff");
    expect(getContrastTextColor(primaryBlue)).toBe("#ffffff");
  });
});
