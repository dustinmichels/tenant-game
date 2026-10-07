<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
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
}>();

function handleKeydown(e: KeyboardEvent) {
  // Ignore arrow navigation if facilitator is typing in an input
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

        <!-- 3 Phase Steps -->
        <div class="phases-timeline">
          <div
            v-for="p in PHASES"
            :key="p.id"
            class="phase-item"
            :class="{
              'is-active': p.id === phase,
              'is-completed': p.id < phase,
            }"
            :title="p.description"
          >
            <span class="phase-step-num">{{ p.id }}</span>
            <span class="phase-name">{{ p.name }}</span>
          </div>
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
  display: inline-flex;
  align-items: center;
  user-select: none;
}

.tracker-box {
  width: 100%;
}

.tracker-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 10px;
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
  transition: all 0.15s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.font-arrow-btn:hover:not(:disabled) {
  background: #ebe0ca;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.font-arrow-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.font-arrow-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  border-color: #a8a29e;
  background: #f5f5f4;
  color: #a8a29e;
  box-shadow: none;
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
  padding: 2px 10px;
  background-color: #292524;
  color: #fef08a;
  border-radius: 6px;
  min-width: 60px;
}

.round-label {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.8px;
  line-height: 1;
  color: #d6d3d1;
}

.round-number {
  font-size: 18px;
  font-weight: 900;
  line-height: 1.1;
  color: #fef08a;
}

/* Phases Timeline */
.phases-timeline {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #eee8dc;
  padding: 3px 6px;
  border-radius: 6px;
  border: 1px solid #d6cfc4;
}

.phase-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  color: #78716c;
  font-weight: 600;
  transition: all 0.2s ease;
}

.phase-step-num {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background-color: #d6cfc4;
  color: #57534e;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
}

.phase-item.is-active {
  background-color: #ffffff;
  color: #1c1917;
  font-weight: 800;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  border: 1px solid #786957;
}

.phase-item.is-active .phase-step-num {
  background-color: #eab308;
  color: #1c1917;
}

.phase-item.is-completed {
  color: #57534e;
}

.phase-item.is-completed .phase-step-num {
  background-color: #a8a29e;
  color: #ffffff;
}

@media (max-width: 768px) {
  .phase-name {
    display: none;
  }
}
</style>
