<script setup lang="ts">
import { computed } from "vue";
import { roughGen } from "../utils/rough";
import type { PathInfo } from "../utils/rough";
import RoughBox from "./RoughBox.vue";
import { formatCurrency, formatCompactCurrency } from "../utils/currency";
import { GripVertical, Building2, Coins } from "lucide-vue-next";

const props = withDefaults(
  defineProps<{
    landlordMoney?: number;
    canMove?: boolean;
  }>(),
  {
    landlordMoney: 0,
    canMove: true,
  },
);

const emit = defineEmits<{
  (e: "pointerdown-drag", event: PointerEvent): void;
}>();

function handleDragPointerDown(e: PointerEvent) {
  if (!props.canMove) return;
  if (e.button !== 0) return;
  emit("pointerdown-drag", e);
}

// 1. Skyscraper Architectural Crown & Communications Mast
const roofCrownPaths = computed<PathInfo[]>(() => {
  const paths: PathInfo[] = [];

  // Stepped corporate crown cornice
  // Main stepped corporate crown parapet
  const parapet = roughGen.rectangle(6, 12, 128, 9, {
    roughness: 0.45,
    stroke: "#1e293b",
    fill: "#0284c7",
    fillStyle: "solid",
    strokeWidth: 1.1,
    seed: 801,
  });
  paths.push(...roughGen.toPaths(parapet));

  // Angled glass crown facet trims
  const leftFacet = roughGen.line(10, 12, 26, 6, {
    roughness: 0.4,
    stroke: "#38bdf8",
    strokeWidth: 1.2,
    seed: 802,
  });
  const rightFacet = roughGen.line(130, 12, 114, 6, {
    roughness: 0.4,
    stroke: "#38bdf8",
    strokeWidth: 1.2,
    seed: 803,
  });
  const centerCrownTrim = roughGen.line(26, 6, 114, 6, {
    roughness: 0.35,
    stroke: "#0f172a",
    strokeWidth: 1.1,
    seed: 804,
  });
  paths.push(
    ...roughGen.toPaths(leftFacet),
    ...roughGen.toPaths(rightFacet),
    ...roughGen.toPaths(centerCrownTrim),
  );

  // Left communications mast & beacon
  const leftMast = roughGen.line(18, 12, 18, 2, {
    roughness: 0.3,
    stroke: "#0f172a",
    strokeWidth: 1.4,
    seed: 805,
  });
  const leftCross = roughGen.line(14, 6, 22, 6, {
    roughness: 0.25,
    stroke: "#334155",
    strokeWidth: 1.0,
    seed: 806,
  });
  const leftBeacon = roughGen.circle(18, 2.5, 3.2, {
    roughness: 0.25,
    stroke: "#991b1b",
    fill: "#ef4444",
    fillStyle: "solid",
    strokeWidth: 0.8,
    seed: 807,
  });
  paths.push(
    ...roughGen.toPaths(leftMast),
    ...roughGen.toPaths(leftCross),
    ...roughGen.toPaths(leftBeacon),
  );

  // Right communications mast & beacon
  const rightMast = roughGen.line(122, 12, 122, 2, {
    roughness: 0.3,
    stroke: "#0f172a",
    strokeWidth: 1.4,
    seed: 808,
  });
  const rightCross = roughGen.line(118, 6, 126, 6, {
    roughness: 0.25,
    stroke: "#334155",
    strokeWidth: 1.0,
    seed: 809,
  });
  const rightBeacon = roughGen.circle(122, 2.5, 3.2, {
    roughness: 0.25,
    stroke: "#991b1b",
    fill: "#ef4444",
    fillStyle: "solid",
    strokeWidth: 0.8,
    seed: 810,
  });
  paths.push(
    ...roughGen.toPaths(rightMast),
    ...roughGen.toPaths(rightCross),
    ...roughGen.toPaths(rightBeacon),
  );

  return paths;
});

// 2. Penthouse Panoramic Glass Window Frame
const penthouseWindowPaths = computed<PathInfo[]>(() => {
  const paths: PathInfo[] = [];

  // Panoramic outer window frame
  const outerFrame = roughGen.rectangle(2, 2, 76, 54, {
    roughness: 0.5,
    stroke: "#0f172a",
    fill: "#f0f9ff",
    fillStyle: "solid",
    strokeWidth: 1.1,
    seed: 810,
  });
  paths.push(...roughGen.toPaths(outerFrame));

  // Vertical structural mullions
  const leftMullion = roughGen.line(26, 2, 26, 56, {
    roughness: 0.4,
    stroke: "#0369a1",
    strokeWidth: 1.0,
    seed: 811,
  });
  const rightMullion = roughGen.line(54, 2, 54, 56, {
    roughness: 0.4,
    stroke: "#0369a1",
    strokeWidth: 1.0,
    seed: 812,
  });
  // Top transom bar
  const transom = roughGen.line(2, 13, 78, 13, {
    roughness: 0.4,
    stroke: "#0369a1",
    strokeWidth: 0.9,
    seed: 813,
  });
  // Heavy floor sill
  const sill = roughGen.line(0, 56, 80, 56, {
    roughness: 0.4,
    stroke: "#0f172a",
    strokeWidth: 1.3,
    seed: 814,
  });
  // Diagonal glass reflection streak
  const glint = roughGen.line(10, 50, 42, 6, {
    roughness: 0.45,
    stroke: "#38bdf8",
    strokeWidth: 1.2,
    seed: 815,
  });

  paths.push(
    ...roughGen.toPaths(leftMullion),
    ...roughGen.toPaths(rightMullion),
    ...roughGen.toPaths(transom),
    ...roughGen.toPaths(sill),
    ...roughGen.toPaths(glint),
  );

  return paths;
});

// 3. Multi-Floor Glass Curtain Wall Facade
const curtainWallPaths = computed<PathInfo[]>(() => {
  const paths: PathInfo[] = [];

  // Outer curtain wall framing
  const wallBox = roughGen.rectangle(1, 1, 126, 64, {
    roughness: 0.45,
    stroke: "#0f172a",
    fill: "#0f172a",
    fillStyle: "solid",
    strokeWidth: 1.2,
    seed: 820,
  });
  paths.push(...roughGen.toPaths(wallBox));

  // 3 floors x 4 columns of tinted glass panels
  const glassColors = [
    ["#0ea5e9", "#38bdf8", "#0284c7", "#0369a1"],
    ["#0284c7", "#7dd3fc", "#0ea5e9", "#38bdf8"],
    ["#0369a1", "#0ea5e9", "#38bdf8", "#0284c7"],
  ];

  const colX = [3, 34, 65, 96];
  const rowY = [3, 24, 45];
  const paneW = 28;
  const paneH = 17;

  let paneSeed = 830;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const fill = glassColors[r]![c]!;
      const pane = roughGen.rectangle(colX[c]!, rowY[r]!, paneW, paneH, {
        roughness: 0.4,
        stroke: "#0369a1",
        fill,
        fillStyle: "solid",
        strokeWidth: 0.7,
        seed: paneSeed++,
      });
      paths.push(...roughGen.toPaths(pane));
    }
  }

  // Horizontal floor spandrel beams
  const spandrel1 = roughGen.line(2, 22, 126, 22, {
    roughness: 0.35,
    stroke: "#0f172a",
    strokeWidth: 1.2,
    seed: 860,
  });
  const spandrel2 = roughGen.line(2, 43, 126, 43, {
    roughness: 0.35,
    stroke: "#0f172a",
    strokeWidth: 1.2,
    seed: 861,
  });

  // Vertical structural mullion lines
  const mullion1 = roughGen.line(33, 2, 33, 64, {
    roughness: 0.35,
    stroke: "#0f172a",
    strokeWidth: 1.1,
    seed: 862,
  });
  const mullion2 = roughGen.line(64, 2, 64, 64, {
    roughness: 0.35,
    stroke: "#0f172a",
    strokeWidth: 1.1,
    seed: 863,
  });
  const mullion3 = roughGen.line(95, 2, 95, 64, {
    roughness: 0.35,
    stroke: "#0f172a",
    strokeWidth: 1.1,
    seed: 864,
  });

  // Dramatic diagonal architectural reflection streaks across the facade
  const glint1 = roughGen.line(8, 60, 52, 4, {
    roughness: 0.4,
    stroke: "#ffffff",
    strokeWidth: 1.6,
    seed: 870,
  });
  const glint2 = roughGen.line(44, 62, 90, 6, {
    roughness: 0.4,
    stroke: "#bae6fd",
    strokeWidth: 1.4,
    seed: 871,
  });
  const glint3 = roughGen.line(82, 60, 122, 8, {
    roughness: 0.4,
    stroke: "#ffffff",
    strokeWidth: 1.5,
    seed: 872,
  });

  paths.push(
    ...roughGen.toPaths(spandrel1),
    ...roughGen.toPaths(spandrel2),
    ...roughGen.toPaths(mullion1),
    ...roughGen.toPaths(mullion2),
    ...roughGen.toPaths(mullion3),
    ...roughGen.toPaths(glint1),
    ...roughGen.toPaths(glint2),
    ...roughGen.toPaths(glint3),
  );

  return paths;
});

// 4. Ground-Floor Grand Glass Lobby & Revolving Door
const entranceLobbyPaths = computed<PathInfo[]>(() => {
  const paths: PathInfo[] = [];

  // Lobby structural frame
  const lobbyFrame = roughGen.rectangle(3, 3, 122, 21, {
    roughness: 0.45,
    stroke: "#0f172a",
    fill: "#0c4a6e",
    fillStyle: "solid",
    strokeWidth: 1.1,
    seed: 880,
  });
  paths.push(...roughGen.toPaths(lobbyFrame));

  // Glass entrance canopy
  const canopy = roughGen.line(8, 2, 120, 2, {
    roughness: 0.3,
    stroke: "#38bdf8",
    strokeWidth: 1.8,
    seed: 881,
  });
  paths.push(...roughGen.toPaths(canopy));

  // Left glass wall panel
  const leftGlass = roughGen.rectangle(6, 4, 38, 18, {
    roughness: 0.4,
    stroke: "#0284c7",
    fill: "#0369a1",
    fillStyle: "solid",
    strokeWidth: 0.8,
    seed: 882,
  });
  // Right glass wall panel
  const rightGlass = roughGen.rectangle(84, 4, 38, 18, {
    roughness: 0.4,
    stroke: "#0284c7",
    fill: "#0369a1",
    fillStyle: "solid",
    strokeWidth: 0.8,
    seed: 883,
  });

  // Central revolving door cylinder
  const drum = roughGen.circle(64, 13, 17, {
    roughness: 0.4,
    stroke: "#0f172a",
    fill: "#e0f2fe",
    fillStyle: "solid",
    strokeWidth: 1.0,
    seed: 884,
  });
  // Revolving door wings
  const vWing = roughGen.line(64, 5, 64, 21, {
    roughness: 0.3,
    stroke: "#0369a1",
    strokeWidth: 1.2,
    seed: 885,
  });
  const hWing = roughGen.line(56, 13, 72, 13, {
    roughness: 0.3,
    stroke: "#0369a1",
    strokeWidth: 1.2,
    seed: 886,
  });

  paths.push(
    ...roughGen.toPaths(leftGlass),
    ...roughGen.toPaths(rightGlass),
    ...roughGen.toPaths(drum),
    ...roughGen.toPaths(vWing),
    ...roughGen.toPaths(hWing),
  );

  return paths;
});

// 5. Landlord Figure (in suit with red tie) inside Penthouse
const landlordFigurePaths = computed<PathInfo[]>(() => {
  const paths: PathInfo[] = [];

  // Head
  const head = roughGen.circle(28, 14, 16, {
    roughness: 0.7,
    stroke: "#18181b",
    fill: "#3f3f46",
    fillStyle: "solid",
    seed: 810,
  });
  paths.push(...roughGen.toPaths(head));

  // Top hat or slick hair trim
  const hatBrim = roughGen.line(16, 10, 40, 10, {
    roughness: 0.6,
    stroke: "#09090b",
    strokeWidth: 2.2,
    seed: 811,
  });
  const hatTop = roughGen.rectangle(20, 2, 16, 8, {
    roughness: 0.6,
    stroke: "#09090b",
    fill: "#18181b",
    fillStyle: "solid",
    strokeWidth: 1.2,
    seed: 812,
  });
  paths.push(...roughGen.toPaths(hatBrim), ...roughGen.toPaths(hatTop));

  // Torso / Dark corporate suit jacket
  const suit = roughGen.polygon(
    [
      [14, 25],
      [42, 25],
      [44, 52],
      [12, 52],
    ],
    {
      roughness: 0.8,
      stroke: "#09090b",
      fill: "#18181b",
      fillStyle: "solid",
      strokeWidth: 1.3,
      seed: 813,
    },
  );
  paths.push(...roughGen.toPaths(suit));

  // White shirt collar
  const shirt = roughGen.polygon(
    [
      [24, 25],
      [32, 25],
      [28, 33],
    ],
    {
      roughness: 0.5,
      stroke: "#e2e8f0",
      fill: "#ffffff",
      fillStyle: "solid",
      strokeWidth: 0.8,
      seed: 814,
    },
  );
  paths.push(...roughGen.toPaths(shirt));

  // Red power tie
  const tie = roughGen.polygon(
    [
      [27, 28],
      [29, 28],
      [30, 42],
      [28, 45],
      [26, 42],
    ],
    {
      roughness: 0.5,
      stroke: "#7f1d1d",
      fill: "#dc2626",
      fillStyle: "solid",
      strokeWidth: 1.0,
      seed: 815,
    },
  );
  paths.push(...roughGen.toPaths(tie));

  // Left arm holding gold contract / briefcase
  const briefcase = roughGen.rectangle(38, 38, 12, 10, {
    roughness: 0.6,
    stroke: "#78350f",
    fill: "#b45309",
    fillStyle: "solid",
    strokeWidth: 1.0,
    seed: 816,
  });
  paths.push(...roughGen.toPaths(briefcase));

  return paths;
});
</script>

<template>
  <div
    class="landlord-office-wrapper glass-skyscraper-card"
    title="Landlord, Inc. Corporate Headquarters"
  >
    <!-- Reposition handle (identical to residential buildings) -->
    <button
      v-if="canMove"
      type="button"
      class="building-drag-handle"
      title="Drag to move Landlord, Inc."
      aria-label="Drag to move Landlord, Inc."
      @pointerdown.stop.prevent="handleDragPointerDown"
    >
      <GripVertical :size="14" :stroke-width="1.5" class="drag-icon" aria-hidden="true" />
      <span class="drag-label">Move</span>
    </button>

    <RoughBox
      :stroke="'#0369a1'"
      :fill="'#f0f9ff'"
      fill-style="solid"
      :roughness="0.6"
      :bowing="0.3"
      :stroke-width="1.6"
      :seed="800"
      class="office-rough-box skyscraper-box"
    >
      <div class="office-inner">
        <!-- 1. Skyscraper Architectural Crown with Mast & Warning Beacon -->
        <div
          class="roof-area skyscraper-crown-area"
          :class="{ 'is-draggable': canMove }"
          :title="canMove ? 'Drag to move building' : undefined"
          @pointerdown="handleDragPointerDown"
        >
          <svg viewBox="0 0 140 22" class="crown-svg" preserveAspectRatio="none" aria-hidden="true">
            <path
              v-for="(p, idx) in roofCrownPaths"
              :key="idx"
              :d="p.d"
              :stroke="p.stroke"
              :stroke-width="p.strokeWidth"
              :fill="p.fill || 'none'"
            />
          </svg>
          <div class="beacon-glow beacon-left" aria-hidden="true" />
          <div class="beacon-glow beacon-right" aria-hidden="true" />
        </div>

        <!-- 2. Corporate Plaque / Signboard -->
        <div class="header-plaque-area">
          <RoughBox
            :stroke="'#0284c7'"
            :fill="'#0f172a'"
            fill-style="solid"
            :roughness="0.5"
            :stroke-width="1.1"
            :seed="808"
            class="plaque-box"
          >
            <div class="plaque-content">
              <Building2 :size="15" :stroke-width="1.5" class="corp-icon" aria-hidden="true" />
              <span class="corp-title">Landlord, Inc.</span>
            </div>
          </RoughBox>
        </div>

        <!-- 3. Penthouse Suite: Panoramic Executive Corner Office -->
        <div class="executive-suite penthouse-suite">
          <div class="office-window penthouse-window">
            <svg viewBox="0 0 80 58" class="window-frame-svg" aria-hidden="true">
              <path
                v-for="(p, idx) in penthouseWindowPaths"
                :key="idx"
                :d="p.d"
                :stroke="p.stroke"
                :stroke-width="p.strokeWidth"
                :fill="p.fill || 'none'"
              />
            </svg>

            <!-- Warm interior ambient light inside executive office -->
            <div class="penthouse-interior-glow" aria-hidden="true" />

            <div
              class="landlord-figure-container"
              title="The Landlord • Executive Penthouse Office"
            >
              <svg viewBox="0 0 56 64" class="landlord-svg" role="img" aria-label="The Landlord">
                <path
                  v-for="(p, idx) in landlordFigurePaths"
                  :key="idx"
                  :d="p.d"
                  :stroke="p.stroke"
                  :stroke-width="p.strokeWidth"
                  :fill="p.fill || 'none'"
                />
              </svg>
            </div>
          </div>

          <!-- Digital Executive Funds Ticker -->
          <span
            v-if="landlordMoney !== undefined"
            class="landlord-building-funds"
            :title="`Landlord Funds: ${formatCurrency(landlordMoney)}`"
          >
            <Coins :size="13" :stroke-width="1.5" class="funds-icon" aria-hidden="true" />
            <span class="funds-amount">{{ formatCompactCurrency(landlordMoney) }}</span>
          </span>
        </div>

        <!-- 4. Glass Curtain Wall Tower Facade -->
        <div
          class="curtain-wall-area"
          :class="{ 'is-draggable': canMove }"
          :title="canMove ? 'Drag to move building' : undefined"
          @pointerdown="handleDragPointerDown"
        >
          <svg
            viewBox="0 0 128 66"
            class="curtain-wall-svg"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              v-for="(p, idx) in curtainWallPaths"
              :key="idx"
              :d="p.d"
              :stroke="p.stroke"
              :stroke-width="p.strokeWidth"
              :fill="p.fill || 'none'"
            />
          </svg>
          <!-- Specular glass reflection sheen -->
          <div class="glass-reflection-streak" aria-hidden="true" />
        </div>

        <!-- 5. Grand Glass Entrance Lobby & Revolving Door -->
        <div
          class="ground-area lobby-area"
          :class="{ 'is-draggable': canMove }"
          :title="canMove ? 'Drag to move building' : undefined"
          @pointerdown="handleDragPointerDown"
        >
          <svg viewBox="0 0 128 26" class="lobby-svg" preserveAspectRatio="none" aria-hidden="true">
            <path
              v-for="(p, idx) in entranceLobbyPaths"
              :key="idx"
              :d="p.d"
              :stroke="p.stroke"
              :stroke-width="p.strokeWidth"
              :fill="p.fill || 'none'"
            />
          </svg>
        </div>
      </div>
    </RoughBox>
  </div>
</template>

<style scoped>
.landlord-office-wrapper {
  position: relative;
  width: 142px;
  padding-top: 14px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  user-select: none;
  touch-action: none;
  filter: drop-shadow(0 4px 12px rgba(15, 23, 42, 0.16));
  transition:
    transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1),
    filter 0.2s ease;
}

.landlord-office-wrapper:hover {
  transform: translateY(-2px);
  filter: drop-shadow(0 6px 16px rgba(2, 132, 199, 0.28));
}

/* Drag indicator handle on top of skyscraper */
.building-drag-handle {
  position: absolute;
  top: 0px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 25;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 2.5px 10px 2.5px 8px;
  background-color: #f0f9ff;
  border: 1.5px solid #0369a1;
  border-radius: 14px;
  color: #075985;
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: grab;
  user-select: none;
  touch-action: none;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.14);
  transition:
    transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1),
    background-color 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.skyscraper-box {
  width: 100%;
  height: 100%;
}

.office-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding-bottom: 3px;
  background: linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 30%, #bae6fd 100%);
  border-radius: 4px;
  overflow: hidden;
}

/* 1. Crown Area */
.skyscraper-crown-area {
  position: relative;
  width: 100%;
  height: 22px;
  cursor: default;
}

.skyscraper-crown-area.is-draggable {
  cursor: grab;
}

.skyscraper-crown-area.is-draggable:active {
  cursor: grabbing;
}

.crown-svg {
  width: 100%;
  height: 100%;
  display: block;
}

/* Pulsing aircraft warning beacon on the mast peak */
.beacon-glow {
  position: absolute;
  top: 1px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: #ef4444;
  box-shadow: 0 0 6px #ef4444;
  animation: beacon-blink 2s ease-in-out infinite;
  pointer-events: none;
}

.beacon-left {
  left: 12.5%;
}

.beacon-right {
  left: 86.5%;
}

@keyframes beacon-blink {
  0%,
  100% {
    opacity: 0.4;
    transform: translateX(-50%) scale(0.85);
  }
  50% {
    opacity: 1;
    transform: translateX(-50%) scale(1.25);
    box-shadow:
      0 0 8px #ef4444,
      0 0 14px rgba(239, 68, 68, 0.6);
  }
}

/* 2. Corporate Plaque Signboard */
.header-plaque-area {
  width: 92%;
  padding: 1px 0 3px;
}

.plaque-box {
  width: 100%;
}

.plaque-content {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px 4px;
  gap: 5px;
  background-color: #0f172a;
}

.corp-icon {
  font-size: 11px;
  line-height: 1;
}

.corp-title {
  font-family: inherit;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #f8fafc;
  text-transform: uppercase;
  white-space: nowrap;
}

/* 3. Penthouse Suite */
.penthouse-suite {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 2px 0 4px;
  width: 100%;
}

.penthouse-window {
  position: relative;
  width: 76px;
  height: 58px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 2px;
  overflow: hidden;
  border-radius: 2px;
}

.penthouse-interior-glow {
  position: absolute;
  inset: 2px;
  background: radial-gradient(circle at 50% 40%, #fef3c7 0%, #fde68a 60%, #bae6fd 100%);
  opacity: 0.85;
  pointer-events: none;
}

.window-frame-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.landlord-figure-container {
  position: relative;
  z-index: 2;
  width: 44px;
  height: 48px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  transition: transform 0.2s ease;
}

.landlord-figure-container:hover {
  transform: scale(1.06);
}

.landlord-svg {
  width: 100%;
  height: 100%;
  display: block;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.22));
}

.landlord-building-funds {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 800;
  color: #0369a1;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  box-shadow: 0 1px 3px rgba(3, 105, 161, 0.12);
  padding: 1px 6px;
  border-radius: 10px;
  margin-top: 1px;
  font-variant-numeric: tabular-nums;
}

.funds-icon {
  font-size: 9px;
  line-height: 1;
}

.funds-amount {
  letter-spacing: 0.02em;
}

/* 4. Glass Curtain Wall Tower Facade */
.curtain-wall-area {
  position: relative;
  width: 93%;
  height: 66px;
  margin: 2px 0;
  cursor: default;
  overflow: hidden;
  border-radius: 2px;
}

.curtain-wall-area.is-draggable {
  cursor: grab;
}

.curtain-wall-area.is-draggable:active {
  cursor: grabbing;
}

.curtain-wall-svg {
  width: 100%;
  height: 100%;
  display: block;
}

/* Glass reflection gleam across curtain wall */
.glass-reflection-streak {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    125deg,
    rgba(255, 255, 255, 0.45) 0%,
    rgba(255, 255, 255, 0.02) 36%,
    rgba(255, 255, 255, 0.22) 52%,
    transparent 100%
  );
  pointer-events: none;
}

/* 5. Lobby Area */
.lobby-area {
  width: 93%;
  height: 26px;
  cursor: default;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  margin-top: 2px;
}

.lobby-area.is-draggable {
  cursor: grab;
}

.lobby-area.is-draggable:active {
  cursor: grabbing;
}

.lobby-svg {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
