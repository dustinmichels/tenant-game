<script setup lang="ts">
import { computed, onMounted, onUnmounted, shallowRef, useTemplateRef } from "vue";
import { roughGen } from "../utils/rough";
import type { PathInfo } from "../utils/rough";

const props = withDefaults(
  defineProps<{
    modelValue: number | null;
    min?: number;
    max?: number;
    step?: number;
    id?: string;
    ariaLabel?: string;
    isAboveMax?: boolean;
    seed?: number;
  }>(),
  {
    min: 1,
    max: 8,
    step: 1,
    id: "rough-slider",
    ariaLabel: "Slider",
    isAboveMax: false,
    seed: 500,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: number): void;
}>();

const trackViewportRef = useTemplateRef<HTMLElement>("trackViewportRef");
const trackWidth = shallowRef(240);

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (trackViewportRef.value) {
    trackWidth.value = Math.max(
      120,
      Math.round(trackViewportRef.value.getBoundingClientRect().width),
    );
    resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        trackWidth.value = Math.max(120, Math.round(entry.contentRect.width));
      }
    });
    resizeObserver.observe(trackViewportRef.value);
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});

const isHovered = shallowRef(false);
const isDragging = shallowRef(false);
const isFocused = shallowRef(false);
const hoveredPip = shallowRef<number | null>(null);

// Pad from viewport edge so the 22px thumb stays inside the track area
const PAD = 13;
const usableWidth = computed(() => Math.max(20, trackWidth.value - 2 * PAD));

// Clamped integer value for slider thumb position (between min and max)
const clampedVal = computed(() => {
  const num = Number(props.modelValue);
  if (!num || isNaN(num) || num < props.min) return props.min;
  return Math.min(props.max, num);
});

const thumbX = computed(() => {
  const range = props.max - props.min;
  if (range <= 0) return PAD;
  const fraction = (clampedVal.value - props.min) / range;
  return PAD + fraction * usableWidth.value;
});

// 1. Base track groove paths
const baseTrackPaths = computed<PathInfo[]>(() => {
  const w = usableWidth.value;
  const d = roughGen.rectangle(PAD - 2, 11, w + 4, 10, {
    stroke: "#786957",
    fill: "#eee7db",
    fillStyle: "solid",
    roughness: 0.8,
    strokeWidth: 1.2,
    bowing: 0.8,
    seed: props.seed,
  });
  return roughGen.toPaths(d);
});

// 2. Active progress groove paths (from left edge to thumb)
const activeProgressPaths = computed<PathInfo[]>(() => {
  const curX = thumbX.value;
  const fillWidth = Math.max(1, curX - PAD + 2);
  const d = roughGen.rectangle(PAD - 2, 11, fillWidth, 10, {
    stroke: "#443422",
    fill: "#c9bca9",
    fillStyle: "solid",
    roughness: 0.85,
    strokeWidth: 1.2,
    bowing: 0.7,
    seed: props.seed + 15,
  });
  return roughGen.toPaths(d);
});

// 3. Ruler tick marks along the track
const tickPaths = computed<PathInfo[]>(() => {
  const count = props.max - props.min + 1;
  const paths: PathInfo[] = [];
  for (let i = 0; i < count; i++) {
    const val = props.min + i;
    const fraction = count > 1 ? i / (count - 1) : 0;
    const x = PAD + fraction * usableWidth.value;
    const isEndpoint = i === 0 || i === count - 1;
    const y1 = isEndpoint ? 6 : 9;
    const y2 = isEndpoint ? 26 : 23;
    const isPassed = val <= clampedVal.value;

    const line = roughGen.line(x, y1, x, y2, {
      stroke: isPassed ? "#443422" : "#8c7d6c",
      strokeWidth: isEndpoint ? 1.6 : 1.1,
      roughness: 0.5,
      seed: props.seed + 30 + i,
    });
    paths.push(...roughGen.toPaths(line));
  }
  return paths;
});

// 4. Thumb knob paths centered at (0, 0) for GPU-accelerated translation
const thumbPaths = computed<PathInfo[]>(() => {
  const s = props.seed + 70;
  const paths: PathInfo[] = [];

  // Focus ring
  if (isFocused.value) {
    const focusRing = roughGen.circle(0, 0, 28, {
      stroke: "#78350f",
      strokeWidth: 1.8,
      roughness: 1.2,
      seed: s + 99,
    });
    paths.push(...roughGen.toPaths(focusRing));
  }

  // Outer circular knob
  const knob = roughGen.circle(0, 0, 22, {
    stroke: isHovered.value || isDragging.value ? "#09090b" : "#18181b",
    fill: isHovered.value || isDragging.value ? "#18181b" : "#27272a",
    fillStyle: "solid",
    roughness: 1.1,
    strokeWidth: 1.7,
    bowing: 0.9,
    seed: s,
  });
  paths.push(...roughGen.toPaths(knob));

  // Hand-drawn double grip notches on the knob
  const notch1 = roughGen.line(-2.5, -5, -2.5, 5, {
    stroke: "#fcfaf6",
    strokeWidth: 1.5,
    roughness: 0.35,
    seed: s + 2,
  });
  const notch2 = roughGen.line(2.5, -5, 2.5, 5, {
    stroke: "#fcfaf6",
    strokeWidth: 1.5,
    roughness: 0.35,
    seed: s + 3,
  });
  paths.push(...roughGen.toPaths(notch1), ...roughGen.toPaths(notch2));

  return paths;
});

function handleNativeInput(e: Event) {
  const target = e.target as HTMLInputElement;
  emit("update:modelValue", Number(target.value));
}

function isPipActive(n: number): boolean {
  if (n === props.max && props.isAboveMax) return true;
  return clampedVal.value === n;
}

function getPipPaths(n: number): PathInfo[] {
  const active = isPipActive(n);
  const isAbove = n === props.max && props.isAboveMax;
  const hovered = hoveredPip.value === n;

  const stroke = isAbove ? "#92400e" : active ? "#18181b" : hovered ? "#786957" : "#c4b8a5";
  const fill = isAbove ? "#b45309" : active ? "#27272a" : hovered ? "#ede2cf" : "#fbf9f5";
  const strokeWidth = isAbove ? 1.6 : active ? 1.4 : hovered ? 1.2 : 1.0;

  const d = roughGen.rectangle(2, 2, 32, 24, {
    stroke,
    fill,
    fillStyle: "solid",
    roughness: active ? 1.1 : 0.8,
    strokeWidth,
    bowing: 0.7,
    seed: props.seed + 100 + n * 7,
  });
  return roughGen.toPaths(d);
}

function handlePipClick(n: number) {
  emit("update:modelValue", n);
}
</script>

<template>
  <div class="rough-slider-component">
    <!-- Slider Track Row -->
    <div class="slider-track-row">
      <span class="slider-endpoint">1</span>

      <div ref="trackViewportRef" class="slider-track-viewport">
        <svg :width="trackWidth" height="32" class="slider-track-svg" aria-hidden="true">
          <!-- Base track groove -->
          <path
            v-for="(p, i) in baseTrackPaths"
            :key="`base-${i}`"
            :d="p.d"
            :stroke="p.stroke"
            :stroke-width="p.strokeWidth"
            :fill="p.fill"
          />

          <!-- Active progress fill -->
          <path
            v-for="(p, i) in activeProgressPaths"
            :key="`active-${i}`"
            :d="p.d"
            :stroke="p.stroke"
            :stroke-width="p.strokeWidth"
            :fill="p.fill"
          />

          <!-- Scale tick marks -->
          <path
            v-for="(p, i) in tickPaths"
            :key="`tick-${i}`"
            :d="p.d"
            :stroke="p.stroke"
            :stroke-width="p.strokeWidth"
            :fill="p.fill"
          />

          <!-- GPU-accelerated hand-drawn thumb knob -->
          <g
            :transform="`translate(${thumbX}, 16)`"
            class="thumb-group"
            :class="{ 'is-hovered': isHovered, 'is-dragging': isDragging }"
          >
            <path
              v-for="(p, i) in thumbPaths"
              :key="`thumb-${i}`"
              :d="p.d"
              :stroke="p.stroke"
              :stroke-width="p.strokeWidth"
              :fill="p.fill"
            />
          </g>
        </svg>

        <!-- Transparent accessible native range input overlaid exactly on track -->
        <input
          :id="id"
          type="range"
          :min="min"
          :max="max"
          :step="step"
          :value="clampedVal"
          class="native-range-input"
          :aria-label="ariaLabel"
          @input="handleNativeInput"
          @mousedown="isDragging = true"
          @mouseup="isDragging = false"
          @touchstart="isDragging = true"
          @touchend="isDragging = false"
          @mouseenter="isHovered = true"
          @mouseleave="isHovered = false"
          @focus="isFocused = true"
          @blur="
            isFocused = false;
            isDragging = false;
          "
        />
      </div>

      <span class="slider-endpoint" :class="{ 'is-above-max': isAboveMax }">
        {{ isAboveMax ? `${max}+` : max }}
      </span>
    </div>

    <!-- Hand-drawn Pip Buttons Row -->
    <div class="slider-pips-row">
      <button
        v-for="n in max - min + 1"
        :key="n"
        type="button"
        class="rough-pip-btn"
        :class="{
          'is-active': isPipActive(n),
          'is-above-max': n === max && isAboveMax,
        }"
        :aria-label="`${n === max && isAboveMax ? `${max}+` : n}`"
        @click="handlePipClick(n)"
        @mouseenter="hoveredPip = n"
        @mouseleave="hoveredPip = null"
      >
        <svg
          viewBox="0 0 36 28"
          preserveAspectRatio="none"
          class="pip-rough-svg"
          aria-hidden="true"
        >
          <path
            v-for="(p, i) in getPipPaths(n)"
            :key="i"
            :d="p.d"
            :stroke="p.stroke"
            :stroke-width="p.strokeWidth"
            :fill="p.fill"
          />
        </svg>
        <span class="pip-label">{{ n === max && isAboveMax ? `${max}+` : n }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.rough-slider-component {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.slider-track-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.slider-endpoint {
  font-size: 0.78rem;
  font-weight: 700;
  color: #71717a;
  min-width: 18px;
  text-align: center;
  user-select: none;
}

.slider-endpoint:last-child {
  min-width: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.slider-endpoint.is-above-max {
  color: #b45309;
  font-weight: 800;
  background-color: #fef3c7;
  border: 1px dashed #d97706;
  padding: 1px 5px;
  border-radius: 4px;
}

.slider-track-viewport {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 32px;
  display: flex;
  align-items: center;
}

.slider-track-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
}

.thumb-group {
  transition: transform 0.08s ease-out;
}

.thumb-group.is-hovered {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.25));
}

.thumb-group.is-dragging {
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.35));
}

.native-range-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  margin: 0;
  cursor: pointer;
  z-index: 10;
  -webkit-appearance: none;
  appearance: none;
}

.slider-pips-row {
  display: flex;
  justify-content: space-between;
  gap: 4px;
  width: 100%;
}

.rough-pip-btn {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 28px;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  user-select: none;
  outline: none;
  transition: transform 0.12s ease;
}

.rough-pip-btn:hover {
  transform: translateY(-1.5px);
}

.rough-pip-btn:active {
  transform: translateY(0.5px);
}

.pip-rough-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.pip-label {
  position: relative;
  z-index: 2;
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1;
  color: #524534;
  pointer-events: none;
  transition: color 0.12s ease;
}

.rough-pip-btn.is-active .pip-label {
  color: #ffffff;
}

.rough-pip-btn.is-active.is-above-max .pip-label {
  color: #ffffff;
}

.rough-pip-btn:hover:not(.is-active) .pip-label {
  color: #18181b;
}
</style>
