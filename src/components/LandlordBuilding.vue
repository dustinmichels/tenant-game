<script setup lang="ts">
import { computed } from "vue";
import { roughGen } from "../utils/rough";
import type { PathInfo } from "../utils/rough";
import RoughBox from "./RoughBox.vue";
import { formatCurrency, formatCompactCurrency } from "../utils/currency";

defineProps<{
  landlordMoney?: number;
}>();
// Hand-drawn rough paths for corporate office building
const roofSpirePaths = computed<PathInfo[]>(() => {
  const paths: PathInfo[] = [];

  // Main corporate roof trim
  const cornice = roughGen.rectangle(4, 7, 172, 6, {
    roughness: 0.5,
    stroke: "#1e293b",
    fill: "#475569",
    fillStyle: "solid",
    strokeWidth: 1.1,
    seed: 801,
  });
  paths.push(...roughGen.toPaths(cornice));

  // Corporate communications antenna / spire
  const spire = roughGen.line(90, 7, 90, 1, {
    roughness: 0.4,
    stroke: "#0f172a",
    strokeWidth: 1.2,
    seed: 802,
  });
  paths.push(...roughGen.toPaths(spire));

  // Spire beacon orb
  const beacon = roughGen.circle(90, 2, 3, {
    roughness: 0.4,
    stroke: "#b91c1c",
    fill: "#ef4444",
    fillStyle: "solid",
    strokeWidth: 0.8,
    seed: 803,
  });
  paths.push(...roughGen.toPaths(beacon));

  return paths;
});

// Hand-drawn executive office window frame
const officeWindowPaths = computed<PathInfo[]>(() => {
  const frame = roughGen.rectangle(2, 2, 68, 66, {
    roughness: 0.5,
    stroke: "#334155",
    fill: "#f0fdf4",
    fillStyle: "solid",
    strokeWidth: 1.0,
    seed: 804,
  });

  const sill = roughGen.line(0, 70, 72, 70, {
    roughness: 0.4,
    stroke: "#1e293b",
    strokeWidth: 1.1,
    seed: 806,
  });

  return [frame, sill].flatMap((d) => roughGen.toPaths(d));
});

// Hand-drawn landlord figure paths (in business suit with red tie)
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

// Corporate entrance
const entrancePaths = computed<PathInfo[]>(() => {
  const door = roughGen.rectangle(8, 2, 32, 20, {
    roughness: 0.5,
    stroke: "#1e293b",
    fill: "#cbd5e1",
    fillStyle: "solid",
    strokeWidth: 1.0,
    seed: 821,
  });
  return roughGen.toPaths(door);
});
</script>

<template>
  <div class="landlord-office-wrapper" title="Landlord, Inc. Corporate Headquarters">
    <RoughBox
      :stroke="'#1e293b'"
      :fill="'#f1f5f9'"
      fill-style="solid"
      :roughness="0.7"
      :bowing="0.4"
      :stroke-width="1.3"
      :seed="800"
      class="office-rough-box"
    >
      <div class="office-inner">
        <!-- Corporate Roof with Antenna -->
        <div class="roof-area">
          <svg viewBox="0 0 180 16" class="roof-svg" preserveAspectRatio="none" aria-hidden="true">
            <path
              v-for="(p, idx) in roofSpirePaths"
              :key="idx"
              :d="p.d"
              :stroke="p.stroke"
              :stroke-width="p.strokeWidth"
              :fill="p.fill"
            />
          </svg>
        </div>

        <!-- Corporate Signboard Plaque -->
        <div class="header-plaque-area">
          <RoughBox
            :stroke="'#0f172a'"
            :fill="'#1e293b'"
            fill-style="solid"
            :roughness="0.5"
            :stroke-width="1.0"
            :seed="808"
            class="plaque-box"
          >
            <div class="plaque-content">
              <span class="corp-icon">🏢</span>
              <span class="corp-title">Landlord, Inc.</span>
            </div>
          </RoughBox>
        </div>

        <!-- Corner Executive Office -->
        <div class="executive-suite">
          <div class="office-window">
            <svg viewBox="0 0 72 74" class="window-frame-svg" aria-hidden="true">
              <path
                v-for="(p, idx) in officeWindowPaths"
                :key="idx"
                :d="p.d"
                :stroke="p.stroke"
                :stroke-width="p.strokeWidth"
                :fill="p.fill"
              />
            </svg>

            <div class="landlord-figure-container" title="The Landlord • Executive Office">
              <svg viewBox="0 0 56 64" class="landlord-svg" role="img" aria-label="The Landlord">
                <path
                  v-for="(p, idx) in landlordFigurePaths"
                  :key="idx"
                  :d="p.d"
                  :stroke="p.stroke"
                  :stroke-width="p.strokeWidth"
                  :fill="p.fill"
                />
              </svg>
            </div>
          </div>
          <span
            v-if="landlordMoney !== undefined"
            class="landlord-building-funds"
            :title="`Landlord Funds: ${formatCurrency(landlordMoney)}`"
          >
            💰 {{ formatCompactCurrency(landlordMoney) }}
          </span>
        </div>

        <!-- Ground Floor Entrance -->
        <div class="ground-area">
          <svg viewBox="0 0 48 24" class="entrance-svg" aria-hidden="true">
            <path
              v-for="(p, idx) in entrancePaths"
              :key="idx"
              :d="p.d"
              :stroke="p.stroke"
              :stroke-width="p.strokeWidth"
              :fill="p.fill"
            />
          </svg>
        </div>
      </div>
    </RoughBox>
  </div>
</template>

<style scoped>
.landlord-office-wrapper {
  width: 138px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease;
  user-select: none;
}

.landlord-office-wrapper:hover {
  transform: translateY(-2px);
}

.office-rough-box {
  width: 100%;
  height: 100%;
}

.office-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding-bottom: 2px;
}

.roof-area {
  width: 100%;
  height: 16px;
}

.roof-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.header-plaque-area {
  width: 90%;
  padding: 2px 0 4px;
}

.plaque-box {
  width: 100%;
}

.plaque-content {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px 4px;
  gap: 4px;
}

.corp-icon {
  font-size: 10px;
}

.corp-title {
  font-family: inherit;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #f8fafc;
  text-transform: uppercase;
  white-space: nowrap;
}

.executive-suite {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 4px 0;
}

.office-window {
  position: relative;
  width: 64px;
  height: 68px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 4px;
}

.window-frame-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.landlord-figure-container {
  position: relative;
  z-index: 2;
  width: 44px;
  height: 50px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  transition: transform 0.2s ease;
}

.landlord-figure-container:hover {
  transform: scale(1.08);
}

.landlord-svg {
  width: 100%;
  height: 100%;
  display: block;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.18));
}

.landlord-building-funds {
  font-size: 10px;
  font-weight: 800;
  color: #78350f;
  background: #fef3c7;
  border: 1px solid #fde68a;
  padding: 1px 6px;
  border-radius: 4px;
  margin-top: 2px;
  font-variant-numeric: tabular-nums;
}

.ground-area {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  height: 24px;
  width: 100%;
}

.entrance-svg {
  width: 48px;
  height: 24px;
  display: block;
}
</style>
