import type { Building, CoalitionConnection, CoalitionGroup } from "../types/game";
import { BUILDING_COLORS } from "../types/game";
import { computeCoalitionColor, getBuildingStartingColor } from "./colorTheory";

export function getBuildingColor(index: number, totalBuildings?: number): string {
  if (typeof totalBuildings === "number" && totalBuildings > 0) {
    return getBuildingStartingColor(index, totalBuildings);
  }
  const zeroIndex = Math.max(0, index - 1);
  const color = BUILDING_COLORS[zeroIndex];
  if (color) {
    return color;
  }
  return getBuildingStartingColor(index, Math.max(12, index));
}

/**
 * Returns the effective number of people counted in the union for a building.
 *
 * Counting unions rule (2 people needed):
 * - Standalone building: requires at least 2 people in the building in the union (>= 2).
 *   If only 1 person, returns 0.
 * - Coalition: if the total active union members across connected buildings >= 2,
 *   it counts as a union with 2+ people (e.g., two buildings with 1 person each count as a union with 2 people).
 *   Each member building then contributes its active members.
 */
export function getBuildingUnionCount(
  building: Building,
  coalitionOrContext?: CoalitionGroup | CoalitionGroup[] | CoalitionConnection[],
  allBuildings?: Building[],
): number {
  if (!building.tenants || building.tenants.length === 0) return 0;
  const activeMembers = building.tenants.filter(
    (t) => (t.inUnion || t.isInstigator) && !t.isEvicted,
  ).length;

  // Standalone building rule: 2 people needed to count as a union
  if (!coalitionOrContext || typeof coalitionOrContext !== "object") {
    return activeMembers >= 2 ? activeMembers : 0;
  }

  // If a single CoalitionGroup is passed:
  if (!Array.isArray(coalitionOrContext)) {
    if ("buildingIds" in coalitionOrContext && Array.isArray(coalitionOrContext.buildingIds)) {
      if (coalitionOrContext.buildingIds.includes(building.id)) {
        return coalitionOrContext.totalUnionCount >= 2 ? activeMembers : 0;
      }
    }
    return activeMembers >= 2 ? activeMembers : 0;
  }

  // If an array is passed:
  if (coalitionOrContext.length === 0) {
    return activeMembers >= 2 ? activeMembers : 0;
  }

  const first = coalitionOrContext[0];
  if (first && "buildingIds" in first) {
    const groups = coalitionOrContext as CoalitionGroup[];
    const group = groups.find((g) => g.buildingIds.includes(building.id));
    if (group) {
      return group.totalUnionCount >= 2 ? activeMembers : 0;
    }
    return activeMembers >= 2 ? activeMembers : 0;
  }

  // Array of CoalitionConnection:
  const connections = coalitionOrContext as CoalitionConnection[];
  const buildingsToUse = allBuildings && allBuildings.length > 0 ? allBuildings : [building];
  const groups = computeCoalitionGroups(buildingsToUse, connections);
  const group = groups.find((g) => g.buildingIds.includes(building.id));
  if (group) {
    return group.totalUnionCount >= 2 ? activeMembers : 0;
  }
  return activeMembers >= 2 ? activeMembers : 0;
}

/**
 * Returns the total union count across all given buildings, taking into account
 * coalition groups or connections if provided.
 */
export function getTotalUnionCount(
  buildings: Building[],
  coalitions?: CoalitionGroup[] | CoalitionConnection[],
): number {
  return buildings.reduce((sum, b) => sum + getBuildingUnionCount(b, coalitions, buildings), 0);
}

/**
 * Returns the number of tenants who are in a union AND whose building is in a coalition.
 *
 * Rule:
 * If people are in the union for buildings that are in a coalition, they count towards both
 * the union count and the coalition count.
 * If someone is in a union but their building is not in a coalition with any others,
 * they only count towards the union count.
 */
export function getCoalitionUnionCount(
  buildings: Building[],
  coalitions?: CoalitionGroup[] | CoalitionConnection[],
): number {
  if (!buildings || buildings.length === 0) return 0;

  const groups: CoalitionGroup[] =
    Array.isArray(coalitions) && coalitions.length > 0
      ? "buildingIds" in (coalitions[0] ?? {})
        ? (coalitions as CoalitionGroup[])
        : computeCoalitionGroups(buildings, coalitions as CoalitionConnection[])
      : [];

  if (groups.length === 0) return 0;

  const coalitionBuildingIds = new Set<string>();
  for (const g of groups) {
    if (Array.isArray(g.buildingIds)) {
      for (const id of g.buildingIds) {
        coalitionBuildingIds.add(id);
      }
    }
  }

  return buildings.reduce((sum, b) => {
    if (!coalitionBuildingIds.has(b.id)) return sum;
    return sum + getBuildingUnionCount(b, groups, buildings);
  }, 0);
}

/**
 * Returns the number of buildings that belong to a coalition.
 */
export function getCoalitionBuildingCount(
  buildings: Building[],
  coalitions?: CoalitionGroup[] | CoalitionConnection[],
): number {
  if (!buildings || buildings.length === 0) return 0;

  const groups: CoalitionGroup[] =
    Array.isArray(coalitions) && coalitions.length > 0
      ? "buildingIds" in (coalitions[0] ?? {})
        ? (coalitions as CoalitionGroup[])
        : computeCoalitionGroups(buildings, coalitions as CoalitionConnection[])
      : [];

  if (groups.length === 0) return 0;

  const coalitionBuildingIds = new Set<string>();
  for (const g of groups) {
    if (Array.isArray(g.buildingIds)) {
      for (const id of g.buildingIds) {
        coalitionBuildingIds.add(id);
      }
    }
  }

  return buildings.filter((b) => coalitionBuildingIds.has(b.id)).length;
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

    // Compute combined coalition color using color theory (2 merge -> new color, 3rd merges again)
    const coalitionColor = computeCoalitionColor(componentBuildings, connections);

    // Sum active union members across all buildings in this coalition component
    const buildingActiveCounts: Record<string, number> = {};
    let componentActiveSum = 0;
    for (const cb of componentBuildings) {
      const active = cb.tenants
        ? cb.tenants.filter((t) => (t.inUnion || t.isInstigator) && !t.isEvicted).length
        : 0;
      buildingActiveCounts[cb.id] = active;
      componentActiveSum += active;
    }

    // Counting unions rule (2 people needed):
    // A coalition counts as a union if total active members across the coalition >= 2.
    // (e.g. if two buildings each have 1 person, forming a coalition counts as a union with 2 people).
    const isUnionFormed = componentActiveSum >= 2;
    const totalUnionCount = isUnionFormed ? componentActiveSum : 0;

    let bestCount = -1;
    let bestLeadBuilding: Building = firstBuilding;

    if (isUnionFormed) {
      for (const cb of componentBuildings) {
        const count = buildingActiveCounts[cb.id] ?? 0;
        if (count > bestCount) {
          bestCount = count;
          bestLeadBuilding = cb;
        } else if (count === bestCount && cb.index < bestLeadBuilding.index) {
          bestLeadBuilding = cb;
        }
      }
    }

    // If no active union members or tie-breaking fallback needed
    if (bestCount <= 0) {
      let fallbackMax = -1;
      for (const cb of componentBuildings) {
        const totalUnion = cb.tenants
          ? cb.tenants.filter((t) => t.inUnion || t.isInstigator).length
          : 0;
        if (totalUnion > fallbackMax) {
          fallbackMax = totalUnion;
          bestLeadBuilding = cb;
        } else if (totalUnion === fallbackMax && cb.index < bestLeadBuilding.index) {
          bestLeadBuilding = cb;
        }
      }
      if (fallbackMax <= 0) {
        // Fallback to building with more tenants, then lowest index
        let maxTenants = -1;
        for (const cb of componentBuildings) {
          const tLen = cb.tenants?.length ?? 0;
          if (tLen > maxTenants) {
            maxTenants = tLen;
            bestLeadBuilding = cb;
          } else if (tLen === maxTenants && cb.index < bestLeadBuilding.index) {
            bestLeadBuilding = cb;
          }
        }
      }
    }

    const sortedIds = [...componentBuildingIds].sort();
    groups.push({
      id: `coalition-${sortedIds.join("-")}`,
      buildingIds: sortedIds,
      dominantColor: coalitionColor,
      coalitionColor,
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

export function isBuildingOrganized(
  building: Building,
  coalitionOrContext?: CoalitionGroup | CoalitionGroup[] | CoalitionConnection[] | unknown,
  allBuildings?: Building[],
): boolean {
  if (!building.tenants || building.tenants.length === 0) return false;
  const context =
    coalitionOrContext && typeof coalitionOrContext === "object"
      ? (coalitionOrContext as CoalitionGroup | CoalitionGroup[] | CoalitionConnection[])
      : undefined;
  return getBuildingUnionCount(building, context, allBuildings) > 0;
}
