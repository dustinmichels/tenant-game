<script setup lang="ts">
import { computed } from "vue";
import type { Building, RoundTally, CoalitionGroup } from "../types/game";
import { getBuildingUnionCount } from "../types/game";
import RoughBox from "./RoughBox.vue";
import RoughButton from "./RoughButton.vue";
import CoalitionTracker from "./CoalitionTracker.vue";
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
    canUndoSpend?: boolean;
    coalitionCount?: number;
    coalitions?: CoalitionGroup[];
    buildingColorMap?: Record<string, string>;
  }>(),
  {
    landlordMoney: undefined,
    landlordStartingMoney: undefined,
    canUndoSpend: false,
    coalitionCount: 0,
    coalitions: () => [],
    buildingColorMap: () => ({}),
  },
);

const emit = defineEmits<{
  (e: "spend-landlord-money", amount?: number): void;
  (e: "undo-landlord-spend", amount?: number): void;
}>();

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

const unionTenantsCount = computed(() =>
  props.buildings.reduce((sum, b) => sum + getBuildingUnionCount(b), 0),
);

const totalEvictionsCount = computed(() =>
  props.buildings.reduce((sum, b) => sum + b.tenants.filter((t) => t.isEvicted).length, 0),
);
</script>

<template>
  <div class="tally-container">
    <div class="tally-header-card">
      <!-- Summary Metrics -->
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
          <div class="metric-pill">
            <span class="metric-label">Bldgs</span>
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
          <div class="metric-pill highlight">
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
          <div class="metric-pill union">
            <span class="metric-label">In Union</span>
            <span class="metric-value">{{ unionTenantsCount }}</span>
          </div>
        </RoughBox>

        <RoughBox
          v-if="totalEvictionsCount && totalEvictionsCount > 0"
          :stroke="'#dc2626'"
          :fill="'#fee2e2'"
          fill-style="solid"
          :roughness="0.9"
          :stroke-width="1.1"
          :seed="906"
          class="metric-box"
        >
          <div class="metric-pill evict">
            <span class="metric-label">Evicted</span>
            <span class="metric-value">{{ totalEvictionsCount }}</span>
          </div>
        </RoughBox>

        <RoughBox
          v-if="coalitionCount && coalitionCount > 0"
          :stroke="'#7c3aed'"
          :fill="'#f5f3ff'"
          fill-style="solid"
          :roughness="0.9"
          :stroke-width="1.1"
          :seed="908"
          class="metric-box"
        >
          <div class="metric-pill coalition">
            <span class="metric-label">Coalitions</span>
            <span class="metric-value">{{ coalitionCount }}</span>
          </div>
        </RoughBox>

        <RoughBox
          :stroke="'#78350f'"
          :fill="'#fef3c7'"
          fill-style="solid"
          :roughness="0.9"
          :stroke-width="1.2"
          :seed="905"
          class="metric-box metric-landlord-funds"
        >
          <div
            class="metric-pill landlord-funds"
            :title="`Remaining landlord funds: ${formatCurrency(currentLandlordMoney)}`"
          >
            <span class="metric-label">Landlord $</span>
            <span class="metric-value money-highlight">{{
              formatCompactCurrency(currentLandlordMoney)
            }}</span>
          </div>
        </RoughBox>
      </div>
    </div>

    <!-- Landlord Spending Action Card -->
    <div class="landlord-action-card">
      <RoughBox
        :stroke="'#b45309'"
        :fill="'#fffbeb'"
        fill-style="solid"
        :roughness="0.8"
        :stroke-width="1.2"
        :seed="918"
        class="action-rough-box"
      >
        <div class="landlord-action-inner">
          <div class="landlord-balance-row">
            <span class="landlord-label">Landlord Funds:</span>
            <span
              class="landlord-balance"
              :title="`Remaining funds: ${formatCurrency(currentLandlordMoney)}`"
            >
              {{ formatCurrency(currentLandlordMoney) }}
            </span>
          </div>
          <div class="landlord-buttons-row">
            <RoughButton
              variant="warning"
              :disabled="currentLandlordMoney <= 0"
              :seed="925"
              title="Landlord spends $50,000"
              @click="emit('spend-landlord-money', 50000)"
            >
              <span class="spend-action-content">
                <span class="spend-action-icon" aria-hidden="true">💸</span>
                <span class="spend-action-text">Landlord spends 50k</span>
              </span>
            </RoughButton>

            <RoughButton
              v-if="canUndoSpend"
              variant="secondary"
              :seed="926"
              title="Undo spend (+ $50,000)"
              @click="emit('undo-landlord-spend', 50000)"
            >
              <span class="undo-action-text">↺ +50k</span>
            </RoughButton>
          </div>
        </div>
      </RoughBox>
    </div>

    <!-- Tally Table (Read Only) -->
    <div class="tally-table-wrapper">
      <table class="tally-table">
        <thead>
          <tr>
            <th class="col-round" title="Game Round">Round</th>
            <th class="col-landlord" title="Remaining landlord funds (reduced sum)">Landlord $</th>
            <th class="col-organized" title="Total residents in union">In Union</th>
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

            <!-- Total in Union (Read Only) -->
            <td class="cell-number cell-union">
              <span class="val-display val-union" title="Residents in tenant union">
                {{ getTallyForRound(r).totalOrganized }}
              </span>
            </td>

            <!-- Evictions that Round (Read Only) -->
            <td class="cell-number cell-evictions">
              <div class="eviction-display-wrap">
                <span
                  class="val-display val-evictions"
                  :title="`${getTallyForRound(r).evictions} eviction(s) this round${
                    getTallyForRound(r).totalEvictions !== undefined
                      ? ` (${getTallyForRound(r).totalEvictions} cumulative total)`
                      : ''
                  }`"
                >
                  {{ getTallyForRound(r).evictions }}
                </span>
                <span
                  v-if="
                    getTallyForRound(r).totalEvictions !== undefined &&
                    getTallyForRound(r).totalEvictions !== getTallyForRound(r).evictions
                  "
                  class="cumul-tag"
                  :title="`Cumulative evictions through Round ${r}: ${getTallyForRound(r).totalEvictions}`"
                >
                  (tot: {{ getTallyForRound(r).totalEvictions }})
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Coalitions & Buildings Tracker (Bottom of left pane) -->
    <CoalitionTracker
      :buildings="buildings"
      :coalitions="coalitions"
      :building-color-map="buildingColorMap"
    />
  </div>
</template>

<style scoped>
.tally-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px;
  gap: 12px;
  font-family: inherit;
  color: #29241e;
  overflow-y: auto;
  box-sizing: border-box;
}

.tally-header-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 10px;
  border-bottom: 2px dashed #ded4c3;
}

.metrics-section {
  display: flex;
  align-items: stretch;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
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
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #78716c;
  font-weight: 700;
  line-height: 1.1;
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

.metric-pill.union .metric-value {
  color: #15803d;
}

.metric-pill.evict .metric-value {
  color: #dc2626;
}

.metric-pill.coalition .metric-value {
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

.eviction-display-wrap {
  display: inline-flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
}
.cumul-tag {
  font-size: 0.72rem;
  color: #991b1b;
  font-weight: 600;
  opacity: 0.88;
}

.metric-pill.landlord-funds .money-highlight {
  color: #78350f;
}

.landlord-action-card {
  margin-top: 4px;
}

.action-rough-box {
  width: 100%;
}

.landlord-action-inner {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.landlord-balance-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.landlord-label {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #78350f;
}

.landlord-balance {
  font-size: 1.15rem;
  font-weight: 800;
  color: #78350f;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
}

.landlord-buttons-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.spend-action-content {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  font-size: 0.84rem;
}

.spend-action-icon {
  font-size: 0.95rem;
  line-height: 1;
}

.undo-action-text {
  font-weight: 700;
  font-size: 0.8rem;
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
</style>
