<script setup lang="ts">
import { ref, computed, watch, nextTick, useTemplateRef } from "vue";
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle } from "reka-ui";
import { Building2, Banknote, Coins, X } from "lucide-vue-next";
import { useEventListener } from "@vueuse/core";
import RoughBox from "./RoughBox.vue";
import RoughButton from "./RoughButton.vue";
import { formatCurrency, formatCompactCurrency, parseCustomAmount } from "../utils/currency";

const props = withDefaults(
  defineProps<{
    show: boolean;
    landlordMoney?: number;
  }>(),
  {
    landlordMoney: 0,
  },
);

const emit = defineEmits<{
  (e: "close"): void;
  (e: "spend", amount: number): void;
  (e: "earn", amount: number): void;
}>();

const customAmountInput = ref("");
const customInputRef = useTemplateRef<HTMLInputElement>("customInputRef");

// Reset input when modal opens and focus
watch(
  () => props.show,
  (isOpen) => {
    if (isOpen) {
      customAmountInput.value = "";
      nextTick(() => {
        customInputRef.value?.focus();
      });
    }
  },
);

// Parses strings like "25000", "$25,000", "50k", "1.5m", "100K"
const parsedCustomAmount = computed<number | null>(() =>
  parseCustomAmount(customAmountInput.value),
);

const isCustomValid = computed(
  () => parsedCustomAmount.value !== null && parsedCustomAmount.value > 0,
);

const formattedCustomAmount = computed(() => {
  if (!parsedCustomAmount.value) return "";
  return formatCurrency(parsedCustomAmount.value);
});

const formattedCustomCompact = computed(() => {
  if (!parsedCustomAmount.value) return "";
  return formatCompactCurrency(parsedCustomAmount.value);
});

function handleSpendDefault() {
  emit("spend", 50000);
  emit("close");
}

function handleEarnDefault() {
  emit("earn", 50000);
  emit("close");
}

function handleCustomSpend() {
  if (parsedCustomAmount.value) {
    emit("spend", parsedCustomAmount.value);
    emit("close");
  }
}

function handleCustomEarn() {
  if (parsedCustomAmount.value) {
    emit("earn", parsedCustomAmount.value);
    emit("close");
  }
}

function handleEnterKey(e: KeyboardEvent) {
  if (isCustomValid.value) {
    e.preventDefault();
    if (customAmountInput.value.trim().startsWith("+")) {
      handleCustomEarn();
    } else {
      handleCustomSpend();
    }
  }
}

function handleOpenAutoFocus(event: Event) {
  event.preventDefault();
  customInputRef.value?.focus();
}

function handleModalKeydown(e: KeyboardEvent) {
  if (!props.show) return;

  if (e.key === "Escape") {
    e.preventDefault();
    emit("close");
    return;
  }
}

useEventListener(window, "keydown", handleModalKeydown);
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
          :stroke="'#78350f'"
          :fill="'#fefdfb'"
          fill-style="solid"
          :roughness="0.8"
          :stroke-width="1.6"
          :seed="940"
          class="modal-rough-box"
        >
          <div class="modal-content">
            <!-- Modal Header -->
            <div class="modal-header">
              <div class="title-with-icon">
                <Building2 :size="18" :stroke-width="1.5" class="header-icon" aria-hidden="true" />
                <DialogTitle as="h3" id="landlord-modal-title" class="modal-title"
                  >Landlord Funds: Spend / Earn</DialogTitle
                >
              </div>
              <button
                type="button"
                class="modal-close-btn"
                title="Close (Esc)"
                aria-label="Close"
                @click="emit('close')"
              >
                <X :size="16" :stroke-width="1.5" />
              </button>
            </div>

            <!-- Current Balance Display -->
            <div class="current-balance-card">
              <span class="balance-label">Current Balance</span>
              <span
                class="balance-value"
                :title="`Current funds: ${formatCurrency(landlordMoney ?? 0)}`"
              >
                {{ formatCurrency(landlordMoney ?? 0) }}
              </span>
            </div>

            <!-- Default Actions Section -->
            <div class="actions-group">
              <span class="group-label">Quick Actions</span>
              <div class="default-buttons-row">
                <RoughButton
                  variant="danger"
                  :disabled="(landlordMoney ?? 0) <= 0"
                  :seed="941"
                  title="Landlord spends $50,000"
                  class="action-btn"
                  @click="handleSpendDefault"
                >
                  <span class="btn-inner">
                    <Banknote :size="16" :stroke-width="1.5" class="btn-icon" aria-hidden="true" />
                    <span class="btn-text">Landlord spends 50k</span>
                  </span>
                </RoughButton>

                <RoughButton
                  variant="success"
                  :seed="942"
                  title="Landlord earns $50,000"
                  class="action-btn"
                  @click="handleEarnDefault"
                >
                  <span class="btn-inner">
                    <Coins :size="16" :stroke-width="1.5" class="btn-icon" aria-hidden="true" />
                    <span class="btn-text">Landlord earns 50k</span>
                  </span>
                </RoughButton>
              </div>
            </div>

            <!-- Custom Amount Section -->
            <div class="actions-group">
              <label for="custom-landlord-amount" class="group-label">
                Custom Spends / Earns
              </label>

              <div class="custom-input-wrapper">
                <span class="currency-symbol" aria-hidden="true">$</span>
                <input
                  id="custom-landlord-amount"
                  ref="customInputRef"
                  v-model="customAmountInput"
                  type="text"
                  class="custom-amount-input"
                  placeholder="e.g. 25,000 or 75k"
                  autocomplete="off"
                  @keydown.enter="handleEnterKey"
                />
                <button
                  v-if="customAmountInput"
                  type="button"
                  class="input-clear-btn"
                  title="Clear input"
                  aria-label="Clear custom amount"
                  @click="customAmountInput = ''"
                >
                  ×
                </button>
              </div>

              <!-- Action buttons for custom amount -->
              <div class="custom-buttons-row">
                <RoughButton
                  variant="danger"
                  :disabled="!isCustomValid || (landlordMoney ?? 0) <= 0"
                  :seed="943"
                  :title="
                    isCustomValid
                      ? `Landlord spends ${formattedCustomAmount}`
                      : 'Enter an amount to spend'
                  "
                  class="action-btn"
                  @click="handleCustomSpend"
                >
                  <span class="btn-inner">
                    <Banknote :size="16" :stroke-width="1.5" class="btn-icon" aria-hidden="true" />
                    <span class="btn-text">
                      {{ isCustomValid ? `Spend ${formattedCustomCompact}` : "Spend Custom" }}
                    </span>
                  </span>
                </RoughButton>

                <RoughButton
                  variant="success"
                  :disabled="!isCustomValid"
                  :seed="944"
                  :title="
                    isCustomValid
                      ? `Landlord earns ${formattedCustomAmount}`
                      : 'Enter an amount to earn'
                  "
                  class="action-btn"
                  @click="handleCustomEarn"
                >
                  <span class="btn-inner">
                    <Coins :size="16" :stroke-width="1.5" class="btn-icon" aria-hidden="true" />
                    <span class="btn-text">
                      {{ isCustomValid ? `Earn ${formattedCustomCompact}` : "Earn Custom" }}
                    </span>
                  </span>
                </RoughButton>
              </div>
            </div>

            <!-- Footer with Cancel button -->
            <div class="modal-footer">
              <RoughButton
                variant="ghost"
                :seed="945"
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
  max-width: 440px;
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
  font-size: 20px;
  line-height: 1;
}

.modal-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: #1c1917;
  letter-spacing: -0.01em;
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

.current-balance-card {
  background-color: #fef3c7;
  border: 1.5px solid #fde68a;
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.balance-label {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #78350f;
}

.balance-value {
  font-size: 1.25rem;
  font-weight: 800;
  color: #78350f;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.actions-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: #57534e;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.default-buttons-row,
.custom-buttons-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.action-btn {
  width: 100%;
}

.btn-inner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  font-weight: 700;
  font-size: 0.86rem;
  white-space: nowrap;
}

.btn-icon {
  font-size: 1rem;
  line-height: 1;
}

.custom-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.currency-symbol {
  position: absolute;
  left: 12px;
  color: #78716c;
  font-weight: 700;
  font-size: 1rem;
  pointer-events: none;
}

.custom-amount-input {
  width: 100%;
  padding: 8px 32px 8px 26px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #1c1917;
  background-color: #fafaf9;
  border: 1.5px solid #d6d3d1;
  border-radius: 6px;
  outline: none;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.custom-amount-input:focus {
  border-color: #78350f;
  background-color: #ffffff;
  box-shadow: 0 0 0 2px rgba(120, 53, 15, 0.15);
}

.input-clear-btn {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  color: #a8a29e;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
}

.input-clear-btn:hover {
  color: #44403c;
  background-color: #e7e5e4;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  border-top: 1.5px dashed #e7e5e4;
  padding-top: 12px;
}

.btn-cancel {
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

.kbd-text {
  font-size: 0.68rem;
  text-transform: uppercase;
  font-weight: 800;
  letter-spacing: 0.04em;
}
</style>
