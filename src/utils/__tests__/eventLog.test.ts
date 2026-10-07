import { describe, expect, it } from "bun:test";
import {
  isSpendEvent,
  isEarnEvent,
  isSpendEventText,
  isEarnEventText,
  formatSpendEventText,
  formatEarnEventText,
  formatDiceRollEventText,
  formatJoinUnionEventText,
  formatLeaveUnionEventText,
  formatEvictEventText,
  formatUnevictEventText,
  formatCoalitionEventText,
  formatBreakCoalitionEventText,
  hasEventEmoji,
  getStandardEventEmoji,
  ensureEventEmoji,
  parseEventSegments,
} from "../eventLog";

describe("eventLog formatters with emojis", () => {
  it("formats spend event texts with 💸 emoji", () => {
    expect(formatSpendEventText(1_000_000)).toBe("💸 Landlord spends 1m");
    expect(formatSpendEventText(50_000)).toBe("💸 Landlord spends 50k");
    expect(formatSpendEventText(1_250)).toBe("💸 Landlord spends $1,250");
  });

  it("formats earn event texts with 💰 emoji", () => {
    expect(formatEarnEventText(2_000_000)).toBe("💰 Landlord earns 2m");
    expect(formatEarnEventText(50_000)).toBe("💰 Landlord earns 50k");
    expect(formatEarnEventText(750)).toBe("💰 Landlord earns $750");
  });

  it("formats dice roll event texts with 🎲 emoji", () => {
    expect(formatDiceRollEventText(7)).toBe("🎲 Group rolled 7");
    expect(formatDiceRollEventText(12)).toBe("🎲 Group rolled 12");
  });

  it("formats union join and leave event texts with appropriate emojis", () => {
    expect(formatJoinUnionEventText("Acme Tower")).toBe(
      "✊ Resident in Acme Tower joined tenant union",
    );
    expect(formatLeaveUnionEventText("Building 2")).toBe(
      "👋 Resident in Building 2 left tenant union",
    );
  });

  it("formats eviction and unevict event texts with appropriate emojis", () => {
    expect(formatEvictEventText("Building 1")).toBe("🚪 Resident in Building 1 evicted");
    expect(formatUnevictEventText("Building 1")).toBe("↩️ Resident in Building 1 unevicted");
  });

  it("formats coalition formed and dissolved event texts with appropriate emojis", () => {
    expect(formatCoalitionEventText("Building 1", "Building 2")).toBe(
      "🔗 Coalition formed: Building 1 + Building 2",
    );
    expect(formatBreakCoalitionEventText("Building 1", "Building 2")).toBe(
      "✂️ Coalition dissolved: Building 1 + Building 2",
    );
  });
});

describe("emoji detection and normalization helpers", () => {
  it("detects whether a string begins with an emoji", () => {
    expect(hasEventEmoji("💸 Landlord spends 50k")).toBe(true);
    expect(hasEventEmoji("💰 Landlord earns 50k")).toBe(true);
    expect(hasEventEmoji("🎲 Group rolled 6")).toBe(true);
    expect(hasEventEmoji("✊ Resident in Building 1 joined tenant union")).toBe(true);
    expect(hasEventEmoji("🚪 Resident in Building 1 evicted")).toBe(true);
    expect(hasEventEmoji("🔗 Coalition formed: B1 + B2")).toBe(true);
    expect(hasEventEmoji("🚨 Fire alarm triggered")).toBe(true);

    expect(hasEventEmoji("Landlord spends 50k")).toBe(false);
    expect(hasEventEmoji("Resident in Building 1 joined tenant union")).toBe(false);
    expect(hasEventEmoji("")).toBe(false);
  });

  it("identifies standard event emoji by text or action type", () => {
    expect(getStandardEventEmoji("Landlord spends 50k")).toBe("💸");
    expect(getStandardEventEmoji("anything", "spend")).toBe("💸");
    expect(getStandardEventEmoji("anything", undefined, "spend")).toBe("💸");

    expect(getStandardEventEmoji("Landlord earns 50k")).toBe("💰");
    expect(getStandardEventEmoji("anything", "earn")).toBe("💰");
    expect(getStandardEventEmoji("anything", undefined, "earn")).toBe("💰");

    expect(getStandardEventEmoji("Resident in Building 1 joined tenant union")).toBe("✊");
    expect(getStandardEventEmoji("anything", undefined, "joinUnion")).toBe("✊");

    expect(getStandardEventEmoji("Resident in Building 1 left tenant union")).toBe("👋");
    expect(getStandardEventEmoji("anything", undefined, "leaveUnion")).toBe("👋");

    expect(getStandardEventEmoji("Resident in Building 1 evicted")).toBe("🚪");
    expect(getStandardEventEmoji("anything", undefined, "evict")).toBe("🚪");

    expect(getStandardEventEmoji("Resident in Building 1 unevicted")).toBe("↩️");
    expect(getStandardEventEmoji("anything", undefined, "unevict")).toBe("↩️");

    expect(getStandardEventEmoji("Coalition formed: B1 + B2")).toBe("🔗");
    expect(getStandardEventEmoji("anything", undefined, "connectCoalition")).toBe("🔗");

    expect(getStandardEventEmoji("Coalition dissolved: B1 + B2")).toBe("✂️");
    expect(getStandardEventEmoji("Group rolled 8")).toBe("🎲");

    expect(getStandardEventEmoji("Random custom note")).toBeNull();
  });

  it("ensures standard events have leading emojis without duplicates", () => {
    expect(ensureEventEmoji("Landlord spends 50k")).toBe("💸 Landlord spends 50k");
    expect(ensureEventEmoji("landlord spends 50k")).toBe("💸 Landlord spends 50k");
    expect(ensureEventEmoji("💸 Landlord spends 50k")).toBe("💸 Landlord spends 50k");

    expect(ensureEventEmoji("Landlord earns 50k")).toBe("💰 Landlord earns 50k");
    expect(ensureEventEmoji("💰 Landlord earns 50k")).toBe("💰 Landlord earns 50k");

    expect(ensureEventEmoji("Resident in Building 1 joined tenant union")).toBe(
      "✊ Resident in Building 1 joined tenant union",
    );
    expect(ensureEventEmoji("✊ Resident in Building 1 joined tenant union")).toBe(
      "✊ Resident in Building 1 joined tenant union",
    );

    expect(ensureEventEmoji("Resident in Building 1 evicted")).toBe(
      "🚪 Resident in Building 1 evicted",
    );
    expect(ensureEventEmoji("🚪 Resident in Building 1 evicted")).toBe(
      "🚪 Resident in Building 1 evicted",
    );

    expect(ensureEventEmoji("Coalition formed: B1 + B2")).toBe("🔗 Coalition formed: B1 + B2");
    expect(ensureEventEmoji("🔗 Coalition formed: B1 + B2")).toBe("🔗 Coalition formed: B1 + B2");

    expect(ensureEventEmoji("Group rolled 10")).toBe("🎲 Group rolled 10");
    expect(ensureEventEmoji("🎲 Group rolled 10")).toBe("🎲 Group rolled 10");

    expect(ensureEventEmoji("Custom non-standard event")).toBe("Custom non-standard event");
    expect(ensureEventEmoji("")).toBe("");
  });
});

describe("spend and earn detection with emoji prefixes", () => {
  it("correctly identifies spend and earn events with and without emojis", () => {
    expect(isSpendEventText("💸 Landlord spends 50k")).toBe(true);
    expect(isSpendEventText("Landlord spends 50k")).toBe(true);
    expect(isSpendEventText("landlord spent 20k")).toBe(true);
    expect(isSpendEventText("Resident joined union")).toBe(false);

    expect(isEarnEventText("💰 Landlord earns 50k")).toBe(true);
    expect(isEarnEventText("Landlord earns 50k")).toBe(true);
    expect(isEarnEventText("Landlord earned 30k")).toBe(true);
    expect(isEarnEventText("General event")).toBe(false);

    expect(isSpendEvent({ text: "💸 Landlord spends 50k", type: "spend" })).toBe(true);
    expect(isSpendEvent({ text: "💸 Landlord spends 50k" })).toBe(true);
    expect(isSpendEvent({ text: "💰 Landlord earns 50k", type: "earn" })).toBe(false);

    expect(isEarnEvent({ text: "💰 Landlord earns 50k", type: "earn" })).toBe(true);
    expect(isEarnEvent({ text: "💰 Landlord earns 50k" })).toBe(true);
    expect(isEarnEvent({ text: "💸 Landlord spends 50k", type: "spend" })).toBe(false);
  });
});

describe("event segment parsing with emojis and building highlighting", () => {
  it("correctly segments event text containing emojis and building labels", () => {
    const buildings = [
      { id: "b-1", index: 1, label: "Acme Tower", color: "#e11d48" },
      { id: "b-2", index: 2, label: "Building 2", color: "#2563eb" },
    ];

    const joinSegments = parseEventSegments(
      "✊ Resident in Acme Tower joined tenant union",
      buildings,
    );
    expect(joinSegments).toEqual([
      { text: "✊ Resident in ", isBuilding: false },
      { text: "Acme Tower", isBuilding: true, buildingId: "b-1", color: "#e11d48" },
      { text: " joined tenant union", isBuilding: false },
    ]);

    const evictSegments = parseEventSegments("🚪 Resident in Building 2 evicted", buildings);
    expect(evictSegments).toEqual([
      { text: "🚪 Resident in ", isBuilding: false },
      { text: "Building 2", isBuilding: true, buildingId: "b-2", color: "#2563eb" },
      { text: " evicted", isBuilding: false },
    ]);

    const coalitionSegments = parseEventSegments(
      "🔗 Coalition formed: Acme Tower + Building 2",
      buildings,
    );
    expect(coalitionSegments).toEqual([
      { text: "🔗 Coalition formed: ", isBuilding: false },
      { text: "Acme Tower", isBuilding: true, buildingId: "b-1", color: "#e11d48" },
      { text: " + ", isBuilding: false },
      { text: "Building 2", isBuilding: true, buildingId: "b-2", color: "#2563eb" },
    ]);
  });

  it("handles empty input and buildings gracefully", () => {
    expect(parseEventSegments("", [])).toEqual([]);
    expect(parseEventSegments("hello world", [])).toEqual([
      { text: "hello world", isBuilding: false },
    ]);
  });
});
