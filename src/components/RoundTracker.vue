<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import type { GamePhase } from "../types/game";
import { PHASES } from "../types/game";
import RoughBox from "./RoughBox.vue";

const props = defineProps<{
  round: number;
  phase: GamePhase;
}>();

const emit = defineEmits<{
  (e: "next"): void;
  (e: "prev"): void;
  (e: "select-phase", phase: GamePhase): void;
}>();

const PHASE_CONFIGS: Record<GamePhase, { name: string; gradient: string; accentColor: string }> = {
  1: {
    name: "Landlord",
    gradient: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)",
    accentColor: "#c2410c",
  },
  2: {
    name: "Tenant",
    gradient: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    accentColor: "#1d4ed8",
  },
  3: {
    name: "The Market",
    gradient: "linear-gradient(135deg, #059669 0%, #047857 100%)",
    accentColor: "#047857",
  },
};

const currentConfig = computed(() => PHASE_CONFIGS[props.phase] || PHASE_CONFIGS[1]);

function handlePhaseClick(pId: GamePhase) {
  if (pId !== props.phase) {
    emit("select-phase", pId);
  }
}

function handleKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null;
  const isInput =
    target &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable);

  if (isInput) return;

  if (e.key === "ArrowRight" || e.key === "ArrowDown") {
    e.preventDefault();
    emit("next");
  } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
    if (!(props.round === 1 && props.phase === 1)) {
      e.preventDefault();
      emit("prev");
    }
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <div class="round-tracker-wrapper" role="region" aria-label="Game Round and Phase Controls">
    <RoughBox
      :stroke="'#3f382f'"
      :fill="'#fcfaf6'"
      fill-style="solid"
      :roughness="0.8"
      :stroke-width="1.2"
      :seed="404"
      class="tracker-box"
    >
      <div class="tracker-content">
        <!-- Font Arrow Backward -->
        <button
          type="button"
          class="font-arrow-btn back"
          :disabled="round === 1 && phase === 1"
          title="Previous phase (or Left Arrow key)"
          aria-label="Previous phase"
          @click="emit('prev')"
        >
          <span class="arrow-char">←</span>
        </button>

        <!-- Round Badge -->
        <div class="round-indicator">
          <span class="round-label">ROUND</span>
          <span class="round-number">{{ round }}</span>
        </div>

        <!-- 3 Phase Steps with Smooth Sliding Indicator Pill -->
        <div class="phases-timeline" role="tablist" aria-label="Game Phases">
          <!-- Smooth Hardware-Accelerated Sliding Pill -->
          <div
            class="sliding-pill"
            aria-hidden="true"
            :style="{
              transform: `translateX(${(phase - 1) * 100}%)`,
              background: currentConfig.gradient,
            }"
          />

          <!-- Interactive Phase Items -->
          <button
            v-for="p in PHASES"
            :key="p.id"
            type="button"
            class="phase-item"
            :class="{
              'is-active': p.id === phase,
              'is-completed': p.id < phase,
              [`phase-${p.id}`]: true,
            }"
            :title="p.description"
            role="tab"
            :aria-selected="p.id === phase"
            @click="handlePhaseClick(p.id as GamePhase)"
          >
            <span class="phase-step-num">{{ p.id }}</span>
            <span class="phase-name">{{ p.name }}</span>
          </button>
        </div>

        <!-- Font Arrow Forward -->
        <button
          type="button"
          class="font-arrow-btn forward"
          title="Next phase (or Right Arrow key)"
          aria-label="Next phase"
          @click="emit('next')"
        >
          <span class="arrow-char">→</span>
        </button>
      </div>
    </RoughBox>
  </div>
</template>
<style scoped>
.round-tracker-wrapper {
  container-type: inline-size;
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  user-select: none;
}

.tracker-box {
  width: 100%;
  display: flex;
  min-width: 0;
}

:deep(.rough-box-container) {
  width: 100%;
  min-width: 0;
}

.tracker-content {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  width: 100%;
  box-sizing: border-box;
  min-width: 0;
}

/* Font Arrow Buttons */
.font-arrow-btn {
  background: #f5eedf;
  border: 1.5px solid #4a3d2c;
  color: #29241e;
  border-radius: 6px;
  width: 38px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background 0.15s ease,
    transform 0.1s ease,
    box-shadow 0.15s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.font-arrow-btn:hover:not(:disabled) {
  background: #e2d7c3;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
}

.font-arrow-btn:active:not(:disabled) {
  transform: scale(0.94);
  background: #d5c8b2;
}

.font-arrow-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  border-color: #a8a29e;
  background: #f5f5f4;
  color: #a8a29e;
  box-shadow: none;
  transform: none;
}

.arrow-char {
  font-size: 20px;
  font-weight: 800;
  line-height: 1;
}

/* Round Badge */
.round-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2px 12px;
  background: linear-gradient(145deg, #1c1917, #292524);
  border: 1.5px solid #f59e0b;
  border-radius: 6px;
  min-width: 64px;
  flex-shrink: 0;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.18);
}

.round-label {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.8px;
  line-height: 1;
  color: #fbbf24;
}

.round-number {
  font-size: 18px;
  font-weight: 900;
  line-height: 1.1;
  color: #fef08a;
}

/* Phases Timeline Track */
.phases-timeline {
  flex: 1;
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 3px;
  background: #e8e1d4;
  border: 1.5px solid #c4b8a3;
  border-radius: 8px;
  min-width: 0;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

/* Smooth Sliding Pill Indicator */
.sliding-pill {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;
  width: calc((100% - 6px) / 3);
  border-radius: 6px;
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
  transition:
    transform 0.32s cubic-bezier(0.25, 1, 0.5, 1),
    background 0.3s ease;
  pointer-events: none;
  z-index: 1;
}

/* Phase Tabs / Items */
.phase-item {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 6px 10px;
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: 6px;
  font-size: 13.5px;
  font-weight: 700;
  color: #645e57;
  transition: color 0.25s ease;
  min-width: 0;
  white-space: nowrap;
  font-family: inherit;
  outline: none;
}

.phase-item:hover:not(.is-active) {
  color: #292524;
}

.phase-item:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: -2px;
}

.phase-step-num {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  transition:
    background-color 0.25s ease,
    color 0.25s ease,
    box-shadow 0.25s ease;
  background: #d6cfc4;
  color: #44403c;
  flex-shrink: 0;
}

/* Thematic badge colors when inactive */
.phase-item.phase-1 .phase-step-num {
  background: #fed7aa;
  color: #9a3412;
}

.phase-item.phase-2 .phase-step-num {
  background: #bfdbfe;
  color: #1e40af;
}

.phase-item.phase-3 .phase-step-num {
  background: #a7f3d0;
  color: #065f46;
}

/* Active phase state */
.phase-item.is-active {
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
}

.phase-item.is-active .phase-step-num {
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.phase-item.phase-1.is-active .phase-step-num {
  color: #c2410c;
}

.phase-item.phase-2.is-active .phase-step-num {
  color: #1d4ed8;
}

.phase-item.phase-3.is-active .phase-step-num {
  color: #047857;
}

/* Container query responsiveness for narrow sizes */
@container (max-width: 440px) {
  .phase-item:not(.is-active) .phase-name {
    display: none;
  }

  .phase-item {
    gap: 4px;
    padding: 6px 6px;
  }
}

@container (max-width: 320px) {
  .phase-item .phase-name {
    display: none;
  }
}
</style>
