<script setup lang="ts">
import { computed } from "vue";
import { roughGen } from "../utils/rough";
import type { PathInfo } from "../utils/rough";
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

const tooltip = computed(() => {
  const status = props.isEvicted
    ? "Evicted"
    : props.isInstigator
      ? "Union Instigator"
      : props.inUnion
        ? "Union Member"
        : "Resident";
  return `${props.label} (${status}) — Click for actions`;
});
</script>

<template>
  <div
    class="building-window"
    :class="{
      'is-instigator': isInstigator,
      'is-union': inUnion,
      'is-evicted': isEvicted,
    }"
    :title="tooltip"
    role="button"
    tabindex="0"
    @click="emit('select', $event)"
    @contextmenu.prevent="emit('select', $event)"
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
        :color="color"
        :is-instigator="isInstigator"
        :in-union="inUnion"
        :is-evicted="isEvicted"
      />
    </div>
  </div>
</template>

<style scoped>
.building-window {
  position: relative;
  aspect-ratio: 0.68;
  display: flex;
  align-items: center;
  justify-content: center;
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

.building-window:hover .window-pane-interior {
  background: radial-gradient(circle, rgba(254, 243, 199, 0.5) 0%, transparent 75%);
}

.building-window.is-union .window-pane-interior {
  background: radial-gradient(circle, rgba(254, 240, 138, 0.25) 0%, transparent 80%);
}

.building-window.is-instigator .window-pane-interior {
  background: radial-gradient(circle, rgba(253, 224, 71, 0.35) 0%, transparent 80%);
}
</style>
