<script setup lang="ts">
import { Building2, Move, Pencil, ArrowRight } from "lucide-vue-next";
import RoughBox from "./RoughBox.vue";
import RoughButton from "./RoughButton.vue";

const emit = defineEmits<{
  (e: "begin"): void;
}>();
</script>

<template>
  <div class="pregame-sidebar" role="region" aria-label="Game Preparation">
    <div class="pregame-content">
      <RoughBox
        :stroke="'#786b59'"
        :fill="'#fcfaf6'"
        fill-style="solid"
        :roughness="1.2"
        :bowing="1.1"
        :stroke-width="1.6"
        :seed="712"
        class="pregame-card-box"
      >
        <div class="pregame-card">
          <div class="pregame-header">
            <div class="pregame-badge">
              <Building2 :size="14" class="badge-icon" aria-hidden="true" />
              <span>Setup Phase</span>
            </div>
            <h2 class="pregame-title">Neighborhood Setup</h2>
          </div>

          <p class="pregame-instruction">
            Finish moving and customizing buildings, then hit "Begin"
          </p>

          <div class="pregame-tips">
            <div class="tip-item">
              <Move :size="15" class="tip-icon" aria-hidden="true" />
              <span>Drag buildings or the landlord to position them on the map.</span>
            </div>
            <div class="tip-item">
              <Pencil :size="15" class="tip-icon" aria-hidden="true" />
              <span>Click the pencil icon on any building to adjust tenant count and roles.</span>
            </div>
          </div>

          <div class="pregame-actions">
            <div class="btn-begin-wrapper">
              <RoughButton
                variant="success"
                :seed="715"
                :stroke-width="1.8"
                class="btn-begin"
                title="Begin game"
                aria-label="Begin game"
                @click="emit('begin')"
              >
                <span class="btn-text">Begin</span>
                <ArrowRight :size="16" :stroke-width="2.2" class="btn-arrow" aria-hidden="true" />
              </RoughButton>
            </div>
          </div>
        </div>
      </RoughBox>
    </div>
  </div>
</template>

<style scoped>
.pregame-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  font-family: inherit;
  color: #29241e;
  overflow-y: auto;
  box-sizing: border-box;
  padding: 16px;
  background-color: #faf6ee;
}

.pregame-content {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.pregame-card-box {
  width: 100%;
}

.pregame-card {
  padding: 20px 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-sizing: border-box;
}

.pregame-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pregame-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  background-color: #ede2cf;
  border: 1px solid #786b59;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #574c3d;
  width: fit-content;
}

.pregame-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #27272a;
}

.pregame-instruction {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1.45;
  color: #18181b;
}

.pregame-tips {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  background-color: #f5ede0;
  border-radius: 6px;
  border: 1px dashed #ded4c3;
}

.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.85rem;
  line-height: 1.35;
  color: #574c3d;
}

.tip-icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: #786b59;
}

.pregame-actions {
  display: flex;
  flex-direction: column;
  margin-top: 4px;
}

.btn-begin-wrapper {
  display: flex;
  width: 100%;
  transform-origin: center center;
  animation: jiggle 2.2s ease-in-out infinite;
}

.btn-begin-wrapper:hover {
  animation-play-state: paused;
}

@keyframes jiggle {
  0%,
  45%,
  100% {
    transform: rotate(0deg) translate3d(0, 0, 0);
  }
  50% {
    transform: rotate(-1.8deg) translate3d(-1px, 0.5px, 0);
  }
  57% {
    transform: rotate(1.8deg) translate3d(1px, -0.5px, 0);
  }
  64% {
    transform: rotate(-1.2deg) translate3d(-0.8px, 0.5px, 0);
  }
  71% {
    transform: rotate(1.2deg) translate3d(0.8px, -0.5px, 0);
  }
  78% {
    transform: rotate(-0.6deg) translate3d(-0.4px, 0, 0);
  }
  85% {
    transform: rotate(0.6deg) translate3d(0.4px, 0, 0);
  }
  92% {
    transform: rotate(0deg) translate3d(0, 0, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .btn-begin-wrapper {
    animation: none;
  }
}
.btn-begin {
  width: 100%;
  display: flex;
  justify-content: center;
}

.btn-begin :deep(.rough-btn-box) {
  width: 100%;
}

.btn-begin :deep(.rough-btn-label) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px 16px;
  font-size: 1.05rem;
  font-weight: 700;
}

.btn-arrow {
  transition: transform 0.15s ease;
}

.btn-begin:hover .btn-arrow {
  transform: translateX(3px);
}
</style>
