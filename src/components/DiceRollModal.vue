<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUpdate } from "vue";
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "reka-ui";
import { useEventListener } from "@vueuse/core";
import { Dices, X, CornerDownLeft } from "lucide-vue-next";
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
  nextTick(() => {
    const el = inputRefs.value[index];
    if (el) {
      el.focus();
      el.select?.();
    }
  });
}

function syncRollFromInput(index: number) {
  const el = inputRefs.value[index];
  const item = rolls.value[index];
  if (el && item && el.value !== "" && item.value === null) {
    const num = Number(el.value);
    if (!isNaN(num) && num >= 0) {
      item.value = num;
    }
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
  syncRollFromInput(index);
  if (index < rolls.value.length - 1) {
    focusInput(index + 1);
  } else {
    const current = rolls.value[index];
    if (isRollValidNumber(current)) {
      ensureTrailingEmptyBox();
      focusInput(rolls.value.length - 1);
    } else if (validRollsCount.value > 0) {
      handleDone();
    }
  }
}

function onTab(index: number, e: KeyboardEvent) {
  if (e.shiftKey) {
    if (index > 0) {
      e.preventDefault();
      focusInput(index - 1);
    }
    return;
  }

  syncRollFromInput(index);
  if (index < rolls.value.length - 1) {
    e.preventDefault();
    focusInput(index + 1);
  } else {
    const current = rolls.value[index];
    if (isRollValidNumber(current)) {
      e.preventDefault();
      ensureTrailingEmptyBox();
      focusInput(rolls.value.length - 1);
    }
  }
}

function handleBoxKeydown(index: number, e: KeyboardEvent) {
  if (["e", "E", "+", "-", "."].includes(e.key)) {
    e.preventDefault();
    return;
  }
  if (e.key === "Backspace" && isRollEmpty(rolls.value[index]) && index > 0) {
    e.preventDefault();
    focusInput(index - 1);
    return;
  }
  if (e.key === "Enter") {
    e.preventDefault();
    onEnter(index);
  } else if (e.key === "Tab") {
    onTab(index, e);
  }
}

function addBox() {
  const last = rolls.value[rolls.value.length - 1];
  if (last && isRollEmpty(last)) {
    focusInput(rolls.value.length - 1);
  } else {
    rolls.value.push(createEmptyRoll());
    focusInput(rolls.value.length - 1);
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
  focusInput(rolls.value.length - 1);
}

function removeRoll(index: number) {
  if (rolls.value.length > 1) {
    rolls.value.splice(index, 1);
    ensureTrailingEmptyBox();
  } else {
    rolls.value[0]!.value = null;
  }
  const targetIdx = Math.min(index, rolls.value.length - 1);
  focusInput(targetIdx);
}

function reset() {
  nextRollId = 1;
  rolls.value = [{ id: "roll-1", value: null }];
  focusInput(0);
}

function handleDone() {
  if (validRollsCount.value === 0) return;
  emit("done", total.value);
  emit("close");
}
function handleOpenAutoFocus(event: Event) {
  event.preventDefault();
  focusInput(0);
}

function handleModalKeydown(e: KeyboardEvent) {
  if (!props.show) return;

  if (e.key === "Escape") {
    e.preventDefault();
    emit("close");
    return;
  }

  if (e.key === "Enter" && !e.repeat && !e.isComposing && validRollsCount.value > 0) {
    const target = e.target as HTMLElement | null;
    if (target?.closest(".modal-close-btn") || target?.closest(".btn-cancel")) {
      return;
    }
    if (e.ctrlKey || e.metaKey || !target?.closest(".roll-box-input")) {
      e.preventDefault();
      handleDone();
    }
  }
}

useEventListener(window, "keydown", handleModalKeydown);
watch(
  () => props.show,
  (isOpen) => {
    if (isOpen) {
      reset();
    }
  },
  { immediate: true },
);
</script>

<template>
  <DialogRoot
    :open="show"
    @update:open="
      (val) => {
        if (!val) emit('close');
      }
    "
  >
    <DialogPortal>
      <DialogOverlay class="modal-backdrop" />
      <DialogContent class="modal-dialog" @open-auto-focus="handleOpenAutoFocus">
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
                <Dices :size="20" :stroke-width="1.5" class="header-icon" aria-hidden="true" />
                <div>
                  <DialogTitle as="h3" id="dice-modal-title" class="modal-title"
                    >Dice Roll</DialogTitle
                  >
                  <DialogDescription as="span" class="modal-subtitle"
                    >Enter dice rolls to calculate group total</DialogDescription
                  >
                </div>
              </div>
              <button
                type="button"
                class="modal-close-btn"
                title="Close (Esc)"
                aria-label="Close modal"
                @click="emit('close')"
              >
                <X :size="16" :stroke-width="1.5" />
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
                <span class="rolls-hint">Boxes appear as you go &bull; Enter or Tab to next</span>
              </div>

              <div class="rolls-grid" role="list">
                <div
                  v-for="(roll, index) in rolls"
                  :key="roll.id"
                  class="roll-box"
                  :class="{ 'has-value': isRollValidNumber(roll) }"
                  role="listitem"
                  @click="focusInput(index)"
                >
                  <div class="roll-box-header">
                    <label :for="`roll-input-${roll.id}`" class="roll-box-label">
                      Roll {{ index + 1 }}
                    </label>
                    <button
                      v-if="!isRollEmpty(roll)"
                      type="button"
                      tabindex="-1"
                      class="roll-box-remove-btn"
                      :title="`Remove roll ${index + 1}`"
                      :aria-label="`Remove roll ${index + 1}`"
                      @click.stop="removeRoll(index)"
                    >
                      <X :size="11" :stroke-width="1.5" />
                    </button>
                  </div>
                  <div class="roll-box-body">
                    <input
                      :id="`roll-input-${roll.id}`"
                      :ref="(el) => setInputRef(el as HTMLInputElement | null, index)"
                      v-model.number="roll.value"
                      type="number"
                      min="0"
                      step="1"
                      placeholder=""
                      class="roll-box-input"
                      :aria-label="`Dice roll ${index + 1}`"
                      autocomplete="off"
                      @input="onRollInput(index)"
                      @keydown="handleBoxKeydown(index, $event)"
                    />
                  </div>
                </div>
              </div>

              <!-- Quick Dice Row & Add Roll Button -->
              <div class="rolls-actions-bar">
                <div class="quick-dice-group">
                  <span class="quick-dice-label">Quick add:</span>
                  <div class="quick-dice-buttons">
                    <button
                      v-for="val in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]"
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
                <button type="button" class="add-box-btn" @click="addBox">+ Add box</button>
              </div>
            </div>

            <!-- Footer Buttons -->
            <div class="modal-footer">
              <RoughButton
                variant="secondary"
                :seed="951"
                class="btn-cancel"
                title="Cancel (Esc to close)"
                aria-label="Cancel (Press Esc to close)"
                @click="emit('close')"
              >
                <span class="btn-text">Cancel</span>
                <kbd class="btn-kbd">
                  <span class="kbd-text">Esc</span>
                </kbd>
              </RoughButton>

              <RoughButton
                variant="primary"
                :seed="952"
                :disabled="validRollsCount === 0"
                class="btn-done"
                title="Done (Enter)"
                aria-label="Done (Press Enter)"
                @click="handleDone"
              >
                <span class="btn-inner">
                  <span class="btn-text">Done</span>
                  <span v-if="validRollsCount > 0" class="done-badge">({{ total }})</span>
                </span>
                <kbd class="btn-kbd" :class="{ 'btn-kbd-disabled': validRollsCount === 0 }">
                  <CornerDownLeft
                    :size="11"
                    :stroke-width="1.5"
                    class="kbd-symbol"
                    aria-hidden="true"
                  />
                  <span class="kbd-text">Enter</span>
                </kbd>
              </RoughButton>
            </div>
          </div>
        </RoughBox>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9998;
  background-color: rgba(28, 25, 23, 0.45);
  backdrop-filter: blur(2px);
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
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 9999;
  width: calc(100% - 32px);
  max-width: 560px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  filter: drop-shadow(0 12px 28px rgba(0, 0, 0, 0.25));
  animation: scale-up 0.15s cubic-bezier(0.16, 1, 0.3, 1);
  outline: none;
}

@keyframes scale-up {
  from {
    transform: translate(-50%, -50%) scale(0.94);
    opacity: 0;
  }
  to {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
}

.modal-rough-box {
  width: 100%;
}

.modal-content {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1.5px dashed #e7e5e4;
  padding-bottom: 10px;
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
  padding: 8px 14px;
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
  font-size: 1.75rem;
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
  gap: 6px;
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

.rolls-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  max-height: min(340px, calc(100vh - 260px));
  overflow-y: auto;
  padding: 2px 2px;
}
@media (max-width: 520px) {
  .rolls-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 380px) {
  .rolls-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.roll-box {
  position: relative;
  background-color: #fafaf9;
  border: 1.5px solid #d6d3d1;
  border-radius: 8px;
  padding: 4px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  min-height: 52px;
  cursor: text;
  transition: all 0.15s ease;
  animation: box-appear 0.15s ease-out;
}

@keyframes box-appear {
  from {
    opacity: 0;
    transform: scale(0.92);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.roll-box:hover {
  border-color: #a8a29e;
  background-color: #ffffff;
}

.roll-box:focus-within {
  border-color: #b45309;
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(180, 83, 9, 0.14);
}

.roll-box.has-value {
  background-color: #fffdf5;
  border-color: #fde68a;
}

.roll-box.has-value:hover {
  border-color: #fcd34d;
}

.roll-box.has-value:focus-within {
  border-color: #b45309;
  box-shadow: 0 0 0 3px rgba(180, 83, 9, 0.14);
}

.roll-box-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 14px;
}

.roll-box-label {
  font-size: 0.65rem;
  font-weight: 700;
  color: #78716c;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  user-select: none;
  pointer-events: none;
}

.roll-box.has-value .roll-box-label {
  color: #92400e;
}

.roll-box-remove-btn {
  background: none;
  border: none;
  color: #a8a29e;
  font-size: 10px;
  font-weight: bold;
  cursor: pointer;
  padding: 0 2px;
  border-radius: 3px;
  line-height: 1;
  transition: all 0.12s ease;
  opacity: 0.5;
}

.roll-box:hover .roll-box-remove-btn,
.roll-box:focus-within .roll-box-remove-btn {
  opacity: 1;
}

.roll-box-remove-btn:hover {
  color: #dc2626;
  background-color: #fee2e2;
}

.roll-box-body {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 0;
}

.roll-box-input {
  width: 100%;
  text-align: center;
  font-size: 1.25rem;
  font-weight: 800;
  color: #1c1917;
  background: transparent;
  border: none;
  outline: none;
  padding: 0;
  height: 28px;
  font-variant-numeric: tabular-nums;
  font-family: inherit;
  -moz-appearance: textfield;
}

.roll-box-input::-webkit-outer-spin-button,
.roll-box-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.roll-box-input::placeholder {
  color: #d6d3d1;
  font-weight: 400;
  font-size: 1.1rem;
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
  flex-wrap: wrap;
}

.quick-die-btn {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
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
  padding-top: 10px;
}

.btn-cancel,
.btn-done {
  display: inline-flex;
  align-items: center;
}

.btn-kbd {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-left: 6px;
  padding: 1px 5px;
  font-family: inherit;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: #523e2b;
  background-color: #fbf7ef;
  border: 1px solid #a89a86;
  border-radius: 4px;
  box-shadow: 0 1px 0 #8c7e6c;
  line-height: 1.2;
  user-select: none;
  vertical-align: middle;
}

.btn-kbd-disabled {
  opacity: 0.5;
  box-shadow: none;
}

.kbd-symbol {
  font-size: 0.8rem;
  line-height: 1;
}

.kbd-text {
  font-size: 0.68rem;
  text-transform: uppercase;
  font-weight: 800;
  letter-spacing: 0.04em;
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
