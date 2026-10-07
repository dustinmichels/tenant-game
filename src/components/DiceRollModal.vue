<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted, onBeforeUpdate } from "vue";
import RoughBox from "./RoughBox.vue";
import RoughButton from "./RoughButton.vue";

interface RollItem {
  id: string;
  value: number | null;
}

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "done", total: number): void;
}>();

let nextRollId = 1;

function createEmptyRoll(): RollItem {
  return {
    id: `roll-${++nextRollId}`,
    value: null,
  };
}

const rolls = ref<RollItem[]>([{ id: `roll-1`, value: null }]);

const inputRefs = ref<HTMLInputElement[]>([]);

function setInputRef(el: HTMLInputElement | null, index: number) {
  if (el) {
    inputRefs.value[index] = el;
  }
}

onBeforeUpdate(() => {
  inputRefs.value = [];
});

function focusInput(index: number) {
  const el = inputRefs.value[index];
  if (el) {
    el.focus();
    el.select?.();
  }
}

function isRollEmpty(item: RollItem | undefined): boolean {
  if (!item) return true;
  return item.value === null || (item.value as unknown) === "" || isNaN(Number(item.value));
}

function isRollValidNumber(item: RollItem | undefined): boolean {
  if (!item) return false;
  if (item.value === null || (item.value as unknown) === "") return false;
  const num = Number(item.value);
  return !isNaN(num) && num >= 0;
}

const total = computed(() => {
  return rolls.value.reduce((sum, item) => {
    if (isRollValidNumber(item)) {
      return sum + Math.round(Number(item.value));
    }
    return sum;
  }, 0);
});

const validRollsCount = computed(() => {
  return rolls.value.filter((item) => isRollValidNumber(item)).length;
});

function ensureTrailingEmptyBox() {
  const last = rolls.value[rolls.value.length - 1];
  if (last && isRollValidNumber(last)) {
    rolls.value.push(createEmptyRoll());
  }
}

function pruneTrailingBoxes() {
  while (
    rolls.value.length > 1 &&
    isRollEmpty(rolls.value[rolls.value.length - 1]) &&
    isRollEmpty(rolls.value[rolls.value.length - 2])
  ) {
    rolls.value.pop();
  }
}

function onRollInput(index: number) {
  const item = rolls.value[index];
  if (!item) return;

  const isLast = index === rolls.value.length - 1;
  if (isLast && isRollValidNumber(item)) {
    rolls.value.push(createEmptyRoll());
  } else if (isRollEmpty(item)) {
    pruneTrailingBoxes();
  }
}

function onEnter(index: number) {
  const current = rolls.value[index];
  if (index < rolls.value.length - 1) {
    focusInput(index + 1);
  } else if (current && isRollValidNumber(current)) {
    // Current is last and has value; next empty box will be focused
    nextTick(() => {
      focusInput(rolls.value.length - 1);
    });
  } else if (validRollsCount.value > 0) {
    handleDone();
  }
}

function addBox() {
  const last = rolls.value[rolls.value.length - 1];
  if (last && isRollEmpty(last)) {
    focusInput(rolls.value.length - 1);
  } else {
    rolls.value.push(createEmptyRoll());
    nextTick(() => {
      focusInput(rolls.value.length - 1);
    });
  }
}

function addQuickRoll(val: number) {
  const emptyIndex = rolls.value.findIndex((r) => isRollEmpty(r));
  if (emptyIndex !== -1) {
    rolls.value[emptyIndex]!.value = val;
  } else {
    rolls.value.push({ id: `roll-${++nextRollId}`, value: val });
  }
  ensureTrailingEmptyBox();
  nextTick(() => {
    focusInput(rolls.value.length - 1);
  });
}

function removeRoll(index: number) {
  if (rolls.value.length > 1) {
    rolls.value.splice(index, 1);
    ensureTrailingEmptyBox();
  } else {
    rolls.value[0]!.value = null;
  }
  nextTick(() => {
    const targetIdx = Math.min(index, rolls.value.length - 1);
    focusInput(targetIdx);
  });
}

function reset() {
  nextRollId = 1;
  rolls.value = [{ id: "roll-1", value: null }];
  nextTick(() => {
    focusInput(0);
  });
}

function handleDone() {
  if (validRollsCount.value === 0) return;
  emit("done", total.value);
}

function handleKeydown(e: KeyboardEvent) {
  if (!props.show) return;
  if (e.key === "Escape") {
    emit("close");
  } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    if (validRollsCount.value > 0) {
      handleDone();
    }
  }
}

watch(
  () => props.show,
  (isOpen) => {
    if (isOpen) {
      reset();
    }
  },
  { immediate: true },
);

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-backdrop" role="presentation" @click="emit('close')">
      <div
        class="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dice-modal-title"
        @click.stop
      >
        <RoughBox
          :stroke="'#44403c'"
          :fill="'#fefdfb'"
          fill-style="solid"
          :roughness="0.8"
          :stroke-width="1.6"
          :seed="950"
          class="modal-rough-box"
        >
          <div class="modal-content">
            <!-- Modal Header -->
            <div class="modal-header">
              <div class="title-with-icon">
                <span class="header-icon" aria-hidden="true">🎲</span>
                <div>
                  <h3 id="dice-modal-title" class="modal-title">Dice Roll</h3>
                  <span class="modal-subtitle">Enter dice rolls to calculate group total</span>
                </div>
              </div>
              <button
                type="button"
                class="modal-close-btn"
                aria-label="Close modal"
                @click="emit('close')"
              >
                ✕
              </button>
            </div>

            <!-- Total Display Card -->
            <div class="total-card">
              <div class="total-info">
                <span class="total-label">Group Total</span>
                <span class="total-count-badge">
                  {{ validRollsCount }} {{ validRollsCount === 1 ? "roll" : "rolls" }}
                </span>
              </div>
              <div class="total-value-row">
                <span class="total-value">{{ total }}</span>
                <button
                  v-if="validRollsCount > 0"
                  type="button"
                  class="reset-rolls-btn"
                  title="Clear all entered rolls"
                  @click="reset"
                >
                  Clear
                </button>
              </div>
            </div>

            <!-- Rolls Input List -->
            <div class="rolls-section">
              <div class="rolls-section-header">
                <span class="rolls-section-title">Individual Rolls</span>
                <span class="rolls-hint">Boxes appear automatically as you enter rolls</span>
              </div>

              <div class="rolls-list" role="list">
                <div v-for="(roll, index) in rolls" :key="roll.id" class="roll-row" role="listitem">
                  <label :for="`roll-input-${roll.id}`" class="roll-badge">
                    Roll {{ index + 1 }}
                  </label>
                  <input
                    :id="`roll-input-${roll.id}`"
                    :ref="(el) => setInputRef(el as HTMLInputElement | null, index)"
                    v-model.number="roll.value"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Enter roll..."
                    class="roll-input"
                    :aria-label="`Dice roll ${index + 1}`"
                    @input="onRollInput(index)"
                    @keydown.enter.prevent="onEnter(index)"
                  />
                  <button
                    type="button"
                    class="roll-remove-btn"
                    :title="`Remove roll ${index + 1}`"
                    :aria-label="`Remove roll ${index + 1}`"
                    :disabled="rolls.length === 1 && isRollEmpty(roll)"
                    @click="removeRoll(index)"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <!-- Quick Dice Row & Add Roll Button -->
              <div class="rolls-actions-bar">
                <div class="quick-dice-group">
                  <span class="quick-dice-label">Quick add:</span>
                  <div class="quick-dice-buttons">
                    <button
                      v-for="val in [1, 2, 3, 4, 5, 6]"
                      :key="val"
                      type="button"
                      class="quick-die-btn"
                      :title="`Add roll of ${val}`"
                      @click="addQuickRoll(val)"
                    >
                      {{ val }}
                    </button>
                  </div>
                </div>

                <button type="button" class="add-box-btn" @click="addBox">+ Add another box</button>
              </div>
            </div>

            <!-- Footer Buttons -->
            <div class="modal-footer">
              <RoughButton
                variant="secondary"
                :seed="951"
                title="Cancel and close"
                @click="emit('close')"
              >
                <span class="btn-inner">Cancel</span>
              </RoughButton>

              <RoughButton
                variant="primary"
                :seed="952"
                :disabled="validRollsCount === 0"
                title="Record dice roll and add event to history"
                @click="handleDone"
              >
                <span class="btn-inner">
                  <span>Done</span>
                  <span v-if="validRollsCount > 0" class="done-badge">({{ total }})</span>
                </span>
              </RoughButton>
            </div>
          </div>
        </RoughBox>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9998;
  background-color: rgba(28, 25, 23, 0.45);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: fade-in 0.15s ease-out;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-dialog {
  width: 100%;
  max-width: 440px;
  filter: drop-shadow(0 12px 28px rgba(0, 0, 0, 0.25));
  animation: scale-up 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes scale-up {
  from {
    transform: scale(0.94);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.modal-rough-box {
  width: 100%;
}

.modal-content {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1.5px dashed #e7e5e4;
  padding-bottom: 12px;
}

.title-with-icon {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-icon {
  font-size: 24px;
  line-height: 1;
}

.modal-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: #1c1917;
  letter-spacing: -0.01em;
}

.modal-subtitle {
  font-size: 0.76rem;
  color: #78716c;
}

.modal-close-btn {
  background: none;
  border: none;
  font-size: 16px;
  color: #78716c;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.modal-close-btn:hover {
  color: #1c1917;
  background-color: #f5f5f4;
}

/* Total Display Card */
.total-card {
  background-color: #fef3c7;
  border: 1.5px solid #fde68a;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.total-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.total-label {
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #92400e;
}

.total-count-badge {
  font-size: 0.72rem;
  font-weight: 700;
  color: #b45309;
}

.total-value-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.total-value {
  font-size: 2rem;
  font-weight: 900;
  color: #78350f;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.reset-rolls-btn {
  font-size: 0.72rem;
  font-weight: 700;
  color: #92400e;
  background: rgba(254, 243, 199, 0.8);
  border: 1px solid #fcd34d;
  border-radius: 4px;
  padding: 2px 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.reset-rolls-btn:hover {
  background-color: #fde68a;
  color: #78350f;
}

/* Rolls Section */
.rolls-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rolls-section-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.rolls-section-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: #57534e;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.rolls-hint {
  font-size: 0.7rem;
  color: #a8a29e;
  font-style: italic;
}

.rolls-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 220px;
  overflow-y: auto;
  padding-right: 4px;
}

.roll-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.roll-badge {
  min-width: 60px;
  font-size: 0.78rem;
  font-weight: 700;
  color: #78716c;
}

.roll-input {
  flex: 1;
  font-size: 1rem;
  font-weight: 700;
  color: #1c1917;
  border: 1.5px solid #d6d3d1;
  border-radius: 6px;
  padding: 6px 10px;
  background-color: #fafaf9;
  outline: none;
  font-variant-numeric: tabular-nums;
  transition: all 0.15s ease;
}

.roll-input:focus {
  border-color: #b45309;
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(180, 83, 9, 0.12);
}

.roll-input::placeholder {
  color: #a8a29e;
  font-size: 0.82rem;
  font-weight: 500;
  font-style: italic;
}

.roll-remove-btn {
  background: none;
  border: none;
  color: #a8a29e;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  transition: all 0.15s ease;
  line-height: 1;
}

.roll-remove-btn:hover:not(:disabled) {
  color: #dc2626;
  background-color: #fee2e2;
}

.roll-remove-btn:disabled {
  opacity: 0.25;
  cursor: default;
}

/* Quick Dice & Actions */
.rolls-actions-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 4px;
  border-top: 1px dashed #e7e5e4;
}

.quick-dice-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.quick-dice-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: #78716c;
}

.quick-dice-buttons {
  display: flex;
  gap: 4px;
}

.quick-die-btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
  border: 1px solid #d6d3d1;
  border-radius: 4px;
  font-size: 0.78rem;
  font-weight: 800;
  color: #44403c;
  cursor: pointer;
  transition: all 0.12s ease;
}

.quick-die-btn:hover {
  background-color: #fef3c7;
  border-color: #f59e0b;
  color: #92400e;
  transform: translateY(-1px);
}

.add-box-btn {
  font-size: 0.74rem;
  font-weight: 700;
  color: #78350f;
  background-color: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.add-box-btn:hover {
  background-color: #fde68a;
  border-color: #fcd34d;
}

/* Footer */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1.5px dashed #e7e5e4;
  padding-top: 14px;
}

.btn-inner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-weight: 700;
  font-size: 0.88rem;
}

.done-badge {
  font-size: 0.82rem;
  font-weight: 800;
  opacity: 0.9;
}
</style>
