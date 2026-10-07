export const PERSON_ASPECT_RATIO = 0.68;
export const BUILDING_GAP_PX = 48;

const RESIDENTIAL_AREA = {
  x: 0.04,
  y: 0.05,
  width: 0.9,
  height: 0.88,
} as const;

const BUILDING_HORIZONTAL_CHROME_PX = 20;
const BUILDING_VERTICAL_CHROME_PX = 72;
const TENANT_GAP_PX = 3;

export interface BuildingGridDimensions {
  cols: number;
  rows: number;
}

export interface BuildingGridMetrics {
  originX: number;
  originY: number;
  cellWidth: number;
  cellHeight: number;
}

/**
 * Chooses a balanced window grid for the tenants inside one building.
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

export function getBuildingGridMetrics(
  cols: number,
  rows: number,
  canvasWidth: number,
  canvasHeight: number,
): BuildingGridMetrics {
  const safeCols = Math.max(1, Math.floor(cols));
  const safeRows = Math.max(1, Math.floor(rows));
  const width = Math.max(1, canvasWidth);
  const height = Math.max(1, canvasHeight);
  const availableWidth = width * RESIDENTIAL_AREA.width;
  const availableHeight = height * RESIDENTIAL_AREA.height;

  return {
    originX: width * RESIDENTIAL_AREA.x,
    originY: height * RESIDENTIAL_AREA.y,
    cellWidth: Math.max(1, (availableWidth - BUILDING_GAP_PX * (safeCols - 1)) / safeCols),
    cellHeight: Math.max(1, (availableHeight - BUILDING_GAP_PX * (safeRows - 1)) / safeRows),
  };
}

/**
 * Returns the largest tenant width that fits a building into one grid cell.
 */
export function getSpatialPersonWidth(
  peoplePerBuilding: number,
  grid: BuildingGridDimensions,
  canvasWidth: number,
  canvasHeight: number,
): number {
  const people = Math.max(1, Math.floor(peoplePerBuilding));
  const tenantCols = getTenantGridCols(people);
  const tenantRows = Math.ceil(people / tenantCols);
  const { cellWidth, cellHeight } = getBuildingGridMetrics(
    grid.cols,
    grid.rows,
    canvasWidth,
    canvasHeight,
  );

  const widthLimit =
    (cellWidth - BUILDING_HORIZONTAL_CHROME_PX - (tenantCols - 1) * TENANT_GAP_PX) / tenantCols;
  const heightLimit =
    ((cellHeight - BUILDING_VERTICAL_CHROME_PX - (tenantRows - 1) * TENANT_GAP_PX) *
      PERSON_ASPECT_RATIO) /
    tenantRows;

  return Math.min(widthLimit, heightLimit);
}

/**
 * Picks the row-major building grid that permits the largest people while
 * accounting for the shape of each building and the current canvas.
 */
export function getBuildingGridDimensions(
  buildingCount: number,
  peoplePerBuilding = 8,
  canvasWidth = 1050,
  canvasHeight = 750,
): BuildingGridDimensions {
  const count = Math.max(1, Math.floor(buildingCount || 1));
  let bestGrid: BuildingGridDimensions = { cols: 1, rows: count };
  let bestFit = Number.NEGATIVE_INFINITY;
  let bestEmptyCells = Number.POSITIVE_INFINITY;

  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const grid = { cols, rows };
    const fit = getSpatialPersonWidth(
      peoplePerBuilding,
      grid,
      Math.max(1, canvasWidth),
      Math.max(1, canvasHeight),
    );
    const emptyCells = cols * rows - count;

    if (fit > bestFit + 0.25 || (Math.abs(fit - bestFit) <= 0.25 && emptyCells < bestEmptyCells)) {
      bestGrid = grid;
      bestFit = fit;
      bestEmptyCells = emptyCells;
    }
  }

  return bestGrid;
}
