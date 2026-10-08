export interface Tenant {
  id: string;
  buildingId: string;
  variant: number;
  isInstigator?: boolean;
  inUnion?: boolean;
  isEvicted?: boolean;
  evictedRound?: number;
}
export type BuildingRoofType = "flat" | "pitched" | "mansard" | "flat-chairs";
export type BuildingPlant = "none" | "bush" | "flower";
export type BuildingBush = BuildingPlant | "left" | "right";
export interface Building {
  id: string;
  index: number;
  label: string;
  color: string;
  tenants: Tenant[];
  x: number; // percentage (0 to 100) across canvas
  y: number; // percentage (0 to 100) down canvas
  roofType?: BuildingRoofType;
  hasBalcony?: boolean;
  plant?: BuildingPlant;
  bush?: BuildingBush;
  flowerColor?: string;
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
export type GameScreen = "new-game" | "neighborhood-setup" | "gameplay";

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
  "#c34f51", // Rose Red
  "#3e6fc2", // Royal Blue
  "#c4a032", // Sunny Gold
  "#389560", // Emerald Green
  "#805dc0", // Purple Violet
  "#1d97a3", // Ocean Teal
  "#cb6c30", // Terracotta Orange
  "#af59b3", // Soft Fuchsia
  "#86a152", // Sage Green
  "#1384b7", // Azure Blue
  "#ab366e", // Ruby Crimson
  "#4d4fb0", // Cobalt Indigo
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

export type GameEventActionType =
  | "spend"
  | "earn"
  | "joinUnion"
  | "leaveUnion"
  | "evict"
  | "unevict"
  | "connectCoalition"
  | "custom";

export interface GameEventAction {
  type: GameEventActionType;
  amount?: number;
  buildingId?: string;
  tenantId?: string;
  connectionId?: string;
  sourceId?: string;
  targetId?: string;
  round?: number;
  [key: string]: unknown;
}

export interface GameEvent {
  id: string;
  text: string;
  round?: number;
  timestamp: number;
  type?: GameEventType;
  buildingId?: string;
  action?: GameEventAction;
}

export interface GameState {
  buildingCount: number;
  peoplePerBuilding: number;
  landlordStartingMoney?: number;
  landlordMoney?: number;
  isConfigured: boolean;
  hasBegun?: boolean;
  buildings: Building[];
  coalitionConnections?: CoalitionConnection[];
  round: number;
  phase: GamePhase;
  isEditPosition?: boolean;
  isEditBuildings?: boolean;
  canEdit?: boolean;
  tallies: Record<number, RoundTally>;
  events?: GameEvent[];
  updatedAt?: number;
  personWidth?: number;
  personHeight?: number;
  personScale?: number;
  landlordPosition?: { x: number; y: number };
  showLandlord?: boolean;
  controlsCollapsed?: boolean;
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
