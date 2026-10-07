<script setup lang="ts">
import { computed, onMounted, onUnmounted, shallowRef, useTemplateRef } from "vue";
import { roughGen } from "../utils/rough";
import type { PathInfo } from "../utils/rough";

const props = withDefaults(
  defineProps<{
    stroke?: string;
    fill?: string;
    fillStyle?: "hachure" | "solid" | "zigzag" | "cross-hatch" | "dots" | "dashed";
    roughness?: number;
    bowing?: number;
    strokeWidth?: number;
    seed?: number;
    paddingOffset?: number;
    hachureAngle?: number;
    hachureGap?: number;
    fillWeight?: number;
  }>(),
  {
    stroke: "currentColor",
    fill: undefined,
    fillStyle: "hachure",
    roughness: 1.1,
    bowing: 1.0,
    strokeWidth: 1.4,
    seed: undefined,
    paddingOffset: 2,
    hachureAngle: -41,
    hachureGap: 4,
    fillWeight: 0.6,
  },
);

const containerRef = useTemplateRef<HTMLElement>("containerRef");
const width = shallowRef(0);
const height = shallowRef(0);

let observer: ResizeObserver | null = null;

onMounted(() => {
  if (!containerRef.value) return;
  observer = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;
    const rect = entry.contentRect;
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    requestAnimationFrame(() => {
      if (w !== width.value || h !== height.value) {
        width.value = w;
        height.value = h;
      }
    });
  });
  observer.observe(containerRef.value);
});

onUnmounted(() => {
  observer?.disconnect();
  observer = null;
});

const paths = computed<PathInfo[]>(() => {
  const w = width.value;
  const h = height.value;
  const pad = props.paddingOffset;
  if (w <= pad * 2 || h <= pad * 2) return [];

  const drawable = roughGen.rectangle(
    pad,
    pad,
    Math.max(1, w - pad * 2),
    Math.max(1, h - pad * 2),
    {
      stroke: props.stroke,
      fill: props.fill,
      fillStyle: props.fillStyle,
      roughness: props.roughness,
      bowing: props.bowing,
      strokeWidth: props.strokeWidth,
      seed: props.seed,
      hachureAngle: props.hachureAngle,
      hachureGap: props.hachureGap,
      fillWeight: props.fillWeight,
    },
  );
  return roughGen.toPaths(drawable);
});
</script>

<template>
  <div ref="containerRef" class="rough-box-container">
    <svg
      v-if="paths.length > 0"
      class="rough-box-svg"
      aria-hidden="true"
      :viewBox="`0 0 ${width} ${height}`"
    >
      <path
        v-for="(p, idx) in paths"
        :key="idx"
        :d="p.d"
        :stroke="p.stroke"
        :stroke-width="p.strokeWidth"
        :fill="p.fill"
      />
    </svg>
    <div class="rough-box-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.rough-box-container {
  position: relative;
  display: inline-flex;
  flex-direction: column;
}

.rough-box-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
  z-index: 0;
}

.rough-box-content {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  display: inherit;
  flex-direction: inherit;
  align-items: inherit;
  justify-content: inherit;
}
</style>
