<script setup lang="ts">
import { computed } from 'vue'
import type { Building } from '../types/game'
import { roughGen, createSeed } from '../utils/rough'
import type { PathInfo } from '../utils/rough'
import RoughBox from './RoughBox.vue'
import BuildingWindow from './BuildingWindow.vue'

const props = defineProps<{
  building: Building
}>()

const buildingSeed = computed(() => createSeed(`building_${props.building.id}_${props.building.index}`))

// Dynamic column layout based on tenant count
const gridColumns = computed(() => {
  const count = props.building.tenants.length
  if (count <= 2) return count || 1
  if (count <= 6) return 2
  if (count <= 12) return 3
  if (count <= 24) return 4
  if (count <= 40) return 5
  return 6
})

// Rooftop rough paths (parapet, cornice trim, water tower)
const roofPaths = computed<PathInfo[]>(() => {
  const s = buildingSeed.value
  // Cornice bottom line
  const cornice = roughGen.line(0, 32, 280, 32, {
    roughness: 1.1,
    stroke: '#4a3d2c',
    strokeWidth: 1.8,
    seed: s + 10,
  })

  // Parapet wall
  const parapet = roughGen.rectangle(4, 20, 272, 12, {
    roughness: 1.0,
    stroke: '#695844',
    fill: '#c9bca9',
    fillStyle: 'solid',
    strokeWidth: 1.2,
    seed: s + 11,
  })

  // Water tower stilts
  const stiltL = roughGen.line(226, 20, 224, 12, {
    roughness: 0.8,
    stroke: '#3a3022',
    strokeWidth: 1.4,
    seed: s + 12,
  })
  const stiltR = roughGen.line(244, 20, 246, 12, {
    roughness: 0.8,
    stroke: '#3a3022',
    strokeWidth: 1.4,
    seed: s + 13,
  })
  const crossStilt = roughGen.line(224, 16, 246, 16, {
    roughness: 0.7,
    stroke: '#3a3022',
    strokeWidth: 1.0,
    seed: s + 14,
  })

  // Water tower barrel body
  const tank = roughGen.rectangle(222, 3, 26, 10, {
    roughness: 0.9,
    stroke: '#3a3022',
    fill: '#7d6a54',
    fillStyle: 'solid',
    strokeWidth: 1.2,
    seed: s + 15,
  })

  // Water tower cone cap
  const cone = roughGen.polygon(
    [
      [220, 3],
      [235, -2],
      [250, 3],
    ],
    {
      roughness: 0.8,
      stroke: '#292116',
      fill: '#574632',
      fillStyle: 'solid',
      strokeWidth: 1.2,
      seed: s + 16,
    },
  )

  return [cornice, parapet, stiltL, stiltR, crossStilt, tank, cone].flatMap((d) =>
    roughGen.toPaths(d),
  )
})

// Ground floor entrance paths
const entrancePaths = computed<PathInfo[]>(() => {
  const s = buildingSeed.value + 50
  // Awning
  const awning = roughGen.rectangle(18, 2, 44, 5, {
    roughness: 0.9,
    stroke: '#27272a',
    fill: '#78350f',
    fillStyle: 'solid',
    strokeWidth: 1.2,
    seed: s + 1,
  })

  // Doorway frame
  const doorway = roughGen.rectangle(25, 7, 30, 31, {
    roughness: 0.9,
    stroke: '#382f24',
    fill: '#5e4e3b',
    fillStyle: 'solid',
    strokeWidth: 1.3,
    seed: s + 2,
  })

  // Door window / panel
  const panel = roughGen.rectangle(29, 11, 22, 13, {
    roughness: 0.8,
    stroke: '#382f24',
    fill: '#dfd5c5',
    fillStyle: 'solid',
    strokeWidth: 1.0,
    seed: s + 3,
  })

  // Door knob
  const knob = roughGen.circle(50, 26, 3, {
    roughness: 0.5,
    stroke: '#241e16',
    fill: '#eab308',
    fillStyle: 'solid',
    strokeWidth: 1.0,
    seed: s + 4,
  })

  // Stoop base steps
  const stoopTop = roughGen.rectangle(14, 38, 52, 5, {
    roughness: 0.9,
    stroke: '#524534',
    fill: '#a3927d',
    fillStyle: 'solid',
    strokeWidth: 1.2,
    seed: s + 5,
  })
  const stoopBottom = roughGen.rectangle(8, 43, 64, 5, {
    roughness: 0.9,
    stroke: '#524534',
    fill: '#8e7e6a',
    fillStyle: 'solid',
    strokeWidth: 1.2,
    seed: s + 6,
  })

  return [awning, doorway, panel, knob, stoopTop, stoopBottom].flatMap((d) =>
    roughGen.toPaths(d),
  )
})
</script>

<template>
  <div class="building-card-wrapper">
    <RoughBox
      :stroke="'#3f382f'"
      :fill="'#f5efe4'"
      fill-style="solid"
      :roughness="1.2"
      :bowing="1.0"
      :stroke-width="1.8"
      :seed="buildingSeed"
      class="building-rough-box"
    >
      <div class="building-card-inner">
        <!-- Sketched Rooftop architectural trim with water tower -->
        <div class="building-roof-area">
          <svg
            viewBox="0 0 280 34"
            class="roof-rough-svg"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              v-for="(p, idx) in roofPaths"
              :key="idx"
              :d="p.d"
              :stroke="p.stroke"
              :stroke-width="p.strokeWidth"
              :fill="p.fill"
            />
          </svg>
        </div>

        <!-- Header plaque with hand-drawn label and badge -->
        <div class="building-header-plaque">
          <RoughBox
            :stroke="'#524534'"
            :fill="'#ebe2d3'"
            fill-style="solid"
            :roughness="1.0"
            :stroke-width="1.2"
            :seed="buildingSeed + 8"
            class="plaque-box"
          >
            <div class="plaque-content">
              <span class="building-label">{{ building.label }}</span>
              <div class="building-tenant-badge">
                <span class="badge-num">{{ building.tenants.length }}</span>
                <span class="badge-txt">{{
                  building.tenants.length === 1 ? 'person' : 'people'
                }}</span>
              </div>
            </div>
          </RoughBox>
        </div>

        <!-- Inside the building: apartments grid -->
        <div
          class="building-windows-grid"
          :style="{
            '--building-cols': gridColumns,
          }"
        >
          <BuildingWindow
            v-for="(tenant, idx) in building.tenants"
            :key="tenant.id"
            :variant="tenant.variant"
            :label="`${building.label} • Tenant ${idx + 1}`"
            :seed="buildingSeed + 100 + idx * 7"
          />
        </div>

        <!-- Ground floor entrance with hand-drawn door, awning, and stoop -->
        <div class="building-ground-area">
          <svg
            viewBox="0 0 80 48"
            class="entrance-rough-svg"
            aria-hidden="true"
          >
            <path
              v-for="(p, idx) in entrancePaths"
              :key="idx"
              :d="p.d"
              :stroke="p.stroke"
              :stroke-width="p.strokeWidth"
              :fill="p.fill"
            />
          </svg>
        </div>
      </div>
    </RoughBox>
  </div>
</template>

<style scoped>
.building-card-wrapper {
  display: flex;
  flex-direction: column;
  position: relative;
  min-width: 220px;
  max-width: 380px;
  flex: 1 1 260px;
  transition: transform 0.2s ease;
}

.building-card-wrapper:hover {
  transform: translateY(-4px);
}

.building-rough-box {
  width: 100%;
  height: 100%;
}

.building-card-inner {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding-bottom: 4px;
}

/* Rooftop */
.building-roof-area {
  position: relative;
  width: 100%;
  height: 34px;
  overflow: visible;
}

.roof-rough-svg {
  width: 100%;
  height: 100%;
  display: block;
}

/* Plaque */
.building-header-plaque {
  padding: 4px 10px 6px;
  width: 100%;
}

.plaque-box {
  width: 100%;
}

.plaque-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 10px;
  width: 100%;
}

.building-label {
  font-family: inherit;
  font-size: 0.96rem;
  font-weight: 700;
  color: #29241e;
  letter-spacing: -0.01em;
}

.building-tenant-badge {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  background: #dbcfbc;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.78rem;
  color: #3b3327;
  font-weight: 600;
}

.badge-num {
  font-weight: 800;
  font-size: 0.88rem;
}

/* Windows Grid */
.building-windows-grid {
  display: grid;
  grid-template-columns: repeat(var(--building-cols, 3), minmax(0, 1fr));
  gap: 8px 10px;
  padding: 12px 14px 16px;
  flex-grow: 1;
}

/* Ground entrance */
.building-ground-area {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  height: 48px;
  width: 100%;
}

.entrance-rough-svg {
  width: 80px;
  height: 48px;
  display: block;
}
</style>
