<script setup lang="ts">
import { shallowRef } from "vue";
import { storeToRefs } from "pinia";
import { useGameStore } from "./stores/game";
import SetupForm from "./components/SetupForm.vue";
import FacilitatorControls from "./components/FacilitatorControls.vue";
import TallyTable from "./components/TallyTable.vue";
import BuildingCanvas from "./components/BuildingCanvas.vue";

const gameStore = useGameStore();
const {
  isConfigured,
  buildings,
  buildingCount,
  peoplePerBuilding,
  round,
  phase,
  tallies,
  coalitionConnections,
  coalitions,
  buildingColorMap,
  canUndoCoalition,
  personWidth,
  personHeight,
  personScale,
  landlordStartingMoney,
  landlordMoney,
  events,
} = storeToRefs(gameStore);

const isSettingUpNewGame = shallowRef(false);

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
  gameStore.setupGame(
    payload.buildingCount,
    payload.peoplePerBuilding,
    payload.landlordStartingMoney,
  );
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
      @next-phase="gameStore.nextPhase"
      @prev-phase="gameStore.prevPhase"
      @select-phase="gameStore.setPhase"
      @spend-landlord-money="gameStore.spendLandlordMoney"
      @earn-landlord-money="gameStore.earnLandlordMoney"
      @new-game="handleNewGameClick"
    />

    <!-- Setup Screen: displayed if not configured, or if facilitator clicked New Game -->
    <SetupForm
      v-if="!isConfigured || isSettingUpNewGame"
      :initial-buildings="buildingCount"
      :initial-people="peoplePerBuilding"
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
          :coalition-count="coalitions.length"
          :coalitions="coalitions"
          :events="events"
          @add-event="gameStore.addEvent"
          @remove-event="gameStore.removeEvent"
          @spend-landlord-money="gameStore.spendLandlordMoney"
        />
      </aside>

      <section class="board-canvas-section" aria-label="Building Canvas">
        <BuildingCanvas
          :buildings="buildings"
          :default-people="peoplePerBuilding"
          :coalition-connections="coalitionConnections"
          :coalitions="coalitions"
          :building-color-map="buildingColorMap"
          :can-undo-coalition="canUndoCoalition"
          :landlord-money="landlordMoney"
          :person-width="personWidth"
          :person-height="personHeight"
          :person-scale="personScale"
          @update-building-position="gameStore.updateBuildingPosition"
          @update-building-positions="gameStore.updateBuildingPositions"
          @adjust-tenants="gameStore.adjustBuildingTenants"
          @toggle-union="gameStore.toggleUnion"
          @toggle-eviction="gameStore.toggleEviction"
          @connect-coalition="gameStore.connectCoalition"
          @disconnect-coalition="gameStore.disconnectCoalition"
          @disconnect-building="gameStore.disconnectBuilding"
          @undo-coalition="gameStore.undoLastCoalition"
          @shuffle-positions="gameStore.shufflePositions"
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
