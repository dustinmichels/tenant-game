import { describe, expect, it } from "bun:test";
import {
  calculateDefaultLandlordMoney,
  formatCurrency,
  formatCompactCurrency,
  parseCustomAmount,
} from "../currency";

describe("currency utilities", () => {
  it("calculates default landlord money based on building and player count", () => {
    expect(calculateDefaultLandlordMoney(4, 8)).toBe(3_200_000);
    expect(calculateDefaultLandlordMoney(0, 8)).toBe(0);
    expect(calculateDefaultLandlordMoney(null, 8)).toBe(0);
  });

  it("formats standard currency in USD", () => {
    expect(formatCurrency(100_000)).toBe("$100,000");
    expect(formatCurrency(0)).toBe("$0");
  });

  it("formats compact currency readable amounts", () => {
    expect(formatCompactCurrency(1_500_000)).toBe("$1.5M");
    expect(formatCompactCurrency(1_000_000)).toBe("$1M");
    expect(formatCompactCurrency(50_000)).toBe("$50k");
    expect(formatCompactCurrency(500)).toBe("$500");
    expect(formatCompactCurrency(0)).toBe("$0");
  });

  it("parses custom amount strings with k and m suffixes", () => {
    expect(parseCustomAmount("50k")).toBe(50_000);
    expect(parseCustomAmount("$1.5M")).toBe(1_500_000);
    expect(parseCustomAmount("200,000")).toBe(200_000);
    expect(parseCustomAmount("invalid")).toBeNull();
    expect(parseCustomAmount("-500")).toBeNull();
  });
});
