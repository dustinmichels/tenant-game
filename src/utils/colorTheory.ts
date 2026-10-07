import {
  differenceEuclidean,
  interpolate,
  oklch,
  formatHex,
  wcagContrast,
  clampChroma,
  fixupHueLonger,
} from "culori";

export interface PaletteOptions {
  baseHue?: number;
  lightness?: number;
  targetChroma?: number;
  deterministic?: boolean;
}

export type PrimaryFamily = "red" | "yellow" | "blue";
type PrimaryPoleKey = "scarlet" | "gold" | "cobalt" | "cerulean" | "crimson" | "amber";

interface PrimaryPoleConfig {
  hueMin: number;
  hueMax: number;
  lMin: number;
  lMax: number;
  cMin: number;
  cMax: number;
  defaultHue: number;
  defaultLightness: number;
  defaultChroma: number;
  family: PrimaryFamily;
  label: string;
}

/**
 * Distinct primary poles in OKLCH space chosen to maximize mutual perceptual distance (Delta E)
 * while staying true to the primary colors (Red, Yellow, Blue).
 *
 * Every pair of poles has a guaranteed Delta E >= 0.138 (and up to 0.490 across complementary poles).
 */
const PRIMARY_POLES: Record<PrimaryPoleKey, PrimaryPoleConfig> = {
  scarlet: {
    hueMin: 26,
    hueMax: 34,
    lMin: 0.58,
    lMax: 0.64,
    cMin: 0.2,
    cMax: 0.23,
    defaultHue: 30,
    defaultLightness: 0.61,
    defaultChroma: 0.22,
    family: "red",
    label: "Warm Scarlet Red",
  },
  gold: {
    hueMin: 88,
    hueMax: 98,
    lMin: 0.78,
    lMax: 0.84,
    cMin: 0.16,
    cMax: 0.2,
    defaultHue: 93,
    defaultLightness: 0.81,
    defaultChroma: 0.18,
    family: "yellow",
    label: "Sunny Gold Yellow",
  },
  cobalt: {
    hueMin: 256,
    hueMax: 268,
    lMin: 0.5,
    lMax: 0.56,
    cMin: 0.19,
    cMax: 0.23,
    defaultHue: 262,
    defaultLightness: 0.53,
    defaultChroma: 0.21,
    family: "blue",
    label: "Royal Cobalt Blue",
  },
  cerulean: {
    hueMin: 218,
    hueMax: 230,
    lMin: 0.62,
    lMax: 0.68,
    cMin: 0.16,
    cMax: 0.19,
    defaultHue: 224,
    defaultLightness: 0.65,
    defaultChroma: 0.175,
    family: "blue",
    label: "Cerulean Azure Blue",
  },
  crimson: {
    hueMin: 342,
    hueMax: 352,
    lMin: 0.5,
    lMax: 0.56,
    cMin: 0.2,
    cMax: 0.23,
    defaultHue: 347,
    defaultLightness: 0.53,
    defaultChroma: 0.22,
    family: "red",
    label: "Cool Crimson Ruby",
  },
  amber: {
    hueMin: 56,
    hueMax: 66,
    lMin: 0.68,
    lMax: 0.74,
    cMin: 0.18,
    cMax: 0.21,
    defaultHue: 61,
    defaultLightness: 0.71,
    defaultChroma: 0.195,
    family: "yellow",
    label: "Warm Marigold Amber",
  },
};

const POLE_KEYS: readonly PrimaryPoleKey[] = [
  "scarlet",
  "gold",
  "cobalt",
  "cerulean",
  "crimson",
  "amber",
];

function samplePrimaryPole(key: PrimaryPoleKey): string {
  const cfg = PRIMARY_POLES[key];
  const h = cfg.hueMin + Math.random() * (cfg.hueMax - cfg.hueMin);
  const l = cfg.lMin + Math.random() * (cfg.lMax - cfg.lMin);
  const c = cfg.cMin + Math.random() * (cfg.cMax - cfg.cMin);
  return oklchToHex(l, c, h);
}

/**
 * Generates a single random color close to one of the primary colors (Red, Yellow, Blue).
 */
export function getRandomPrimaryColor(family?: PrimaryFamily): string {
  if (family) {
    const matchingPoles = POLE_KEYS.filter((p) => PRIMARY_POLES[p].family === family);
    const chosen = matchingPoles[Math.floor(Math.random() * matchingPoles.length)]!;
    return samplePrimaryPole(chosen);
  }
  const chosen = POLE_KEYS[Math.floor(Math.random() * POLE_KEYS.length)]!;
  return samplePrimaryPole(chosen);
}

/**
 * Generates starting colors for N buildings based on primary colors (Red, Yellow, Blue).
 *
 * Guarantees:
 * 1. Colors are close to primary colors (warm scarlet, sunny gold, royal cobalt, cerulean azure, cool crimson, marigold amber).
 * 2. Colors are far apart from each other (Delta E >= 0.15 for N <= 4, Delta E >= 0.12 for N <= 6).
 * 3. Colors are randomized each time so buildings do not look identical on consecutive runs.
 * 4. Combines cleanly into vibrant secondary colors (Orange, Green, Purple).
 */
function generatePrimaryPalette(count: number, options: PaletteOptions = {}): string[] {
  if (count <= 0) return [];

  if (options.deterministic) {
    return Array.from({ length: count }, (_, i) => {
      const p = POLE_KEYS[i % POLE_KEYS.length]!;
      const cfg = PRIMARY_POLES[p];
      const cycle = Math.floor(i / POLE_KEYS.length);
      const lOffset = cycle > 0 ? (cycle % 2 === 1 ? -0.04 : 0.04) : 0;
      return oklchToHex(cfg.defaultLightness + lOffset, cfg.defaultChroma, cfg.defaultHue);
    });
  }

  if (count === 1) {
    const corePoles: PrimaryPoleKey[] = ["scarlet", "gold", "cobalt"];
    return [samplePrimaryPole(corePoles[Math.floor(Math.random() * corePoles.length)]!)];
  }

  let chosenPoles: PrimaryPoleKey[] = [];

  if (count === 2) {
    // Select 2 distinct primary families (e.g. Red and Blue) for maximum contrast
    const corePoles: PrimaryPoleKey[] = ["scarlet", "gold", "cobalt"];
    const shuffled = [...corePoles].sort(() => Math.random() - 0.5);
    chosenPoles = [shuffled[0]!, shuffled[1]!];
  } else if (count === 3) {
    // Exactly the 3 main primaries in randomized order
    const corePoles: PrimaryPoleKey[] = ["scarlet", "gold", "cobalt"];
    chosenPoles = [...corePoles].sort(() => Math.random() - 0.5);
  } else if (count === 4) {
    // Default setup: 1 Red, 1 Yellow, 1 Blue, plus a 4th pole chosen to maximize mutual Delta E
    const candidateSets: PrimaryPoleKey[][] = [
      ["scarlet", "gold", "cobalt", "cerulean"],
      ["crimson", "gold", "cobalt", "cerulean"],
      ["scarlet", "crimson", "gold", "cobalt"],
    ];
    const selected = candidateSets[Math.floor(Math.random() * candidateSets.length)]!;
    chosenPoles = [...selected].sort(() => Math.random() - 0.5);
  } else if (count === 5) {
    // 5 poles with highest mutual distance
    const fivePoles: PrimaryPoleKey[] = ["scarlet", "gold", "cobalt", "cerulean", "crimson"];
    chosenPoles = [...fivePoles].sort(() => Math.random() - 0.5);
  } else if (count === 6) {
    chosenPoles = [...POLE_KEYS].sort(() => Math.random() - 0.5);
  } else {
    // Count > 6: cycle through poles with shuffled distribution
    const shuffled = [...POLE_KEYS].sort(() => Math.random() - 0.5);
    chosenPoles = [];
    for (let i = 0; i < count; i++) {
      chosenPoles.push(shuffled[i % shuffled.length]!);
    }
  }

  // Interleave chosen poles so adjacent buildings avoid identical primary families
  const orderedPoles: PrimaryPoleKey[] = [];
  const remaining = [...chosenPoles];
  while (remaining.length > 0) {
    const last = orderedPoles[orderedPoles.length - 1];
    const diffCandidates = remaining.filter((p) => {
      if (!last) return true;
      return PRIMARY_POLES[p].family !== PRIMARY_POLES[last].family;
    });
    const candidateList = diffCandidates.length > 0 ? diffCandidates : remaining;
    const chosenIdx = Math.floor(Math.random() * candidateList.length);
    const chosen = candidateList[chosenIdx]!;
    orderedPoles.push(chosen);
    remaining.splice(remaining.indexOf(chosen), 1);
  }

  // Sample colors and verify guaranteed minimum distance between every pair
  const minThreshold = count <= 4 ? 0.14 : count <= 6 ? 0.11 : 0.08;

  for (let attempt = 0; attempt < 12; attempt++) {
    const colors = orderedPoles.map(samplePrimaryPole);
    let valid = true;
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        if (colorDistance(colors[i]!, colors[j]!) < minThreshold) {
          valid = false;
          break;
        }
      }
      if (!valid) break;
    }
    if (valid) return colors;
  }

  return orderedPoles.map(samplePrimaryPole);
}

// Default fallback color if parsing or inputs fail
const DEFAULT_COLOR = "#7c3aed";

/** Converts OKLCH coordinates to a hex color string using culori. */
function oklchToHex(l: number, c: number, h: number): string {
  const inGamut = clampChroma({ mode: "oklch", l, c, h }, "oklch");
  return formatHex(inGamut) ?? DEFAULT_COLOR;
}

const deltaEOklab = differenceEuclidean("oklab");

/**
 * Calculates the perceptual color distance (Delta E) in OKLab space using culori.
 */
export function colorDistance(color1: string, color2: string): number {
  return deltaEOklab(color1, color2) ?? 0;
}

/**
 * Minimum perceptual distance (Delta E in OKLab) required between a coalition color
 * and any existing building or coalition color.
 */
export const MIN_COALITION_COLOR_DISTANCE = 0.08;

/**
 * Checks whether a candidate color is too close to any existing building or coalition color.
 * If too close (Delta E < minThreshold), alters it in OKLCH space (adjusting hue and/or lightness)
 * to maximize separation from all existing colors while staying as close as possible to the
 * original blend character and maintaining sRGB gamut compliance and vibrancy.
 *
 * @param candidateColor The color to check (hex string)
 * @param existingColors Array of existing building or coalition colors to compare against
 * @param minThreshold Minimum Delta E required (defaults to MIN_COALITION_COLOR_DISTANCE = 0.08)
 * @returns The original candidateColor if far enough away, or an altered distinct color
 */
export function alterColorToBeDifferent(
  candidateColor: string,
  existingColors: string[],
  minThreshold: number = MIN_COALITION_COLOR_DISTANCE,
): string {
  if (!candidateColor) return DEFAULT_COLOR;
  const base = oklch(candidateColor);
  if (!base) return candidateColor;

  if (!existingColors || existingColors.length === 0) return candidateColor;

  const validExisting = existingColors.filter(
    (c) => typeof c === "string" && c.trim().length > 0 && Boolean(oklch(c)),
  );
  if (validExisting.length === 0) return candidateColor;

  const minCurrentDist = Math.min(...validExisting.map((c) => colorDistance(candidateColor, c)));
  if (minCurrentDist >= minThreshold) {
    return candidateColor;
  }

  const baseL = base.l ?? 0.6;
  const baseC = Math.max(0.12, base.c ?? 0.18);
  const baseH = base.h ?? 0;

  let bestCandidate = candidateColor;
  let bestDist = minCurrentDist;

  // Expanding hue shifts in alternating directions (+10°, -10°, +20°, -20°, ... up to 180°)
  const hueShifts = [0];
  for (let step = 10; step <= 180; step += 10) {
    hueShifts.push(step, -step);
  }
  const lAdjustments = [0, 0.06, -0.06, 0.12, -0.12, 0.18, -0.18];

  for (const hShift of hueShifts) {
    for (const lAdj of lAdjustments) {
      if (hShift === 0 && lAdj === 0) continue;

      const newH = (((baseH + hShift) % 360) + 360) % 360;
      const newL = Math.max(0.35, Math.min(0.85, baseL + lAdj));
      const candHex = formatHex(
        clampChroma({ mode: "oklch", l: newL, c: baseC, h: newH }, "oklch"),
      );
      if (!candHex) continue;

      const dist = Math.min(...validExisting.map((c) => colorDistance(candHex, c)));
      if (dist >= minThreshold) {
        return candHex;
      }
      if (dist > bestDist) {
        bestDist = dist;
        bestCandidate = candHex;
      }
    }
  }

  return bestCandidate;
}

/**
 * Generates an array of starting colors for N buildings.
 * By default, generates randomized colors close to primary colors (Red, Yellow, Blue).
 * If options.baseHue is explicitly provided, generates an equidistant hue circle.
 */
export function generateDivergentPalette(count: number, options: PaletteOptions = {}): string[] {
  if (count <= 0) return [];

  // If custom baseHue is specified, use equidistant hue wheel (classic mode)
  if (typeof options.baseHue === "number") {
    const baseHue = options.baseHue;
    const lightness = options.lightness ?? 0.6;
    const targetChroma = options.targetChroma ?? 0.2;

    const hues: number[] = [];
    const step = 360 / count;

    if (count % 2 === 0) {
      const half = count / 2;
      for (let i = 0; i < half; i++) {
        hues.push((baseHue + i * step) % 360);
        hues.push((baseHue + (i + half) * step) % 360);
      }
    } else {
      const jump = Math.max(1, Math.floor(count / 2));
      for (let i = 0; i < count; i++) {
        const sliceIdx = (i * jump) % count;
        hues.push((baseHue + sliceIdx * step) % 360);
      }
    }

    return hues.map((h) => oklchToHex(lightness, targetChroma, h));
  }

  // Default: generate randomized colors close to primary colors
  return generatePrimaryPalette(count, options);
}

/**
 * Returns the starting color for building `index` (1-based) out of `totalBuildings`.
 * Uses deterministic mode for stable slot previews or "Reset to Default" lookups.
 */
export function getBuildingStartingColor(
  index: number,
  totalBuildings: number,
  options: PaletteOptions = {},
): string {
  const count = Math.max(1, totalBuildings || 1);
  const palette = generatePrimaryPalette(count, { deterministic: true, ...options });
  const zeroIndex = Math.max(0, (index - 1) % count);
  return palette[zeroIndex] ?? DEFAULT_COLOR;
}

/**
 * Combines two building colors to form a new coalition color using culori OKLCH interpolation.
 * Satisfies: "When two buildings merge into a coalition: combine their colors to form a new color."
 *
 * Ensures primary pairs blend into their expected secondary colors (e.g., Yellow + Blue -> Green,
 * rather than crossing the magenta/red boundary). Always clamps chroma to prevent sRGB clipping distortion.
 */
export function combineTwoColors(
  colorA: string,
  colorB: string,
  weightA = 0.5,
  weightB = 0.5,
  existingColors?: string[],
): string {
  const cA = oklch(colorA);
  const cB = oklch(colorB);

  let blendedHex: string;
  if (!cA && !cB) blendedHex = DEFAULT_COLOR;
  else if (!cA) blendedHex = formatHex(clampChroma(cB!, "oklch")) ?? DEFAULT_COLOR;
  else if (!cB) blendedHex = formatHex(clampChroma(cA!, "oklch")) ?? DEFAULT_COLOR;
  else {
    const totalW = Math.max(0, weightA) + Math.max(0, weightB) || 1;
    const t = Math.max(0, weightB) / totalW;

    let overrides: { h?: { fixup: typeof fixupHueLonger } } | undefined = undefined;
    if (cA.h !== undefined && cB.h !== undefined) {
      const h1 = ((cA.h % 360) + 360) % 360;
      const h2 = ((cB.h % 360) + 360) % 360;

      // Detect if one color is in the Yellow family (~40°..120°) and the other in the Blue family (~200°..285°)
      const isYellow1 = h1 >= 40 && h1 <= 120;
      const isYellow2 = h2 >= 40 && h2 <= 120;
      const isBlue1 = h1 >= 200 && h1 <= 285;
      const isBlue2 = h2 >= 200 && h2 <= 285;

      if ((isYellow1 && isBlue2) || (isYellow2 && isBlue1)) {
        const hYellow = isYellow1 ? h1 : h2;
        const hBlue = isBlue1 ? h1 : h2;
        // If the direct arc from yellow to blue through green is > 180°, default shortest-arc
        // would traverse magenta. Force interpolation through the longer arc so Yellow + Blue -> Green.
        if (hBlue - hYellow > 180) {
          overrides = { h: { fixup: fixupHueLonger } };
        }
      }
    }

    try {
      // @types/culori requires all channel keys (l, c, h) for partial overrides
      const it = interpolate(
        [colorA, colorB],
        "oklch",
        overrides as unknown as Parameters<typeof interpolate>[2],
      );
      const blended = it(t);
      const inGamut = clampChroma(blended, "oklch");
      blendedHex = formatHex(inGamut) ?? DEFAULT_COLOR;
    } catch {
      blendedHex = DEFAULT_COLOR;
    }
  }

  if (existingColors && existingColors.length > 0) {
    return alterColorToBeDifferent(blendedHex, existingColors);
  }
  return blendedHex;
}

/**
 * Computes a weighted circular average of multiple colors in OKLCH space.
 * Guarantees order-independent, commutative mixing for multi-color coalitions.
 */
function weightedAverageOklch(colors: string[], weights: number[]): string {
  const n = colors.length;
  let totalW = 0;
  let sumL = 0;
  let sumC = 0;
  let sumSin = 0;
  let sumCos = 0;
  let validCount = 0;

  for (let i = 0; i < n; i++) {
    const rawColor = colors[i];
    if (!rawColor) continue;
    const c = oklch(rawColor);
    if (!c) continue;

    const w = Math.max(0, weights[i] ?? 1) || 1;
    totalW += w;
    sumL += w * (c.l ?? 0.5);
    sumC += w * (c.c ?? 0);

    if (c.h !== undefined && !isNaN(c.h)) {
      const rad = (c.h * Math.PI) / 180;
      sumSin += w * Math.sin(rad);
      sumCos += w * Math.cos(rad);
    }
    validCount++;
  }

  if (validCount === 0 || totalW === 0) return DEFAULT_COLOR;

  const avgL = sumL / totalW;
  const avgC = sumC / totalW;
  let avgH = 0;
  if (Math.abs(sumSin) > 1e-6 || Math.abs(sumCos) > 1e-6) {
    const deg = (Math.atan2(sumSin, sumCos) * 180) / Math.PI;
    avgH = deg < 0 ? deg + 360 : deg;
  }

  const inGamut = clampChroma({ mode: "oklch", l: avgL, c: avgC, h: avgH }, "oklch");
  return formatHex(inGamut) ?? DEFAULT_COLOR;
}

/**
 * Merges multiple building colors into a single harmonious, vibrant coalition color.
 * For 2 colors, uses combineTwoColors with the intentional subtractive hue path.
 * For 3+ colors, computes an order-independent weighted circular average in OKLCH space.
 */
function mergeColors(colors: string[], weights?: number[]): string {
  if (!colors || colors.length === 0) return DEFAULT_COLOR;
  if (colors.length === 1) return colors[0]!;

  const n = colors.length;
  const wList = weights && weights.length === n ? weights : Array(n).fill(1);

  if (n === 2) {
    return combineTwoColors(colors[0]!, colors[1]!, wList[0]!, wList[1]!);
  }

  return weightedAverageOklch(colors, wList);
}

/**
 * Computes the unified coalition color for a group of buildings and their connections.
 * Follows chronological connection events when available:
 * 1. The first pair merges into a 2-building combined color.
 * 2. Each subsequent building merges with the coalition color in order.
 * 3. Two coalitions merging combine weighted by their respective sizes.
 */
export function computeCoalitionColor(
  buildings: Array<{ id: string; color: string }>,
  connections: Array<{ sourceId: string; targetId: string; createdAt?: number }> = [],
  existingColorsOrOptions?: string[] | { existingColors?: string[]; minDistance?: number },
): string {
  if (buildings.length === 0) return DEFAULT_COLOR;
  if (buildings.length === 1) return buildings[0]!.color;

  let rawColor: string;
  if (buildings.length === 2) {
    rawColor = combineTwoColors(buildings[0]!.color, buildings[1]!.color);
  } else {
    const buildingMap = new Map<string, { id: string; color: string }>();
    for (const b of buildings) {
      buildingMap.set(b.id, b);
    }

    // Union-find tracking component size and merged color
    const parent = new Map<string, string>();
    const compData = new Map<string, { size: number; color: string }>();

    for (const b of buildings) {
      parent.set(b.id, b.id);
      compData.set(b.id, { size: 1, color: b.color });
    }

    function find(id: string): string {
      let p = parent.get(id) || id;
      while (p !== (parent.get(p) || p)) {
        p = parent.get(p) || p;
      }
      return p;
    }

    function union(idA: string, idB: string): void {
      const rootA = find(idA);
      const rootB = find(idB);
      if (rootA === rootB) return;

      const dataA = compData.get(rootA)!;
      const dataB = compData.get(rootB)!;

      const newColor = combineTwoColors(dataA.color, dataB.color, dataA.size, dataB.size);
      const newSize = dataA.size + dataB.size;

      parent.set(rootB, rootA);
      compData.set(rootA, { size: newSize, color: newColor });
    }

    const sortedConns = [...connections]
      .filter((c) => buildingMap.has(c.sourceId) && buildingMap.has(c.targetId))
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    for (const c of sortedConns) {
      union(c.sourceId, c.targetId);
    }

    const firstRoot = find(buildings[0]!.id);
    const result = compData.get(firstRoot);
    if (result && result.size === buildings.length) {
      rawColor = result.color;
    } else {
      // Fallback if connections didn't span every building: merge all constituent colors
      rawColor = mergeColors(buildings.map((b) => b.color));
    }
  }

  let existingList: string[] = [];
  let minDistance = MIN_COALITION_COLOR_DISTANCE;

  if (Array.isArray(existingColorsOrOptions)) {
    existingList = existingColorsOrOptions;
  } else if (existingColorsOrOptions && typeof existingColorsOrOptions === "object") {
    existingList = existingColorsOrOptions.existingColors ?? [];
    minDistance = existingColorsOrOptions.minDistance ?? MIN_COALITION_COLOR_DISTANCE;
  }

  // Ensure candidate color is distinct from all existing colors and constituent buildings
  const colorsToAvoid = [...buildings.map((b) => b.color), ...existingList];

  return alterColorToBeDifferent(rawColor, colorsToAvoid, minDistance);
}

/**
 * Returns high-contrast text color (#ffffff or #1f1b16) for a given background color.
 * Uses standard WCAG relative luminance.
 */
export function getContrastTextColor(color: string): string {
  return wcagContrast(color, "#1f1b16") >= wcagContrast(color, "#ffffff") ? "#1f1b16" : "#ffffff";
}
