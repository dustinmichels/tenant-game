import type { DynamicSizingResult } from "../types/game";
import { getBuildingGridDimensions } from "./positions";

/**
 * Baseline person width for 32 players (default game).
 */
export const BASELINE_PERSON_WIDTH = 75;

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
  const { cols: bColsOnCanvas, rows: bRowsOnCanvas } = getBuildingGridDimensions(bCount);

  // Within each building: tenant window columns and rows
  const tCols = getTenantGridCols(pCount);
  const tRows = Math.ceil(pCount / tCols);

  // Usable canvas space budget
  const usableWidth = canvasWidth * 0.86;
  const usableHeight = canvasHeight * 0.86;

  // Max person width allowed by horizontal canvas space
  const widthPerBuilding = usableWidth / bColsOnCanvas;
  const maxWidthFromCanvas = Math.max(22, (widthPerBuilding - 20 - (tCols - 1) * 3) / tCols);

  // Max person width allowed by vertical canvas space
  const heightPerBuilding = usableHeight / bRowsOnCanvas;
  const maxHeightFromCanvas = Math.max(
    22,
    (heightPerBuilding - 54 - (tRows - 1) * 3) / (tRows * (1 / 0.68)),
  );

  // Target width from total player count:
  // Defaults to 75px at 32 players
  let targetWidth: number;
  if (totalPlayers <= 4) {
    targetWidth = 96;
  } else if (totalPlayers <= 8) {
    targetWidth = Math.round(96 - ((totalPlayers - 4) / 4) * 8);
  } else if (totalPlayers <= 16) {
    targetWidth = Math.round(88 - ((totalPlayers - 8) / 8) * 6);
  } else if (totalPlayers <= 32) {
    targetWidth = Math.round(82 - ((totalPlayers - 16) / 16) * 7);
  } else if (totalPlayers <= 48) {
    targetWidth = Math.round(75 - ((totalPlayers - 32) / 16) * 11);
  } else if (totalPlayers <= 64) {
    targetWidth = Math.round(64 - ((totalPlayers - 48) / 16) * 10);
  } else if (totalPlayers <= 96) {
    targetWidth = Math.round(54 - ((totalPlayers - 64) / 32) * 10);
  } else if (totalPlayers <= 128) {
    targetWidth = Math.round(44 - ((totalPlayers - 96) / 32) * 8);
  } else {
    targetWidth = Math.round(36 - Math.min(6, ((totalPlayers - 128) / 64) * 6));
  }

  // Combine target with canvas spatial fit constraint
  const spaceConstraint = Math.min(maxWidthFromCanvas, maxHeightFromCanvas);
  const rawWidth = Math.min(targetWidth, spaceConstraint);

  // Clamp within ergonomic bounds (minimum 26px, max 100px)
  const personWidth = Math.max(26, Math.min(100, Math.round(rawWidth)));
  const personHeight = Math.round(personWidth / 0.68);
  const personScale = Math.round((personWidth / BASELINE_PERSON_WIDTH) * 100) / 100;

  return {
    personWidth,
    personHeight,
    personScale,
  };
}
