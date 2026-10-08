<script setup lang="ts">
import { computed, ref, watch, nextTick, useTemplateRef } from "vue";
import { onClickOutside, onKeyStroke, useEventListener } from "@vueuse/core";
import type { Tenant, Building } from "../types/game";
import { Users, Star, Ban, Undo2, Check, X } from "lucide-vue-next";
import RoughBox from "./RoughBox.vue";
import RoughButton from "./RoughButton.vue";

const props = defineProps<{
  show: boolean;
  x: number;
  y: number;
  tenant: Tenant | null;
  building: Building | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "join", tenant: Tenant, building: Building): void;
  (e: "leave", tenant: Tenant, building: Building): void;
  (e: "evict", tenant: Tenant, building: Building, evicted: boolean): void;
}>();
const menuRef = useTemplateRef<HTMLElement>("menuRef");
const adjustedX = ref(0);
const adjustedY = ref(0);

onClickOutside(menuRef, () => {
  if (props.show) emit("close");
});

onKeyStroke("Escape", () => {
  if (props.show) emit("close");
});

useEventListener(window, "resize", updatePosition);

function updatePosition() {
  const menuWidth = 250;
  const menuHeight = 280;
  const padding = 12;

  let nx = props.x;
  let ny = props.y;

  if (nx + menuWidth > window.innerWidth - padding) {
    nx = Math.max(padding, window.innerWidth - menuWidth - padding);
  }
  if (ny + menuHeight > window.innerHeight - padding) {
    ny = Math.max(padding, window.innerHeight - menuHeight - padding);
  }

  adjustedX.value = nx;
  adjustedY.value = ny;
}

watch(
  () => [props.show, props.x, props.y],
  ([show]) => {
    if (show) {
      updatePosition();
      nextTick(() => updatePosition());
    }
  },
  { immediate: true },
);

const isInstigator = computed(() => Boolean(props.tenant?.isInstigator));
const inUnion = computed(() => Boolean(props.tenant?.inUnion || props.tenant?.isInstigator));
const isEvicted = computed(() => Boolean(props.tenant?.isEvicted));

function handleJoin() {
  if (props.tenant && props.building) {
    emit("join", props.tenant, props.building);
    emit("close");
  }
}

function handleLeave() {
  if (props.tenant && props.building && !props.tenant.isInstigator) {
    emit("leave", props.tenant, props.building);
    emit("close");
  }
}

function handleToggleEviction(evicted: boolean) {
  if (props.tenant && props.building) {
    emit("evict", props.tenant, props.building, evicted);
    emit("close");
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show && tenant && building"
      class="context-menu-backdrop"
      @click="emit('close')"
      @contextmenu.prevent="emit('close')"
    >
      <div
        ref="menuRef"
        class="context-menu-popover"
        :style="{
          left: `${adjustedX}px`,
          top: `${adjustedY}px`,
        }"
        @click.stop
        @contextmenu.stop.prevent
      >
        <RoughBox
          :stroke="'#292524'"
          :fill="'#faf7f2'"
          fill-style="solid"
          :roughness="0.8"
          :stroke-width="1.4"
          :seed="333"
          class="menu-rough-box"
        >
          <div class="menu-content">
            <!-- Header plaque -->
            <div class="menu-header">
              <span class="building-color-dot" :style="{ backgroundColor: building.color }" />
              <div class="menu-title-group">
                <span class="building-name">{{ building.label }}</span>
                <span class="tenant-unit">Resident ({{ tenant.id }})</span>
              </div>
              <button
                type="button"
                class="close-button"
                aria-label="Close menu"
                @click="emit('close')"
              >
                <X :size="14" :stroke-width="1.5" />
              </button>
            </div>

            <!-- Status Indicator -->
            <div v-if="isEvicted || isInstigator || inUnion" class="status-indicator">
              <span v-if="isEvicted" class="status-badge evicted">
                <Ban
                  :size="12"
                  :stroke-width="1.5"
                  style="margin-right: 3px; vertical-align: -1px"
                />
                Evicted
              </span>
              <span
                v-if="isInstigator"
                class="status-badge instigator"
                :style="{ borderColor: building.color, color: building.color }"
              >
                <Star
                  :size="12"
                  :stroke-width="1.5"
                  style="margin-right: 3px; vertical-align: -1px"
                />
                Building Instigator
              </span>
              <span
                v-else-if="inUnion"
                class="status-badge in-union"
                :style="{ borderColor: building.color, color: building.color }"
              >
                <Users
                  :size="12"
                  :stroke-width="1.5"
                  style="margin-right: 3px; vertical-align: -1px"
                />
                Union Member
              </span>
            </div>
            <!-- Actions List -->
            <div class="actions-list">
              <RoughButton
                v-if="!inUnion"
                variant="primary"
                :seed="334"
                class="menu-action-btn"
                @click="handleJoin"
              >
                <span style="display: inline-flex; align-items: center"
                  ><Users :size="13" :stroke-width="1.5" style="margin-right: 5px" /> Join
                  union</span
                >
              </RoughButton>

              <RoughButton
                v-else-if="inUnion && !isInstigator"
                variant="secondary"
                :seed="335"
                class="menu-action-btn"
                @click="handleLeave"
              >
                <span style="display: inline-flex; align-items: center"
                  ><Undo2 :size="13" :stroke-width="1.5" style="margin-right: 5px" /> Leave
                  union</span
                >
              </RoughButton>

              <div v-else class="instigator-notice">
                <span>Building instigator is a founding union member.</span>
              </div>

              <!-- Eviction Action -->
              <RoughButton
                v-if="!isEvicted"
                variant="danger"
                :seed="336"
                class="menu-action-btn"
                @click="handleToggleEviction(true)"
              >
                <span style="display: inline-flex; align-items: center"
                  ><Ban :size="13" :stroke-width="1.5" style="margin-right: 5px" /> Evict
                  person</span
                >
              </RoughButton>

              <RoughButton
                v-else
                variant="secondary"
                :seed="337"
                class="menu-action-btn"
                @click="handleToggleEviction(false)"
              >
                <span style="display: inline-flex; align-items: center"
                  ><Check :size="13" :stroke-width="1.5" style="margin-right: 5px" /> Cancel
                  eviction</span
                >
              </RoughButton>
            </div>
          </div>
        </RoughBox>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.context-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-color: transparent;
}

.context-menu-popover {
  position: fixed;
  width: 230px;
  filter: drop-shadow(0 6px 14px rgba(41, 37, 36, 0.22));
  animation: pop-in 0.12s cubic-bezier(0, 0, 0.2, 1);
  user-select: none;
}

@keyframes pop-in {
  from {
    opacity: 0;
    transform: scale(0.94);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.menu-rough-box {
  width: 100%;
}

.menu-content {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.menu-header {
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px dashed #d6cfc4;
  padding-bottom: 6px;
}

.building-color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1.5px solid #292524;
  flex-shrink: 0;
}

.menu-title-group {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.building-name {
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
  font-weight: 700;
  font-size: 14.5px;
  color: #1c1917;
  line-height: 1.25;
}

.tenant-unit {
  font-size: 11px;
  color: #78716c;
}

.close-button {
  background: none;
  border: none;
  font-size: 12px;
  color: #a8a29e;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
}

.close-button:hover {
  color: #1c1917;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.status-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 6px;
  border-radius: 4px;
  border: 1px solid #d6cfc4;
  background-color: #ffffff;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.status-badge.evicted {
  color: #dc2626;
  background-color: #fee2e2;
  border-color: #f87171;
}

.actions-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.menu-action-btn {
  width: 100%;
  text-align: center;
}

.instigator-notice {
  font-size: 11px;
  color: #78716c;
  font-style: italic;
  padding: 4px;
  background: #f5f5f4;
  border-radius: 4px;
  text-align: center;
}
</style>
