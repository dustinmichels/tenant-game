export const DEFAULT_LANDLORD_MONEY_PER_PLAYER = 100_000;

/**
 * Calculates default landlord starting money based on total players/tenants
 * (# of players = buildingCount * peoplePerBuilding).
 * e.g., 6 buildings x 6 people = 36 players -> $3,600,000
 */
export function calculateDefaultLandlordMoney(
  buildingCount: number | null | undefined,
  peoplePerBuilding: number | null | undefined,
): number {
  const b = Number(buildingCount);
  const p = Number(peoplePerBuilding);
  if (isNaN(b) || b <= 0 || isNaN(p) || p <= 0) return 0;
  return Math.floor(b) * Math.floor(p) * DEFAULT_LANDLORD_MONEY_PER_PLAYER;
}

/**
 * Formats a number as a USD currency string with commas and no fractional cents.
 * e.g. 200000 -> "$200,000"
 */
export function formatCurrency(amount: number): string {
  if (typeof amount !== "number" || isNaN(amount)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats a number as a compact readable currency string.
 * e.g. 200000 -> "$200k", 1500000 -> "$1.5M", 50000 -> "$50k", 0 -> "$0"
 */
export function formatCompactCurrency(amount: number): string {
  if (typeof amount !== "number" || isNaN(amount)) return "$0";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (abs >= 1_000_000) {
    const val = abs / 1_000_000;
    return `${sign}$${Number.isInteger(val) ? val : val.toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    const val = abs / 1_000;
    return `${sign}$${Number.isInteger(val) ? val : val.toFixed(1)}k`;
  }
  return `${sign}$${abs}`;
}

/**
 * Parses user input strings into dollar amounts.
 * Supports integers, commas, dollar signs, and 'k' / 'm' suffixes.
 * e.g. "25000" -> 25000, "$25,000" -> 25000, "50k" -> 50000, "1.5m" -> 1500000.
 * Returns null for invalid or non-positive inputs.
 */
export function parseCustomAmount(input: string): number | null {
  const raw = input.trim().toLowerCase().replace(/[$,]/g, "");
  if (!raw) return null;
  let mult = 1;
  let numStr = raw;
  if (raw.endsWith("k")) {
    mult = 1_000;
    numStr = raw.slice(0, -1).trim();
  } else if (raw.endsWith("m")) {
    mult = 1_000_000;
    numStr = raw.slice(0, -1).trim();
  }
  const val = parseFloat(numStr);
  if (isNaN(val) || val <= 0) return null;
  return Math.round(val * mult);
}
