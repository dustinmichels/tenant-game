<script setup lang="ts">
import { computed } from "vue";
import type { Building, CoalitionGroup } from "../types/game";
import { getBuildingUnionCount } from "../types/game";
import {
  blendHexColors,
  getCoalitionGradient,
  getLightTint,
  getContrastTextColor,
} from "../utils/coalitionColors";

interface DecoratedCoalition {
  id: string;
  name: string;
  coalition: CoalitionGroup;
  buildings: Building[];
  colors: string[];
  dominantColor: string;
  blendedColor: string;
  gradient: string;
  totalUnionCount: number;
}

const props = withDefaults(
  defineProps<{
    buildings: Building[];
    coalitions?: CoalitionGroup[];
    buildingColorMap?: Record<string, string>;
  }>(),
  {
    coalitions: () => [],
    buildingColorMap: () => ({}),
  },
);

const buildingById = computed<Record<string, Building>>(() => {
  const map: Record<string, Building> = {};
  for (const b of props.buildings) {
    map[b.id] = b;
  }
  return map;
});

const coalitionBuildingIds = computed<Record<string, true>>(() => {
  const ids: Record<string, true> = {};
  for (const c of props.coalitions) {
    for (const id of c.buildingIds) {
      ids[id] = true;
    }
  }
  return ids;
});

const unalignedBuildings = computed(() =>
  props.buildings.filter((b) => !coalitionBuildingIds.value[b.id]),
);

const decoratedCoalitions = computed<DecoratedCoalition[]>(() => {
  return props.coalitions.map((c, idx) => {
    const memberBuildings = c.buildingIds
      .map((id) => buildingById.value[id])
      .filter((b): b is Building => b !== undefined);

    const colors = memberBuildings.map((b) => b.color);
    return {
      id: c.id,
      name: `Coalition ${idx + 1}`,
      coalition: c,
      buildings: memberBuildings,
      colors,
      dominantColor: c.dominantColor,
      blendedColor: blendHexColors(colors),
      gradient: getCoalitionGradient(colors),
      totalUnionCount: c.totalUnionCount,
    };
  });
});
</script>

<template>
  <div class="coalitions-tracker-card" aria-label="Building Coalitions">
    <!-- Header with title and count -->
    <div class="tracker-header">
      <div class="tracker-title-row">
        <span class="tracker-icon" aria-hidden="true">🔗</span>
        <h3 class="tracker-title">Coalitions</h3>
      </div>
      <span
        v-if="coalitions.length > 0"
        class="tracker-badge active"
        title="Number of active coalitions"
      >
        {{ coalitions.length }} active
      </span>
      <span v-else class="tracker-badge idle"> None yet </span>
    </div>

    <!-- Active Coalitions Section -->
    <div v-if="decoratedCoalitions.length > 0" class="coalitions-list">
      <div
        v-for="item in decoratedCoalitions"
        :key="item.id"
        class="coalition-box"
        :style="{
          borderColor: item.dominantColor,
          boxShadow: `0 2px 8px ${getLightTint(item.dominantColor, 0.2)}`,
        }"
      >
        <!-- Top accent banner with the combined color gradient -->
        <div class="coalition-top-accent" :style="{ background: item.gradient }" />

        <!-- Coalition Box Header -->
        <div
          class="coalition-box-header"
          :style="{
            backgroundColor: getLightTint(item.dominantColor, 0.08),
            borderBottomColor: getLightTint(item.dominantColor, 0.2),
          }"
        >
          <div class="coalition-title-wrap">
            <span
              class="combined-color-swatch"
              :style="{ background: item.gradient }"
              title="Combined coalition color"
            />
            <h4 class="coalition-name">{{ item.name }}</h4>
          </div>

          <div class="coalition-meta">
            <span
              class="combined-pill"
              :style="{
                backgroundColor: item.dominantColor,
                color: getContrastTextColor(item.dominantColor),
              }"
              title="Combined dominant color of this coalition"
            >
              Combined Color
            </span>
          </div>
        </div>

        <!-- Member Buildings inside the Coalition Box -->
        <div class="coalition-members-inside">
          <div
            v-for="b in item.buildings"
            :key="b.id"
            class="building-rect inside-coalition"
            :style="{
              borderColor: b.color,
              backgroundColor: getLightTint(b.color, 0.08),
            }"
          >
            <span
              class="building-swatch"
              :style="{ backgroundColor: b.color }"
              :title="`${b.label} color`"
            />
            <div class="building-info">
              <span class="building-name">{{ b.label }}</span>
              <span class="building-sub">{{ getBuildingUnionCount(b) }} in union</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Unaligned / Standalone Buildings Section -->
    <div v-if="unalignedBuildings.length > 0" class="unaligned-section">
      <div v-if="decoratedCoalitions.length > 0" class="unaligned-title">
        <span>Independent Buildings</span>
      </div>
      <div v-else class="initial-hint">
        <span>Connect buildings on the canvas to form coalitions:</span>
      </div>

      <div class="buildings-rect-grid">
        <div
          v-for="b in unalignedBuildings"
          :key="b.id"
          class="building-rect"
          :style="{
            borderColor: b.color,
            backgroundColor: getLightTint(b.color, 0.08),
          }"
        >
          <span
            class="building-swatch"
            :style="{ backgroundColor: b.color }"
            :title="`${b.label} color`"
          />
          <div class="building-info">
            <span class="building-name">{{ b.label }}</span>
            <span class="building-sub">{{ getBuildingUnionCount(b) }} in union</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.coalitions-tracker-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  background-color: #fffdf9;
  border: 1.5px solid #d9cebc;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  box-sizing: border-box;
}

.tracker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1.5px dashed #ded4c3;
}

.tracker-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tracker-icon {
  font-size: 16px;
  line-height: 1;
}

.tracker-title {
  margin: 0;
  font-size: 1.02rem;
  font-weight: 800;
  color: #1f1b16;
  letter-spacing: -0.01em;
}

.tracker-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.tracker-badge.active {
  background-color: #f5f3ff;
  color: #6d28d9;
  border: 1px solid #c4b5fd;
}

.tracker-badge.idle {
  background-color: #f5f5f4;
  color: #78716c;
  border: 1px solid #e7e5e4;
}

.coalitions-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.coalition-box {
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border: 2px solid #7c3aed;
  border-radius: 8px;
  overflow: hidden;
  box-sizing: border-box;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.coalition-box:hover {
  transform: translateY(-1px);
}

.coalition-top-accent {
  height: 4px;
  width: 100%;
}

.coalition-box-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-bottom: 1px solid #ded4c3;
  gap: 8px;
}

.coalition-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.combined-color-swatch {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  flex-shrink: 0;
}

.coalition-name {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 800;
  color: #1f1b16;
}

.coalition-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.combined-pill {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 10px;
  letter-spacing: 0.3px;
  white-space: nowrap;
}

.coalition-members-inside {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 6px;
  padding: 8px;
  background-color: #fffdfa;
}

.unaligned-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.unaligned-title {
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #78716c;
  padding-top: 2px;
}

.initial-hint {
  font-size: 0.78rem;
  color: #786d5e;
  font-style: italic;
}

.buildings-rect-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 6px;
}

.building-rect {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1.5px solid #d9cebc;
  border-radius: 6px;
  background-color: #faf7f2;
  box-sizing: border-box;
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease;
}

.building-rect:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.building-rect.inside-coalition {
  background-color: #ffffff;
}

.building-swatch {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.18);
  flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.building-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.15;
}

.building-name {
  font-size: 0.8rem;
  font-weight: 700;
  color: #1f1b16;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.building-sub {
  font-size: 0.68rem;
  color: #78716c;
  font-weight: 500;
}
</style>
