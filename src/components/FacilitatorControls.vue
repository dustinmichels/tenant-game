<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { Dices, Maximize, Minimize } from "lucide-vue-next";
import { useFullscreen } from "@vueuse/core";
import type { GamePhase } from "../types/game";
import RoughButton from "./RoughButton.vue";
import RoundTracker from "./RoundTracker.vue";
import DiceRollModal from "./DiceRollModal.vue";
import { formatDiceRollEventText } from "../stores/game";
import { roughGen } from "../utils/rough";
import type { PathInfo } from "../utils/rough";

const props = withDefaults(
  defineProps<{
    round: number;
    phase: GamePhase;
    hasBegun?: boolean;
  }>(),
  {
    hasBegun: true,
  },
);

const phaseClass = computed(() => {
  if (!props.hasBegun) {
    return "phase-pregame";
  }
  switch (props.phase) {
    case 1:
      return "phase-1 phase-landlord";
    case 2:
      return "phase-2 phase-tenant";
    case 3:
      return "phase-3 phase-market";
    default:
      return "";
  }
});

const emit = defineEmits<{
  (e: "new-game"): void;
  (e: "next-phase"): void;
  (e: "prev-phase"): void;
  (e: "select-phase", phase: GamePhase): void;
  (e: "add-event", text: string): void;
  (e: "dice-roll", total: number): void;
}>();

const isDiceModalOpen = shallowRef(false);

function handleDiceDone(total: number) {
  emit("dice-roll", total);
  emit("add-event", formatDiceRollEventText(total));
  isDiceModalOpen.value = false;
}

const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();

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
  <header class="facilitator-bar" :class="phaseClass">
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
        <span class="game-name">Game of Tenants</span>
      </div>

      <!-- Center: Round & Phase Tracker with Font Arrows -->
      <div class="round-tracker-center">
        <RoundTracker
          :round="round"
          :phase="phase"
          :disabled="!hasBegun"
          @next="emit('next-phase')"
          @prev="emit('prev-phase')"
          @select-phase="(p) => emit('select-phase', p)"
        />
      </div>
      <!-- Right Controls: Dice roll, Fullscreen, and New Game -->
      <div class="right-controls">
        <RoughButton
          variant="secondary"
          :seed="909"
          :disabled="!hasBegun"
          :title="!hasBegun ? 'Disabled until game begins' : 'Record dice roll'"
          @click="isDiceModalOpen = true"
        >
          <span class="dice-btn-content">
            <Dices :size="14" :stroke-width="1.5" class="dice-btn-icon" aria-hidden="true" />
            <span class="dice-btn-text">Dice roll</span>
          </span>
        </RoughButton>

        <div class="actions-section">
          <RoughButton
            variant="secondary"
            :seed="910"
            title="Toggle Fullscreen"
            @click="toggleFullscreen"
          >
            <span style="display: inline-flex; align-items: center; gap: 4px">
              <Minimize v-if="isFullscreen" :size="13" :stroke-width="1.5" />
              <Maximize v-else :size="13" :stroke-width="1.5" />
              {{ isFullscreen ? "Exit Full" : "Full" }}
            </span>
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

    <!-- Dice Roll Modal -->
    <DiceRollModal
      :show="isDiceModalOpen"
      @close="isDiceModalOpen = false"
      @done="handleDiceDone"
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
  transition: background-color 0.3s ease;
}

.facilitator-bar.phase-pregame {
  background-color: #e4e4e7;
}

.facilitator-bar.phase-1,
.facilitator-bar.phase-landlord {
  background-color: #fee2e2;
}

.facilitator-bar.phase-2,
.facilitator-bar.phase-tenant {
  background-color: #dbeafe;
}

.facilitator-bar.phase-3,
.facilitator-bar.phase-market {
  background-color: #dcfce7;
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
  flex-shrink: 0;
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
  flex-shrink: 0;
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

@media (max-width: 1060px) {
  .facilitator-bar-inner {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .brand-section {
    justify-content: center;
  }

  .round-tracker-center {
    order: 2;
    justify-content: center;
    max-width: 100%;
  }

  .right-controls {
    order: 3;
    justify-content: center;
    flex-wrap: wrap;
  }
}

.dice-btn-content {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  font-size: 0.88rem;
}

.dice-btn-icon {
  font-size: 0.95rem;
  line-height: 1;
}

.dice-btn-text {
  font-weight: 700;
  font-size: 0.86rem;
}
</style>
