import type { BuildingDimensions, BuildingPositionUpdate } from "../types/game";

export const DEFAULT_BUILDING_DIMENSIONS: BuildingDimensions = {
  w: 26,
  h: 32,
};

export const CANVAS_BOUNDS = {
  minX: 2,
  maxX: 72,
  minY: 2,
  maxY: 68,
  landlordMinX: 72,
  landlordMaxY: 28,
};

export function checkBuildingOverlap(
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

export function calculateBuildingOverlapArea(
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

export function calculateBuildingOverlapRatio(
  posA: { x: number; y: number },
  posB: { x: number; y: number },
  dimA: BuildingDimensions = DEFAULT_BUILDING_DIMENSIONS,
  dimB: BuildingDimensions = DEFAULT_BUILDING_DIMENSIONS,
): number {
  const area = calculateBuildingOverlapArea(posA, posB, dimA, dimB);
  const minBuildingArea = Math.min(dimA.w * dimA.h, dimB.w * dimB.h);
  return minBuildingArea > 0 ? area / minBuildingArea : 0;
}

export function clampBuildingPosition(
  pos: { x: number; y: number },
  bounds = CANVAS_BOUNDS,
): { x: number; y: number } {
  let cx = Math.max(bounds.minX, Math.min(bounds.maxX, pos.x));
  let cy = Math.max(bounds.minY, Math.min(bounds.maxY, pos.y));

  // Avoid Landlord office in top-right corner
  if (cx >= bounds.landlordMinX && cy <= bounds.landlordMaxY) {
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

export function repulseBuildingFrom(
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
 * Calculates optimal grid rows and columns for a given building count.
 * Arranges buildings from left to right, up to down.
 */
export function getBuildingGridDimensions(count: number): { cols: number; rows: number } {
  if (count <= 1) return { cols: 1, rows: 1 };
  if (count === 2) return { cols: 2, rows: 1 };
  if (count <= 4) return { cols: 2, rows: 2 };
  if (count <= 6) return { cols: 2, rows: 3 };
  if (count <= 8) return { cols: 2, rows: 4 };
  if (count <= 12) return { cols: 3, rows: Math.ceil(count / 3) };
  if (count <= 20) return { cols: 4, rows: Math.ceil(count / 4) };
  if (count <= 30) return { cols: 5, rows: Math.ceil(count / 5) };
  const cols = Math.min(6, Math.ceil(Math.sqrt(count * 1.2)));
  const rows = Math.ceil(count / cols);
  return { cols, rows };
}

/**
 * Generates natural, organic default positions across the canvas that fill the space nicely
 * while preserving a predictable top-left to bottom-right order by building number
 * (Building 1 in top left, Building 2 in top right, Building 3 in middle left, etc.).
 * Applies subtle organic offsets to avoid a stiff/rigid grid look, and respects canvas bounds.
 */
export function generateDefaultPositions(count: number): Array<{ x: number; y: number }> {
  if (count <= 0) return [];
  if (count === 1) {
    const jx = (Math.random() - 0.5) * 3;
    const jy = (Math.random() - 0.5) * 3;
    return [{ x: Math.round((18 + jx) * 10) / 10, y: Math.round((14 + jy) * 10) / 10 }];
  }

  const { cols, rows } = getBuildingGridDimensions(count);

  let baseColX: number[];
  if (cols === 1) {
    baseColX = [5];
  } else if (cols === 2) {
    baseColX = [5, 48];
  } else if (cols === 3) {
    baseColX = [4, 32, 60];
  } else if (cols === 4) {
    baseColX = [3, 22, 42, 62];
  } else {
    const xMin = 2.5;
    const xMax = 63;
    const stepX = (xMax - xMin) / (cols - 1);
    baseColX = Array.from({ length: cols }, (_, c) => Math.round((xMin + c * stepX) * 10) / 10);
  }

  let baseRowY: number[];
  if (rows === 1) {
    baseRowY = [8];
  } else if (rows === 2) {
    baseRowY = [7, 52];
  } else if (rows === 3) {
    baseRowY = [5, 36, 68];
  } else {
    const yMin = 4;
    const yMax = Math.min(80, 68 + (rows - 3) * 6);
    const stepY = (yMax - yMin) / (rows - 1);
    baseRowY = Array.from({ length: rows }, (_, r) => Math.round((yMin + r * stepY) * 10) / 10);
  }

  const positions: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < count; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;

    // Subtle row staggering and organic jitter for a natural, hand-drawn look that fills space
    const staggerX = r % 2 === 1 ? (cols === 2 ? 1.5 : -1.0) : 0;
    const jx = (Math.random() - 0.5) * 3.5;
    const jy = (Math.random() - 0.5) * 3.0;

    const rawX = baseColX[c]! + staggerX + jx;
    const rawY = baseRowY[r]! + jy;

    const clamped = clampBuildingPosition({ x: rawX, y: rawY });
    positions.push({
      x: clamped.x,
      y: clamped.y,
    });
  }
  return positions;
}

/**
 * Generates scattered/randomized coordinates across the building canvas without overlaps.
 * Used when the facilitator clicks "Shuffle pos".
 */
export function generateScatteredPositions(count: number): Array<{ x: number; y: number }> {
  if (count <= 0) return [];
  const defaultPositions = generateDefaultPositions(count);
  const scattered = defaultPositions.map((pos) => {
    const jx = (Math.random() - 0.5) * 4.0;
    const jy = (Math.random() - 0.5) * 4.0;
    return clampBuildingPosition({
      x: pos.x + jx,
      y: pos.y + jy,
    });
  });

  // Fisher-Yates shuffle
  for (let i = scattered.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = scattered[i]!;
    scattered[i] = scattered[j]!;
    scattered[j] = temp;
  }
  return scattered;
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
