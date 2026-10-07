<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch, useTemplateRef } from "vue";
import { useResizeObserver, useEventListener, onKeyStroke } from "@vueuse/core";
import type {
  Building,
  Tenant,
  CoalitionConnection,
  CoalitionGroup,
  BuildingDimensions,
} from "../types/game";
import {
  clampBuildingPosition,
  resolveBuildingCollisions,
  findSwapTargetBuilding,
  swapBuildingPositions,
} from "../utils/positions";
import { calculateOptimalPersonSize, BASELINE_PERSON_WIDTH } from "../utils/sizing";
import { PERSON_ASPECT_RATIO } from "../utils/layout";
import { isBuildingOrganized, getBuildingUnionCount } from "../utils/coalitions";
import { roughGen, createSeed } from "../utils/rough";
import type { PathInfo } from "../utils/rough";
import {
  getEdgeConnectionPoints,
  getNearestEdgePointOnRect,
  computeThreadCurve,
  getEstimatedBuildingRect,
  type BuildingRect,
} from "../utils/geometry";
import BuildingCard from "./BuildingCard.vue";
import LandlordBuilding from "./LandlordBuilding.vue";
import TenantContextMenu from "./TenantContextMenu.vue";
import TenantAdjustModal from "./TenantAdjustModal.vue";
import BreakCoalitionModal from "./BreakCoalitionModal.vue";
import { Cable, Scissors, X, ChevronDown, ChevronUp } from "lucide-vue-next";
import RoughButton from "./RoughButton.vue";
import RoughBox from "./RoughBox.vue";
const canEdit = defineModel<boolean>("canEdit");
const editBuildings = defineModel<boolean>("editBuildings");
const canMove = defineModel<boolean>("canMove");

const isEditingBuildings = computed<boolean>({
  get: () => {
    if (canEdit.value !== undefined) return canEdit.value;
    if (editBuildings.value !== undefined) return editBuildings.value;
    if (canMove.value !== undefined) return canMove.value;
    return true;
  },
  set: (val: boolean) => {
    if (canEdit.value !== undefined) canEdit.value = val;
    if (editBuildings.value !== undefined) editBuildings.value = val;
    if (canMove.value !== undefined) canMove.value = val;
    if (
      canEdit.value === undefined &&
      editBuildings.value === undefined &&
      canMove.value === undefined
    ) {
      canEdit.value = val;
    }
  },
});
const showLandlord = defineModel<boolean>("showLandlord", { default: true });
const actionsCollapsed = defineModel<boolean>("actionsCollapsed", { default: false });

const props = withDefaults(
  defineProps<{
    buildings: Building[];
    defaultPeople?: number;
    coalitionConnections?: CoalitionConnection[];
    coalitions?: CoalitionGroup[];
    buildingColorMap?: Record<string, string>;
    landlordMoney?: number;
    landlordPosition?: { x: number; y: number };
    personWidth?: number;
  }>(),
  {
    defaultPeople: 8,
    coalitionConnections: () => [],
    coalitions: () => [],
    buildingColorMap: () => ({}),
    landlordPosition: () => ({ x: 82, y: 3 }),
    personWidth: undefined,
  },
);

const maxTenants = computed(() => {
  if (!props.buildings || props.buildings.length === 0) return props.defaultPeople || 8;
  return Math.max(...props.buildings.map((b) => b.tenants?.length || 0), 1);
});

const responsiveSizing = computed(() => {
  const canvasW = canvasDimensions.value.width > 0 ? canvasDimensions.value.width : 1050;
  const canvasH = canvasDimensions.value.height > 0 ? canvasDimensions.value.height : 750;
  return calculateOptimalPersonSize(props.buildings.length, maxTenants.value, canvasW, canvasH);
});

const effectivePersonWidth = computed(() => {
  if (typeof props.personWidth === "number" && props.personWidth > 0) {
    return Math.min(props.personWidth, responsiveSizing.value.personWidth);
  }
  return responsiveSizing.value.personWidth;
});

const effectivePersonHeight = computed(() => {
  return Math.round(effectivePersonWidth.value / PERSON_ASPECT_RATIO);
});

const effectivePersonScale = computed(() => {
  return Math.round((effectivePersonWidth.value / BASELINE_PERSON_WIDTH) * 100) / 100;
});

const emit = defineEmits<{
  (e: "update-building-position", buildingId: string, x: number, y: number): void;
  (e: "update-building-positions", updates: Array<{ id: string; x: number; y: number }>): void;
  (e: "update-landlord-position", x: number, y: number): void;
  (e: "adjust-tenants", buildingId: string, count: number, label?: string, color?: string): void;
  (e: "toggle-union", buildingId: string, tenantId: string, join?: boolean): void;
  (e: "toggle-eviction", buildingId: string, tenantId: string, evicted?: boolean): void;
  (e: "connect-coalition", sourceId: string, targetId: string): void;
  (e: "disconnect-coalition", connectionId: string): void;
  (e: "disconnect-building", buildingId: string): void;
  (e: "undo-coalition"): void;
}>();
const canvasRef = useTemplateRef<HTMLElement>("canvasRef");

// Pointer drag state for repositioning buildings in Edit Position mode
const isDragging = ref(false);
const activeDragBuildingId = ref<string | null>(null);
const hoveredCollisionBuildingId = ref<string | null>(null);
const repulsedBuildingIds = ref<Set<string>>(new Set());
const swappedBuildingIds = ref<Set<string>>(new Set());
const currentLandlordPos = ref<{ x: number; y: number }>({
  x: props.landlordPosition?.x ?? 82,
  y: props.landlordPosition?.y ?? 3,
});

watch(
  () => props.landlordPosition,
  (newPos) => {
    if (newPos && !isDragging.value) {
      currentLandlordPos.value = { x: newPos.x, y: newPos.y };
    }
  },
  { deep: true },
);

function getAllPlaceableBuildings(): Array<{ id: string; x: number; y: number }> {
  const list: Array<{ id: string; x: number; y: number }> = props.buildings.map((b) => ({
    id: b.id,
    x: b.x,
    y: b.y,
  }));
  if (showLandlord.value) {
    list.push({ id: "landlord", x: currentLandlordPos.value.x, y: currentLandlordPos.value.y });
  }
  return list;
}

function getBuildingDimensionsMap(): Record<string, BuildingDimensions> {
  const map: Record<string, BuildingDimensions> = {};
  const canvasEl = canvasRef.value;
  if (!canvasEl) return map;
  const canvasRect = canvasEl.getBoundingClientRect();
  if (canvasRect.width <= 0 || canvasRect.height <= 0) return map;

  for (const [id, el] of buildingCardEls.entries()) {
    if (el) {
      const rect = el.getBoundingClientRect();
      map[id] = {
        w: (rect.width / canvasRect.width) * 100,
        h: (rect.height / canvasRect.height) * 100,
      };
    }
  }
  return map;
}

function getElementRectsMap(): Record<
  string,
  { left: number; top: number; right: number; bottom: number }
> {
  const map: Record<string, { left: number; top: number; right: number; bottom: number }> = {};
  for (const [id, el] of buildingCardEls.entries()) {
    if (el) {
      const rect = el.getBoundingClientRect();
      map[id] = {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
      };
    }
  }
  return map;
}

function handleLandlordPointerDownDrag(e: PointerEvent) {
  if (!isEditingBuildings.value) return;
  handlePointerDownDrag(e, {
    id: "landlord",
    x: currentLandlordPos.value.x,
    y: currentLandlordPos.value.y,
  });
}

function handlePointerDownDrag(e: PointerEvent, building: { id: string; x: number; y: number }) {
  if (!isEditingBuildings.value) return;
  if (e.button !== 0) return;
  const canvasEl = canvasRef.value;
  if (!canvasEl) return;

  isDragging.value = true;
  activeDragBuildingId.value = building.id;

  const canvasRect = canvasEl.getBoundingClientRect();
  const startPointerX = e.clientX;
  const startPointerY = e.clientY;
  const startBuildingX = building.x;
  const startBuildingY = building.y;

  function onPointerMove(moveEvent: PointerEvent) {
    if (!isDragging.value || activeDragBuildingId.value !== building.id) return;

    const deltaX = moveEvent.clientX - startPointerX;
    const deltaY = moveEvent.clientY - startPointerY;

    // Convert pixel delta to percentage of canvas width/height
    const deltaXPercent = (deltaX / canvasRect.width) * 100;
    const deltaYPercent = (deltaY / canvasRect.height) * 100;

    // Clamp coordinates within the canvas
    const newX = Math.round(Math.max(1, Math.min(84, startBuildingX + deltaXPercent)) * 10) / 10;
    const newY = Math.round(Math.max(1, Math.min(72, startBuildingY + deltaYPercent)) * 10) / 10;

    if (building.id === "landlord") {
      currentLandlordPos.value = { x: newX, y: newY };
    } else {
      emit("update-building-position", building.id, newX, newY);
    }

    // Detect if hovering over another building to show visual feedback for switching places
    const dimMap = getBuildingDimensionsMap();
    const candidateBuildings = getAllPlaceableBuildings();
    const swapTarget = findSwapTargetBuilding(
      building.id,
      { x: newX, y: newY },
      candidateBuildings,
      dimMap,
      {
        pointerClient: { x: moveEvent.clientX, y: moveEvent.clientY },
        elementRects: getElementRectsMap(),
      },
    );
    hoveredCollisionBuildingId.value = swapTarget ? swapTarget.id : null;

    nextTick(updatePinPositions);
  }

  function onPointerUp(upEvent: PointerEvent) {
    isDragging.value = false;
    const targetBuildingId = hoveredCollisionBuildingId.value;
    hoveredCollisionBuildingId.value = null;
    const placedId = activeDragBuildingId.value;
    activeDragBuildingId.value = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);

    if (!placedId) return;

    const totalDragDist = Math.hypot(
      upEvent.clientX - startPointerX,
      upEvent.clientY - startPointerY,
    );

    // If dropped directly on top of another building (moved > 6px), switch places!
    const allBuildings = getAllPlaceableBuildings();
    let targetBuilding: { id: string; x: number; y: number } | null = null;
    if (totalDragDist > 6) {
      if (targetBuildingId) {
        targetBuilding = allBuildings.find((b) => b.id === targetBuildingId) ?? null;
      }
      if (!targetBuilding) {
        const dimMap = getBuildingDimensionsMap();
        const placedBuilding = allBuildings.find((b) => b.id === placedId);
        if (placedBuilding) {
          targetBuilding = findSwapTargetBuilding(
            placedId,
            { x: placedBuilding.x, y: placedBuilding.y },
            allBuildings,
            dimMap,
            {
              pointerClient: { x: upEvent.clientX, y: upEvent.clientY },
              elementRects: getElementRectsMap(),
            },
          );
        }
      }
    }

    if (targetBuilding && targetBuilding.id !== placedId) {
      // Swapping places between placedId and targetBuilding.id
      swappedBuildingIds.value.add(placedId);
      swappedBuildingIds.value.add(targetBuilding.id);
      setTimeout(() => {
        swappedBuildingIds.value.delete(placedId);
        swappedBuildingIds.value.delete(targetBuilding.id);
      }, 600);

      const targetNewX = startBuildingX;
      const targetNewY = startBuildingY;
      const placedNewX = targetBuilding.x;
      const placedNewY = targetBuilding.y;

      if (placedId === "landlord") {
        currentLandlordPos.value = { x: placedNewX, y: placedNewY };
        emit("update-landlord-position", placedNewX, placedNewY);
        emit("update-building-position", targetBuilding.id, targetNewX, targetNewY);
      } else if (targetBuilding.id === "landlord") {
        currentLandlordPos.value = { x: targetNewX, y: targetNewY };
        emit("update-landlord-position", targetNewX, targetNewY);
        emit("update-building-position", placedId, placedNewX, placedNewY);
      } else {
        const updates = swapBuildingPositions(
          placedId,
          { x: startBuildingX, y: startBuildingY },
          targetBuilding.id,
          { x: targetBuilding.x, y: targetBuilding.y },
        );
        emit("update-building-positions", updates);
      }

      animatePinPositionsDuringTransition(450);
      return;
    }

    // Placed in empty space:
    if (placedId === "landlord") {
      const clamped = clampBuildingPosition({
        x: currentLandlordPos.value.x,
        y: currentLandlordPos.value.y,
      });
      currentLandlordPos.value = clamped;
      emit("update-landlord-position", clamped.x, clamped.y);

      // Repulse any residential buildings that are slightly overlapped by the placed landlord building
      const dimMap = getBuildingDimensionsMap();
      const candidateBuildings = getAllPlaceableBuildings();
      const repulsedUpdates = resolveBuildingCollisions("landlord", candidateBuildings, dimMap);
      const residentialUpdates = repulsedUpdates.filter((u) => u.id !== "landlord");
      if (residentialUpdates.length > 0) {
        for (const u of residentialUpdates) {
          repulsedBuildingIds.value.add(u.id);
        }
        setTimeout(() => {
          for (const u of residentialUpdates) {
            repulsedBuildingIds.value.delete(u.id);
          }
        }, 500);

        emit("update-building-positions", residentialUpdates);
        animatePinPositionsDuringTransition(450);
      } else {
        nextTick(updatePinPositions);
      }
      return;
    }

    // Residential building placed in empty space
    const placedBuilding = props.buildings.find((b) => b.id === placedId);
    if (placedBuilding) {
      const clamped = clampBuildingPosition({ x: placedBuilding.x, y: placedBuilding.y });
      if (clamped.x !== placedBuilding.x || clamped.y !== placedBuilding.y) {
        emit("update-building-position", placedId, clamped.x, clamped.y);
      }
    }

    // Repulse any buildings that are slightly overlapped by the placed building in open space
    const dimMap = getBuildingDimensionsMap();
    const candidateBuildings = getAllPlaceableBuildings();
    const repulsedUpdates = resolveBuildingCollisions(placedId, candidateBuildings, dimMap);

    const landlordRepulse = repulsedUpdates.find((u) => u.id === "landlord");
    if (landlordRepulse) {
      currentLandlordPos.value = { x: landlordRepulse.x, y: landlordRepulse.y };
      emit("update-landlord-position", landlordRepulse.x, landlordRepulse.y);
      repulsedBuildingIds.value.add("landlord");
      setTimeout(() => {
        repulsedBuildingIds.value.delete("landlord");
      }, 500);
    }

    const residentialUpdates = repulsedUpdates.filter((u) => u.id !== "landlord");
    if (residentialUpdates.length > 0) {
      for (const u of residentialUpdates) {
        repulsedBuildingIds.value.add(u.id);
      }
      setTimeout(() => {
        for (const u of residentialUpdates) {
          repulsedBuildingIds.value.delete(u.id);
        }
      }, 500);

      emit("update-building-positions", residentialUpdates);
      animatePinPositionsDuringTransition(450);
    } else {
      nextTick(updatePinPositions);
      setTimeout(updatePinPositions, 200);
      setTimeout(updatePinPositions, 450);
    }
  }
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
}

// Tenant Action Menu State
const contextMenu = ref<{
  show: boolean;
  x: number;
  y: number;
  tenant: Tenant | null;
  building: Building | null;
}>({
  show: false,
  x: 0,
  y: 0,
  tenant: null,
  building: null,
});

function handleTenantSelect(payload: { event: MouseEvent; tenant: Tenant; building: Building }) {
  if (threadDrag.value.isClickConnecting && threadDrag.value.sourceBuilding) {
    if (payload.building.id !== threadDrag.value.sourceBuilding.id) {
      completeConnection(threadDrag.value.sourceBuilding, payload.building);
      return;
    }
  }
  contextMenu.value = {
    show: true,
    x: payload.event.clientX,
    y: payload.event.clientY,
    tenant: payload.tenant,
    building: payload.building,
  };
}

function closeContextMenu() {
  contextMenu.value.show = false;
  contextMenu.value.tenant = null;
  contextMenu.value.building = null;
}

function handleJoinUnion(tenant: Tenant, building: Building) {
  emit("toggle-union", building.id, tenant.id, true);
}

function handleLeaveUnion(tenant: Tenant, building: Building) {
  emit("toggle-union", building.id, tenant.id, false);
}

function handleToggleEviction(tenant: Tenant, building: Building, evicted: boolean) {
  emit("toggle-eviction", building.id, tenant.id, evicted);
}

// Building Pencil Icon Tenant Adjustment Modal State
const adjustModal = ref<{
  show: boolean;
  building: Building | null;
}>({
  show: false,
  building: null,
});

function handleOpenAdjustModal(building: Building) {
  adjustModal.value = {
    show: true,
    building,
  };
}

function closeAdjustModal() {
  adjustModal.value.show = false;
  adjustModal.value.building = null;
}

function handleSaveAdjustTenants(
  buildingId: string,
  settingsOrCount: { count: number; label: string; color: string } | number,
) {
  if (typeof settingsOrCount === "object" && settingsOrCount !== null) {
    emit(
      "adjust-tenants",
      buildingId,
      settingsOrCount.count,
      settingsOrCount.label,
      settingsOrCount.color,
    );
  } else {
    emit("adjust-tenants", buildingId, settingsOrCount);
  }
}

// DOM Element references to buildings for exact thread pin coordinates
const buildingCardEls = new Map<string, HTMLElement>();
function setBuildingRef(buildingId: string, el: any) {
  if (el) {
    buildingCardEls.set(buildingId, (el.$el || el) as HTMLElement);
  } else {
    buildingCardEls.delete(buildingId);
  }
}

const canvasDimensions = ref({ width: 1200, height: 800 });
const pinPositions = ref<Record<string, { x: number; y: number }>>({});
const buildingRects = ref<Record<string, BuildingRect>>({});

function updatePinPositions() {
  const canvasEl = canvasRef.value;
  if (!canvasEl) return;
  const canvasRect = canvasEl.getBoundingClientRect();
  const scrollW = Math.max(canvasEl.scrollWidth, canvasRect.width);
  const scrollH = Math.max(canvasEl.scrollHeight, canvasRect.height);
  canvasDimensions.value = { width: scrollW, height: scrollH };

  const nextPositions: Record<string, { x: number; y: number }> = {};
  const nextRects: Record<string, BuildingRect> = {};

  for (const building of props.buildings) {
    const cardEl = buildingCardEls.get(building.id);
    if (cardEl) {
      const pinBtn = cardEl.querySelector(".coalition-pin-btn");
      if (pinBtn) {
        const pinRect = pinBtn.getBoundingClientRect();
        nextPositions[building.id] = {
          x: pinRect.left + pinRect.width / 2 - canvasRect.left + canvasEl.scrollLeft,
          y: pinRect.top + pinRect.height / 2 - canvasRect.top + canvasEl.scrollTop,
        };
      }
      const roughBox = (cardEl.querySelector(".building-rough-box") || cardEl) as HTMLElement;
      const bRect = roughBox.getBoundingClientRect();
      const x1 = bRect.left - canvasRect.left + canvasEl.scrollLeft;
      const y1 = bRect.top - canvasRect.top + canvasEl.scrollTop;
      const x2 = bRect.right - canvasRect.left + canvasEl.scrollLeft;
      const y2 = bRect.bottom - canvasRect.top + canvasEl.scrollTop;
      nextRects[building.id] = {
        x1,
        y1,
        x2,
        y2,
        cx: (x1 + x2) / 2,
        cy: (y1 + y2) / 2,
        width: bRect.width,
        height: bRect.height,
      };
      if (!nextPositions[building.id]) {
        nextPositions[building.id] = {
          x: x2 - 10,
          y: y1 - 10,
        };
      }
    } else {
      const est = getEstimatedBuildingRect(building.x, building.y, scrollW, scrollH);
      nextRects[building.id] = est;
      nextPositions[building.id] = {
        x: est.x2 - 10,
        y: est.y1 - 10,
      };
    }
  }
  pinPositions.value = nextPositions;
  buildingRects.value = nextRects;
}
let transitionAnimFrameId: number | null = null;
function animatePinPositionsDuringTransition(duration = 450) {
  if (transitionAnimFrameId !== null) {
    cancelAnimationFrame(transitionAnimFrameId);
  }
  const start = performance.now();
  function frame(now: number) {
    updatePinPositions();
    if (now - start < duration) {
      transitionAnimFrameId = requestAnimationFrame(frame);
    } else {
      transitionAnimFrameId = null;
    }
  }
  transitionAnimFrameId = requestAnimationFrame(frame);
}

useResizeObserver(canvasRef, () => {
  requestAnimationFrame(updatePinPositions);
});
useEventListener(window, "resize", updatePinPositions);
onKeyStroke("Escape", () => {
  if (threadDrag.value.isActive || threadDrag.value.isClickConnecting) {
    cancelThreadDrag();
  }
});

onMounted(() => {
  nextTick(updatePinPositions);
});

onUnmounted(() => {
  if (transitionAnimFrameId !== null) {
    cancelAnimationFrame(transitionAnimFrameId);
  }
  window.removeEventListener("pointermove", onThreadPointerMove);
  window.removeEventListener("pointerup", onThreadPointerUp);
  if (toastTimer) clearTimeout(toastTimer);
});
watch(
  () => props.buildings.map((b) => `${b.id}:${b.x}:${b.y}`),
  () => {
    animatePinPositionsDuringTransition(450);
  },
  { deep: true },
);
watch(effectivePersonWidth, () => {
  nextTick(updatePinPositions);
  setTimeout(updatePinPositions, 200);
});
watch(isEditingBuildings, () => {
  nextTick(updatePinPositions);
  setTimeout(updatePinPositions, 60);
});

// Toast notification banner
const toastNotice = ref<{ text: string; showUndo: boolean } | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function showToast(text: string, showUndo = false) {
  if (toastTimer) clearTimeout(toastTimer);
  toastNotice.value = { text, showUndo };
  toastTimer = setTimeout(() => {
    toastNotice.value = null;
  }, 6000);
}

function handleToastUndo() {
  emit("undo-coalition");
  toastNotice.value = null;
}

// Coalition thread dragging state
const threadDrag = ref<{
  isActive: boolean;
  sourceBuilding: Building | null;
  sourceX: number;
  sourceY: number;
  currentX: number;
  currentY: number;
  targetBuilding: Building | null;
  isClickConnecting: boolean;
}>({
  isActive: false,
  sourceBuilding: null,
  sourceX: 0,
  sourceY: 0,
  currentX: 0,
  currentY: 0,
  targetBuilding: null,
  isClickConnecting: false,
});

let startPointerClientX = 0;
let startPointerClientY = 0;

function handleStartThread(building: Building, e: PointerEvent) {
  if (e.button !== 0) return;
  e.stopPropagation();
  e.preventDefault();

  updatePinPositions();
  const pin = pinPositions.value[building.id];
  const canvasEl = canvasRef.value;
  if (!canvasEl) return;
  const canvasRect = canvasEl.getBoundingClientRect();
  const currX = e.clientX - canvasRect.left + canvasEl.scrollLeft;
  const currY = e.clientY - canvasRect.top + canvasEl.scrollTop;

  const startX = pin ? pin.x : currX;
  const startY = pin ? pin.y : currY;

  startPointerClientX = e.clientX;
  startPointerClientY = e.clientY;

  threadDrag.value = {
    isActive: true,
    sourceBuilding: building,
    sourceX: startX,
    sourceY: startY,
    currentX: currX,
    currentY: currY,
    targetBuilding: null,
    isClickConnecting: false,
  };

  window.addEventListener("pointermove", onThreadPointerMove);
  window.addEventListener("pointerup", onThreadPointerUp);
}

function findTargetBuildingAt(clientX: number, clientY: number, sourceId: string): Building | null {
  // Check elementFromPoint first in case pointer is over any child element of a building
  if (typeof document !== "undefined") {
    const hitEl = document.elementFromPoint(clientX, clientY);
    if (hitEl) {
      const slot = hitEl.closest(".spatial-building-slot");
      if (slot) {
        for (const [id, el] of buildingCardEls.entries()) {
          if (id !== sourceId && (el === slot || el.contains(hitEl))) {
            const found = props.buildings.find((b) => b.id === id);
            if (found) return found;
          }
        }
      }
    }
  }

  // Fallback to bounding rect check with generous hit margin around the building
  for (const building of props.buildings) {
    if (building.id === sourceId) continue;
    const cardEl = buildingCardEls.get(building.id);
    if (!cardEl) continue;
    const rect = cardEl.getBoundingClientRect();
    if (
      clientX >= rect.left - 24 &&
      clientX <= rect.right + 24 &&
      clientY >= rect.top - 24 &&
      clientY <= rect.bottom + 24
    ) {
      return building;
    }
  }
  return null;
}

function onThreadPointerMove(moveEvent: PointerEvent) {
  if (!threadDrag.value.isActive) return;
  const canvasEl = canvasRef.value;
  if (!canvasEl) return;
  const canvasRect = canvasEl.getBoundingClientRect();
  const currX = moveEvent.clientX - canvasRect.left + canvasEl.scrollLeft;
  const currY = moveEvent.clientY - canvasRect.top + canvasEl.scrollTop;

  const sourceId = threadDrag.value.sourceBuilding?.id ?? "";
  const target = findTargetBuildingAt(moveEvent.clientX, moveEvent.clientY, sourceId);

  threadDrag.value.targetBuilding = target;
  if (target) {
    const targetRect =
      buildingRects.value[target.id] ||
      getEstimatedBuildingRect(
        target.x,
        target.y,
        canvasDimensions.value.width,
        canvasDimensions.value.height,
      );
    const edgePt = getNearestEdgePointOnRect(
      threadDrag.value.sourceX,
      threadDrag.value.sourceY,
      targetRect,
    );
    threadDrag.value.currentX = edgePt.x;
    threadDrag.value.currentY = edgePt.y;
  } else {
    threadDrag.value.currentX = currX;
    threadDrag.value.currentY = currY;
  }
}

function onThreadPointerUp(upEvent: PointerEvent) {
  window.removeEventListener("pointermove", onThreadPointerMove);
  window.removeEventListener("pointerup", onThreadPointerUp);

  if (!threadDrag.value.isActive || !threadDrag.value.sourceBuilding) {
    threadDrag.value.isActive = false;
    return;
  }

  const dist = Math.hypot(
    upEvent.clientX - startPointerClientX,
    upEvent.clientY - startPointerClientY,
  );

  const source = threadDrag.value.sourceBuilding;
  const target =
    threadDrag.value.targetBuilding ||
    findTargetBuildingAt(upEvent.clientX, upEvent.clientY, source.id);

  if (target && target.id !== source.id) {
    completeConnection(source, target);
  } else if (dist < 6) {
    // User clicked button without dragging: activate click-connecting mode
    threadDrag.value.isClickConnecting = true;
    window.addEventListener("pointermove", onThreadPointerMove);
  } else {
    cancelThreadDrag();
  }
}

function completeConnection(source: Building, target: Building) {
  emit("connect-coalition", source.id, target.id);
  showToast(`Coalition formed: ${source.label} + ${target.label}!`, true);
  cancelThreadDrag();
  nextTick(updatePinPositions);
}

function cancelThreadDrag() {
  window.removeEventListener("pointermove", onThreadPointerMove);
  window.removeEventListener("pointerup", onThreadPointerUp);
  threadDrag.value = {
    isActive: false,
    sourceBuilding: null,
    sourceX: 0,
    sourceY: 0,
    currentX: 0,
    currentY: 0,
    targetBuilding: null,
    isClickConnecting: false,
  };
}

function handleBuildingSlotClick(building: Building) {
  if (threadDrag.value.isClickConnecting && threadDrag.value.sourceBuilding) {
    if (building.id !== threadDrag.value.sourceBuilding.id) {
      completeConnection(threadDrag.value.sourceBuilding, building);
    }
  }
}

function handleCanvasClick(e: MouseEvent) {
  if (threadDrag.value.isClickConnecting) {
    const targetEl = e.target as HTMLElement;
    if (
      !targetEl.closest(".spatial-building-slot") &&
      !targetEl.closest(".coalition-connecting-banner")
    ) {
      cancelThreadDrag();
    }
  }
}

// Rendered coalition threads
interface RenderedThread {
  id: string;
  sourceId: string;
  targetId: string;
  sourceLabel: string;
  targetLabel: string;
  color: string;
  pathData: string;
  midX: number;
  midY: number;
  roughPaths: PathInfo[];
}

const renderedThreads = computed<RenderedThread[]>(() => {
  const result: RenderedThread[] = [];
  const connections = props.coalitionConnections ?? [];
  const buildingsMap = new Map<string, Building>();
  for (const b of props.buildings) {
    buildingsMap.set(b.id, b);
  }

  const canvasW = canvasDimensions.value.width;
  const canvasH = canvasDimensions.value.height;

  for (const conn of connections) {
    const b1 = buildingsMap.get(conn.sourceId);
    const b2 = buildingsMap.get(conn.targetId);
    if (!b1 || !b2) continue;

    const r1 = buildingRects.value[b1.id] || getEstimatedBuildingRect(b1.x, b1.y, canvasW, canvasH);
    const r2 = buildingRects.value[b2.id] || getEstimatedBuildingRect(b2.x, b2.y, canvasW, canvasH);

    const { p1, p2 } = getEdgeConnectionPoints(r1, r2);
    const curve = computeThreadCurve(p1.x, p1.y, p2.x, p2.y);
    const color = props.buildingColorMap?.[b1.id] || b1.color;

    const seed = createSeed(`thread_${conn.id}_${b1.id}_${b2.id}`);
    const drawable = roughGen.path(curve.pathData, {
      stroke: color,
      strokeWidth: 2.8,
      roughness: 0.85,
      bowing: 1.0,
      seed,
    });
    const roughPaths = roughGen.toPaths(drawable);

    result.push({
      id: conn.id,
      sourceId: b1.id,
      targetId: b2.id,
      sourceLabel: b1.label,
      targetLabel: b2.label,
      color,
      pathData: curve.pathData,
      midX: curve.midX,
      midY: curve.midY,
      roughPaths,
    });
  }

  return result;
});

const activeDragThread = computed(() => {
  if (!threadDrag.value.isActive || !threadDrag.value.sourceBuilding) return null;
  const x1 = threadDrag.value.sourceX;
  const y1 = threadDrag.value.sourceY;
  const x2 = threadDrag.value.currentX;
  const y2 = threadDrag.value.currentY;
  const curve = computeThreadCurve(x1, y1, x2, y2);
  const color =
    props.buildingColorMap?.[threadDrag.value.sourceBuilding.id] ||
    threadDrag.value.sourceBuilding.color;
  return {
    pathData: curve.pathData,
    color,
    endX: x2,
    endY: y2,
  };
});

// Coalition Disconnect Confirmation Modal State
const breakModal = ref<{
  show: boolean;
  connectionId: string | null;
  sourceLabel: string;
  targetLabel: string;
}>({
  show: false,
  connectionId: null,
  sourceLabel: "",
  targetLabel: "",
});

function promptBreakCoalition(thread: RenderedThread) {
  breakModal.value = {
    show: true,
    connectionId: thread.id,
    sourceLabel: thread.sourceLabel,
    targetLabel: thread.targetLabel,
  };
}

function closeBreakModal() {
  breakModal.value.show = false;
  breakModal.value.connectionId = null;
}

function handleConfirmBreakCoalition(connectionId: string) {
  emit("disconnect-coalition", connectionId);
  showToast("Coalition connection disconnected.", false);
  closeBreakModal();
}

function handleDisconnectConnection(connectionId: string) {
  emit("disconnect-coalition", connectionId);
  showToast("Coalition connection disconnected.", false);
}

function handleDisconnectBuilding(buildingId: string) {
  emit("disconnect-building", buildingId);
  showToast("Building disconnected from coalition.", false);
}

function isBuildingInCoalition(buildingId: string): boolean {
  return (props.coalitionConnections ?? []).some(
    (c) => c.sourceId === buildingId || c.targetId === buildingId,
  );
}

function getBuildingCoalitionNames(buildingId: string): string {
  const connectedOtherIds = new Set<string>();
  for (const c of props.coalitionConnections ?? []) {
    if (c.sourceId === buildingId) connectedOtherIds.add(c.targetId);
    if (c.targetId === buildingId) connectedOtherIds.add(c.sourceId);
  }
  const names = props.buildings.filter((b) => connectedOtherIds.has(b.id)).map((b) => b.label);
  return names.join(", ");
}
</script>

<template>
  <main
    ref="canvasRef"
    class="building-canvas"
    :style="{
      '--person-width': `${effectivePersonWidth}px`,
      '--person-height': `${effectivePersonHeight}px`,
      '--person-scale': `${effectivePersonScale}`,
    }"
    role="main"
    @click="handleCanvasClick"
  >
    <!-- Coalition Connection Prompt Bar -->
    <transition name="fade-slide">
      <div v-if="threadDrag.isClickConnecting" class="coalition-connecting-banner">
        <Cable :size="15" :stroke-width="1.5" class="banner-icon" />
        <span class="banner-text">
          <strong>Connecting Coalition:</strong> Click another building to connect with
          {{ threadDrag.sourceBuilding?.label }}, or
          <button type="button" class="cancel-link-btn" @click.stop="cancelThreadDrag">
            cancel
          </button>
        </span>
      </div>
    </transition>

    <!-- Coalition Toast Notice (with Undo button) -->
    <transition name="fade-slide">
      <div v-if="toastNotice" class="coalition-toast-banner">
        <Cable :size="15" :stroke-width="1.5" class="toast-icon" />
        <span class="toast-text">{{ toastNotice.text }}</span>
        <button
          v-if="toastNotice.showUndo"
          type="button"
          class="toast-undo-btn"
          title="Undo last coalition connection"
          @click.stop="handleToastUndo"
        >
          ↶ Undo
        </button>
        <button
          type="button"
          class="toast-close-btn"
          @click.stop="toastNotice = null"
          aria-label="Close notice"
        >
          <X :size="12" :stroke-width="1.5" />
        </button>
      </div>
    </transition>

    <!-- SVG Layer for Coalition Threads -->
    <svg
      class="coalition-threads-layer"
      :style="{
        width: `${canvasDimensions.width}px`,
        height: `${canvasDimensions.height}px`,
      }"
      aria-label="Coalition threads layer"
    >
      <!-- Established coalition threads -->
      <g v-for="thread in renderedThreads" :key="thread.id" class="thread-group">
        <!-- Invisible wider stroke for easy click-to-disconnect -->
        <path
          :d="thread.pathData"
          class="thread-hit-area"
          @click.stop="promptBreakCoalition(thread)"
        >
          <title>
            {{
              `Coalition Thread: Click to disconnect ${thread.sourceLabel} and ${thread.targetLabel}`
            }}
          </title>
        </path>

        <!-- Rough.js hand-drawn sketched thread paths -->
        <path
          v-for="(p, pIdx) in thread.roughPaths"
          :key="pIdx"
          :d="p.d"
          :stroke="p.stroke"
          :stroke-width="p.strokeWidth"
          :fill="p.fill || 'none'"
          class="thread-sketch-path"
          pointer-events="none"
        />

        <!-- Subtle dashed stitch line along the thread -->
        <path
          :d="thread.pathData"
          :stroke="thread.color"
          class="thread-stitch-line"
          pointer-events="none"
        />

        <!-- Disconnect / Scissors cut pin at curve midpoint -->
        <g
          class="thread-cut-pin"
          :transform="`translate(${thread.midX}, ${thread.midY})`"
          role="button"
          :aria-label="`Disconnect coalition between ${thread.sourceLabel} and ${thread.targetLabel}`"
          @click.stop="promptBreakCoalition(thread)"
        >
          <!-- Stable transparent hit area so hover does not jitter at borders -->
          <circle r="16" class="cut-pin-hit-area" />
          <g class="cut-pin-content">
            <circle r="11" class="cut-pin-bg" :style="{ stroke: thread.color }" />
            <Scissors :size="13" :stroke-width="1.5" :x="-6.5" :y="-6.5" class="cut-pin-icon" />
          </g>
          <title>
            {{ `Disconnect coalition between ${thread.sourceLabel} and ${thread.targetLabel}` }}
          </title>
        </g>
      </g>

      <!-- Live dragging thread preview -->
      <g v-if="activeDragThread" class="live-drag-thread-group" pointer-events="none">
        <path
          :d="activeDragThread.pathData"
          :stroke="activeDragThread.color"
          class="live-thread-preview-path"
        />
        <!-- Thread endpoint indicator / needle -->
        <circle
          :cx="activeDragThread.endX"
          :cy="activeDragThread.endY"
          r="4.5"
          :fill="activeDragThread.color"
          class="live-thread-end-dot"
        />
      </g>
    </svg>

    <!-- Landlord, Inc. Corporate Headquarters Skyscraper (Movable) -->
    <div
      v-if="showLandlord"
      :ref="(el) => setBuildingRef('landlord', el)"
      class="spatial-building-slot spatial-landlord-slot"
      :class="{
        'is-active-drag': activeDragBuildingId === 'landlord',
        'is-being-placed-upon': hoveredCollisionBuildingId === 'landlord',
        'is-swapped': swappedBuildingIds.has('landlord'),
        'is-repulsed': repulsedBuildingIds.has('landlord'),
        'is-editable': isEditingBuildings,
      }"
      :style="{
        left: `${currentLandlordPos.x}%`,
        top: `${currentLandlordPos.y}%`,
      }"
      aria-label="Landlord, Inc. Corporate Headquarters"
    >
      <!-- Switch places indicator pill -->
      <transition name="fade-pop">
        <div
          v-if="hoveredCollisionBuildingId === 'landlord'"
          class="switch-places-badge"
          aria-hidden="true"
        >
          <span class="switch-icon">⇄</span>
          <span class="switch-text">Switch places</span>
        </div>
      </transition>
      <LandlordBuilding
        :landlord-money="landlordMoney"
        :can-move="isEditingBuildings"
        :edit-buildings="isEditingBuildings"
        @pointerdown-drag="handleLandlordPointerDownDrag"
      />
    </div>

    <!-- Spatially Scattered Residential Buildings -->
    <div
      v-for="building in buildings"
      :key="building.id"
      :ref="(el) => setBuildingRef(building.id, el)"
      class="spatial-building-slot"
      :class="{
        'is-active-drag': activeDragBuildingId === building.id,
        'is-being-placed-upon': hoveredCollisionBuildingId === building.id,
        'is-swapped': swappedBuildingIds.has(building.id),
        'is-repulsed': repulsedBuildingIds.has(building.id),
        'is-editable': isEditingBuildings,
      }"
      :style="{
        left: `${building.x}%`,
        top: `${building.y}%`,
      }"
      @click="handleBuildingSlotClick(building)"
    >
      <!-- Switch places indicator pill -->
      <transition name="fade-pop">
        <div
          v-if="hoveredCollisionBuildingId === building.id"
          class="switch-places-badge"
          aria-hidden="true"
        >
          <span class="switch-icon">⇄</span>
          <span class="switch-text">Switch places</span>
        </div>
      </transition>
      <BuildingCard
        :building="building"
        :effective-color="buildingColorMap[building.id] || building.color"
        :is-in-coalition="isBuildingInCoalition(building.id)"
        :is-organized="isBuildingOrganized(building, coalitions)"
        :coalitions="coalitions"
        :union-count="getBuildingUnionCount(building, coalitions, buildings)"
        :coalition-names="getBuildingCoalitionNames(building.id)"
        :is-connecting-source="threadDrag.sourceBuilding?.id === building.id"
        :is-connecting-target="threadDrag.targetBuilding?.id === building.id"
        :person-width="effectivePersonWidth"
        :can-move="isEditingBuildings"
        :edit-buildings="isEditingBuildings"
        @tenant-select="handleTenantSelect"
        @adjust-tenants="handleOpenAdjustModal"
        @pointerdown-drag="handlePointerDownDrag"
        @start-thread="handleStartThread"
      />
    </div>

    <!-- Action Menu for Tenants -->
    <TenantContextMenu
      :show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :tenant="contextMenu.tenant"
      :building="contextMenu.building"
      @close="closeContextMenu"
      @join="handleJoinUnion"
      @leave="handleLeaveUnion"
      @evict="handleToggleEviction"
    />

    <!-- Modal for Adjusting Building Tenants -->
    <TenantAdjustModal
      :show="adjustModal.show"
      :building="adjustModal.building"
      :default-people="defaultPeople"
      :total-buildings="buildings.length"
      @close="closeAdjustModal"
      @save="handleSaveAdjustTenants"
    />

    <!-- Modal for Breaking Coalition Confirmation -->
    <BreakCoalitionModal
      :show="breakModal.show"
      :connection-id="breakModal.connectionId"
      :source-label="breakModal.sourceLabel"
      :target-label="breakModal.targetLabel"
      @close="closeBreakModal"
      @confirm="handleConfirmBreakCoalition"
    />
    <!-- Bottom Corner: Actions Box -->
    <div class="canvas-actions-panel" role="region" aria-label="Canvas Actions">
      <RoughBox
        :stroke="'#786b59'"
        :fill="'#fcfaf6'"
        fill-style="solid"
        :roughness="0.5"
        :bowing="0.3"
        :stroke-width="1.4"
        :seed="905"
        class="canvas-actions-box"
      >
        <div class="canvas-actions-inner" :class="{ 'is-collapsed': actionsCollapsed }">
          <button
            type="button"
            class="actions-header"
            :class="{ 'is-collapsed': actionsCollapsed }"
            :aria-expanded="!actionsCollapsed"
            aria-controls="canvas-actions-items"
            :title="actionsCollapsed ? 'Expand actions' : 'Collapse actions'"
            @click="actionsCollapsed = !actionsCollapsed"
          >
            <span class="actions-title">Actions</span>
            <span class="actions-toggle-icon" aria-hidden="true">
              <ChevronUp v-if="actionsCollapsed" :size="13" :stroke-width="2" />
              <ChevronDown v-else :size="13" :stroke-width="2" />
            </span>
          </button>

          <div v-show="!actionsCollapsed" id="canvas-actions-items" class="actions-items">
            <!-- Can edit toggle -->
            <label
              class="can-edit-toggle edit-buildings-toggle can-move-toggle"
              :class="{ 'is-active': isEditingBuildings }"
            >
              <input
                type="checkbox"
                role="switch"
                v-model="isEditingBuildings"
                :aria-checked="isEditingBuildings"
                class="toggle-input sr-only"
              />
              <span class="toggle-switch" aria-hidden="true">
                <span class="toggle-knob" />
              </span>
              <span class="toggle-label">Can edit</span>
            </label>

            <!-- Show landlord toggle -->
            <label
              class="can-move-toggle show-landlord-toggle"
              :class="{ 'is-active': showLandlord }"
            >
              <input
                type="checkbox"
                role="switch"
                v-model="showLandlord"
                :aria-checked="showLandlord"
                class="toggle-input sr-only"
              />
              <span class="toggle-switch" aria-hidden="true">
                <span class="toggle-knob" />
              </span>
              <span class="toggle-label">Show landlord</span>
            </label>
          </div>
        </div>
      </RoughBox>
    </div>
  </main>
</template>
<style scoped>
.building-canvas {
  position: relative;
  width: 100%;
  min-height: calc(100vh - 65px);
  height: 100%;
  overflow: auto;
  background-color: #f7f2e9;
  background-image: radial-gradient(#d3c8b4 1.2px, transparent 1.2px);
  background-size: 24px 24px;
  background-position: 0 0;
  user-select: none;
}

.banner-icon {
  font-size: 14px;
  font-weight: 800;
}

/* Landlord, Inc. Skyscraper Slot */
.spatial-landlord-slot {
  z-index: 15;
  pointer-events: auto;
}

.spatial-landlord-slot.is-active-drag {
  z-index: 55;
}

.spatial-landlord-slot.is-being-placed-upon :deep(.glass-skyscraper-card) {
  outline: 2.5px dashed #0284c7;
  outline-offset: 4px;
}

/* Bottom Corner: Canvas Actions Panel */
.canvas-actions-panel {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 25;
  pointer-events: auto;
  user-select: none;
}

.canvas-actions-box {
  filter: drop-shadow(0 3px 10px rgba(0, 0, 0, 0.12));
}

.canvas-actions-inner {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 12px 10px 12px;
  min-width: 175px;
}

.canvas-actions-inner.is-collapsed {
  min-width: 110px;
  gap: 0;
  padding: 6px 10px;
}

.actions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px dashed #d6cebf;
  padding: 0 0 4px 0;
  margin: 0;
  cursor: pointer;
  color: #786b59;
  font: inherit;
  user-select: none;
  border-radius: 2px;
  transition: color 0.15s ease;
}

.actions-header:hover {
  color: #44403c;
}

.actions-header:hover .actions-title {
  color: #44403c;
}

.actions-header:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.actions-header.is-collapsed {
  border-bottom: none;
  padding-bottom: 0;
}

.actions-toggle-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  color: inherit;
}

.actions-title {
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #786b59;
  transition: color 0.15s ease;
}

.actions-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Can Edit / Edit Buildings / Can Move Toggle */
.can-edit-toggle,
.edit-buildings-toggle,
.can-move-toggle {
  align-items: center;
  gap: 9px;
  cursor: pointer;
  user-select: none;
  padding: 2px 2px;
}

.toggle-input.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.toggle-switch {
  position: relative;
  width: 32px;
  height: 18px;
  background-color: #d6cebf;
  border: 1.5px solid #786b59;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  padding: 1px;
  flex-shrink: 0;
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease;
}

.can-edit-toggle:hover .toggle-switch,
.edit-buildings-toggle:hover .toggle-switch,
.can-move-toggle:hover .toggle-switch {
  border-color: #574c3d;
  background-color: #c9bfaf;
}

.can-edit-toggle.is-active .toggle-switch,
.edit-buildings-toggle.is-active .toggle-switch,
.can-move-toggle.is-active .toggle-switch {
  background-color: #16a34a;
  border-color: #14532d;
}

.can-edit-toggle.is-active:hover .toggle-switch,
.edit-buildings-toggle.is-active:hover .toggle-switch,
.can-move-toggle.is-active:hover .toggle-switch {
  background-color: #15803d;
}

.toggle-input:focus-visible + .toggle-switch {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.toggle-knob {
  width: 12px;
  height: 12px;
  background-color: #ffffff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.28);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.can-edit-toggle.is-active .toggle-knob,
.edit-buildings-toggle.is-active .toggle-knob,
.can-move-toggle.is-active .toggle-knob {
  transform: translateX(14px);
}

.toggle-label {
  font-size: 0.84rem;
  font-weight: 700;
  color: #292524;
  letter-spacing: -0.01em;
}

/* Spatial placement of residential buildings */
.spatial-building-slot {
  position: absolute;
  transition:
    left 0.4s cubic-bezier(0.2, 0.8, 0.2, 1),
    top 0.4s cubic-bezier(0.2, 0.8, 0.2, 1),
    transform 0.15s ease-out;
  z-index: 10;
}

.spatial-building-slot.is-active-drag {
  transition: none;
  z-index: 50;
  transform: scale(1.03);
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.18));
}

.spatial-building-slot.is-being-placed-upon {
  transform: scale(0.97);
  filter: drop-shadow(0 0 12px rgba(245, 158, 11, 0.65));
  z-index: 25;
}

.spatial-building-slot.is-being-placed-upon :deep(.building-card-wrapper) {
  outline: 2.5px dashed #f59e0b;
  outline-offset: 4px;
}

.spatial-building-slot.is-repulsed {
  animation: repulse-pop 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes repulse-pop {
  0% {
    transform: scale(0.95);
  }
  45% {
    transform: scale(1.04);
  }
  100% {
    transform: scale(1);
  }
}

.spatial-building-slot.is-swapped {
  animation: swap-glow 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes swap-glow {
  0% {
    filter: drop-shadow(0 0 14px rgba(234, 179, 8, 0.85));
  }
  100% {
    filter: none;
  }
}

.switch-places-badge {
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  background-color: #fef08a;
  border: 1.5px solid #ca8a04;
  border-radius: 9999px;
  color: #713f12;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  white-space: nowrap;
  box-shadow: 0 4px 10px rgba(202, 138, 4, 0.35);
  pointer-events: none;
  z-index: 60;
}

.switch-icon {
  font-size: 13px;
  font-weight: 900;
  line-height: 1;
}

.fade-pop-enter-active,
.fade-pop-leave-active {
  transition: all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.fade-pop-enter-from,
.fade-pop-leave-to {
  opacity: 0;
  transform: translateX(-50%) scale(0.8);
}

/* Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Coalition banners */
.coalition-connecting-banner {
  position: sticky;
  top: 12px;
  left: 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 16px;
  background-color: #dbeafe;
  border: 1.5px solid #3b82f6;
  border-radius: 8px;
  color: #1e40af;
  font-size: 0.85rem;
  z-index: 45;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
  margin-left: 16px;
}

.cancel-link-btn {
  background: none;
  border: none;
  padding: 0;
  color: #1d4ed8;
  text-decoration: underline;
  cursor: pointer;
  font-weight: 700;
  font-size: inherit;
}

.cancel-link-btn:hover {
  color: #1e3a8a;
}

.coalition-toast-banner {
  position: sticky;
  top: 12px;
  left: 16px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 7px 16px;
  background-color: #fef3c7;
  border: 1.5px solid #d97706;
  border-radius: 8px;
  color: #78350f;
  font-size: 0.85rem;
  z-index: 45;
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.2);
  margin-left: 16px;
}

.toast-icon {
  font-size: 15px;
}

.toast-text {
  font-weight: 600;
}

.toast-undo-btn {
  background-color: #ffffff;
  border: 1.2px solid #b45309;
  border-radius: 4px;
  color: #92400e;
  padding: 2px 8px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s ease;
}

.toast-undo-btn:hover {
  background-color: #fde68a;
  color: #78350f;
}

.toast-close-btn {
  background: none;
  border: none;
  color: #92400e;
  cursor: pointer;
  font-size: 14px;
  padding: 0 2px;
  line-height: 1;
}

/* SVG Layer for Coalition Threads */
.coalition-threads-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 12;
  overflow: visible;
}

.thread-group {
  pointer-events: auto;
}

.thread-hit-area {
  fill: none;
  stroke: transparent;
  stroke-width: 24;
  cursor: pointer;
  pointer-events: stroke;
}

.thread-sketch-path {
  fill: none;
  pointer-events: none;
}

.thread-stitch-line {
  fill: none;
  stroke-dasharray: 6 5;
  stroke-width: 1.6;
  opacity: 0.8;
  pointer-events: none;
}

/* Midpoint Scissors Cut Pin */
.thread-cut-pin {
  cursor: pointer;
  pointer-events: auto;
}

.cut-pin-hit-area {
  fill: transparent;
  stroke: none;
  pointer-events: all;
}

.cut-pin-content {
  transform-origin: 0 0;
  transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.thread-cut-pin:hover .cut-pin-content {
  transform: scale(1.25);
}

.thread-cut-pin:active .cut-pin-content {
  transform: scale(1.1);
}

.cut-pin-bg {
  fill: #fffdfa;
  stroke-width: 1.8;
  transition:
    fill 0.15s ease,
    stroke 0.15s ease;
}

.thread-cut-pin:hover .cut-pin-bg {
  fill: #fee2e2;
  stroke: #ef4444 !important;
}

.cut-pin-icon {
  font-size: 11px;
  font-weight: 800;
  fill: #44403c;
  user-select: none;
  transition: fill 0.15s ease;
}

.thread-cut-pin:hover .cut-pin-icon {
  fill: #dc2626;
}

/* Live dragging thread preview */
.live-drag-thread-group {
  pointer-events: none;
  z-index: 30;
}

.live-thread-preview-path {
  fill: none;
  stroke-width: 3.2;
  stroke-dasharray: 8 5;
  animation: thread-march 0.6s linear infinite;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.22));
}

@keyframes thread-march {
  from {
    stroke-dashoffset: 13;
  }
  to {
    stroke-dashoffset: 0;
  }
}

.live-thread-end-dot {
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.3));
}
</style>
