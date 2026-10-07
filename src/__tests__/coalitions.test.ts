/// <reference types="bun" />
import { describe, it, expect, beforeEach } from "bun:test";
import type { Building, CoalitionConnection } from "../types/game";
import {
  computeCoalitionGroups,
  getEffectiveBuildingColorMap,
  getBuildingUnionCount,
} from "../types/game";
import { useGameStorage } from "../composables/useGameStorage";

// In-memory localStorage mock for headless Bun test runner
if (typeof globalThis.localStorage === "undefined") {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
}
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

describe("Coalition logic & color dominance", () => {
  it("determines dominant color based on whichever building has more unionized people", () => {
    // Building 1 (Red) has 5 unionized people
    const b1 = makeBuilding("b-1", 1, "#e11d48", 5);
    // Building 2 (Blue) has 2 unionized people
    const b2 = makeBuilding("b-2", 2, "#2563eb", 2);

    const connections: CoalitionConnection[] = [{ id: "c1", sourceId: "b-1", targetId: "b-2" }];

    const groups = computeCoalitionGroups([b1, b2], connections);
    expect(groups.length).toBe(1);
    expect(groups[0]?.dominantColor).toBe("#e11d48"); // Red has more people (5 > 2)

    const colorMap = getEffectiveBuildingColorMap([b1, b2], connections);
    expect(colorMap["b-1"]).toBe("#e11d48");
    expect(colorMap["b-2"]).toBe("#e11d48"); // Building 2 adopts Red!
  });

  it("dynamically switches dominant color when the other building gains more unionized people", () => {
    // Initially Building 1 has 4, Building 2 has 2
    const b1 = makeBuilding("b-1", 1, "#e11d48", 4);
    const b2 = makeBuilding("b-2", 2, "#2563eb", 2);

    const connections: CoalitionConnection[] = [{ id: "c1", sourceId: "b-1", targetId: "b-2" }];

    let groups = computeCoalitionGroups([b1, b2], connections);
    expect(groups[0]?.dominantColor).toBe("#e11d48");

    // Now Building 2 organizes more people and has 6
    b2.tenants.forEach((t, i) => {
      t.inUnion = i < 6;
    });

    expect(getBuildingUnionCount(b2)).toBe(6);
    expect(getBuildingUnionCount(b1)).toBe(4);

    groups = computeCoalitionGroups([b1, b2], connections);
    expect(groups[0]?.dominantColor).toBe("#2563eb"); // Blue now has more people (6 > 4)

    const colorMap = getEffectiveBuildingColorMap([b1, b2], connections);
    expect(colorMap["b-1"]).toBe("#2563eb"); // Building 1 now becomes Blue!
    expect(colorMap["b-2"]).toBe("#2563eb");
  });

  it("breaks ties deterministically by lower building index", () => {
    // Both have 3 union members
    const b1 = makeBuilding("b-1", 1, "#e11d48", 3);
    const b2 = makeBuilding("b-2", 2, "#2563eb", 3);

    const connections: CoalitionConnection[] = [{ id: "c1", sourceId: "b-1", targetId: "b-2" }];

    const groups = computeCoalitionGroups([b1, b2], connections);
    expect(groups[0]?.dominantColor).toBe("#e11d48"); // Building 1 wins tie-break (index 1 < 2)
  });

  it("reverts to original building colors when coalition is disconnected", () => {
    const b1 = makeBuilding("b-1", 1, "#e11d48", 5);
    const b2 = makeBuilding("b-2", 2, "#2563eb", 2);

    // No connections
    const connections: CoalitionConnection[] = [];

    const groups = computeCoalitionGroups([b1, b2], connections);
    expect(groups.length).toBe(0);

    const colorMap = getEffectiveBuildingColorMap([b1, b2], connections);
    expect(colorMap["b-1"]).toBe("#e11d48");
    expect(colorMap["b-2"]).toBe("#2563eb");
  });

  it("handles 3-building transitive coalition and picks highest color count", () => {
    const b1 = makeBuilding("b-1", 1, "#e11d48", 2);
    const b2 = makeBuilding("b-2", 2, "#2563eb", 3);
    const b3 = makeBuilding("b-3", 3, "#059669", 7); // Green has most

    const connections: CoalitionConnection[] = [
      { id: "c1", sourceId: "b-1", targetId: "b-2" },
      { id: "c2", sourceId: "b-2", targetId: "b-3" },
    ];

    const groups = computeCoalitionGroups([b1, b2, b3], connections);
    expect(groups.length).toBe(1);
    expect(groups[0]?.buildingIds).toEqual(["b-1", "b-2", "b-3"]);
    expect(groups[0]?.dominantColor).toBe("#059669"); // Green wins

    const colorMap = getEffectiveBuildingColorMap([b1, b2, b3], connections);
    expect(colorMap["b-1"]).toBe("#059669");
    expect(colorMap["b-2"]).toBe("#059669");
    expect(colorMap["b-3"]).toBe("#059669");
  });

  it("excludes evicted tenants from active union count", () => {
    const b1 = makeBuilding("b-1", 1, "#e11d48", 4);
    const b2 = makeBuilding("b-2", 2, "#2563eb", 3);

    // Evict 2 tenants from building 1 so it only has 2 active
    b1.tenants[0]!.isEvicted = true;
    b1.tenants[1]!.isEvicted = true;

    expect(getBuildingUnionCount(b1)).toBe(2);
    expect(getBuildingUnionCount(b2)).toBe(3);

    const connections: CoalitionConnection[] = [{ id: "c1", sourceId: "b-1", targetId: "b-2" }];

    const groups = computeCoalitionGroups([b1, b2], connections);
    expect(groups[0]?.dominantColor).toBe("#2563eb"); // Building 2 wins active union count (3 > 2)
  });
});
describe("Building union counting rules (needs 2 people to count)", () => {
  it("returns 0 when building only has 1 person in union (even if instigator)", () => {
    const b = makeBuilding("b-1", 1, "#e11d48", 1); // 1 instigator in union
    expect(getBuildingUnionCount(b)).toBe(0);
  });

  it("returns 2 when 2 people in a building are in a union", () => {
    const b = makeBuilding("b-1", 1, "#e11d48", 2); // 1 instigator + 1 tenant
    expect(getBuildingUnionCount(b)).toBe(2);
  });

  it("returns 3 when 3 people in a building are in a union", () => {
    const b = makeBuilding("b-1", 1, "#e11d48", 3);
    expect(getBuildingUnionCount(b)).toBe(3);
  });

  it("drops back to 0 when one of two union members is evicted", () => {
    const b = makeBuilding("b-1", 1, "#e11d48", 2);
    expect(getBuildingUnionCount(b)).toBe(2);
    b.tenants[1]!.isEvicted = true;
    expect(getBuildingUnionCount(b)).toBe(0);
  });
});

describe("useGameStorage coalition integration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("connects buildings, updates coalition groups, and allows undo", () => {
    const storage = useGameStorage();
    storage.setupGame(3, 8);

    const bldgs = storage.buildings.value;
    const id1 = bldgs[0]!.id;
    const id2 = bldgs[1]!.id;

    // Initially no coalitions
    expect(storage.coalitions.value.length).toBe(0);
    expect(storage.canUndoCoalition.value).toBe(false);

    // Connect building 1 and building 2
    const success = storage.connectCoalition(id1, id2);
    expect(success).toBe(true);
    expect(storage.coalitions.value.length).toBe(1);
    expect(storage.canUndoCoalition.value).toBe(true);

    // Cannot connect same pair again
    const duplicate = storage.connectCoalition(id1, id2);
    expect(duplicate).toBe(false);

    // Cannot connect building to itself
    const self = storage.connectCoalition(id1, id1);
    expect(self).toBe(false);

    // Effective colors match dominant coalition color
    const group = storage.coalitions.value[0]!;
    expect(storage.buildingColorMap.value[id1]).toBe(group.dominantColor);
    expect(storage.buildingColorMap.value[id2]).toBe(group.dominantColor);

    // Undo last coalition
    const undone = storage.undoLastCoalition();
    expect(undone).toBe(true);
    expect(storage.coalitions.value.length).toBe(0);
    expect(storage.canUndoCoalition.value).toBe(false);
  });

  it("disconnects by connectionId and by buildingId", () => {
    const storage = useGameStorage();
    storage.setupGame(4, 6);

    const bldgs = storage.buildings.value;
    const id1 = bldgs[0]!.id;
    const id2 = bldgs[1]!.id;
    const id3 = bldgs[2]!.id;

    storage.connectCoalition(id1, id2);
    storage.connectCoalition(id2, id3);
    expect(storage.coalitionConnections.value.length).toBe(2);

    // Disconnect building 2 -> removes both connections
    storage.disconnectBuilding(id2);
    expect(storage.coalitionConnections.value.length).toBe(0);
    expect(storage.coalitions.value.length).toBe(0);
  });

  it("partitions buildings into active coalitions and independent buildings", () => {
    const storage = useGameStorage();
    storage.setupGame(3, 6);

    const bldgs = storage.buildings.value;
    const [b1, b2, b3] = bldgs;

    // Initially no coalitions: all 3 buildings are independent
    expect(storage.coalitions.value.length).toBe(0);

    // Form Coalition 1 between b1 and b2
    storage.connectCoalition(b1!.id, b2!.id);
    expect(storage.coalitions.value.length).toBe(1);

    const coalition1 = storage.coalitions.value[0]!;
    expect(coalition1.buildingIds).toEqual([b1!.id, b2!.id].sort());
    // b3 is independent
    const inCoalition = storage.coalitions.value.flatMap((c) => c.buildingIds);
    expect(inCoalition.includes(b1!.id)).toBe(true);
    expect(inCoalition.includes(b2!.id)).toBe(true);
    expect(inCoalition.includes(b3!.id)).toBe(false);

    // Connect b3 to Coalition 1
    storage.connectCoalition(b2!.id, b3!.id);
    expect(storage.coalitions.value.length).toBe(1);
    expect(storage.coalitions.value[0]!.buildingIds.length).toBe(3);

    // Disconnect b2 -> removes connections, reverts to independent buildings
    storage.disconnectBuilding(b2!.id);
    expect(storage.coalitions.value.length).toBe(0);
  });
});
