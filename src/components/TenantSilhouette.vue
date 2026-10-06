<script setup lang="ts">
import { computed } from 'vue'
import { roughGen } from '../utils/rough'
import type { PathInfo } from '../utils/rough'

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

const activeVariant = computed(() => Math.abs(props.variant) % 5)

interface ShapeSpec {
  type: 'circle' | 'rect' | 'path'
  args: any[]
  fill?: string
  stroke?: string
  roughness?: number
  strokeWidth?: number
}

const VARIANT_SPECS: Record<number, ShapeSpec[]> = {
  0: [
    // Head & hair
    { type: 'circle', args: [18, 11, 15], fill: '#52525b', stroke: '#27272a', roughness: 0.8 },
    { type: 'path', args: ['M12 9 C13 5, 23 4, 25 9 C22 7, 14 7, 12 9 Z'], fill: '#3f3f46', stroke: '#18181b', roughness: 0.7 },
    // Neck & Torso
    { type: 'rect', args: [16, 18, 4, 3], fill: '#52525b', stroke: '#27272a', roughness: 0.6 },
    { type: 'path', args: ['M10 21 C12 20, 24 20, 26 21 C28 23, 28 36, 27 41 C24 42, 12 42, 9 41 C8 36, 8 23, 10 21 Z'], fill: '#52525b', stroke: '#27272a', roughness: 0.9 },
    // Arms
    { type: 'path', args: ['M9 22 C7 25, 6 32, 6 36 C6 38, 7 39, 8 38 C9 36, 10 30, 10 26 Z'], fill: '#52525b', stroke: '#27272a', roughness: 0.8 },
    { type: 'path', args: ['M27 22 C29 25, 30 32, 30 36 C30 38, 29 39, 28 38 C27 36, 26 30, 26 26 Z'], fill: '#52525b', stroke: '#27272a', roughness: 0.8 },
    // Legs
    { type: 'path', args: ['M12 41 L12 59 C12 61, 8 61, 8 61 L8 59 L11 41 Z'], fill: '#3f3f46', stroke: '#18181b', roughness: 0.8 },
    { type: 'path', args: ['M24 41 L24 59 C24 61, 28 61, 28 61 L28 59 L25 41 Z'], fill: '#3f3f46', stroke: '#18181b', roughness: 0.8 },
  ],
  1: [
    // Head with curly hair
    { type: 'circle', args: [19, 11, 15], fill: '#52525b', stroke: '#27272a', roughness: 0.8 },
    { type: 'path', args: ['M11 9 C11 4, 27 4, 27 9 C28 12, 26 14, 26 14 C26 12, 24 7, 19 7 C14 7, 12 11, 11 9 Z'], fill: '#3f3f46', stroke: '#18181b', roughness: 0.8 },
    // Neck & Torso
    { type: 'rect', args: [17, 18, 4, 3], fill: '#52525b', stroke: '#27272a', roughness: 0.6 },
    { type: 'path', args: ['M11 21 C13 20, 25 20, 27 21 C28 25, 27 37, 26 41 C23 42, 13 42, 11 41 C9 37, 9 25, 11 21 Z'], fill: '#52525b', stroke: '#27272a', roughness: 0.9 },
    // Left arm on hip (bent), Right arm relaxed
    { type: 'path', args: ['M11 22 L5 29 L9 35 L10 33 L7 29 L11 25 Z'], fill: '#52525b', stroke: '#27272a', roughness: 0.8 },
    { type: 'path', args: ['M27 22 C29 26, 29 33, 29 37 C29 39, 28 39, 27 38 C26 35, 25 29, 25 25 Z'], fill: '#52525b', stroke: '#27272a', roughness: 0.8 },
    // Legs
    { type: 'path', args: ['M13 41 L12 59 C12 61, 8 61, 8 61 L9 59 L13 41 Z'], fill: '#3f3f46', stroke: '#18181b', roughness: 0.8 },
    { type: 'path', args: ['M23 41 L24 59 C24 61, 28 61, 28 61 L27 59 L23 41 Z'], fill: '#3f3f46', stroke: '#18181b', roughness: 0.8 },
  ],
  2: [
    // Head with cap/beanie
    { type: 'circle', args: [17, 12, 14], fill: '#52525b', stroke: '#27272a', roughness: 0.8 },
    { type: 'path', args: ['M10 11 C10 6, 24 5, 25 11 C26 12, 9 12, 10 11 Z'], fill: '#4b5563', stroke: '#1f2937', roughness: 0.7 },
    // Neck & Torso
    { type: 'rect', args: [15, 19, 4, 3], fill: '#52525b', stroke: '#27272a', roughness: 0.6 },
    { type: 'path', args: ['M10 22 C13 21, 23 21, 25 22 C27 26, 26 36, 25 41 C22 42, 13 42, 10 41 C9 36, 9 26, 10 22 Z'], fill: '#52525b', stroke: '#27272a', roughness: 0.9 },
    // Waving right arm, left arm relaxed
    { type: 'path', args: ['M25 23 L31 16 L29 11 L31 11 L33 16 L27 25 Z'], fill: '#52525b', stroke: '#27272a', roughness: 0.8 },
    { type: 'path', args: ['M10 23 C8 27, 7 34, 8 38 C8 39, 9 39, 10 38 C11 35, 12 29, 12 25 Z'], fill: '#52525b', stroke: '#27272a', roughness: 0.8 },
    // Legs
    { type: 'path', args: ['M12 41 L13 59 C13 61, 9 61, 9 61 L10 59 L13 41 Z'], fill: '#3f3f46', stroke: '#18181b', roughness: 0.8 },
    { type: 'path', args: ['M23 41 L22 59 C22 61, 26 61, 26 61 L25 59 L22 41 Z'], fill: '#3f3f46', stroke: '#18181b', roughness: 0.8 },
  ],
  3: [
    // Head & hair
    { type: 'circle', args: [18, 11, 15], fill: '#52525b', stroke: '#27272a', roughness: 0.8 },
    { type: 'path', args: ['M11 9 C11 5, 25 4, 25 8 C23 7, 13 7, 11 9 Z'], fill: '#3f3f46', stroke: '#18181b', roughness: 0.7 },
    // Neck & Torso
    { type: 'rect', args: [16, 18, 4, 3], fill: '#52525b', stroke: '#27272a', roughness: 0.6 },
    { type: 'path', args: ['M10 21 C12 20, 24 20, 26 21 C27 25, 27 37, 25 41 C22 42, 13 42, 10 41 C9 37, 9 25, 10 21 Z'], fill: '#52525b', stroke: '#27272a', roughness: 0.9 },
    // Arms holding clipboard
    { type: 'path', args: ['M9 22 L14 30 L18 30 L11 23 Z'], fill: '#52525b', stroke: '#27272a', roughness: 0.8 },
    { type: 'path', args: ['M26 22 L20 30 L17 30 L24 23 Z'], fill: '#52525b', stroke: '#27272a', roughness: 0.8 },
    // Clipboard / organizer flyer
    { type: 'rect', args: [14, 25, 8, 11], fill: '#a1a1aa', stroke: '#3f3f46', roughness: 0.7, strokeWidth: 1 },
    // Legs
    { type: 'path', args: ['M12 41 L12 59 C12 61, 8 61, 8 61 L8 59 L11 41 Z'], fill: '#3f3f46', stroke: '#18181b', roughness: 0.8 },
    { type: 'path', args: ['M24 41 L24 59 C24 61, 28 61, 28 61 L28 59 L25 41 Z'], fill: '#3f3f46', stroke: '#18181b', roughness: 0.8 },
  ],
  4: [
    // Head with topknot / hair bun
    { type: 'circle', args: [17, 12, 14], fill: '#52525b', stroke: '#27272a', roughness: 0.8 },
    { type: 'circle', args: [16, 4, 6.4], fill: '#3f3f46', stroke: '#18181b', roughness: 0.7 },
    // Neck & Torso
    { type: 'rect', args: [15, 19, 4, 3], fill: '#52525b', stroke: '#27272a', roughness: 0.6 },
    { type: 'path', args: ['M9 22 C12 21, 23 21, 25 22 C27 26, 26 36, 25 41 C22 42, 12 42, 9 41 C8 36, 8 26, 9 22 Z'], fill: '#52525b', stroke: '#27272a', roughness: 0.9 },
    // Left arm gesturing, right arm relaxed
    { type: 'path', args: ['M10 23 L4 28 L7 32 L11 26 Z'], fill: '#52525b', stroke: '#27272a', roughness: 0.8 },
    { type: 'path', args: ['M25 23 L28 29 L25 34 L23 26 Z'], fill: '#52525b', stroke: '#27272a', roughness: 0.8 },
    // Legs
    { type: 'path', args: ['M11 41 L9 59 C9 61, 5 61, 5 61 L7 59 L11 41 Z'], fill: '#3f3f46', stroke: '#18181b', roughness: 0.8 },
    { type: 'path', args: ['M22 41 L24 59 C24 61, 28 61, 28 61 L26 59 L22 41 Z'], fill: '#3f3f46', stroke: '#18181b', roughness: 0.8 },
  ],
}

// Module-level cache to keep generation instant and consistent across renders
const pathCache = new Map<string, PathInfo[]>()

function generatePaths(variant: number, seedVal?: number): PathInfo[] {
  const cacheKey = `${variant}_${seedVal ?? 'def'}`
  const cached = pathCache.get(cacheKey)
  if (cached) return cached

  const specs = VARIANT_SPECS[variant] ?? VARIANT_SPECS[0] ?? []
  const baseSeed = seedVal ?? (variant * 31 + 7)
  const result: PathInfo[] = []

  specs.forEach((spec, idx) => {
    const seed = baseSeed + idx * 13
    const opts = {
      fill: spec.fill,
      fillStyle: 'solid' as const,
      stroke: spec.stroke ?? '#27272a',
      roughness: spec.roughness ?? 0.8,
      strokeWidth: spec.strokeWidth ?? 1.1,
      seed,
    }

    let drawable: any
    if (spec.type === 'circle') {
      drawable = roughGen.circle(spec.args[0], spec.args[1], spec.args[2], opts)
    } else if (spec.type === 'rect') {
      drawable = roughGen.rectangle(spec.args[0], spec.args[1], spec.args[2], spec.args[3], opts)
    } else {
      drawable = roughGen.path(spec.args[0], opts)
    }

    const paths = roughGen.toPaths(drawable)
    result.push(...paths)
  })

  pathCache.set(cacheKey, result)
  return result
}

const silhouettePaths = computed(() => {
  return generatePaths(activeVariant.value, props.seed)
})
</script>

<template>
  <div class="tenant-figure" :title="label">
    <svg
      viewBox="0 0 36 64"
      class="silhouette-svg"
      role="img"
      :aria-label="label"
    >
      <path
        v-for="(p, idx) in silhouettePaths"
        :key="idx"
        :d="p.d"
        :stroke="p.stroke"
        :stroke-width="p.strokeWidth"
        :fill="p.fill"
      />
    </svg>
  </div>
</template>

<style scoped>
.tenant-figure {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  user-select: none;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.tenant-figure:hover {
  transform: translateY(-2px) scale(1.08);
}

.silhouette-svg {
  width: auto;
  height: 85%;
  max-height: 88px;
  min-height: 38px;
  overflow: visible;
}
</style>
