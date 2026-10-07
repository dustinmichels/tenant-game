<script setup lang="ts">
import { computed } from "vue";
import { roughGen } from "../utils/rough";
import type { PathInfo } from "../utils/rough";
import RoughBox from "./RoughBox.vue";
import { formatCurrency, formatCompactCurrency } from "../utils/currency";
import { GripVertical, Building2, Coins } from "lucide-vue-next";

const props = withDefaults(
  defineProps<{
    landlordMoney?: number;
    canMove?: boolean;
    editBuildings?: boolean;
  }>(),
  {
    landlordMoney: 0,
    canMove: true,
    editBuildings: undefined,
  },
);

const emit = defineEmits<{
  (e: "pointerdown-drag", event: PointerEvent): void;
}>();

const isEditable = computed(() =>
  props.editBuildings !== undefined ? props.editBuildings : props.canMove,
);

function handleDragPointerDown(e: PointerEvent) {
  if (!isEditable.value) return;
  if (e.button !== 0) return;
  emit("pointerdown-drag", e);
}

// Streamlined minimal rooftop trim matching the game's hand-drawn style
const roofPaths = computed<PathInfo[]>(() => {
  const cornice = roughGen.line(0, 8, 140, 8, {
    roughness: 0.5,
    stroke: "#0369a1",
    strokeWidth: 1.2,
    seed: 801,
  });
  const parapetCap = roughGen.line(0, 3, 140, 3, {
    roughness: 0.4,
    stroke: "#0284c7",
    strokeWidth: 1.0,
    seed: 802,
  });
  return [cornice, parapetCap].flatMap((d) => roughGen.toPaths(d));
});

// Hand-drawn landlord figure (in suit with red tie)
const landlordFigurePaths = computed<PathInfo[]>(() => {
  const paths: PathInfo[] = [];

  // Head
  const head = roughGen.circle(28, 14, 16, {
    roughness: 0.7,
    stroke: "#18181b",
    fill: "#3f3f46",
    fillStyle: "solid",
    seed: 810,
  });
  paths.push(...roughGen.toPaths(head));

  // Top hat or slick hair trim
  const hatBrim = roughGen.line(16, 10, 40, 10, {
    roughness: 0.6,
    stroke: "#09090b",
    strokeWidth: 2.2,
    seed: 811,
  });
  const hatTop = roughGen.rectangle(20, 2, 16, 8, {
    roughness: 0.6,
    stroke: "#09090b",
    fill: "#18181b",
    fillStyle: "solid",
    strokeWidth: 1.2,
    seed: 812,
  });
  paths.push(...roughGen.toPaths(hatBrim), ...roughGen.toPaths(hatTop));

  // Torso / Dark corporate suit jacket
  const suit = roughGen.polygon(
    [
      [14, 25],
      [42, 25],
      [44, 52],
      [12, 52],
    ],
    {
      roughness: 0.8,
      stroke: "#09090b",
      fill: "#18181b",
      fillStyle: "solid",
      strokeWidth: 1.3,
      seed: 813,
    },
  );
  paths.push(...roughGen.toPaths(suit));

  // White shirt collar
  const shirt = roughGen.polygon(
    [
      [24, 25],
      [32, 25],
      [28, 33],
    ],
    {
      roughness: 0.5,
      stroke: "#e2e8f0",
      fill: "#ffffff",
      fillStyle: "solid",
      strokeWidth: 0.8,
      seed: 814,
    },
  );
  paths.push(...roughGen.toPaths(shirt));

  // Red power tie
  const tie = roughGen.polygon(
    [
      [27, 28],
      [29, 28],
      [30, 42],
      [28, 45],
      [26, 42],
    ],
    {
      roughness: 0.5,
      stroke: "#7f1d1d",
      fill: "#dc2626",
      fillStyle: "solid",
      strokeWidth: 1.0,
      seed: 815,
    },
  );
  paths.push(...roughGen.toPaths(tie));

  // Left arm holding gold contract / briefcase
  const briefcase = roughGen.rectangle(38, 38, 12, 10, {
    roughness: 0.6,
    stroke: "#78350f",
    fill: "#b45309",
    fillStyle: "solid",
    strokeWidth: 1.0,
    seed: 816,
  });
  paths.push(...roughGen.toPaths(briefcase));

  return paths;
});
</script>

<template>
  <div class="landlord-office-wrapper glass-skyscraper-card" title="Landlord, Inc.">
    <!-- Reposition handle (only in edit mode) -->
    <transition name="edit-control-pop">
      <button
        v-if="isEditable"
        type="button"
        class="building-drag-handle"
        title="Drag to move Landlord, Inc."
        aria-label="Drag to move Landlord, Inc."
        @pointerdown.stop.prevent="handleDragPointerDown"
      >
        <GripVertical :size="14" :stroke-width="1.5" class="drag-icon" aria-hidden="true" />
        <span class="drag-label">Move</span>
      </button>
    </transition>

    <RoughBox
      :stroke="'#0369a1'"
      :fill="'#f0f9ff'"
      fill-style="solid"
      :roughness="0.6"
      :bowing="0.3"
      :stroke-width="1.6"
      :seed="800"
      class="office-rough-box"
    >
      <div class="office-inner">
        <!-- Rooftop trim (draggable) -->
        <div
          class="roof-area"
          :class="{ 'is-draggable': isEditable }"
          :title="isEditable ? 'Drag to move Landlord, Inc.' : undefined"
          @pointerdown="handleDragPointerDown"
        >
          <svg viewBox="0 0 140 10" class="roof-svg" preserveAspectRatio="none" aria-hidden="true">
            <path
              v-for="(p, idx) in roofPaths"
              :key="idx"
              :d="p.d"
              :stroke="p.stroke"
              :stroke-width="p.strokeWidth"
              :fill="p.fill || 'none'"
            />
          </svg>
        </div>

        <!-- Corporate Plaque / Signboard -->
        <div class="header-plaque-area">
          <RoughBox
            :stroke="'#0284c7'"
            :fill="'#0f172a'"
            fill-style="solid"
            :roughness="0.5"
            :stroke-width="1.1"
            :seed="808"
            class="plaque-box"
          >
            <div class="plaque-content">
              <Building2 :size="15" :stroke-width="1.5" class="corp-icon" aria-hidden="true" />
              <span class="corp-title">Landlord, Inc.</span>
            </div>
          </RoughBox>
        </div>

        <!-- Landlord Office: Figure & Funds Ticker -->
        <div
          class="landlord-body-area"
          :class="{ 'is-draggable': isEditable }"
          :title="isEditable ? 'Drag to move Landlord, Inc.' : undefined"
          @pointerdown="handleDragPointerDown"
        >
          <div class="landlord-figure-container" title="The Landlord">
            <svg viewBox="0 0 56 64" class="landlord-svg" role="img" aria-label="The Landlord">
              <path
                v-for="(p, idx) in landlordFigurePaths"
                :key="idx"
                :d="p.d"
                :stroke="p.stroke"
                :stroke-width="p.strokeWidth"
                :fill="p.fill || 'none'"
              />
            </svg>
          </div>

          <!-- Digital Executive Funds Ticker -->
          <span
            v-if="landlordMoney !== undefined"
            class="landlord-building-funds"
            :title="`Landlord Funds: ${formatCurrency(landlordMoney)}`"
          >
            <Coins :size="13" :stroke-width="1.5" class="funds-icon" aria-hidden="true" />
            <span class="funds-amount">{{ formatCompactCurrency(landlordMoney) }}</span>
          </span>
        </div>
      </div>
    </RoughBox>
  </div>
</template>

<style scoped>
.landlord-office-wrapper {
  position: relative;
  width: 144px;
  padding-top: 14px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  user-select: none;
  touch-action: none;
  transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.landlord-office-wrapper:hover {
  transform: translateY(-2px);
}

/* Drag indicator handle on top */
.building-drag-handle {
  position: absolute;
  top: 0px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 25;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 2.5px 10px 2.5px 8px;
  background-color: #f0f9ff;
  border: 1.5px solid #0369a1;
  border-radius: 14px;
  color: #075985;
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: grab;
  user-select: none;
  touch-action: none;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.14);
  transition:
    transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1),
    background-color 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.building-drag-handle:hover {
  background-color: #e0f2fe;
  border-color: #0284c7;
  color: #0369a1;
  transform: translateX(-50%) translateY(-1px) scale(1.06);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.18);
}

.building-drag-handle:active {
  cursor: grabbing;
  transform: translateX(-50%) translateY(0) scale(0.98);
}

.drag-icon {
  font-size: 13px;
  line-height: 1;
  opacity: 0.85;
}

.drag-label {
  line-height: 1.2;
}

.office-rough-box {
  width: 100%;
  height: 100%;
}

.office-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding-bottom: 8px;
  background: linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 35%, #bae6fd 100%);
  border-radius: 4px;
  overflow: hidden;
}

/* 1. Rooftop Trim */
.roof-area {
  position: relative;
  width: 100%;
  height: 10px;
  cursor: default;
  touch-action: none;
}

.roof-area.is-draggable {
  cursor: grab;
}

.roof-area.is-draggable:active {
  cursor: grabbing;
}

.roof-svg {
  width: 100%;
  height: 100%;
  display: block;
}

/* 2. Corporate Plaque Signboard */
.header-plaque-area {
  width: 92%;
  padding: 1px 0 4px;
}

.plaque-box {
  width: 100%;
}

.plaque-content {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px 4px;
  gap: 5px;
  background-color: #0f172a;
}

.corp-icon {
  font-size: 11px;
  line-height: 1;
  color: #f8fafc;
}

.corp-title {
  font-family: inherit;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #f8fafc;
  text-transform: uppercase;
  white-space: nowrap;
}

/* 3. Landlord Office Body Area */
.landlord-body-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 4px 6px;
  width: 100%;
  cursor: default;
  touch-action: none;
}

.landlord-body-area.is-draggable {
  cursor: grab;
}

.landlord-body-area.is-draggable:active {
  cursor: grabbing;
}

.landlord-figure-container {
  position: relative;
  width: 48px;
  height: 54px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  transition: transform 0.2s ease;
}

.landlord-figure-container:hover {
  transform: scale(1.05);
}

.landlord-svg {
  width: 100%;
  height: 100%;
  display: block;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.15));
}

.landlord-building-funds {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 800;
  color: #0369a1;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  box-shadow: 0 1px 3px rgba(3, 105, 161, 0.12);
  padding: 1.5px 7px;
  border-radius: 10px;
  font-variant-numeric: tabular-nums;
}

.funds-icon {
  font-size: 9px;
  line-height: 1;
}

.funds-amount {
  letter-spacing: 0.02em;
}

/* Edit mode controls pop animation */
.edit-control-pop-enter-active,
.edit-control-pop-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.building-drag-handle.edit-control-pop-enter-from,
.building-drag-handle.edit-control-pop-leave-to {
  opacity: 0;
  transform: translateX(-50%) scale(0.4);
}
</style>
