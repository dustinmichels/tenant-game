<script setup lang="ts">
import { ref, shallowRef } from "vue";
import { storeToRefs } from "pinia";
import { useEventListener } from "@vueuse/core";
import { Monitor } from "lucide-vue-next";
import { useGameStore } from "./stores/game";
import SetupForm from "./components/SetupForm.vue";
import FacilitatorControls from "./components/FacilitatorControls.vue";
import TallyTable from "./components/TallyTable.vue";
import BuildingCanvas from "./components/BuildingCanvas.vue";
import PreGameSidebar from "./components/PreGameSidebar.vue";

const gameStore = useGameStore();
const {
  currentScreen,
  isNewGameScreen,
  isNeighborhoodSetup,
  isGameplay,
  canEdit,
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
  controlsCollapsed,
} = storeToRefs(gameStore);

function checkIsMobileOrSmall(): boolean {
  if (typeof window === "undefined") return false;

  const isSmall = window.innerWidth <= 1024 || window.innerHeight <= 550;
  const ua = navigator.userAgent || "";
  const isMobileUA =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const isCoarseTouch =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: none) and (pointer: coarse)").matches &&
    window.innerWidth <= 1280;

  return isSmall || isMobileUA || isCoarseTouch;
}

const isMobile = ref(typeof window !== "undefined" ? checkIsMobileOrSmall() : false);

useEventListener(window, "resize", () => {
  isMobile.value = checkIsMobileOrSmall();
});

useEventListener(window, "orientationchange", () => {
  isMobile.value = checkIsMobileOrSmall();
});

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
}
</script>

<template>
  <div class="mobile-warning" :class="{ 'is-mobile': isMobile }" role="alert" aria-live="polite">
    <div class="mobile-warning-card">
      <div class="mobile-warning-icon" aria-hidden="true">
        <Monitor :size="48" stroke-width="1.75" />
      </div>
      <p class="mobile-warning-message">Please open on a laptop or desktop computer! 🙂</p>
    </div>
  </div>

  <div class="app-layout" :class="{ 'is-mobile-hidden': isMobile }">
    <!-- Facilitator top controls (visible during neighborhood setup and gameplay) -->
    <FacilitatorControls
      v-if="!isNewGameScreen"
      :round="round"
      :phase="phase"
      :screen="currentScreen"
      :is-neighborhood-setup="isNeighborhoodSetup"
      :has-begun="isGameplay"
      @next-phase="gameStore.nextPhase"
      @prev-phase="gameStore.prevPhase"
      @select-phase="gameStore.setPhase"
      @new-game="gameStore.openNewGame"
      @add-event="gameStore.addEvent"
    />

    <!-- New Game Screen -->
    <SetupForm
      v-if="isNewGameScreen"
      :initial-buildings="buildingCount"
      :initial-people="peoplePerBuilding"
      :is-cancelable="isConfigured"
      @submit="handleSubmitSetup"
      @cancel="gameStore.cancelNewGame"
    />

    <!-- Main Board: Neighborhood Setup Screen & Gameplay Screen -->
    <div v-else class="board-layout">
      <!-- Left pane: PreGameSidebar during neighborhood setup, TallyTable during gameplay -->
      <aside class="board-tally-section" aria-label="Game Tally">
        <PreGameSidebar v-if="isNeighborhoodSetup" @begin="gameStore.beginGame" />
        <TallyTable
          v-else-if="isGameplay"
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
          v-model:can-edit="canEdit"
          v-model:show-landlord="showLandlord"
          v-model:controls-collapsed="controlsCollapsed"
          :buildings="buildings"
          :default-people="peoplePerBuilding"
          :coalition-connections="coalitionConnections"
          :coalitions="coalitions"
          :building-color-map="buildingColorMap"
          :landlord-money="landlordMoney"
          :landlord-position="landlordPosition"
          :person-width="personWidth"
          :screen="currentScreen"
          :is-neighborhood-setup="isNeighborhoodSetup"
          :has-begun="isGameplay"
          @update-building-position="gameStore.updateBuildingPosition"
          @update-building-positions="gameStore.updateBuildingPositions"
          @update-landlord-position="gameStore.updateLandlordPosition"
          @adjust-tenants="gameStore.adjustBuildingTenants"
          @toggle-union="
            (buildingId, tenantId, join) =>
              isGameplay && gameStore.toggleUnion(buildingId, tenantId, join)
          "
          @toggle-eviction="
            (buildingId, tenantId, evicted) =>
              isGameplay && gameStore.toggleEviction(buildingId, tenantId, evicted)
          "
          @connect-coalition="
            (sourceId, targetId) => isGameplay && gameStore.connectCoalition(sourceId, targetId)
          "
          @disconnect-coalition="(connId) => isGameplay && gameStore.disconnectCoalition(connId)"
          @disconnect-building="(bId) => isGameplay && gameStore.disconnectBuilding(bId)"
          @undo-coalition="() => isGameplay && gameStore.undoLastCoalition()"
          @add-building="() => gameStore.addBuilding()"
          @delete-building="(buildingId) => gameStore.deleteBuilding(buildingId)"
        />
      </section>
    </div>
  </div>
</template>

<style scoped>
.mobile-warning {
  display: none;
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 999999;
  background-color: #faf6ee;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
}

.mobile-warning-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
  max-width: 420px;
  width: 100%;
  padding: 36px 28px;
  background-color: #ffffff;
  border: 2px solid #ded4c3;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.mobile-warning-icon {
  color: #786b59;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-warning-message {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.5;
  color: #292524;
  font-family: "Outfit", "Plus Jakarta Sans", system-ui, sans-serif;
}

@media (max-width: 1024px),
  (max-height: 550px),
  ((hover: none) and (pointer: coarse) and (max-width: 1280px)) {
  .mobile-warning {
    display: flex !important;
  }

  .app-layout {
    display: none !important;
  }
}

.mobile-warning.is-mobile {
  display: flex !important;
}

.app-layout.is-mobile-hidden {
  display: none !important;
}
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
  overflow: hidden;
}
</style>
