import { describe, expect, it } from "bun:test";
import { calculateOptimalPersonSize, getTenantGridCols } from "../sizing";

describe("sizing utils", () => {
  describe("getTenantGridCols", () => {
    it("returns expected column counts for different tenant numbers", () => {
      expect(getTenantGridCols(0)).toBe(1);
      expect(getTenantGridCols(1)).toBe(1);
      expect(getTenantGridCols(2)).toBe(2);
      expect(getTenantGridCols(3)).toBe(3);
      expect(getTenantGridCols(4)).toBe(2);
      expect(getTenantGridCols(6)).toBe(3);
      expect(getTenantGridCols(8)).toBe(4);
      expect(getTenantGridCols(9)).toBe(3);
      expect(getTenantGridCols(16)).toBe(4);
      expect(getTenantGridCols(25)).toBe(5);
      expect(getTenantGridCols(36)).toBe(6);
    });
  });

  describe("calculateOptimalPersonSize", () => {
    it("computes reasonable person sizes for typical game setups", () => {
      const result = calculateOptimalPersonSize(6, 6);
      expect(result.personWidth).toBeGreaterThan(0);
      expect(result.personHeight).toBeGreaterThan(0);
      expect(result.personScale).toBeGreaterThan(0);
    });

    it("respects bounds on person width", () => {
      const smallSetup = calculateOptimalPersonSize(1, 1);
      expect(smallSetup.personWidth).toBeLessThanOrEqual(100);
      expect(smallSetup.personWidth).toBeGreaterThanOrEqual(26);

      const hugeSetup = calculateOptimalPersonSize(12, 12);
      expect(hugeSetup.personWidth).toBeGreaterThanOrEqual(26);
      expect(hugeSetup.personWidth).toBeLessThanOrEqual(100);
    });

    it("sets baseline person width to 75 for default game (4 bldgs, 8 people)", () => {
      const defaultSetup = calculateOptimalPersonSize(4, 8);
      expect(defaultSetup.personWidth).toBe(75);
      expect(defaultSetup.personScale).toBe(1.0);
    });
  });
});
