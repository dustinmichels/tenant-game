<script setup lang="ts">
import { shallowRef } from "vue";
import { storeToRefs } from "pinia";
import { useGameStore } from "./stores/game";
import SetupForm from "./components/SetupForm.vue";
import FacilitatorControls from "./components/FacilitatorControls.vue";
import TallyTable from "./components/TallyTable.vue";
import BuildingCanvas from "./components/BuildingCanvas.vue";
import PreGameSidebar from "./components/PreGameSidebar.vue";

const gameStore = useGameStore();
const {
  isConfigured,
  hasBegun,
  buildings,
  buildingCount,
  peoplePerBuilding,
  round,
  phase,
  tallies,
  coalitionConnections,
  coalitions,
  buildingColorMap,
  personWidth,
  landlordStartingMoney,
  landlordMoney,
  events,
  landlordPosition,
  showLandlord,
  isEditBuildings,
  isEditPosition,
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
      :has-begun="hasBegun"
      @next-phase="gameStore.nextPhase"
      @prev-phase="gameStore.prevPhase"
      @select-phase="gameStore.setPhase"
      @new-game="handleNewGameClick"
      @add-event="gameStore.addEvent"
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
        <PreGameSidebar v-if="!hasBegun" @begin="gameStore.beginGame" />
        <TallyTable
          v-else
          :tallies="tallies"
          :current-round="round"
          :buildings="buildings"
          :landlord-money="landlordMoney"
          :landlord-starting-money="landlordStartingMoney"
          :coalitions="coalitions"
          :building-color-map="buildingColorMap"
          :events="events"
          @add-event="gameStore.addEvent"
          @undo-event="gameStore.undoEvent"
          @remove-event="gameStore.undoEvent"
          @spend-landlord-money="gameStore.spendLandlordMoney"
          @earn-landlord-money="gameStore.earnLandlordMoney"
        />
      </aside>

      <section class="board-canvas-section" aria-label="Building Canvas">
        <BuildingCanvas
          v-model:can-edit="isEditBuildings"
          v-model:edit-buildings="isEditBuildings"
          v-model:can-move="isEditPosition"
          v-model:show-landlord="showLandlord"
          :buildings="buildings"
          :default-people="peoplePerBuilding"
          :coalition-connections="coalitionConnections"
          :coalitions="coalitions"
          :building-color-map="buildingColorMap"
          :landlord-money="landlordMoney"
          :landlord-position="landlordPosition"
          :person-width="personWidth"
          :has-begun="hasBegun"
          @update-building-position="gameStore.updateBuildingPosition"
          @update-building-positions="gameStore.updateBuildingPositions"
          @update-landlord-position="gameStore.updateLandlordPosition"
          @adjust-tenants="gameStore.adjustBuildingTenants"
          @toggle-union="
            (buildingId, tenantId, join) =>
              hasBegun && gameStore.toggleUnion(buildingId, tenantId, join)
          "
          @toggle-eviction="
            (buildingId, tenantId, evicted) =>
              hasBegun && gameStore.toggleEviction(buildingId, tenantId, evicted)
          "
          @connect-coalition="
            (sourceId, targetId) => hasBegun && gameStore.connectCoalition(sourceId, targetId)
          "
          @disconnect-coalition="(connId) => hasBegun && gameStore.disconnectCoalition(connId)"
          @disconnect-building="(bId) => hasBegun && gameStore.disconnectBuilding(bId)"
          @undo-coalition="() => hasBegun && gameStore.undoLastCoalition()"
        />
      </section>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  height: 100vh;
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
  min-height: 0;
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
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
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
