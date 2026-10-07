<script setup lang="ts">
import { computed } from "vue";
import { roughGen } from "../utils/rough";
import type { PathInfo } from "../utils/rough";

const props = withDefaults(
  defineProps<{
    variant?: number;
    label?: string;
    seed?: number;
    color?: string;
    isInstigator?: boolean;
    inUnion?: boolean;
    isEvicted?: boolean;
  }>(),
  {
    variant: 0,
    label: "Resident",
    seed: undefined,
    color: undefined,
    isInstigator: false,
    inUnion: false,
    isEvicted: false,
  },
);

const activeVariant = computed(() => Math.abs(props.variant) % 5);

interface ShapeSpec {
  type: "circle" | "rect" | "path";
  args: any[];
  fill?: string;
  stroke?: string;
  roughness?: number;
  strokeWidth?: number;
}

const VARIANT_SPECS: Record<number, ShapeSpec[]> = {
  0: [
    // Head & hair
    { type: "circle", args: [18, 11, 15], fill: "#52525b", stroke: "#27272a", roughness: 0.8 },
    {
      type: "path",
      args: ["M12 9 C13 5, 23 4, 25 9 C22 7, 14 7, 12 9 Z"],
      fill: "#3f3f46",
      stroke: "#18181b",
      roughness: 0.7,
    },
    // Neck & Torso
    { type: "rect", args: [16, 18, 4, 3], fill: "#52525b", stroke: "#27272a", roughness: 0.6 },
    {
      type: "path",
      args: [
        "M10 21 C12 20, 24 20, 26 21 C28 23, 28 36, 27 41 C24 42, 12 42, 9 41 C8 36, 8 23, 10 21 Z",
      ],
      fill: "#52525b",
      stroke: "#27272a",
      roughness: 0.9,
    },
    // Arms
    {
      type: "path",
      args: ["M9 22 C7 25, 6 32, 6 36 C6 38, 7 39, 8 38 C9 36, 10 30, 10 26 Z"],
      fill: "#52525b",
      stroke: "#27272a",
      roughness: 0.8,
    },
    {
      type: "path",
      args: ["M27 22 C29 25, 30 32, 30 36 C30 38, 29 39, 28 38 C27 36, 26 30, 26 26 Z"],
      fill: "#52525b",
      stroke: "#27272a",
      roughness: 0.8,
    },
    // Legs
    {
      type: "path",
      args: ["M12 41 L12 59 C12 61, 8 61, 8 61 L8 59 L11 41 Z"],
      fill: "#3f3f46",
      stroke: "#18181b",
      roughness: 0.8,
    },
    {
      type: "path",
      args: ["M24 41 L24 59 C24 61, 28 61, 28 61 L28 59 L25 41 Z"],
      fill: "#3f3f46",
      stroke: "#18181b",
      roughness: 0.8,
    },
  ],
  1: [
    // Head with curly hair
    { type: "circle", args: [19, 11, 15], fill: "#52525b", stroke: "#27272a", roughness: 0.8 },
    {
      type: "path",
      args: [
        "M11 9 C11 4, 27 4, 27 9 C28 12, 26 14, 26 14 C26 12, 24 7, 19 7 C14 7, 12 11, 11 9 Z",
      ],
      fill: "#3f3f46",
      stroke: "#18181b",
      roughness: 0.8,
    },
    // Neck & Torso
    { type: "rect", args: [17, 18, 4, 3], fill: "#52525b", stroke: "#27272a", roughness: 0.6 },
    {
      type: "path",
      args: [
        "M11 21 C13 20, 25 20, 27 21 C28 25, 27 37, 26 41 C23 42, 13 42, 11 41 C9 37, 9 25, 11 21 Z",
      ],
      fill: "#52525b",
      stroke: "#27272a",
      roughness: 0.9,
    },
    // Left arm on hip (bent), Right arm relaxed
    {
      type: "path",
      args: ["M11 22 L5 29 L9 35 L10 33 L7 29 L11 25 Z"],
      fill: "#52525b",
      stroke: "#27272a",
      roughness: 0.8,
    },
    {
      type: "path",
      args: ["M27 22 C29 26, 29 33, 29 37 C29 39, 28 39, 27 38 C26 35, 25 29, 25 25 Z"],
      fill: "#52525b",
      stroke: "#27272a",
      roughness: 0.8,
    },
    // Legs
    {
      type: "path",
      args: ["M13 41 L12 59 C12 61, 8 61, 8 61 L9 59 L13 41 Z"],
      fill: "#3f3f46",
      stroke: "#18181b",
      roughness: 0.8,
    },
    {
      type: "path",
      args: ["M23 41 L24 59 C24 61, 28 61, 28 61 L27 59 L23 41 Z"],
      fill: "#3f3f46",
      stroke: "#18181b",
      roughness: 0.8,
    },
  ],
  2: [
    // Head with cap/beanie
    { type: "circle", args: [17, 12, 14], fill: "#52525b", stroke: "#27272a", roughness: 0.8 },
    {
      type: "path",
      args: ["M10 11 C10 6, 24 5, 25 11 C26 12, 9 12, 10 11 Z"],
      fill: "#4b5563",
      stroke: "#1f2937",
      roughness: 0.7,
    },
    // Neck & Torso
    { type: "rect", args: [15, 19, 4, 3], fill: "#52525b", stroke: "#27272a", roughness: 0.6 },
    {
      type: "path",
      args: [
        "M10 22 C13 21, 23 21, 25 22 C27 26, 26 36, 25 41 C22 42, 13 42, 10 41 C9 36, 9 26, 10 22 Z",
      ],
      fill: "#52525b",
      stroke: "#27272a",
      roughness: 0.9,
    },
    // Waving right arm, left arm relaxed
    {
      type: "path",
      args: ["M25 23 L31 16 L29 11 L31 11 L33 16 L27 25 Z"],
      fill: "#52525b",
      stroke: "#27272a",
      roughness: 0.8,
    },
    {
      type: "path",
      args: ["M10 23 C8 27, 7 34, 8 38 C8 39, 9 39, 10 38 C11 35, 12 29, 12 25 Z"],
      fill: "#52525b",
      stroke: "#27272a",
      roughness: 0.8,
    },
    // Legs
    {
      type: "path",
      args: ["M12 41 L13 59 C13 61, 9 61, 9 61 L10 59 L13 41 Z"],
      fill: "#3f3f46",
      stroke: "#18181b",
      roughness: 0.8,
    },
    {
      type: "path",
      args: ["M23 41 L22 59 C22 61, 26 61, 26 61 L25 59 L22 41 Z"],
      fill: "#3f3f46",
      stroke: "#18181b",
      roughness: 0.8,
    },
  ],
  3: [
    // Head with bob / shoulder-length hair
    { type: "circle", args: [18, 11, 15], fill: "#52525b", stroke: "#27272a", roughness: 0.8 },
    {
      type: "path",
      args: ["M10 16 C9 9, 11 4, 18 4 C25 4, 27 9, 26 16 C25 15, 23 9, 18 8 C13 9, 11 15, 10 16 Z"],
      fill: "#3f3f46",
      stroke: "#18181b",
      roughness: 0.7,
    },
    // Neck & Torso
    { type: "rect", args: [16, 18, 4, 3], fill: "#52525b", stroke: "#27272a", roughness: 0.6 },
    {
      type: "path",
      args: [
        "M10 21 C12 20, 24 20, 26 21 C27 25, 27 37, 25 41 C22 42, 13 42, 10 41 C9 37, 9 25, 10 21 Z",
      ],
      fill: "#52525b",
      stroke: "#27272a",
      roughness: 0.9,
    },
    // Hands in pockets (casual relaxed stance with flared elbows)
    {
      type: "path",
      args: ["M10 22 C6 27, 5 33, 6 36 C7 38, 10 39, 11 36 C10 33, 10 28, 11 24 Z"],
      fill: "#52525b",
      stroke: "#27272a",
      roughness: 0.8,
    },
    {
      type: "path",
      args: ["M26 22 C30 27, 31 33, 30 36 C29 38, 26 39, 25 36 C26 33, 26 28, 25 24 Z"],
      fill: "#52525b",
      stroke: "#27272a",
      roughness: 0.8,
    },
    // Legs
    {
      type: "path",
      args: ["M12 41 L12 59 C12 61, 8 61, 8 61 L8 59 L11 41 Z"],
      fill: "#3f3f46",
      stroke: "#18181b",
      roughness: 0.8,
    },
    {
      type: "path",
      args: ["M24 41 L24 59 C24 61, 28 61, 28 61 L28 59 L25 41 Z"],
      fill: "#3f3f46",
      stroke: "#18181b",
      roughness: 0.8,
    },
  ],
  4: [
    // Head with topknot / hair bun
    { type: "circle", args: [17, 12, 14], fill: "#52525b", stroke: "#27272a", roughness: 0.8 },
    { type: "circle", args: [16, 4, 6.4], fill: "#3f3f46", stroke: "#18181b", roughness: 0.7 },
    // Neck & Torso
    { type: "rect", args: [15, 19, 4, 3], fill: "#52525b", stroke: "#27272a", roughness: 0.6 },
    {
      type: "path",
      args: [
        "M9 22 C12 21, 23 21, 25 22 C27 26, 26 36, 25 41 C22 42, 12 42, 9 41 C8 36, 8 26, 9 22 Z",
      ],
      fill: "#52525b",
      stroke: "#27272a",
      roughness: 0.9,
    },
    // Left arm gesturing, right arm relaxed
    {
      type: "path",
      args: ["M10 23 L4 28 L7 32 L11 26 Z"],
      fill: "#52525b",
      stroke: "#27272a",
      roughness: 0.8,
    },
    {
      type: "path",
      args: ["M25 23 L28 29 L25 34 L23 26 Z"],
      fill: "#52525b",
      stroke: "#27272a",
      roughness: 0.8,
    },
    // Legs
    {
      type: "path",
      args: ["M11 41 L9 59 C9 61, 5 61, 5 61 L7 59 L11 41 Z"],
      fill: "#3f3f46",
      stroke: "#18181b",
      roughness: 0.8,
    },
    {
      type: "path",
      args: ["M22 41 L24 59 C24 61, 28 61, 28 61 L26 59 L22 41 Z"],
      fill: "#3f3f46",
      stroke: "#18181b",
      roughness: 0.8,
    },
  ],
};

// Module-level cache to keep generation instant and consistent across renders
const pathCache = new Map<string, PathInfo[]>();

function generatePaths(variant: number, seedVal?: number, customColor?: string): PathInfo[] {
  const cacheKey = `${variant}_${seedVal ?? "def"}_${customColor ?? "neutral"}`;
  const cached = pathCache.get(cacheKey);
  if (cached) return cached;

  const specs = VARIANT_SPECS[variant] ?? VARIANT_SPECS[0] ?? [];
  const baseSeed = seedVal ?? variant * 31 + 7;
  const result: PathInfo[] = [];

  specs.forEach((spec, idx) => {
    const seed = baseSeed + idx * 13;
    let fill = spec.fill;
    if (customColor) {
      if (spec.fill === "#52525b" || spec.fill === "#4b5563" || spec.fill === "#3f3f46") {
        fill = customColor;
      }
    }

    const opts = {
      fill,
      fillStyle: "solid" as const,
      stroke: customColor ? "#18181b" : (spec.stroke ?? "#27272a"),
      roughness: spec.roughness ?? 0.8,
      strokeWidth: spec.strokeWidth ?? 1.1,
      seed,
    };

    let drawable: any;
    if (spec.type === "circle") {
      drawable = roughGen.circle(spec.args[0], spec.args[1], spec.args[2], opts);
    } else if (spec.type === "rect") {
      drawable = roughGen.rectangle(spec.args[0], spec.args[1], spec.args[2], spec.args[3], opts);
    } else {
      drawable = roughGen.path(spec.args[0], opts);
    }

    const paths = roughGen.toPaths(drawable);
    result.push(...paths);
  });

  pathCache.set(cacheKey, result);
  return result;
}

const silhouettePaths = computed(() => {
  return generatePaths(activeVariant.value, props.seed, props.color);
});

const evictionCrossPaths = computed<PathInfo[]>(() => {
  if (!props.isEvicted) return [];
  const s = (props.seed ?? 10) + 777;
  const line1 = roughGen.line(6, 10, 30, 54, {
    stroke: "#dc2626",
    strokeWidth: 2.2,
    roughness: 0.8,
    seed: s,
  });
  const line2 = roughGen.line(30, 10, 6, 54, {
    stroke: "#dc2626",
    strokeWidth: 2.2,
    roughness: 0.8,
    seed: s + 1,
  });
  return [line1, line2].flatMap((d) => roughGen.toPaths(d));
});
</script>

<template>
  <div
    class="tenant-figure"
    :class="{
      'is-instigator': isInstigator,
      'is-union': inUnion,
      'is-evicted': isEvicted,
    }"
    :title="isEvicted ? `${label} (Evicted)` : label"
  >
    <svg viewBox="0 0 36 64" class="silhouette-svg" role="img" :aria-label="label">
      <path
        v-for="(p, idx) in silhouettePaths"
        :key="idx"
        :d="p.d"
        :stroke="p.stroke"
        :stroke-width="p.strokeWidth"
        :fill="p.fill"
      />

      <!-- Light hand-drawn cross over avatar if evicted -->
      <g v-if="isEvicted" class="eviction-cross-group">
        <line
          x1="6"
          y1="10"
          x2="30"
          y2="54"
          stroke="#ffffff"
          stroke-width="4.5"
          stroke-linecap="round"
          opacity="0.8"
        />
        <line
          x1="30"
          y1="10"
          x2="6"
          y2="54"
          stroke="#ffffff"
          stroke-width="4.5"
          stroke-linecap="round"
          opacity="0.8"
        />
        <path
          v-for="(p, idx) in evictionCrossPaths"
          :key="`cross-${idx}`"
          :d="p.d"
          :stroke="p.stroke"
          :stroke-width="p.strokeWidth"
          fill="none"
          stroke-linecap="round"
        />
      </g>
    </svg>
    <!-- Star indicator for building instigator -->
    <span
      v-if="isInstigator"
      class="instigator-star"
      aria-label="Building Instigator"
      title="Building Instigator"
      >★</span
    >
  </div>
</template>

<style scoped>
.tenant-figure {
  position: relative;
  display: inline-flex;
  align-items: flex-end;
  justify-content: center;
  width: 100%;
  height: 100%;
  user-select: none;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.tenant-figure:hover {
  transform: translateY(-2px) scale(1.08);
}

.tenant-figure.is-evicted {
  opacity: 0.82;
  filter: grayscale(25%);
}

.silhouette-svg {
  width: auto;
  height: 96%;
  min-height: 20px;
  overflow: visible;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.1));
}

.instigator-star {
  position: absolute;
  top: -4px;
  right: -2px;
  font-size: 11px;
  line-height: 1;
  color: #f59e0b;
  text-shadow:
    0 0 3px rgba(0, 0, 0, 0.5),
    0 1px 1px #000;
  pointer-events: none;
  animation: star-pulse 2s ease-in-out infinite alternate;
}

@keyframes star-pulse {
  from {
    transform: scale(0.95);
  }
  to {
    transform: scale(1.15);
  }
}
</style>
