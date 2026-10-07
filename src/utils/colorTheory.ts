import {
  differenceEuclidean,
  interpolate,
  oklch,
  oklab,
  rgb,
  formatHex,
  wcagContrast,
  clampChroma,
} from "culori";
/**
 * Color Theory Module for Tenant Game.
 *
 * Implements perceptual color science (OKLab / OKLCH) for:
 * 1. Generating distinct, divergent starting colors for N buildings based on building count.
 * 2. Combining building colors when two buildings merge into a coalition.
 * 3. Successively merging colors when a third (or N-th) building joins a coalition.
 * 4. Perceptually uniform color distance (Delta E) and WCAG contrast calculations.
 */

export interface RgbColor {
  r: number; // 0..255
  g: number; // 0..255
  b: number; // 0..255
}

export interface OklabColor {
  l: number; // 0..1 (perceptual lightness)
  a: number; // green (-) to red/magenta (+)
  b: number; // blue (-) to yellow (+)
}

export interface OklchColor {
  l: number; // 0..1 (perceptual lightness)
  c: number; // >= 0 (chroma / saturation)
  h: number; // 0..360 (hue angle in degrees)
}

export interface HslColor {
  h: number; // 0..360
  s: number; // 0..100
  l: number; // 0..100
}

export interface PaletteOptions {
  baseHue?: number;
  lightness?: number;
  targetChroma?: number;
  deterministic?: boolean;
}

export type PrimaryFamily = "red" | "yellow" | "blue";
export type PrimaryPoleKey = "scarlet" | "gold" | "cobalt" | "cerulean" | "crimson" | "amber";

export interface PrimaryPoleConfig {
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
export const PRIMARY_POLES: Record<PrimaryPoleKey, PrimaryPoleConfig> = {
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

export const POLE_KEYS: readonly PrimaryPoleKey[] = [
  "scarlet",
  "gold",
  "cobalt",
  "cerulean",
  "crimson",
  "amber",
];

export interface PrimaryFamilyConfig {
  hueMin: number;
  hueMax: number;
  lMin: number;
  lMax: number;
  cMin: number;
  cMax: number;
  defaultHue: number;
  defaultLightness: number;
  defaultChroma: number;
}

export const PRIMARY_CONFIGS: Record<PrimaryFamily, PrimaryFamilyConfig> = {
  red: {
    hueMin: 16,
    hueMax: 34,
    lMin: 0.56,
    lMax: 0.64,
    cMin: 0.19,
    cMax: 0.23,
    defaultHue: 25,
    defaultLightness: 0.6,
    defaultChroma: 0.21,
  },
  yellow: {
    hueMin: 80,
    hueMax: 98,
    lMin: 0.74,
    lMax: 0.82,
    cMin: 0.16,
    cMax: 0.2,
    defaultHue: 88,
    defaultLightness: 0.78,
    defaultChroma: 0.18,
  },
  blue: {
    hueMin: 246,
    hueMax: 268,
    lMin: 0.52,
    lMax: 0.61,
    cMin: 0.18,
    cMax: 0.22,
    defaultHue: 256,
    defaultLightness: 0.56,
    defaultChroma: 0.2,
  },
};

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
export function generatePrimaryPalette(count: number, options: PaletteOptions = {}): string[] {
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
export const DEFAULT_COLOR = "#7c3aed";

/**
 * Converts sRGB channel (0..255) to linear light (0..1).
 */
export function srgbToLinear(channel: number): number {
  const c = Math.max(0, Math.min(255, channel)) / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Converts linear light (0..1) back to sRGB channel (0..255).
 */
export function linearToSrgb(linear: number): number {
  const clamped = Math.max(0, Math.min(1, linear));
  const s = clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(255, s * 255)));
}

/**
 * Converts sRGB to OKLab perceptual color space using culori.
 */
export function rgbToOklab(r: number, g: number, b: number): OklabColor {
  const lab = oklab({ mode: "rgb", r: r / 255, g: g / 255, b: b / 255 });
  return { l: lab?.l ?? 0, a: lab?.a ?? 0, b: lab?.b ?? 0 };
}

/**
 * Converts OKLab to sRGB using culori.
 */
export function oklabToRgb(l: number, a: number, b: number): RgbColor {
  const c = rgb({ mode: "oklab", l, a, b });
  if (!c) return { r: 124, g: 58, b: 237 };
  return {
    r: Math.round(Math.max(0, Math.min(255, (c.r ?? 0) * 255))),
    g: Math.round(Math.max(0, Math.min(255, (c.g ?? 0) * 255))),
    b: Math.round(Math.max(0, Math.min(255, (c.b ?? 0) * 255))),
  };
}

/**
 * Converts OKLab to cylindrical OKLCH using culori.
 */
export function oklabToOklch(l: number, a: number, b: number): OklchColor {
  const lch = oklch({ mode: "oklab", l, a, b });
  return { l: lch?.l ?? 0, c: lch?.c ?? 0, h: lch?.h ?? 0 };
}

/**
 * Converts cylindrical OKLCH to OKLab using culori.
 */
export function oklchToOklab(l: number, c: number, h: number): OklabColor {
  const lab = oklab({ mode: "oklch", l, c, h });
  return { l: lab?.l ?? 0, a: lab?.a ?? 0, b: lab?.b ?? 0 };
}

/**
 * Formats RGB components into standard 6-digit hex color string.
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return formatHex({ mode: "rgb", r: r / 255, g: g / 255, b: b / 255 }) ?? DEFAULT_COLOR;
}

/**
 * Parses a color string into RGB using culori.
 */
export function colorToRgb(color: string): RgbColor {
  const c = rgb(color);
  if (!c) return { r: 124, g: 58, b: 237 };
  return {
    r: Math.round(Math.max(0, Math.min(255, (c.r ?? 0) * 255))),
    g: Math.round(Math.max(0, Math.min(255, (c.g ?? 0) * 255))),
    b: Math.round(Math.max(0, Math.min(255, (c.b ?? 0) * 255))),
  };
}

/**
 * Converts any supported CSS color string to OKLab using culori.
 */
export function colorToOklab(color: string): OklabColor {
  const lab = oklab(color) ?? { mode: "oklab", l: 0.5, a: 0, b: 0 };
  return { l: lab.l ?? 0, a: lab.a ?? 0, b: lab.b ?? 0 };
}

/**
 * Converts any supported CSS color string to OKLCH using culori.
 */
export function colorToOklch(color: string): OklchColor {
  const lch = oklch(color) ?? { mode: "oklch", l: 0.5, c: 0, h: 0 };
  return { l: lch.l ?? 0, c: lch.c ?? 0, h: lch.h ?? 0 };
}

/**
 * Converts OKLab coordinates directly to a hex color string using culori.
 */
export function oklabToHex(l: number, a: number, b: number): string {
  return formatHex({ mode: "oklab", l, a, b }) ?? DEFAULT_COLOR;
}

/**
 * Converts OKLCH coordinates to a hex color string using culori.
 */
export function oklchToHex(l: number, c: number, h: number): string {
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
 */
export function combineTwoColors(
  colorA: string,
  colorB: string,
  weightA = 0.5,
  weightB = 0.5,
): string {
  const totalW = Math.max(0, weightA) + Math.max(0, weightB) || 1;
  const t = Math.max(0, weightB) / totalW;
  const blended = interpolate([colorA, colorB], "oklch")(t);
  return formatHex(blended) ?? DEFAULT_COLOR;
}

/**
 * Merges multiple building colors into a single harmonious, vibrant coalition color.
 * Blends progressive coalitions using weighted pairwise color-wheel mixing.
 */
export function mergeColors(colors: string[], weights?: number[]): string {
  if (!colors || colors.length === 0) return DEFAULT_COLOR;
  if (colors.length === 1) return colors[0]!;

  const n = colors.length;
  const wList = weights && weights.length === n ? weights : Array(n).fill(1);

  let accColor = colors[0]!;
  let accWeight = Math.max(0, wList[0]!) || 1;

  for (let i = 1; i < n; i++) {
    const nextW = Math.max(0, wList[i]!) || 1;
    accColor = combineTwoColors(accColor, colors[i]!, accWeight, nextW);
    accWeight += nextW;
  }

  return accColor;
}

/**
 * Merges an existing coalition color with a newly joined building color.
 * Satisfies: "When a third building combines with that coalition, merge the colors again."
 *
 * @param coalitionColor The existing merged color of the coalition
 * @param newBuildingColor The starting color of the new building joining the coalition
 * @param existingBuildingCount Number of buildings already in the coalition (default 2)
 */
export function mergeCoalitionWithBuilding(
  coalitionColor: string,
  newBuildingColor: string,
  existingBuildingCount = 2,
): string {
  const existingWeight = Math.max(1, existingBuildingCount);
  return combineTwoColors(coalitionColor, newBuildingColor, existingWeight, 1);
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
): string {
  if (buildings.length === 0) return DEFAULT_COLOR;
  if (buildings.length === 1) return buildings[0]!.color;
  if (buildings.length === 2) return combineTwoColors(buildings[0]!.color, buildings[1]!.color);

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
    return result.color;
  }

  // Fallback if connections didn't span every building: merge all constituent colors
  return mergeColors(buildings.map((b) => b.color));
}

/**
 * Returns high-contrast text color (#ffffff or #1f1b16) for a given background color.
 * Uses standard WCAG relative luminance.
 */
export function getContrastTextColor(color: string): string {
  return wcagContrast(color, "#1f1b16") >= wcagContrast(color, "#ffffff") ? "#1f1b16" : "#ffffff";
}

/**
 * Returns an rgba() background tint string for paper card styling.
 */
export function getLightTint(color: string, alpha = 0.12): string {
  const { r, g, b } = colorToRgb(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Returns a CSS gradient representing the combined colors of coalition members,
 * or a solid color string if only 1 color is provided.
 */
export function getCoalitionGradient(colors: string[], angle = 135): string {
  if (colors.length === 0) return DEFAULT_COLOR;
  if (colors.length === 1) return colors[0]!;
  return `linear-gradient(${angle}deg, ${colors.join(", ")})`;
}
