import type { GameEvent } from "../types/game";

export function isSpendEventText(text: string): boolean {
  if (!text) return false;
  return /\bspen(?:d|ds|ding|t)\b/i.test(text);
}

export function isSpendEvent(event: GameEvent | { text: string; type?: string }): boolean {
  if (event.type === "spend") return true;
  if (event.type === "earn" || event.type === "general") return false;
  return isSpendEventText(event.text);
}

export function isEarnEventText(text: string): boolean {
  if (!text) return false;
  return /\bearn(?:s|ed|ing)?\b/i.test(text);
}

export function isEarnEvent(event: GameEvent | { text: string; type?: string }): boolean {
  if (event.type === "earn") return true;
  if (event.type === "spend" || event.type === "general") return false;
  return isEarnEventText(event.text);
}

export interface EventTextSegment {
  text: string;
  isBuilding: boolean;
  color?: string;
  buildingId?: string;
}

/**
 * Splits an event text string into segments, identifying building names (e.g., "Building 1", custom labels)
 * and associating them with their effective building color.
 *
 * @param text The event message text
 * @param buildings The current list of buildings
 * @param colorMap Effective color map by building id (e.g. from coalition groups or building.color)
 * @param targetBuildingId Optional building ID that generated this event, to prioritize in matching
 */
export function parseEventSegments(
  text: string,
  buildings: Array<{ id: string; label?: string; index: number; color: string }>,
  colorMap: Record<string, string> = {},
  targetBuildingId?: string,
): EventTextSegment[] {
  if (!text || typeof text !== "string") {
    return [];
  }

  if (!buildings || buildings.length === 0) {
    return [{ text, isBuilding: false }];
  }

  interface Candidate {
    pattern: string;
    buildingId: string;
    color: string;
    isTarget: boolean;
  }

  const candidates: Candidate[] = [];

  for (const b of buildings) {
    const effectiveColor = colorMap[b.id] || b.color;
    const isTarget = b.id === targetBuildingId;

    if (b.label && b.label.trim()) {
      candidates.push({
        pattern: b.label.trim(),
        buildingId: b.id,
        color: effectiveColor,
        isTarget,
      });
    }

    const fallback = `Building ${b.index}`;
    if (!b.label || b.label.trim().toLowerCase() !== fallback.toLowerCase()) {
      candidates.push({
        pattern: fallback,
        buildingId: b.id,
        color: effectiveColor,
        isTarget,
      });
    }
  }

  // Deduplicate patterns (case-insensitive key), keeping target priority if matched
  const patternMap = new Map<string, Candidate>();
  for (const c of candidates) {
    const key = c.pattern.toLowerCase();
    const existing = patternMap.get(key);
    if (!existing || (!existing.isTarget && c.isTarget)) {
      patternMap.set(key, c);
    }
  }

  const sortedCandidates = Array.from(patternMap.values()).sort((a, b) => {
    if (b.pattern.length !== a.pattern.length) {
      return b.pattern.length - a.pattern.length;
    }
    if (a.isTarget && !b.isTarget) return -1;
    if (!a.isTarget && b.isTarget) return 1;
    return 0;
  });

  if (sortedCandidates.length === 0) {
    return [{ text, isBuilding: false }];
  }

  const combinedPattern = sortedCandidates
    .map((c) => c.pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const regex = new RegExp(`(?<![a-zA-Z0-9_])(${combinedPattern})(?![a-zA-Z0-9_])`, "gi");

  const segments: EventTextSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const matchStart = match.index;
    const matchText = match[0];
    const matchEnd = matchStart + matchText.length;

    if (matchStart > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, matchStart),
        isBuilding: false,
      });
    }

    const matchedCandidate = patternMap.get(matchText.toLowerCase());
    const buildingId = matchedCandidate?.buildingId;
    const color = (buildingId && colorMap[buildingId]) || matchedCandidate?.color || "#000000";

    segments.push({
      text: matchText,
      isBuilding: true,
      buildingId,
      color,
    });

    lastIndex = matchEnd;
  }

  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      isBuilding: false,
    });
  }

  return segments;
}
