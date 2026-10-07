/// <reference types="bun" />
import { describe, it, expect, beforeEach } from "bun:test";
import {
  generateScatteredPositions,
  checkBuildingOverlap,
  clampBuildingPosition,
  repulseBuildingFrom,
  resolveBuildingCollisions,
} from "../types/game";
import { useGameStorage } from "../composables/useGameStorage";

// In-memory localStorage mock for headless Bun test runner
if (typeof globalThis.localStorage === "undefined") {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) {
        delete store[k];
      }
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
}

describe("generateScatteredPositions alignment & collision avoidance", () => {
  it("returns empty array for non-positive count", () => {
    expect(generateScatteredPositions(0)).toEqual([]);
    expect(generateScatteredPositions(-2)).toEqual([]);
  });

  it("keeps single building well centered away from landlord corner", () => {
    const pos = generateScatteredPositions(1);
    expect(pos).toHaveLength(1);
    expect(pos[0]!.x).toBeGreaterThan(15);
    expect(pos[0]!.x).toBeLessThan(65);
  });

  it("generates zero-overlap positions for counts from 2 to 9", () => {
    for (const count of [2, 3, 4, 5, 6, 7, 8, 9]) {
      const positions = generateScatteredPositions(count);
      expect(positions).toHaveLength(count);

      for (let i = 0; i < positions.length; i++) {
        const p1 = positions[i]!;
        // All within canvas boundaries
        expect(p1.x).toBeGreaterThanOrEqual(3);
        expect(p1.x).toBeLessThanOrEqual(78);
        expect(p1.y).toBeGreaterThanOrEqual(3);
        expect(p1.y).toBeLessThanOrEqual(82);

        // Avoid landlord office (x >= 70% && y <= 28%)
        if (p1.y <= 28) {
          expect(p1.x).toBeLessThan(70);
        }

        // Pairwise collision check
        for (let j = i + 1; j < positions.length; j++) {
          const p2 = positions[j]!;
          const dx = Math.abs(p1.x - p2.x);
          const dy = Math.abs(p1.y - p2.y);
          // Minimum clearance: must have either adequate horizontal or vertical separation
          const hasClearance = dx >= 16 || dy >= 25;
          expect(hasClearance).toBe(true);
        }
      }
    }
  });
});

describe("useGameStorage shufflePositions", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("reshuffles building positions to new coordinates", () => {
    const { setupGame, buildings, shufflePositions } = useGameStorage();
    setupGame(5, 8);

    const initialCoords = buildings.value.map((b) => ({ x: b.x, y: b.y }));

    // Execute shuffle
    shufflePositions();
    const newCoords = buildings.value.map((b) => ({ x: b.x, y: b.y }));
    expect(newCoords).toHaveLength(5);
    // Shuffled positions should not match initial coordinates
    expect(newCoords).not.toEqual(initialCoords);

    // Verify all buildings still have valid coordinates within bounds
    for (const b of buildings.value) {
      expect(b.x).toBeGreaterThanOrEqual(3);
      expect(b.x).toBeLessThanOrEqual(78);
      expect(b.y).toBeGreaterThanOrEqual(3);
      expect(b.y).toBeLessThanOrEqual(82);
    }
  });
});

describe("Building drag-and-drop collision repulsion", () => {
  it("detects building overlap accurately", () => {
    // Overlapping at same coordinates
    expect(checkBuildingOverlap({ x: 20, y: 20 }, { x: 20, y: 20 })).toBe(true);
    // Overlapping within default dimensions (16w, 24h + 1.5 margin = 17.5w, 25.5h)
    expect(checkBuildingOverlap({ x: 20, y: 20 }, { x: 25, y: 25 })).toBe(true);
    // Non-overlapping with horizontal clearance
    expect(checkBuildingOverlap({ x: 20, y: 20 }, { x: 40, y: 20 })).toBe(false);
    // Non-overlapping with vertical clearance
    expect(checkBuildingOverlap({ x: 20, y: 20 }, { x: 20, y: 50 })).toBe(false);
  });

  it("clamps building positions and deflects away from landlord office", () => {
    // Canvas boundaries
    expect(clampBuildingPosition({ x: -10, y: 20 })).toEqual({ x: 2, y: 20 });
    expect(clampBuildingPosition({ x: 100, y: 50 })).toEqual({ x: 82, y: 50 });

    // Landlord corner avoidance (x >= 68, y <= 28)
    const clampedLandlord = clampBuildingPosition({ x: 75, y: 20 });
    expect(clampedLandlord.x < 68 || clampedLandlord.y > 28).toBe(true);
  });

  it("repulses target building away from source when placed concentric", () => {
    const source = { x: 30, y: 30 };
    const target = { x: 30, y: 30 };
    const repulsed = repulseBuildingFrom(source, target);

    // Target must be moved far enough so that it no longer overlaps source
    expect(checkBuildingOverlap(source, repulsed)).toBe(false);
    // Must remain within canvas bounds
    expect(repulsed.x).toBeGreaterThanOrEqual(2);
    expect(repulsed.x).toBeLessThanOrEqual(82);
    expect(repulsed.y).toBeGreaterThanOrEqual(2);
    expect(repulsed.y).toBeLessThanOrEqual(80);
  });

  it("repulses the one being placed upon out of the way when placed on top", () => {
    const buildings = [
      { id: "b-1", x: 25, y: 25 },
      { id: "b-2", x: 25, y: 25 }, // placed right on top of b-2
      { id: "b-3", x: 60, y: 60 },
    ];

    const updates = resolveBuildingCollisions("b-1", buildings);

    // Placed building b-1 itself must NOT be in the updates
    expect(updates.some((u) => u.id === "b-1")).toBe(false);
    // b-2 must be repulsed
    const b2Update = updates.find((u) => u.id === "b-2");
    expect(b2Update).toBeDefined();
    expect(b2Update!.x !== 25 || b2Update!.y !== 25).toBe(true);

    // Verify that after updates, b-1 and b-2 no longer overlap
    const newB2 = { x: b2Update!.x, y: b2Update!.y };
    expect(checkBuildingOverlap({ x: 25, y: 25 }, newB2)).toBe(false);
  });

  it("handles cascading repulsion (domino effect)", () => {
    const buildings = [
      { id: "b-1", x: 10, y: 20 },
      { id: "b-2", x: 14, y: 20 }, // overlaps b-1
      { id: "b-3", x: 32, y: 20 }, // will be overlapped when b-2 is repulsed
    ];

    const updates = resolveBuildingCollisions("b-1", buildings);
    expect(updates.length).toBeGreaterThanOrEqual(1);

    // Apply updates and verify all pairs have zero overlap
    const finalPositions = new Map(buildings.map((b) => [b.id, { x: b.x, y: b.y }]));
    for (const u of updates) {
      finalPositions.set(u.id, { x: u.x, y: u.y });
    }

    const b1 = finalPositions.get("b-1")!;
    const b2 = finalPositions.get("b-2")!;
    const b3 = finalPositions.get("b-3")!;

    expect(checkBuildingOverlap(b1, b2)).toBe(false);
    expect(checkBuildingOverlap(b2, b3)).toBe(false);
    expect(checkBuildingOverlap(b1, b3)).toBe(false);
  });

  it("returns empty updates when there is no collision", () => {
    const buildings = [
      { id: "b-1", x: 10, y: 10 },
      { id: "b-2", x: 40, y: 40 },
      { id: "b-3", x: 70, y: 60 },
    ];

    const updates = resolveBuildingCollisions("b-1", buildings);
    expect(updates).toEqual([]);
  });
});

describe("useGameStorage updateBuildingPositions", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("batch updates multiple building positions in a single persist", () => {
    const { setupGame, buildings, updateBuildingPositions } = useGameStorage();
    setupGame(3, 8);

    const targetUpdates = [
      { id: "b-1", x: 15.5, y: 22.0 },
      { id: "b-2", x: 45.0, y: 35.5 },
    ];

    updateBuildingPositions(targetUpdates);

    const b1 = buildings.value.find((b) => b.id === "b-1");
    const b2 = buildings.value.find((b) => b.id === "b-2");
    expect(b1?.x).toBe(15.5);
    expect(b1?.y).toBe(22.0);
    expect(b2?.x).toBe(45.0);
    expect(b2?.y).toBe(35.5);

    // Check that it persisted in localStorage
    const saved = JSON.parse(localStorage.getItem("tenant_union_game_state_v1") || "{}");
    const savedB1 = saved.buildings?.find(
      (b: { id: string; x: number; y: number }) => b.id === "b-1",
    );
    expect(savedB1?.x).toBe(15.5);
    expect(savedB1?.y).toBe(22.0);
  });
});
