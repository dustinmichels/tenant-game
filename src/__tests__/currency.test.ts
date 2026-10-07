/// <reference types="bun" />
import { describe, it, expect } from "bun:test";
import {
  formatCurrency,
  formatCompactCurrency,
  DEFAULT_LANDLORD_MONEY_PER_PLAYER,
  calculateDefaultLandlordMoney,
} from "../utils/currency";

describe("currency utilities", () => {
  it("defines default money per player as 50,000", () => {
    expect(DEFAULT_LANDLORD_MONEY_PER_PLAYER).toBe(50_000);
  });

  it("calculates default landlord starting money from buildings and people (total players)", () => {
    // e.g. 6 buildings x 6 people = 36 players -> $1,800,000
    expect(calculateDefaultLandlordMoney(6, 6)).toBe(1_800_000);
    // 4 buildings x 8 people = 32 players -> $1,600,000
    expect(calculateDefaultLandlordMoney(4, 8)).toBe(1_600_000);
    // Edge cases
    expect(calculateDefaultLandlordMoney(0, 8)).toBe(0);
    expect(calculateDefaultLandlordMoney(4, 0)).toBe(0);
    expect(calculateDefaultLandlordMoney(null, 8)).toBe(0);
    expect(calculateDefaultLandlordMoney(4, null)).toBe(0);
  });
  it("formats full currency strings with comma separators", () => {
    expect(formatCurrency(200_000)).toBe("$200,000");
    expect(formatCurrency(50_000)).toBe("$50,000");
    expect(formatCurrency(0)).toBe("$0");
  });

  it("formats compact currency values correctly", () => {
    expect(formatCompactCurrency(200_000)).toBe("$200k");
    expect(formatCompactCurrency(50_000)).toBe("$50k");
    expect(formatCompactCurrency(1_500_000)).toBe("$1.5M");
    expect(formatCompactCurrency(1_000_000)).toBe("$1M");
    expect(formatCompactCurrency(0)).toBe("$0");
  });
});
