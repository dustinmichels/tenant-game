<script setup lang="ts">
import { ref } from "vue";
import { useGameStorage } from "./composables/useGameStorage";
import SetupForm from "./components/SetupForm.vue";
import FacilitatorControls from "./components/FacilitatorControls.vue";
import TallyTable from "./components/TallyTable.vue";
import BuildingCanvas from "./components/BuildingCanvas.vue";
const {
  state,
  isConfigured,
  buildings,
  round,
  phase,
  tallies,
  coalitionConnections,
  coalitions,
  buildingColorMap,
  canUndoCoalition,
  setupGame,
  nextPhase,
  prevPhase,
  toggleUnion,
  toggleEviction,
  adjustBuildingTenants,
  updateBuildingPosition,
  updateBuildingPositions,
  shufflePositions,
  connectCoalition,
  disconnectCoalition,
  disconnectBuilding,
  undoLastCoalition,
  landlordStartingMoney,
  landlordMoney,
  canUndoLandlordSpend,
  spendLandlordMoney,
  undoLandlordSpend,
} = useGameStorage();

const isSettingUpNewGame = ref(false);

function handleNewGameClick() {
  isSettingUpNewGame.value = true;
}

function handleCancelSetup() {
  isSettingUpNewGame.value = false;
}

function handleSubmitSetup(payload: {
  buildingCount: number;
  peoplePerBuilding: number;
  landlordStartingMoney: number;
}) {
  setupGame(payload.buildingCount, payload.peoplePerBuilding, payload.landlordStartingMoney);
  isSettingUpNewGame.value = false;
}
</script>

<template>
  <div class="app-layout">
    <!-- Facilitator top controls (visible when game is configured and not in setup screen) -->
    <FacilitatorControls
      v-if="isConfigured && !isSettingUpNewGame"
      :round="round"
      :phase="phase"
      :landlord-money="landlordMoney"
      :landlord-starting-money="landlordStartingMoney"
      :can-undo-spend="canUndoLandlordSpend"
      @next-phase="nextPhase"
      @prev-phase="prevPhase"
      @shuffle-positions="shufflePositions"
      @spend-landlord-money="spendLandlordMoney"
      @undo-landlord-spend="undoLandlordSpend"
      @new-game="handleNewGameClick"
    />
    <!-- Setup Screen: displayed if not configured, or if facilitator clicked New Game -->
    <SetupForm
      v-if="!isConfigured || isSettingUpNewGame"
      :initial-buildings="state.buildingCount"
      :initial-people="state.peoplePerBuilding"
      :is-cancelable="isConfigured"
      @submit="handleSubmitSetup"
      @cancel="handleCancelSetup"
    />

    <!-- Main Board: Left Tally Section, Right Building Canvas -->
    <div v-else class="board-layout">
      <aside class="board-tally-section" aria-label="Game Tally">
        <TallyTable
          :tallies="tallies"
          :current-round="round"
          :buildings="buildings"
          :landlord-money="landlordMoney"
          :landlord-starting-money="landlordStartingMoney"
          :can-undo-spend="canUndoLandlordSpend"
          :coalition-count="coalitions.length"
          :coalitions="coalitions"
          :building-color-map="buildingColorMap"
          @spend-landlord-money="spendLandlordMoney"
          @undo-landlord-spend="undoLandlordSpend"
        />
      </aside>

      <section class="board-canvas-section" aria-label="Building Canvas">
        <BuildingCanvas
          :buildings="buildings"
          :default-people="state.peoplePerBuilding"
          :coalition-connections="coalitionConnections"
          :coalitions="coalitions"
          :building-color-map="buildingColorMap"
          :can-undo-coalition="canUndoCoalition"
          :landlord-money="landlordMoney"
          @update-building-position="updateBuildingPosition"
          @update-building-positions="updateBuildingPositions"
          @adjust-tenants="adjustBuildingTenants"
          @toggle-union="toggleUnion"
          @toggle-eviction="toggleEviction"
          @connect-coalition="connectCoalition"
          @disconnect-coalition="disconnectCoalition"
          @disconnect-building="disconnectBuilding"
          @undo-coalition="undoLastCoalition"
        />
      </section>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-background);
  overflow: hidden;
}

.board-layout {
  display: flex;
  flex-direction: row;
  flex: 1;
  width: 100%;
  height: calc(100vh - 65px);
  overflow: hidden;
  position: relative;
}

.board-tally-section {
  flex: 0 0 28%;
  width: 28%;
  min-width: 340px;
  max-width: 480px;
  background-color: #faf6ee;
  border-right: 2px solid #ded4c3;
  overflow-y: auto;
  z-index: 20;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.04);
}

.board-canvas-section {
  flex: 1;
  width: 72%;
  height: 100%;
  position: relative;
  overflow: auto;
}
</style>
