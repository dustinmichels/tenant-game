import { describe, expect, it } from "bun:test";
import {
  isSpendEvent,
  isEarnEvent,
  isSpendEventText,
  isEarnEventText,
  parseEventSegments,
} from "../eventLog";

describe("eventLog utilities", () => {
  it("correctly identifies spend and earn events", () => {
    expect(isSpendEventText("landlord spends 50k")).toBe(true);
    expect(isSpendEventText("Landlord spends 50k")).toBe(true);
    expect(isSpendEventText("building 1 joined union")).toBe(false);

    expect(isEarnEventText("landlord earns 50k")).toBe(true);
    expect(isEarnEventText("Landlord earns 50k")).toBe(true);
    expect(isEarnEventText("general event")).toBe(false);

    expect(isSpendEvent({ text: "spends money", type: "spend" })).toBe(true);
    expect(isSpendEvent({ text: "spends money", type: "earn" })).toBe(false);
    expect(isEarnEvent({ text: "earns money", type: "earn" })).toBe(true);
  });

  it("parses event text segments with building color associations", () => {
    const buildings = [
      { id: "b-1", index: 1, label: "Acme Tower", color: "#e11d48" },
      { id: "b-2", index: 2, label: "Building 2", color: "#2563eb" },
    ];

    const segments = parseEventSegments("Acme Tower organized", buildings);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toEqual({
      text: "Acme Tower",
      isBuilding: true,
      buildingId: "b-1",
      color: "#e11d48",
    });
    expect(segments[1]).toEqual({
      text: " organized",
      isBuilding: false,
    });
  });

  it("returns fallback segment when given empty text or empty buildings", () => {
    expect(parseEventSegments("", [])).toEqual([]);
    expect(parseEventSegments("hello world", [])).toEqual([
      { text: "hello world", isBuilding: false },
    ]);
  });
});
