export interface Tenant {
  id: string;
  buildingId: string;
  variant: number;
  isInstigator?: boolean;
  inUnion?: boolean;
  isEvicted?: boolean;
  evictedRound?: number;
}

export interface Building {
  id: string;
  index: number;
  label: string;
  color: string;
  tenants: Tenant[];
  x: number; // percentage (0 to 100) across canvas
  y: number; // percentage (0 to 100) down canvas
}

export interface RoundTally {
  round: number;
  landlordSpending: number | null;
  landlordRemaining?: number | null;
  totalOrganized: number;
  organizedChange?: number;
  evictions: number;
  totalEvictions?: number;
  buildingsOrganized: number;
}

export type GamePhase = 1 | 2 | 3;

export interface PhaseInfo {
  id: GamePhase;
  name: string;
  label: string;
  description: string;
}

export const PHASES: readonly PhaseInfo[] = [
  {
    id: 1,
    name: "Landlord",
    label: "Phase 1: Landlord",
    description: "Landlord makes their move and sets terms.",
  },
  {
    id: 2,
    name: "Tenant",
    label: "Phase 2: Tenant",
    description: "Tenants organize, strategize, and respond.",
  },
  {
    id: 3,
    name: "The Market",
    label: "Phase 3: The Market",
    description: "Market conditions shift and economic forces resolve.",
  },
] as const;

export const BUILDING_COLORS: readonly string[] = [
  "#e11d48", // Rose Red
  "#2563eb", // Royal Blue
  "#059669", // Emerald Green
  "#d97706", // Amber Gold
  "#7c3aed", // Purple Violet
  "#0891b2", // Ocean Teal
  "#ea580c", // Bright Orange
  "#db2777", // Vivid Magenta
  "#4f46e5", // Indigo
  "#16a34a", // Leaf Green
  "#c026d3", // Fuchsia
  "#ca8a04", // Deep Gold
] as const;

export interface CoalitionConnection {
  id: string;
  sourceId: string;
  targetId: string;
  createdAt?: number;
}

export interface CoalitionGroup {
  id: string;
  buildingIds: string[];
  dominantColor: string;
  coalitionColor?: string;
  leadBuildingId: string;
  totalUnionCount: number;
}

export type GameEventType = "spend" | "earn" | "general";

export interface GameEvent {
  id: string;
  text: string;
  round?: number;
  timestamp: number;
  type?: GameEventType;
  buildingId?: string;
}

export function isSpendEventText(text: string): boolean {
  if (!text) return false;
  return /\bspen(?:d|ds|ding|t)\b/i.test(text);
}

export function isSpendEvent(event: GameEvent | { text: string; type?: string }): boolean {
  if (event.type === "spend") return true;
  if (event.type === "earn" || event.type === "general") return false;
  return isSpendEventText(event.text);
}

export function isEarnEventText(text: string): boolean {
  if (!text) return false;
  return /\bearn(?:s|ed|ing)?\b/i.test(text);
}

export function isEarnEvent(event: GameEvent | { text: string; type?: string }): boolean {
  if (event.type === "earn") return true;
  if (event.type === "spend" || event.type === "general") return false;
  return isEarnEventText(event.text);
}

export interface GameState {
  buildingCount: number;
  peoplePerBuilding: number;
  landlordStartingMoney?: number;
  landlordMoney?: number;
  isConfigured: boolean;
  buildings: Building[];
  coalitionConnections?: CoalitionConnection[];
  round: number;
  phase: GamePhase;
  isEditPosition?: boolean;
  tallies: Record<number, RoundTally>;
  events?: GameEvent[];
  updatedAt: number;
  personWidth?: number;
  personHeight?: number;
  personScale?: number;
  landlordPosition?: { x: number; y: number };
  showLandlord?: boolean;
}

export interface DynamicSizingResult {
  personWidth: number;
  personHeight: number;
  personScale: number;
}

export interface BuildingDimensions {
  w: number;
  h: number;
}

export interface BuildingPositionUpdate {
  id: string;
  x: number;
  y: number;
}

// Re-export domain and geometry utilities for clean access and backwards compatibility
export * from "../utils/coalitions";
export * from "../utils/layout";
export * from "../utils/sizing";
export * from "../utils/positions";
export * from "../utils/eventLog";
