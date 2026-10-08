import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type {
  GameState,
  Building,
  Tenant,
  GamePhase,
  GameScreen,
  RoundTally,
  CoalitionConnection,
  GameEvent,
  GameEventType,
  GameEventAction,
  CoalitionGroup,
  BuildingRoofType,
  BuildingBush,
  BuildingPlant,
} from "../types/game";
import { BUILDING_COLORS } from "../types/game";
import {
  isBuildingOrganized,
  getBuildingUnionCount,
  getCoalitionUnionCount,
  getCoalitionBuildingCount,
  computeCoalitionGroups,
  getEffectiveBuildingColorMap,
  getBuildingColor,
} from "../utils/coalitions";
import { generateDefaultPositions } from "../utils/positions";
import { calculateOptimalPersonSize, BASELINE_PERSON_WIDTH } from "../utils/sizing";
import { generateDivergentPalette } from "../utils/colorTheory";
import { calculateDefaultLandlordMoney } from "../utils/currency";
import {
  getDefaultBuildingPlant,
  pickFlowerPaletteForBuilding,
} from "../utils/buildingArchitecture";
import {
  formatSpendEventText,
  formatEarnEventText,
  formatJoinUnionEventText,
  formatEvictEventText,
  formatCoalitionEventText,
  ensureEventEmoji,
  isSpendEventText,
  isEarnEventText,
} from "../utils/eventLog";

const STORAGE_KEY = "tenant_union_game_state_v1";
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
    showLandlord: false,
    canEdit: true,
    controlsCollapsed: false,
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
  const roofVariations: readonly BuildingRoofType[] = [
    "flat",
    "pitched",
    "mansard",
    "flat-chairs",
    "flat",
    "pitched",
    "flat-chairs",
  ];

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
    const roofType = roofVariations[(i - 1) % roofVariations.length]!;
    const hasBalcony = (i - 1) % 2 === 0;
    const buildingColor = divergentColors[i - 1] ?? getBuildingColor(i, buildingCount);
    const plant: BuildingPlant = getDefaultBuildingPlant(i);
    const flowerColor =
      plant === "flower" ? pickFlowerPaletteForBuilding(buildingColor, i).petal : undefined;

    result.push({
      id: buildingId,
      index: i,
      label: `Building ${i}`,
      color: buildingColor,
      tenants,
      x: pos.x,
      y: pos.y,
      roofType,
      hasBalcony,
      plant,
      bush: plant,
      flowerColor,
    });
  }
  return result;
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
    const isConfigured = ref(initial.isConfigured);
    const hasBegun = ref(initial.hasBegun ?? false);
    const landlordPosition = ref<{ x: number; y: number }>(
      initial.landlordPosition ?? { x: 82, y: 3 },
    );
    const showLandlord = ref(initial.showLandlord ?? false);
    const buildings = ref<Building[]>(initial.buildings);
    const coalitionConnections = ref<CoalitionConnection[]>(initial.coalitionConnections ?? []);
    const round = ref(initial.round);
    const phase = ref<GamePhase>(initial.phase);
    const tallies = ref<Record<number, RoundTally>>(initial.tallies);
    const events = ref<GameEvent[]>(initial.events ?? []);
    const isSettingUpNewGame = ref(false);
    const canEdit = ref(initial.hasBegun ? false : (initial.canEdit ?? true));
    const isEditBuildings = canEdit;
    const isEditPosition = canEdit;
    const controlsCollapsed = ref(initial.hasBegun ? true : (initial.controlsCollapsed ?? false));

    // Authoritative screen flow: new game screen -> neighborhood setup screen -> gameplay
    const currentScreen = computed<GameScreen>(() => {
      if (!isConfigured.value || isSettingUpNewGame.value) {
        return "new-game";
      }
      if (!hasBegun.value) {
        return "neighborhood-setup";
      }
      return "gameplay";
    });

    // Unified gates for screen modes
    const isNewGameScreen = computed(() => currentScreen.value === "new-game");
    const isNeighborhoodSetup = computed(() => currentScreen.value === "neighborhood-setup");
    const isGameplay = computed(() => currentScreen.value === "gameplay");

    const coalitions = computed<CoalitionGroup[]>(() =>
      computeCoalitionGroups(buildings.value, coalitionConnections.value),
    );
    const buildingColorMap = computed<Record<string, string>>(() =>
      getEffectiveBuildingColorMap(buildings.value, coalitionConnections.value),
    );
    const unionTenantsCount = computed(() =>
      buildings.value.reduce((sum, b) => sum + getBuildingUnionCount(b, coalitions.value), 0),
    );
    const coalitionTenantsCount = computed(() =>
      getCoalitionUnionCount(buildings.value, coalitions.value),
    );
    const coalitionBuildingsCount = computed(() =>
      getCoalitionBuildingCount(buildings.value, coalitions.value),
    );

    function syncAllRoundTallies() {
      const currentRound = round.value;
      const bldgs = buildings.value;
      const currentCoalitions = coalitions.value;
      const totalOrganized = bldgs.reduce(
        (sum, b) => sum + getBuildingUnionCount(b, currentCoalitions),
        0,
      );
      const bldgsOrganized = bldgs.filter((b) => isBuildingOrganized(b, currentCoalitions)).length;

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
          tallies.value[r] = {
            round: r,
            landlordSpending: existing?.landlordSpending ?? null,
            landlordRemaining: existing?.landlordRemaining ?? landlordMoney.value,
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
      isConfigured.value = true;
      hasBegun.value = false;
      isSettingUpNewGame.value = false;
      canEdit.value = true;
      controlsCollapsed.value = false;
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
      landlordPosition.value = { x: 82, y: 3 };
      showLandlord.value = false;
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
      }

      addEvent(formatSpendEventText(amount), "spend", undefined, {
        type: "spend",
        amount,
        round: currentRound,
      });
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
      }

      addEvent(formatEarnEventText(amount), "earn", undefined, {
        type: "earn",
        amount,
        round: currentRound,
      });
    }

    function addEvent(
      text: string,
      type?: GameEventType,
      buildingId?: string,
      action?: GameEventAction,
    ) {
      const trimmed = text.trim();
      if (!trimmed) return;
      const formattedText = ensureEventEmoji(trimmed, type, action?.type);
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
    }

    function undoEvent(id?: string): boolean {
      if (events.value.length === 0) return false;
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
            break;
          }
          default:
            break;
        }
      }

      events.value.splice(eventIndex, 1);
      syncAllRoundTallies();
      return true;
    }

    function nextPhase() {
      if (phase.value === 3) {
        syncAllRoundTallies();
        phase.value = 1;
        round.value += 1;
        const newRound = round.value;
        if (!tallies.value[newRound]) {
          syncAllRoundTallies();
        }
      } else {
        phase.value = (phase.value + 1) as GamePhase;
      }
    }

    function prevPhase() {
      if (round.value === 1 && phase.value === 1) return;
      if (phase.value === 1) {
        phase.value = 3;
        round.value -= 1;
      } else {
        phase.value = (phase.value - 1) as GamePhase;
      }
    }

    function setPhase(newPhase: GamePhase) {
      if (newPhase === phase.value) return;
      phase.value = newPhase;
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
        addEvent(formatJoinUnionEventText(building.label), "general", building.id, {
          type: "joinUnion",
          buildingId: building.id,
          tenantId: tenant.id,
          round: round.value,
        });
      }

      syncAllRoundTallies();
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
        addEvent(formatEvictEventText(building.label), "general", building.id, {
          type: "evict",
          buildingId: building.id,
          tenantId: tenant.id,
          round: round.value,
        });
      }

      syncAllRoundTallies();
    }

    function updateBuildingPosition(buildingId: string, x: number, y: number) {
      const building = buildings.value.find((b) => b.id === buildingId);
      if (!building) return;
      building.x = x;
      building.y = y;
    }

    function updateBuildingPositions(updates: Array<{ id: string; x: number; y: number }>) {
      for (const u of updates) {
        const building = buildings.value.find((b) => b.id === u.id);
        if (building) {
          building.x = u.x;
          building.y = u.y;
        }
      }
    }

    function updateLandlordPosition(x: number, y: number) {
      landlordPosition.value = {
        x: Math.round(Math.max(1, Math.min(86, x)) * 10) / 10,
        y: Math.round(Math.max(1, Math.min(74, y)) * 10) / 10,
      };
    }

    function openNewGame() {
      isSettingUpNewGame.value = true;
    }

    function cancelNewGame() {
      isSettingUpNewGame.value = false;
    }

    function beginGame() {
      hasBegun.value = true;
      isSettingUpNewGame.value = false;
      canEdit.value = false;
      controlsCollapsed.value = true;
    }

    function adjustBuildingTenants(
      buildingId: string,
      targetCount: number,
      label?: string,
      color?: string,
      roofType?: BuildingRoofType,
      hasBalcony?: boolean,
      plant?: BuildingPlant | BuildingBush,
    ) {
      const building = buildings.value.find((b) => b.id === buildingId);
      if (!building) return;

      if (typeof label === "string" && label.trim()) {
        building.label = label.trim();
      }
      if (typeof color === "string" && color.trim()) {
        building.color = color.trim();
        if (building.plant === "flower" || building.bush === "flower") {
          building.flowerColor = pickFlowerPaletteForBuilding(building.color, building.index).petal;
        }
      }
      if (roofType) {
        building.roofType = roofType;
      }
      if (typeof hasBalcony === "boolean") {
        building.hasBalcony = hasBalcony;
      }
      if (typeof plant === "string") {
        if (plant === "flower") {
          building.plant = "flower";
          building.bush = "flower";
          building.flowerColor = pickFlowerPaletteForBuilding(building.color, building.index).petal;
        } else if (plant === "bush" || plant === "left" || plant === "right") {
          building.plant = "bush";
          building.bush = plant;
          building.flowerColor = undefined;
        } else if (plant === "none") {
          building.plant = "none";
          building.bush = "none";
          building.flowerColor = undefined;
        }
      }
      const preservedCount = building.tenants.filter((t) => t.isInstigator || t.inUnion).length;
      const minAllowed = Math.max(1, preservedCount);
      const clampedTarget = Math.max(minAllowed, Math.min(100, Math.floor(targetCount)));
      const currentCount = building.tenants.length;

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
      } else if (clampedTarget < currentCount) {
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

      if (clampedTarget !== currentCount) {
        recalculateSizing();
      }

      syncAllRoundTallies();
    }

    function connectCoalition(sourceId: string, targetId: string): boolean {
      if (!sourceId || !targetId || sourceId === targetId) return false;
      const bldgs = buildings.value;
      const sourceBuilding = bldgs.find((b) => b.id === sourceId);
      const targetBuilding = bldgs.find((b) => b.id === targetId);
      if (!sourceBuilding || !targetBuilding) return false;

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
        formatCoalitionEventText(sourceBuilding.label, targetBuilding.label),
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
      syncAllRoundTallies();
      return true;
    }

    function disconnectCoalition(connectionId: string) {
      const prevLen = coalitionConnections.value.length;
      coalitionConnections.value = coalitionConnections.value.filter((c) => c.id !== connectionId);
      if (coalitionConnections.value.length !== prevLen) {
        syncAllRoundTallies();
      }
    }

    function disconnectBuilding(buildingId: string) {
      const prevLen = coalitionConnections.value.length;
      coalitionConnections.value = coalitionConnections.value.filter(
        (c) => c.sourceId !== buildingId && c.targetId !== buildingId,
      );
      if (coalitionConnections.value.length !== prevLen) {
        syncAllRoundTallies();
      }
    }

    function undoLastCoalition(): boolean {
      if (coalitionConnections.value.length === 0) return false;
      const lastConn = coalitionConnections.value[coalitionConnections.value.length - 1];
      for (let i = events.value.length - 1; i >= 0; i--) {
        const e = events.value[i];
        if (
          e?.action?.type === "connectCoalition" &&
          (e.action.connectionId === lastConn?.id ||
            (e.action.sourceId === lastConn?.sourceId && e.action.targetId === lastConn?.targetId))
        ) {
          undoEvent(e.id);
          return true;
        }
      }
      coalitionConnections.value.pop();
      syncAllRoundTallies();
      return true;
    }
    function recalculateSizing() {
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
    }

    function findNextBuildingPosition(peopleCount: number): { x: number; y: number } {
      const currentCount = buildings.value.length;
      const newCount = currentCount + 1;
      const defaults = generateDefaultPositions(newCount, peopleCount);
      const candidate = defaults[currentCount];

      if (candidate) {
        const collides = buildings.value.some((b) => {
          return Math.abs(b.x - candidate.x) < 18 && Math.abs(b.y - candidate.y) < 22;
        });
        if (!collides) {
          return candidate;
        }
      }

      let bestCandidate = { x: 45, y: 35 };
      let maxMinDistance = -1;

      for (let x = 10; x <= 75; x += 15) {
        for (let y = 12; y <= 65; y += 18) {
          if (showLandlord.value && x >= 75 && y <= 25) continue;

          let minDistance = Infinity;
          for (const b of buildings.value) {
            const dx = b.x - x;
            const dy = b.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDistance) {
              minDistance = dist;
            }
          }
          if (minDistance > maxMinDistance) {
            maxMinDistance = minDistance;
            bestCandidate = { x, y };
          }
        }
      }

      return bestCandidate;
    }

    function pickNewBuildingColor(index: number): string {
      const usedColors = new Set(buildings.value.map((b) => b.color.toLowerCase()));
      const availableColor = BUILDING_COLORS.find((c) => !usedColors.has(c.toLowerCase()));
      if (availableColor) return availableColor;
      return getBuildingColor(index, buildings.value.length + 1);
    }

    function addBuilding(countOfTenants?: number): Building {
      const count = Math.max(
        1,
        Math.min(200, Math.floor(countOfTenants ?? peoplePerBuilding.value ?? 8)),
      );
      const maxIndex = buildings.value.reduce((max, b) => Math.max(max, b.index || 0), 0);
      const nextIndex = maxIndex + 1;
      const buildingId = `b-${nextIndex}-${Date.now() % 10000}`;
      const pos = findNextBuildingPosition(count);
      const buildingColor = pickNewBuildingColor(nextIndex);
      const roofVariations: readonly BuildingRoofType[] = [
        "flat",
        "pitched",
        "mansard",
        "flat-chairs",
        "flat",
        "pitched",
        "flat-chairs",
      ];
      const roofType = roofVariations[(nextIndex - 1) % roofVariations.length]!;
      const hasBalcony = (nextIndex - 1) % 2 === 0;
      const plant: BuildingPlant = getDefaultBuildingPlant(nextIndex);
      const flowerColor =
        plant === "flower"
          ? pickFlowerPaletteForBuilding(buildingColor, nextIndex).petal
          : undefined;

      const tenants: Tenant[] = [];
      const instigatorIdx = Math.floor(Math.random() * count);
      for (let j = 1; j <= count; j++) {
        const isInstigator = j - 1 === instigatorIdx;
        tenants.push({
          id: `t-${nextIndex}-${j}-${Date.now() % 10000}`,
          buildingId,
          variant: (nextIndex + j) % VARIANT_COUNT,
          isInstigator,
          inUnion: isInstigator,
          isEvicted: false,
        });
      }

      const newBuilding: Building = {
        id: buildingId,
        index: nextIndex,
        label: `Building ${nextIndex}`,
        color: buildingColor,
        tenants,
        x: pos.x,
        y: pos.y,
        roofType,
        hasBalcony,
        plant,
        bush: plant,
        flowerColor,
      };

      buildings.value.push(newBuilding);
      buildingCount.value = buildings.value.length;
      recalculateSizing();
      syncAllRoundTallies();
      return newBuilding;
    }

    function deleteBuilding(buildingId: string): boolean {
      const idx = buildings.value.findIndex((b) => b.id === buildingId);
      if (idx === -1) return false;

      buildings.value.splice(idx, 1);
      buildingCount.value = buildings.value.length;
      disconnectBuilding(buildingId);
      recalculateSizing();
      syncAllRoundTallies();
      return true;
    }

    return {
      // State
      buildingCount,
      peoplePerBuilding,
      landlordStartingMoney,
      landlordMoney,
      personWidth,
      isConfigured,
      hasBegun,
      buildings,
      coalitionConnections,
      round,
      phase,
      tallies,
      events,
      landlordPosition,
      showLandlord,
      canEdit,
      isSettingUpNewGame,
      isEditBuildings,
      isEditPosition,
      controlsCollapsed,

      // Screen Flow & Gates
      currentScreen,
      isNewGameScreen,
      isNeighborhoodSetup,
      isGameplay,

      // Computed
      coalitions,
      buildingColorMap,
      unionTenantsCount,
      coalitionTenantsCount,
      coalitionBuildingsCount,

      // Actions
      openNewGame,
      cancelNewGame,
      setupGame,
      beginGame,
      spendLandlordMoney,
      earnLandlordMoney,
      addEvent,
      undoEvent,
      nextPhase,
      prevPhase,
      setPhase,
      toggleUnion,
      toggleEviction,
      updateBuildingPosition,
      updateBuildingPositions,
      updateLandlordPosition,
      adjustBuildingTenants,
      connectCoalition,
      disconnectCoalition,
      disconnectBuilding,
      undoLastCoalition,
      addBuilding,
      deleteBuilding,
    };
  },
  {
    persist: {
      key: STORAGE_KEY,
    },
  },
);
