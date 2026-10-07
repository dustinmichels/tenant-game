import { describe, expect, it, beforeEach } from "bun:test";
import { setActivePinia, createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import {
  useGameStore,
  formatDiceRollEventText,
  formatSpendEventText,
  formatEarnEventText,
} from "../game";
import type { Building, Tenant } from "../../types/game";

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
describe("game store showLandlord", () => {
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

describe("game store dice roll event formatting", () => {
  it("formats dice roll events as 'Group rolled XX'", () => {
    expect(formatDiceRollEventText(14)).toBe("🎲 Group rolled 14");
    expect(formatDiceRollEventText(7)).toBe("🎲 Group rolled 7");
    expect(formatDiceRollEventText(0)).toBe("🎲 Group rolled 0");
  });

  it("records dice roll events as general events", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useGameStore();
    store.setupGame(2, 3);

    store.addEvent(formatDiceRollEventText(12));
    expect(store.events.length).toBe(1);
    expect(store.events[0]!.text).toBe("🎲 Group rolled 12");
    expect(store.events[0]!.type).toBe("general");
  });
});

describe("game store edit buildings toggle", () => {
  it("initializes isEditBuildings to true and aliases isEditPosition and canEdit", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useGameStore();
    expect(store.canEdit).toBe(true);
    expect(store.isEditBuildings).toBe(true);
    expect(store.isEditPosition).toBe(true);

    store.canEdit = false;
    expect(store.canEdit).toBe(false);
    expect(store.isEditBuildings).toBe(false);
    expect(store.isEditPosition).toBe(false);
  });

  it("toggles canEdit off and marks hasBegun to true when beginGame is called", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useGameStore();
    store.setupGame(3, 4);

    // After setupGame, before begin: canEdit is true, hasBegun is false
    expect(store.canEdit).toBe(true);
    expect(store.isEditBuildings).toBe(true);
    expect(store.isEditPosition).toBe(true);
    expect(store.hasBegun).toBe(false);

    // Begin game
    store.beginGame();

    // After beginGame: canEdit switched to false, hasBegun switched to true
    expect(store.canEdit).toBe(false);
    expect(store.isEditBuildings).toBe(false);
    expect(store.isEditPosition).toBe(false);
    expect(store.hasBegun).toBe(true);
  });

  it("resets hasBegun to false on resetGame", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useGameStore();
    store.setupGame(2, 2);
    store.beginGame();
    expect(store.hasBegun).toBe(true);

    store.resetGame();
    expect(store.hasBegun).toBe(false);
    expect(store.canEdit).toBe(true);
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

  it("undoes an earn event, deducting landlord funds and updating tallies", () => {
    const store = useGameStore();
    store.setupGame(2, 4, 100000);

    store.earnLandlordMoney(50000);
    expect(store.landlordMoney).toBe(150000);
    expect(store.events.length).toBe(1);

    const earnEvent = store.events[0]!;
    expect(earnEvent.type).toBe("earn");
    expect(earnEvent.action?.type).toBe("earn");

    const success = store.undoEvent(earnEvent.id);
    expect(success).toBe(true);
    expect(store.landlordMoney).toBe(100000);
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

  it("undoes a custom note or dice roll event cleanly", () => {
    const store = useGameStore();
    store.setupGame(2, 4);

    store.addEvent("Custom note from facilitator");
    expect(store.events.length).toBe(1);

    const eventId = store.events[0]!.id;
    store.undoEvent(eventId);
    expect(store.events.length).toBe(0);
  });
});

describe("game store event history persistence across rounds", () => {
  beforeEach(() => {
    const pinia = createPinia();
    setActivePinia(pinia);
  });

  it("preserves events throughout the entire game across round transitions", () => {
    const store = useGameStore();
    store.setupGame(2, 4, 300000);

    // Round 1 actions
    store.spendLandlordMoney(50000);
    store.addEvent("Round 1 meeting note");
    expect(store.events.length).toBe(2);
    expect(store.events[0]!.round).toBe(1);
    expect(store.events[1]!.round).toBe(1);

    // Advance through Phase 1 -> Phase 2 -> Phase 3 -> Phase 1 (Round 2)
    store.nextPhase();
    expect(store.phase).toBe(2);
    expect(store.events.length).toBe(2);

    store.nextPhase();
    expect(store.phase).toBe(3);
    expect(store.events.length).toBe(2);

    store.nextPhase();
    expect(store.round).toBe(2);
    expect(store.phase).toBe(1);

    // Events are NOT cleared!
    expect(store.events.length).toBe(2);

    // Round 2 actions
    store.spendLandlordMoney(25000);
    expect(store.events.length).toBe(3);
    expect(store.events[2]!.round).toBe(2);

    // JSON representation contains all 3 events
    const parsedJson = JSON.parse(store.eventsJson);
    expect(Array.isArray(parsedJson)).toBe(true);
    expect(parsedJson.length).toBe(3);
    expect(parsedJson[0].text).toContain("Landlord spends");
    expect(parsedJson[1].text).toBe("Round 1 meeting note");
    expect(parsedJson[2].round).toBe(2);
  });
});

describe("landlord event text formatting and capitalization", () => {
  it("formats spend events with capitalized Landlord", () => {
    expect(formatSpendEventText(50000)).toBe("Landlord spends 50k");
    expect(formatSpendEventText(1000000)).toBe("Landlord spends 1m");
    expect(formatSpendEventText(25000)).toBe("Landlord spends 25k");
    expect(formatSpendEventText(1234)).toBe("Landlord spends $1,234");
  });

  it("formats earn events with capitalized Landlord", () => {
    expect(formatEarnEventText(50000)).toBe("Landlord earns 50k");
    expect(formatEarnEventText(2000000)).toBe("Landlord earns 2m");
    expect(formatEarnEventText(75000)).toBe("Landlord earns 75k");
    expect(formatEarnEventText(999)).toBe("Landlord earns $999");
  });

  it("auto-capitalizes manually added events starting with landlord", () => {
    setActivePinia(createPinia());
    const store = useGameStore();
    store.setupGame(2, 4);

    store.addEvent("landlord spends 50k");
    expect(store.events[0]!.text).toBe("Landlord spends 50k");
    expect(store.events[0]!.type).toBe("spend");

    store.addEvent("landlord earns 10k");
    expect(store.events[1]!.text).toBe("Landlord earns 10k");
    expect(store.events[1]!.type).toBe("earn");

    store.addEvent("landlord files eviction notice");
    expect(store.events[2]!.text).toBe("Landlord files eviction notice");
    expect(store.events[2]!.type).toBe("general");
  });
});
