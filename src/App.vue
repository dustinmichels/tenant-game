<script setup lang="ts">
import { ref } from 'vue'
import { useGameStorage } from './composables/useGameStorage'
import SetupForm from './components/SetupForm.vue'
import FacilitatorControls from './components/FacilitatorControls.vue'
import BuildingGrid from './components/BuildingGrid.vue'

const {
  state,
  isConfigured,
  buildings,
  totalBuildings,
  totalTenants,
  setupGame,
  resetGame,
} = useGameStorage()

const isEditing = ref(false)

function handleSubmitSetup(payload: { buildingCount: number; peoplePerBuilding: number }) {
  setupGame(payload.buildingCount, payload.peoplePerBuilding)
  isEditing.value = false
}

function handleReset() {
  if (window.confirm('Start a new game and return to setup?')) {
    resetGame()
    isEditing.value = false
  }
}

function handleEdit() {
  isEditing.value = true
}
</script>

<template>
  <div class="app-layout">
    <!-- Facilitator top controls (visible when game is configured) -->
    <FacilitatorControls
      v-if="isConfigured && !isEditing"
      :building-count="totalBuildings"
      :people-per-building="state.peoplePerBuilding"
      :total-tenants="totalTenants"
      @edit="handleEdit"
      @reset="handleReset"
    />

    <!-- Setup Screen: displayed if not configured, or if facilitator clicked Edit -->
    <SetupForm
      v-if="!isConfigured || isEditing"
      :initial-buildings="state.buildingCount"
      :initial-people="state.peoplePerBuilding"
      @submit="handleSubmitSetup"
    />

    <!-- Main visual aid: Buildings spaced out nicely with grey cartoon tenant silhouettes -->
    <BuildingGrid
      v-else
      :buildings="buildings"
    />
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-background);
}
</style>
