<script setup lang="ts">
import { ref, computed } from "vue";
import RoughBox from "./RoughBox.vue";

const props = withDefaults(
  defineProps<{
    variant?: "primary" | "secondary" | "danger" | "warning" | "ghost";
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
    seed?: number;
  }>(),
  {
    variant: "secondary",
    disabled: false,
    type: "button",
    seed: undefined,
  },
);

const emit = defineEmits<{
  (e: "click", event: MouseEvent): void;
}>();

const isHovered = ref(false);

const buttonColors = computed(() => {
  if (props.disabled) {
    return {
      stroke: "#a1a1aa",
      fill: "#f4f4f5",
      fillStyle: "solid" as const,
      textColor: "#a1a1aa",
    };
  }

  switch (props.variant) {
    case "primary":
      return {
        stroke: isHovered.value ? "#18181b" : "#27272a",
        fill: isHovered.value ? "#e4d5bc" : "#ede2cf",
        fillStyle: "solid" as const,
        textColor: "#1c1917",
      };
    case "danger":
      return {
        stroke: isHovered.value ? "#991b1b" : "#b91c1c",
        fill: isHovered.value ? "#fee2e2" : "#fef2f2",
        fillStyle: "solid" as const,
        textColor: isHovered.value ? "#7f1d1d" : "#991b1b",
      };
    case "warning":
      return {
        stroke: isHovered.value ? "#92400e" : "#b45309",
        fill: isHovered.value ? "#fde68a" : "#fef3c7",
        fillStyle: "solid" as const,
        textColor: isHovered.value ? "#78350f" : "#92400e",
      };
    case "ghost":
      return {
        stroke: isHovered.value ? "#71717a" : "transparent",
        fill: isHovered.value ? "#f4f4f5" : undefined,
        fillStyle: "solid" as const,
        textColor: "#3f3f46",
      };
    case "secondary":
    default:
      return {
        stroke: isHovered.value ? "#27272a" : "#52525b",
        fill: isHovered.value ? "#fbf8f2" : "#ffffff",
        fillStyle: "solid" as const,
        textColor: "#27272a",
      };
  }
});

function handleClick(e: MouseEvent) {
  if (!props.disabled) {
    emit("click", e);
  }
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="rough-btn"
    :class="[`variant-${variant}`, { 'is-disabled': disabled }]"
    :style="{ color: buttonColors.textColor }"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @click="handleClick"
  >
    <RoughBox
      :stroke="buttonColors.stroke"
      :fill="buttonColors.fill"
      :fill-style="buttonColors.fillStyle"
      :roughness="1.3"
      :bowing="1.1"
      :stroke-width="variant === 'primary' ? 1.8 : 1.4"
      :seed="seed"
      class="rough-btn-box"
    >
      <span class="rough-btn-label">
        <slot />
      </span>
    </RoughBox>
  </button>
</template>

<style scoped>
.rough-btn {
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  font-family: inherit;
  font-weight: 600;
  font-size: 0.92rem;
  line-height: 1;
  user-select: none;
  outline: none;
  transition: transform 0.15s ease;
}

.rough-btn:not(:disabled):hover {
  transform: translateY(-1.5px);
}

.rough-btn:not(:disabled):active {
  transform: translateY(0.5px);
}

.rough-btn.is-disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.rough-btn-box {
  width: 100%;
}

.rough-btn-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
}
</style>
