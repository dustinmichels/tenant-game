<script setup lang="ts">
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "reka-ui";
import { Scissors, X } from "lucide-vue-next";
import RoughBox from "./RoughBox.vue";
import RoughButton from "./RoughButton.vue";

const props = defineProps<{
  show: boolean;
  connectionId?: string | null;
  sourceLabel?: string;
  targetLabel?: string;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "confirm", connectionId: string): void;
}>();

function handleConfirm() {
  if (props.connectionId) {
    emit("confirm", props.connectionId);
  }
  emit("close");
}
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
      <DialogContent class="modal-dialog">
        <RoughBox
          :stroke="'#292524'"
          :fill="'#fffdfa'"
          fill-style="solid"
          :roughness="1.0"
          :stroke-width="1.8"
          :seed="818"
          class="modal-rough-box"
        >
          <div class="modal-content">
            <!-- Modal Header -->
            <div class="modal-header">
              <div class="title-with-icon">
                <Scissors :size="18" :stroke-width="1.5" class="header-icon" aria-hidden="true" />
                <DialogTitle as="h3" id="break-coalition-title" class="modal-title"
                  >Break Coalition</DialogTitle
                >
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
              <DialogDescription as="p" class="confirm-question"
                >Are you sure you want to break this coalition?</DialogDescription
              >
              <p v-if="sourceLabel && targetLabel" class="connection-details">
                This will disconnect <strong>{{ sourceLabel }}</strong> and
                <strong>{{ targetLabel }}</strong
                >.
              </p>
            </div>

            <!-- Modal Footer -->
            <div class="modal-footer">
              <RoughButton variant="secondary" :seed="821" @click="emit('close')">
                <span>Cancel</span>
              </RoughButton>

              <RoughButton variant="danger" :seed="822" @click="handleConfirm">
                <span>Break Coalition</span>
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

.header-icon {
  font-size: 18px;
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
  font-size: 16px;
  font-weight: 700;
  color: #1c1917;
  margin: 0;
  line-height: 1.35;
}

.connection-details {
  font-size: 13px;
  color: #57534e;
  margin: 0;
  line-height: 1.4;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1.5px dashed #e7e5e4;
  padding-top: 14px;
}
</style>
