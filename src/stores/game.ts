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
  GameEvent,
  GameEventType,
  GameEventAction,
  CoalitionGroup,
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
    hasBegun: false,
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
    return `Landlord spends ${amount / 1_000_000}m`;
  }
  if (amount >= 1_000 && amount % 1_000 === 0) {
    return `Landlord spends ${amount / 1_000}k`;
  }
  return `Landlord spends $${amount.toLocaleString()}`;
}

export function formatEarnEventText(amount: number): string {
  if (amount >= 1_000_000 && amount % 1_000_000 === 0) {
    return `Landlord earns ${amount / 1_000_000}m`;
  }
  if (amount >= 1_000 && amount % 1_000 === 0) {
    return `Landlord earns ${amount / 1_000}k`;
  }
  return `Landlord earns $${amount.toLocaleString()}`;
}

export function formatDiceRollEventText(total: number): string {
  return `🎲 Group rolled ${total}`;
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
    const hasBegun = ref(
      initial.hasBegun !== undefined
        ? initial.hasBegun
        : Boolean(
            initial.isConfigured &&
            (initial.round > 1 || (initial.events && initial.events.length > 0)),
          ),
    );
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
    const canEdit = ref(true);
    const isEditBuildings = canEdit;
    const isEditPosition = canEdit;

    const {
      undo: undoEventHistory,
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
      hasBegun: hasBegun.value,
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
    const eventsJson = computed(() => JSON.stringify(events.value, null, 2));

    function persist() {
      // Managed automatically by pinia-plugin-persistedstate
    }

    function toggleEditPosition() {
      isEditPosition.value = !isEditPosition.value;
    }
    function reloadFromStorage() {
      // Managed automatically by pinia-plugin-persistedstate
    }

    function syncAllRoundTallies() {
      const currentRound = round.value;
      const bldgs = buildings.value;
      const totalOrganized = bldgs.reduce(
        (sum, b) => sum + getBuildingUnionCount(b, coalitions.value),
        0,
      );
      const bldgsOrganized = bldgs.filter((b) => isBuildingOrganized(b, coalitions.value)).length;

      for (let r = 1; r <= currentRound; r++) {
        const existing = tallies.value[r];
        const roundEvictions = bldgs.reduce(
          (sum, b) =>
            sum + b.tenants.filter((t) => t.isEvicted && (t.evictedRound ?? r) === r).length,
          0,
        );
        const cumulativeEvictions = bldgs.reduce(
          (sum, b) =>
            sum + b.tenants.filter((t) => t.isEvicted && (t.evictedRound ?? 1) <= r).length,
          0,
        );

        if (r === currentRound) {
          const prevOrganized = r > 1 ? (tallies.value[r - 1]?.totalOrganized ?? 0) : 0;
          const currentFunds = landlordMoney.value;
          tallies.value[r] = {
            round: r,
            landlordSpending: existing?.landlordSpending ?? null,
            landlordRemaining: existing?.landlordRemaining ?? currentFunds,
            totalOrganized,
            organizedChange: totalOrganized - prevOrganized,
            evictions: roundEvictions,
            totalEvictions: cumulativeEvictions,
            buildingsOrganized: bldgsOrganized,
          };
        } else if (existing) {
          existing.evictions = roundEvictions;
          existing.totalEvictions = cumulativeEvictions;
        }
      }
    }

    const syncCurrentRoundTally = syncAllRoundTallies;

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
      hasBegun.value = false;
      canEdit.value = true;
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
      addEvent(formatSpendEventText(amount), "spend", undefined, {
        type: "spend",
        amount,
        round: currentRound,
      });

      updatedAt.value = Date.now();
      persist();
    }

    function undoLandlordSpend(amount = 50000) {
      for (let i = events.value.length - 1; i >= 0; i--) {
        const ev = events.value[i];
        if (ev && (ev.type === "spend" || ev.action?.type === "spend")) {
          undoEvent(ev.id);
          return;
        }
      }
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

      addEvent(formatEarnEventText(amount), "earn", undefined, {
        type: "earn",
        amount,
        round: currentRound,
      });
      updatedAt.value = Date.now();
      persist();
    }

    function addEvent(
      text: string,
      type?: GameEventType,
      buildingId?: string,
      action?: GameEventAction,
    ) {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (!Array.isArray(events.value)) {
        events.value = [];
      }
      const formattedText = /^landlord\b/i.test(trimmed)
        ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
        : trimmed;
      const resolvedType: GameEventType =
        type ??
        (isSpendEventText(formattedText)
          ? "spend"
          : isEarnEventText(formattedText)
            ? "earn"
            : "general");
      const newEvent: GameEvent = {
        id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text: formattedText,
        round: round.value,
        timestamp: Date.now(),
        type: resolvedType,
        ...(buildingId ? { buildingId } : {}),
        ...(action ? { action } : {}),
      };
      events.value.push(newEvent);
      updatedAt.value = Date.now();
      persist();
    }

    function undoEvent(id?: string): boolean {
      if (!Array.isArray(events.value) || events.value.length === 0) return false;
      const targetId = id ?? events.value[events.value.length - 1]?.id;
      if (!targetId) return false;

      const eventIndex = events.value.findIndex((e) => e.id === targetId);
      if (eventIndex === -1) return false;
      const event = events.value[eventIndex];
      if (!event) return false;

      const eventRound = event.round ?? round.value;
      const action = event.action;

      if (action) {
        switch (action.type) {
          case "spend": {
            const amount = action.amount ?? 0;
            if (amount > 0) {
              landlordMoney.value += amount;
              if (tallies.value[eventRound]) {
                const currentSpend = (tallies.value[eventRound].landlordSpending ?? 0) - amount;
                tallies.value[eventRound].landlordSpending = currentSpend > 0 ? currentSpend : null;
              }
              for (let r = eventRound; r <= round.value; r++) {
                const tr = tallies.value[r];
                if (tr) {
                  tr.landlordRemaining = (tr.landlordRemaining ?? 0) + amount;
                }
              }
            }
            break;
          }
          case "earn": {
            const amount = action.amount ?? 0;
            if (amount > 0) {
              landlordMoney.value = Math.max(0, landlordMoney.value - amount);
              if (tallies.value[eventRound]) {
                const currentSpend = (tallies.value[eventRound].landlordSpending ?? 0) + amount;
                tallies.value[eventRound].landlordSpending = currentSpend > 0 ? currentSpend : null;
              }
              for (let r = eventRound; r <= round.value; r++) {
                const tr = tallies.value[r];
                if (tr) {
                  tr.landlordRemaining = Math.max(0, (tr.landlordRemaining ?? 0) - amount);
                }
              }
            }
            break;
          }
          case "joinUnion": {
            const building = buildings.value.find((b) => b.id === action.buildingId);
            const tenant = building?.tenants.find((t) => t.id === action.tenantId);
            if (tenant && !tenant.isInstigator) {
              tenant.inUnion = false;
            }
            break;
          }
          case "leaveUnion": {
            const building = buildings.value.find((b) => b.id === action.buildingId);
            const tenant = building?.tenants.find((t) => t.id === action.tenantId);
            if (tenant) {
              tenant.inUnion = true;
            }
            break;
          }
          case "evict": {
            const building = buildings.value.find((b) => b.id === action.buildingId);
            const tenant = building?.tenants.find((t) => t.id === action.tenantId);
            if (tenant) {
              tenant.isEvicted = false;
              delete tenant.evictedRound;
            }
            break;
          }
          case "unevict": {
            const building = buildings.value.find((b) => b.id === action.buildingId);
            const tenant = building?.tenants.find((t) => t.id === action.tenantId);
            if (tenant) {
              tenant.isEvicted = true;
              tenant.evictedRound = eventRound;
            }
            break;
          }
          case "connectCoalition": {
            if (Array.isArray(coalitionConnections.value)) {
              if (action.connectionId) {
                coalitionConnections.value = coalitionConnections.value.filter(
                  (c) => c.id !== action.connectionId,
                );
              } else if (action.sourceId && action.targetId) {
                coalitionConnections.value = coalitionConnections.value.filter(
                  (c) =>
                    !(
                      (c.sourceId === action.sourceId && c.targetId === action.targetId) ||
                      (c.sourceId === action.targetId && c.targetId === action.sourceId)
                    ),
                );
              }
            }
            break;
          }
          default:
            break;
        }
      } else {
        // Fallback for events without action metadata:
        if (event.type === "spend") {
          const match = event.text.match(/(\d+(?:\.\d+)?)\s*([km])?/i);
          if (match && match[1]) {
            let amt = parseFloat(match[1]);
            if (match[2]?.toLowerCase() === "k") amt *= 1_000;
            else if (match[2]?.toLowerCase() === "m") amt *= 1_000_000;
            if (amt > 0) {
              landlordMoney.value += amt;
              if (tallies.value[eventRound]) {
                const currentSpend = (tallies.value[eventRound].landlordSpending ?? 0) - amt;
                tallies.value[eventRound].landlordSpending = currentSpend > 0 ? currentSpend : null;
              }
              for (let r = eventRound; r <= round.value; r++) {
                const tr = tallies.value[r];
                if (tr) {
                  tr.landlordRemaining = (tr.landlordRemaining ?? 0) + amt;
                }
              }
            }
          }
        } else if (event.type === "earn") {
          const match = event.text.match(/(\d+(?:\.\d+)?)\s*([km])?/i);
          if (match && match[1]) {
            let amt = parseFloat(match[1]);
            if (match[2]?.toLowerCase() === "k") amt *= 1_000;
            else if (match[2]?.toLowerCase() === "m") amt *= 1_000_000;
            if (amt > 0) {
              landlordMoney.value = Math.max(0, landlordMoney.value - amt);
              if (tallies.value[eventRound]) {
                const currentSpend = (tallies.value[eventRound].landlordSpending ?? 0) + amt;
                tallies.value[eventRound].landlordSpending = currentSpend > 0 ? currentSpend : null;
              }
              for (let r = eventRound; r <= round.value; r++) {
                const tr = tallies.value[r];
                if (tr) {
                  tr.landlordRemaining = Math.max(0, (tr.landlordRemaining ?? 0) - amt);
                }
              }
            }
          }
        } else if (event.text.startsWith("Coalition formed:")) {
          const names = event.text
            .replace("Coalition formed:", "")
            .split("+")
            .map((s) => s.trim());
          if (names.length === 2 && names[0] && names[1]) {
            const b1 = buildings.value.find(
              (b) => b.label.toLowerCase() === names[0]?.toLowerCase(),
            );
            const b2 = buildings.value.find(
              (b) => b.label.toLowerCase() === names[1]?.toLowerCase(),
            );
            if (b1 && b2 && Array.isArray(coalitionConnections.value)) {
              coalitionConnections.value = coalitionConnections.value.filter(
                (c) =>
                  !(
                    (c.sourceId === b1.id && c.targetId === b2.id) ||
                    (c.sourceId === b2.id && c.targetId === b1.id)
                  ),
              );
            }
          }
        } else if (event.buildingId && event.text.includes("joined tenant union")) {
          const building = buildings.value.find((b) => b.id === event.buildingId);
          const tenant = building?.tenants.find((t) => t.inUnion && !t.isInstigator);
          if (tenant) {
            tenant.inUnion = false;
          }
        } else if (event.buildingId && event.text.includes("evicted")) {
          const building = buildings.value.find((b) => b.id === event.buildingId);
          const tenant = building?.tenants.find((t) => t.isEvicted);
          if (tenant) {
            tenant.isEvicted = false;
            delete tenant.evictedRound;
          }
        }
      }

      events.value.splice(eventIndex, 1);
      syncAllRoundTallies();
      updatedAt.value = Date.now();
      persist();
      return true;
    }

    function removeEvent(id: string) {
      undoEvent(id);
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
      hasBegun.value = false;
      canEdit.value = true;
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
        addEvent(`Resident in ${building.label} joined tenant union`, "general", building.id, {
          type: "joinUnion",
          buildingId: building.id,
          tenantId: tenant.id,
          round: round.value,
        });
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
        addEvent(`Resident in ${building.label} evicted`, "general", building.id, {
          type: "evict",
          buildingId: building.id,
          tenantId: tenant.id,
          round: round.value,
        });
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

    function beginGame() {
      canEdit.value = false;
      hasBegun.value = true;
      updatedAt.value = Date.now();
      persist();
    }

    function setHasBegun(val: boolean) {
      hasBegun.value = val;
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

      const connectionId = `coalition-${sourceId}-${targetId}-${Date.now()}`;
      coalitionConnections.value.push({
        id: connectionId,
        sourceId,
        targetId,
        createdAt: Date.now(),
      });
      addEvent(
        `Coalition formed: ${sourceBuilding.label} + ${targetBuilding.label}`,
        "general",
        undefined,
        {
          type: "connectCoalition",
          connectionId,
          sourceId,
          targetId,
          round: round.value,
        },
      );
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
      hasBegun,
      buildings,
      coalitionConnections,
      round,
      phase,
      tallies,
      events,
      updatedAt,
      canEdit,
      isEditBuildings,
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
      eventsJson,
      // Actions
      persist,
      reloadFromStorage,
      toggleEditPosition,
      toggleShowLandlord,
      setShowLandlord,
      syncCurrentRoundTally,
      setupGame,
      beginGame,
      setHasBegun,
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
      connectCoalition,
      disconnectCoalition,
      disconnectPair,
      disconnectBuilding,
      undoLastCoalition,
      undoEvent,
      redoEvent,
      canUndoEvent,
      canRedoEvent,
      syncAllRoundTallies,
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
