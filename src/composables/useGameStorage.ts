import { ref, computed } from 'vue'
import type { GameState, Building, Tenant } from '../types/game'

const STORAGE_KEY = 'tenant_union_game_state_v1'
const VARIANT_COUNT = 5

function createDefaultState(): GameState {
  return {
    buildingCount: 3,
    peoplePerBuilding: 8,
    isConfigured: false,
    buildings: [],
    updatedAt: Date.now(),
  }
}

function generateBuildings(buildingCount: number, peoplePerBuilding: number): Building[] {
  const result: Building[] = []
  for (let i = 1; i <= buildingCount; i++) {
    const buildingId = `b-${i}`
    const tenants: Tenant[] = []
    for (let j = 1; j <= peoplePerBuilding; j++) {
      tenants.push({
        id: `t-${i}-${j}`,
        buildingId,
        variant: (i + j) % VARIANT_COUNT,
      })
    }
    result.push({
      id: buildingId,
      index: i,
      label: `Building ${i}`,
      tenants,
    })
  }
  return result
}

function loadFromStorage(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultState()
    const parsed = JSON.parse(raw) as Partial<GameState>
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.isConfigured === 'boolean' &&
      Array.isArray(parsed.buildings)
    ) {
      return {
        buildingCount: Number(parsed.buildingCount) || 3,
        peoplePerBuilding: Number(parsed.peoplePerBuilding) || 8,
        isConfigured: Boolean(parsed.isConfigured),
        buildings: parsed.buildings,
        updatedAt: Number(parsed.updatedAt) || Date.now(),
      }
    }
  } catch (e) {
    console.warn('Failed to load state from localStorage, resetting:', e)
  }
  return createDefaultState()
}

export function useGameStorage() {
  const state = ref<GameState>(loadFromStorage())

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value))
    } catch (e) {
      console.error('Failed to save to localStorage:', e)
    }
  }

  function setupGame(buildingCount: number, peoplePerBuilding: number) {
    const validBuildings = Math.max(1, Math.min(100, Math.floor(buildingCount)))
    const validPeople = Math.max(1, Math.min(200, Math.floor(peoplePerBuilding)))

    const buildings = generateBuildings(validBuildings, validPeople)
    state.value = {
      buildingCount: validBuildings,
      peoplePerBuilding: validPeople,
      isConfigured: true,
      buildings,
      updatedAt: Date.now(),
    }
    persist()
  }

  function resetGame() {
    state.value = {
      ...createDefaultState(),
      buildingCount: state.value.buildingCount,
      peoplePerBuilding: state.value.peoplePerBuilding,
      isConfigured: false,
      buildings: [],
    }
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (e) {
      console.error('Failed to remove from localStorage:', e)
    }
  }

  const isConfigured = computed(() => state.value.isConfigured)
  const buildings = computed(() => state.value.buildings)
  const totalBuildings = computed(() => state.value.buildings.length)
  const totalTenants = computed(() =>
    state.value.buildings.reduce((sum, b) => sum + b.tenants.length, 0),
  )

  return {
    state,
    isConfigured,
    buildings,
    totalBuildings,
    totalTenants,
    setupGame,
    resetGame,
  }
}
