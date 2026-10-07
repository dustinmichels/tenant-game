<script setup lang="ts">
import { computed, shallowRef } from "vue";
import type {
  Building,
  RoundTally,
  CoalitionGroup,
  GameEvent,
  EventTextSegment,
} from "../types/game";
import { parseEventSegments } from "../utils/eventLog";
import {
  getBuildingUnionCount,
  getTotalUnionCount,
  getCoalitionUnionCount,
  isSpendEvent,
  isEarnEvent,
} from "../types/game";
import RoughBox from "./RoughBox.vue";
import RoughButton from "./RoughButton.vue";
import LandlordFundsModal from "./LandlordFundsModal.vue";
import { Banknote, X } from "lucide-vue-next";
import {
  formatCurrency,
  formatCompactCurrency,
  DEFAULT_LANDLORD_MONEY_PER_PLAYER,
} from "../utils/currency";

const props = withDefaults(
  defineProps<{
    tallies: Record<number, RoundTally>;
    currentRound: number;
    buildings: Building[];
    landlordMoney?: number;
    landlordStartingMoney?: number;
    coalitionCount?: number;
    coalitions?: CoalitionGroup[];
    events?: GameEvent[];
    buildingColorMap?: Record<string, string>;
  }>(),
  {
    landlordMoney: undefined,
    landlordStartingMoney: undefined,
    coalitionCount: 0,
    coalitions: () => [],
    events: () => [],
    buildingColorMap: () => ({}),
  },
);

const emit = defineEmits<{
  (e: "add-event", text: string): void;
  (e: "remove-event", id: string): void;
  (e: "spend-landlord-money", amount?: number): void;
  (e: "earn-landlord-money", amount?: number): void;
}>();

const isLandlordModalOpen = shallowRef(false);

function handleSpendLandlordMoney(amount: number) {
  emit("spend-landlord-money", amount);
}

function handleEarnLandlordMoney(amount: number) {
  emit("earn-landlord-money", amount);
}

const newEventText = shallowRef("");

function handleAddEvent() {
  const trimmed = newEventText.value.trim();
  if (!trimmed) return;
  emit("add-event", trimmed);
  newEventText.value = "";
}

function handleQuickSpend() {
  emit("spend-landlord-money", 50000);
}

const roundNumbers = computed(() => {
  const existingRounds = Object.keys(props.tallies).map(Number);
  const maxR = Math.max(props.currentRound, ...existingRounds, 1);
  const rounds: number[] = [];
  for (let r = 1; r <= maxR; r++) {
    rounds.push(r);
  }
  return rounds;
});

function getTallyForRound(r: number): RoundTally {
  return (
    props.tallies[r] ?? {
      round: r,
      landlordSpending: null,
      totalOrganized: 0,
      evictions: 0,
      totalEvictions: 0,
      buildingsOrganized: 0,
    }
  );
}
function getOrganizedForRound(r: number): number {
  if (r === props.currentRound) {
    return unionTenantsCount.value;
  }
  return getTallyForRound(r).totalOrganized;
}

function getUnionChangeForRound(r: number): number {
  const currentOrganized = getOrganizedForRound(r);
  const prevOrganized = r > 1 ? getOrganizedForRound(r - 1) : 0;
  return currentOrganized - prevOrganized;
}

function getEvictionChangeForRound(r: number): number {
  if (r === props.currentRound) {
    return props.buildings.reduce(
      (sum, b) =>
        sum +
        b.tenants.filter(
          (t) => t.isEvicted && (t.evictedRound ?? props.currentRound) === props.currentRound,
        ).length,
      0,
    );
  }
  return getTallyForRound(r).evictions;
}

function formatChange(val: number): string {
  if (val > 0) return `+${val}`;
  return `${val}`;
}

const currentLandlordMoney = computed(() => {
  if (typeof props.landlordMoney === "number") {
    return props.landlordMoney;
  }
  const currentTally = props.tallies[props.currentRound];
  if (currentTally && typeof currentTally.landlordRemaining === "number") {
    return currentTally.landlordRemaining;
  }
  return props.landlordStartingMoney ?? totalTenants.value * DEFAULT_LANDLORD_MONEY_PER_PLAYER;
});

function getLandlordFundsForRound(r: number): number {
  const tally = props.tallies[r];
  if (tally && typeof tally.landlordRemaining === "number") {
    return tally.landlordRemaining;
  }
  if (r === props.currentRound) {
    return currentLandlordMoney.value;
  }
  return props.landlordStartingMoney ?? totalTenants.value * DEFAULT_LANDLORD_MONEY_PER_PLAYER;
}

function getLandlordSpendingForRound(r: number): number {
  const tally = props.tallies[r];
  if (tally && typeof tally.landlordSpending === "number") {
    return tally.landlordSpending;
  }
  return 0;
}

const buildingCount = computed(() => props.buildings.length);

const totalTenants = computed(() => props.buildings.reduce((sum, b) => sum + b.tenants.length, 0));

// Counting unions rule: at least 2 people needed to count as a union (standalone or via coalition)
const unionTenantsCount = computed(() => getTotalUnionCount(props.buildings, props.coalitions));

const coalitionTenantsCount = computed(() =>
  getCoalitionUnionCount(props.buildings, props.coalitions),
);

const unionPercent = computed(() => {
  if (totalTenants.value <= 0) return 0;
  return Math.round((unionTenantsCount.value / totalTenants.value) * 100);
});

const coalitionPercent = computed(() => {
  if (totalTenants.value <= 0) return 0;
  return Math.round((coalitionTenantsCount.value / totalTenants.value) * 100);
});

const totalEvictionsCount = computed(() =>
  props.buildings.reduce((sum, b) => sum + b.tenants.filter((t) => t.isEvicted).length, 0),
);
const effectiveBuildingColorMap = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {};
  for (const b of props.buildings) {
    map[b.id] = props.buildingColorMap?.[b.id] || b.color;
  }
  if (!props.buildingColorMap || Object.keys(props.buildingColorMap).length === 0) {
    for (const g of props.coalitions) {
      for (const bId of g.buildingIds) {
        map[bId] = g.dominantColor;
      }
    }
  }
  return map;
});

const eventSegmentsMap = computed(() => {
  const map = new Map<string, EventTextSegment[]>();
  const colorMap = effectiveBuildingColorMap.value;
  for (const event of props.events) {
    map.set(event.id, parseEventSegments(event.text, props.buildings, colorMap, event.buildingId));
  }
  return map;
});
</script>

<template>
  <div class="tally-container">
    <div class="tally-body">
      <!-- Landlord Actions: Earns/Spends & Spends 50k -->
      <div class="landlord-actions-row">
        <RoughButton
          variant="warning"
          :seed="907"
          title="Manage Landlord Funds (Spend / Earn)"
          class="landlord-action-btn"
          @click="isLandlordModalOpen = true"
        >
          <span class="landlord-btn-content">
            <Banknote :size="15" :stroke-width="1.5" class="landlord-btn-icon" aria-hidden="true" />
            <span class="landlord-btn-text">Landlord earns/spends</span>
          </span>
        </RoughButton>

        <RoughButton
          variant="danger"
          :seed="925"
          title="Quick action: Landlord spends $50,000"
          class="landlord-action-btn"
          @click="handleQuickSpend"
        >
          <span class="landlord-btn-content">
            <Banknote :size="15" :stroke-width="1.5" class="landlord-btn-icon" aria-hidden="true" />
            <span class="landlord-btn-text">Landlord spends 50k</span>
          </span>
        </RoughButton>
      </div>

      <!-- Events Section (Space above the table) -->
      <div class="events-card">
        <div class="events-header">
          <div class="events-title-wrap">
            <span class="events-title">Events</span>
            <span v-if="events && events.length > 0" class="events-count">
              {{ events.length }}
            </span>
          </div>
        </div>

        <!-- Bullet list of events: general events are grey/blue, spending money is red, earning money is green -->
        <ul v-if="events && events.length > 0" class="events-list">
          <li
            v-for="event in events"
            :key="event.id"
            class="event-bullet-item"
            :class="{ 'is-spend': isSpendEvent(event), 'is-earn': isEarnEvent(event) }"
          >
            <span class="event-text">
              <template
                v-for="(seg, sIdx) in eventSegmentsMap.get(event.id) ?? [
                  { text: event.text, isBuilding: false },
                ]"
                :key="sIdx"
              >
                <span
                  v-if="seg.isBuilding"
                  class="event-building-name"
                  :style="{ color: seg.color }"
                  >{{ seg.text }}</span
                >
                <template v-else>{{ seg.text }}</template>
              </template>
            </span>
            <button
              type="button"
              class="event-remove-btn"
              title="Remove event"
              aria-label="Remove event"
              @click="emit('remove-event', event.id)"
            >
              <X :size="11" :stroke-width="1.5" />
            </button>
          </li>
        </ul>
        <p v-else class="events-empty-hint">No events recorded yet.</p>

        <!-- Input to record a new event -->
        <form class="event-input-form" @submit.prevent="handleAddEvent">
          <input
            v-model="newEventText"
            type="text"
            class="event-input"
            placeholder="Record event... (e.g. landlord spends 50k)"
            aria-label="Record event"
          />
          <button
            type="submit"
            class="event-add-btn"
            :disabled="!newEventText.trim()"
            title="Record event"
          >
            Add
          </button>
        </form>
      </div>

      <!-- Tally Table (Read Only) -->
      <div class="tally-table-wrapper">
        <table class="tally-table">
          <thead>
            <tr>
              <th class="col-round" title="Game Round">Round</th>
              <th class="col-landlord" title="Remaining landlord funds (reduced sum)">
                Landlord $
              </th>
              <th class="col-organized" title="Change in union residents this round">In Union</th>
              <th class="col-evictions" title="Evictions this round">Evictions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in roundNumbers"
              :key="r"
              class="tally-row"
              :class="{
                'is-current-round': r === currentRound,
              }"
            >
              <!-- Round label -->
              <td class="cell-round">
                <span class="round-name">R{{ r }}</span>
              </td>

              <!-- Landlord Funds (Reduced Sum) -->
              <td class="cell-number cell-landlord">
                <div class="landlord-display-wrap">
                  <span
                    class="val-display val-landlord"
                    :title="`Remaining landlord funds in Round ${r}: ${formatCurrency(getLandlordFundsForRound(r))}`"
                  >
                    {{ formatCompactCurrency(getLandlordFundsForRound(r)) }}
                  </span>
                  <span
                    v-if="getLandlordSpendingForRound(r) > 0"
                    class="spent-tag"
                    :title="`Spent in Round ${r}: ${formatCurrency(getLandlordSpendingForRound(r))}`"
                  >
                    (-{{ formatCompactCurrency(getLandlordSpendingForRound(r)) }})
                  </span>
                </div>
              </td>

              <!-- Union Change (Read Only) -->
              <td class="cell-number cell-union">
                <span
                  class="val-display val-union"
                  :class="{
                    'is-zero': getUnionChangeForRound(r) === 0,
                    'is-negative': getUnionChangeForRound(r) < 0,
                  }"
                  :title="`Change in union members in Round ${r}: ${formatChange(getUnionChangeForRound(r))}${
                    getOrganizedForRound(r) !== undefined
                      ? ` (${getOrganizedForRound(r)} total)`
                      : ''
                  }`"
                >
                  {{ formatChange(getUnionChangeForRound(r)) }}
                </span>
              </td>

              <!-- Evictions that Round (Read Only) -->
              <td class="cell-number cell-evictions">
                <span
                  class="val-display val-evictions"
                  :class="{
                    'is-zero': getEvictionChangeForRound(r) === 0,
                  }"
                  :title="`Evictions in Round ${r}: ${formatChange(getEvictionChangeForRound(r))}${
                    getTallyForRound(r).totalEvictions !== undefined
                      ? ` (${getTallyForRound(r).totalEvictions} cumulative total)`
                      : ''
                  }`"
                >
                  {{ formatChange(getEvictionChangeForRound(r)) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Running Counts / Summary Metrics (Pinned to bottom of sidebar) -->
    <div class="tally-footer-card">
      <div class="metrics-section">
        <RoughBox
          :stroke="'#a89c8a'"
          :fill="'#faf7f2'"
          fill-style="solid"
          :roughness="0.8"
          :stroke-width="1.0"
          :seed="901"
          class="metric-box"
        >
          <div class="metric-pill" :title="`${buildingCount} total buildings`">
            <span class="metric-label">Buildings</span>
            <span class="metric-value">{{ buildingCount }}</span>
          </div>
        </RoughBox>

        <RoughBox
          :stroke="'#292524'"
          :fill="'#fef3c7'"
          fill-style="solid"
          :roughness="1.0"
          :stroke-width="1.3"
          :seed="903"
          class="metric-box"
        >
          <div
            class="metric-pill highlight"
            :title="`${totalTenants} total tenants across all buildings`"
          >
            <span class="metric-label">Tenants</span>
            <span class="metric-value">{{ totalTenants }}</span>
          </div>
        </RoughBox>

        <RoughBox
          :stroke="'#15803d'"
          :fill="'#dcfce7'"
          fill-style="solid"
          :roughness="0.9"
          :stroke-width="1.1"
          :seed="904"
          class="metric-box"
        >
          <div
            class="metric-pill union"
            :title="`${unionTenantsCount} of ${totalTenants} tenants in union (${unionPercent}%)`"
          >
            <span class="metric-label">In Union</span>
            <div class="metric-value-row">
              <span class="metric-value">{{ unionTenantsCount }}</span>
              <span class="metric-percent">({{ unionPercent }}%)</span>
            </div>
          </div>
        </RoughBox>

        <RoughBox
          :stroke="'#7c3aed'"
          :fill="'#f5f3ff'"
          fill-style="solid"
          :roughness="0.9"
          :stroke-width="1.1"
          :seed="908"
          class="metric-box"
        >
          <div
            class="metric-pill coalition"
            :title="`${coalitionTenantsCount} of ${totalTenants} tenants in coalition (${coalitionPercent}%)`"
          >
            <span class="metric-label">In Coalition</span>
            <div class="metric-value-row">
              <span class="metric-value">{{ coalitionTenantsCount }}</span>
              <span class="metric-percent">({{ coalitionPercent }}%)</span>
            </div>
          </div>
        </RoughBox>
      </div>
    </div>

    <!-- Landlord Spend/Earn Modal -->
    <LandlordFundsModal
      :show="isLandlordModalOpen"
      :landlord-money="currentLandlordMoney"
      @close="isLandlordModalOpen = false"
      @spend="handleSpendLandlordMoney"
      @earn="handleEarnLandlordMoney"
    />
  </div>
</template>

<style scoped>
.tally-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  font-family: inherit;
  color: #29241e;
  overflow: hidden;
  box-sizing: border-box;
}

.tally-body {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  padding: 12px;
  gap: 12px;
  overflow-y: auto;
  box-sizing: border-box;
}

.tally-body > * {
  flex-shrink: 0;
}

.tally-footer-card {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  padding: 10px 12px 12px 12px;
  border-top: 2px dashed #ded4c3;
  background-color: #faf6ee;
  box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.03);
  z-index: 10;
  box-sizing: border-box;
}

.metrics-section {
  display: flex;
  align-items: stretch;
  gap: 6px;
  flex-wrap: wrap;
}

.metric-box {
  flex: 1 1 0;
  min-width: 58px;
}

.metric-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px 6px;
  width: 100%;
  box-sizing: border-box;
}

.metric-label {
  font-size: 8.5px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #78716c;
  font-weight: 700;
  line-height: 1.1;
  text-align: center;
  white-space: nowrap;
}

.metric-value-row {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 2px;
  flex-wrap: wrap;
}

.metric-percent {
  font-size: 10.5px;
  font-weight: 700;
  line-height: 1.2;
  opacity: 0.85;
}
.metric-value {
  font-size: 15px;
  font-weight: 800;
  color: #292524;
  line-height: 1.2;
}

.metric-pill.highlight .metric-value {
  color: #92400e;
}

.metric-pill.union .metric-value,
.metric-pill.union .metric-percent {
  color: #15803d;
}

.metric-pill.evict .metric-value {
  color: #dc2626;
}

.metric-pill.coalition .metric-value,
.metric-pill.coalition .metric-percent {
  color: #6d28d9;
}

.tally-table-wrapper {
  overflow-x: auto;
  border: 1.5px solid #d9cebc;
  border-radius: 8px;
  background-color: #fffdf9;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.tally-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
  text-align: left;
}

.tally-table thead {
  background-color: #ede4d5;
  border-bottom: 2px solid #cbbeaa;
}

.tally-table th {
  padding: 6px 8px;
  font-weight: 800;
  font-size: 0.8rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #43392c;
  vertical-align: middle;
  text-align: center;
  border-right: 1px solid #dfd4c1;
}
.tally-table th:last-child {
  border-right: none;
}

.col-round {
  width: 58px;
}

.col-organized {
  min-width: 68px;
}

.col-evictions {
  min-width: 78px;
}
.tally-table td {
  padding: 5px 8px;
  border-bottom: 1px solid #ede3d3;
  border-right: 1px solid #ede3d3;
  vertical-align: middle;
  text-align: center;
}

.tally-table td:last-child {
  border-right: none;
}

.tally-row:hover {
  background-color: #f7f2e7;
}
.tally-row.is-current-round {
  background-color: #fef3c7;
  font-weight: 700;
}

.tally-row.is-current-round td {
  background-color: #fef3c7;
  border-top: 1.5px solid #f59e0b;
  border-bottom: 1.5px solid #f59e0b;
}

.tally-row.is-current-round td:first-child {
  border-left: 3.5px solid #d97706;
}

.tally-row.is-current-round td:last-child {
  border-right: 1.5px solid #f59e0b;
}

.tally-row.is-current-round:hover td {
  background-color: #fde68a;
}

.tally-row.is-current-round .round-name {
  color: #92400e;
  font-weight: 800;
}

.round-name {
  font-weight: 700;
  color: #29241e;
  font-size: 0.92rem;
  line-height: 1.2;
}

.val-display {
  display: inline-block;
  font-size: 0.98rem;
  font-weight: 800;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.val-union {
  color: #15803d;
}

.val-evictions {
  color: #dc2626;
}
.val-union.is-negative {
  color: #dc2626;
}

.val-display.is-zero {
  color: #78716c;
  font-weight: 600;
}

.col-landlord {
  min-width: 82px;
}

.cell-landlord {
  font-variant-numeric: tabular-nums;
}

.landlord-display-wrap {
  display: inline-flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
}

.val-landlord {
  color: #78350f;
  font-weight: 800;
}

.spent-tag {
  font-size: 0.72rem;
  color: #b45309;
  font-weight: 600;
  opacity: 0.9;
}

/* Events Card (Space above the table) */
.events-card {
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border: 1.5px solid #ded4c3;
  border-radius: 8px;
  padding: 8px 10px;
  gap: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.events-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.events-title-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.events-title {
  font-size: 0.76rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #78716c;
}

.events-count {
  font-size: 0.68rem;
  font-weight: 800;
  background-color: #e2e8f0;
  color: #334155;
  padding: 1px 6px;
  border-radius: 10px;
  line-height: 1.2;
}

/* Landlord Action Buttons Row */
.landlord-actions-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.landlord-action-btn {
  width: 100%;
}

.landlord-action-btn :deep(.rough-btn-label) {
  padding: 6px 8px;
  width: 100%;
  justify-content: center;
}

.landlord-btn-content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-weight: 700;
  font-size: 0.76rem;
  line-height: 1.25;
  text-align: center;
}

.landlord-btn-icon {
  font-size: 0.88rem;
  line-height: 1;
  flex-shrink: 0;
}

.landlord-btn-text {
  font-weight: 700;
}

/* Event bullet list items: general events are grey/blue, spending money is red */
.events-list {
  list-style-type: disc;
  margin: 0;
  padding-left: 18px;
  color: #475569;
  max-height: 150px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.event-bullet-item {
  color: #475569;
  font-size: 0.88rem;
  font-weight: 600;
  line-height: 1.35;
  word-break: break-word;
}

.event-bullet-item::marker {
  color: #64748b;
  font-size: 1.05em;
}

.event-bullet-item .event-text {
  color: #475569;
}
.event-building-name {
  font-weight: 700;
}

/* Spending money events are styled in red */
.event-bullet-item.is-spend {
  color: #dc2626;
  font-weight: 700;
}

.event-bullet-item.is-spend::marker {
  color: #dc2626;
  font-size: 1.05em;
}

.event-bullet-item.is-spend .event-text {
  color: #dc2626;
}

/* Earning money events are styled in green */
.event-bullet-item.is-earn {
  color: #15803d;
  font-weight: 700;
}

.event-bullet-item.is-earn::marker {
  color: #15803d;
  font-size: 1.05em;
}

.event-bullet-item.is-earn .event-text {
  color: #15803d;
}
.event-remove-btn {
  background: none;
  border: none;
  color: #a8a29e;
  font-size: 0.95rem;
  line-height: 1;
  padding: 0 4px;
  margin-left: 6px;
  cursor: pointer;
  border-radius: 3px;
  opacity: 0.6;
  transition:
    opacity 0.15s,
    color 0.15s,
    background-color 0.15s;
  vertical-align: middle;
}

.event-remove-btn:hover {
  opacity: 1;
  color: #dc2626;
  background-color: #fee2e2;
}

.events-empty-hint {
  font-size: 0.76rem;
  color: #a8a29e;
  font-style: italic;
  margin: 2px 0;
  padding-left: 2px;
}

/* Event input form */
.event-input-form {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}

.event-input {
  flex: 1;
  font-size: 0.8rem;
  padding: 5px 8px;
  border: 1px solid #d1c7b7;
  border-radius: 6px;
  background-color: #faf7f2;
  color: #292524;
  outline: none;
  transition:
    border-color 0.15s,
    background-color 0.15s;
}

.event-input:focus {
  border-color: #b45309;
  background-color: #ffffff;
}

.event-input::placeholder {
  color: #a8a29e;
  font-style: italic;
}

.event-add-btn {
  font-size: 0.78rem;
  font-weight: 700;
  padding: 5px 10px;
  background-color: #292524;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition:
    background-color 0.15s,
    opacity 0.15s;
}

.event-add-btn:hover:not(:disabled) {
  background-color: #44403c;
}

.event-add-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
