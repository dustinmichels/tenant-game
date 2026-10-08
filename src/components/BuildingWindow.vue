<script setup lang="ts">
import { computed } from "vue";
import { roughGen } from "../utils/rough";
import type { PathInfo } from "../utils/rough";
import { generateBalconyPaths } from "../utils/buildingArchitecture";
import TenantSilhouette from "./TenantSilhouette.vue";

const props = withDefaults(
  defineProps<{
    variant?: number;
    label?: string;
    seed?: number;
    color?: string;
    isInstigator?: boolean;
    inUnion?: boolean;
    isEvicted?: boolean;
    isNeighborhoodSetup?: boolean;
    hasBegun?: boolean;
    hasBalcony?: boolean;
  }>(),
  {
    variant: 0,
    label: "Resident",
    seed: undefined,
    color: undefined,
    isInstigator: false,
    inUnion: false,
    isEvicted: false,
    isNeighborhoodSetup: undefined,
    hasBegun: true,
    hasBalcony: false,
  },
);

const isSetupGateActive = computed(() => {
  if (props.isNeighborhoodSetup !== undefined) return props.isNeighborhoodSetup;
  if (props.hasBegun !== undefined) return !props.hasBegun;
  return false;
});
const isGameplayActive = computed(() => !isSetupGateActive.value);
const emit = defineEmits<{
  (e: "select", event: MouseEvent): void;
}>();

const windowSeed = computed(() => props.seed ?? 101);

const windowPaths = computed<PathInfo[]>(() => {
  const s = windowSeed.value;
  // Streamlined minimal window frame matching 0.68 aspect ratio
  const frame = roughGen.rectangle(1.5, 1.5, 33, 46.5, {
    roughness: 0.45,
    stroke: "#786957",
    strokeWidth: 1.0,
    fill: "#fffdfa",
    fillStyle: "solid",
    seed: s,
  });

  // Subtle clean sill line
  const sill = roughGen.line(0, 49.5, 36, 49.5, {
    roughness: 0.35,
    stroke: "#5c4f3d",
    strokeWidth: 1.2,
    seed: s + 1,
  });

  return [frame, sill].flatMap((d) => roughGen.toPaths(d));
});

const balconyPaths = computed<PathInfo[]>(() => {
  if (!props.hasBalcony) return [];
  return generateBalconyPaths(
    windowSeed.value + 40,
    "#5c4f3d",
    props.inUnion && isGameplayActive.value,
  );
});

const tooltip = computed(() => {
  if (isSetupGateActive.value) {
    return `${props.label} (Resident)`;
  }
  const status = props.isEvicted
    ? "Evicted"
    : props.isInstigator
      ? "Union Instigator"
      : props.inUnion
        ? "Union Member"
        : "Resident";
  return `${props.label} (${status}) — Click for actions`;
});

function handleClick(e: MouseEvent) {
  if (!isGameplayActive.value) return;
  emit("select", e);
}
</script>

<template>
  <div
    class="building-window"
    :class="{
      'is-instigator': isInstigator && isGameplayActive,
      'is-union': inUnion && isGameplayActive,
      'is-evicted': isEvicted && isGameplayActive,
      'is-interactive': isGameplayActive,
    }"
    :title="tooltip"
    :role="isGameplayActive ? 'button' : undefined"
    :tabindex="isGameplayActive ? 0 : -1"
    @click="handleClick($event)"
    @contextmenu.prevent="handleClick($event)"
  >
    <!-- Sketched rough window frame -->
    <svg viewBox="0 0 36 53" class="window-svg-frame" aria-hidden="true">
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
        :color="isGameplayActive ? color : undefined"
        :is-instigator="isGameplayActive && isInstigator"
        :in-union="isGameplayActive && inUnion"
        :is-evicted="isGameplayActive && isEvicted"
      />
    </div>

    <!-- Optional Decorative Window Balcony -->
    <svg v-if="hasBalcony" viewBox="0 0 36 53" class="window-balcony-svg" aria-hidden="true">
      <path
        v-for="(p, idx) in balconyPaths"
        :key="idx"
        :d="p.d"
        :stroke="p.stroke"
        :stroke-width="p.strokeWidth"
        :fill="p.fill || 'none'"
      />
    </svg>
  </div>
</template>

<style scoped>
.building-window {
  position: relative;
  aspect-ratio: 0.68;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
}

.building-window.is-interactive {
  cursor: context-menu;
}

.window-svg-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
}

.window-balcony-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
  z-index: 3;
}

.window-pane-interior {
  position: relative;
  z-index: 1;
  width: 90%;
  height: 92%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 1px;
  border-radius: 2px;
  transition: background-color 0.2s ease;
}

.building-window.is-interactive:hover .window-pane-interior {
  background: radial-gradient(circle, rgba(254, 243, 199, 0.5) 0%, transparent 75%);
}
.building-window.is-union .window-pane-interior {
  background: radial-gradient(circle, rgba(254, 240, 138, 0.25) 0%, transparent 80%);
}

.building-window.is-instigator .window-pane-interior {
  background: radial-gradient(circle, rgba(253, 224, 71, 0.35) 0%, transparent 80%);
}
</style>
