import { describe, it, expect, beforeEach } from "bun:test";
import { setActivePinia, createPinia } from "pinia";
import type { Building, CoalitionConnection } from "../../types/game";
import {
  computeCoalitionGroups,
  getBuildingUnionCount,
  getTotalUnionCount,
  getCoalitionUnionCount,
} from "../coalitions";
import { useGameStore } from "../../stores/game";

function makeBuilding(
  id: string,
  index: number,
  color: string,
  unionCount: number,
  totalCount = 8,
): Building {
  return {
    id,
    index,
    label: `Building ${index}`,
    color,
    x: index * 20,
    y: 30,
    tenants: Array.from({ length: totalCount }, (_, i) => ({
      id: `t-${id}-${i + 1}`,
      buildingId: id,
      variant: i % 5,
      isInstigator: i === 0,
      inUnion: i < unionCount,
      isEvicted: false,
    })),
  };
}

describe("Coalition and Union counting logic", () => {
  it("counts all union members as both in-union and in-coalition when two buildings form a coalition", () => {
    // 3 people in union for Building 1, 3 people in union for Building 2
    const b1 = makeBuilding("b-1", 1, "#e11d48", 3);
    const b2 = makeBuilding("b-2", 2, "#2563eb", 3);

    const connections: CoalitionConnection[] = [{ id: "c1", sourceId: "b-1", targetId: "b-2" }];
    const groups = computeCoalitionGroups([b1, b2], connections);

    expect(getTotalUnionCount([b1, b2], groups)).toBe(6);
    expect(getCoalitionUnionCount([b1, b2], groups)).toBe(6);
  });

  it("counts standalone building union members only as in-union, not in-coalition", () => {
    // b1 and b2 are in a coalition with 3 union members each
    const b1 = makeBuilding("b-1", 1, "#e11d48", 3);
    const b2 = makeBuilding("b-2", 2, "#2563eb", 3);
    // b3 is NOT in a coalition, has 3 union members
    const b3 = makeBuilding("b-3", 3, "#059669", 3);

    const connections: CoalitionConnection[] = [{ id: "c1", sourceId: "b-1", targetId: "b-2" }];
    const groups = computeCoalitionGroups([b1, b2, b3], connections);

    // Total in union = 3 + 3 + 3 = 9
    expect(getTotalUnionCount([b1, b2, b3], groups)).toBe(9);
    // In coalition = 3 + 3 = 6 (b3 is not in coalition)
    expect(getCoalitionUnionCount([b1, b2, b3], groups)).toBe(6);
  });

  it("handles coalition formed by two buildings with 1 person each", () => {
    // Individually 1 person doesn't make a union (returns 0)
    const b1 = makeBuilding("b-1", 1, "#e11d48", 1);
    const b2 = makeBuilding("b-2", 2, "#2563eb", 1);

    expect(getBuildingUnionCount(b1)).toBe(0);
    expect(getBuildingUnionCount(b2)).toBe(0);

    // When connected into a coalition, total union members >= 2, so both count
    const connections: CoalitionConnection[] = [{ id: "c1", sourceId: "b-1", targetId: "b-2" }];
    const groups = computeCoalitionGroups([b1, b2], connections);

    expect(getTotalUnionCount([b1, b2], groups)).toBe(2);
    expect(getCoalitionUnionCount([b1, b2], groups)).toBe(2);
  });

  it("excludes evicted tenants from coalition count and union count", () => {
    const b1 = makeBuilding("b-1", 1, "#e11d48", 3);
    const b2 = makeBuilding("b-2", 2, "#2563eb", 3);

    // Evict 1 union member from b1
    b1.tenants[1]!.isEvicted = true;

    const connections: CoalitionConnection[] = [{ id: "c1", sourceId: "b-1", targetId: "b-2" }];
    const groups = computeCoalitionGroups([b1, b2], connections);

    expect(getTotalUnionCount([b1, b2], groups)).toBe(5);
    expect(getCoalitionUnionCount([b1, b2], groups)).toBe(5);
  });

  it("returns 0 for in-coalition when no coalitions exist", () => {
    const b1 = makeBuilding("b-1", 1, "#e11d48", 3);
    const b2 = makeBuilding("b-2", 2, "#2563eb", 4);

    expect(getTotalUnionCount([b1, b2], [])).toBe(7);
    expect(getCoalitionUnionCount([b1, b2], [])).toBe(0);
  });
});

describe("game store coalitionTenantsCount integration", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  it("reactively updates coalitionTenantsCount when coalitions are formed and disconnected", () => {
    const store = useGameStore();
    store.setupGame(3, 4);

    const b1 = store.buildings[0]!;
    const b2 = store.buildings[1]!;
    const b3 = store.buildings[2]!;

    // Initially 0 in union (each building has only 1 instigator, >= 2 needed)
    expect(store.unionTenantsCount).toBe(0);
    expect(store.coalitionTenantsCount).toBe(0);

    // Add a second person to b1's union
    const b1T2 = b1.tenants.find((t) => !t.inUnion && !t.isInstigator)!;
    store.toggleUnion(b1.id, b1T2.id, true);

    // b1 now has 2 in union -> unionTenantsCount = 2, coalitionTenantsCount = 0
    expect(store.unionTenantsCount).toBe(2);
    expect(store.coalitionTenantsCount).toBe(0);

    // Add a second person to b2's union
    const b2T2 = b2.tenants.find((t) => !t.inUnion && !t.isInstigator)!;
    store.toggleUnion(b2.id, b2T2.id, true);

    // b2 now has 2 in union -> unionTenantsCount = 4, coalitionTenantsCount = 0
    expect(store.unionTenantsCount).toBe(4);
    expect(store.coalitionTenantsCount).toBe(0);

    // Connect b1 and b2 in a coalition
    store.connectCoalition(b1.id, b2.id);

    // b1 and b2 are now in coalition -> unionTenantsCount = 4, coalitionTenantsCount = 4
    expect(store.unionTenantsCount).toBe(4);
    expect(store.coalitionTenantsCount).toBe(4);

    // Add 2 people to b3 (standalone building)
    const b3T2 = b3.tenants.find((t) => !t.inUnion && !t.isInstigator)!;
    store.toggleUnion(b3.id, b3T2.id, true);

    // Total in union = 6 (b1: 2, b2: 2, b3: 2)
    // In coalition = 4 (b1: 2, b2: 2; b3 is not in coalition!)
    expect(store.unionTenantsCount).toBe(6);
    expect(store.coalitionTenantsCount).toBe(4);

    // Disconnect coalition
    store.disconnectCoalition(store.coalitionConnections[0]!.id);
    expect(store.coalitionTenantsCount).toBe(0);
    expect(store.unionTenantsCount).toBe(6);
  });
});
