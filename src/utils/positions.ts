import type { BuildingDimensions, BuildingPositionUpdate } from "../types/game";
import { BUILDING_GAP_PX, getBuildingGridDimensions, getBuildingGridMetrics } from "./layout";

const DEFAULT_BUILDING_DIMENSIONS: BuildingDimensions = {
  w: 26,
  h: 32,
};

const CANVAS_BOUNDS = {
  minX: 2,
  maxX: 84,
  minY: 2,
  maxY: 72,
  landlordMinX: 86,
  landlordMaxY: 0,
};

function checkBuildingOverlap(
  posA: { x: number; y: number },
  posB: { x: number; y: number },
  dimA: BuildingDimensions = DEFAULT_BUILDING_DIMENSIONS,
  dimB: BuildingDimensions = DEFAULT_BUILDING_DIMENSIONS,
  margin = 1.5,
): boolean {
  const overlapX = posB.x < posA.x + dimA.w + margin && posA.x < posB.x + dimB.w + margin;
  const overlapY = posB.y < posA.y + dimA.h + margin && posA.y < posB.y + dimB.h + margin;
  return overlapX && overlapY;
}

function calculateBuildingOverlapArea(
  posA: { x: number; y: number },
  posB: { x: number; y: number },
  dimA: BuildingDimensions = DEFAULT_BUILDING_DIMENSIONS,
  dimB: BuildingDimensions = DEFAULT_BUILDING_DIMENSIONS,
): number {
  const overlapW = Math.max(
    0,
    Math.min(posA.x + dimA.w, posB.x + dimB.w) - Math.max(posA.x, posB.x),
  );
  const overlapH = Math.max(
    0,
    Math.min(posA.y + dimA.h, posB.y + dimB.h) - Math.max(posA.y, posB.y),
  );
  return overlapW * overlapH;
}

export function clampBuildingPosition(
  pos: { x: number; y: number },
  bounds = CANVAS_BOUNDS,
): { x: number; y: number } {
  let cx = Math.max(bounds.minX, Math.min(bounds.maxX, pos.x));
  let cy = Math.max(bounds.minY, Math.min(bounds.maxY, pos.y));

  // If landlord bounds are specified and active, avoid that designated area
  if (
    typeof bounds.landlordMaxY === "number" &&
    bounds.landlordMaxY > 0 &&
    typeof bounds.landlordMinX === "number" &&
    cx >= bounds.landlordMinX &&
    cy <= bounds.landlordMaxY
  ) {
    const distToLeft = cx - (bounds.landlordMinX - 1);
    const distToBottom = bounds.landlordMaxY + 1 - cy;
    if (distToLeft < distToBottom) {
      cx = bounds.landlordMinX - 1;
    } else {
      cy = bounds.landlordMaxY + 1;
    }
  }

  return {
    x: Math.round(cx * 10) / 10,
    y: Math.round(cy * 10) / 10,
  };
}

function repulseBuildingFrom(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number },
  sourceDim: BuildingDimensions = DEFAULT_BUILDING_DIMENSIONS,
  targetDim: BuildingDimensions = DEFAULT_BUILDING_DIMENSIONS,
  bounds = CANVAS_BOUNDS,
  margin = 2.0,
): { x: number; y: number } {
  let dx = targetPos.x - sourcePos.x;
  let dy = targetPos.y - sourcePos.y;

  // If directly on top of each other (dx, dy near 0)
  if (Math.abs(dx) < 0.2 && Math.abs(dy) < 0.2) {
    // Determine natural exit direction based on quadrant relative to canvas center
    const dirX = sourcePos.x >= 45 ? 1 : -1;
    const dirY = sourcePos.y >= 40 ? 1 : -1;
    // If close to landlord office, bias strongly left and down
    if (sourcePos.x >= 60 && sourcePos.y <= 32) {
      dx = -1;
      dy = 1;
    } else {
      dx = dirX;
      dy = dirY;
    }
  }

  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;

  const reqSepX = (ux >= 0 ? sourceDim.w : targetDim.w) + margin;
  const reqSepY = (uy >= 0 ? sourceDim.h : targetDim.h) + margin;

  const distForX = reqSepX / Math.max(Math.abs(ux), 0.001);
  const distForY = reqSepY / Math.max(Math.abs(uy), 0.001);
  const clearDist = Math.min(distForX, distForY) + 1.0;

  const candidateDirs = [
    { x: ux, y: uy },
    { x: -ux, y: uy },
    { x: ux, y: -uy },
    { x: -ux, y: -uy },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: -1, y: 0 },
  ];

  for (const dir of candidateDirs) {
    const candidateX = sourcePos.x + dir.x * clearDist;
    const candidateY = sourcePos.y + dir.y * clearDist;
    const clamped = clampBuildingPosition({ x: candidateX, y: candidateY }, bounds);

    if (!checkBuildingOverlap(sourcePos, clamped, sourceDim, targetDim, margin * 0.5)) {
      return clamped;
    }
  }

  return clampBuildingPosition(
    {
      x: sourcePos.x + ux * clearDist,
      y: sourcePos.y + uy * clearDist,
    },
    bounds,
  );
}

/**
 * Generates deterministic row-major positions across the residential area.
 * Incomplete rows are centered so they use the canvas without forming a rigid,
 * top-left-aligned grid.
 */
export function generateDefaultPositions(
  count: number,
  peoplePerBuilding = 8,
  canvasWidth = 1050,
  canvasHeight = 750,
): Array<{ x: number; y: number }> {
  if (count <= 0) return [];

  const width = Math.max(1, canvasWidth);
  const height = Math.max(1, canvasHeight);
  const { cols, rows } = getBuildingGridDimensions(count, peoplePerBuilding, width, height);
  const { originX, originY, cellWidth, cellHeight } = getBuildingGridMetrics(
    cols,
    rows,
    width,
    height,
  );

  const fullRowWidth = cols * cellWidth + (cols - 1) * BUILDING_GAP_PX;

  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const buildingsInRow = Math.min(cols, count - row * cols);
    const rowWidth = buildingsInRow * cellWidth + (buildingsInRow - 1) * BUILDING_GAP_PX;
    const rowOffset = (fullRowWidth - rowWidth) / 2;

    return clampBuildingPosition({
      x: ((originX + rowOffset + col * (cellWidth + BUILDING_GAP_PX)) / width) * 100,
      y: ((originY + row * (cellHeight + BUILDING_GAP_PX)) / height) * 100,
    });
  });
}

export function resolveBuildingCollisions(
  placedBuildingId: string,
  buildings: Array<{ id: string; x: number; y: number }>,
  dimensionsMap?: Record<string, BuildingDimensions>,
  bounds = CANVAS_BOUNDS,
): BuildingPositionUpdate[] {
  const posMap = new Map<string, { x: number; y: number }>();
  for (const b of buildings) {
    posMap.set(b.id, { x: b.x, y: b.y });
  }

  const placedPos = posMap.get(placedBuildingId);
  if (!placedPos) return [];

  const fixedIds = new Set<string>([placedBuildingId]);
  let anyChanged = false;
  const maxIterations = 12;

  for (let iter = 0; iter < maxIterations; iter++) {
    let hadCollision = false;

    // Phase 1: Repel any building that overlaps a fixed building
    for (const [id, pos] of posMap.entries()) {
      if (fixedIds.has(id)) continue;

      for (const fixedId of fixedIds) {
        const fixedPos = posMap.get(fixedId)!;
        const fixedDim = dimensionsMap?.[fixedId] ?? DEFAULT_BUILDING_DIMENSIONS;
        const targetDim = dimensionsMap?.[id] ?? DEFAULT_BUILDING_DIMENSIONS;

        if (checkBuildingOverlap(fixedPos, pos, fixedDim, targetDim)) {
          hadCollision = true;
          anyChanged = true;
          const repulsed = repulseBuildingFrom(fixedPos, pos, fixedDim, targetDim, bounds);
          posMap.set(id, repulsed);
        }
      }
    }

    // Phase 2: Repel non-fixed buildings from one another
    const entries = Array.from(posMap.entries());
    for (let i = 0; i < entries.length; i++) {
      const [idA, posA] = entries[i]!;
      const dimA = dimensionsMap?.[idA] ?? DEFAULT_BUILDING_DIMENSIONS;

      for (let j = i + 1; j < entries.length; j++) {
        const [idB, posB] = entries[j]!;
        const dimB = dimensionsMap?.[idB] ?? DEFAULT_BUILDING_DIMENSIONS;

        if (checkBuildingOverlap(posA, posB, dimA, dimB)) {
          hadCollision = true;
          anyChanged = true;

          if (fixedIds.has(idA)) {
            const repulsed = repulseBuildingFrom(posA, posB, dimA, dimB, bounds);
            posMap.set(idB, repulsed);
          } else if (fixedIds.has(idB)) {
            const repulsed = repulseBuildingFrom(posB, posA, dimB, dimA, bounds);
            posMap.set(idA, repulsed);
          } else {
            const repulsed = repulseBuildingFrom(posA, posB, dimA, dimB, bounds);
            posMap.set(idB, repulsed);
          }
        }
      }
    }

    if (!hadCollision) break;
  }

  if (!anyChanged) return [];

  const updates: BuildingPositionUpdate[] = [];
  for (const b of buildings) {
    if (b.id === placedBuildingId) continue;
    const finalPos = posMap.get(b.id)!;
    if (finalPos.x !== b.x || finalPos.y !== b.y) {
      updates.push({ id: b.id, x: finalPos.x, y: finalPos.y });
    }
  }

  return updates;
}

export interface SwapTargetOptions {
  pointerClient?: { x: number; y: number };
  elementRects?: Record<string, { left: number; top: number; right: number; bottom: number }>;
  minOverlapRatio?: number;
}

/**
 * Determines which building (if any) the dragged building is being placed right on top of,
 * taking into account overlap ratio, center alignment, and cursor position.
 */
export function findSwapTargetBuilding<T extends { id: string; x: number; y: number }>(
  draggedBuildingId: string,
  draggedPos: { x: number; y: number },
  buildings: T[],
  dimensionsMap?: Record<string, BuildingDimensions>,
  options?: SwapTargetOptions,
): T | null {
  const dimA = dimensionsMap?.[draggedBuildingId] ?? DEFAULT_BUILDING_DIMENSIONS;
  const centerAX = draggedPos.x + dimA.w / 2;
  const centerAY = draggedPos.y + dimA.h / 2;
  const minOverlap = options?.minOverlapRatio ?? 0.2;

  let bestTarget: T | null = null;
  let highestScore = -1;

  for (const other of buildings) {
    if (other.id === draggedBuildingId) continue;
    const dimB = dimensionsMap?.[other.id] ?? DEFAULT_BUILDING_DIMENSIONS;

    const overlapArea = calculateBuildingOverlapArea(draggedPos, other, dimA, dimB);
    const minBuildingArea = Math.min(dimA.w * dimA.h, dimB.w * dimB.h);
    const overlapRatio = minBuildingArea > 0 ? overlapArea / minBuildingArea : 0;

    // Check if dragged building center is inside other building
    const centerInside =
      centerAX >= other.x &&
      centerAX <= other.x + dimB.w &&
      centerAY >= other.y &&
      centerAY <= other.y + dimB.h;

    // Check if pointer is inside other building's DOM rect
    let pointerInside = false;
    if (options?.pointerClient && options.elementRects) {
      const rect = options.elementRects[other.id];
      if (rect) {
        pointerInside =
          options.pointerClient.x >= rect.left &&
          options.pointerClient.x <= rect.right &&
          options.pointerClient.y >= rect.top &&
          options.pointerClient.y <= rect.bottom;
      }
    }

    // Qualifies as "right on top of another" if:
    // 1. Pointer is inside target building, OR
    // 2. Dragged building center is inside target building, OR
    // 3. Significant overlap ratio (>= minOverlap)
    if (pointerInside || centerInside || overlapRatio >= minOverlap) {
      let score = overlapRatio * 2;
      if (centerInside) score += 1.0;
      if (pointerInside) score += 1.0;

      const centerBX = other.x + dimB.w / 2;
      const centerBY = other.y + dimB.h / 2;
      const normDist = Math.hypot(
        (centerAX - centerBX) / Math.max(dimB.w, 1),
        (centerAY - centerBY) / Math.max(dimB.h, 1),
      );
      score += Math.max(0, 1 - normDist);

      if (score > highestScore) {
        highestScore = score;
        bestTarget = other;
      }
    }
  }

  return bestTarget;
}

/**
 * Swaps positions of two buildings, ensuring both end positions are clamped within canvas bounds.
 */
export function swapBuildingPositions(
  draggedBuildingId: string,
  draggedStartPos: { x: number; y: number },
  targetBuildingId: string,
  targetPos: { x: number; y: number },
  bounds = CANVAS_BOUNDS,
): BuildingPositionUpdate[] {
  const clampedTarget = clampBuildingPosition(targetPos, bounds);
  const clampedStart = clampBuildingPosition(draggedStartPos, bounds);

  return [
    { id: draggedBuildingId, x: clampedTarget.x, y: clampedTarget.y },
    { id: targetBuildingId, x: clampedStart.x, y: clampedStart.y },
  ];
}
