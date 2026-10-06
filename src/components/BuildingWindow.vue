<script setup lang="ts">
import { computed } from 'vue'
import { roughGen } from '../utils/rough'
import type { PathInfo } from '../utils/rough'
import TenantSilhouette from './TenantSilhouette.vue'

const props = withDefaults(
  defineProps<{
    variant?: number
    label?: string
    seed?: number
  }>(),
  {
    variant: 0,
    label: 'Resident',
    seed: undefined,
  },
)

const windowSeed = computed(() => props.seed ?? 101)

const windowPaths = computed<PathInfo[]>(() => {
  const s = windowSeed.value
  const frame = roughGen.rectangle(3, 4, 44, 54, {
    roughness: 0.9,
    stroke: '#786957',
    strokeWidth: 1.2,
    fill: '#fffdfa',
    fillStyle: 'solid',
    seed: s,
  })

  const lintel = roughGen.rectangle(1, 1, 48, 4, {
    roughness: 0.8,
    stroke: '#5c4f3d',
    strokeWidth: 1.1,
    fill: '#a89780',
    fillStyle: 'solid',
    seed: s + 1,
  })

  const sill = roughGen.rectangle(0, 58, 50, 4, {
    roughness: 0.8,
    stroke: '#5c4f3d',
    strokeWidth: 1.1,
    fill: '#a89780',
    fillStyle: 'solid',
    seed: s + 2,
  })

  const crossH = roughGen.line(4, 28, 46, 28, {
    roughness: 0.6,
    stroke: '#d9cdbd',
    strokeWidth: 0.8,
    seed: s + 3,
  })

  const crossV = roughGen.line(25, 5, 25, 57, {
    roughness: 0.6,
    stroke: '#d9cdbd',
    strokeWidth: 0.8,
    seed: s + 4,
  })

  return [frame, lintel, sill, crossH, crossV].flatMap((d) => roughGen.toPaths(d))
})
</script>

<template>
  <div class="building-window" :title="label">
    <!-- Sketched rough window frame -->
    <svg
      viewBox="0 0 50 64"
      class="window-svg-frame"
      aria-hidden="true"
    >
      <path
        v-for="(p, idx) in windowPaths"
        :key="idx"
        :d="p.d"
        :stroke="p.stroke"
        :stroke-width="p.strokeWidth"
        :fill="p.fill"
      />
    </svg>

    <!-- Resident inside window pane -->
    <div class="window-pane-interior">
      <TenantSilhouette
        :variant="variant"
        :label="label"
        :seed="seed"
      />
    </div>
  </div>
</template>

<style scoped>
.building-window {
  position: relative;
  aspect-ratio: 0.78;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 58px;
  max-height: 104px;
}

.window-svg-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
}

.window-pane-interior {
  position: relative;
  z-index: 1;
  width: 78%;
  height: 78%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 2px;
}

.building-window:hover .window-pane-interior {
  background: radial-gradient(circle, rgba(254, 243, 199, 0.4) 0%, transparent 70%);
  border-radius: 4px;
}
</style>
