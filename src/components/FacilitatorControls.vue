<script setup lang="ts">
import { computed, onMounted, onUnmounted, shallowRef } from "vue";
import type { GamePhase } from "../types/game";
import RoughButton from "./RoughButton.vue";
import RoundTracker from "./RoundTracker.vue";
import LandlordFundsModal from "./LandlordFundsModal.vue";
import { roughGen } from "../utils/rough";
import type { PathInfo } from "../utils/rough";

defineProps<{
  round: number;
  phase: GamePhase;
  landlordMoney?: number;
}>();

const emit = defineEmits<{
  (e: "new-game"): void;
  (e: "next-phase"): void;
  (e: "prev-phase"): void;
  (e: "spend-landlord-money", amount?: number): void;
  (e: "earn-landlord-money", amount?: number): void;
}>();

const isLandlordModalOpen = shallowRef(false);

function handleSpendLandlordMoney(amount: number) {
  emit("spend-landlord-money", amount);
}

function handleEarnLandlordMoney(amount: number) {
  emit("earn-landlord-money", amount);
}

const isFullscreen = shallowRef(false);

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

function handleFullscreenChange() {
  isFullscreen.value = Boolean(document.fullscreenElement);
}

onMounted(() => {
  document.addEventListener("fullscreenchange", handleFullscreenChange);
});

onUnmounted(() => {
  document.removeEventListener("fullscreenchange", handleFullscreenChange);
});

// Sketched bottom divider line
const dividerPaths = computed<PathInfo[]>(() => {
  const line = roughGen.line(0, 2, 1600, 2, {
    roughness: 1.1,
    stroke: "#d1c7b7",
    strokeWidth: 1.5,
    seed: 999,
  });
  return roughGen.toPaths(line);
});
</script>

<template>
  <header class="facilitator-bar">
    <div class="facilitator-bar-inner">
      <!-- Brand section -->
      <div class="brand-section">
        <div class="union-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path
              d="M17,11V3H7v4H3v14h8v-4h2v4h8V11H17z M7,19H5v-2h2V19z M7,15H5v-2h2V15z M7,11H5V9h2V11z M11,15H9v-2h2V15z M11,11H9V9h2 V11z M11,7H9V5h2V7z M15,15h-2v-2h2V15z M15,11h-2V9h2V11z M15,7h-2V5h2V7z M19,19h-2v-2h2V19z M19,15h-2v-2h2V15z"
            />
          </svg>
        </div>
        <span class="game-name">Tenant Union</span>
      </div>

      <!-- Center: Round & Phase Tracker with Font Arrows -->
      <div class="round-tracker-center">
        <RoundTracker
          :round="round"
          :phase="phase"
          @next="emit('next-phase')"
          @prev="emit('prev-phase')"
        />
      </div>
      <!-- Right Controls: Fullscreen and New Game -->
      <!-- Right Controls: Landlord spend/earns, Fullscreen, and New Game -->
      <div class="right-controls">
        <RoughButton
          variant="warning"
          :seed="907"
          title="Manage Landlord Funds (Spend / Earn)"
          @click="isLandlordModalOpen = true"
        >
          <span class="landlord-btn-content">
            <span class="landlord-btn-icon" aria-hidden="true">💸</span>
            <span class="landlord-btn-text">Landlord spend/earns</span>
          </span>
        </RoughButton>

        <div class="actions-section">
          <RoughButton
            variant="secondary"
            :seed="910"
            title="Toggle Fullscreen"
            @click="toggleFullscreen"
          >
            <span>{{ isFullscreen ? "⛶" : "⛶ Full" }}</span>
          </RoughButton>

          <RoughButton
            variant="danger"
            :seed="912"
            title="Start a new game"
            @click="emit('new-game')"
          >
            <span>New Game</span>
          </RoughButton>
        </div>
      </div>
    </div>

    <!-- Sketched bottom border -->
    <div class="facilitator-divider" aria-hidden="true">
      <svg viewBox="0 0 1600 4" preserveAspectRatio="none" class="divider-svg">
        <path
          v-for="(p, idx) in dividerPaths"
          :key="idx"
          :d="p.d"
          :stroke="p.stroke"
          :stroke-width="p.strokeWidth"
          :fill="p.fill"
        />
      </svg>
    </div>

    <!-- Landlord Spend/Earn Modal -->
    <LandlordFundsModal
      :show="isLandlordModalOpen"
      :landlord-money="landlordMoney"
      @close="isLandlordModalOpen = false"
      @spend="handleSpendLandlordMoney"
      @earn="handleEarnLandlordMoney"
    />
  </header>
</template>

<style scoped>
.facilitator-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: #fbf8f2;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}

.facilitator-bar-inner {
  max-width: 1600px;
  margin: 0 auto;
  padding: 8px 24px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 16px;
}

.brand-section {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-self: start;
}

.union-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #78350f;
  background: #fef3c7;
  padding: 4px;
  border-radius: 6px;
  border: 1px solid #fde68a;
}

.game-name {
  font-weight: 800;
  font-size: 1.05rem;
  letter-spacing: -0.01em;
  color: #292524;
}

.round-tracker-center {
  display: flex;
  align-items: center;
  justify-content: center;
  justify-self: center;
}

.right-controls {
  display: flex;
  align-items: center;
  gap: 14px;
  justify-self: end;
}

.actions-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.facilitator-divider {
  width: 100%;
  height: 4px;
  overflow: hidden;
  line-height: 0;
}

.divider-svg {
  width: 100%;
  height: 4px;
  display: block;
}

@media (max-width: 900px) {
  .facilitator-bar-inner {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .round-tracker-center {
    order: 2;
    justify-content: center;
  }

  .right-controls {
    order: 3;
    justify-content: center;
  }
}

.landlord-btn-content {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  font-size: 0.88rem;
}

.landlord-btn-icon {
  font-size: 0.95rem;
  line-height: 1;
}

.landlord-btn-text {
  font-weight: 700;
  font-size: 0.86rem;
}
</style>
