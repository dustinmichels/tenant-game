import { describe, expect, it, beforeEach } from "bun:test";
import { setActivePinia, createPinia } from "pinia";
import { useGameStore } from "../game";
import type { Tenant } from "../../types/game";
import { colorDistance } from "../../utils/colorTheory";

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

describe("game flow and neighborhood setup gate", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  it("follows the exact flow: new game screen -> neighborhood setup screen -> gameplay", () => {
    const store = useGameStore();

    // 1. Initial state: new game screen
    expect(store.currentScreen).toBe("new-game");
    expect(store.isNewGameScreen).toBe(true);
    expect(store.isNeighborhoodSetup).toBe(false);
    expect(store.isGameplay).toBe(false);

    // 2. Setup game: transitions to neighborhood setup screen
    store.setupGame(3, 6);
    expect(store.currentScreen).toBe("neighborhood-setup");
    expect(store.isNewGameScreen).toBe(false);
    expect(store.isNeighborhoodSetup).toBe(true);
    expect(store.isGameplay).toBe(false);
    // In neighborhood setup screen: "can edit" is turned on
    expect(store.canEdit).toBe(true);
    expect(store.isEditBuildings).toBe(true);
    expect(store.isEditPosition).toBe(true);
    expect(store.controlsCollapsed).toBe(false);

    // 3. Begin game: transitions to gameplay
    store.beginGame();
    expect(store.currentScreen).toBe("gameplay");
    expect(store.isNewGameScreen).toBe(false);
    expect(store.isNeighborhoodSetup).toBe(false);
    expect(store.isGameplay).toBe(true);
    // In gameplay: "can edit" is turned off
    expect(store.canEdit).toBe(false);
    expect(store.isEditBuildings).toBe(false);
    expect(store.isEditPosition).toBe(false);
    expect(store.controlsCollapsed).toBe(true);
  });

  it("supports opening and cancelling new game from gameplay and neighborhood setup", () => {
    const store = useGameStore();

    // Setup and enter gameplay
    store.setupGame(3, 6);
    store.beginGame();
    expect(store.currentScreen).toBe("gameplay");

    // Open new game screen from gameplay
    store.openNewGame();
    expect(store.currentScreen).toBe("new-game");
    expect(store.isNewGameScreen).toBe(true);

    // Cancel returns to gameplay
    store.cancelNewGame();
    expect(store.currentScreen).toBe("gameplay");
    expect(store.isGameplay).toBe(true);

    // Now test opening and cancelling from neighborhood setup
    store.setupGame(2, 4);
    expect(store.currentScreen).toBe("neighborhood-setup");

    store.openNewGame();
    expect(store.currentScreen).toBe("new-game");

    store.cancelNewGame();
    expect(store.currentScreen).toBe("neighborhood-setup");
    expect(store.isNeighborhoodSetup).toBe(true);
  });

  it("collapses controls when game state transitions into play mode", () => {
    const store = useGameStore();
    store.setupGame(4, 8);
    expect(store.currentScreen).toBe("neighborhood-setup");
    expect(store.controlsCollapsed).toBe(false);

    // Transition to play mode
    store.beginGame();
    expect(store.currentScreen).toBe("gameplay");
    expect(store.controlsCollapsed).toBe(true);

    // Can still be manually expanded and collapsed
    store.controlsCollapsed = false;
    expect(store.controlsCollapsed).toBe(false);
    store.controlsCollapsed = true;
    expect(store.controlsCollapsed).toBe(true);

    // Setting up a new game resets controlsCollapsed to false for neighborhood setup
    store.setupGame(3, 6);
    expect(store.currentScreen).toBe("neighborhood-setup");
    expect(store.controlsCollapsed).toBe(false);
  });
});

describe("building generation plant distribution and flower colors", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  it("enforces no more than 1/5 flowers and 1/5 bushes in initial creation", () => {
    const store = useGameStore();
    store.setupGame(20, 4);

    const flowerBuildings = store.buildings.filter((b) => b.plant === "flower");
    const bushBuildings = store.buildings.filter((b) => b.plant === "bush");

    // Out of 20 buildings: exactly 4 flowers (1/5) and 4 bushes (1/5)
    expect(flowerBuildings.length).toBeLessThanOrEqual(4);
    expect(bushBuildings.length).toBeLessThanOrEqual(4);
    expect(flowerBuildings.length).toBe(4);
    expect(bushBuildings.length).toBe(4);
  });

  it("assigns a contrasting flower color to buildings generated with flowers", () => {
    const store = useGameStore();
    store.setupGame(15, 4);

    const flowerBuildings = store.buildings.filter((b) => b.plant === "flower");
    expect(flowerBuildings.length).toBeGreaterThan(0);

    for (const b of flowerBuildings) {
      expect(typeof b.flowerColor).toBe("string");
      expect(b.flowerColor!.length).toBeGreaterThan(0);
      // Perceptual distance between flower petal and building color must be significant
      const distance = colorDistance(b.color, b.flowerColor!);
      expect(distance).toBeGreaterThanOrEqual(0.18);
    }
  });

  it("updates flower color when building color or plant is adjusted", () => {
    const store = useGameStore();
    store.setupGame(5, 4);

    const b2 = store.buildings[1]!; // index 2 (initially plant: "none")
    expect(b2.plant).toBe("none");
    expect(b2.flowerColor).toBeUndefined();

    // Adjust b2 to have a flower with a deep blue building color
    store.adjustBuildingTenants(b2.id, 4, undefined, "#456fc3", undefined, undefined, "flower");
    expect(b2.plant).toBe("flower");
    expect(typeof b2.flowerColor).toBe("string");
    // Flower on blue building should contrast and not be blue
    expect(colorDistance(b2.color, b2.flowerColor!)).toBeGreaterThanOrEqual(0.2);

    // Now change b2's color to scarlet red
    const prevFlowerColor = b2.flowerColor;
    store.adjustBuildingTenants(b2.id, 4, undefined, "#c4545d");
    expect(b2.flowerColor).toBeDefined();
    // Must maintain contrast with red building
    expect(colorDistance(b2.color, b2.flowerColor!)).toBeGreaterThanOrEqual(0.2);
  });
});
describe("adding and deleting buildings", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("adds a new building with default number of people", () => {
    const store = useGameStore();
    store.setupGame(3, 8);
    expect(store.buildings.length).toBe(3);
    expect(store.buildingCount).toBe(3);

    const newBuilding = store.addBuilding();
    expect(store.buildings.length).toBe(4);
    expect(store.buildingCount).toBe(4);
    expect(newBuilding.tenants.length).toBe(8);

    // Has exactly 1 instigator who is in union
    const instigators = newBuilding.tenants.filter((t) => t.isInstigator);
    expect(instigators.length).toBe(1);
    expect(instigators[0]!.inUnion).toBe(true);

    // Position is within canvas bounds
    expect(newBuilding.x).toBeGreaterThanOrEqual(2);
    expect(newBuilding.x).toBeLessThanOrEqual(84);
    expect(newBuilding.y).toBeGreaterThanOrEqual(2);
    expect(newBuilding.y).toBeLessThanOrEqual(72);
  });

  it("deletes a building and cleans up its coalition connections", () => {
    const store = useGameStore();
    store.setupGame(4, 6);
    store.beginGame();

    const b1 = store.buildings[0]!;
    const b2 = store.buildings[1]!;

    // Connect coalition between b1 and b2
    store.connectCoalition(b1.id, b2.id);
    expect(store.coalitionConnections.length).toBe(1);

    // Delete b1
    const success = store.deleteBuilding(b1.id);
    expect(success).toBe(true);
    expect(store.buildings.length).toBe(3);
    expect(store.buildingCount).toBe(3);
    expect(store.buildings.some((b) => b.id === b1.id)).toBe(false);

    // Connection involving b1 must be severed
    expect(store.coalitionConnections.length).toBe(0);

    // Deleting a non-existent building returns false
    expect(store.deleteBuilding("non-existent-id")).toBe(false);
  });
});
