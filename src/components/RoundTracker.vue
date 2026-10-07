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

        <div class="tracker-main">
          <span class="round-title">Round {{ round }}</span>
          <span class="divider" aria-hidden="true">•</span>
          <span class="phase-title" :style="{ color: currentConfig.accentColor }">
            {{ currentConfig.name }}
          </span>
          <div class="phase-dots" role="tablist" aria-label="Select phase">
            <button
              v-for="p in PHASES"
              :key="p.id"
              type="button"
              class="phase-dot"
              :class="{ 'is-active': p.id === phase }"
              :style="p.id === phase ? { backgroundColor: currentConfig.accentColor } : {}"
              :title="`${p.name} (Phase ${p.id})`"
              :aria-label="`${p.name} (Phase ${p.id})`"
              :aria-selected="p.id === phase"
              @click="handlePhaseClick(p.id as GamePhase)"
            />
          </div>
        </div>
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
  display: inline-flex;
  align-items: center;
  user-select: none;
}

.tracker-box {
  display: inline-flex;
}

.tracker-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
}

.font-arrow-btn {
  background: #f5eedf;
  border: 1.5px solid #4a3d2c;
  color: #29241e;
  border-radius: 6px;
  width: 32px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  transition:
    background 0.15s ease,
    transform 0.1s ease,
    box-shadow 0.15s ease;
}

.font-arrow-btn:hover:not(:disabled) {
  background: #e2d7c3;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
}

.font-arrow-btn:active:not(:disabled) {
  transform: scale(0.92);
  background: #d5c8b2;
}

.font-arrow-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  border-color: #a8a29e;
  background: #f5f5f4;
  color: #a8a29e;
}

.arrow-char {
  font-size: 16px;
  font-weight: 800;
  line-height: 1;
}

.tracker-main {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px;
}

.round-title {
  font-size: 15px;
  font-weight: 800;
  color: #292524;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.divider {
  color: #a8a29e;
  font-weight: 700;
  font-size: 13px;
}

.phase-title {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.01em;
  white-space: nowrap;
  display: inline-block;
  min-width: 84px;
}
.phase-dots {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: 2px;
}

.phase-dot {
  position: relative;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #d6cfc4;
  border: none;
  padding: 0;
  cursor: pointer;
  transition:
    background 0.2s ease,
    transform 0.15s ease;
}

.phase-dot::after {
  content: "";
  position: absolute;
  top: -6px;
  left: -6px;
  right: -6px;
  bottom: -6px;
}

.phase-dot:hover {
  background: #a8a29e;
  transform: scale(1.2);
}

.phase-dot.is-active {
  transform: scale(1.25);
}
</style>
