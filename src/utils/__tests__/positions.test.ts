import { describe, it, expect } from "bun:test";
import {
  calculateBuildingOverlapArea,
  calculateBuildingOverlapRatio,
  findSwapTargetBuilding,
  swapBuildingPositions,
  clampBuildingPosition,
  checkBuildingOverlap,
  getBuildingGridDimensions,
  generateDefaultPositions,
  generateScatteredPositions,
} from "../positions";

describe("positions utilities & swap logic", () => {
  it("calculates overlap area and ratio correctly", () => {
    const posA = { x: 10, y: 10 };
    const posB = { x: 20, y: 20 };
    const dim = { w: 20, h: 20 };

    // Overlap: x in [20, 30] (w = 10), y in [20, 30] (h = 10) -> area = 100
    const area = calculateBuildingOverlapArea(posA, posB, dim, dim);
    expect(area).toBe(100);

    // Each building area = 400. Ratio = 100 / 400 = 0.25
    const ratio = calculateBuildingOverlapRatio(posA, posB, dim, dim);
    expect(ratio).toBe(0.25);

    // No overlap
    const posC = { x: 100, y: 100 };
    expect(calculateBuildingOverlapArea(posA, posC, dim, dim)).toBe(0);
    expect(calculateBuildingOverlapRatio(posA, posC, dim, dim)).toBe(0);
  });

  describe("findSwapTargetBuilding", () => {
    const buildings = [
      { id: "b-1", x: 10, y: 10 },
      { id: "b-2", x: 40, y: 40 },
      { id: "b-3", x: 60, y: 10 },
    ];
    const dimMap = {
      "b-1": { w: 20, h: 20 },
      "b-2": { w: 20, h: 20 },
      "b-3": { w: 20, h: 20 },
    };

    it("identifies target building when dragged building overlaps heavily", () => {
      // Drag b-1 right onto b-2 (dropped at 42, 41)
      const target = findSwapTargetBuilding("b-1", { x: 42, y: 41 }, buildings, dimMap);
      expect(target).not.toBeNull();
      expect(target?.id).toBe("b-2");
    });

    it("returns null when dropped in empty space", () => {
      const target = findSwapTargetBuilding("b-1", { x: 10, y: 50 }, buildings, dimMap);
      expect(target).toBeNull();
    });

    it("returns null for glancing collision below threshold without center containment", () => {
      // b-2 is at (40, 40) [40-60, 40-60]
      // Drag b-1 to (21, 40): overlap is in x from 40 to 41 (width 1), y from 40 to 60 (height 20) -> area 20 / 400 = 5%
      // Center of b-1 is at (31, 50), which is outside b-2 (< 40)
      const target = findSwapTargetBuilding("b-1", { x: 21, y: 40 }, buildings, dimMap);
      expect(target).toBeNull();
    });

    it("identifies target building when center is inside even if overlap is moderate", () => {
      // b-2 is at (40, 40) [40-60, 40-60]
      // Drag b-1 to (35, 35). Center of b-1 is (45, 45), which is inside b-2!
      const target = findSwapTargetBuilding("b-1", { x: 35, y: 35 }, buildings, dimMap);
      expect(target?.id).toBe("b-2");
    });

    it("identifies target building via pointerClient coordinates", () => {
      const elementRects: Record<
        string,
        { left: number; top: number; right: number; bottom: number }
      > = {
        "b-2": { left: 400, top: 400, right: 600, bottom: 600 },
        "b-3": { left: 700, top: 100, right: 900, bottom: 300 },
      };

      const target = findSwapTargetBuilding("b-1", { x: 38, y: 38 }, buildings, dimMap, {
        pointerClient: { x: 450, y: 450 },
        elementRects,
      });
      expect(target?.id).toBe("b-2");
    });

    it("picks the building with greatest overlap when overlapping multiple buildings", () => {
      const multiBuildings = [
        { id: "b-1", x: 0, y: 0 },
        { id: "b-2", x: 25, y: 20 },
        { id: "b-3", x: 45, y: 20 },
      ];
      // Dragged position (26, 20) almost completely covers b-2 and barely grazes b-3
      const target = findSwapTargetBuilding("b-1", { x: 26, y: 20 }, multiBuildings, dimMap);
      expect(target?.id).toBe("b-2");
    });
  });

  describe("swapBuildingPositions", () => {
    it("swaps the positions of two buildings", () => {
      const updates = swapBuildingPositions("b-1", { x: 10, y: 15 }, "b-2", { x: 45, y: 55 });
      expect(updates).toEqual([
        { id: "b-1", x: 45, y: 55 },
        { id: "b-2", x: 10, y: 15 },
      ]);
    });

    it("clamps swapped positions to canvas bounds", () => {
      // Target position out of bounds (x: 80 > max 72)
      const updates = swapBuildingPositions("b-1", { x: 10, y: 15 }, "b-2", { x: 80, y: 55 });
      expect(updates[0]?.x).toBe(72);
      expect(updates[0]?.y).toBe(55);
      expect(updates[1]?.x).toBe(10);
      expect(updates[1]?.y).toBe(15);
    });
  });

  describe("clampBuildingPosition and checkBuildingOverlap", () => {
    it("checks overlap considering margins", () => {
      expect(checkBuildingOverlap({ x: 10, y: 10 }, { x: 20, y: 20 })).toBe(true);
      expect(checkBuildingOverlap({ x: 10, y: 10 }, { x: 80, y: 80 })).toBe(false);
    });

    it("clamps building positions inside bounds and away from landlord corner", () => {
      expect(clampBuildingPosition({ x: -5, y: -10 })).toEqual({ x: 2, y: 2 });
      expect(clampBuildingPosition({ x: 75, y: 10 })).toEqual({ x: 71, y: 10 });
    });
  });

  describe("getBuildingGridDimensions", () => {
    it("calculates appropriate grid dimensions based on building count", () => {
      expect(getBuildingGridDimensions(0)).toEqual({ cols: 1, rows: 1 });
      expect(getBuildingGridDimensions(1)).toEqual({ cols: 1, rows: 1 });
      expect(getBuildingGridDimensions(2)).toEqual({ cols: 2, rows: 1 });
      expect(getBuildingGridDimensions(3)).toEqual({ cols: 2, rows: 2 });
      expect(getBuildingGridDimensions(4)).toEqual({ cols: 2, rows: 2 });
      expect(getBuildingGridDimensions(5)).toEqual({ cols: 2, rows: 3 });
      expect(getBuildingGridDimensions(6)).toEqual({ cols: 2, rows: 3 });
      expect(getBuildingGridDimensions(7)).toEqual({ cols: 2, rows: 4 });
      expect(getBuildingGridDimensions(8)).toEqual({ cols: 2, rows: 4 });
      expect(getBuildingGridDimensions(9)).toEqual({ cols: 3, rows: 3 });
      expect(getBuildingGridDimensions(12)).toEqual({ cols: 3, rows: 4 });
      expect(getBuildingGridDimensions(16)).toEqual({ cols: 4, rows: 4 });
    });
  });

  describe("generateDefaultPositions", () => {
    it("returns empty array for non-positive count", () => {
      expect(generateDefaultPositions(0)).toEqual([]);
      expect(generateDefaultPositions(-1)).toEqual([]);
    });

    it("arranges 2 buildings roughly left to right in the top row", () => {
      const pos = generateDefaultPositions(2);
      expect(pos).toHaveLength(2);
      expect(pos[0]!.x).toBeLessThan(pos[1]!.x);
      expect(pos[0]!.x).toBeLessThan(25);
      expect(pos[1]!.x).toBeGreaterThan(35);
      expect(pos[0]!.y).toBeLessThan(25);
      expect(pos[1]!.y).toBeLessThan(25);
    });

    it("arranges 4 buildings in top-left, top-right, middle-left, middle-right ordering", () => {
      const pos = generateDefaultPositions(4);
      expect(pos).toHaveLength(4);

      const [b1, b2, b3, b4] = pos;
      // Building 1: top left
      expect(b1!.x).toBeLessThan(25);
      expect(b1!.y).toBeLessThan(25);

      // Building 2: top right
      expect(b2!.x).toBeGreaterThan(35);
      expect(b2!.y).toBeLessThan(25);

      // Building 3: middle/bottom left
      expect(b3!.x).toBeLessThan(25);
      expect(b3!.y).toBeGreaterThan(35);

      // Building 4: middle/bottom right
      expect(b4!.x).toBeGreaterThan(35);
      expect(b4!.y).toBeGreaterThan(35);
    });

    it("arranges 3 buildings with building 3 on middle-left", () => {
      const pos = generateDefaultPositions(3);
      expect(pos).toHaveLength(3);

      const [b1, b2, b3] = pos;
      expect(b1!.x).toBeLessThan(b2!.x);
      expect(b1!.x).toBeLessThan(25);
      expect(b2!.x).toBeGreaterThan(35);
      // Building 3 is middle left
      expect(b3!.x).toBeLessThan(25);
      expect(b3!.y).toBeGreaterThan(b1!.y);
    });

    it("arranges 6 buildings roughly top-left to bottom-right across 3 rows and 2 columns", () => {
      const pos = generateDefaultPositions(6);
      expect(pos).toHaveLength(6);

      // Col 0 buildings (b1, b3, b5) are on the left
      expect(pos[0]!.x).toBeLessThan(25);
      expect(pos[2]!.x).toBeLessThan(25);
      expect(pos[4]!.x).toBeLessThan(25);

      // Col 1 buildings (b2, b4, b6) are on the right
      expect(pos[1]!.x).toBeGreaterThan(35);
      expect(pos[3]!.x).toBeGreaterThan(35);
      expect(pos[5]!.x).toBeGreaterThan(35);

      // Row Y levels increase down the screen
      expect(pos[0]!.y).toBeLessThan(pos[2]!.y);
      expect(pos[2]!.y).toBeLessThan(pos[4]!.y);
      expect(pos[1]!.y).toBeLessThan(pos[3]!.y);
      expect(pos[3]!.y).toBeLessThan(pos[5]!.y);
    });

    it("never places buildings inside the Landlord office bounds in top row", () => {
      for (let count = 1; count <= 20; count++) {
        const pos = generateDefaultPositions(count);
        for (const p of pos) {
          const inLandlordCorner = p.x >= 72 && p.y <= 28;
          expect(inLandlordCorner).toBe(false);
        }
      }
    });
  });

  describe("generateScatteredPositions", () => {
    it("generates correct number of positions within canvas bounds", () => {
      const pos = generateScatteredPositions(6);
      expect(pos).toHaveLength(6);
      for (const p of pos) {
        expect(p.x).toBeGreaterThanOrEqual(2);
        expect(p.x).toBeLessThanOrEqual(72);
        expect(p.y).toBeGreaterThanOrEqual(2);
        expect(p.y).toBeLessThanOrEqual(72);
      }
    });
  });
});
