<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted, shallowRef } from "vue";
import RoughBox from "./RoughBox.vue";
import RoughButton from "./RoughButton.vue";
import RoughSlider from "./RoughSlider.vue";
import {
  formatCurrency,
  DEFAULT_LANDLORD_MONEY_PER_PLAYER,
  calculateDefaultLandlordMoney,
} from "../utils/currency";

const props = withDefaults(
  defineProps<{
    initialBuildings?: number;
    initialPeople?: number;
    initialLandlordMoney?: number;
    isCancelable?: boolean;
  }>(),
  {
    initialBuildings: 4,
    initialPeople: 8,
    initialLandlordMoney: undefined,
    isCancelable: false,
  },
);

const emit = defineEmits<{
  (
    e: "submit",
    payload: {
      buildingCount: number;
      peoplePerBuilding: number;
      landlordStartingMoney: number;
    },
  ): void;
  (e: "cancel"): void;
}>();

const buildingCount = shallowRef<number | null>(props.initialBuildings ?? 4);
const peoplePerBuilding = shallowRef<number | null>(props.initialPeople ?? 8);

const totalPlayers = computed(() => {
  const b = Number(buildingCount.value);
  const p = Number(peoplePerBuilding.value);
  return !isNaN(b) && b > 0 && !isNaN(p) && p > 0 ? Math.floor(b) * Math.floor(p) : 0;
});

const defaultMoneyForProps = calculateDefaultLandlordMoney(
  props.initialBuildings ?? 4,
  props.initialPeople ?? 8,
);
const oldFormulaForProps = (props.initialBuildings ?? 4) * 50_000;
const isOldFormula =
  props.initialLandlordMoney !== undefined &&
  props.initialLandlordMoney !== null &&
  props.initialLandlordMoney === oldFormulaForProps &&
  oldFormulaForProps !== defaultMoneyForProps;

const isMoneyManuallyEdited = shallowRef(
  props.initialLandlordMoney !== undefined &&
    props.initialLandlordMoney !== null &&
    !isOldFormula &&
    props.initialLandlordMoney !== defaultMoneyForProps,
);

const landlordStartingMoney = shallowRef<number | null>(
  props.initialLandlordMoney !== undefined && props.initialLandlordMoney !== null && !isOldFormula
    ? props.initialLandlordMoney
    : calculateDefaultLandlordMoney(buildingCount.value, peoplePerBuilding.value),
);

watch([buildingCount, peoplePerBuilding], ([newB, newP]) => {
  if (!isMoneyManuallyEdited.value) {
    landlordStartingMoney.value = calculateDefaultLandlordMoney(newB, newP);
  }
});

function handleMoneyInput() {
  isMoneyManuallyEdited.value = true;
}

function resetMoneyToDefault() {
  isMoneyManuallyEdited.value = false;
  landlordStartingMoney.value = calculateDefaultLandlordMoney(
    buildingCount.value,
    peoplePerBuilding.value,
  );
}

const isBuildingAboveMax = computed(() => {
  const num = Number(buildingCount.value);
  return !isNaN(num) && num > 8;
});

const isPeopleAboveMax = computed(() => {
  const num = Number(peoplePerBuilding.value);
  return !isNaN(num) && num > 8;
});

const errorMessage = shallowRef("");

function handleSubmit() {
  const b = Number(buildingCount.value);
  const p = Number(peoplePerBuilding.value);
  const m = Number(landlordStartingMoney.value);

  if (!b || b < 1) {
    errorMessage.value = "Please enter at least 1 building.";
    return;
  }
  if (!p || p < 1) {
    errorMessage.value = "Please enter at least 1 person per building.";
    return;
  }
  if (isNaN(m) || m < 0) {
    errorMessage.value = "Please enter a valid starting money amount (at least $0).";
    return;
  }

  errorMessage.value = "";
  emit("submit", {
    buildingCount: Math.floor(b),
    peoplePerBuilding: Math.floor(p),
    landlordStartingMoney: Math.floor(m),
  });
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.repeat && !e.isComposing) {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.closest(".btn-cancel") ||
        target.closest(".btn-reset-default") ||
        (target.tagName === "BUTTON" &&
          (target as HTMLButtonElement).type === "button" &&
          !target.closest(".rough-slider-component")))
    ) {
      return;
    }

    e.preventDefault();
    handleSubmit();
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <div class="setup-container">
    <RoughBox
      :stroke="'#27272a'"
      :fill="'#fcfaf6'"
      fill-style="solid"
      :roughness="1.3"
      :bowing="1.1"
      :stroke-width="1.8"
      :seed="888"
      class="setup-card-rough"
    >
      <div class="setup-card">
        <header class="setup-header">
          <div class="union-badge">
            <svg
              class="badge-logo"
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M17,11V3H7v4H3v14h8v-4h2v4h8V11H17z M7,19H5v-2h2V19z M7,15H5v-2h2V15z M7,11H5V9h2V11z M11,15H9v-2h2V15z M11,11H9V9h2 V11z M11,7H9V5h2V7z M15,15h-2v-2h2V15z M15,11h-2V9h2V11z M15,7h-2V5h2V7z M19,19h-2v-2h2V19z M19,15h-2v-2h2V15z"
              />
            </svg>
            <span>Tenant Union Game</span>
          </div>
          <h1 class="setup-title">New Game</h1>
          <p class="setup-subtitle">Configure your neighborhood.</p>
        </header>

        <form class="setup-form" @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="building-count-input" class="form-label">
              <span class="label-step">1</span>
              Number of buildings
            </label>
            <RoughBox
              :stroke="'#52525b'"
              :fill="'#ffffff'"
              fill-style="solid"
              :roughness="1.0"
              :stroke-width="1.4"
              :seed="801"
              class="input-rough-box"
            >
              <div class="control-container">
                <div class="control-row">
                  <div class="slider-col">
                    <RoughSlider
                      id="building-count-slider"
                      v-model="buildingCount"
                      :min="1"
                      :max="8"
                      :is-above-max="isBuildingAboveMax"
                      :seed="810"
                      aria-label="Number of buildings slider"
                    />
                  </div>

                  <div class="textbox-col">
                    <RoughBox
                      :stroke="isBuildingAboveMax ? '#b45309' : '#786957'"
                      :fill="isBuildingAboveMax ? '#fffbeb' : '#faf7f2'"
                      fill-style="solid"
                      :roughness="1.0"
                      :stroke-width="isBuildingAboveMax ? 1.6 : 1.3"
                      :seed="831"
                      class="number-rough-box"
                    >
                      <div class="number-box-inner">
                        <input
                          id="building-count-input"
                          v-model.number="buildingCount"
                          type="number"
                          min="1"
                          max="100"
                          class="stepper-number-input"
                          placeholder="4"
                          required
                          aria-label="Number of buildings text input"
                        />
                        <span class="stepper-unit-label">
                          {{ buildingCount === 1 ? "bldg" : "bldgs" }}
                        </span>
                      </div>
                    </RoughBox>
                  </div>
                </div>
              </div>
            </RoughBox>
          </div>

          <div class="form-group">
            <label for="people-count-input" class="form-label">
              <span class="label-step">2</span>
              People per building
            </label>
            <RoughBox
              :stroke="'#52525b'"
              :fill="'#ffffff'"
              fill-style="solid"
              :roughness="1.0"
              :stroke-width="1.4"
              :seed="802"
              class="input-rough-box"
            >
              <div class="control-container">
                <div class="control-row">
                  <div class="slider-col">
                    <RoughSlider
                      id="people-count-slider"
                      v-model="peoplePerBuilding"
                      :min="1"
                      :max="8"
                      :is-above-max="isPeopleAboveMax"
                      :seed="820"
                      aria-label="Typical number of people per building slider"
                    />
                  </div>

                  <div class="textbox-col">
                    <RoughBox
                      :stroke="isPeopleAboveMax ? '#b45309' : '#786957'"
                      :fill="isPeopleAboveMax ? '#fffbeb' : '#faf7f2'"
                      fill-style="solid"
                      :roughness="1.0"
                      :stroke-width="isPeopleAboveMax ? 1.6 : 1.3"
                      :seed="832"
                      class="number-rough-box"
                    >
                      <div class="number-box-inner">
                        <input
                          id="people-count-input"
                          v-model.number="peoplePerBuilding"
                          type="number"
                          min="1"
                          max="100"
                          class="stepper-number-input"
                          placeholder="8"
                          required
                          aria-label="Typical number of people per building text input"
                        />
                        <span class="stepper-unit-label">
                          {{ peoplePerBuilding === 1 ? "person" : "people" }}
                        </span>
                      </div>
                    </RoughBox>
                  </div>
                </div>
              </div>
            </RoughBox>
          </div>
          <!-- Step 3: Landlord Starting Money -->
          <div class="form-group">
            <div class="label-with-action">
              <label for="landlord-money-input" class="form-label">
                <span class="label-step">3</span>
                Landlord starting money
              </label>
              <button
                v-if="isMoneyManuallyEdited"
                type="button"
                class="btn-reset-default"
                title="Reset back to $50k * number of players"
                @click="resetMoneyToDefault"
              >
                ↺ Reset to default ($50k/player)
              </button>
            </div>
            <RoughBox
              :stroke="'#52525b'"
              :fill="'#ffffff'"
              fill-style="solid"
              :roughness="1.0"
              :stroke-width="1.4"
              :seed="803"
              class="input-rough-box"
            >
              <div class="control-container">
                <div class="control-row money-control-row">
                  <div class="textbox-col money-input-col">
                    <RoughBox
                      :stroke="isMoneyManuallyEdited ? '#b45309' : '#786957'"
                      :fill="isMoneyManuallyEdited ? '#fffbeb' : '#faf7f2'"
                      fill-style="solid"
                      :roughness="1.0"
                      :stroke-width="isMoneyManuallyEdited ? 1.6 : 1.3"
                      :seed="833"
                      class="number-rough-box money-rough-box"
                    >
                      <div class="number-box-inner money-box-inner">
                        <span class="currency-symbol" aria-hidden="true">$</span>
                        <input
                          id="landlord-money-input"
                          v-model.number="landlordStartingMoney"
                          type="number"
                          min="0"
                          step="10000"
                          class="stepper-number-input money-number-input"
                          placeholder="1600000"
                          required
                          aria-label="Landlord starting money text input"
                          @input="handleMoneyInput"
                        />
                      </div>
                    </RoughBox>
                  </div>

                  <div class="money-info-col">
                    <div class="money-summary-wrap">
                      <span class="money-formatted-val">
                        {{ formatCurrency(landlordStartingMoney ?? 0) }}
                      </span>
                      <span class="money-calc-note">
                        {{
                          isMoneyManuallyEdited
                            ? "(custom amount)"
                            : `($50k × ${totalPlayers} ${
                                totalPlayers === 1 ? "player" : "players"
                              })`
                        }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </RoughBox>
          </div>
          <div v-if="errorMessage" class="error-notice">
            {{ errorMessage }}
          </div>

          <div class="form-actions">
            <RoughButton
              v-if="isCancelable"
              type="button"
              variant="secondary"
              :seed="804"
              class="btn-cancel"
              @click="emit('cancel')"
            >
              <span>Back to Game</span>
            </RoughButton>

            <RoughButton
              type="submit"
              variant="primary"
              :seed="805"
              class="btn-start"
              title="Start game (Enter)"
              aria-label="Start game (Press Enter)"
            >
              <span class="btn-text">Start</span>
              <kbd class="btn-kbd">
                <span class="kbd-symbol" aria-hidden="true">↵</span>
                <span class="kbd-text">Enter</span>
              </kbd>
              <span class="btn-arrow" aria-hidden="true">→</span>
            </RoughButton>
          </div>
        </form>
      </div>
    </RoughBox>
  </div>
</template>

<style scoped>
.setup-container {
  min-height: calc(100vh - 60px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.setup-card-rough {
  width: 100%;
  max-width: 520px;
}

.setup-card {
  padding: 32px 36px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.setup-header {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.union-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #78350f;
  background-color: #fef3c7;
  padding: 4px 12px;
  border-radius: 9999px;
  border: 1px solid #fde68a;
}

.setup-title {
  font-size: 1.8rem;
  font-weight: 800;
  color: #18181b;
  margin: 0;
  letter-spacing: -0.02em;
}

.setup-subtitle {
  font-size: 0.95rem;
  color: #71717a;
  margin: 0;
  max-width: 380px;
  line-height: 1.4;
}

.setup-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.control-container {
  padding: 10px 14px 12px;
  background: transparent;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
}

.slider-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.textbox-col {
  flex-shrink: 0;
}

.number-rough-box {
  min-width: 108px;
}

.number-box-inner {
  display: flex;
  align-items: center;
  padding: 5px 10px;
  gap: 6px;
}

.stepper-number-input {
  width: 44px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 1.25rem;
  font-weight: 800;
  color: #18181b;
  text-align: center;
  padding: 0;
  -moz-appearance: textfield;
}

.stepper-number-input::-webkit-outer-spin-button,
.stepper-number-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.stepper-unit-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #71717a;
  white-space: nowrap;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.92rem;
  font-weight: 600;
  color: #27272a;
}

.label-step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #e4d5bc;
  color: #443422;
  font-size: 0.75rem;
  font-weight: 800;
}

.input-rough-box {
  width: 100%;
}

.input-inner {
  display: flex;
  align-items: center;
  padding: 4px 14px;
  background-color: #ffffff;
  border-radius: 4px;
}

.number-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 1.15rem;
  font-weight: 600;
  color: #18181b;
  background: transparent;
  padding: 8px 0;
  width: 100%;
}

.number-input::placeholder {
  color: #a1a1aa;
  font-weight: normal;
}

.input-unit {
  font-size: 0.85rem;
  font-weight: 500;
  color: #71717a;
  white-space: nowrap;
  padding-left: 8px;
}

.error-notice {
  font-size: 0.85rem;
  color: #b91c1c;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  padding: 8px 12px;
  border-radius: 6px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 6px;
}

.btn-text {
  font-weight: 700;
  font-size: 1.05rem;
}

.btn-arrow {
  margin-left: 6px;
  font-size: 1.15rem;
  transition: transform 0.15s ease;
}

.form-actions button:hover .btn-arrow {
  transform: translateX(3px);
}

.btn-kbd {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  font-family: inherit;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: #523e2b;
  background-color: #fbf7ef;
  border: 1.5px solid #a89a86;
  border-radius: 5px;
  box-shadow: 0 1.5px 0 #8c7e6c;
  line-height: 1.2;
  user-select: none;
  vertical-align: middle;
}

.kbd-symbol {
  font-size: 0.85rem;
  line-height: 1;
}

.kbd-text {
  font-size: 0.72rem;
  text-transform: uppercase;
  font-weight: 800;
  letter-spacing: 0.05em;
}

.form-actions button:active .btn-kbd {
  box-shadow: none;
  transform: translateY(1px);
}

.label-with-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.btn-reset-default {
  background: none;
  border: none;
  font-size: 0.78rem;
  font-weight: 600;
  color: #b45309;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: color 0.15s ease;
}

.btn-reset-default:hover {
  color: #78350f;
  background-color: #fef3c7;
}

.money-control-row {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.money-input-col {
  flex: 0 0 auto;
}

.money-rough-box {
  min-width: 140px;
}

.money-box-inner {
  display: flex;
  align-items: center;
  padding: 5px 12px;
  gap: 4px;
}

.currency-symbol {
  font-size: 1.15rem;
  font-weight: 800;
  color: #78350f;
}

.money-number-input {
  width: 100px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 1.25rem;
  font-weight: 800;
  color: #18181b;
  text-align: left;
  padding: 0;
  -moz-appearance: textfield;
}

.money-number-input::-webkit-outer-spin-button,
.money-number-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.money-info-col {
  flex: 1;
  min-width: 0;
}

.money-summary-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.money-formatted-val {
  font-size: 1.15rem;
  font-weight: 800;
  color: #78350f;
  letter-spacing: -0.01em;
}

.money-calc-note {
  font-size: 0.8rem;
  font-weight: 600;
  color: #71717a;
}
</style>
