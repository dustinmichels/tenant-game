import { describe, it, expect, beforeEach } from "bun:test";
import { setActivePinia, createPinia } from "pinia";
import type { Building, CoalitionConnection, Tenant } from "../../types/game";
import {
  computeCoalitionGroups,
  getBuildingUnionCount,
  getTotalUnionCount,
  getCoalitionUnionCount,
  getCoalitionBuildingCount,
  isBuildingOrganized,
} from "../coalitions";
import {
  colorDistance,
  alterColorToBeDifferent,
  computeCoalitionColor,
  muteColor,
  MIN_COALITION_COLOR_DISTANCE,
} from "../colorTheory";
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

  it("counts number of buildings in a coalition correctly", () => {
    const b1 = makeBuilding("b-1", 1, "#e11d48", 3);
    const b2 = makeBuilding("b-2", 2, "#2563eb", 3);
    const b3 = makeBuilding("b-3", 3, "#059669", 0);
    const b4 = makeBuilding("b-4", 4, "#d97706", 0);

    // No coalition
    expect(getCoalitionBuildingCount([b1, b2, b3, b4], [])).toBe(0);

    // Connect b1 and b2
    const connections: CoalitionConnection[] = [{ id: "c1", sourceId: "b-1", targetId: "b-2" }];
    const groups = computeCoalitionGroups([b1, b2, b3, b4], connections);

    expect(getCoalitionBuildingCount([b1, b2, b3, b4], groups)).toBe(2);
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

    expect(getBuildingUnionCount(b1, groups)).toBe(1);
    expect(getBuildingUnionCount(b2, groups)).toBe(1);
    expect(getTotalUnionCount([b1, b2], groups)).toBe(2);
    expect(getCoalitionUnionCount([b1, b2], groups)).toBe(2);
  });

  it("0 are unionized until another has joined the instigator, or a coalition was formed with another group", () => {
    // b1 has only 1 instigator in union
    const b1 = makeBuilding("b-1", 1, "#e11d48", 1, 8);
    // b2 has only 1 instigator in union
    const b2 = makeBuilding("b-2", 2, "#2563eb", 1, 8);

    // 1. Standalone with 1 instigator: 0 unionized
    expect(getBuildingUnionCount(b1)).toBe(0);
    expect(getBuildingUnionCount(b2)).toBe(0);

    // 2. Another tenant joins instigator in b1: now 2 unionized in b1
    const b1Joined = makeBuilding("b-1", 1, "#e11d48", 2, 8);
    expect(getBuildingUnionCount(b1Joined)).toBe(2);

    // 3. Or coalition formed with another group: each contributes their member
    const connections: CoalitionConnection[] = [{ id: "c1", sourceId: "b-1", targetId: "b-2" }];
    const groups = computeCoalitionGroups([b1, b2], connections);
    expect(getBuildingUnionCount(b1, groups)).toBe(1);
    expect(getBuildingUnionCount(b2, groups)).toBe(1);
  });

  it("isBuildingOrganized returns true after two members total in the union (1 instigator + 1 joined)", () => {
    const b1Alone = makeBuilding("b-1", 1, "#e11d48", 1, 8);
    // 1 instigator alone: not organized
    expect(isBuildingOrganized(b1Alone)).toBe(false);

    // 2 members total (1 instigator + 1 joined resident): organized!
    const b1WithTwo = makeBuilding("b-1", 1, "#e11d48", 2, 8);
    expect(isBuildingOrganized(b1WithTwo)).toBe(true);

    // 3 members: organized
    const b1WithThree = makeBuilding("b-1", 1, "#e11d48", 3, 8);
    expect(isBuildingOrganized(b1WithThree)).toBe(true);
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
    const b1T2 = b1.tenants.find((t: Tenant) => !t.inUnion && !t.isInstigator)!;
    store.toggleUnion(b1.id, b1T2.id, true);

    // b1 now has 2 in union -> unionTenantsCount = 2, coalitionTenantsCount = 0
    expect(store.unionTenantsCount).toBe(2);
    expect(store.coalitionTenantsCount).toBe(0);

    // Add a second person to b2's union
    const b2T2 = b2.tenants.find((t: Tenant) => !t.inUnion && !t.isInstigator)!;
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
    const b3T2 = b3.tenants.find((t: Tenant) => !t.inUnion && !t.isInstigator)!;
    store.toggleUnion(b3.id, b3T2.id, true);

    // Total in union = 6 (b1: 2, b2: 2, b3: 2)
    // In coalition = 4 (b1: 2, b2: 2; b3 is not in coalition!)
    expect(store.unionTenantsCount).toBe(6);
    expect(store.coalitionTenantsCount).toBe(4);
    expect(store.coalitionBuildingsCount).toBe(2);

    // Disconnect coalition
    store.disconnectCoalition(store.coalitionConnections[0]!.id);
    expect(store.coalitionTenantsCount).toBe(0);
    expect(store.unionTenantsCount).toBe(6);
  });
});

describe("Coalition color combination and collision avoidance", () => {
  it("alters coalition color when the natural blend is too close to an existing building color", () => {
    // b1 (Rose Red) + b2 (Royal Blue) naturally blends to a Fuchsia-like purple (#ab39c3)
    // which has Delta E < 0.05 to Fuchsia (#c026d3)
    const b1 = makeBuilding("b-1", 1, "#e11d48", 3);
    const b2 = makeBuilding("b-2", 2, "#2563eb", 3);
    const b3 = makeBuilding("b-3", 3, "#c026d3", 3);

    const connections: CoalitionConnection[] = [{ id: "c1", sourceId: "b-1", targetId: "b-2" }];
    const groups = computeCoalitionGroups([b1, b2, b3], connections);

    expect(groups).toHaveLength(1);
    const coalitionColor = groups[0]!.dominantColor;
    expect(coalitionColor).toBeDefined();

    // Must be distinct from b3 (Fuchsia) and constituent buildings
    const distToB3 = colorDistance(coalitionColor, b3.color);
    expect(distToB3).toBeGreaterThanOrEqual(MIN_COALITION_COLOR_DISTANCE);

    const distToB1 = colorDistance(coalitionColor, b1.color);
    expect(distToB1).toBeGreaterThanOrEqual(MIN_COALITION_COLOR_DISTANCE);

    const distToB2 = colorDistance(coalitionColor, b2.color);
    expect(distToB2).toBeGreaterThanOrEqual(MIN_COALITION_COLOR_DISTANCE);
  });

  it("alters subsequent coalition color when it would clash with an already existing coalition", () => {
    // Two separate coalitions forming with the same color combination
    const b1 = makeBuilding("b-1", 1, "#e11d48", 3);
    const b2 = makeBuilding("b-2", 2, "#2563eb", 3);
    const b3 = makeBuilding("b-3", 3, "#e11d48", 3);
    const b4 = makeBuilding("b-4", 4, "#2563eb", 3);

    const connections: CoalitionConnection[] = [
      { id: "c1", sourceId: "b-1", targetId: "b-2" },
      { id: "c2", sourceId: "b-3", targetId: "b-4" },
    ];
    const groups = computeCoalitionGroups([b1, b2, b3, b4], connections);

    expect(groups).toHaveLength(2);
    const c1Color = groups[0]!.dominantColor;
    const c2Color = groups[1]!.dominantColor;

    expect(c1Color).not.toBe(c2Color);
    const distBetween = colorDistance(c1Color, c2Color);
    expect(distBetween).toBeGreaterThanOrEqual(MIN_COALITION_COLOR_DISTANCE);
  });

  it("alters coalition color when two buildings with the identical color merge", () => {
    const b1 = makeBuilding("b-1", 1, "#2563eb", 3);
    const b2 = makeBuilding("b-2", 2, "#2563eb", 3);

    const connections: CoalitionConnection[] = [{ id: "c1", sourceId: "b-1", targetId: "b-2" }];
    const groups = computeCoalitionGroups([b1, b2], connections);

    expect(groups).toHaveLength(1);
    const coalitionColor = groups[0]!.dominantColor;

    // Coalition color must be distinct from the original building color
    const dist = colorDistance(coalitionColor, b1.color);
    expect(dist).toBeGreaterThanOrEqual(MIN_COALITION_COLOR_DISTANCE);
  });

  it("preserves natural blend when no collision exists", () => {
    // Rose Red (#e11d48) + Amber Gold (#d97706) naturally blend to Orange
    const b1 = makeBuilding("b-1", 1, "#e11d48", 3);
    const b2 = makeBuilding("b-2", 2, "#d97706", 3);

    const connections: CoalitionConnection[] = [{ id: "c1", sourceId: "b-1", targetId: "b-2" }];
    const groups = computeCoalitionGroups([b1, b2], connections);

    expect(groups).toHaveLength(1);
    const coalitionColor = groups[0]!.dominantColor;
    expect(coalitionColor).toBe("#e2511e");
  });

  it("alterColorToBeDifferent returns baseColor when no existing colors are provided or already far enough", () => {
    expect(alterColorToBeDifferent("#2563eb", [])).toBe("#2563eb");
    expect(alterColorToBeDifferent("#2563eb", ["#e11d48"])).toBe("#2563eb");
    expect(alterColorToBeDifferent("", ["#2563eb"])).toBe("#7c3aed");
  });

  it("alterColorToBeDifferent shifts hue/lightness to find a valid color above the threshold", () => {
    const colliding = "#2563eb";
    const altered = alterColorToBeDifferent(colliding, [colliding], 0.08);
    expect(altered).not.toBe(colliding);
    expect(colorDistance(altered, colliding)).toBeGreaterThanOrEqual(0.08);
  });

  it("computeCoalitionColor accepts existingColors parameter and alters color when clashing", () => {
    const b1 = { id: "b1", color: "#e11d48" };
    const b2 = { id: "b2", color: "#2563eb" };
    // Natural blend is #ab39c3. Provide an existing building that has #ab39c3.
    const result = computeCoalitionColor([b1, b2], [], ["#ab39c3"]);
    expect(result).not.toBe("#ab39c3");
    expect(colorDistance(result, "#ab39c3")).toBeGreaterThanOrEqual(MIN_COALITION_COLOR_DISTANCE);
  });
});

describe("muteColor utility for neighborhood setup mode", () => {
  it("produces a softer, more muted color by reducing chroma", () => {
    const vividColors = ["#e0633b", "#2563eb", "#10b981", "#d97706", "#8b5cf6"];
    for (const hex of vividColors) {
      const muted = muteColor(hex);
      expect(muted).not.toBe(hex);
      expect(typeof muted).toBe("string");
      expect(muted.startsWith("#")).toBe(true);
    }
  });

  it("gracefully handles empty or invalid strings", () => {
    expect(muteColor("")).toBe("");
    expect(muteColor("invalid-color")).toBe("invalid-color");
  });

  it("allows custom chroma factors", () => {
    const hex = "#2563eb";
    const standardMuted = muteColor(hex, 0.65);
    const extraMuted = muteColor(hex, 0.3);
    expect(standardMuted).not.toBe(extraMuted);
  });
});
