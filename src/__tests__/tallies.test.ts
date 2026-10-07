/// <reference types="bun" />
import { describe, it, expect, beforeEach } from "bun:test";
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

describe("Round tally tracking and fixed past rounds", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("initializes round 1 tally with 0 union members (need 2 in a building) and 0 evictions", () => {
    const { setupGame, tallies, round } = useGameStorage();
    setupGame(3, 4); // 3 buildings, 4 tenants each = 12 total, 3 instigators (1 each)

    expect(round.value).toBe(1);
    const t1 = tallies.value[1];
    expect(t1).toBeDefined();
    expect(t1.round).toBe(1);
    expect(t1.totalOrganized).toBe(0); // 0 people in unions until 2 in a building
    expect(t1.evictions).toBe(0);
  });

  it("dynamically sums union members and evictions during current round", () => {
    const { setupGame, buildings, toggleUnion, toggleEviction, tallies } = useGameStorage();
    setupGame(2, 4); // 2 buildings, 2 instigators
    expect(tallies.value[1].totalOrganized).toBe(0);
    expect(tallies.value[1].evictions).toBe(0);

    // A tenant joins union in building 0 -> now 2 people in building 0 union, so counts as 2
    const nonInstigator = buildings.value[0].tenants.find((t) => !t.isInstigator)!;
    toggleUnion(buildings.value[0].id, nonInstigator.id, true);

    expect(tallies.value[1].totalOrganized).toBe(2);

    // A tenant is evicted in building 1
    const tenantToEvict = buildings.value[1].tenants.find((t) => !t.isInstigator)!;
    toggleEviction(buildings.value[1].id, tenantToEvict.id, true);

    expect(tallies.value[1].evictions).toBe(1);
    expect(tallies.value[1].totalOrganized).toBe(2);
  });

  it("excludes an evicted tenant from active union count", () => {
    const { setupGame, buildings, toggleUnion, toggleEviction, tallies } = useGameStorage();
    setupGame(2, 4);

    const nonInstigator = buildings.value[0].tenants.find((t) => !t.isInstigator)!;
    toggleUnion(buildings.value[0].id, nonInstigator.id, true);
    expect(tallies.value[1].totalOrganized).toBe(2);

    // Evict this union member -> building 0 drops back to 1 active member, count drops to 0
    toggleEviction(buildings.value[0].id, nonInstigator.id, true);

    // Union count drops back to 0, evictions increments to 1
    expect(tallies.value[1].totalOrganized).toBe(0);
    expect(tallies.value[1].evictions).toBe(1);
  });

  it("fixes round 1 tally once advancing to round 2, and tracks round 2 evictions separately", () => {
    const { setupGame, buildings, toggleUnion, toggleEviction, nextPhase, tallies, round } =
      useGameStorage();
    setupGame(2, 4);

    // Round 1 actions: 1 joins union, 1 gets evicted
    const t1 = buildings.value[0].tenants.find((t) => !t.isInstigator)!;
    toggleUnion(buildings.value[0].id, t1.id, true);

    const t2 = buildings.value[1].tenants.find((t) => !t.isInstigator)!;
    toggleEviction(buildings.value[1].id, t2.id, true);

    expect(tallies.value[1].totalOrganized).toBe(2);
    expect(tallies.value[1].evictions).toBe(1);
    // Advance through Phase 1 -> 2 -> 3 -> Round 2 Phase 1
    nextPhase(); // Phase 2
    nextPhase(); // Phase 3
    nextPhase(); // Round 2, Phase 1

    expect(round.value).toBe(2);

    // Round 1 tally must remain fixed at 2 organized, 1 eviction
    expect(tallies.value[1].totalOrganized).toBe(2);
    expect(tallies.value[1].evictions).toBe(1);

    // Round 2 tally starts with 2 organized, 0 evictions that occurred in round 2
    expect(tallies.value[2].totalOrganized).toBe(2);
    expect(tallies.value[2].evictions).toBe(0);
    expect(tallies.value[2].totalEvictions).toBe(1);
    // Round 2 actions: another person joins union and another gets evicted
    const t3 = buildings.value[0].tenants.find(
      (t) => !t.isInstigator && !t.inUnion && !t.isEvicted,
    )!;
    toggleUnion(buildings.value[0].id, t3.id, true);

    const t4 = buildings.value[1].tenants.find((t) => !t.isInstigator && !t.isEvicted)!;
    toggleEviction(buildings.value[1].id, t4.id, true);

    // Round 2 tally is updated
    expect(tallies.value[2].totalOrganized).toBe(3);
    expect(tallies.value[2].evictions).toBe(1); // 1 eviction that round
    expect(tallies.value[2].totalEvictions).toBe(2); // 2 cumulative evictions

    // Round 1 tally is strictly FIXED and unchanged!
    expect(tallies.value[1].totalOrganized).toBe(2);
    expect(tallies.value[1].evictions).toBe(1);
  });
});
describe("Landlord starting funds and spending tracking", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults landlord starting money to 50k * number of players (buildings * people)", () => {
    const { setupGame, landlordStartingMoney, landlordMoney, tallies } = useGameStorage();
    // 4 buildings * 8 people = 32 players -> 32 * 50,000 = 1,600,000
    setupGame(4, 8);

    expect(landlordStartingMoney.value).toBe(1_600_000);
    expect(landlordMoney.value).toBe(1_600_000);
    expect(tallies.value[1].landlordRemaining).toBe(1_600_000);
    expect(tallies.value[1].landlordSpending).toBeNull();
  });

  it("computes landlord starting money correctly for 6 buildings x 6 people = 36 players", () => {
    const { setupGame, landlordStartingMoney, landlordMoney, tallies } = useGameStorage();
    // 6 buildings * 6 people = 36 players -> 36 * 50,000 = 1,800,000
    setupGame(6, 6);

    expect(landlordStartingMoney.value).toBe(1_800_000);
    expect(landlordMoney.value).toBe(1_800_000);
    expect(tallies.value[1].landlordRemaining).toBe(1_800_000);
  });

  it("accepts a manually adjusted landlord starting money amount in setupGame", () => {
    const { setupGame, landlordStartingMoney, landlordMoney, tallies } = useGameStorage();
    setupGame(4, 8, 350_000); // Manually adjusted to 350k

    expect(landlordStartingMoney.value).toBe(350_000);
    expect(landlordMoney.value).toBe(350_000);
    expect(tallies.value[1].landlordRemaining).toBe(350_000);
  });

  it("reduces the sum when 'Landlord spends 50k' action is executed", () => {
    const { setupGame, spendLandlordMoney, landlordMoney, tallies } = useGameStorage();
    setupGame(4, 8); // 32 players -> starts at 1,600,000

    spendLandlordMoney(50_000);

    // Reduced sum is 1,550,000
    expect(landlordMoney.value).toBe(1_550_000);
    expect(tallies.value[1].landlordRemaining).toBe(1_550_000);
    expect(tallies.value[1].landlordSpending).toBe(50_000);

    // Second spend of 50k
    spendLandlordMoney(50_000);
    expect(landlordMoney.value).toBe(1_500_000);
    expect(tallies.value[1].landlordRemaining).toBe(1_500_000);
    expect(tallies.value[1].landlordSpending).toBe(100_000);
  });

  it("allows undoing a spend back up to the starting money amount", () => {
    const {
      setupGame,
      spendLandlordMoney,
      undoLandlordSpend,
      landlordMoney,
      canUndoLandlordSpend,
      tallies,
    } = useGameStorage();
    setupGame(2, 4); // 2 buildings * 4 people = 8 players -> 8 * 50k = 400k

    expect(canUndoLandlordSpend.value).toBe(false);

    spendLandlordMoney(50_000);
    expect(landlordMoney.value).toBe(350_000);
    expect(canUndoLandlordSpend.value).toBe(true);
    expect(tallies.value[1].landlordRemaining).toBe(350_000);

    undoLandlordSpend(50_000);
    expect(landlordMoney.value).toBe(400_000);
    expect(tallies.value[1].landlordRemaining).toBe(400_000);
    expect(tallies.value[1].landlordSpending).toBeNull();
    expect(canUndoLandlordSpend.value).toBe(false);
  });

  it("carries over remaining landlord funds when advancing rounds", () => {
    const { setupGame, spendLandlordMoney, nextPhase, tallies, landlordMoney } = useGameStorage();
    setupGame(4, 8); // 32 players -> 1,600,000

    // Spend 50k in Round 1
    spendLandlordMoney(50_000);
    expect(landlordMoney.value).toBe(1_550_000);

    // Advance to Round 2
    nextPhase(); // Phase 2
    nextPhase(); // Phase 3
    nextPhase(); // Round 2, Phase 1

    expect(tallies.value[1].landlordRemaining).toBe(1_550_000);
    expect(tallies.value[2].landlordRemaining).toBe(1_550_000);

    // Spend 50k in Round 2
    spendLandlordMoney(50_000);
    expect(landlordMoney.value).toBe(1_500_000);
    expect(tallies.value[2].landlordRemaining).toBe(1_500_000);
    expect(tallies.value[2].landlordSpending).toBe(50_000);

    // Round 1 tally remains fixed at 1550k
    expect(tallies.value[1].landlordRemaining).toBe(1_550_000);
  });

  it("migrates legacy stored landlordStartingMoney (e.g. 300k for 6 buildings) to 1.8M", () => {
    localStorage.setItem(
      "tenant_union_game_state_v1",
      JSON.stringify({
        buildingCount: 6,
        peoplePerBuilding: 6,
        landlordStartingMoney: 300_000, // old 6 * 50k formula
        landlordMoney: 300_000,
        isConfigured: false,
        buildings: [],
        round: 1,
        phase: 1,
        tallies: {},
      }),
    );

    const { landlordStartingMoney, landlordMoney } = useGameStorage();
    expect(landlordStartingMoney.value).toBe(1_800_000);
    expect(landlordMoney.value).toBe(1_800_000);
  });

  it("sets landlordStartingMoney to default when resetting game", () => {
    const { setupGame, resetGame, landlordStartingMoney, landlordMoney } = useGameStorage();
    setupGame(6, 6);
    expect(landlordStartingMoney.value).toBe(1_800_000);

    resetGame();
    expect(landlordStartingMoney.value).toBe(1_800_000);
    expect(landlordMoney.value).toBe(1_800_000);
  });
});
