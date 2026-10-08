<script setup lang="ts">
import { computed, shallowRef, onBeforeUnmount } from "vue";
import { ArrowLeft, ArrowRight } from "lucide-vue-next";
import { onKeyStroke } from "@vueuse/core";
import type { GamePhase } from "../types/game";
import { PHASES } from "../types/game";
import RoughBox from "./RoughBox.vue";

const props = withDefaults(
  defineProps<{
    round: number;
    phase: GamePhase;
    disabled?: boolean;
  }>(),
  {
    disabled: false,
  },
);
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
const isRumbling = shallowRef(false);
const rumbleAlternate = shallowRef(false);
let rumbleTimeout: ReturnType<typeof setTimeout> | null = null;

function triggerRumble() {
  if (rumbleTimeout) {
    clearTimeout(rumbleTimeout);
  }
  isRumbling.value = true;
  rumbleAlternate.value = !rumbleAlternate.value;
  rumbleTimeout = setTimeout(() => {
    isRumbling.value = false;
    rumbleTimeout = null;
  }, 320);
}

function handleNext() {
  if (props.disabled) return;
  triggerRumble();
  emit("next");
}

onBeforeUnmount(() => {
  if (rumbleTimeout) {
    clearTimeout(rumbleTimeout);
    rumbleTimeout = null;
  }
});

function handlePhaseClick(pId: GamePhase) {
  if (props.disabled) return;
  if (pId !== props.phase) {
    emit("select-phase", pId);
  }
}

function isInputElement(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return Boolean(
    el &&
    (el.tagName === "INPUT" ||
      el.tagName === "TEXTAREA" ||
      el.tagName === "SELECT" ||
      el.isContentEditable),
  );
}

onKeyStroke(["ArrowRight", "Right", "ArrowDown"], (e) => {
  if (props.disabled) return;
  if (isInputElement(e.target)) return;
  e.preventDefault();
  handleNext();
});

onKeyStroke(["ArrowLeft", "ArrowUp"], (e) => {
  if (isInputElement(e.target)) return;
  if (props.disabled) return;
  if (!(props.round === 1 && props.phase === 1)) {
    e.preventDefault();
    emit("prev");
  }
});
</script>

<template>
  <div
    class="round-tracker-wrapper"
    :class="{ 'is-disabled': disabled }"
    role="region"
    aria-label="Game Round and Phase Controls"
  >
    <RoughBox
      :stroke="disabled ? '#a8a29e' : '#3f382f'"
      :fill="disabled ? '#f4f4f5' : '#fcfaf6'"
      :roughness="0.8"
      :stroke-width="1.2"
      :seed="404"
      class="tracker-box"
      :class="{
        'is-rumbling': isRumbling,
        'rumble-alt': isRumbling && rumbleAlternate,
      }"
    >
      <div class="tracker-content">
        <button
          type="button"
          class="font-arrow-btn back"
          :disabled="disabled || (round === 1 && phase === 1)"
          :title="disabled ? 'Disabled until game begins' : 'Previous phase (or Left Arrow key)'"
          aria-label="Previous phase"
          @click="emit('prev')"
        >
          <ArrowLeft :size="15" :stroke-width="1.8" class="arrow-char" aria-hidden="true" />
        </button>

        <div class="tracker-main">
          <span class="round-title">Round {{ round }}</span>
          <span class="divider" aria-hidden="true">•</span>
          <span
            class="phase-title"
            :style="{ color: disabled ? '#78716c' : currentConfig.accentColor }"
          >
            Phase {{ phase }}: {{ currentConfig.name }}
          </span>
          <div class="phase-dots" role="tablist" aria-label="Select phase">
            <button
              v-for="p in PHASES"
              :key="p.id"
              type="button"
              class="phase-dot"
              :disabled="disabled"
              :class="{ 'is-active': p.id === phase, 'is-disabled': disabled }"
              :style="
                p.id === phase
                  ? { backgroundColor: disabled ? '#a8a29e' : currentConfig.accentColor }
                  : {}
              "
              :title="disabled ? 'Disabled until game begins' : `${p.name} (Phase ${p.id})`"
              :aria-label="`${p.name} (Phase ${p.id})`"
              :aria-selected="p.id === phase"
              @click="handlePhaseClick(p.id as GamePhase)"
            />
          </div>
        </div>
        <button
          type="button"
          class="font-arrow-btn forward"
          :disabled="disabled"
          :title="disabled ? 'Disabled until game begins' : 'Next phase (or Right Arrow key)'"
          aria-label="Next phase"
          @click="handleNext"
        >
          <ArrowRight :size="15" :stroke-width="1.8" class="arrow-char" aria-hidden="true" />
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

.round-tracker-wrapper.is-disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.round-tracker-wrapper.is-disabled .tracker-content {
  cursor: not-allowed;
}

.round-tracker-wrapper.is-disabled .round-title {
  color: #78716c;
}

.round-tracker-wrapper.is-disabled .phase-dot {
  cursor: not-allowed;
  pointer-events: none;
}

.tracker-box {
  display: inline-flex;
}

.tracker-box.is-rumbling {
  animation: box-rumble-1 320ms cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  will-change: transform;
}

.tracker-box.is-rumbling.rumble-alt {
  animation-name: box-rumble-2;
}

@keyframes box-rumble-1 {
  0% {
    transform: translate3d(0, 0, 0) rotate(0deg);
  }
  15% {
    transform: translate3d(-2.5px, 1px, 0) rotate(-0.8deg);
  }
  30% {
    transform: translate3d(2.5px, -1.2px, 0) rotate(0.8deg);
  }
  45% {
    transform: translate3d(-2px, -1px, 0) rotate(-0.5deg);
  }
  60% {
    transform: translate3d(1.5px, 0.8px, 0) rotate(0.4deg);
  }
  75% {
    transform: translate3d(-1px, -0.4px, 0) rotate(-0.2deg);
  }
  90% {
    transform: translate3d(0.5px, 0.4px, 0) rotate(0.1deg);
  }
  100% {
    transform: translate3d(0, 0, 0) rotate(0deg);
  }
}

@keyframes box-rumble-2 {
  0% {
    transform: translate3d(0, 0, 0) rotate(0deg);
  }
  15% {
    transform: translate3d(-2.5px, 1px, 0) rotate(-0.8deg);
  }
  30% {
    transform: translate3d(2.5px, -1.2px, 0) rotate(0.8deg);
  }
  45% {
    transform: translate3d(-2px, -1px, 0) rotate(-0.5deg);
  }
  60% {
    transform: translate3d(1.5px, 0.8px, 0) rotate(0.4deg);
  }
  75% {
    transform: translate3d(-1px, -0.4px, 0) rotate(-0.2deg);
  }
  90% {
    transform: translate3d(0.5px, 0.4px, 0) rotate(0.1deg);
  }
  100% {
    transform: translate3d(0, 0, 0) rotate(0deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tracker-box.is-rumbling,
  .tracker-box.is-rumbling.rumble-alt {
    animation: none;
  }
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
  min-width: 155px;
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
