<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import type { Building } from "../types/game";
import RoughBox from "./RoughBox.vue";
import RoughButton from "./RoughButton.vue";

const props = defineProps<{
  show: boolean;
  building: Building | null;
  defaultPeople: number;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "save", buildingId: string, count: number): void;
}>();

const countInput = ref(props.building?.tenants.length ?? props.defaultPeople);

watch(
  () => [props.show, props.building],
  () => {
    if (props.building) {
      countInput.value = props.building.tenants.length;
    }
  },
  { immediate: true },
);

function increment() {
  countInput.value = Math.min(100, countInput.value + 1);
}

function decrement() {
  countInput.value = Math.max(1, countInput.value - 1);
}

function resetToDefault() {
  countInput.value = Math.max(1, props.defaultPeople);
}

function handleSave() {
  if (props.building) {
    emit("save", props.building.id, Math.max(1, Math.min(100, countInput.value)));
    emit("close");
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && props.show) {
    emit("close");
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
  <Teleport to="body">
    <div v-if="show && building" class="modal-backdrop" @click="emit('close')">
      <div class="modal-dialog" @click.stop>
        <RoughBox
          :stroke="'#292524'"
          :fill="'#fffdfa'"
          fill-style="solid"
          :roughness="1.0"
          :stroke-width="1.8"
          :seed="717"
          class="modal-rough-box"
        >
          <div class="modal-content">
            <!-- Modal Header -->
            <div class="modal-header">
              <div class="title-with-swatch">
                <span class="building-swatch" :style="{ backgroundColor: building.color }" />
                <h3 class="modal-title">Adjust Tenants: {{ building.label }}</h3>
              </div>
              <button
                type="button"
                class="modal-close-btn"
                aria-label="Close"
                @click="emit('close')"
              >
                ✕
              </button>
            </div>

            <!-- Modal Body -->
            <div class="modal-body">
              <p class="description-text">
                Change the number of people living in this building. The starting default is
                {{ defaultPeople }} tenants.
              </p>

              <div class="stepper-row">
                <RoughButton
                  variant="secondary"
                  :seed="720"
                  class="stepper-btn"
                  :disabled="countInput <= 1"
                  @click="decrement"
                >
                  <span class="stepper-sym">−</span>
                </RoughButton>

                <div class="input-wrapper">
                  <input
                    v-model.number="countInput"
                    type="number"
                    min="1"
                    max="100"
                    class="number-field"
                  />
                  <span class="units-label">Tenants</span>
                </div>

                <RoughButton
                  variant="secondary"
                  :seed="721"
                  class="stepper-btn"
                  :disabled="countInput >= 100"
                  @click="increment"
                >
                  <span class="stepper-sym">+</span>
                </RoughButton>
              </div>

              <div class="quick-actions">
                <button type="button" class="reset-shortcut-btn" @click="resetToDefault">
                  ↺ Reset to default ({{ defaultPeople }})
                </button>
              </div>

              <div class="preservation-note">
                <span class="note-icon">ℹ</span>
                <span
                  >The instigator (★) and existing union members will be preserved if you reduce
                  units.</span
                >
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="modal-footer">
              <RoughButton variant="secondary" :seed="722" @click="emit('close')">
                <span>Cancel</span>
              </RoughButton>

              <RoughButton variant="primary" :seed="723" @click="handleSave">
                <span>Apply Tenants</span>
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
  max-width: 420px;
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
  gap: 18px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1.5px dashed #e7e5e4;
  padding-bottom: 12px;
}

.title-with-swatch {
  display: flex;
  align-items: center;
  gap: 10px;
}

.building-swatch {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1.5px solid #292524;
  flex-shrink: 0;
}

.modal-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #1c1917;
}

.modal-close-btn {
  background: none;
  border: none;
  font-size: 16px;
  color: #78716c;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.modal-close-btn:hover {
  color: #1c1917;
  background-color: #f5f5f4;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.description-text {
  font-size: 13px;
  color: #57534e;
  margin: 0;
}

.stepper-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 8px 0;
}

.stepper-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stepper-sym {
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
}

.input-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #fbf8f2;
  border: 1.5px solid #a89c8a;
  border-radius: 6px;
  padding: 6px 16px;
  min-width: 100px;
}

.number-field {
  width: 70px;
  text-align: center;
  font-size: 26px;
  font-weight: 800;
  color: #1c1917;
  border: none;
  background: transparent;
  outline: none;
}

/* Remove spin buttons */
.number-field::-webkit-inner-spin-button,
.number-field::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.units-label {
  font-size: 11px;
  color: #78716c;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.quick-actions {
  display: flex;
  justify-content: center;
}

.reset-shortcut-btn {
  background: none;
  border: 1px solid #d6cfc4;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 12px;
  color: #57534e;
  cursor: pointer;
  background-color: #f5f5f4;
}

.reset-shortcut-btn:hover {
  background-color: #e7e5e4;
  color: #1c1917;
}

.preservation-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  background-color: #fef3c7;
  border-radius: 6px;
  font-size: 12px;
  color: #92400e;
  line-height: 1.4;
}

.note-icon {
  font-weight: bold;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1.5px dashed #e7e5e4;
  padding-top: 14px;
}
</style>
