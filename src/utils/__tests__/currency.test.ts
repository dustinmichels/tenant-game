import { describe, expect, it } from "bun:test";
import {
  DEFAULT_LANDLORD_MONEY_PER_PLAYER,
  DEFAULT_LANDLORD_MONEY_PER_TENANT,
  calculateDefaultLandlordMoney,
  formatCompactCurrency,
  formatCurrency,
  parseCustomAmount,
} from "../currency";

describe("currency utils", () => {
  describe("calculateDefaultLandlordMoney", () => {
    it("calculates starting money correctly for valid inputs", () => {
      // 6 buildings * 6 people * 100,000 = 3,600,000
      expect(calculateDefaultLandlordMoney(6, 6)).toBe(3_600_000);
      expect(calculateDefaultLandlordMoney(1, 1)).toBe(DEFAULT_LANDLORD_MONEY_PER_PLAYER);
      expect(DEFAULT_LANDLORD_MONEY_PER_PLAYER).toBe(100_000);
      expect(DEFAULT_LANDLORD_MONEY_PER_TENANT).toBe(100_000);
    });
    it("handles zero, negative, or invalid numbers gracefully", () => {
      expect(calculateDefaultLandlordMoney(0, 5)).toBe(0);
      expect(calculateDefaultLandlordMoney(5, 0)).toBe(0);
      expect(calculateDefaultLandlordMoney(-2, 5)).toBe(0);
      expect(calculateDefaultLandlordMoney(null, 5)).toBe(0);
      expect(calculateDefaultLandlordMoney(5, undefined)).toBe(0);
      expect(calculateDefaultLandlordMoney(NaN, 5)).toBe(0);
    });
  });

  describe("formatCurrency", () => {
    it("formats standard amounts as USD with commas and no decimals", () => {
      expect(formatCurrency(200_000)).toBe("$200,000");
      expect(formatCurrency(0)).toBe("$0");
      expect(formatCurrency(50)).toBe("$50");
    });

    it("handles invalid amounts", () => {
      expect(formatCurrency(NaN)).toBe("$0");
    });
  });

  describe("formatCompactCurrency", () => {
    it("formats millions with M suffix", () => {
      expect(formatCompactCurrency(1_000_000)).toBe("$1M");
      expect(formatCompactCurrency(1_500_000)).toBe("$1.5M");
      expect(formatCompactCurrency(2_300_000)).toBe("$2.3M");
    });

    it("formats thousands with k suffix", () => {
      expect(formatCompactCurrency(1_000)).toBe("$1k");
      expect(formatCompactCurrency(50_000)).toBe("$50k");
      expect(formatCompactCurrency(200_000)).toBe("$200k");
    });

    it("formats amounts under 1000 without suffix", () => {
      expect(formatCompactCurrency(0)).toBe("$0");
      expect(formatCompactCurrency(500)).toBe("$500");
    });

    it("handles negative amounts", () => {
      expect(formatCompactCurrency(-50_000)).toBe("-$50k");
      expect(formatCompactCurrency(-1_500_000)).toBe("-$1.5M");
    });
  });

  describe("parseCustomAmount", () => {
    it("parses plain integers and formatted numbers", () => {
      expect(parseCustomAmount("25000")).toBe(25_000);
      expect(parseCustomAmount("$25,000")).toBe(25_000);
      expect(parseCustomAmount(" 100 ")).toBe(100);
    });

    it("parses k and m suffixes", () => {
      expect(parseCustomAmount("50k")).toBe(50_000);
      expect(parseCustomAmount("$50k")).toBe(50_000);
      expect(parseCustomAmount("1.5m")).toBe(1_500_000);
      expect(parseCustomAmount("$2.5M")).toBe(2_500_000);
    });

    it("returns null for non-positive or invalid inputs", () => {
      expect(parseCustomAmount("")).toBe(null);
      expect(parseCustomAmount("abc")).toBe(null);
      expect(parseCustomAmount("0")).toBe(null);
      expect(parseCustomAmount("-500")).toBe(null);
    });
  });
});
