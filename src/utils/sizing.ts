import type { DynamicSizingResult } from "../types/game";

/**
 * Baseline person width for 32 players (default game).
 */
export const BASELINE_PERSON_WIDTH = 50;

/**
 * Calculates optimal grid columns for a building with `tenantCount` tenants.
 * Prioritizes balanced, rectangular building proportions.
 */
export function getTenantGridCols(tenantCount: number): number {
  const count = Math.max(1, Math.floor(tenantCount));
  if (count <= 1) return 1;
  if (count <= 3) return count;
  if (count === 4) return 2;
  if (count <= 6) return 3;
  if (count <= 8) return 4;
  if (count === 9) return 3;
  if (count <= 16) return 4;
  if (count <= 25) return 5;
  return 6;
}

/**
 * Dynamically computes the optimal person and building size based on total number of players
 * and building count to fill the available canvas space fairly well on a standard laptop.
 */
export function calculateOptimalPersonSize(
  buildingCount: number,
  peoplePerBuilding: number,
  canvasWidth = 1050,
  canvasHeight = 750,
): DynamicSizingResult {
  const bCount = Math.max(1, Math.floor(buildingCount || 1));
  const pCount = Math.max(1, Math.floor(peoplePerBuilding || 1));
  const totalPlayers = bCount * pCount;

  // Layout arrangement on canvas:
  // How many building columns and rows share the screen?
  const bColsOnCanvas =
    bCount === 1
      ? 1
      : bCount === 2
        ? 2
        : bCount <= 4
          ? 2
          : bCount <= 8
            ? 3
            : bCount <= 11
              ? 4
              : Math.min(5, Math.ceil(bCount / 3));

  const bRowsOnCanvas =
    bCount <= 2 ? 1 : bCount <= 6 ? 2 : bCount <= 11 ? 3 : Math.max(3, Math.ceil(bCount / 4));

  // Within each building: tenant window columns and rows
  const tCols = getTenantGridCols(pCount);
  const tRows = Math.ceil(pCount / tCols);

  // Usable canvas space budget (leaving breathing room for margins, landlord office, threads)
  const usableWidth = canvasWidth * 0.76;
  const usableHeight = canvasHeight * 0.72;

  // Max person width allowed by horizontal canvas space
  // Building width = tCols * w + (tCols - 1) * gap (3px) + padding/border (24px)
  const widthPerBuilding = usableWidth / bColsOnCanvas;
  const maxWidthFromCanvas = Math.max(18, (widthPerBuilding - 24 - (tCols - 1) * 3) / tCols);

  // Max person width allowed by vertical canvas space
  // Building height = tRows * (w / 0.68) + (tRows - 1) * gap (3px) + roof/header/door (80px)
  const heightPerBuilding = usableHeight / bRowsOnCanvas;
  const maxHeightFromCanvas = Math.max(
    18,
    (heightPerBuilding - 80 - (tRows - 1) * 3) / (tRows * (1 / 0.68)),
  );

  // Target width from total player count:
  // Smooth curve: 70px at 4 players down to 22px at 128+ players
  let targetWidth: number;
  if (totalPlayers <= 4) {
    targetWidth = 70;
  } else if (totalPlayers <= 8) {
    targetWidth = Math.round(70 - ((totalPlayers - 4) / 4) * 8);
  } else if (totalPlayers <= 16) {
    targetWidth = Math.round(62 - ((totalPlayers - 8) / 8) * 6);
  } else if (totalPlayers <= 32) {
    targetWidth = Math.round(56 - ((totalPlayers - 16) / 16) * 6);
  } else if (totalPlayers <= 48) {
    targetWidth = Math.round(50 - ((totalPlayers - 32) / 16) * 8);
  } else if (totalPlayers <= 64) {
    targetWidth = Math.round(42 - ((totalPlayers - 48) / 16) * 6);
  } else if (totalPlayers <= 96) {
    targetWidth = Math.round(36 - ((totalPlayers - 64) / 32) * 8);
  } else if (totalPlayers <= 128) {
    targetWidth = Math.round(28 - ((totalPlayers - 96) / 32) * 4);
  } else {
    targetWidth = Math.round(24 - Math.min(2, ((totalPlayers - 128) / 64) * 2));
  }

  // Combine target with canvas spatial fit constraint
  const spaceConstraint = Math.min(maxWidthFromCanvas, maxHeightFromCanvas);
  const rawWidth = Math.min(targetWidth, spaceConstraint);

  // Clamp within ergonomic bounds (minimum 22px so characters are discernible, max 70px)
  const personWidth = Math.max(22, Math.min(70, Math.round(rawWidth)));
  const personHeight = Math.round(personWidth / 0.68);
  const personScale = Math.round((personWidth / BASELINE_PERSON_WIDTH) * 100) / 100;

  return {
    personWidth,
    personHeight,
    personScale,
  };
}
