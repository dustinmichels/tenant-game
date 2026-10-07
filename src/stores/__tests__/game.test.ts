import { describe, expect, it, beforeEach } from "bun:test";
import { setActivePinia, createPinia } from "pinia";
import { useGameStore, formatEarnEventText, formatDiceRollEventText } from "../game";
import { isSpendEvent, isSpendEventText, isEarnEvent, isEarnEventText } from "../../types/game";

describe("game store event logging", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  it("records an event when a resident joins their tenant union", () => {
    const store = useGameStore();
    store.setupGame(3, 4);

    const building = store.buildings[0]!;
    const resident = building.tenants.find((t) => !t.inUnion && !t.isInstigator)!;
    expect(resident).toBeDefined();

    const initialEventCount = store.events.length;
    store.toggleUnion(building.id, resident.id, true);

    expect(resident.inUnion).toBe(true);
    expect(store.events.length).toBe(initialEventCount + 1);
    expect(store.events[store.events.length - 1]!.text).toBe(
      `Resident in ${building.label} joined tenant union`,
    );
  });

  it("does not record an event when a resident leaves the tenant union", () => {
    const store = useGameStore();
    store.setupGame(3, 4);

    const building = store.buildings[0]!;
    const resident = building.tenants.find((t) => !t.inUnion && !t.isInstigator)!;
    store.toggleUnion(building.id, resident.id, true);
    const countAfterJoin = store.events.length;

    store.toggleUnion(building.id, resident.id, false);
    expect(resident.inUnion).toBe(false);
    expect(store.events.length).toBe(countAfterJoin);
  });

  it("does not record an event if toggleUnion is called on a tenant already in union", () => {
    const store = useGameStore();
    store.setupGame(3, 4);

    const building = store.buildings[0]!;
    const resident = building.tenants.find((t) => !t.inUnion && !t.isInstigator)!;
    store.toggleUnion(building.id, resident.id, true);
    const countAfterJoin = store.events.length;

    store.toggleUnion(building.id, resident.id, true);
    expect(store.events.length).toBe(countAfterJoin);
  });

  it("does not record an event for instigator toggle", () => {
    const store = useGameStore();
    store.setupGame(3, 4);

    const building = store.buildings[0]!;
    const instigator = building.tenants.find((t) => t.isInstigator)!;
    expect(instigator.inUnion).toBe(true);

    const countBefore = store.events.length;
    store.toggleUnion(building.id, instigator.id, true);
    expect(store.events.length).toBe(countBefore);
  });

  it("records an event when two buildings form a coalition", () => {
    const store = useGameStore();
    store.setupGame(3, 4);

    const b1 = store.buildings[0]!;
    const b2 = store.buildings[1]!;

    const initialEventCount = store.events.length;
    const connected = store.connectCoalition(b1.id, b2.id);

    expect(connected).toBe(true);
    expect(store.events.length).toBe(initialEventCount + 1);
    expect(store.events[store.events.length - 1]!.text).toBe(
      `Coalition formed: ${b1.label} + ${b2.label}`,
    );
  });

  it("does not record an event for duplicate or invalid coalition connections", () => {
    const store = useGameStore();
    store.setupGame(3, 4);

    const b1 = store.buildings[0]!;
    const b2 = store.buildings[1]!;

    store.connectCoalition(b1.id, b2.id);
    const countAfterFirst = store.events.length;

    const dupConnected = store.connectCoalition(b2.id, b1.id);
    expect(dupConnected).toBe(false);
    expect(store.events.length).toBe(countAfterFirst);

    const selfConnected = store.connectCoalition(b1.id, b1.id);
    expect(selfConnected).toBe(false);
    expect(store.events.length).toBe(countAfterFirst);

    const invalidConnected = store.connectCoalition(b1.id, "nonexistent");
    expect(invalidConnected).toBe(false);
    expect(store.events.length).toBe(countAfterFirst);
  });

  it("undoLastCoalition removes the recorded coalition event", () => {
    const store = useGameStore();
    store.setupGame(3, 4);

    const b1 = store.buildings[0]!;
    const b2 = store.buildings[1]!;

    const countBefore = store.events.length;
    store.connectCoalition(b1.id, b2.id);
    expect(store.events.length).toBe(countBefore + 1);

    store.undoLastCoalition();
    expect(store.events.length).toBe(countBefore);
    expect(store.events.some((e) => e.text.startsWith("Coalition formed:"))).toBe(false);
  });

  it("classifies spend and non-spend events correctly", () => {
    expect(isSpendEventText("landlord spends 50k")).toBe(true);
    expect(isSpendEventText("landlord spends 1m")).toBe(true);
    expect(isSpendEventText("landlord spends $50,000")).toBe(true);
    expect(isSpendEventText("landlord spent 20k on repairs")).toBe(true);
    expect(isSpendEventText("spending 100k")).toBe(true);
    expect(isSpendEventText("Resident in Building 1 joined tenant union")).toBe(false);
    expect(isSpendEventText("Coalition formed: Building 1 + Building 2")).toBe(false);
    expect(isSpendEventText("Organizing meeting at 7pm")).toBe(false);

    expect(
      isSpendEvent({ id: "1", text: "Resident joined union", timestamp: 1, type: "general" }),
    ).toBe(false);
    expect(
      isSpendEvent({ id: "2", text: "landlord spends 50k", timestamp: 1, type: "spend" }),
    ).toBe(true);
    expect(isSpendEvent({ id: "3", text: "landlord spends 50k", timestamp: 1 })).toBe(true);
    expect(isSpendEvent({ id: "4", text: "Regular notice", timestamp: 1 })).toBe(false);
  });

  it("classifies earn and non-earn events correctly", () => {
    expect(isEarnEventText("landlord earns 50k")).toBe(true);
    expect(isEarnEventText("landlord earns 1m")).toBe(true);
    expect(isEarnEventText("landlord earns $50,000")).toBe(true);
    expect(isEarnEventText("landlord earned 20k")).toBe(true);
    expect(isEarnEventText("earning 100k")).toBe(true);
    expect(isEarnEventText("Resident in Building 1 joined tenant union")).toBe(false);
    expect(isEarnEventText("Coalition formed: Building 1 + Building 2")).toBe(false);
    expect(isEarnEventText("landlord spends 50k")).toBe(false);

    expect(
      isEarnEvent({ id: "1", text: "Resident joined union", timestamp: 1, type: "general" }),
    ).toBe(false);
    expect(isEarnEvent({ id: "2", text: "landlord earns 50k", timestamp: 1, type: "earn" })).toBe(
      true,
    );
    expect(isEarnEvent({ id: "3", text: "landlord earns 50k", timestamp: 1 })).toBe(true);
    expect(isEarnEvent({ id: "4", text: "landlord spends 50k", timestamp: 1, type: "spend" })).toBe(
      false,
    );
    expect(isSpendEvent({ id: "5", text: "landlord earns 50k", timestamp: 1, type: "earn" })).toBe(
      false,
    );
  });

  it("tags earnLandlordMoney events with type 'earn'", () => {
    const store = useGameStore();
    store.setupGame(3, 4);

    const initialCount = store.events.length;
    store.earnLandlordMoney(50_000);

    expect(store.events.length).toBe(initialCount + 1);
    const lastEvent = store.events[store.events.length - 1]!;
    expect(lastEvent.type).toBe("earn");
    expect(lastEvent.text).toBe("landlord earns 50k");
    expect(isEarnEvent(lastEvent)).toBe(true);
    expect(isSpendEvent(lastEvent)).toBe(false);
  });

  it("formats earn event text properly", () => {
    expect(formatEarnEventText(50_000)).toBe("landlord earns 50k");
    expect(formatEarnEventText(1_000_000)).toBe("landlord earns 1m");
    expect(formatEarnEventText(25_000)).toBe("landlord earns 25k");
    expect(formatEarnEventText(25_500)).toBe("landlord earns $25,500");
  });

  it("tags spendLandlordMoney events with type 'spend'", () => {
    const store = useGameStore();
    store.setupGame(3, 4);

    const initialCount = store.events.length;
    store.spendLandlordMoney(50_000);

    expect(store.events.length).toBe(initialCount + 1);
    const lastEvent = store.events[store.events.length - 1]!;
    expect(lastEvent.type).toBe("spend");
    expect(lastEvent.text).toBe("landlord spends 50k");
    expect(isSpendEvent(lastEvent)).toBe(true);
  });

  it("tags union and coalition events with type 'general'", () => {
    const store = useGameStore();
    store.setupGame(3, 4);

    const b1 = store.buildings[0]!;
    const b2 = store.buildings[1]!;
    const resident = b1.tenants.find((t) => !t.inUnion && !t.isInstigator)!;

    store.toggleUnion(b1.id, resident.id, true);
    const unionEvent = store.events[store.events.length - 1]!;
    expect(unionEvent.type).toBe("general");
    expect(isSpendEvent(unionEvent)).toBe(false);

    store.connectCoalition(b1.id, b2.id);
    const coalitionEvent = store.events[store.events.length - 1]!;
    expect(coalitionEvent.type).toBe("general");
    expect(isSpendEvent(coalitionEvent)).toBe(false);
  });

  it("undoLandlordSpend removes only spend events and preserves general and earn events", () => {
    const store = useGameStore();
    store.setupGame(3, 4);

    const b1 = store.buildings[0]!;
    const resident = b1.tenants.find((t) => !t.inUnion && !t.isInstigator)!;

    store.toggleUnion(b1.id, resident.id, true);
    store.earnLandlordMoney(50_000);
    store.spendLandlordMoney(50_000);

    expect(store.events.length).toBe(3);
    expect(store.events[0]!.type).toBe("general");
    expect(store.events[1]!.type).toBe("earn");
    expect(store.events[2]!.type).toBe("spend");

    store.undoLandlordSpend(50_000);
    expect(store.events.length).toBe(2);
    expect(store.events[0]!.type).toBe("general");
    expect(store.events[0]!.text).toBe(`Resident in ${b1.label} joined tenant union`);
    expect(store.events[1]!.type).toBe("earn");
    expect(store.events[1]!.text).toBe("landlord earns 50k");
  });

  it("formats dice roll events as 'Group rolled XX'", () => {
    expect(formatDiceRollEventText(14)).toBe("Group rolled 14");
    expect(formatDiceRollEventText(7)).toBe("Group rolled 7");
    expect(formatDiceRollEventText(0)).toBe("Group rolled 0");
  });

  it("records dice roll events as general events and preserves them during undo spend", () => {
    const store = useGameStore();
    store.setupGame(3, 4);

    store.addEvent(formatDiceRollEventText(14));
    expect(store.events.length).toBe(1);
    expect(store.events[0]!.text).toBe("Group rolled 14");
    expect(store.events[0]!.type).toBe("general");

    store.spendLandlordMoney(50_000);
    expect(store.events.length).toBe(2);

    store.undoLandlordSpend(50_000);
    expect(store.events.length).toBe(1);
    expect(store.events[0]!.text).toBe("Group rolled 14");
  });
});

describe("game store default money calculation", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  it("initializes default state with 100k * total tenants", () => {
    const store = useGameStore();
    // Default: 4 buildings * 8 people = 32 tenants -> 3,200,000
    expect(store.landlordStartingMoney).toBe(3_200_000);
    expect(store.landlordMoney).toBe(3_200_000);
  });

  it("calculates default starting money as 100k * number of tenants when setup without custom money", () => {
    const store = useGameStore();
    // 3 buildings * 4 tenants = 12 tenants -> 1,200,000
    store.setupGame(3, 4);
    expect(store.landlordStartingMoney).toBe(1_200_000);
    expect(store.landlordMoney).toBe(1_200_000);
  });

  it("respects custom starting money when explicitly provided", () => {
    const store = useGameStore();
    store.setupGame(3, 4, 500_000);
    expect(store.landlordStartingMoney).toBe(500_000);
    expect(store.landlordMoney).toBe(500_000);
  });
});

describe("game store phase navigation", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  it("allows setting phase directly via setPhase", () => {
    const store = useGameStore();
    store.setupGame(2, 3);
    expect(store.phase).toBe(1);

    store.setPhase(2);
    expect(store.phase).toBe(2);

    store.setPhase(3);
    expect(store.phase).toBe(3);
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
