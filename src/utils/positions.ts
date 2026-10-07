import type { BuildingDimensions, BuildingPositionUpdate } from "../types/game";

export const DEFAULT_BUILDING_DIMENSIONS: BuildingDimensions = {
  w: 16,
  h: 22,
};

export const CANVAS_BOUNDS = {
  minX: 2,
  maxX: 82,
  minY: 2,
  maxY: 80,
  landlordMinX: 68,
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
 * Generates well-aligned, organic coordinates across the building canvas without overlaps.
 * Leaves the top-right corner free for the "Landlord, Inc." headquarters.
 */
export function generateScatteredPositions(count: number): Array<{ x: number; y: number }> {
  if (count <= 0) return [];
  if (count === 1) {
    return [{ x: 30, y: 24 }];
  }
  if (count === 2) {
    const jitter = (Math.random() - 0.5) * 3;
    return [
      { x: Math.round(18 + jitter), y: 24 },
      { x: Math.round(52 - jitter), y: 25 },
    ];
  }
  if (count === 3) {
    const j1 = (Math.random() - 0.5) * 3;
    const j2 = (Math.random() - 0.5) * 3;
    const j3 = (Math.random() - 0.5) * 3;
    const positions = [
      { x: Math.round(14 + j1), y: Math.round(12 + j2) },
      { x: Math.round(48 - j1), y: Math.round(14 - j3) },
      { x: Math.round(30 + j2), y: Math.round(50 + j1) },
    ];
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = positions[i]!;
      positions[i] = positions[j]!;
      positions[j] = temp;
    }
    return positions;
  }
  if (count === 4) {
    const baseSlots = [
      { x: 11, y: 10 },
      { x: 45, y: 11 },
      { x: 15, y: 49 },
      { x: 49, y: 49 },
    ];
    const positions = baseSlots.map((s) => ({
      x: Math.round(s.x + (Math.random() - 0.5) * 2.5),
      y: Math.round(s.y + (Math.random() - 0.5) * 2.5),
    }));
    for (let i = positions.length - 1; i > 0; i--) {
      const r = Math.floor(Math.random() * (i + 1));
      const t = positions[i]!;
      positions[i] = positions[r]!;
      positions[r] = t;
    }
    return positions;
  }
  if (count === 5) {
    const baseSlots = [
      { x: 14, y: 10 },
      { x: 46, y: 10 },
      { x: 8, y: 50 },
      { x: 38, y: 50 },
      { x: 68, y: 50 },
    ];
    const positions = baseSlots.map((s) => ({
      x: Math.round(s.x + (Math.random() - 0.5) * 2.5),
      y: Math.round(s.y + (Math.random() - 0.5) * 2.5),
    }));
    for (let i = positions.length - 1; i > 0; i--) {
      const r = Math.floor(Math.random() * (i + 1));
      const t = positions[i]!;
      positions[i] = positions[r]!;
      positions[r] = t;
    }
    return positions;
  }

  // For 6+ buildings: distribute across 2 or 3 staggered rows
  const nRows = count <= 6 ? 2 : count <= 11 ? 3 : Math.max(3, Math.ceil(count / 4));
  const topMax = count <= 7 ? 2 : 3;
  const rowCounts: number[] = [];
  let rem = count;
  for (let r = 0; r < nRows; r++) {
    if (r === 0) {
      const c = Math.min(topMax, rem - (nRows - 1));
      rowCounts.push(c);
      rem -= c;
    } else if (r === nRows - 1) {
      rowCounts.push(rem);
      rem = 0;
    } else {
      const c = Math.ceil(rem / (nRows - r));
      rowCounts.push(c);
      rem -= c;
    }
  }

  const yMin = 8;
  const yMax = nRows === 2 ? 50 : nRows === 3 ? 68 : 78;
  const stepY = nRows > 1 ? (yMax - yMin) / (nRows - 1) : 0;

  const slots: Array<{ x: number; y: number }> = [];
  for (let r = 0; r < nRows; r++) {
    const cCnt = rowCounts[r] ?? 0;
    if (cCnt <= 0) continue;

    const baseY = yMin + r * stepY;
    const xLimit = r === 0 ? 48 : 72;
    const xStart = r % 2 === 0 ? 8 : 14;

    let rowX: number[];
    if (cCnt === 1) {
      rowX = [(xStart + xLimit) / 2];
    } else {
      const stepX = (xLimit - xStart) / (cCnt - 1);
      rowX = [];
      for (let i = 0; i < cCnt; i++) {
        rowX.push(xStart + i * stepX);
      }
    }

    for (let i = 0; i < rowX.length; i++) {
      const bx = rowX[i]!;
      const jx = (Math.random() - 0.5) * 2.0;
      const jy = (Math.random() - 0.5) * 2.5;
      const fx = Math.round(Math.max(3, Math.min(76, bx + jx)) * 10) / 10;
      const fy = Math.round(Math.max(3, Math.min(78, baseY + jy)) * 10) / 10;
      slots.push({ x: fx, y: fy });
    }
  }

  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = slots[i]!;
    slots[i] = slots[j]!;
    slots[j] = temp;
  }

  return slots;
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
