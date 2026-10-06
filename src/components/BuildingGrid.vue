<script setup lang="ts">
import { computed } from 'vue'
import type { Building } from '../types/game'
import BuildingCard from './BuildingCard.vue'
import { roughGen } from '../utils/rough'
import type { PathInfo } from '../utils/rough'

defineProps<{
  buildings: Building[]
}>()

// Generate hand-drawn street groundline paths
const streetPaths = computed<PathInfo[]>(() => {
  const width = 1400
  const paths: PathInfo[] = []

  // Sidewalk slab surface
  const sidewalk = roughGen.rectangle(0, 0, width, 14, {
    roughness: 1.0,
    stroke: '#786957',
    fill: '#dfd5c5',
    fillStyle: 'solid',
    strokeWidth: 1.2,
    seed: 501,
  })
  paths.push(...roughGen.toPaths(sidewalk))

  // Sidewalk concrete expansion joints
  for (let x = 60; x < width; x += 90) {
    const joint = roughGen.line(x, 1, x, 13, {
      roughness: 0.8,
      stroke: '#9e8e7a',
      strokeWidth: 0.9,
      seed: 500 + x,
    })
    paths.push(...roughGen.toPaths(joint))
  }

  // Curb ledge
  const curb = roughGen.rectangle(0, 14, width, 8, {
    roughness: 0.9,
    stroke: '#524534',
    fill: '#b8ab99',
    fillStyle: 'solid',
    strokeWidth: 1.2,
    seed: 502,
  })
  paths.push(...roughGen.toPaths(curb))

  // Asphalt road
  const asphalt = roughGen.rectangle(0, 22, width, 30, {
    roughness: 1.1,
    stroke: '#27272a',
    fill: '#3f3f46',
    fillStyle: 'solid',
    strokeWidth: 1.4,
    seed: 503,
  })
  paths.push(...roughGen.toPaths(asphalt))

  // Yellow road dash stripes
  for (let x = 20; x < width; x += 70) {
    const stripe = roughGen.line(x, 37, x + 38, 37, {
      roughness: 0.8,
      stroke: '#eab308',
      strokeWidth: 2.2,
      seed: 600 + x,
    })
    paths.push(...roughGen.toPaths(stripe))
  }

  return paths
})
</script>

<template>
  <main class="neighborhood-viewport">
    <div class="buildings-canvas">
      <!-- Buildings row -->
      <div class="buildings-row">
        <BuildingCard
          v-for="building in buildings"
          :key="building.id"
          :building="building"
        />
      </div>

      <!-- Hand-drawn Rough.js street groundline -->
      <div class="street-groundline" aria-hidden="true">
        <svg
          viewBox="0 0 1400 52"
          class="street-rough-svg"
          preserveAspectRatio="none"
        >
          <path
            v-for="(p, idx) in streetPaths"
            :key="idx"
            :d="p.d"
            :stroke="p.stroke"
            :stroke-width="p.strokeWidth"
            :fill="p.fill"
          />
        </svg>
      </div>
    </div>
  </main>
</template>

<style scoped>
.neighborhood-viewport {
  width: 100%;
  min-height: calc(100vh - 60px);
  padding: 40px 32px 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-x: auto;
}

.buildings-canvas {
  width: 100%;
  max-width: 1600px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.buildings-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-end;
  gap: 36px 32px;
  width: 100%;
  margin-bottom: -4px;
  z-index: 2;
}

.street-groundline {
  width: 100%;
  margin-top: 0;
  display: flex;
  flex-direction: column;
  z-index: 1;
}

.street-rough-svg {
  width: 100%;
  height: 52px;
  display: block;
}
</style>
