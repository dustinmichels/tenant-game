<script setup lang="ts">
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "reka-ui";
import { X, CornerDownLeft } from "lucide-vue-next";
import { useEventListener } from "@vueuse/core";
import type { Building } from "../types/game";
import RoughBox from "./RoughBox.vue";
import RoughButton from "./RoughButton.vue";

const props = defineProps<{
  show: boolean;
  building?: Building | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "confirm", buildingId: string): void;
}>();

function handleConfirm() {
  if (props.building?.id) {
    emit("confirm", props.building.id);
  }
  emit("close");
}

function handleOpenAutoFocus(event: Event) {
  event.preventDefault();
  const confirmBtn = document.querySelector(".btn-confirm-delete") as HTMLElement | null;
  if (confirmBtn) {
    confirmBtn.focus();
  }
}

function handleModalKeydown(e: KeyboardEvent) {
  if (!props.show) return;

  if (e.key === "Escape") {
    e.preventDefault();
    emit("close");
    return;
  }

  if (e.key === "Enter" && !e.repeat && !e.isComposing) {
    const target = e.target as HTMLElement | null;
    if (target?.closest(".modal-close-btn") || target?.closest(".btn-cancel")) {
      return;
    }
    e.preventDefault();
    handleConfirm();
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
          :stroke="'#292524'"
          :fill="'#fffdfa'"
          fill-style="solid"
          :roughness="1.0"
          :stroke-width="1.8"
          :seed="828"
          class="modal-rough-box"
        >
          <div class="modal-content">
            <!-- Modal Header -->
            <div class="modal-header">
              <div class="title-with-icon">
                <span class="header-icon-badge" aria-hidden="true">
                  <X :size="16" :stroke-width="2.5" class="header-icon" />
                </span>
                <DialogTitle as="h3" id="delete-building-title" class="modal-title">
                  Delete Building
                </DialogTitle>
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

            <!-- Modal Body -->
            <div class="modal-body">
              <DialogDescription as="p" class="confirm-question">
                Are you sure you want to delete
                <strong class="target-name">{{ building?.label || "this building" }}</strong
                >?
              </DialogDescription>
              <p class="deletion-details">
                This will remove the building and its
                <strong>{{ building?.tenants?.length ?? 0 }}</strong>
                {{ (building?.tenants?.length ?? 0) === 1 ? "resident" : "residents" }} from the
                neighborhood.
              </p>
            </div>

            <!-- Modal Footer -->
            <div class="modal-footer">
              <RoughButton
                variant="secondary"
                :seed="829"
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
                variant="danger"
                :seed="830"
                class="btn-confirm btn-confirm-delete"
                title="Delete Building (Enter)"
                aria-label="Delete Building (Press Enter)"
                @click="handleConfirm"
              >
                <span class="btn-text">Delete Building</span>
                <kbd class="btn-kbd btn-kbd-danger">
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
  max-width: 420px;
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

.header-icon-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background-color: #fee2e2;
  border: 1.5px solid #ef4444;
  color: #dc2626;
}

.header-icon {
  line-height: 1;
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
  transition: all 0.15s ease;
}

.modal-close-btn:hover {
  color: #1c1917;
  background-color: #f5f5f4;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0;
}

.confirm-question {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  color: #1c1917;
  line-height: 1.4;
}

.target-name {
  color: #b91c1c;
}

.deletion-details {
  margin: 0;
  font-size: 13.5px;
  color: #57534e;
  line-height: 1.45;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1.5px dashed #e7e5e4;
  padding-top: 16px;
  margin-top: 4px;
}

.btn-cancel,
.btn-confirm {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
}

.btn-kbd {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 5px;
  background-color: rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 3px;
  font-family: inherit;
  font-size: 10.5px;
  color: #78716c;
}

.btn-kbd-danger {
  background-color: rgba(185, 28, 28, 0.1);
  border-color: rgba(185, 28, 28, 0.25);
  color: #991b1b;
}

.kbd-text {
  line-height: 1;
}

.kbd-symbol {
  line-height: 1;
}
</style>
