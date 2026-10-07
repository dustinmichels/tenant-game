<script setup lang="ts">
import { computed } from "vue";
import type { CityscapeLayerConfig } from "../utils/cityscape";

const props = withDefaults(
  defineProps<{
    config: CityscapeLayerConfig;
    speedMultiplier?: number;
    blurMultiplier?: number;
    opacityMultiplier?: number;
    direction?: "left" | "right";
    paused?: boolean;
  }>(),
  {
    speedMultiplier: 1,
    blurMultiplier: 1,
    opacityMultiplier: 1,
    direction: "left",
    paused: false,
  },
);

const effectiveDuration = computed(() => {
  const mult = props.speedMultiplier > 0 ? props.speedMultiplier : 1;
  const dur = props.config.baseDuration / mult;
  return `${Math.max(5, Math.round(dur * 10) / 10)}s`;
});

const effectiveBlur = computed(() => {
  const blur = props.config.blurRadius * Math.max(0, props.blurMultiplier);
  return `${Math.round(blur * 10) / 10}px`;
});

const layerStyle = computed(() => {
  const bottomOffset = props.config.bottomOffsetPercent ?? 0;
  return {
    zIndex: props.config.zIndex,
    bottom: `${bottomOffset}%`,
    "--tile-height": `${props.config.tileHeight}px`,
    "--tile-width": `${props.config.tileWidth}px`,
    "--blur-radius": effectiveBlur.value,
    "--opacity-light": `${props.config.opacityLight * props.opacityMultiplier}`,
    "--opacity-dark": `${props.config.opacityDark * props.opacityMultiplier}`,
    "--scroll-duration": effectiveDuration.value,
  };
});
</script>

<template>
  <div class="cityscape-layer" :class="`layer-${config.id}`" :style="layerStyle" aria-hidden="true">
    <div class="cityscape-track" :class="[`scroll-${direction}`, { 'is-paused': paused }]">
      <!-- 4 identical tiles side by side ensure 100% seamless infinite looping on any display up to 4800px wide -->
      <div v-for="index in 4" :key="index" class="cityscape-tile" v-html="config.svg" />
    </div>
  </div>
</template>

<style scoped>
.cityscape-layer {
  position: absolute;
  left: 0;
  right: 0;
  height: var(--tile-height);
  pointer-events: none;
  user-select: none;
  overflow: visible;
  filter: blur(var(--blur-radius));
  opacity: var(--opacity-light);
}

@media (prefers-color-scheme: dark) {
  .cityscape-layer {
    opacity: var(--opacity-dark);
  }
}

/* Layer theme colors for architectural silhouette styling */
.layer-distant-skyline {
  color: #64748b;
}

.layer-mid-neighborhood {
  color: #475569;
}

.layer-near-streetscape {
  color: #334155;
}

@media (prefers-color-scheme: dark) {
  .layer-distant-skyline {
    color: #475569;
  }

  .layer-mid-neighborhood {
    color: #64748b;
  }

  .layer-near-streetscape {
    color: #94a3b8;
  }
}

.cityscape-track {
  display: flex;
  width: max-content;
  height: 100%;
  animation-duration: var(--scroll-duration);
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  will-change: transform;
}

.scroll-left {
  animation-name: cityscape-scroll-left;
}

.scroll-right {
  animation-name: cityscape-scroll-right;
}

.is-paused {
  animation-play-state: paused !important;
}

@keyframes cityscape-scroll-left {
  0% {
    transform: translate3d(0, 0, 0);
  }
  100% {
    transform: translate3d(-25%, 0, 0);
  }
}

@keyframes cityscape-scroll-right {
  0% {
    transform: translate3d(-25%, 0, 0);
  }
  100% {
    transform: translate3d(0, 0, 0);
  }
}

.cityscape-tile {
  flex-shrink: 0;
  width: var(--tile-width);
  height: 100%;
}

.cityscape-tile :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}

/* Subtle beacon light pulsing on rooftop spires */
.cityscape-tile :deep(.beacon-light) {
  animation: beacon-pulse 2s ease-in-out infinite;
}

@keyframes beacon-pulse {
  0%,
  100% {
    opacity: 0.35;
  }
  50% {
    opacity: 1;
  }
}

/* Gracefully halt all motion when the user requests reduced motion */
@media (prefers-reduced-motion: reduce) {
  .cityscape-track {
    animation: none !important;
    transform: none !important;
  }

  .cityscape-tile :deep(.beacon-light) {
    animation: none !important;
  }
}
</style>
