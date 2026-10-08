<script setup lang="ts">
import { computed } from "vue";
import type {
  Building,
  Tenant,
  CoalitionGroup,
  BuildingRoofType,
  BuildingBush,
  BuildingPlant,
  GameScreen,
} from "../types/game";
import { isBuildingOrganized, getBuildingUnionCount } from "../utils/coalitions";
import { getTenantGridCols, PERSON_ASPECT_RATIO } from "../utils/layout";
import { BASELINE_PERSON_WIDTH } from "../utils/sizing";
import { createSeed } from "../utils/rough";
import type { PathInfo } from "../utils/rough";
import { getContrastTextColor, muteColor } from "../utils/colorTheory";
import {
  getRoofHeight,
  getDefaultBuildingRoofType,
  getDefaultBuildingHasBalcony,
  getDefaultBuildingPlant,
  getDefaultBuildingBush,
  generateRoofPaths,
  generatePlantPaths,
  generateBushPaths,
} from "../utils/buildingArchitecture";
import RoughBox from "./RoughBox.vue";
import BuildingWindow from "./BuildingWindow.vue";
import { Pencil, Cable, GripVertical, X } from "lucide-vue-next";
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
    canEdit?: boolean;
    screen?: GameScreen;
    isNeighborhoodSetup?: boolean;
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
    canEdit: undefined,
    screen: undefined,
    isNeighborhoodSetup: undefined,
    hasBegun: true,
  },
);

const isSetupGateActive = computed(() => {
  if (props.isNeighborhoodSetup !== undefined) return props.isNeighborhoodSetup;
  if (props.screen !== undefined) return props.screen === "neighborhood-setup";
  if (props.hasBegun !== undefined) return !props.hasBegun;
  return false;
});
const isGameplayActive = computed(() => !isSetupGateActive.value);
const emit = defineEmits<{
  (e: "tenant-select", payload: { event: MouseEvent; tenant: Tenant; building: Building }): void;
  (e: "adjust-tenants", building: Building): void;
  (e: "pointerdown-drag", event: PointerEvent, building: Building): void;
  (e: "start-thread", building: Building, event: PointerEvent): void;
  (e: "delete-building", building: Building): void;
}>();
const buildingSeed = computed(() =>
  createSeed(`building_${props.building.id}_${props.building.index}`),
);
const effectiveUnionCount = computed(() => {
  if (isSetupGateActive.value) return 0;
  if (props.unionCount !== undefined) return props.unionCount;
  return getBuildingUnionCount(props.building, props.coalitions);
});
const isOrganized = computed(() => {
  if (isSetupGateActive.value) return false;
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
  if (isSetupGateActive.value) return;
  if (e.button !== 0) return;
  emit("start-thread", props.building, e);
}
function handleTenantClick(e: MouseEvent, tenant: Tenant) {
  if (isSetupGateActive.value) return;
  emit("tenant-select", { event: e, tenant, building: props.building });
}

const isEditable = computed(() => {
  if (props.canEdit !== undefined) return props.canEdit;
  if (props.editBuildings !== undefined) return props.editBuildings;
  return props.canMove ?? true;
});

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

const effectiveRoofType = computed<BuildingRoofType>(() => {
  return props.building.roofType ?? getDefaultBuildingRoofType(props.building.index);
});

const roofHeight = computed(() => getRoofHeight(effectiveRoofType.value));

const roofPaths = computed<PathInfo[]>(() => {
  return generateRoofPaths(
    effectiveRoofType.value,
    cardWidth.value,
    roofHeight.value,
    buildingSeed.value + 10,
    outlineColor.value,
    isOrganized.value,
  );
});
const tenantRows = computed(() =>
  Math.max(1, Math.ceil(props.building.tenants.length / gridColumns.value)),
);
const effectiveHasBalcony = computed(() => {
  return props.building.hasBalcony ?? getDefaultBuildingHasBalcony(props.building.index);
});

function shouldShowBalcony(idx: number): boolean {
  if (!effectiveHasBalcony.value) return false;
  if (tenantRows.value >= 2) {
    return Math.floor(idx / gridColumns.value) === 0;
  }
  return true;
}

const effectivePlant = computed<BuildingPlant>(() => {
  if (props.building.plant) return props.building.plant;
  if (props.building.bush) {
    if (props.building.bush === "none") return "none";
    if (props.building.bush === "flower") return "flower";
    return "bush";
  }
  return getDefaultBuildingPlant(props.building.index);
});

const effectiveBush = computed<BuildingBush>(() => effectivePlant.value);

const plantPaths = computed<PathInfo[]>(() => {
  if (effectivePlant.value === "none") return [];
  return generatePlantPaths(
    effectivePlant.value,
    buildingSeed.value + 500,
    outlineColor.value,
    isOrganized.value,
    props.building.flowerColor,
    activeColor.value,
  );
});

const bushPaths = plantPaths;
const settingsBtnTop = computed(() => {
  if (effectiveRoofType.value === "pitched") return 22;
  if (effectiveRoofType.value === "mansard") return 16;
  if (effectiveRoofType.value === "flat-chairs") return 18;
  return -10;
});

const dragHandleTop = computed(() => settingsBtnTop.value);

const pinBtnTop = computed(() => {
  if (effectiveRoofType.value === "pitched") return 22;
  if (effectiveRoofType.value === "mansard") return 16;
  if (effectiveRoofType.value === "flat-chairs") return 18;
  return -10;
});
</script>

<template>
  <div
    class="building-card-wrapper"
    :class="{
      'is-neighborhood-setup': isSetupGateActive,
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
        :style="{
          top: `${settingsBtnTop}px`,
        }"
        title="Edit building (name, color, tenants, architecture)"
        :aria-label="`Edit settings for ${building.label}`"
        @pointerdown.stop
        @click.stop="emit('adjust-tenants', building)"
      >
        <Pencil :size="18" :stroke-width="1.9" class="settings-pencil-icon" aria-hidden="true" />
      </button>
    </transition>
    <!-- Delete building button in edit mode OR Coalition connector circle button/pin -->
    <transition name="edit-control-pop">
      <button
        v-if="isEditable"
        type="button"
        class="building-delete-btn"
        :style="{
          top: `${pinBtnTop}px`,
        }"
        :title="`Delete ${building.label}`"
        :aria-label="`Delete ${building.label}`"
        @pointerdown.stop
        @click.stop="emit('delete-building', building)"
      >
        <X :size="15" :stroke-width="2.2" class="delete-icon" aria-hidden="true" />
      </button>
      <button
        v-else
        type="button"
        class="coalition-pin-btn"
        :class="{
          'is-connected': isInCoalition,
          'is-active-source': isConnectingSource,
          'is-disabled': isSetupGateActive,
        }"
        :disabled="isSetupGateActive"
        :style="{
          top: `${pinBtnTop}px`,
          backgroundColor: isSetupGateActive ? '#f4ece1' : isInCoalition ? activeColor : '#fffdfa',
          color: isSetupGateActive ? '#a89f91' : isInCoalition ? barTextColor : activeColor,
        }"
        :title="
          isSetupGateActive
            ? 'Coalitions cannot be formed during setup'
            : isInCoalition
              ? `${building.label} is in a coalition (${coalitionNames || 'Connected'}). Drag thread to connect another building!`
              : `Coalition: Click and drag thread to connect ${building.label} with another building`
        "
        :aria-label="
          isSetupGateActive
            ? 'Coalitions disabled during setup'
            : `Connect coalition thread from ${building.label}`
        "
        @pointerdown.stop="handlePointerDownSpool"
      >
        <Cable :size="14" :stroke-width="1.5" class="spool-icon" aria-hidden="true" />
      </button>
    </transition>

    <!-- Building drag indicator handle (only in edit mode) -->
    <transition name="edit-control-pop">
      <button
        v-if="isEditable"
        type="button"
        class="building-drag-handle"
        :style="{
          top: `${dragHandleTop}px`,
        }"
        title="Drag to move building"
        aria-label="Drag to move building"
        @pointerdown.stop.prevent="handleDragPointerDown"
      >
        <GripVertical :size="18" :stroke-width="1.8" class="drag-icon" aria-hidden="true" />
        <span class="drag-label">Move</span>
      </button>
    </transition>

    <!-- Rooftop architectural structure (draggable) -->
    <div
      class="building-roof-area"
      :class="{ 'is-draggable': isEditable, [`is-${effectiveRoofType}`]: true }"
      :style="{
        width: `${cardWidth}px`,
        height: `${roofHeight}px`,
      }"
      @pointerdown="handleDragPointerDown"
    >
      <svg :viewBox="`0 0 ${cardWidth} ${roofHeight}`" class="roof-rough-svg" aria-hidden="true">
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

    <RoughBox
      :stroke="outlineColor"
      :fill="'#f5efe4'"
      fill-style="solid"
      :roughness="0.7"
      :bowing="0.5"
      :stroke-width="isOrganized ? 2.5 : 2"
      :seed="buildingSeed"
      class="building-rough-box"
      :style="{ width: `${cardWidth}px` }"
    >
      <div class="building-card-inner">
        <!-- Header status strip: color dot, union ratio -->
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
                  : isGameplayActive
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
            :color="
              isGameplayActive && (tenant.inUnion || tenant.isInstigator) ? activeColor : undefined
            "
            :is-instigator="isGameplayActive && Boolean(tenant.isInstigator)"
            :in-union="isGameplayActive && Boolean(tenant.inUnion)"
            :is-evicted="isGameplayActive && Boolean(tenant.isEvicted)"
            :is-neighborhood-setup="isSetupGateActive"
            :has-begun="isGameplayActive"
            :has-balcony="shouldShowBalcony(idx)"
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

    <!-- Landscaping plant (flower or bush in front of the house) -->
    <div
      v-if="effectivePlant !== 'none'"
      class="building-plant-area building-bush-area"
      :class="[`plant-${effectivePlant}`, `bush-${effectivePlant}`, { 'is-draggable': isEditable }]"
      @pointerdown="handleDragPointerDown"
    >
      <svg viewBox="0 0 58 44" class="plant-svg bush-svg" aria-hidden="true">
        <path
          v-for="(p, idx) in plantPaths"
          :key="idx"
          :d="p.d"
          :stroke="p.stroke"
          :stroke-width="p.strokeWidth"
          :fill="p.fill || 'none'"
        />
      </svg>
    </div>
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
  transform: translateY(-3px) scale(1.015);
  transition: transform 0.25s ease;
}

.building-card-wrapper.is-connecting-source::after {
  content: "";
  position: absolute;
  inset: -7px;
  border: 2px dashed var(--building-accent);
  border-radius: 12px;
  pointer-events: none;
  box-shadow:
    0 0 16px color-mix(in srgb, var(--building-accent) 28%, transparent),
    0 4px 14px rgba(0, 0, 0, 0.08);
  opacity: 0.92;
  animation: source-glow-breathe 2.4s ease-in-out infinite alternate;
}

.building-card-wrapper.is-connecting-target {
  transform: translateY(-4px) scale(1.025);
  transition: transform 0.2s ease;
}

.building-card-wrapper.is-connecting-target::after {
  content: "";
  position: absolute;
  inset: -7px;
  border: 2.5px dashed var(--building-accent);
  border-radius: 12px;
  pointer-events: none;
  animation: target-glow-breathe 1.2s ease-in-out infinite alternate;
}

@keyframes source-glow-breathe {
  0% {
    box-shadow:
      0 0 10px color-mix(in srgb, var(--building-accent) 18%, transparent),
      0 4px 10px rgba(0, 0, 0, 0.06);
    opacity: 0.82;
  }
  100% {
    box-shadow:
      0 0 22px color-mix(in srgb, var(--building-accent) 42%, transparent),
      0 8px 20px rgba(0, 0, 0, 0.1);
    opacity: 1;
  }
}

@keyframes target-glow-breathe {
  0% {
    box-shadow:
      0 0 14px color-mix(in srgb, var(--building-accent) 30%, transparent),
      0 4px 14px rgba(0, 0, 0, 0.08);
    opacity: 0.85;
  }
  100% {
    box-shadow:
      0 0 28px color-mix(in srgb, var(--building-accent) 55%, transparent),
      0 8px 22px color-mix(in srgb, var(--building-accent) 25%, transparent);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .building-card-wrapper.is-connecting-source::after,
  .building-card-wrapper.is-connecting-target::after,
  .coalition-pin-btn.is-active-source {
    animation: none;
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
  transform: scale(1.22);
  box-shadow:
    0 0 0 2.5px color-mix(in srgb, var(--building-accent) 50%, #fff),
    0 0 14px color-mix(in srgb, var(--building-accent) 60%, transparent),
    0 4px 12px rgba(0, 0, 0, 0.25);
  animation: pin-breathe 1.6s ease-in-out infinite alternate;
}

@keyframes pin-breathe {
  0% {
    transform: scale(1.18);
  }
  100% {
    transform: scale(1.26);
  }
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
/* Delete Building Button (red X circle button in top right in edit mode) */
.building-delete-btn {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid #dc2626;
  background-color: #fee2e2;
  color: #dc2626;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  cursor: pointer;
  z-index: 25;
  box-shadow:
    0 2px 6px rgba(220, 38, 38, 0.25),
    inset 0 1px 2px rgba(255, 255, 255, 0.6);
  transition:
    transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1),
    background-color 0.15s ease,
    color 0.15s ease,
    box-shadow 0.18s ease;
  user-select: none;
  touch-action: manipulation;
  padding: 0;
}

.building-delete-btn:hover {
  transform: scale(1.22);
  background-color: #dc2626;
  color: #ffffff;
  border-color: #b91c1c;
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
}

.building-delete-btn:active {
  transform: scale(1.12);
  background-color: #b91c1c;
  border-color: #991b1b;
}

.delete-icon {
  display: inline-block;
  line-height: 1;
  pointer-events: none;
}

/* Building Bottom Bar */
.building-bottom-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 2px 4px 4px;
  padding: 5px 8px;
  border-radius: 4px;
  font-family:
    "Outfit",
    "Plus Jakarta Sans",
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    Helvetica,
    Arial,
    sans-serif;
  font-size: 15.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.25;
  cursor: default;
  user-select: none;
  touch-action: none;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
  transition:
    background-color 0.3s ease,
    color 0.3s ease,
    transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.15s ease,
    filter 0.15s ease;
}

.building-bottom-bar.is-draggable {
  cursor: grab;
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
  font-family: inherit;
  font-size: inherit;
  font-weight: 700;
  letter-spacing: inherit;
  line-height: inherit;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.building-drag-handle {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 25;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px 0 10px;
  box-sizing: border-box;
  background-color: #faf5eb;
  border: 1.5px solid #786b59;
  border-radius: 17px;
  color: #574c3d;
  font-family: inherit;
  font-size: 13.5px;
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
  font-size: 15px;
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
  filter: drop-shadow(0 0 1.5px color-mix(in srgb, var(--building-accent) 55%, transparent))
    drop-shadow(0 0 5px color-mix(in srgb, var(--building-accent) 25%, transparent))
    drop-shadow(0 0 9px color-mix(in srgb, var(--building-accent) 15%, transparent));
}

.building-card-wrapper.is-building-organized:hover .building-rough-box {
  filter: drop-shadow(0 0 2px color-mix(in srgb, var(--building-accent) 65%, transparent))
    drop-shadow(0 0 6px color-mix(in srgb, var(--building-accent) 35%, transparent))
    drop-shadow(0 0 11px color-mix(in srgb, var(--building-accent) 20%, transparent));
}
.building-card-wrapper.is-building-organized .roof-rough-svg {
  filter: drop-shadow(0 0 1.5px color-mix(in srgb, var(--building-accent) 35%, transparent));
}

.building-card-inner {
  display: flex;
  flex-direction: column;
  width: 100%;
  position: relative;
  padding-top: 2px;
  padding-bottom: 2px;
}

/* Rooftop */
.building-roof-area {
  position: relative;
  overflow: visible;
  cursor: default;
  touch-action: none;
  margin-bottom: -1px;
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
  overflow: visible;
  transition: filter 0.25s ease;
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
  transition: background-color 0.3s ease;
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

.building-settings-btn {
  position: absolute;
  top: -10px;
  left: -12px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 2px solid var(--building-accent, #786b59);
  background-color: #fffdfa;
  color: #443a2f;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
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
  transform: scale(1.18);
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
  transform: scale(1.08);
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
.building-delete-btn.edit-control-pop-enter-from,
.building-delete-btn.edit-control-pop-leave-to {
  opacity: 0;
  transform: scale(0.4);
}

/* Landscaping plant in front of house (flower or bush) */
.building-plant-area,
.building-bush-area {
  position: absolute;
  bottom: -4px;
  left: -12px;
  width: 56px;
  height: 44px;
  overflow: visible;
  z-index: 12;
  cursor: default;
  touch-action: none;
  user-select: none;
  pointer-events: auto;
}

.building-bush-area.bush-right {
  left: auto;
  right: -12px;
  transform: scaleX(-1);
}

.building-plant-area.is-draggable,
.building-bush-area.is-draggable {
  cursor: grab;
}

.building-plant-area.is-draggable:active,
.building-bush-area.is-draggable:active {
  cursor: grabbing;
}

.plant-svg,
.bush-svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
  transition: filter 0.25s ease;
}

.building-card-wrapper.is-building-organized .plant-svg,
.building-card-wrapper.is-building-organized .bush-svg {
  filter: drop-shadow(0 0 1.5px color-mix(in srgb, var(--building-accent) 35%, transparent));
}
</style>
