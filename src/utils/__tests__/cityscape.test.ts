import { describe, it, expect } from "bun:test";
import {
  calculateMouseParallaxOffset,
  DEFAULT_CITYSCAPE_LAYERS,
  FAR_SKYLINE_SVG,
  MID_CITYSCAPE_SVG,
  NEAR_STREETSCAPE_SVG,
} from "../cityscape";

describe("cityscape utilities", () => {
  describe("calculateMouseParallaxOffset", () => {
    it("returns zero offsets when mouse is centered (0, 0)", () => {
      const offset = calculateMouseParallaxOffset(0, 0, 0.5, 0.5, 30);
      expect(offset.x).toBe(0);
      expect(offset.y).toBe(0);
    });

    it("calculates correct inverted parallax offset for positive mouse coordinates", () => {
      const offset = calculateMouseParallaxOffset(0.5, 1.0, 0.4, 0.2, 30);
      // rawX = -0.5 * 0.4 * 30 = -6
      // rawY = -1.0 * 0.2 * 15 = -3
      expect(offset.x).toBe(-6);
      expect(offset.y).toBe(-3);
    });

    it("calculates correct inverted parallax offset for negative mouse coordinates", () => {
      const offset = calculateMouseParallaxOffset(-1.0, -0.5, 0.5, 0.4, 40);
      // rawX = -(-1.0) * 0.5 * 40 = 20
      // rawY = -(-0.5) * 0.4 * 20 = 4
      expect(offset.x).toBe(20);
      expect(offset.y).toBe(4);
    });

    it("clamps values outside [-1, 1] range to avoid runaway offsets", () => {
      const offsetExtreme = calculateMouseParallaxOffset(5.0, -10.0, 1.0, 1.0, 30);
      // clampedX = 1, rawX = -1 * 1.0 * 30 = -30
      // clampedY = -1, rawY = -(-1) * 1.0 * 15 = 15
      expect(offsetExtreme.x).toBe(-30);
      expect(offsetExtreme.y).toBe(15);
    });
  });

  describe("DEFAULT_CITYSCAPE_LAYERS", () => {
    it("provides 3 distinct layers with unique IDs", () => {
      expect(DEFAULT_CITYSCAPE_LAYERS.length).toBe(3);
      const ids = DEFAULT_CITYSCAPE_LAYERS.map((l) => l.id);
      expect(new Set(ids).size).toBe(3);
    });

    it("configures realistic depth relationships (far moves slower, is more blurred)", () => {
      const [far, mid, near] = DEFAULT_CITYSCAPE_LAYERS;

      // Durations: far takes longest (slowest), near takes shortest (fastest)
      expect(far.baseDuration).toBeGreaterThan(mid.baseDuration);
      expect(mid.baseDuration).toBeGreaterThan(near.baseDuration);

      // Blur: far is more blurred than near
      expect(far.blurRadius).toBeGreaterThan(mid.blurRadius);
      expect(mid.blurRadius).toBeGreaterThan(near.blurRadius);

      // Optional mouse factor: near moves more than far if configured
      expect(near.mouseFactorX!).toBeGreaterThan(mid.mouseFactorX!);
      expect(mid.mouseFactorX!).toBeGreaterThan(far.mouseFactorX!);

      // Z-index: ascending stacking order
      expect(near.zIndex).toBeGreaterThan(mid.zIndex);
      expect(mid.zIndex).toBeGreaterThan(far.zIndex);
    });

    it("contains valid SVGs for all layers with appropriate viewBox attributes", () => {
      for (const layer of DEFAULT_CITYSCAPE_LAYERS) {
        expect(layer.svg).toContain("<svg");
        expect(layer.svg).toContain("</svg>");
        expect(layer.svg).toContain(`viewBox="0 0 ${layer.tileWidth} ${layer.tileHeight}"`);
        expect(layer.tileWidth).toBe(1600);
        expect(layer.tileHeight).toBeGreaterThan(200);
      }
    });

    it("exports individual layer SVGs matching their configurations", () => {
      expect(FAR_SKYLINE_SVG).toContain("beacon-light");
      expect(MID_CITYSCAPE_SVG).toContain("rooftop-water-tower");
      expect(NEAR_STREETSCAPE_SVG).toContain("streetlamp");
    });
  });
});
