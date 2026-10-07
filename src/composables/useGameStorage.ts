import { ref, computed } from "vue";
import type {
  GameState,
  Building,
  Tenant,
  GamePhase,
  RoundTally,
  CoalitionConnection,
  CoalitionGroup,
} from "../types/game";
import {
  PHASES,
  getBuildingColor,
  isBuildingOrganized,
  getBuildingUnionCount,
  generateScatteredPositions,
  computeCoalitionGroups,
  getEffectiveBuildingColorMap,
} from "../types/game";
import {
  DEFAULT_LANDLORD_MONEY_PER_PLAYER,
  calculateDefaultLandlordMoney,
} from "../utils/currency";
const STORAGE_KEY = "tenant_union_game_state_v1";
const VARIANT_COUNT = 5;

function createDefaultState(): GameState {
  const defaultBuildings = 4;
  const defaultPeople = 8;
  const initialMoney = calculateDefaultLandlordMoney(defaultBuildings, defaultPeople);
  return {
    buildingCount: defaultBuildings,
    peoplePerBuilding: defaultPeople,
    landlordStartingMoney: initialMoney,
    landlordMoney: initialMoney,
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
    updatedAt: Date.now(),
  };
}

function generateBuildings(buildingCount: number, peoplePerBuilding: number): Building[] {
  const result: Building[] = [];
  const positions = generateScatteredPositions(buildingCount);

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
      color: getBuildingColor(i),
      tenants,
      x: pos.x,
      y: pos.y,
    });
  }
  return result;
}

function sanitizeLoadedState(parsed: Partial<GameState>): GameState {
  const rawBuildings = Array.isArray(parsed.buildings) ? parsed.buildings : [];
  const fallbackPositions = generateScatteredPositions(rawBuildings.length);

  const buildings: Building[] = rawBuildings.map((b, idx) => {
    const buildingIndex = Number(b.index) || idx + 1;
    const buildingColor =
      typeof b.color === "string" && b.color ? b.color : getBuildingColor(buildingIndex);
    const rawTenants = Array.isArray(b.tenants) ? b.tenants : [];

    let hasInstigator = rawTenants.some((t) => Boolean(t.isInstigator));
    const tenants: Tenant[] = rawTenants.map((t, tIdx) => {
      let isInstigator = Boolean(t.isInstigator);
      if (!hasInstigator && tIdx === 0) {
        isInstigator = true;
        hasInstigator = true;
      }
      return {
        id: t.id || `t-${buildingIndex}-${tIdx + 1}`,
        buildingId: t.buildingId || b.id || `b-${buildingIndex}`,
        variant: Number(t.variant) || 0,
        isInstigator,
        inUnion: isInstigator || Boolean(t.inUnion),
        isEvicted: Boolean(t.isEvicted),
        evictedRound:
          typeof t.evictedRound === "number" && t.evictedRound > 0
            ? t.evictedRound
            : t.isEvicted
              ? 1
              : undefined,
      };
    });

    const defaultPos = fallbackPositions[idx] ?? {
      x: 12 + ((idx * 22) % 68),
      y: 14 + ((idx * 24) % 64),
    };
    const x = typeof b.x === "number" && !isNaN(b.x) ? b.x : defaultPos.x;
    const y = typeof b.y === "number" && !isNaN(b.y) ? b.y : defaultPos.y;

    return {
      id: b.id || `b-${buildingIndex}`,
      index: buildingIndex,
      label: b.label || `Building ${buildingIndex}`,
      color: buildingColor,
      tenants,
      x,
      y,
    };
  });

  const phaseRaw = Number(parsed.phase);
  const validPhase: GamePhase = phaseRaw === 2 || phaseRaw === 3 ? phaseRaw : 1;
  const validRound = Math.max(1, Number(parsed.round) || 1);

  const rawTallies = parsed.tallies && typeof parsed.tallies === "object" ? parsed.tallies : {};
  const tallies: Record<number, RoundTally> = {};

  const rawBuildingCount = Number(parsed.buildingCount) || Math.max(1, buildings.length);
  const rawPeopleCount =
    Number(parsed.peoplePerBuilding) ||
    (buildings[0]?.tenants.length ? buildings[0].tenants.length : 8);

  const isConfigured = Boolean(parsed.isConfigured);
  const oldFormulaDefault = rawBuildingCount * 50_000;
  const newFormulaDefault = calculateDefaultLandlordMoney(rawBuildingCount, rawPeopleCount);
  const isOldDefault =
    typeof parsed.landlordStartingMoney === "number" &&
    parsed.landlordStartingMoney === oldFormulaDefault &&
    oldFormulaDefault !== newFormulaDefault;

  const landlordStartingMoney =
    !isConfigured ||
    isOldDefault ||
    typeof parsed.landlordStartingMoney !== "number" ||
    isNaN(parsed.landlordStartingMoney)
      ? newFormulaDefault
      : Math.max(0, parsed.landlordStartingMoney);
  const landlordMoney =
    !isConfigured ||
    isOldDefault ||
    typeof parsed.landlordMoney !== "number" ||
    isNaN(parsed.landlordMoney)
      ? landlordStartingMoney
      : Math.max(0, parsed.landlordMoney);

  // Populate tallies from storage or default
  for (let r = 1; r <= validRound; r++) {
    const existing = rawTallies[r];
    if (existing) {
      tallies[r] = {
        round: r,
        landlordSpending:
          typeof existing.landlordSpending === "number" ? existing.landlordSpending : null,
        landlordRemaining:
          typeof existing.landlordRemaining === "number"
            ? existing.landlordRemaining
            : r === validRound
              ? landlordMoney
              : null,
        totalOrganized: Number(existing.totalOrganized) || 0,
        evictions: Number(existing.evictions) || 0,
        totalEvictions:
          typeof existing.totalEvictions === "number"
            ? existing.totalEvictions
            : Number(existing.evictions) || 0,
        buildingsOrganized: Number(existing.buildingsOrganized) || 0,
      };
    } else {
      const roundEvictions = buildings.reduce(
        (sum, b) =>
          sum + b.tenants.filter((t) => t.isEvicted && (t.evictedRound ?? r) === r).length,
        0,
      );
      const totalEvictions = buildings.reduce(
        (sum, b) => sum + b.tenants.filter((t) => t.isEvicted && (t.evictedRound ?? 1) <= r).length,
        0,
      );
      tallies[r] = {
        round: r,
        landlordSpending: null,
        landlordRemaining: r === validRound ? landlordMoney : null,
        totalOrganized: buildings.reduce((sum, b) => sum + getBuildingUnionCount(b), 0),
        evictions: roundEvictions,
        totalEvictions,
        buildingsOrganized: buildings.filter(isBuildingOrganized).length,
      };
    }
  }

  const rawConnections = Array.isArray(parsed.coalitionConnections)
    ? parsed.coalitionConnections
    : [];
  const validBuildingIds = new Set(buildings.map((b) => b.id));
  const coalitionConnections: CoalitionConnection[] = [];
  const seenPairKeys = new Set<string>();

  for (const conn of rawConnections) {
    if (!conn || typeof conn !== "object") continue;
    const s = String(conn.sourceId || "");
    const t = String(conn.targetId || "");
    if (!s || !t || s === t || !validBuildingIds.has(s) || !validBuildingIds.has(t)) continue;
    const pairKey = [s, t].sort().join("::");
    if (seenPairKeys.has(pairKey)) continue;
    seenPairKeys.add(pairKey);
    coalitionConnections.push({
      id: typeof conn.id === "string" && conn.id ? conn.id : `coalition-${s}-${t}-${Date.now()}`,
      sourceId: s,
      targetId: t,
      createdAt: Number(conn.createdAt) || Date.now(),
    });
  }

  return {
    buildingCount: rawBuildingCount,
    peoplePerBuilding: Number(parsed.peoplePerBuilding) || 8,
    landlordStartingMoney,
    landlordMoney,
    isConfigured: Boolean(parsed.isConfigured),
    buildings,
    coalitionConnections,
    round: validRound,
    phase: validPhase,
    tallies,
    updatedAt: Number(parsed.updatedAt) || Date.now(),
  };
}
function loadFromStorage(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw) as Partial<GameState>;
    if (typeof parsed === "object" && parsed !== null) {
      return sanitizeLoadedState(parsed);
    }
  } catch (e) {
    console.warn("Failed to load state from localStorage, resetting:", e);
  }
  return createDefaultState();
}

export function useGameStorage() {
  const state = ref<GameState>(loadFromStorage());
  const isEditPosition = ref(false);

  function toggleEditPosition() {
    isEditPosition.value = !isEditPosition.value;
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value));
    } catch (e) {
      console.error("Failed to save to localStorage:", e);
    }
  }

  function setupGame(
    buildingCount: number,
    peoplePerBuilding: number,
    landlordStartingMoney?: number,
  ) {
    const validBuildings = Math.max(1, Math.min(100, Math.floor(buildingCount)));
    const validPeople = Math.max(1, Math.min(200, Math.floor(peoplePerBuilding)));
    const initialMoney =
      typeof landlordStartingMoney === "number" &&
      !isNaN(landlordStartingMoney) &&
      landlordStartingMoney >= 0
        ? Math.floor(landlordStartingMoney)
        : calculateDefaultLandlordMoney(validBuildings, validPeople);

    const buildings = generateBuildings(validBuildings, validPeople);
    const initialOrganized = buildings.reduce((sum, b) => sum + getBuildingUnionCount(b), 0);
    const initialBldgsOrganized = buildings.filter(isBuildingOrganized).length;

    state.value = {
      buildingCount: validBuildings,
      peoplePerBuilding: validPeople,
      landlordStartingMoney: initialMoney,
      landlordMoney: initialMoney,
      isConfigured: true,
      buildings,
      round: 1,
      phase: 1,
      coalitionConnections: [],
      tallies: {
        1: {
          round: 1,
          landlordSpending: null,
          landlordRemaining: initialMoney,
          totalOrganized: initialOrganized,
          evictions: 0,
          totalEvictions: 0,
          buildingsOrganized: initialBldgsOrganized,
        },
      },
      updatedAt: Date.now(),
    };
    persist();
  }

  function spendLandlordMoney(amount: number = 50000) {
    const currentRound = state.value.round;
    const startFunds =
      state.value.landlordStartingMoney ??
      calculateDefaultLandlordMoney(state.value.buildingCount, state.value.peoplePerBuilding);
    const currentFunds = state.value.landlordMoney ?? startFunds;
    const newFunds = Math.max(0, currentFunds - amount);
    state.value.landlordMoney = newFunds;

    const existing = state.value.tallies[currentRound];
    const currentSpend = (existing?.landlordSpending ?? 0) + amount;

    if (existing) {
      existing.landlordSpending = currentSpend;
      existing.landlordRemaining = newFunds;
    } else {
      syncCurrentRoundTally();
      if (state.value.tallies[currentRound]) {
        state.value.tallies[currentRound].landlordSpending = currentSpend;
        state.value.tallies[currentRound].landlordRemaining = newFunds;
      }
    }

    state.value.updatedAt = Date.now();
    persist();
  }

  function undoLandlordSpend(amount: number = 50000) {
    const currentRound = state.value.round;
    const startFunds =
      state.value.landlordStartingMoney ??
      calculateDefaultLandlordMoney(state.value.buildingCount, state.value.peoplePerBuilding);
    const currentFunds = state.value.landlordMoney ?? startFunds;
    const newFunds = Math.min(startFunds, currentFunds + amount);
    state.value.landlordMoney = newFunds;

    const existing = state.value.tallies[currentRound];
    const currentSpend = Math.max(0, (existing?.landlordSpending ?? 0) - amount);

    if (existing) {
      existing.landlordSpending = currentSpend > 0 ? currentSpend : null;
      existing.landlordRemaining = newFunds;
    } else {
      syncCurrentRoundTally();
      if (state.value.tallies[currentRound]) {
        state.value.tallies[currentRound].landlordSpending = currentSpend > 0 ? currentSpend : null;
        state.value.tallies[currentRound].landlordRemaining = newFunds;
      }
    }

    state.value.updatedAt = Date.now();
    persist();
  }

  function resetGame() {
    const defaultMoney = calculateDefaultLandlordMoney(
      state.value.buildingCount,
      state.value.peoplePerBuilding,
    );
    state.value = {
      ...createDefaultState(),
      buildingCount: state.value.buildingCount,
      peoplePerBuilding: state.value.peoplePerBuilding,
      landlordStartingMoney: defaultMoney,
      landlordMoney: defaultMoney,
      isConfigured: false,
      buildings: [],
      coalitionConnections: [],
    };
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Failed to remove from localStorage:", e);
    }
  }
  function syncCurrentRoundTally() {
    const currentRound = state.value.round;
    const existing = state.value.tallies[currentRound];
    const bldgs = state.value.buildings;

    const roundEvictions = bldgs.reduce(
      (sum, b) =>
        sum +
        b.tenants.filter((t) => t.isEvicted && (t.evictedRound ?? currentRound) === currentRound)
          .length,
      0,
    );

    const totalEvictions = bldgs.reduce(
      (sum, b) =>
        sum + b.tenants.filter((t) => t.isEvicted && (t.evictedRound ?? 1) <= currentRound).length,
      0,
    );

    const currentFunds =
      state.value.landlordMoney ??
      state.value.landlordStartingMoney ??
      calculateDefaultLandlordMoney(state.value.buildingCount, state.value.peoplePerBuilding);
    state.value.tallies[currentRound] = {
      round: currentRound,
      landlordSpending: existing?.landlordSpending ?? null,
      landlordRemaining: existing?.landlordRemaining ?? currentFunds,
      totalOrganized: bldgs.reduce((sum, b) => sum + getBuildingUnionCount(b), 0),
      evictions: roundEvictions,
      totalEvictions,
      buildingsOrganized: bldgs.filter(isBuildingOrganized).length,
    };
  }

  function nextPhase() {
    if (state.value.phase === 3) {
      // Finalize current round tally before advancing
      syncCurrentRoundTally();

      state.value.phase = 1;
      state.value.round += 1;
      const newRound = state.value.round;
      if (!state.value.tallies[newRound]) {
        syncCurrentRoundTally();
      }
    } else {
      state.value.phase = (state.value.phase + 1) as GamePhase;
    }
    state.value.updatedAt = Date.now();
    persist();
  }

  function prevPhase() {
    if (state.value.round === 1 && state.value.phase === 1) return;
    if (state.value.phase === 1) {
      state.value.phase = 3;
      state.value.round -= 1;
    } else {
      state.value.phase = (state.value.phase - 1) as GamePhase;
    }
    state.value.updatedAt = Date.now();
    persist();
  }

  function toggleUnion(buildingId: string, tenantId: string, join?: boolean) {
    const building = state.value.buildings.find((b) => b.id === buildingId);
    if (!building) return;
    const tenant = building.tenants.find((t) => t.id === tenantId);
    if (!tenant) return;

    if (tenant.isInstigator) {
      tenant.inUnion = true;
    } else {
      tenant.inUnion = join !== undefined ? join : !tenant.inUnion;
    }
    syncCurrentRoundTally();
    state.value.updatedAt = Date.now();
    persist();
  }

  function toggleEviction(buildingId: string, tenantId: string, evicted?: boolean) {
    const building = state.value.buildings.find((b) => b.id === buildingId);
    if (!building) return;
    const tenant = building.tenants.find((t) => t.id === tenantId);
    if (!tenant) return;

    const newEvicted = evicted !== undefined ? evicted : !tenant.isEvicted;
    tenant.isEvicted = newEvicted;
    if (newEvicted) {
      tenant.evictedRound = state.value.round;
    } else {
      delete tenant.evictedRound;
    }
    syncCurrentRoundTally();
    state.value.updatedAt = Date.now();
    persist();
  }

  function updateBuildingPosition(buildingId: string, x: number, y: number) {
    const building = state.value.buildings.find((b) => b.id === buildingId);
    if (!building) return;
    building.x = x;
    building.y = y;
    state.value.updatedAt = Date.now();
    persist();
  }

  function updateBuildingPositions(updates: Array<{ id: string; x: number; y: number }>) {
    let changed = false;
    for (const u of updates) {
      const building = state.value.buildings.find((b) => b.id === u.id);
      if (building) {
        building.x = u.x;
        building.y = u.y;
        changed = true;
      }
    }
    if (changed) {
      state.value.updatedAt = Date.now();
      persist();
    }
  }

  function updateTally(targetRound: number, patch: Partial<RoundTally>) {
    const current = state.value.tallies[targetRound] ?? {
      round: targetRound,
      landlordSpending: null,
      totalOrganized: 0,
      evictions: 0,
      buildingsOrganized: 0,
    };
    state.value.tallies[targetRound] = { ...current, ...patch };
    state.value.updatedAt = Date.now();
    persist();
  }

  function addRoundRow() {
    const maxR = Math.max(state.value.round, ...Object.keys(state.value.tallies).map(Number));
    const nextR = maxR + 1;
    const bldgs = state.value.buildings;
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
    state.value.tallies[nextR] = {
      round: nextR,
      landlordSpending: null,
      totalOrganized: bldgs.reduce((sum, b) => sum + getBuildingUnionCount(b), 0),
      evictions: roundEvictions,
      totalEvictions,
      buildingsOrganized: bldgs.filter(isBuildingOrganized).length,
    };
    state.value.updatedAt = Date.now();
    persist();
  }
  function adjustBuildingTenants(buildingId: string, targetCount: number) {
    const building = state.value.buildings.find((b) => b.id === buildingId);
    if (!building) return;

    const clampedTarget = Math.max(1, Math.min(100, Math.floor(targetCount)));
    const currentCount = building.tenants.length;
    if (clampedTarget === currentCount) return;

    if (clampedTarget > currentCount) {
      // Add more tenants
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
      // Remove tenants, preserving instigators first, then union members
      const toRemove = currentCount - clampedTarget;
      let removed = 0;
      // Pass 1: remove unaffiliated tenants
      for (let i = building.tenants.length - 1; i >= 0 && removed < toRemove; i--) {
        const t = building.tenants[i];
        if (t && !t.isInstigator && !t.inUnion) {
          building.tenants.splice(i, 1);
          removed++;
        }
      }
      // Pass 2: if still needed, remove regular union members (never instigator)
      for (let i = building.tenants.length - 1; i >= 0 && removed < toRemove; i--) {
        const t = building.tenants[i];
        if (t && !t.isInstigator) {
          building.tenants.splice(i, 1);
          removed++;
        }
      }
    }

    syncCurrentRoundTally();
    state.value.updatedAt = Date.now();
    persist();
  }

  function reorderBuildings(newOrder: Building[]) {
    state.value.buildings = [...newOrder];
    state.value.updatedAt = Date.now();
    persist();
  }

  function shufflePositions() {
    const count = state.value.buildings.length;
    if (count === 0) return;
    const newPositions = generateScatteredPositions(count);
    state.value.buildings.forEach((b, idx) => {
      const pos = newPositions[idx];
      if (pos) {
        b.x = pos.x;
        b.y = pos.y;
      }
    });
    state.value.updatedAt = Date.now();
    persist();
  }

  function connectCoalition(sourceId: string, targetId: string): boolean {
    if (!sourceId || !targetId || sourceId === targetId) return false;
    const bldgs = state.value.buildings;
    const hasSource = bldgs.some((b) => b.id === sourceId);
    const hasTarget = bldgs.some((b) => b.id === targetId);
    if (!hasSource || !hasTarget) return false;

    if (!Array.isArray(state.value.coalitionConnections)) {
      state.value.coalitionConnections = [];
    }

    const existingIndex = state.value.coalitionConnections.findIndex(
      (c) =>
        (c.sourceId === sourceId && c.targetId === targetId) ||
        (c.sourceId === targetId && c.targetId === sourceId),
    );
    if (existingIndex !== -1) return false;

    state.value.coalitionConnections.push({
      id: `coalition-${sourceId}-${targetId}-${Date.now()}`,
      sourceId,
      targetId,
      createdAt: Date.now(),
    });
    state.value.updatedAt = Date.now();
    persist();
    return true;
  }

  function disconnectCoalition(connectionId: string) {
    if (!Array.isArray(state.value.coalitionConnections)) return;
    const prevLen = state.value.coalitionConnections.length;
    state.value.coalitionConnections = state.value.coalitionConnections.filter(
      (c) => c.id !== connectionId,
    );
    if (state.value.coalitionConnections.length !== prevLen) {
      state.value.updatedAt = Date.now();
      persist();
    }
  }

  function disconnectPair(buildingIdA: string, buildingIdB: string) {
    if (!Array.isArray(state.value.coalitionConnections)) return;
    const prevLen = state.value.coalitionConnections.length;
    state.value.coalitionConnections = state.value.coalitionConnections.filter(
      (c) =>
        !(
          (c.sourceId === buildingIdA && c.targetId === buildingIdB) ||
          (c.sourceId === buildingIdB && c.targetId === buildingIdA)
        ),
    );
    if (state.value.coalitionConnections.length !== prevLen) {
      state.value.updatedAt = Date.now();
      persist();
    }
  }

  function disconnectBuilding(buildingId: string) {
    if (!Array.isArray(state.value.coalitionConnections)) return;
    const prevLen = state.value.coalitionConnections.length;
    state.value.coalitionConnections = state.value.coalitionConnections.filter(
      (c) => c.sourceId !== buildingId && c.targetId !== buildingId,
    );
    if (state.value.coalitionConnections.length !== prevLen) {
      state.value.updatedAt = Date.now();
      persist();
    }
  }

  function undoLastCoalition(): boolean {
    if (
      !Array.isArray(state.value.coalitionConnections) ||
      state.value.coalitionConnections.length === 0
    ) {
      return false;
    }
    state.value.coalitionConnections.pop();
    state.value.updatedAt = Date.now();
    persist();
    return true;
  }

  const coalitionConnections = computed(() => state.value.coalitionConnections ?? []);
  const coalitions = computed<CoalitionGroup[]>(() =>
    computeCoalitionGroups(state.value.buildings, state.value.coalitionConnections ?? []),
  );
  const buildingColorMap = computed<Record<string, string>>(() =>
    getEffectiveBuildingColorMap(state.value.buildings, state.value.coalitionConnections ?? []),
  );
  const canUndoCoalition = computed(() => (state.value.coalitionConnections ?? []).length > 0);

  const isConfigured = computed(() => state.value.isConfigured);
  const buildings = computed(() => state.value.buildings);
  const totalBuildings = computed(() => state.value.buildings.length);
  const totalTenants = computed(() =>
    state.value.buildings.reduce((sum, b) => sum + b.tenants.length, 0),
  );
  const round = computed(() => state.value.round);
  const phase = computed(() => state.value.phase);
  const currentPhaseInfo = computed(
    () => PHASES.find((p) => p.id === state.value.phase) ?? PHASES[0],
  );
  const unionTenantsCount = computed(() =>
    state.value.buildings.reduce((sum, b) => sum + getBuildingUnionCount(b), 0),
  );
  const totalEvictionsCount = computed(() =>
    state.value.buildings.reduce((sum, b) => sum + b.tenants.filter((t) => t.isEvicted).length, 0),
  );
  const organizedBuildingsCount = computed(
    () => state.value.buildings.filter(isBuildingOrganized).length,
  );
  const tallies = computed(() => state.value.tallies);
  const landlordStartingMoney = computed(
    () =>
      state.value.landlordStartingMoney ??
      calculateDefaultLandlordMoney(state.value.buildingCount, state.value.peoplePerBuilding),
  );
  const landlordMoney = computed(() => state.value.landlordMoney ?? landlordStartingMoney.value);
  const canUndoLandlordSpend = computed(
    () => (state.value.landlordMoney ?? 0) < landlordStartingMoney.value,
  );

  return {
    state,
    isConfigured,
    buildings,
    totalBuildings,
    totalTenants,
    round,
    phase,
    currentPhaseInfo,
    unionTenantsCount,
    totalEvictionsCount,
    organizedBuildingsCount,
    tallies,
    landlordStartingMoney,
    landlordMoney,
    canUndoLandlordSpend,
    spendLandlordMoney,
    undoLandlordSpend,
    coalitionConnections,
    coalitions,
    buildingColorMap,
    canUndoCoalition,
    setupGame,
    resetGame,
    nextPhase,
    prevPhase,
    toggleUnion,
    isEditPosition,
    toggleEditPosition,
    toggleEviction,
    adjustBuildingTenants,
    reorderBuildings,
    updateBuildingPosition,
    updateBuildingPositions,
    updateTally,
    addRoundRow,
    shufflePositions,
    connectCoalition,
    disconnectCoalition,
    disconnectPair,
    disconnectBuilding,
    undoLastCoalition,
  };
}
