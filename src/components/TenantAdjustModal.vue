<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle } from "reka-ui";
import { Dices, X } from "lucide-vue-next";
import type { Building } from "../types/game";
import { BUILDING_COLORS } from "../types/game";
import { getBuildingColor } from "../utils/coalitions";
import { getRandomPrimaryColor } from "../utils/colorTheory";
import RoughBox from "./RoughBox.vue";
import RoughButton from "./RoughButton.vue";

const props = defineProps<{
  show: boolean;
  building: Building | null;
  defaultPeople: number;
  totalBuildings?: number;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "save", buildingId: string, settings: { count: number; label: string; color: string }): void;
  (e: "save", buildingId: string, count: number): void;
}>();

const defaultBuildingName = computed(() => `Building ${props.building?.index ?? 1}`);

const defaultColor = computed(() => {
  if (!props.building) return "#2563eb";
  return getBuildingColor(props.building.index, props.totalBuildings);
});

const countInput = ref(props.building?.tenants.length ?? props.defaultPeople);
const nameInput = ref(props.building?.label ?? "");
const colorInput = ref(props.building?.color ?? "#2563eb");

watch(
  () => [props.show, props.building],
  () => {
    if (props.building) {
      countInput.value = props.building.tenants.length;
      nameInput.value = props.building.label || defaultBuildingName.value;
      colorInput.value = props.building.color || defaultColor.value;
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

function resetNameToDefault() {
  nameInput.value = defaultBuildingName.value;
}

function resetColorToDefault() {
  colorInput.value = defaultColor.value;
}

function pickRandomPrimary() {
  colorInput.value = getRandomPrimaryColor();
}

function resetTenantsToDefault() {
  countInput.value = Math.max(1, props.defaultPeople);
}

function handleHexInput(e: Event) {
  const target = e.target as HTMLInputElement;
  let val = target.value.trim();
  if (!val) return;
  if (!val.startsWith("#")) {
    val = "#" + val;
  }
  colorInput.value = val;
}

function handleSave() {
  if (props.building) {
    const finalCount = Math.max(
      1,
      Math.min(100, Math.round(countInput.value) || props.defaultPeople),
    );
    const finalLabel = nameInput.value.trim() || defaultBuildingName.value;
    const finalColor = colorInput.value.trim() || defaultColor.value;

    emit("save", props.building.id, {
      count: finalCount,
      label: finalLabel,
      color: finalColor,
    });
    emit("close");
  }
}
</script>

<template>
  <DialogRoot
    :open="show && Boolean(building)"
    @update:open="
      (val) => {
        if (!val) emit('close');
      }
    "
  >
    <DialogPortal>
      <DialogOverlay class="modal-backdrop" />
      <DialogContent class="modal-dialog">
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
                <span class="building-swatch" :style="{ backgroundColor: colorInput }" />
                <DialogTitle as="h3" class="modal-title">
                  Building Settings: {{ nameInput.trim() || defaultBuildingName }}
                </DialogTitle>
              </div>
              <button
                type="button"
                class="modal-close-btn"
                aria-label="Close"
                @click="emit('close')"
              >
                <X :size="16" :stroke-width="1.5" />
              </button>
            </div>

            <!-- Modal Body -->
            <div class="modal-body">
              <!-- Section 1: Building Name -->
              <div class="form-section">
                <div class="section-header-row">
                  <label for="building-name-input" class="field-label">Building Name</label>
                  <button
                    type="button"
                    class="reset-shortcut-btn"
                    title="Reset name to default"
                    :disabled="nameInput.trim() === defaultBuildingName"
                    @click="resetNameToDefault"
                  >
                    ↺ Default
                  </button>
                </div>
                <input
                  id="building-name-input"
                  v-model="nameInput"
                  type="text"
                  class="name-text-field"
                  :placeholder="defaultBuildingName"
                  maxlength="40"
                  @keydown.enter.prevent="handleSave"
                />
                <span class="field-hint">Default: "{{ defaultBuildingName }}"</span>
              </div>

              <!-- Section 2: Number of People / Tenants -->
              <div class="form-section">
                <div class="section-header-row">
                  <label class="field-label">Number of People</label>
                  <button
                    type="button"
                    class="reset-shortcut-btn"
                    :disabled="countInput === defaultPeople"
                    @click="resetTenantsToDefault"
                  >
                    ↺ Default ({{ defaultPeople }})
                  </button>
                </div>
                <p class="description-text">
                  Starting default is {{ defaultPeople }} tenants per building.
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
                      @keydown.enter.prevent="handleSave"
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

                <div class="preservation-note">
                  <span class="note-icon">ℹ</span>
                  <span
                    >The instigator (★) and existing union members will be preserved if you reduce
                    units.</span
                  >
                </div>
              </div>

              <!-- Section 3: Building Color -->
              <div class="form-section">
                <div class="section-header-row">
                  <label class="field-label">Building Color</label>
                  <div class="color-shortcut-group">
                    <button
                      type="button"
                      class="reset-shortcut-btn"
                      title="Roll a random color close to primary colors"
                      @click="pickRandomPrimary"
                    >
                      <Dices
                        :size="13"
                        :stroke-width="1.5"
                        aria-hidden="true"
                        style="margin-right: 4px; vertical-align: -2px"
                      />Random Primary
                    </button>
                    <button
                      type="button"
                      class="reset-shortcut-btn"
                      title="Reset color to default"
                      :disabled="colorInput.toLowerCase() === defaultColor.toLowerCase()"
                      @click="resetColorToDefault"
                    >
                      ↺ Default
                    </button>
                  </div>
                </div>

                <!-- Preset Swatches Grid -->
                <div class="color-palette-grid">
                  <button
                    v-for="c in BUILDING_COLORS"
                    :key="c"
                    type="button"
                    class="color-swatch-btn"
                    :class="{ 'is-selected': colorInput.toLowerCase() === c.toLowerCase() }"
                    :style="{ backgroundColor: c }"
                    :title="`Select ${c}`"
                    :aria-label="`Color ${c}`"
                    @click="colorInput = c"
                  >
                    <span
                      v-if="colorInput.toLowerCase() === c.toLowerCase()"
                      class="swatch-check"
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                  </button>
                </div>

                <!-- Custom Color Picker Row -->
                <div class="custom-color-row">
                  <label class="custom-picker-wrap" title="Custom color picker">
                    <input
                      v-model="colorInput"
                      type="color"
                      class="native-color-input"
                      aria-label="Pick custom color"
                    />
                    <span class="custom-picker-swatch" :style="{ backgroundColor: colorInput }" />
                    <span class="custom-picker-label">Custom picker</span>
                  </label>

                  <div class="hex-input-wrap">
                    <span class="hex-prefix">#</span>
                    <input
                      :value="colorInput.startsWith('#') ? colorInput.slice(1) : colorInput"
                      type="text"
                      class="hex-field"
                      maxlength="8"
                      placeholder="2563eb"
                      spellcheck="false"
                      aria-label="Hex color value"
                      @input="handleHexInput"
                      @keydown.enter.prevent="handleSave"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="modal-footer">
              <RoughButton variant="secondary" :seed="722" @click="emit('close')">
                <span>Cancel</span>
              </RoughButton>

              <RoughButton variant="primary" :seed="723" @click="handleSave">
                <span>Apply Settings</span>
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
  padding: 20px 22px;
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

.title-with-swatch {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.building-swatch {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid #292524;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: background-color 0.15s ease;
}

.modal-title {
  margin: 0;
  font-size: 16.5px;
  font-weight: 700;
  color: #1c1917;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  gap: 16px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.field-label {
  font-size: 12.5px;
  font-weight: 700;
  color: #292524;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.name-text-field {
  width: 100%;
  background: #fbf8f2;
  border: 1.5px solid #a89c8a;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  color: #1c1917;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.name-text-field:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}

.field-hint {
  font-size: 11px;
  color: #78716c;
  font-style: italic;
}

/* Color section */
.color-palette-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 5px;
  padding: 1px 0;
}

@media (max-width: 360px) {
  .color-palette-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

.color-swatch-btn {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 50%;
  border: 1.5px solid #ffffff;
  outline: 1.5px solid #d6cfc4;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition:
    transform 0.12s ease,
    outline 0.12s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
}

.color-swatch-btn:hover {
  transform: scale(1.15);
  outline-color: #292524;
}

.color-swatch-btn.is-selected {
  outline: 2px solid #1c1917;
  transform: scale(1.08);
}

.swatch-check {
  color: #ffffff;
  font-size: 11px;
  font-weight: 900;
  line-height: 1;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
}

.custom-color-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}

.custom-picker-wrap {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  background: #fbf8f2;
  border: 1.5px solid #a89c8a;
  border-radius: 5px;
  padding: 3px 8px;
  font-size: 11.5px;
  color: #44403c;
  position: relative;
  user-select: none;
  transition: background-color 0.15s ease;
}

.custom-picker-wrap:hover {
  background: #f5eedf;
}

.native-color-input {
  position: absolute;
  opacity: 0;
  width: 100%;
  height: 100%;
  inset: 0;
  cursor: pointer;
}

.custom-picker-swatch {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid #78716c;
  display: inline-block;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

.custom-picker-label {
  font-size: 11.5px;
  font-weight: 600;
  color: #443a2f;
  white-space: nowrap;
}

.hex-input-wrap {
  display: flex;
  align-items: center;
  background: #fbf8f2;
  border: 1.5px solid #a89c8a;
  border-radius: 5px;
  padding: 0 6px;
  flex: 1;
}

.hex-prefix {
  font-size: 11.5px;
  color: #78716c;
  font-weight: 700;
  user-select: none;
}

.hex-field {
  border: none;
  background: transparent;
  font-family: monospace;
  font-size: 12px;
  color: #1c1917;
  padding: 4px 4px;
  width: 100%;
  outline: none;
}

/* Tenants stepper section */
.description-text {
  font-size: 12.5px;
  color: #57534e;
  margin: 0;
}

.stepper-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 4px 0;
}

.stepper-btn {
  width: 42px;
  height: 42px;
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
  padding: 5px 16px;
  min-width: 100px;
}

.number-field {
  width: 70px;
  text-align: center;
  font-size: 24px;
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

.color-shortcut-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.reset-shortcut-btn {
  background: none;
  border: 1px solid #d6cfc4;
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 11.5px;
  color: #57534e;
  cursor: pointer;
  background-color: #f5f5f4;
  transition: all 0.15s ease;
}

.reset-shortcut-btn:hover:not(:disabled) {
  background-color: #e7e5e4;
  color: #1c1917;
}

.reset-shortcut-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
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
