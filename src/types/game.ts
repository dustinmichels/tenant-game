export interface Tenant {
  id: string;
  buildingId: string;
  variant: number;
  isInstigator?: boolean;
  inUnion?: boolean;
  isEvicted?: boolean;
  evictedRound?: number;
}

export interface Building {
  id: string;
  index: number;
  label: string;
  color: string;
  tenants: Tenant[];
  x: number; // percentage (0 to 100) across canvas
  y: number; // percentage (0 to 100) down canvas
}

export interface RoundTally {
  round: number;
  landlordSpending: number | null;
  landlordRemaining?: number | null;
  totalOrganized: number;
  evictions: number;
  totalEvictions?: number;
  buildingsOrganized: number;
}

export type GamePhase = 1 | 2 | 3;

export interface PhaseInfo {
  id: GamePhase;
  name: string;
  label: string;
  description: string;
}

export const PHASES: readonly PhaseInfo[] = [
  {
    id: 1,
    name: "Landlord",
    label: "Phase 1: Landlord",
    description: "Landlord makes their move and sets terms.",
  },
  {
    id: 2,
    name: "Tenant",
    label: "Phase 2: Tenant",
    description: "Tenants organize, strategize, and respond.",
  },
  {
    id: 3,
    name: "The Market",
    label: "Phase 3: The Market",
    description: "Market conditions shift and economic forces resolve.",
  },
] as const;

export const BUILDING_COLORS: readonly string[] = [
  "#e11d48", // Rose Red
  "#2563eb", // Royal Blue
  "#059669", // Emerald Green
  "#d97706", // Amber Gold
  "#7c3aed", // Purple Violet
  "#0891b2", // Ocean Teal
  "#ea580c", // Bright Orange
  "#db2777", // Vivid Magenta
  "#4f46e5", // Indigo
  "#16a34a", // Leaf Green
  "#c026d3", // Fuchsia
  "#ca8a04", // Deep Gold
] as const;

export function getBuildingColor(index: number): string {
  const zeroIndex = Math.max(0, index - 1);
  const color = BUILDING_COLORS[zeroIndex];
  if (color) {
    return color;
  }
  // Golden ratio hue spread for arbitrary building counts
  const hue = Math.round((zeroIndex * 137.5) % 360);
  return `hsl(${hue}, 80%, 42%)`;
}
export interface CoalitionConnection {
  id: string;
  sourceId: string;
  targetId: string;
  createdAt?: number;
}

export interface CoalitionGroup {
  id: string;
  buildingIds: string[];
  dominantColor: string;
  leadBuildingId: string;
  totalUnionCount: number;
}

export interface GameState {
  buildingCount: number;
  peoplePerBuilding: number;
  landlordStartingMoney?: number;
  landlordMoney?: number;
  isConfigured: boolean;
  buildings: Building[];
  coalitionConnections?: CoalitionConnection[];
  round: number;
  phase: GamePhase;
  isEditPosition?: boolean;
  tallies: Record<number, RoundTally>;
  updatedAt: number;
}

export function getBuildingUnionCount(building: Building): number {
  if (!building.tenants || building.tenants.length === 0) return 0;
  const count = building.tenants.filter(
    (t) => (t.inUnion || t.isInstigator) && !t.isEvicted,
  ).length;
  return count >= 2 ? count : 0;
}

/**
 * Computes the connected coalition groups from buildings and active connections.
 * For each coalition, the dominant color is chosen based on whichever color has more unionized people.
 */
export function computeCoalitionGroups(
  buildings: Building[],
  connections: CoalitionConnection[],
): CoalitionGroup[] {
  const buildingMap = new Map<string, Building>();
  for (const b of buildings) {
    buildingMap.set(b.id, b);
  }

  const adj = new Map<string, Set<string>>();
  for (const b of buildings) {
    adj.set(b.id, new Set<string>());
  }

  for (const c of connections) {
    if (c.sourceId && c.targetId && c.sourceId !== c.targetId) {
      if (buildingMap.has(c.sourceId) && buildingMap.has(c.targetId)) {
        adj.get(c.sourceId)?.add(c.targetId);
        adj.get(c.targetId)?.add(c.sourceId);
      }
    }
  }

  const visited = new Set<string>();
  const groups: CoalitionGroup[] = [];

  for (const b of buildings) {
    if (visited.has(b.id)) continue;
    const neighbors = adj.get(b.id);
    // Only consider components that actually have connections (2 or more buildings)
    if (!neighbors || neighbors.size === 0) {
      visited.add(b.id);
      continue;
    }

    // BFS to find connected component
    const componentBuildingIds: string[] = [];
    const queue = [b.id];
    visited.add(b.id);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      componentBuildingIds.push(currentId);
      const currentNeighbors = adj.get(currentId);
      if (currentNeighbors) {
        for (const nextId of currentNeighbors) {
          if (!visited.has(nextId)) {
            visited.add(nextId);
            queue.push(nextId);
          }
        }
      }
    }

    if (componentBuildingIds.length < 2) continue;

    const componentBuildings = componentBuildingIds
      .map((id) => buildingMap.get(id))
      .filter((b): b is Building => b !== undefined);

    if (componentBuildings.length < 2) continue;

    const firstBuilding = componentBuildings[0];
    if (!firstBuilding) continue;

    // Calculate which color has more unionized people
    const colorStats: Record<string, { count: number; leadBuilding: Building }> = {};
    let totalUnionCount = 0;

    for (const cb of componentBuildings) {
      const count = getBuildingUnionCount(cb);
      totalUnionCount += count;
      const colorKey = cb.color;
      if (!colorStats[colorKey]) {
        colorStats[colorKey] = { count, leadBuilding: cb };
      } else {
        colorStats[colorKey].count += count;
        if (count > getBuildingUnionCount(colorStats[colorKey].leadBuilding)) {
          colorStats[colorKey].leadBuilding = cb;
        }
      }
    }

    let bestColor = firstBuilding.color;
    let bestCount = -1;
    let bestLeadBuilding: Building = firstBuilding;
    for (const [color, stat] of Object.entries(colorStats)) {
      if (stat.count > bestCount) {
        bestCount = stat.count;
        bestColor = color;
        bestLeadBuilding = stat.leadBuilding;
      } else if (stat.count === bestCount) {
        // Tie-breaker: lower building index
        if (stat.leadBuilding.index < bestLeadBuilding.index) {
          bestColor = color;
          bestLeadBuilding = stat.leadBuilding;
        }
      }
    }

    // If every building has 0 active union members, fallback to total union or tenants
    if (bestCount <= 0) {
      let fallbackMax = -1;
      for (const cb of componentBuildings) {
        const totalUnion = cb.tenants.filter((t) => t.inUnion || t.isInstigator).length;
        if (totalUnion > fallbackMax) {
          fallbackMax = totalUnion;
          bestColor = cb.color;
          bestLeadBuilding = cb;
        } else if (totalUnion === fallbackMax && cb.index < bestLeadBuilding.index) {
          bestColor = cb.color;
          bestLeadBuilding = cb;
        }
      }
      if (fallbackMax <= 0) {
        // Fallback to building with more tenants, then lowest index
        let maxTenants = -1;
        for (const cb of componentBuildings) {
          if (cb.tenants.length > maxTenants) {
            maxTenants = cb.tenants.length;
            bestColor = cb.color;
            bestLeadBuilding = cb;
          } else if (cb.tenants.length === maxTenants && cb.index < bestLeadBuilding.index) {
            bestColor = cb.color;
            bestLeadBuilding = cb;
          }
        }
      }
    }

    const sortedIds = [...componentBuildingIds].sort();
    groups.push({
      id: `coalition-${sortedIds.join("-")}`,
      buildingIds: sortedIds,
      dominantColor: bestColor,
      leadBuildingId: bestLeadBuilding.id,
      totalUnionCount,
    });
  }

  return groups;
}

/**
 * Returns a lookup map from building ID to the effective color of its unionized tenants.
 * Buildings in a coalition use the coalition dominant color. Others use their own building.color.
 */
export function getEffectiveBuildingColorMap(
  buildings: Building[],
  connections: CoalitionConnection[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const b of buildings) {
    map[b.id] = b.color;
  }

  const groups = computeCoalitionGroups(buildings, connections);
  for (const g of groups) {
    for (const bId of g.buildingIds) {
      map[bId] = g.dominantColor;
    }
  }

  return map;
}

export function isBuildingOrganized(building: Building): boolean {
  if (!building.tenants || building.tenants.length === 0) return false;
  const unionCount = getBuildingUnionCount(building);
  if (unionCount < 2) return false;
  const threshold = Math.max(2, Math.ceil(building.tenants.length / 2));
  return unionCount >= threshold;
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
    const jitter = (Math.random() - 0.5) * 4;
    return [
      { x: Math.round(16 + jitter), y: 22 },
      { x: Math.round(52 - jitter), y: 25 },
    ];
  }
  if (count === 3) {
    const j1 = (Math.random() - 0.5) * 4;
    const j2 = (Math.random() - 0.5) * 4;
    const j3 = (Math.random() - 0.5) * 4;
    const positions = [
      { x: Math.round(8 + j1), y: Math.round(18 + j2) },
      { x: Math.round(40 - j1), y: Math.round(22 - j3) },
      { x: Math.round(72 + j2), y: Math.round(36 + j1) },
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
    const j = () => (Math.random() - 0.5) * 3;
    const positions = [
      { x: Math.round(10 + j()), y: Math.round(6 + j()) },
      { x: Math.round(44 + j()), y: Math.round(8 + j()) },
      { x: Math.round(20 + j()), y: Math.round(53 + j()) },
      { x: Math.round(62 + j()), y: Math.round(51 + j()) },
    ];
    for (let i = positions.length - 1; i > 0; i--) {
      const r = Math.floor(Math.random() * (i + 1));
      const t = positions[i]!;
      positions[i] = positions[r]!;
      positions[r] = t;
    }
    return positions;
  }
  if (count === 5) {
    const j = () => (Math.random() - 0.5) * 3;
    const positions = [
      { x: Math.round(12 + j()), y: Math.round(6 + j()) },
      { x: Math.round(44 + j()), y: Math.round(8 + j()) },
      { x: Math.round(6 + j()), y: Math.round(53 + j()) },
      { x: Math.round(38 + j()), y: Math.round(53 + j()) },
      { x: Math.round(70 + j()), y: Math.round(51 + j()) },
    ];
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

  const yMin = 5;
  const yMax = nRows === 2 ? 53 : nRows === 3 ? 70 : 80;
  const stepY = nRows > 1 ? (yMax - yMin) / (nRows - 1) : 0;

  const slots: Array<{ x: number; y: number }> = [];
  for (let r = 0; r < nRows; r++) {
    const cCnt = rowCounts[r] ?? 0;
    if (cCnt <= 0) continue;

    const baseY = yMin + r * stepY;
    // Row 0 avoids landlord at top-right (x > 70)
    const xLimit = r === 0 ? 50 : 74;
    // Stagger odd/even rows slightly for a pleasant neighborhood feel
    const xStart = r % 2 === 0 ? 6 : 14;

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

export interface BuildingDimensions {
  w: number;
  h: number;
}

export const DEFAULT_BUILDING_DIMENSIONS: BuildingDimensions = {
  w: 14,
  h: 20,
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

export interface BuildingPositionUpdate {
  id: string;
  x: number;
  y: number;
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
