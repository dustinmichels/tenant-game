import type { DynamicSizingResult } from "../types/game";
import { getBuildingGridDimensions, getSpatialPersonWidth, PERSON_ASPECT_RATIO } from "./layout";

/**
 * Baseline person width for the default 32-player game.
 */
export const BASELINE_PERSON_WIDTH = 75;

const MIN_PERSON_WIDTH = 26;
const MAX_PERSON_WIDTH = 80;

/**
 * Computes the largest comfortable person size that fits the selected building
 * grid. The upper bound keeps very sparse games from producing oversized cards.
 */
export function calculateOptimalPersonSize(
  buildingCount: number,
  peoplePerBuilding: number,
  canvasWidth = 1050,
  canvasHeight = 750,
): DynamicSizingResult {
  const buildings = Math.max(1, Math.floor(buildingCount || 1));
  const people = Math.max(1, Math.floor(peoplePerBuilding || 1));
  const width = Math.max(1, canvasWidth);
  const height = Math.max(1, canvasHeight);
  const grid = getBuildingGridDimensions(buildings, people, width, height);
  const spatialLimit = getSpatialPersonWidth(people, grid, width, height);
  const personWidth = Math.max(
    MIN_PERSON_WIDTH,
    Math.min(MAX_PERSON_WIDTH, Math.round(spatialLimit)),
  );
  const personHeight = Math.round(personWidth / PERSON_ASPECT_RATIO);
  const personScale = Math.round((personWidth / BASELINE_PERSON_WIDTH) * 100) / 100;

  return {
    personWidth,
    personHeight,
    personScale,
  };
}
