<script setup lang="ts">
import { computed } from "vue";
import type { Building, Tenant } from "../types/game";
import { isBuildingOrganized, getTenantGridCols, BASELINE_PERSON_WIDTH } from "../types/game";
import { roughGen, createSeed } from "../utils/rough";
import type { PathInfo } from "../utils/rough";
import RoughBox from "./RoughBox.vue";
import BuildingWindow from "./BuildingWindow.vue";

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
  }>(),
  {
    effectiveColor: undefined,
    isInCoalition: false,
    coalitionNames: "",
    isConnectingSource: false,
    isConnectingTarget: false,
    personWidth: undefined,
    isOrganized: undefined,
  },
);
const emit = defineEmits<{
  (e: "tenant-select", payload: { event: MouseEvent; tenant: Tenant; building: Building }): void;
  (
    e: "tenant-context-menu",
    payload: { event: MouseEvent; tenant: Tenant; building: Building },
  ): void;
  (e: "adjust-tenants", building: Building): void;
  (e: "pointerdown-drag", event: PointerEvent, building: Building): void;
  (e: "drag-start", event: DragEvent, building: Building): void;
  (e: "drag-over", event: DragEvent, building: Building): void;
  (e: "drop", event: DragEvent, building: Building): void;
  (e: "drag-end", event: DragEvent): void;
  (e: "start-thread", building: Building, event: PointerEvent): void;
  (e: "disconnect-building", buildingId: string): void;
}>();
const buildingSeed = computed(() =>
  createSeed(`building_${props.building.id}_${props.building.index}`),
);
const isOrganized = computed(() =>
  props.isOrganized !== undefined ? props.isOrganized : isBuildingOrganized(props.building),
);
const activeColor = computed(() => props.effectiveColor || props.building.color);

function handlePointerDownSpool(e: PointerEvent) {
  if (e.button !== 0) return;
  emit("start-thread", props.building, e);
}
function handleTenantClick(e: MouseEvent, tenant: Tenant) {
  emit("tenant-select", { event: e, tenant, building: props.building });
}

function handleDragPointerDown(e: PointerEvent) {
  if (e.button !== 0) return;
  emit("pointerdown-drag", e, props.building);
}
const effectivePersonWidth = computed(() =>
  Math.max(20, props.personWidth ?? BASELINE_PERSON_WIDTH),
);
const effectivePersonHeight = computed(() => Math.round(effectivePersonWidth.value / 0.68));

// Dynamic column layout based on tenant count
const gridColumns = computed(() => getTenantGridCols(props.building.tenants.length));

// Dynamic building card width derived directly from number of people and size of people
const cardWidth = computed(() => {
  const cols = gridColumns.value;
  const pw = effectivePersonWidth.value;
  const gap = 3;
  // Width of windows grid + padding around windows (5px on each side = 10px) + rough box border/padding (10px)
  const contentWidth = cols * pw + (cols - 1) * gap + 20;
  // Header plaque needs at least 138px to fit label, badges, gear comfortably without truncation
  return Math.max(contentWidth, 138);
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

// Streamlined minimal ground floor entrance
const entrancePaths = computed<PathInfo[]>(() => {
  const s = buildingSeed.value + 50;
  const door = roughGen.rectangle(6, 1, 20, 14, {
    roughness: 0.45,
    stroke: "#382f24",
    fill: "#cbbfae",
    fillStyle: "solid",
    strokeWidth: 1.0,
    seed: s + 1,
  });

  const knob = roughGen.circle(22, 8, 1.6, {
    roughness: 0.35,
    stroke: "#241e16",
    fill: "#eab308",
    fillStyle: "solid",
    strokeWidth: 0.8,
    seed: s + 2,
  });

  const threshold = roughGen.line(3, 15, 29, 15, {
    roughness: 0.45,
    stroke: "#524534",
    strokeWidth: 1.1,
    seed: s + 3,
  });

  return [door, knob, threshold].flatMap((d) => roughGen.toPaths(d));
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
      '--person-width': `${effectivePersonWidth}px`,
      '--person-height': `${effectivePersonHeight}px`,
      '--building-cols': gridColumns,
    }"
  >
    <!-- Coalition connector circle button/pin -->
    <button
      type="button"
      class="coalition-pin-btn"
      :class="{
        'is-connected': isInCoalition,
        'is-active-source': isConnectingSource,
      }"
      :style="{
        borderColor: activeColor,
        backgroundColor: isInCoalition ? activeColor : '#fffdfa',
        color: isInCoalition ? '#ffffff' : activeColor,
      }"
      :title="
        isInCoalition
          ? `${building.label} is in a coalition (${coalitionNames || 'Connected'}). Drag thread to connect another building!`
          : `Coalition: Click and drag thread to connect ${building.label} with another building`
      "
      :aria-label="`Connect coalition thread from ${building.label}`"
      @pointerdown.stop="handlePointerDownSpool"
    >
      <span class="spool-icon">🧵</span>
    </button>

    <!-- Building drag indicator handle -->
    <button
      type="button"
      class="building-drag-handle"
      title="Drag to move building"
      aria-label="Drag to move building"
      @pointerdown.stop.prevent="handleDragPointerDown"
    >
      <span class="drag-icon" aria-hidden="true">⠿</span>
      <span class="drag-label">Move</span>
    </button>
    <RoughBox
      :stroke="activeColor"
      :fill="'#f5efe4'"
      fill-style="solid"
      :roughness="0.7"
      :bowing="0.5"
      :stroke-width="2"
      :seed="buildingSeed"
      class="building-rough-box"
    >
      <div class="building-card-inner">
        <!-- Streamlined Rooftop architectural trim (draggable) -->
        <div
          class="building-roof-area"
          title="Drag to move building"
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

        <!-- Header plaque with hand-drawn label, color dot, badge, and gear icon -->
        <div class="building-header-plaque">
          <RoughBox
            :stroke="'#524534'"
            :fill="'#ebe2d3'"
            fill-style="solid"
            :roughness="0.7"
            :stroke-width="1.0"
            :seed="buildingSeed + 8"
            class="plaque-box"
          >
            <div class="plaque-content">
              <div class="building-identity">
                <span
                  class="building-color-dot"
                  :style="{ backgroundColor: activeColor }"
                  :title="
                    isInCoalition
                      ? `Coalition Color: ${activeColor}`
                      : `Instigator Color: ${activeColor}`
                  "
                />
                <span class="building-label">{{ building.label }}</span>
              </div>

              <div class="plaque-controls">
                <span
                  v-if="isOrganized"
                  class="organized-flag-badge"
                  title="Building is organized (majority in union)"
                >
                  ✊ Org
                </span>
                <div class="building-tenant-badge">
                  <span class="badge-num">{{ building.tenants.length }}</span>
                  <span class="badge-txt">{{
                    building.tenants.length === 1 ? "person" : "people"
                  }}</span>
                </div>
                <button
                  type="button"
                  class="gear-btn"
                  title="Adjust number of tenants"
                  aria-label="Adjust number of tenants"
                  @click.stop="emit('adjust-tenants', building)"
                >
                  ⚙
                </button>
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
            :label="`${building.label} • Resident ${idx + 1}`"
            :seed="buildingSeed + 100 + idx * 7"
            :color="tenant.inUnion || tenant.isInstigator ? activeColor : undefined"
            :is-instigator="tenant.isInstigator"
            :in-union="tenant.inUnion"
            :is-evicted="tenant.isEvicted"
            @select="handleTenantClick($event, tenant)"
            @contextmenu="handleTenantClick($event, tenant)"
          />
        </div>

        <!-- Ground floor entrance with minimal streamlined doorway -->
        <div class="building-ground-area">
          <svg viewBox="0 0 32 16" class="entrance-rough-svg" aria-hidden="true">
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
  min-width: 138px;
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
  cursor: grab;
  touch-action: none;
}

.building-roof-area:active {
  cursor: grabbing;
}

.roof-rough-svg {
  width: 100%;
  height: 100%;
  display: block;
}

/* Plaque */
.building-header-plaque {
  padding: 1px 4px 2px;
  width: 100%;
}

.plaque-box {
  width: 100%;
}

.plaque-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1px 4px;
  width: 100%;
  gap: 3px;
}

.building-identity {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.building-color-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1.2px solid #29241e;
  flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

.building-label {
  font-family: inherit;
  font-size: 0.74rem;
  font-weight: 700;
  color: #29241e;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plaque-controls {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.organized-flag-badge {
  font-size: 0.64rem;
  font-weight: 700;
  color: #15803d;
  background-color: #dcfce7;
  border: 1px solid #86efac;
  padding: 0 3px;
  border-radius: 3px;
  line-height: 1.2;
}

.building-tenant-badge {
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  background: #dbcfbc;
  padding: 0 3px;
  border-radius: 3px;
  font-size: 0.65rem;
  color: #3b3327;
  font-weight: 600;
  line-height: 1.2;
}

.badge-num {
  font-weight: 800;
  font-size: 0.72rem;
}

.gear-btn {
  background: #fdfbf7;
  border: 1px solid #786957;
  border-radius: 3px;
  font-size: 10px;
  cursor: pointer;
  padding: 0 3px;
  color: #44403c;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  line-height: 1.2;
}

.gear-btn:hover {
  background: #f5eedf;
  color: #1c1917;
  transform: rotate(25deg);
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
  width: var(--person-width, 38px);
  height: var(--person-height, 56px);
  aspect-ratio: 0.68;
  flex-shrink: 0;
}

/* Ground entrance */
.building-ground-area {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  height: 16px;
  width: 100%;
}

.entrance-rough-svg {
  width: 32px;
  height: 16px;
  display: block;
}
</style>
