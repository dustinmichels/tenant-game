import { defineStore, getActivePinia, setActivePinia, createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { ref, computed } from "vue";
import { useRefHistory } from "@vueuse/core";
import type {
  GameState,
  Building,
  Tenant,
  GamePhase,
  RoundTally,
  CoalitionConnection,
  CoalitionGroup,
  GameEvent,
  GameEventType,
} from "../types/game";
import {
  PHASES,
  BUILDING_COLORS,
  getBuildingColor,
  isBuildingOrganized,
  getBuildingUnionCount,
  getTotalUnionCount,
  getCoalitionUnionCount,
  generateDefaultPositions,
  generateScatteredPositions,
  spaceOutNodes,
  computeCoalitionGroups,
  getEffectiveBuildingColorMap,
  calculateOptimalPersonSize,
  BASELINE_PERSON_WIDTH,
  isSpendEvent,
  isSpendEventText,
  isEarnEvent,
  isEarnEventText,
} from "../types/game";
import { generateDivergentPalette } from "../utils/colorTheory";
import { calculateDefaultLandlordMoney } from "../utils/currency";

const STORAGE_KEY = "tenant_union_game_state_v1";
const storage =
  typeof window !== "undefined" && window.localStorage
    ? window.localStorage
    : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      };
const VARIANT_COUNT = 5;

function createDefaultState(): GameState {
  const defaultBuildings = 4;
  const defaultPeople = 8;
  const initialMoney = calculateDefaultLandlordMoney(defaultBuildings, defaultPeople);
  const sizing = calculateOptimalPersonSize(defaultBuildings, defaultPeople);
  return {
    buildingCount: defaultBuildings,
    peoplePerBuilding: defaultPeople,
    landlordStartingMoney: initialMoney,
    landlordMoney: initialMoney,
    personWidth: sizing.personWidth,
    personHeight: sizing.personHeight,
    personScale: sizing.personScale,
    isConfigured: false,
    buildings: [],
    round: 1,
    phase: 1,
    coalitionConnections: [],
    tallies: {
      1: {
        round: 1,
        landlordSpending: null,
        landlordRemaining: initialMoney,
        totalOrganized: 0,
        evictions: 0,
        buildingsOrganized: 0,
      },
    },
    events: [],
    landlordPosition: { x: 82, y: 3 },
    showLandlord: true,
    updatedAt: Date.now(),
  };
}

function generateBuildings(
  buildingCount: number,
  peoplePerBuilding: number,
  canvasWidth = 1050,
  canvasHeight = 750,
): Building[] {
  const result: Building[] = [];
  const positions = generateDefaultPositions(
    buildingCount,
    peoplePerBuilding,
    canvasWidth,
    canvasHeight,
  );
  const divergentColors = generateDivergentPalette(buildingCount);

  for (let i = 1; i <= buildingCount; i++) {
    const buildingId = `b-${i}`;
    const tenants: Tenant[] = [];
    const instigatorIdx = Math.floor(Math.random() * peoplePerBuilding);

    for (let j = 1; j <= peoplePerBuilding; j++) {
      const isInstigator = j - 1 === instigatorIdx;
      tenants.push({
        id: `t-${i}-${j}`,
        buildingId,
        variant: (i + j) % VARIANT_COUNT,
        isInstigator,
        inUnion: isInstigator,
        isEvicted: false,
      });
    }

    const pos = positions[i - 1] ?? { x: 10 + ((i * 20) % 70), y: 15 + ((i * 22) % 65) };

    result.push({
      id: buildingId,
      index: i,
      label: `Building ${i}`,
      color: divergentColors[i - 1] ?? getBuildingColor(i, buildingCount),
      tenants,
      x: pos.x,
      y: pos.y,
    });
  }
  return result;
}

export function formatSpendEventText(amount: number): string {
  if (amount >= 1_000_000 && amount % 1_000_000 === 0) {
    return `landlord spends ${amount / 1_000_000}m`;
  }
  if (amount >= 1_000 && amount % 1_000 === 0) {
    return `landlord spends ${amount / 1_000}k`;
  }
  return `landlord spends $${amount.toLocaleString()}`;
}

export function formatEarnEventText(amount: number): string {
  if (amount >= 1_000_000 && amount % 1_000_000 === 0) {
    return `landlord earns ${amount / 1_000_000}m`;
  }
  if (amount >= 1_000 && amount % 1_000 === 0) {
    return `landlord earns ${amount / 1_000}k`;
  }
  return `landlord earns $${amount.toLocaleString()}`;
}

export function formatDiceRollEventText(total: number): string {
  return `Group rolled ${total}`;
}

export const useGameStore = defineStore(
  "game",
  () => {
    const initial = createDefaultState();

    const buildingCount = ref(initial.buildingCount);
    const peoplePerBuilding = ref(initial.peoplePerBuilding);
    const landlordStartingMoney = ref(initial.landlordStartingMoney ?? initial.landlordMoney ?? 0);
    const landlordMoney = ref(initial.landlordMoney ?? initial.landlordStartingMoney ?? 0);
    const personWidth = ref(initial.personWidth ?? BASELINE_PERSON_WIDTH);
    const personHeight = ref(initial.personHeight ?? Math.round(BASELINE_PERSON_WIDTH / 0.68));
    const personScale = ref(initial.personScale ?? 1.0);
    const isConfigured = ref(initial.isConfigured);
    const landlordPosition = ref<{ x: number; y: number }>(
      initial.landlordPosition ?? { x: 82, y: 3 },
    );
    const showLandlord = ref(initial.showLandlord ?? true);
    const buildings = ref<Building[]>(initial.buildings);
    const coalitionConnections = ref<CoalitionConnection[]>(initial.coalitionConnections ?? []);
    const round = ref(initial.round);
    const phase = ref<GamePhase>(initial.phase);
    const tallies = ref<Record<number, RoundTally>>(initial.tallies);
    const events = ref<GameEvent[]>(initial.events ?? []);
    const updatedAt = ref(initial.updatedAt);
    const isEditPosition = ref(true);

    const {
      undo: undoEvent,
      redo: redoEvent,
      canUndo: canUndoEvent,
      canRedo: canRedoEvent,
      clear: clearEventHistory,
    } = useRefHistory(events, { deep: true, flush: "sync" });

    const { undo: undoCoalitionHistory, canUndo: canUndoCoalitionHistory } = useRefHistory(
      coalitionConnections,
      { deep: true, flush: "sync" },
    );

    const state = computed<GameState>(() => ({
      buildingCount: buildingCount.value,
      peoplePerBuilding: peoplePerBuilding.value,
      landlordStartingMoney: landlordStartingMoney.value,
      landlordMoney: landlordMoney.value,
      personWidth: personWidth.value,
      personHeight: personHeight.value,
      personScale: personScale.value,
      landlordPosition: landlordPosition.value,
      showLandlord: showLandlord.value,
      isConfigured: isConfigured.value,
      buildings: buildings.value,
      coalitionConnections: coalitionConnections.value,
      round: round.value,
      phase: phase.value,
      tallies: tallies.value,
      events: events.value,
      updatedAt: updatedAt.value,
    }));

    const totalBuildings = computed(() => buildings.value.length);
    const totalTenants = computed(() =>
      buildings.value.reduce((sum, b) => sum + b.tenants.length, 0),
    );
    const currentPhaseInfo = computed(() => PHASES.find((p) => p.id === phase.value) ?? PHASES[0]);
    const coalitions = computed<CoalitionGroup[]>(() =>
      computeCoalitionGroups(buildings.value, coalitionConnections.value),
    );
    const buildingColorMap = computed<Record<string, string>>(() =>
      getEffectiveBuildingColorMap(buildings.value, coalitionConnections.value),
    );
    const canUndoCoalition = computed(() => coalitionConnections.value.length > 0);
    // Counting unions rule: at least 2 people needed to count as a union (standalone or via coalition)
    const unionTenantsCount = computed(() =>
      buildings.value.reduce((sum, b) => sum + getBuildingUnionCount(b, coalitions.value), 0),
    );
    const coalitionTenantsCount = computed(() =>
      getCoalitionUnionCount(buildings.value, coalitions.value),
    );
    const totalEvictionsCount = computed(() =>
      buildings.value.reduce((sum, b) => sum + b.tenants.filter((t) => t.isEvicted).length, 0),
    );
    const organizedBuildingsCount = computed(
      () => buildings.value.filter((b) => isBuildingOrganized(b, coalitions.value)).length,
    );
    const canUndoLandlordSpend = computed(() => landlordMoney.value < landlordStartingMoney.value);

    function persist() {
      // Managed automatically by pinia-plugin-persistedstate
    }

    function toggleEditPosition() {
      isEditPosition.value = !isEditPosition.value;
    }
    function reloadFromStorage() {
      // Managed automatically by pinia-plugin-persistedstate
    }

    function syncCurrentRoundTally() {
      const currentRound = round.value;
      const existing = tallies.value[currentRound];
      const bldgs = buildings.value;

      const roundEvictions = bldgs.reduce(
        (sum, b) =>
          sum +
          b.tenants.filter((t) => t.isEvicted && (t.evictedRound ?? currentRound) === currentRound)
            .length,
        0,
      );

      const totalEvictions = bldgs.reduce(
        (sum, b) =>
          sum +
          b.tenants.filter((t) => t.isEvicted && (t.evictedRound ?? 1) <= currentRound).length,
        0,
      );

      const prevOrganized =
        currentRound > 1 ? (tallies.value[currentRound - 1]?.totalOrganized ?? 0) : 0;
      const totalOrganized = bldgs.reduce(
        (sum, b) => sum + getBuildingUnionCount(b, coalitions.value),
        0,
      );
      const currentFunds = landlordMoney.value;
      tallies.value[currentRound] = {
        round: currentRound,
        landlordSpending: existing?.landlordSpending ?? null,
        landlordRemaining: existing?.landlordRemaining ?? currentFunds,
        totalOrganized,
        organizedChange: totalOrganized - prevOrganized,
        evictions: roundEvictions,
        totalEvictions,
        buildingsOrganized: bldgs.filter((b) => isBuildingOrganized(b, coalitions.value)).length,
      };
    }

    function setupGame(
      newBuildingCount: number,
      newPeoplePerBuilding: number,
      newLandlordStartingMoney?: number,
    ) {
      const validBuildings = Math.max(1, Math.min(100, Math.floor(newBuildingCount)));
      const validPeople = Math.max(1, Math.min(200, Math.floor(newPeoplePerBuilding)));
      const initialMoney =
        typeof newLandlordStartingMoney === "number" &&
        !isNaN(newLandlordStartingMoney) &&
        newLandlordStartingMoney >= 0
          ? Math.floor(newLandlordStartingMoney)
          : calculateDefaultLandlordMoney(validBuildings, validPeople);

      let canvasW = 1050;
      let canvasH = 750;
      if (typeof window !== "undefined" && window.innerWidth > 0 && window.innerHeight > 0) {
        canvasW = Math.max(800, window.innerWidth * 0.72);
        canvasH = Math.max(600, window.innerHeight - 65);
      }
      const sizing = calculateOptimalPersonSize(validBuildings, validPeople, canvasW, canvasH);

      const newBuildings = generateBuildings(validBuildings, validPeople, canvasW, canvasH);
      const initialOrganized = newBuildings.reduce((sum, b) => sum + getBuildingUnionCount(b), 0);
      const initialBldgsOrganized = newBuildings.filter((b) => isBuildingOrganized(b)).length;

      buildingCount.value = validBuildings;
      peoplePerBuilding.value = validPeople;
      landlordStartingMoney.value = initialMoney;
      landlordMoney.value = initialMoney;
      personWidth.value = sizing.personWidth;
      personHeight.value = sizing.personHeight;
      personScale.value = sizing.personScale;
      isConfigured.value = true;
      buildings.value = newBuildings;
      round.value = 1;
      phase.value = 1;
      coalitionConnections.value = [];
      tallies.value = {
        1: {
          round: 1,
          landlordSpending: null,
          landlordRemaining: initialMoney,
          totalOrganized: initialOrganized,
          organizedChange: initialOrganized,
          evictions: 0,
          totalEvictions: 0,
          buildingsOrganized: initialBldgsOrganized,
        },
      };
      events.value = [];
      updatedAt.value = Date.now();
      landlordPosition.value = { x: 82, y: 3 };
      showLandlord.value = true;
      persist();
    }

    function spendLandlordMoney(amount = 50000) {
      const currentRound = round.value;
      const currentFunds = landlordMoney.value;
      const newFunds = Math.max(0, currentFunds - amount);
      landlordMoney.value = newFunds;

      const existing = tallies.value[currentRound];
      const currentSpend = (existing?.landlordSpending ?? 0) + amount;

      if (existing) {
        existing.landlordSpending = currentSpend;
        existing.landlordRemaining = newFunds;
      } else {
        syncCurrentRoundTally();
        if (tallies.value[currentRound]) {
          tallies.value[currentRound].landlordSpending = currentSpend;
          tallies.value[currentRound].landlordRemaining = newFunds;
        }
      }
      addEvent(formatSpendEventText(amount), "spend");

      updatedAt.value = Date.now();
      persist();
    }

    function undoLandlordSpend(amount = 50000) {
      const currentRound = round.value;
      const startFunds = landlordStartingMoney.value;
      const currentFunds = landlordMoney.value;
      const newFunds = Math.min(startFunds, currentFunds + amount);
      landlordMoney.value = newFunds;

      const existing = tallies.value[currentRound];
      const currentSpend = Math.max(0, (existing?.landlordSpending ?? 0) - amount);

      if (existing) {
        existing.landlordSpending = currentSpend > 0 ? currentSpend : null;
        existing.landlordRemaining = newFunds;
      } else {
        syncCurrentRoundTally();
        if (tallies.value[currentRound]) {
          tallies.value[currentRound].landlordSpending = currentSpend > 0 ? currentSpend : null;
          tallies.value[currentRound].landlordRemaining = newFunds;
        }
      }

      if (canUndoEvent.value) {
        undoEvent();
      } else if (Array.isArray(events.value) && events.value.length > 0) {
        events.value.pop();
      }

      updatedAt.value = Date.now();
      persist();
    }

    function earnLandlordMoney(amount = 50000) {
      const currentRound = round.value;
      const currentFunds = landlordMoney.value;
      const newFunds = currentFunds + amount;
      landlordMoney.value = newFunds;

      const existing = tallies.value[currentRound];
      const currentSpend = Math.max(0, (existing?.landlordSpending ?? 0) - amount);

      if (existing) {
        existing.landlordSpending = currentSpend > 0 ? currentSpend : null;
        existing.landlordRemaining = newFunds;
      } else {
        syncCurrentRoundTally();
        if (tallies.value[currentRound]) {
          tallies.value[currentRound].landlordSpending = currentSpend > 0 ? currentSpend : null;
          tallies.value[currentRound].landlordRemaining = newFunds;
        }
      }

      addEvent(formatEarnEventText(amount), "earn");
      updatedAt.value = Date.now();
      persist();
    }

    function addEvent(text: string, type?: GameEventType, buildingId?: string) {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (!Array.isArray(events.value)) {
        events.value = [];
      }
      const resolvedType: GameEventType =
        type ??
        (isSpendEventText(trimmed) ? "spend" : isEarnEventText(trimmed) ? "earn" : "general");
      const newEvent: GameEvent = {
        id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text: trimmed,
        round: round.value,
        timestamp: Date.now(),
        type: resolvedType,
        ...(buildingId ? { buildingId } : {}),
      };
      events.value.push(newEvent);
      updatedAt.value = Date.now();
      persist();
    }

    function removeEvent(id: string) {
      if (!Array.isArray(events.value)) return;
      events.value = events.value.filter((e) => e.id !== id);
      updatedAt.value = Date.now();
      persist();
    }

    function clearEvents() {
      events.value = [];
      clearEventHistory();
      updatedAt.value = Date.now();
      persist();
    }

    function resetGame() {
      const defaultMoney = calculateDefaultLandlordMoney(
        buildingCount.value,
        peoplePerBuilding.value,
      );
      const def = createDefaultState();
      buildingCount.value = def.buildingCount;
      peoplePerBuilding.value = def.peoplePerBuilding;
      landlordStartingMoney.value = defaultMoney;
      landlordMoney.value = defaultMoney;
      personWidth.value = def.personWidth!;
      personHeight.value = def.personHeight!;
      personScale.value = def.personScale!;
      isConfigured.value = false;
      buildings.value = [];
      coalitionConnections.value = [];
      round.value = 1;
      phase.value = 1;
      tallies.value = def.tallies;
      events.value = [];
      updatedAt.value = Date.now();
      landlordPosition.value = { x: 82, y: 3 };
      showLandlord.value = true;

      try {
        if (typeof localStorage !== "undefined") {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {
        console.error("Failed to remove from localStorage:", e);
      }
    }

    function nextPhase() {
      if (phase.value === 3) {
        syncCurrentRoundTally();
        phase.value = 1;
        round.value += 1;
        events.value = [];
        const newRound = round.value;
        if (!tallies.value[newRound]) {
          syncCurrentRoundTally();
        }
      } else {
        phase.value = (phase.value + 1) as GamePhase;
      }
      updatedAt.value = Date.now();
      persist();
    }

    function prevPhase() {
      if (round.value === 1 && phase.value === 1) return;
      if (phase.value === 1) {
        phase.value = 3;
        round.value -= 1;
      } else {
        phase.value = (phase.value - 1) as GamePhase;
      }
      updatedAt.value = Date.now();
      persist();
    }

    function setPhase(newPhase: GamePhase) {
      if (newPhase === phase.value) return;
      phase.value = newPhase;
      updatedAt.value = Date.now();
      persist();
    }

    function toggleUnion(buildingId: string, tenantId: string, join?: boolean) {
      const building = buildings.value.find((b) => b.id === buildingId);
      if (!building) return;
      const tenant = building.tenants.find((t) => t.id === tenantId);
      if (!tenant) return;

      const wasInUnion = Boolean(tenant.inUnion || tenant.isInstigator);

      if (tenant.isInstigator) {
        tenant.inUnion = true;
      } else {
        tenant.inUnion = join !== undefined ? join : !tenant.inUnion;
      }

      const isNowInUnion = Boolean(tenant.inUnion || tenant.isInstigator);
      if (!wasInUnion && isNowInUnion) {
        addEvent(`Resident in ${building.label} joined tenant union`, "general", building.id);
      }

      syncCurrentRoundTally();
      updatedAt.value = Date.now();
      persist();
    }

    function toggleEviction(buildingId: string, tenantId: string, evicted?: boolean) {
      const building = buildings.value.find((b) => b.id === buildingId);
      if (!building) return;
      const tenant = building.tenants.find((t) => t.id === tenantId);
      if (!tenant) return;

      const wasEvicted = Boolean(tenant.isEvicted);
      const newEvicted = evicted !== undefined ? evicted : !tenant.isEvicted;
      tenant.isEvicted = newEvicted;
      if (newEvicted) {
        tenant.evictedRound = round.value;
      } else {
        delete tenant.evictedRound;
      }

      if (!wasEvicted && newEvicted) {
        addEvent(`Resident in ${building.label} evicted`, "general", building.id);
      }

      syncCurrentRoundTally();
      updatedAt.value = Date.now();
      persist();
    }

    function updateBuildingPosition(buildingId: string, x: number, y: number) {
      const building = buildings.value.find((b) => b.id === buildingId);
      if (!building) return;
      building.x = x;
      building.y = y;
      updatedAt.value = Date.now();
      persist();
    }

    function updateBuildingPositions(updates: Array<{ id: string; x: number; y: number }>) {
      let changed = false;
      for (const u of updates) {
        const building = buildings.value.find((b) => b.id === u.id);
        if (building) {
          building.x = u.x;
          building.y = u.y;
          changed = true;
        }
      }
      if (changed) {
        updatedAt.value = Date.now();
        persist();
      }
    }
    function updateLandlordPosition(x: number, y: number) {
      landlordPosition.value = {
        x: Math.round(Math.max(1, Math.min(86, x)) * 10) / 10,
        y: Math.round(Math.max(1, Math.min(74, y)) * 10) / 10,
      };
      updatedAt.value = Date.now();
      persist();
    }
    function toggleShowLandlord() {
      showLandlord.value = !showLandlord.value;
      updatedAt.value = Date.now();
      persist();
    }
    function setShowLandlord(val: boolean) {
      if (showLandlord.value === val) return;
      showLandlord.value = val;
      updatedAt.value = Date.now();
      persist();
    }

    function updateTally(targetRound: number, patch: Partial<RoundTally>) {
      const current = tallies.value[targetRound] ?? {
        round: targetRound,
        landlordSpending: null,
        totalOrganized: 0,
        evictions: 0,
        buildingsOrganized: 0,
      };
      tallies.value[targetRound] = { ...current, ...patch };
      updatedAt.value = Date.now();
      persist();
    }

    function addRoundRow() {
      const maxR = Math.max(round.value, ...Object.keys(tallies.value).map(Number));
      const nextR = maxR + 1;
      const bldgs = buildings.value;
      const roundEvictions = bldgs.reduce(
        (sum, b) =>
          sum + b.tenants.filter((t) => t.isEvicted && (t.evictedRound ?? nextR) === nextR).length,
        0,
      );
      const totalEvictions = bldgs.reduce(
        (sum, b) =>
          sum + b.tenants.filter((t) => t.isEvicted && (t.evictedRound ?? 1) <= nextR).length,
        0,
      );
      const prevTotal = tallies.value[maxR]?.totalOrganized ?? 0;
      const currentTotal = bldgs.reduce(
        (sum, b) => sum + getBuildingUnionCount(b, coalitions.value),
        0,
      );
      tallies.value[nextR] = {
        round: nextR,
        landlordSpending: null,
        totalOrganized: currentTotal,
        organizedChange: currentTotal - prevTotal,
        evictions: roundEvictions,
        totalEvictions,
        buildingsOrganized: bldgs.filter((b) => isBuildingOrganized(b, coalitions.value)).length,
      };
      updatedAt.value = Date.now();
      persist();
    }

    function adjustBuildingTenants(
      buildingId: string,
      targetCount: number,
      label?: string,
      color?: string,
    ) {
      const building = buildings.value.find((b) => b.id === buildingId);
      if (!building) return;

      let modified = false;

      if (typeof label === "string" && label.trim() && building.label !== label.trim()) {
        building.label = label.trim();
        modified = true;
      }
      if (typeof color === "string" && color.trim() && building.color !== color.trim()) {
        building.color = color.trim();
        modified = true;
      }

      const clampedTarget = Math.max(1, Math.min(100, Math.floor(targetCount)));
      const currentCount = building.tenants.length;

      if (clampedTarget !== currentCount) {
        modified = true;
        if (clampedTarget > currentCount) {
          const needed = clampedTarget - currentCount;
          for (let k = 0; k < needed; k++) {
            const nextIdNumber = currentCount + k + 1;
            building.tenants.push({
              id: `t-${building.index}-${nextIdNumber}-${Date.now() % 10000}-${k}`,
              buildingId,
              variant: (building.index + nextIdNumber) % VARIANT_COUNT,
              isInstigator: false,
              inUnion: false,
            });
          }
        } else {
          const toRemove = currentCount - clampedTarget;
          let removed = 0;
          for (let i = building.tenants.length - 1; i >= 0 && removed < toRemove; i--) {
            const t = building.tenants[i];
            if (t && !t.isInstigator && !t.inUnion) {
              building.tenants.splice(i, 1);
              removed++;
            }
          }
          for (let i = building.tenants.length - 1; i >= 0 && removed < toRemove; i--) {
            const t = building.tenants[i];
            if (t && !t.isInstigator) {
              building.tenants.splice(i, 1);
              removed++;
            }
          }
        }

        const bCount = buildings.value.length || buildingCount.value || 4;
        const maxTenants = Math.max(
          ...buildings.value.map((b) => b.tenants?.length || 0),
          peoplePerBuilding.value || 8,
          1,
        );
        let cW = 1050;
        let cH = 750;
        if (typeof window !== "undefined" && window.innerWidth > 0 && window.innerHeight > 0) {
          cW = Math.max(800, window.innerWidth * 0.72);
          cH = Math.max(600, window.innerHeight - 65);
        }
        const sizing = calculateOptimalPersonSize(bCount, maxTenants, cW, cH);
        personWidth.value = sizing.personWidth;
        personHeight.value = sizing.personHeight;
        personScale.value = sizing.personScale;
      }

      if (modified) {
        syncCurrentRoundTally();
        updatedAt.value = Date.now();
        persist();
      }
    }

    function updateBuilding(
      buildingId: string,
      updates: {
        count?: number;
        label?: string;
        color?: string;
      },
    ) {
      const building = buildings.value.find((b) => b.id === buildingId);
      if (!building) return;

      adjustBuildingTenants(
        buildingId,
        typeof updates.count === "number" ? updates.count : building.tenants.length,
        updates.label,
        updates.color,
      );
    }

    function reorderBuildings(newOrder: Building[]) {
      buildings.value = [...newOrder];
      updatedAt.value = Date.now();
      persist();
    }

    function shufflePositions() {
      const count = buildings.value.length;
      if (count === 0) return;

      const maxTenants = Math.max(...buildings.value.map((building) => building.tenants.length), 1);
      let canvasW = 1050;
      let canvasH = 750;
      if (typeof window !== "undefined" && window.innerWidth > 0 && window.innerHeight > 0) {
        canvasW = Math.max(800, window.innerWidth * 0.72);
        canvasH = Math.max(600, window.innerHeight - 65);
      }
      const newPositions = generateScatteredPositions(count, maxTenants, canvasW, canvasH);
      buildings.value.forEach((b, idx) => {
        const pos = newPositions[idx];
        if (pos) {
          b.x = pos.x;
          b.y = pos.y;
        }
      });
      updatedAt.value = Date.now();
      persist();
    }
    function spaceOutPositions() {
      if (buildings.value.length === 0) return;
      const nodes: Array<{ id: string; x: number; y: number }> = buildings.value.map((b) => ({
        id: b.id,
        x: b.x,
        y: b.y,
      }));
      if (showLandlord.value) {
        nodes.push({
          id: "landlord",
          x: landlordPosition.value.x,
          y: landlordPosition.value.y,
        });
      }

      const newPositions = spaceOutNodes(nodes);
      buildings.value.forEach((b) => {
        const pos = newPositions.find((p) => p.id === b.id);
        if (pos) {
          b.x = pos.x;
          b.y = pos.y;
        }
      });

      if (showLandlord.value) {
        const llPos = newPositions.find((p) => p.id === "landlord");
        if (llPos) {
          landlordPosition.value = {
            x: Math.round(Math.max(1, Math.min(86, llPos.x)) * 10) / 10,
            y: Math.round(Math.max(1, Math.min(74, llPos.y)) * 10) / 10,
          };
        }
      }

      updatedAt.value = Date.now();
      persist();
    }

    function connectCoalition(sourceId: string, targetId: string): boolean {
      if (!sourceId || !targetId || sourceId === targetId) return false;
      const bldgs = buildings.value;
      const sourceBuilding = bldgs.find((b) => b.id === sourceId);
      const targetBuilding = bldgs.find((b) => b.id === targetId);
      if (!sourceBuilding || !targetBuilding) return false;

      if (!Array.isArray(coalitionConnections.value)) {
        coalitionConnections.value = [];
      }

      const existingIndex = coalitionConnections.value.findIndex(
        (c) =>
          (c.sourceId === sourceId && c.targetId === targetId) ||
          (c.sourceId === targetId && c.targetId === sourceId),
      );
      if (existingIndex !== -1) return false;

      coalitionConnections.value.push({
        id: `coalition-${sourceId}-${targetId}-${Date.now()}`,
        sourceId,
        targetId,
        createdAt: Date.now(),
      });
      addEvent(`Coalition formed: ${sourceBuilding.label} + ${targetBuilding.label}`, "general");
      syncCurrentRoundTally();
      updatedAt.value = Date.now();
      persist();
      return true;
    }

    function disconnectCoalition(connectionId: string) {
      if (!Array.isArray(coalitionConnections.value)) return;
      const prevLen = coalitionConnections.value.length;
      coalitionConnections.value = coalitionConnections.value.filter((c) => c.id !== connectionId);
      if (coalitionConnections.value.length !== prevLen) {
        syncCurrentRoundTally();
        updatedAt.value = Date.now();
        persist();
      }
    }

    function disconnectPair(buildingIdA: string, buildingIdB: string) {
      if (!Array.isArray(coalitionConnections.value)) return;
      const prevLen = coalitionConnections.value.length;
      coalitionConnections.value = coalitionConnections.value.filter(
        (c) =>
          !(
            (c.sourceId === buildingIdA && c.targetId === buildingIdB) ||
            (c.sourceId === buildingIdB && c.targetId === buildingIdA)
          ),
      );
      if (coalitionConnections.value.length !== prevLen) {
        syncCurrentRoundTally();
        updatedAt.value = Date.now();
        persist();
      }
    }

    function disconnectBuilding(buildingId: string) {
      if (!Array.isArray(coalitionConnections.value)) return;
      const prevLen = coalitionConnections.value.length;
      coalitionConnections.value = coalitionConnections.value.filter(
        (c) => c.sourceId !== buildingId && c.targetId !== buildingId,
      );
      if (coalitionConnections.value.length !== prevLen) {
        syncCurrentRoundTally();
        updatedAt.value = Date.now();
        persist();
      }
    }

    function undoLastCoalition(): boolean {
      if (canUndoCoalitionHistory.value) {
        undoCoalitionHistory();
        if (canUndoEvent.value) {
          undoEvent();
        }
        syncCurrentRoundTally();
        updatedAt.value = Date.now();
        persist();
        return true;
      }
      if (!Array.isArray(coalitionConnections.value) || coalitionConnections.value.length === 0) {
        return false;
      }
      coalitionConnections.value.pop();
      syncCurrentRoundTally();
      updatedAt.value = Date.now();
      persist();
      return true;
    }

    return {
      // State
      buildingCount,
      peoplePerBuilding,
      landlordStartingMoney,
      landlordMoney,
      personWidth,
      personHeight,
      personScale,
      isConfigured,
      buildings,
      coalitionConnections,
      round,
      phase,
      tallies,
      events,
      updatedAt,
      isEditPosition,
      landlordPosition,
      showLandlord,

      // Computed / Getters
      state,
      totalBuildings,
      totalTenants,
      currentPhaseInfo,
      unionTenantsCount,
      totalEvictionsCount,
      organizedBuildingsCount,
      canUndoLandlordSpend,
      coalitions,
      buildingColorMap,
      canUndoCoalition,
      coalitionTenantsCount,

      // Actions
      persist,
      reloadFromStorage,
      toggleEditPosition,
      toggleShowLandlord,
      setShowLandlord,
      syncCurrentRoundTally,
      setupGame,
      spendLandlordMoney,
      undoLandlordSpend,
      earnLandlordMoney,
      addEvent,
      removeEvent,
      clearEvents,
      resetGame,
      nextPhase,
      prevPhase,
      setPhase,
      toggleUnion,
      toggleEviction,
      updateBuildingPosition,
      updateBuildingPositions,
      updateLandlordPosition,
      updateTally,
      addRoundRow,
      adjustBuildingTenants,
      updateBuilding,
      reorderBuildings,
      shufflePositions,
      spaceOutPositions,
      connectCoalition,
      disconnectCoalition,
      disconnectPair,
      disconnectBuilding,
      undoLastCoalition,
      undoEvent,
      redoEvent,
      canUndoEvent,
      canRedoEvent,
    };
  },
  {
    persist: {
      key: STORAGE_KEY,
      storage,
    },
  },
);

/**
 * Helper to ensure a Pinia instance is active before accessing the store.
 * Useful for tests or environments where app.use(pinia) hasn't run.
 */
export function getGameStore() {
  if (!getActivePinia()) {
    const pinia = createPinia();
    pinia.use(piniaPluginPersistedstate);
    setActivePinia(pinia);
  }
  return useGameStore();
}
