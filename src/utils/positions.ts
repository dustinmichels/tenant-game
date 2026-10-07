import type { BuildingDimensions, BuildingPositionUpdate } from "../types/game";
import { BUILDING_GAP_PX, getBuildingGridDimensions, getBuildingGridMetrics } from "./layout";

export const DEFAULT_BUILDING_DIMENSIONS: BuildingDimensions = {
  w: 26,
  h: 32,
};

export const CANVAS_BOUNDS = {
  minX: 2,
  maxX: 84,
  minY: 2,
  maxY: 72,
  landlordMinX: 86,
  landlordMaxY: 0,
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
 * Generates deterministic row-major positions that use the residential area
 * while preserving a full gutter between adjacent grid cells.
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

  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    return clampBuildingPosition({
      x: ((originX + col * (cellWidth + BUILDING_GAP_PX)) / width) * 100,
      y: ((originY + row * (cellHeight + BUILDING_GAP_PX)) / height) * 100,
    });
  });
}

/**
 * Randomizes which building occupies each well-spaced grid slot.
 * Used when the facilitator clicks "Shuffle pos".
 */
export function generateScatteredPositions(
  count: number,
  peoplePerBuilding = 8,
  canvasWidth = 1050,
  canvasHeight = 750,
): Array<{ x: number; y: number }> {
  if (count <= 0) return [];
  const scattered = generateDefaultPositions(count, peoplePerBuilding, canvasWidth, canvasHeight);

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
export interface SpaceOutNode {
  id: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
}

export const DEFAULT_SPACE_OUT_BOUNDS = {
  minX: 2.5,
  maxX: 97.5,
  minY: 3.0,
  maxY: 95.0,
};

export const DEFAULT_ACTION_PANEL_BOUNDS = {
  minX: 81.0,
  minY: 77.0,
};

const DEFAULT_FALLBACK_NODE_DIM: BuildingDimensions = {
  w: 16,
  h: 22,
};

/**
 * Spaces out nodes away from each other so they move apart and fill all available canvas space.
 * Uses center-of-mass dispersion, n-body force relaxation, boundary clamping, and
 * action-panel avoidance.
 */
export function spaceOutNodes(
  nodes: SpaceOutNode[],
  dimensionsMap?: Record<string, BuildingDimensions>,
  bounds = DEFAULT_SPACE_OUT_BOUNDS,
  actionPanelBounds: { minX: number; minY: number } | null = DEFAULT_ACTION_PANEL_BOUNDS,
  iterations = 80,
): Array<{ id: string; x: number; y: number }> {
  if (!nodes || nodes.length === 0) return [];

  const resolved = nodes.map((n) => {
    const dim =
      dimensionsMap?.[n.id] ?? (n.w && n.h ? { w: n.w, h: n.h } : DEFAULT_FALLBACK_NODE_DIM);
    const w = Math.max(4, dim.w);
    const h = Math.max(4, dim.h);
    return {
      id: n.id,
      x: n.x,
      y: n.y,
      w,
      h,
    };
  });

  if (resolved.length === 1) {
    const n = resolved[0]!;
    const minX = bounds.minX;
    const maxX = Math.max(minX, bounds.maxX - n.w);
    const minY = bounds.minY;
    const maxY = Math.max(minY, bounds.maxY - n.h);
    return [
      {
        id: n.id,
        x: Math.round(((minX + maxX) / 2) * 10) / 10,
        y: Math.round(((minY + maxY) / 2) * 10) / 10,
      },
    ];
  }

  // Helper to clamp center to keep card inside bounds and out of action panel
  function clampCenter(cx: number, cy: number, w: number, h: number): { cx: number; cy: number } {
    const minCx = bounds.minX + w / 2;
    const maxCx = Math.max(minCx, bounds.maxX - w / 2);
    const minCy = bounds.minY + h / 2;
    const maxCy = Math.max(minCy, bounds.maxY - h / 2);

    let clampedCx = Math.max(minCx, Math.min(maxCx, cx));
    let clampedCy = Math.max(minCy, Math.min(maxCy, cy));

    if (actionPanelBounds) {
      const right = clampedCx + w / 2;
      const bottom = clampedCy + h / 2;
      const margin = 1.0;
      if (right > actionPanelBounds.minX - margin && bottom > actionPanelBounds.minY - margin) {
        const pushLeft = right - (actionPanelBounds.minX - margin);
        const pushUp = bottom - (actionPanelBounds.minY - margin);
        if (pushLeft <= pushUp) {
          clampedCx -= pushLeft;
        } else {
          clampedCy -= pushUp;
        }
        clampedCx = Math.max(minCx, clampedCx);
        clampedCy = Math.max(minCy, clampedCy);
      }
    }

    return { cx: clampedCx, cy: clampedCy };
  }

  // 1. Center of mass & initial outward dispersion
  const centers = resolved.map((n) => ({
    cx: n.x + n.w / 2,
    cy: n.y + n.h / 2,
  }));

  const avgCx = centers.reduce((sum, c) => sum + c.cx, 0) / centers.length;
  const avgCy = centers.reduce((sum, c) => sum + c.cy, 0) / centers.length;

  const targetMinX = bounds.minX + 2;
  const targetMaxX = bounds.maxX - 2;
  const targetMinY = bounds.minY + 2;
  const targetMaxY = bounds.maxY - 2;

  const targetCx = (targetMinX + targetMaxX) / 2;
  const targetCy = (targetMinY + targetMaxY) / 2;

  const spreadX = Math.max(...centers.map((c) => Math.abs(c.cx - avgCx)), 0.1);
  const spreadY = Math.max(...centers.map((c) => Math.abs(c.cy - avgCy)), 0.1);

  const targetHalfW = ((targetMaxX - targetMinX) / 2) * 0.88;
  const targetHalfH = ((targetMaxY - targetMinY) / 2) * 0.88;

  const scaleX = Math.max(1.2, Math.min(5.0, targetHalfW / Math.max(spreadX, 2.0)));
  const scaleY = Math.max(1.2, Math.min(5.0, targetHalfH / Math.max(spreadY, 2.0)));

  const pos = resolved.map((n, i) => {
    let perpX = 0;
    let perpY = 0;
    if (spreadY < 5.0 && resolved.length > 2) {
      perpY = ((i % 2) * 2 - 1) * targetHalfH * 0.5;
    }
    if (spreadX < 5.0 && resolved.length > 2) {
      perpX = ((i % 2) * 2 - 1) * targetHalfW * 0.5;
    }

    const jitterX = ((i % 2) - 0.5) * 1.5;
    const jitterY = (((i + 1) % 3) - 1.0) * 2.0;

    const initialCx = targetCx + (centers[i]!.cx - avgCx) * scaleX + perpX + jitterX;
    const initialCy = targetCy + (centers[i]!.cy - avgCy) * scaleY + perpY + jitterY;
    const clamped = clampCenter(initialCx, initialCy, n.w, n.h);

    return {
      id: n.id,
      cx: clamped.cx,
      cy: clamped.cy,
      w: n.w,
      h: n.h,
    };
  });

  // 2. Iterative force relaxation
  const dt = 0.5;
  for (let it = 0; it < iterations; it++) {
    const forces = pos.map(() => ({ fx: 0, fy: 0 }));
    const damping = 1.0 - (it / iterations) * 0.35;

    // Node-to-node repulsion
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const p1 = pos[i]!;
        const p2 = pos[j]!;
        let dx = p1.cx - p2.cx;
        let dy = p1.cy - p2.cy;

        const reqW = (p1.w + p2.w) / 2 + 3.0;
        const reqH = (p1.h + p2.h) / 2 + 3.0;

        // If almost purely horizontal or vertical, introduce slight cross-axis deflection
        if (Math.abs(dy) < 1.0 && Math.abs(dx) < reqW) {
          dy = (i % 2 === 0 ? 1 : -1) * 2.5;
        }
        if (Math.abs(dx) < 1.0 && Math.abs(dy) < reqH) {
          dx = (i % 2 === 0 ? 1 : -1) * 2.5;
        }
        let nx = dx / Math.max(reqW, 1.0);
        let ny = dy / Math.max(reqH, 1.0);
        let dist = Math.sqrt(nx * nx + ny * ny);

        if (dist < 0.001) {
          const angle = (i * 1.57 + j) % (Math.PI * 2);
          dx = Math.cos(angle) * 0.1;
          dy = Math.sin(angle) * 0.1;
          dist = 0.1;
          nx = dx / reqW;
          ny = dy / reqH;
        }

        let mag: number;
        if (dist < 1.0) {
          mag = (1.0 - dist) * 18.0 + 6.0;
        } else {
          mag = Math.min(4.0, 3.0 / (dist * dist));
        }

        const fx = (nx / dist) * mag * reqW * 0.5;
        const fy = (ny / dist) * mag * reqH * 0.5;

        forces[i]!.fx += fx;
        forces[i]!.fy += fy;
        forces[j]!.fx -= fx;
        forces[j]!.fy -= fy;
      }
    }

    // Boundary repulsion & Action Panel repulsion
    for (let i = 0; i < pos.length; i++) {
      const p = pos[i]!;
      const minCx = bounds.minX + p.w / 2;
      const maxCx = Math.max(minCx, bounds.maxX - p.w / 2);
      const minCy = bounds.minY + p.h / 2;
      const maxCy = Math.max(minCy, bounds.maxY - p.h / 2);

      const marginX = 4.0;
      const marginY = 4.0;

      if (p.cx < minCx + marginX) {
        forces[i]!.fx += ((minCx + marginX - p.cx) / marginX) * 6.0;
      } else if (p.cx > maxCx - marginX) {
        forces[i]!.fx -= ((p.cx - (maxCx - marginX)) / marginX) * 6.0;
      }

      if (p.cy < minCy + marginY) {
        forces[i]!.fy += ((minCy + marginY - p.cy) / marginY) * 6.0;
      } else if (p.cy > maxCy - marginY) {
        forces[i]!.fy -= ((p.cy - (maxCy - marginY)) / marginY) * 6.0;
      }

      if (actionPanelBounds) {
        const right = p.cx + p.w / 2;
        const bottom = p.cy + p.h / 2;
        if (right > actionPanelBounds.minX - 3.0 && bottom > actionPanelBounds.minY - 3.0) {
          forces[i]!.fx -= 12.0;
          forces[i]!.fy -= 12.0;
        }
      }
    }

    // Apply forces and clamp
    for (let i = 0; i < pos.length; i++) {
      const p = pos[i]!;
      p.cx += forces[i]!.fx * dt * damping;
      p.cy += forces[i]!.fy * dt * damping;

      const clamped = clampCenter(p.cx, p.cy, p.w, p.h);
      p.cx = clamped.cx;
      p.cy = clamped.cy;
    }
  }

  // 3. Final overlap push to guarantee separation
  for (let step = 0; step < 15; step++) {
    let hadOverlap = false;
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const p1 = pos[i]!;
        const p2 = pos[j]!;

        const left1 = p1.cx - p1.w / 2;
        const right1 = p1.cx + p1.w / 2;
        const top1 = p1.cy - p1.h / 2;
        const bottom1 = p1.cy + p1.h / 2;

        const left2 = p2.cx - p2.w / 2;
        const right2 = p2.cx + p2.w / 2;
        const top2 = p2.cy - p2.h / 2;
        const bottom2 = p2.cy + p2.h / 2;

        const overlapX = Math.min(right1, right2) - Math.max(left1, left2);
        const overlapY = Math.min(bottom1, bottom2) - Math.max(top1, top2);

        if (overlapX > 0.01 && overlapY > 0.01) {
          hadOverlap = true;
          const minCx1 = bounds.minX + p1.w / 2;
          const maxCx1 = Math.max(minCx1, bounds.maxX - p1.w / 2);
          const minCx2 = bounds.minX + p2.w / 2;
          const maxCx2 = Math.max(minCx2, bounds.maxX - p2.w / 2);

          const minCy1 = bounds.minY + p1.h / 2;
          const maxCy1 = Math.max(minCy1, bounds.maxY - p1.h / 2);
          const minCy2 = bounds.minY + p2.h / 2;
          const maxCy2 = Math.max(minCy2, bounds.maxY - p2.h / 2);

          const roomX = p1.cx - minCx1 + (maxCx1 - p1.cx) + (p2.cx - minCx2) + (maxCx2 - p2.cx);
          const roomY = p1.cy - minCy1 + (maxCy1 - p1.cy) + (p2.cy - minCy2) + (maxCy2 - p2.cy);

          const pushX =
            (overlapX < overlapY || Math.abs(p1.cy - p2.cy) < 1.0) && overlapX < roomX * 0.5;

          if (pushX) {
            const shift = (overlapX + 1.0) / 2;
            if (p1.cx <= p2.cx) {
              p1.cx -= shift;
              p2.cx += shift;
            } else {
              p1.cx += shift;
              p2.cx += shift;
            }
          } else {
            const shift = (overlapY + 1.0) / 2;
            if (p1.cy <= p2.cy) {
              p1.cy -= shift;
              p2.cy += shift;
            } else {
              p1.cy += shift;
              p2.cy += shift;
            }
          }

          const c1 = clampCenter(p1.cx, p1.cy, p1.w, p1.h);
          p1.cx = c1.cx;
          p1.cy = c1.cy;
          const c2 = clampCenter(p2.cx, p2.cy, p2.w, p2.h);
          p2.cx = c2.cx;
          p2.cy = c2.cy;
        }
      }
    }
    if (!hadOverlap) break;
  }

  return pos.map((p) => {
    const leftX = Math.round((p.cx - p.w / 2) * 10) / 10;
    const topY = Math.round((p.cy - p.h / 2) * 10) / 10;
    return {
      id: p.id,
      x: leftX,
      y: topY,
    };
  });
}
