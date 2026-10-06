<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import RoughButton from './RoughButton.vue'
import RoughBox from './RoughBox.vue'
import { roughGen } from '../utils/rough'
import type { PathInfo } from '../utils/rough'

defineProps<{
  buildingCount: number
  peoplePerBuilding: number
  totalTenants: number
}>()

const emit = defineEmits<{
  (e: 'reset'): void
  (e: 'edit'): void
}>()

const isFullscreen = ref(false)

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {})
  } else {
    document.exitFullscreen().catch(() => {})
  }
}

function handleFullscreenChange() {
  isFullscreen.value = Boolean(document.fullscreenElement)
}

onMounted(() => {
  document.addEventListener('fullscreenchange', handleFullscreenChange)
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
})

// Sketched bottom divider line
const dividerPaths = computed<PathInfo[]>(() => {
  const line = roughGen.line(0, 2, 1600, 2, {
    roughness: 1.1,
    stroke: '#d1c7b7',
    strokeWidth: 1.5,
    seed: 999,
  })
  return roughGen.toPaths(line)
})
</script>

<template>
  <header class="facilitator-bar">
    <div class="facilitator-bar-inner">
      <div class="brand-section">
        <div class="union-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3zm0 3.5l5 4.5v6.5h-2v-6H9v6H7V11l5-4.5z" />
          </svg>
        </div>
        <span class="game-name">Tenant Union Visual Aid</span>
      </div>

      <!-- Summary Metrics -->
      <div class="metrics-section">
        <RoughBox
          :stroke="'#a89c8a'"
          :fill="'#faf7f2'"
          fill-style="solid"
          :roughness="0.8"
          :stroke-width="1.0"
          :seed="901"
          class="metric-box"
        >
          <div class="metric-pill">
            <span class="metric-label">Buildings</span>
            <span class="metric-value">{{ buildingCount }}</span>
          </div>
        </RoughBox>

        <RoughBox
          :stroke="'#a89c8a'"
          :fill="'#faf7f2'"
          fill-style="solid"
          :roughness="0.8"
          :stroke-width="1.0"
          :seed="902"
          class="metric-box"
        >
          <div class="metric-pill">
            <span class="metric-label">Per Bldg</span>
            <span class="metric-value">{{ peoplePerBuilding }}</span>
          </div>
        </RoughBox>

        <RoughBox
          :stroke="'#292524'"
          :fill="'#fef3c7'"
          fill-style="solid"
          :roughness="1.0"
          :stroke-width="1.3"
          :seed="903"
          class="metric-box"
        >
          <div class="metric-pill highlight">
            <span class="metric-label">Total Tenants</span>
            <span class="metric-value">{{ totalTenants }}</span>
          </div>
        </RoughBox>
      </div>

      <!-- Minimal Facilitator Actions -->
      <div class="actions-section">
        <RoughButton
          variant="secondary"
          :seed="910"
          title="Toggle Fullscreen"
          @click="toggleFullscreen"
        >
          <span>{{ isFullscreen ? '⛶ Exit Full' : '⛶ Fullscreen' }}</span>
        </RoughButton>

        <RoughButton
          variant="secondary"
          :seed="911"
          title="Change building or people count"
          @click="emit('edit')"
        >
          <span>⚙ Edit</span>
        </RoughButton>

        <RoughButton
          variant="danger"
          :seed="912"
          title="Start a new game"
          @click="emit('reset')"
        >
          <span>New Game</span>
        </RoughButton>
      </div>
    </div>

    <!-- Sketched bottom border -->
    <div class="facilitator-divider" aria-hidden="true">
      <svg viewBox="0 0 1600 4" preserveAspectRatio="none" class="divider-svg">
        <path
          v-for="(p, idx) in dividerPaths"
          :key="idx"
          :d="p.d"
          :stroke="p.stroke"
          :stroke-width="p.strokeWidth"
          :fill="p.fill"
        />
      </svg>
    </div>
  </header>
</template>

<style scoped>
.facilitator-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(253, 251, 247, 0.95);
  backdrop-filter: blur(8px);
}

.facilitator-bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 24px;
  gap: 16px;
  max-width: 1600px;
  margin: 0 auto;
  flex-wrap: wrap;
}

.brand-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.union-icon {
  display: flex;
  align-items: center;
  color: #78350f;
}

.game-name {
  font-weight: 800;
  font-size: 1.05rem;
  color: #292524;
  letter-spacing: -0.01em;
}

.metrics-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.metric-pill {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 4px 12px;
}

.metric-label {
  font-size: 0.78rem;
  color: #57534e;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.metric-value {
  font-size: 1.05rem;
  font-weight: 800;
  color: #1c1917;
}

.highlight .metric-label {
  color: #92400e;
}

.highlight .metric-value {
  color: #78350f;
}

.actions-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.facilitator-divider {
  width: 100%;
  height: 4px;
  overflow: hidden;
}

.divider-svg {
  width: 100%;
  height: 100%;
  display: block;
}

@media (max-width: 768px) {
  .facilitator-bar-inner {
    padding: 8px 12px;
    gap: 8px;
  }
  .brand-section {
    width: 100%;
    justify-content: center;
  }
  .metrics-section {
    width: 100%;
    justify-content: center;
  }
  .actions-section {
    width: 100%;
    justify-content: center;
  }
}
</style>
