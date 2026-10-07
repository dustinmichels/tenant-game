<script setup lang="ts">
import { computed } from "vue";
import type { Building, Tenant, CoalitionGroup } from "../types/game";
import { isBuildingOrganized, getBuildingUnionCount } from "../utils/coalitions";
import { getTenantGridCols, PERSON_ASPECT_RATIO } from "../utils/layout";
import { BASELINE_PERSON_WIDTH } from "../utils/sizing";
import { roughGen, createSeed } from "../utils/rough";
import type { PathInfo } from "../utils/rough";
import { getContrastTextColor } from "../utils/colorTheory";
import RoughBox from "./RoughBox.vue";
import BuildingWindow from "./BuildingWindow.vue";
import { Pencil, Cable, GripVertical } from "lucide-vue-next";

const props = withDefaults(
  defineProps<{
    building: Building;
    effectiveColor?: string;
    isInCoalition?: boolean;
    coalitionNames?: string;
    isConnectingSource?: boolean;
    isConnectingTarget?: boolean;
    personWidth?: number;
    isOrganized?: boolean;
    unionCount?: number;
    coalitions?: CoalitionGroup[];
    canMove?: boolean;
    editBuildings?: boolean;
    hasBegun?: boolean;
  }>(),
  {
    effectiveColor: undefined,
    isInCoalition: false,
    coalitionNames: "",
    isConnectingSource: false,
    isConnectingTarget: false,
    personWidth: undefined,
    isOrganized: undefined,
    unionCount: undefined,
    coalitions: () => [],
    canMove: true,
    editBuildings: undefined,
    hasBegun: true,
  },
);
const emit = defineEmits<{
  (e: "tenant-select", payload: { event: MouseEvent; tenant: Tenant; building: Building }): void;
  (e: "adjust-tenants", building: Building): void;
  (e: "pointerdown-drag", event: PointerEvent, building: Building): void;
  (e: "start-thread", building: Building, event: PointerEvent): void;
}>();
const buildingSeed = computed(() =>
  createSeed(`building_${props.building.id}_${props.building.index}`),
);
const effectiveUnionCount = computed(() => {
  if (!props.hasBegun) return 0;
  if (props.unionCount !== undefined) return props.unionCount;
  return getBuildingUnionCount(props.building, props.coalitions);
});
const isOrganized = computed(() => {
  if (!props.hasBegun) return false;
  return props.isOrganized !== undefined
    ? props.isOrganized
    : isBuildingOrganized(props.building, props.coalitions);
});
const activeColor = computed(() => props.effectiveColor || props.building.color);
const outlineColor = computed(() => (isOrganized.value ? activeColor.value : "#3f382f"));

const buildingNumber = computed(() => {
  if (typeof props.building.index === "number" && !isNaN(props.building.index)) {
    return props.building.index;
  }
  const match = props.building.label?.match(/\d+/);
  if (match) return parseInt(match[0], 10);
  return props.building.label || 1;
});

const barTextColor = computed(() => getContrastTextColor(activeColor.value));

function handlePointerDownSpool(e: PointerEvent) {
  if (!props.hasBegun) return;
  if (e.button !== 0) return;
  emit("start-thread", props.building, e);
}
function handleTenantClick(e: MouseEvent, tenant: Tenant) {
  if (!props.hasBegun) return;
  emit("tenant-select", { event: e, tenant, building: props.building });
}

const isEditable = computed(() =>
  props.editBuildings !== undefined ? props.editBuildings : props.canMove,
);

function handleDragPointerDown(e: PointerEvent) {
  if (!isEditable.value) return;
  if (e.button !== 0) return;
  emit("pointerdown-drag", e, props.building);
}
const effectivePersonWidth = computed(() =>
  Math.max(20, props.personWidth ?? BASELINE_PERSON_WIDTH),
);
const effectivePersonHeight = computed(() =>
  Math.round(effectivePersonWidth.value / PERSON_ASPECT_RATIO),
);

// Dynamic column layout based on tenant count
const gridColumns = computed(() => getTenantGridCols(props.building.tenants.length));

// Dynamic building card width derived directly from number of people and size of people
const cardWidth = computed(() => {
  const cols = gridColumns.value;
  const pw = effectivePersonWidth.value;
  const gap = 3;
  // Width of windows grid + padding around windows (5px on each side = 10px) + rough box border/padding (10px)
  const contentWidth = cols * pw + (cols - 1) * gap + 20;
  // Header plaque needs at least 144px to fit label, badges, pencil comfortably without truncation
  return Math.max(contentWidth, 144);
});

// Streamlined minimal rooftop parapet and cornice
const roofPaths = computed<PathInfo[]>(() => {
  const s = buildingSeed.value;
  const cornice = roughGen.line(0, 8, 280, 8, {
    roughness: 0.5,
    stroke: "#4a3d2c",
    strokeWidth: 1.2,
    seed: s + 10,
  });

  const parapet = roughGen.rectangle(4, 2, 272, 6, {
    roughness: 0.45,
    stroke: "#695844",
    fill: "#dfd7c9",
    fillStyle: "solid",
    strokeWidth: 1.0,
    seed: s + 11,
  });

  return [cornice, parapet].flatMap((d) => roughGen.toPaths(d));
});
</script>

<template>
  <div
    class="building-card-wrapper"
    :class="{
      'is-building-organized': isOrganized,
      'is-in-coalition': isInCoalition,
      'is-connecting-source': isConnectingSource,
      'is-connecting-target': isConnectingTarget,
    }"
    :style="{
      width: `${cardWidth}px`,
      '--building-accent': activeColor,
      '--person-width': `${effectivePersonWidth}px`,
      '--person-height': `${effectivePersonHeight}px`,
      '--building-cols': gridColumns,
    }"
  >
    <!-- Building edit button in top left corner (only in edit mode) -->
    <transition name="edit-control-pop">
      <button
        v-if="isEditable"
        type="button"
        class="building-settings-btn"
        title="Edit building (name, color, tenants)"
        :aria-label="`Edit settings for ${building.label}`"
        @pointerdown.stop
        @click.stop="emit('adjust-tenants', building)"
      >
        <Pencil :size="13" :stroke-width="1.8" class="settings-pencil-icon" aria-hidden="true" />
      </button>
    </transition>
    <!-- Coalition connector circle button/pin -->
    <button
      type="button"
      class="coalition-pin-btn"
      :class="{
        'is-connected': isInCoalition,
        'is-active-source': isConnectingSource,
        'is-disabled': !hasBegun,
      }"
      :disabled="!hasBegun"
      :style="{
        borderColor: hasBegun ? activeColor : '#d1c7b7',
        backgroundColor: !hasBegun ? '#f4ece1' : isInCoalition ? activeColor : '#fffdfa',
        color: !hasBegun ? '#a89f91' : isInCoalition ? '#ffffff' : activeColor,
      }"
      :title="
        !hasBegun
          ? 'Coalitions cannot be formed during setup'
          : isInCoalition
            ? `${building.label} is in a coalition (${coalitionNames || 'Connected'}). Drag thread to connect another building!`
            : `Coalition: Click and drag thread to connect ${building.label} with another building`
      "
      :aria-label="
        !hasBegun
          ? 'Coalitions disabled during setup'
          : `Connect coalition thread from ${building.label}`
      "
      @pointerdown.stop="handlePointerDownSpool"
    >
      <Cable :size="14" :stroke-width="1.5" class="spool-icon" aria-hidden="true" />
    </button>

    <!-- Building drag indicator handle (only in edit mode) -->
    <transition name="edit-control-pop">
      <button
        v-if="isEditable"
        type="button"
        class="building-drag-handle"
        title="Drag to move building"
        aria-label="Drag to move building"
        @pointerdown.stop.prevent="handleDragPointerDown"
      >
        <GripVertical :size="14" :stroke-width="1.5" class="drag-icon" aria-hidden="true" />
        <span class="drag-label">Move</span>
      </button>
    </transition>
    <RoughBox
      :stroke="outlineColor"
      :fill="'#f5efe4'"
      fill-style="solid"
      :roughness="0.7"
      :bowing="0.5"
      :stroke-width="isOrganized ? 2.5 : 2"
      :seed="buildingSeed"
      class="building-rough-box"
    >
      <div class="building-card-inner">
        <!-- Streamlined Rooftop architectural trim (draggable) -->
        <div
          class="building-roof-area"
          :class="{ 'is-draggable': isEditable }"
          :title="isEditable ? 'Drag to move building' : undefined"
          @pointerdown="handleDragPointerDown"
        >
          <svg
            viewBox="0 0 280 10"
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

        <!-- Header status strip: color dot, union ratio, organized indicator -->
        <div class="building-header-status">
          <div
            class="status-stat-group"
            :title="`${effectiveUnionCount} of ${building.tenants.length} resident${building.tenants.length === 1 ? '' : 's'} in union${isOrganized ? ' (Organized)' : ''}`"
          >
            <span
              class="building-color-dot"
              :style="{ backgroundColor: activeColor }"
              :title="
                isInCoalition
                  ? `Coalition Color: ${activeColor}`
                  : hasBegun
                    ? `Instigator Color: ${activeColor}`
                    : `Building Color: ${activeColor}`
              "
            />
            <span class="status-ratio-text">
              <strong class="ratio-num" :class="{ 'has-union': effectiveUnionCount > 0 }">{{
                effectiveUnionCount
              }}</strong>
              <span class="ratio-slash">/</span>
              <span class="ratio-total">{{ building.tenants.length }}</span>
              <span class="ratio-label">in union</span>
            </span>
          </div>

          <span
            v-if="isOrganized"
            class="status-organized-flag"
            title="Building is organized (2+ in union)"
          >
            ✊ Org
          </span>
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
            :label="`${building.label} • Resident ${idx + 1}`"
            :seed="buildingSeed + 100 + idx * 7"
            :color="hasBegun && (tenant.inUnion || tenant.isInstigator) ? activeColor : undefined"
            :is-instigator="hasBegun && Boolean(tenant.isInstigator)"
            :in-union="hasBegun && Boolean(tenant.inUnion)"
            :is-evicted="hasBegun && Boolean(tenant.isEvicted)"
            :has-begun="hasBegun"
            @select="handleTenantClick($event, tenant)"
            @contextmenu="handleTenantClick($event, tenant)"
          />
        </div>

        <!-- Bottom colored bar with building number/name -->
        <div
          class="building-bottom-bar"
          :class="{ 'is-draggable': isEditable }"
          :style="{
            backgroundColor: activeColor,
            color: barTextColor,
          }"
          :title="isEditable ? `${building.label} (Drag to move)` : building.label"
          :aria-label="building.label"
          @pointerdown="handleDragPointerDown"
        >
          <span class="building-bottom-bar-text">{{ building.label }}</span>
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
  min-width: 144px;
  max-width: 520px;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.building-card-wrapper:hover {
  transform: translateY(-3px);
}

/* Coalition state highlights on building card */
.building-card-wrapper.is-connecting-source {
  transform: scale(1.03);
  box-shadow:
    0 0 0 3px #f59e0b,
    0 8px 16px rgba(0, 0, 0, 0.15);
}

.building-card-wrapper.is-connecting-target {
  transform: scale(1.05);
  box-shadow:
    0 0 0 3.5px #3b82f6,
    0 10px 24px rgba(59, 130, 246, 0.35);
  animation: target-building-pulse 0.9s infinite alternate;
}

@keyframes target-building-pulse {
  from {
    box-shadow:
      0 0 0 3px #3b82f6,
      0 6px 14px rgba(59, 130, 246, 0.25);
  }
  to {
    box-shadow:
      0 0 0 5px #2563eb,
      0 10px 24px rgba(37, 99, 235, 0.45);
  }
}

/* Coalition Pin Button (circle button at corner) */
.coalition-pin-btn {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border-width: 2px;
  border-style: solid;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  cursor: grab;
  z-index: 25;
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.18),
    inset 0 1px 2px rgba(255, 255, 255, 0.6);
  transition:
    transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.18s ease;
  user-select: none;
  touch-action: none;
  padding: 0;
}

.coalition-pin-btn:hover {
  transform: scale(1.22);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.28);
  cursor: grab;
}

.coalition-pin-btn:active {
  transform: scale(1.12);
  cursor: grabbing;
}

.coalition-pin-btn.is-active-source {
  transform: scale(1.25);
  box-shadow:
    0 0 0 3px #f59e0b,
    0 4px 12px rgba(0, 0, 0, 0.3);
}

.spool-icon {
  display: inline-block;
  line-height: 1;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2));
  pointer-events: none;
}

.coalition-pin-btn:disabled,
.coalition-pin-btn.is-disabled {
  cursor: not-allowed;
  opacity: 0.45;
  box-shadow: none;
  pointer-events: none;
}

.coalition-pin-btn:disabled:hover,
.coalition-pin-btn.is-disabled:hover {
  transform: none;
  box-shadow: none;
  cursor: not-allowed;
}

/* Building Bottom Bar */
.building-bottom-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 2px 4px 4px;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1.2;
  cursor: default;
  user-select: none;
  touch-action: none;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
}

.building-bottom-bar.is-draggable {
  cursor: grab;
  transition:
    transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.15s ease,
    filter 0.15s ease;
}

.building-bottom-bar.is-draggable:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.22);
  filter: brightness(1.06);
}

.building-bottom-bar.is-draggable:active {
  cursor: grabbing;
  transform: translateY(0);
}

.building-bottom-bar-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.building-drag-handle {
  position: absolute;
  top: -13px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 25;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 3px 11px 3px 9px;
  background-color: #faf5eb;
  border: 1.5px solid #786b59;
  border-radius: 14px;
  color: #574c3d;
  font-family: inherit;
  font-size: 11.5px;
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
  background-color: #fef08a;
  border-color: #a16207;
  color: #713f12;
  transform: translateX(-50%) translateY(-1px) scale(1.06);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.18);
}

.building-drag-handle:active {
  cursor: grabbing;
  background-color: #fde047;
  border-color: #854d0e;
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
.building-rough-box {
  width: 100%;
  height: 100%;
  transition: filter 0.25s ease;
}

.building-card-wrapper.is-building-organized .building-rough-box {
  filter: drop-shadow(0 0 2.5px var(--building-accent)) drop-shadow(0 0 7px var(--building-accent))
    drop-shadow(0 0 14px color-mix(in srgb, var(--building-accent) 55%, transparent));
}

.building-card-wrapper.is-building-organized:hover .building-rough-box {
  filter: drop-shadow(0 0 3px var(--building-accent)) drop-shadow(0 0 9px var(--building-accent))
    drop-shadow(0 0 18px color-mix(in srgb, var(--building-accent) 65%, transparent));
}

.building-card-inner {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding-top: 2px;
  padding-bottom: 2px;
}

/* Rooftop */
.building-roof-area {
  position: relative;
  width: 100%;
  height: 8px;
  overflow: visible;
  cursor: default;
  touch-action: none;
}

.building-roof-area.is-draggable {
  cursor: grab;
}

.building-roof-area.is-draggable:active {
  cursor: grabbing;
}

.roof-rough-svg {
  width: 100%;
  height: 100%;
  display: block;
}

/* Header status strip */
.building-header-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 6px 2px;
  width: 100%;
  gap: 4px;
  min-width: 0;
  box-sizing: border-box;
}

.status-stat-group {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  flex-shrink: 1;
}

.building-color-dot {
  width: 7.5px;
  height: 7.5px;
  border-radius: 50%;
  border: 1.2px solid #29241e;
  flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

.status-ratio-text {
  font-size: 0.68rem;
  font-weight: 600;
  color: #443a2f;
  white-space: nowrap;
  line-height: 1.2;
  letter-spacing: 0.01em;
}

.ratio-num {
  font-weight: 800;
  font-size: 0.74rem;
  color: #574c3d;
}

.ratio-num.has-union {
  color: #15803d;
}

.ratio-slash {
  opacity: 0.45;
  margin: 0 1px;
}

.ratio-total {
  font-weight: 700;
  color: #574c3d;
}

.ratio-label {
  font-size: 0.64rem;
  color: #6b5d4d;
  margin-left: 3px;
  font-weight: 600;
}

.status-organized-flag {
  font-size: 0.65rem;
  font-weight: 700;
  color: #15803d;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  line-height: 1.2;
  white-space: nowrap;
  flex-shrink: 0;
}

.building-settings-btn {
  position: absolute;
  top: -10px;
  left: -10px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid var(--building-accent, #786b59);
  background-color: #fffdfa;
  color: #443a2f;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  cursor: pointer;
  z-index: 25;
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.18),
    inset 0 1px 2px rgba(255, 255, 255, 0.6);
  transition:
    transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1),
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease,
    box-shadow 0.18s ease;
  user-select: none;
  touch-action: none;
  padding: 0;
}

.building-settings-btn:hover {
  transform: scale(1.22);
  background-color: #fef08a;
  border-color: #a16207;
  color: #713f12;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.28);
}

.building-settings-btn:hover .settings-pencil-icon,
.building-settings-btn:hover .settings-gear-icon {
  transform: rotate(-15deg) scale(1.08);
}

.settings-pencil-icon,
.settings-gear-icon {
  display: inline-block;
  line-height: 1;
  transition: transform 0.25s ease;
  pointer-events: none;
}

.building-settings-btn:active {
  transform: scale(1.12);
  background-color: #fde047;
  border-color: #854d0e;
}

/* Windows Grid */
.building-windows-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 3px 3px;
  padding: 3px 5px;
  margin-bottom: 2px;
}

.building-windows-grid :deep(.building-window) {
  width: var(--person-width, 75px);
  height: var(--person-height, 110px);
  aspect-ratio: 0.68;
  flex-shrink: 0;
}

/* Edit mode controls pop animation */
.edit-control-pop-enter-active,
.edit-control-pop-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.building-settings-btn.edit-control-pop-enter-from,
.building-settings-btn.edit-control-pop-leave-to {
  opacity: 0;
  transform: scale(0.4);
}

.building-drag-handle.edit-control-pop-enter-from,
.building-drag-handle.edit-control-pop-leave-to {
  opacity: 0;
  transform: translateX(-50%) scale(0.4);
}
</style>
