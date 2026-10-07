import { describe, expect, it, beforeEach } from "bun:test";
import { setActivePinia, createPinia } from "pinia";
import { useGameStore } from "../game";
import type { Tenant } from "../../types/game";

describe("game store phase navigation", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  it("advances and decrements phases sequentially", () => {
    const store = useGameStore();
    store.setupGame(2, 3);
    expect(store.round).toBe(1);
    expect(store.phase).toBe(1);

    store.nextPhase();
    expect(store.phase).toBe(2);

    store.nextPhase();
    expect(store.phase).toBe(3);

    store.nextPhase();
    expect(store.round).toBe(2);
    expect(store.phase).toBe(1);

    store.prevPhase();
    expect(store.round).toBe(1);
    expect(store.phase).toBe(3);
  });
});

describe("game store tallies change tracking", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  it("tracks organizedChange and evictions per round", () => {
    const store = useGameStore();
    store.setupGame(2, 4);

    // Initial state: round 1 starts with 0 organized (instigators alone do not meet 2+ rule)
    expect(store.round).toBe(1);
    expect(store.tallies[1]?.organizedChange).toBe(0);
    expect(store.tallies[1]?.evictions).toBe(0);

    const b1 = store.buildings[0]!;
    const nonInstigatorB1 = b1.tenants.find((t: Tenant) => !t.isInstigator)!;

    // Tenant in B1 joins union -> B1 now has 2 members -> totalOrganized = 2
    store.toggleUnion(b1.id, nonInstigatorB1.id, true);
    expect(store.tallies[1]?.totalOrganized).toBe(2);
    expect(store.tallies[1]?.organizedChange).toBe(2);

    // Evict a tenant in B1 in round 1
    const tenantToEvict = b1.tenants.find((t: Tenant) => !t.inUnion && !t.isInstigator)!;
    store.toggleEviction(b1.id, tenantToEvict.id, true);
    expect(store.tallies[1]?.evictions).toBe(1);
    expect(store.tallies[1]?.totalEvictions).toBe(1);

    // Advance through phases to round 2 (phase 1 -> 2 -> 3 -> round 2 phase 1)
    store.nextPhase();
    store.nextPhase();
    store.nextPhase();
    expect(store.round).toBe(2);
    expect(store.phase).toBe(1);

    // Round 2 initial tally: organizedChange = 0 (no new union members yet), evictions = 0
    expect(store.tallies[2]?.totalOrganized).toBe(2);
    expect(store.tallies[2]?.organizedChange).toBe(0);
    expect(store.tallies[2]?.evictions).toBe(0);
    expect(store.tallies[2]?.totalEvictions).toBe(1);

    // Another tenant in B1 joins union in round 2 -> totalOrganized = 3
    const anotherTenant = b1.tenants.find(
      (t: Tenant) => !t.inUnion && !t.isInstigator && !t.isEvicted,
    )!;
    store.toggleUnion(b1.id, anotherTenant.id, true);
    expect(store.tallies[2]?.totalOrganized).toBe(3);
    expect(store.tallies[2]?.organizedChange).toBe(1);

    // Evict another tenant in round 2
    const b2 = store.buildings[1]!;
    const b2Tenant = b2.tenants.find((t: Tenant) => !t.inUnion && !t.isInstigator)!;
    store.toggleEviction(b2.id, b2Tenant.id, true);
    expect(store.tallies[2]?.evictions).toBe(1);
    expect(store.tallies[2]?.totalEvictions).toBe(2);
    // Round 1 evictions still recorded as 1
    expect(store.tallies[1]?.evictions).toBe(1);

    // Advance to round 3
    store.nextPhase();
    store.nextPhase();
    store.nextPhase();
    expect(store.round).toBe(3);

    // Tenant leaves union in round 3 -> totalOrganized drops from 3 to 2
    store.toggleUnion(b1.id, anotherTenant.id, false);
    expect(store.tallies[3]?.totalOrganized).toBe(2);
    expect(store.tallies[3]?.organizedChange).toBe(-1);
  });
});
describe("game store event undo functionality", () => {
  beforeEach(() => {
    const pinia = createPinia();
    setActivePinia(pinia);
  });

  it("undoes a spend event, restoring landlord funds and spending tallies", () => {
    const store = useGameStore();
    store.setupGame(2, 4, 200000);

    store.spendLandlordMoney(50000);
    expect(store.landlordMoney).toBe(150000);
    expect(store.tallies[1]?.landlordSpending).toBe(50000);
    expect(store.events.length).toBe(1);

    const spendEvent = store.events[0]!;
    expect(spendEvent.type).toBe("spend");
    expect(spendEvent.action?.type).toBe("spend");

    const success = store.undoEvent(spendEvent.id);
    expect(success).toBe(true);
    expect(store.landlordMoney).toBe(200000);
    expect(store.tallies[1]?.landlordSpending).toBeNull();
    expect(store.tallies[1]?.landlordRemaining).toBe(200000);
    expect(store.events.length).toBe(0);
  });

  it("undoes a join union event, removing union status and updating tallies", () => {
    const store = useGameStore();
    store.setupGame(2, 4);

    const building = store.buildings[0]!;
    const tenant = building.tenants.find((t) => !t.isInstigator && !t.inUnion)!;
    const prevUnionCount = store.unionTenantsCount;

    store.toggleUnion(building.id, tenant.id, true);
    expect(tenant.inUnion).toBe(true);
    expect(store.unionTenantsCount).toBe(2);

    const unionEvent = store.events.find((e) => e.action?.tenantId === tenant.id)!;
    expect(unionEvent).toBeDefined();

    const success = store.undoEvent(unionEvent.id);
    expect(success).toBe(true);
    expect(tenant.inUnion).toBe(false);
    expect(store.unionTenantsCount).toBe(prevUnionCount);
    expect(store.events.find((e) => e.id === unionEvent.id)).toBeUndefined();
  });

  it("undoes an eviction event, removing eviction status and updating tallies across rounds", () => {
    const store = useGameStore();
    store.setupGame(2, 4);

    const building = store.buildings[0]!;
    const tenant = building.tenants[0]!;

    store.toggleEviction(building.id, tenant.id, true);
    expect(tenant.isEvicted).toBe(true);
    expect(store.tallies[1]?.evictions).toBe(1);

    // Advance to round 2
    store.nextPhase();
    store.nextPhase();
    store.nextPhase();
    expect(store.round).toBe(2);
    expect(store.tallies[2]?.totalEvictions).toBe(1);

    const evictEvent = store.events.find((e) => e.action?.type === "evict")!;
    expect(evictEvent).toBeDefined();

    const success = store.undoEvent(evictEvent.id);
    expect(success).toBe(true);
    expect(tenant.isEvicted).toBe(false);
    expect(tenant.evictedRound).toBeUndefined();
    expect(store.tallies[1]?.evictions).toBe(0);
    expect(store.tallies[2]?.totalEvictions).toBe(0);
    expect(store.events.length).toBe(0);
  });

  it("undoes a coalition connection event, disconnecting the coalition and updating tallies", () => {
    const store = useGameStore();
    store.setupGame(2, 4);

    const b1 = store.buildings[0]!;
    const b2 = store.buildings[1]!;

    store.connectCoalition(b1.id, b2.id);
    expect(store.coalitionConnections.length).toBe(1);

    const coalitionEvent = store.events.find((e) => e.action?.type === "connectCoalition")!;
    expect(coalitionEvent).toBeDefined();

    const success = store.undoEvent(coalitionEvent.id);
    expect(success).toBe(true);
    expect(store.coalitionConnections.length).toBe(0);
    expect(store.events.find((e) => e.id === coalitionEvent.id)).toBeUndefined();
  });
});

describe("game store setup defaults", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  it("starts new games with the landlord building hidden", () => {
    const store = useGameStore();

    store.setupGame(5, 5);

    expect(store.showLandlord).toBe(false);
  });
});

describe("game store building architectural variety", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  it("generates buildings with diverse roof types and balcony variations", () => {
    const store = useGameStore();
    store.setupGame(4, 6);

    expect(store.buildings.length).toBe(4);
    const roofs = store.buildings.map((b) => b.roofType);
    const balconies = store.buildings.map((b) => b.hasBalcony);
    const plantList = store.buildings.map((b) => b.plant ?? b.bush);

    // Contains flat, pitched, and flat-chairs roofs
    expect(roofs).toContain("flat");
    expect(roofs).toContain("pitched");
    expect(roofs).toContain("flat-chairs");

    // Contains buildings both with and without balconies
    expect(balconies).toContain(true);
    expect(balconies).toContain(false);

    // Contains buildings with plant variations (flower, bush, none)
    expect(plantList).toContain("flower");
    expect(plantList).toContain("bush");
    expect(plantList).toContain("none");
  });
  it("generates building plants respecting rarity limits (<= 1 bush, <= 2 flowers per 5 houses)", () => {
    const store = useGameStore();
    store.setupGame(15, 4);

    const plants = store.buildings.map((b) => b.plant ?? "none");
    for (let start = 0; start <= plants.length - 5; start++) {
      const window = plants.slice(start, start + 5);
      const bushCount = window.filter((p) => p === "bush").length;
      const flowerCount = window.filter((p) => p === "flower").length;

      expect(bushCount).toBeLessThanOrEqual(1);
      expect(flowerCount).toBeLessThanOrEqual(2);
    }
  });

  it("updates roof type, hasBalcony, and plant via adjustBuildingTenants", () => {
    const store = useGameStore();
    store.setupGame(2, 4);

    const b1 = store.buildings[0]!;
    store.adjustBuildingTenants(
      b1.id,
      5,
      "Empire Heights",
      "#d97706",
      "flat-chairs",
      true,
      "flower",
    );

    expect(b1.label).toBe("Empire Heights");
    expect(b1.color).toBe("#d97706");
    expect(b1.roofType).toBe("flat-chairs");
    expect(b1.hasBalcony).toBe(true);
    expect(b1.plant).toBe("flower");
    expect(b1.bush).toBe("flower");
  });

  it("preserves instigator and existing union members and never reduces lower than is allowed", () => {
    const store = useGameStore();
    store.setupGame(2, 6);

    const b1 = store.buildings[0]!;
    // Instigator is 1 member. Let's make 2 other tenants join the union.
    const nonInstigators = b1.tenants.filter((t) => !t.isInstigator);
    nonInstigators[0]!.inUnion = true;
    nonInstigators[1]!.inUnion = true;

    // Total preserved: 1 instigator + 2 in union = 3
    // Try to reduce to 1 (lower than allowed 3)
    store.adjustBuildingTenants(b1.id, 1);

    // Must be clamped to 3 (the allowed minimum to preserve instigator and union members)
    expect(b1.tenants.length).toBe(3);
    expect(b1.tenants.filter((t) => t.isInstigator).length).toBe(1);
    expect(b1.tenants.filter((t) => t.inUnion && !t.isInstigator).length).toBe(2);

    // Try to reduce to 0
    store.adjustBuildingTenants(b1.id, 0);
    expect(b1.tenants.length).toBe(3);
  });
});
