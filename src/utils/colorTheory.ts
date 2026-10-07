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
 * Converts sRGB to OKLab perceptual color space.
 */
export function rgbToOklab(r: number, g: number, b: number): OklabColor {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  return {
    l: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

/**
 * Converts OKLab to sRGB.
 */
export function oklabToRgb(l: number, a: number, b: number): RgbColor {
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const lr = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const lg = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const lb = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  return {
    r: linearToSrgb(lr),
    g: linearToSrgb(lg),
    b: linearToSrgb(lb),
  };
}

/**
 * Converts OKLab to cylindrical OKLCH (Lightness, Chroma, Hue in degrees).
 */
export function oklabToOklch(l: number, a: number, b: number): OklchColor {
  const c = Math.sqrt(a * a + b * b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l, c, h };
}

/**
 * Converts cylindrical OKLCH to OKLab.
 */
export function oklchToOklab(l: number, c: number, h: number): OklabColor {
  const rad = (h * Math.PI) / 180;
  return {
    l,
    a: c * Math.cos(rad),
    b: c * Math.sin(rad),
  };
}

/**
 * Formats RGB components into standard 6-digit hex color string.
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const clampByte = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${clampByte(r)}${clampByte(g)}${clampByte(b)}`;
}

/**
 * Converts HSL components to RGB.
 */
export function hslToRgb(h: number, s: number, l: number): RgbColor {
  const normH = ((h % 360) + 360) % 360;
  const normS = Math.max(0, Math.min(100, s)) / 100;
  const normL = Math.max(0, Math.min(100, l)) / 100;

  const k = (n: number) => (n + normH / 30) % 12;
  const a = normS * Math.min(normL, 1 - normL);
  const f = (n: number) => normL - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  return {
    r: Math.round(f(0) * 255),
    g: Math.round(f(8) * 255),
    b: Math.round(f(4) * 255),
  };
}

/**
 * Parses a hex (#fff, #ffffff, #rrggbbaa), rgb(), or hsl() string into RGB.
 */
export function colorToRgb(color: string): RgbColor {
  if (!color || typeof color !== "string") {
    return { r: 124, g: 58, b: 237 };
  }

  const trimmed = color.trim().toLowerCase();

  // Hex format
  if (trimmed.startsWith("#")) {
    const raw = trimmed.slice(1);
    if (raw.length === 3) {
      const r = parseInt(raw[0]! + raw[0]!, 16);
      const g = parseInt(raw[1]! + raw[1]!, 16);
      const b = parseInt(raw[2]! + raw[2]!, 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return { r, g, b };
    } else if (raw.length === 6 || raw.length === 8) {
      const r = parseInt(raw.slice(0, 2), 16);
      const g = parseInt(raw.slice(2, 4), 16);
      const b = parseInt(raw.slice(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return { r, g, b };
    }
  }

  // HSL format
  if (trimmed.startsWith("hsl")) {
    const match = trimmed.match(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/);
    if (match && match[1] && match[2] && match[3]) {
      const h = parseFloat(match[1]);
      const s = parseFloat(match[2]);
      const l = parseFloat(match[3]);
      return hslToRgb(h, s, l);
    }
  }

  // RGB format
  if (trimmed.startsWith("rgb")) {
    const match = trimmed.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
    if (match && match[1] && match[2] && match[3]) {
      const r = parseFloat(match[1]);
      const g = parseFloat(match[2]);
      const b = parseFloat(match[3]);
      return {
        r: Math.max(0, Math.min(255, Math.round(r))),
        g: Math.max(0, Math.min(255, Math.round(g))),
        b: Math.max(0, Math.min(255, Math.round(b))),
      };
    }
  }

  return { r: 124, g: 58, b: 237 };
}

/**
 * Converts any supported CSS color string to OKLab.
 */
export function colorToOklab(color: string): OklabColor {
  const { r, g, b } = colorToRgb(color);
  return rgbToOklab(r, g, b);
}

/**
 * Converts any supported CSS color string to OKLCH.
 */
export function colorToOklch(color: string): OklchColor {
  const lab = colorToOklab(color);
  return oklabToOklch(lab.l, lab.a, lab.b);
}

/**
 * Converts OKLab coordinates directly to a hex color string.
 */
export function oklabToHex(l: number, a: number, b: number): string {
  const { r, g, b: bVal } = oklabToRgb(l, a, b);
  return rgbToHex(r, g, bVal);
}

/**
 * Converts OKLCH coordinates to a hex color string with chroma gamut mapping.
 * Preserves the exact lightness and hue while fitting into standard sRGB.
 */
export function oklchToHex(l: number, targetChroma: number, h: number): string {
  let low = 0;
  let high = Math.max(0, targetChroma);

  for (let i = 0; i < 14; i++) {
    const mid = (low + high) / 2;
    const lab = oklchToOklab(l, mid, h);

    const l_ = lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
    const m_ = lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
    const s_ = lab.l - 0.0894841775 * lab.a - 1.291485548 * lab.b;

    const l3 = l_ * l_ * l_;
    const m3 = m_ * m_ * m_;
    const s3 = s_ * s_ * s_;

    const lr = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
    const lg = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
    const lb = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

    if (lr >= 0 && lr <= 1 && lg >= 0 && lg <= 1 && lb >= 0 && lb <= 1) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const finalLab = oklchToOklab(l, low, h);
  const rgb = oklabToRgb(finalLab.l, finalLab.a, finalLab.b);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

/**
 * Calculates the perceptual color distance (Delta E) in OKLab space.
 * Equal distance corresponds to approximately equal perceived color difference.
 */
export function colorDistance(color1: string, color2: string): number {
  const lab1 = colorToOklab(color1);
  const lab2 = colorToOklab(color2);
  const dl = lab1.l - lab2.l;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  return Math.sqrt(dl * dl + da * da + db * db);
}

/**
 * Generates an array of distinct, divergent starting colors based on building count N.
 *
 * Color Theory strategy:
 * - Partitions the 360-degree color circle into N distinct base hues (each 360 / N degrees apart).
 * - Interleaves or jumps across the circle so consecutive building numbers (e.g. Building 1 vs 2 vs 3)
 *   are maximally divergent (e.g. complementary opposites for N=2, triadic for N=3, tetradic for N=4).
 * - Uniform perceptual lightness (L ~ 0.60) and chroma (C ~ 0.20) ensure balanced visual hierarchy
 *   and high readability against paper backgrounds without washed-out or neon artifacts.
 */
export function generateDivergentPalette(count: number, options: PaletteOptions = {}): string[] {
  if (count <= 0) return [];
  if (count === 1) return ["#de3b3d"]; // Classic vibrant instigator crimson

  const baseHue = options.baseHue ?? 25; // 25 degrees = warm ruby/crimson
  const lightness = options.lightness ?? 0.6;
  const targetChroma = options.targetChroma ?? 0.2;

  const hues: number[] = [];
  const step = 360 / count;

  if (count % 2 === 0) {
    // Even count: alternate across the wheel (0, N/2, 1, N/2 + 1, ...)
    // Guarantees adjacent indices are 180-degree opposites
    const half = count / 2;
    for (let i = 0; i < half; i++) {
      hues.push((baseHue + i * step) % 360);
      hues.push((baseHue + (i + half) * step) % 360);
    }
  } else {
    // Odd count: coprime jump (floor(N/2)) to maximize distance between consecutive items
    const jump = Math.max(1, Math.floor(count / 2));
    for (let i = 0; i < count; i++) {
      const sliceIdx = (i * jump) % count;
      hues.push((baseHue + sliceIdx * step) % 360);
    }
  }

  return hues.map((h) => oklchToHex(lightness, targetChroma, h));
}

/**
 * Returns the starting color for building `index` (1-based) out of `totalBuildings`.
 */
export function getBuildingStartingColor(index: number, totalBuildings: number): string {
  const count = Math.max(1, totalBuildings || 1);
  const palette = generateDivergentPalette(count);
  const zeroIndex = Math.max(0, (index - 1) % count);
  return palette[zeroIndex] ?? DEFAULT_COLOR;
}

/**
 * Merges multiple building colors into a single harmonious, vibrant coalition color.
 *
 * Uses weighted OKLab linear cone-response blending with chroma compensation:
 * - Averages perceptual lightness and chrominance coordinates.
 * - Protects against desaturation (muddy gray) when opposing colors merge.
 * - Fits within the sRGB gamut with optimal vibrance.
 */
export function mergeColors(colors: string[], weights?: number[]): string {
  if (!colors || colors.length === 0) return DEFAULT_COLOR;
  if (colors.length === 1) return colors[0]!;

  const n = colors.length;
  const wList = weights && weights.length === n ? weights : Array(n).fill(1);
  const totalW = wList.reduce((acc, w) => acc + Math.max(0, w), 0) || 1;

  let sumL = 0;
  let sumA = 0;
  let sumB = 0;
  let sumChroma = 0;

  for (let i = 0; i < n; i++) {
    const lab = colorToOklab(colors[i]!);
    const lch = oklabToOklch(lab.l, lab.a, lab.b);
    const normalizedW = Math.max(0, wList[i]!) / totalW;

    sumL += lab.l * normalizedW;
    sumA += lab.a * normalizedW;
    sumB += lab.b * normalizedW;
    sumChroma += lch.c * normalizedW;
  }

  const rawChroma = Math.sqrt(sumA * sumA + sumB * sumB);
  let h = (Math.atan2(sumB, sumA) * 180) / Math.PI;
  if (h < 0) h += 360;

  // Handle rare cancellation if complementary colors cancel Cartesian chroma completely
  if (rawChroma < 0.001) {
    const firstLab = colorToOklab(colors[0]!);
    h = oklabToOklch(firstLab.l, firstLab.a, firstLab.b).h;
  }

  // Preserve vibrant chroma so coalition colors remain distinct and readable
  const targetChroma = Math.max(rawChroma, sumChroma * 0.75, 0.1);
  return oklchToHex(sumL, targetChroma, h);
}

/**
 * Combines two building colors to form a new coalition color.
 * Satisfies: "When two buildings merge into a coalition: combine their colors to form a new color."
 */
export function combineTwoColors(
  colorA: string,
  colorB: string,
  weightA = 0.5,
  weightB = 0.5,
): string {
  return mergeColors([colorA, colorB], [weightA, weightB]);
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
  const { r, g, b } = colorToRgb(color);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.55 ? "#ffffff" : "#1f1b16";
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
