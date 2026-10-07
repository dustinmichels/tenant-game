import { describe, expect, it } from "bun:test";
import {
  clampBuildingPosition,
  generateDefaultPositions,
  findSwapTargetBuilding,
  swapBuildingPositions,
} from "../positions";

describe("clampBuildingPosition", () => {
  it("keeps coordinates within boundary limits", () => {
    const clamped = clampBuildingPosition({ x: -10, y: 150 });
    expect(clamped.x).toBeGreaterThanOrEqual(2);
    expect(clamped.x).toBeLessThanOrEqual(84);
    expect(clamped.y).toBeGreaterThanOrEqual(2);
    expect(clamped.y).toBeLessThanOrEqual(72);
  });

  it("leaves valid within-bound coordinates unchanged", () => {
    const pos = { x: 30, y: 40 };
    const clamped = clampBuildingPosition(pos);
    expect(clamped.x).toBe(30);
    expect(clamped.y).toBe(40);
  });
});

describe("generateDefaultPositions", () => {
  it("returns an empty array when count is <= 0", () => {
    expect(generateDefaultPositions(0)).toEqual([]);
  });

  it("generates the requested number of positions within canvas boundaries", () => {
    const positions = generateDefaultPositions(5, 4, 1050, 750);
    expect(positions).toHaveLength(5);
    for (const pos of positions) {
      expect(pos.x).toBeGreaterThanOrEqual(2);
      expect(pos.x).toBeLessThanOrEqual(84);
      expect(pos.y).toBeGreaterThanOrEqual(2);
      expect(pos.y).toBeLessThanOrEqual(72);
    }
  });
});

describe("findSwapTargetBuilding", () => {
  it("returns null when no candidate overlaps sufficiently", () => {
    const buildings = [
      { id: "b1", x: 10, y: 10 },
      { id: "b2", x: 60, y: 60 },
    ];
    const target = findSwapTargetBuilding("b1", { x: 10, y: 10 }, buildings);
    expect(target).toBeNull();
  });

  it("finds the candidate building when dragged directly over it", () => {
    const buildings = [
      { id: "b1", x: 10, y: 10 },
      { id: "b2", x: 20, y: 20 },
    ];
    // Drag b1 directly onto b2 (around 20, 20)
    const target = findSwapTargetBuilding("b1", { x: 20, y: 20 }, buildings);
    expect(target).not.toBeNull();
    expect(target?.id).toBe("b2");
  });
});

describe("swapBuildingPositions", () => {
  it("swaps the positions between dragged and target buildings", () => {
    const updates = swapBuildingPositions("b1", { x: 10, y: 15 }, "b2", { x: 40, y: 45 });
    expect(updates).toEqual([
      { id: "b1", x: 40, y: 45 },
      { id: "b2", x: 10, y: 15 },
    ]);
  });
});
