import { describe, expect, it, beforeEach } from "bun:test";
import { setActivePinia, createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { useGameStore } from "../game";

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
    const nonInstigatorB1 = b1.tenants.find((t) => !t.isInstigator)!;

    // Tenant in B1 joins union -> B1 now has 2 members -> totalOrganized = 2
    store.toggleUnion(b1.id, nonInstigatorB1.id, true);
    expect(store.tallies[1]?.totalOrganized).toBe(2);
    expect(store.tallies[1]?.organizedChange).toBe(2);

    // Evict a tenant in B1 in round 1
    const tenantToEvict = b1.tenants.find((t) => !t.inUnion && !t.isInstigator)!;
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
    const anotherTenant = b1.tenants.find((t) => !t.inUnion && !t.isInstigator && !t.isEvicted)!;
    store.toggleUnion(b1.id, anotherTenant.id, true);
    expect(store.tallies[2]?.totalOrganized).toBe(3);
    expect(store.tallies[2]?.organizedChange).toBe(1);

    // Evict another tenant in round 2
    const b2 = store.buildings[1]!;
    const b2Tenant = b2.tenants.find((t) => !t.inUnion && !t.isInstigator)!;
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

describe("game store eviction event logging", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  it("records an event when a person is evicted", () => {
    const store = useGameStore();
    store.setupGame(2, 4);

    const building = store.buildings[0]!;
    const tenant = building.tenants[0]!;

    const initialEventCount = store.events.length;
    store.toggleEviction(building.id, tenant.id, true);

    expect(tenant.isEvicted).toBe(true);
    expect(store.events.length).toBe(initialEventCount + 1);

    const lastEvent = store.events[store.events.length - 1]!;
    expect(lastEvent.text).toBe(`Resident in ${building.label} evicted`);
    expect(lastEvent.type).toBe("general");
    expect(lastEvent.buildingId).toBe(building.id);
    expect(lastEvent.round).toBe(store.round);
  });

  it("does not record an event when eviction is cancelled", () => {
    const store = useGameStore();
    store.setupGame(2, 4);

    const building = store.buildings[0]!;
    const tenant = building.tenants[0]!;

    store.toggleEviction(building.id, tenant.id, true);
    const eventCountAfterEviction = store.events.length;

    store.toggleEviction(building.id, tenant.id, false);
    expect(tenant.isEvicted).toBe(false);
    expect(store.events.length).toBe(eventCountAfterEviction);
  });

  it("does not record a duplicate event if toggleEviction is called on an already evicted tenant", () => {
    const store = useGameStore();
    store.setupGame(2, 4);

    const building = store.buildings[0]!;
    const tenant = building.tenants[0]!;

    store.toggleEviction(building.id, tenant.id, true);
    const eventCountAfterFirst = store.events.length;

    store.toggleEviction(building.id, tenant.id, true);
    expect(store.events.length).toBe(eventCountAfterFirst);
  });
});
describe("game store showLandlord and spaceOutPositions", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  it("defaults showLandlord to true and toggles correctly", () => {
    const store = useGameStore();
    expect(store.showLandlord).toBe(true);

    store.toggleShowLandlord();
    expect(store.showLandlord).toBe(false);

    store.setShowLandlord(true);
    expect(store.showLandlord).toBe(true);

    store.setShowLandlord(false);
    expect(store.showLandlord).toBe(false);
  });

  it("spaces out building positions and landlord position when showLandlord is true", () => {
    const store = useGameStore();
    store.setupGame(4, 4);

    // Clump buildings together artificially
    store.buildings[0]!.x = 10;
    store.buildings[0]!.y = 10;
    store.buildings[1]!.x = 12;
    store.buildings[1]!.y = 10;
    store.buildings[2]!.x = 10;
    store.buildings[2]!.y = 12;
    store.buildings[3]!.x = 12;
    store.buildings[3]!.y = 12;

    store.spaceOutPositions();

    const xs = store.buildings.map((b) => b.x);
    const ys = store.buildings.map((b) => b.y);
    const spreadX = Math.max(...xs) - Math.min(...xs);
    const spreadY = Math.max(...ys) - Math.min(...ys);

    // Spaced out should have a much larger spread than 2%
    expect(spreadX).toBeGreaterThan(30);
    expect(spreadY).toBeGreaterThan(30);
  });

  it("spaces out buildings without moving landlord when showLandlord is false", () => {
    const store = useGameStore();
    store.setupGame(4, 4);
    store.setShowLandlord(false);

    const initialLandlordPos = { ...store.landlordPosition };
    store.spaceOutPositions();

    expect(store.landlordPosition.x).toBe(initialLandlordPos.x);
    expect(store.landlordPosition.y).toBe(initialLandlordPos.y);
  });
});

describe("game store pinia-plugin-persistedstate", () => {
  it("integrates with pinia-plugin-persistedstate plugin", () => {
    const pinia = createPinia();
    pinia.use(piniaPluginPersistedstate);
    setActivePinia(pinia);

    const store = useGameStore();
    expect(store.round).toBe(1);
    store.setupGame(3, 5);
    expect(store.totalBuildings).toBe(3);
    expect(store.totalTenants).toBe(15);
  });
});
