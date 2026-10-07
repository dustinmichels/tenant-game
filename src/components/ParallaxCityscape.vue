<script setup lang="ts">
import { computed } from "vue";
import CityscapeLayer from "./CityscapeLayer.vue";
import type { CityscapeLayerConfig } from "../utils/cityscape";
import { DEFAULT_CITYSCAPE_LAYERS } from "../utils/cityscape";

const props = withDefaults(
  defineProps<{
    speed?: number;
    paused?: boolean;
    direction?: "left" | "right";
    blurMultiplier?: number;
    opacityMultiplier?: number;
    layers?: readonly CityscapeLayerConfig[] | CityscapeLayerConfig[];
    showGroundMist?: boolean;
    fixed?: boolean;
  }>(),
  {
    speed: 1,
    paused: false,
    direction: "left",
    blurMultiplier: 1,
    opacityMultiplier: 1,
    layers: () => DEFAULT_CITYSCAPE_LAYERS,
    showGroundMist: true,
    fixed: false,
  },
);

const sortedLayers = computed(() => {
  return [...props.layers].sort((a, b) => a.zIndex - b.zIndex);
});
</script>

<template>
  <div class="parallax-cityscape-container" :class="{ 'is-fixed': fixed }" aria-hidden="true">
    <!-- Render each configured parallax depth layer scrolling horizontally -->
    <CityscapeLayer
      v-for="layer in sortedLayers"
      :key="layer.id"
      :config="layer"
      :speed-multiplier="speed"
      :blur-multiplier="blurMultiplier"
      :opacity-multiplier="opacityMultiplier"
      :direction="direction"
      :paused="paused"
    />

    <!-- Atmospheric ground mist gradient to softly anchor the buildings to the floor -->
    <div v-if="showGroundMist" class="ground-mist-gradient" />
  </div>
</template>

<style scoped>
.parallax-cityscape-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
  z-index: 0;
}

.parallax-cityscape-container.is-fixed {
  position: fixed;
}

/* Atmospheric bottom mist gradient seamlessly blending the buildings into the base background */
.ground-mist-gradient {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 180px;
  pointer-events: none;
  z-index: 10;
  background: linear-gradient(
    to top,
    var(--color-background, #ffffff) 0%,
    rgba(255, 255, 255, 0.8) 25%,
    rgba(255, 255, 255, 0.4) 55%,
    transparent 100%
  );
}

@media (prefers-color-scheme: dark) {
  .ground-mist-gradient {
    background: linear-gradient(
      to top,
      var(--color-background, #181818) 0%,
      rgba(24, 24, 24, 0.85) 25%,
      rgba(24, 24, 24, 0.4) 55%,
      transparent 100%
    );
  }
}
</style>
