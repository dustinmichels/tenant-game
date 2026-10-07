<script setup lang="ts">
import { computed } from "vue";
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "reka-ui";
import { Undo2, X, CornerDownLeft } from "lucide-vue-next";
import { useEventListener } from "@vueuse/core";
import type { GameEvent } from "../types/game";
import { ensureEventEmoji } from "../utils/eventLog";
import RoughBox from "./RoughBox.vue";
import RoughButton from "./RoughButton.vue";

const props = defineProps<{
  show: boolean;
  event?: GameEvent | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "confirm", eventId: string): void;
}>();

const promptActionText = computed(() => {
  if (!props.event) return "this action";
  const rawText = ensureEventEmoji(
    props.event.text,
    props.event.type,
    props.event.action?.type,
  ).trim();
  if (/action$/i.test(rawText)) {
    return `"${rawText}"`;
  }
  return `"${rawText}" action`;
});

function handleConfirm() {
  if (props.event) {
    emit("confirm", props.event.id);
  }
  emit("close");
}

function handleOpenAutoFocus(event: Event) {
  event.preventDefault();
  const confirmBtn = document.querySelector(".btn-confirm") as HTMLElement | null;
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
          :seed="855"
          class="modal-rough-box"
        >
          <div class="modal-content">
            <!-- Modal Header -->
            <div class="modal-header">
              <div class="title-with-icon">
                <Undo2 :size="18" :stroke-width="1.8" class="header-icon" aria-hidden="true" />
                <DialogTitle as="h3" id="undo-event-title" class="modal-title">
                  Undo Action
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
                Are you sure you want to undo {{ promptActionText }}?
              </DialogDescription>

              <div v-if="event" class="event-details-card">
                <div class="event-badge-row">
                  <span v-if="event.round" class="round-badge">Round {{ event.round }}</span>
                  <span class="type-badge" :class="`type-${event.type || 'general'}`">
                    {{
                      event.type === "spend"
                        ? "Spending"
                        : event.type === "earn"
                          ? "Earning"
                          : "General Event"
                    }}
                  </span>
                </div>
                <div class="event-text-preview">{{ event.text }}</div>
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="modal-footer">
              <RoughButton
                variant="secondary"
                :seed="856"
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
                :seed="857"
                class="btn-confirm"
                title="Undo Action (Enter)"
                aria-label="Undo Action (Press Enter)"
                @click="handleConfirm"
              >
                <span class="undo-btn-content">
                  <Undo2 :size="14" :stroke-width="1.8" />
                  <span class="btn-text">Undo Action</span>
                  <kbd class="btn-kbd btn-kbd-danger">
                    <CornerDownLeft
                      :size="11"
                      :stroke-width="1.5"
                      class="kbd-symbol"
                      aria-hidden="true"
                    />
                    <span class="kbd-text">Enter</span>
                  </kbd>
                </span>
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
  background-color: rgba(41, 37, 36, 0.45);
  backdrop-filter: blur(2px);
  z-index: 1000;
  animation: fadeIn 0.15s ease-out;
}

.modal-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90vw;
  max-width: 440px;
  z-index: 1001;
  outline: none;
  animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-rough-box {
  width: 100%;
}

.modal-content {
  position: relative;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px dashed #e7e5e4;
  padding-bottom: 0.75rem;
}

.title-with-icon {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-icon {
  color: #dc2626;
}

.modal-title {
  font-family: inherit;
  font-size: 1.15rem;
  font-weight: 700;
  color: #1c1917;
  margin: 0;
}

.modal-close-btn {
  background: transparent;
  border: none;
  color: #78716c;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.modal-close-btn:hover {
  background-color: #f5f5f4;
  color: #1c1917;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.confirm-question {
  font-size: 1rem;
  font-weight: 700;
  color: #1c1917;
  margin: 0;
  line-height: 1.45;
}

.event-details-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 0.85rem;
  background-color: #f5f2eb;
  border: 1.5px solid #ded5c5;
  border-radius: 6px;
}

.event-badge-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.round-badge {
  font-size: 0.72rem;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 4px;
  background-color: #e2e8f0;
  color: #334155;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.type-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.type-badge.type-spend {
  background-color: #fee2e2;
  color: #dc2626;
}

.type-badge.type-earn {
  background-color: #dcfce7;
  color: #15803d;
}

.type-badge.type-general {
  background-color: #f1f5f9;
  color: #64748b;
}

.event-text-preview {
  font-size: 0.88rem;
  font-weight: 600;
  color: #292524;
  word-break: break-word;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  border-top: 2px dashed #e7e5e4;
  padding-top: 0.75rem;
}

.btn-cancel,
.btn-confirm {
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

.btn-kbd-danger {
  color: #7f1d1d;
  background-color: #fef2f2;
  border-color: #fca5a5;
  box-shadow: 0 1px 0 #ef4444;
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
.undo-btn-content {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes popIn {
  from {
    opacity: 0;
    transform: translate(-50%, -48%) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
</style>
