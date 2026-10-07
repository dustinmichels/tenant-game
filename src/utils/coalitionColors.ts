/**
 * Color utilities for building and coalition visual representations.
 */

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

function hslToRgb(h: number, s: number, l: number): RgbColor {
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
 * Parses a hex (#fff, #ffffff) or hsl(h, s%, l%) string into RGB.
 */
export function colorToRgb(color: string): RgbColor {
  const trimmed = color.trim().toLowerCase();

  // Hex format
  if (trimmed.startsWith("#")) {
    const raw = trimmed.slice(1);
    if (raw.length === 3) {
      const r = parseInt(raw[0]! + raw[0]!, 16);
      const g = parseInt(raw[1]! + raw[1]!, 16);
      const b = parseInt(raw[2]! + raw[2]!, 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        return { r, g, b };
      }
    } else if (raw.length === 6 || raw.length === 8) {
      const r = parseInt(raw.slice(0, 2), 16);
      const g = parseInt(raw.slice(2, 4), 16);
      const b = parseInt(raw.slice(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        return { r, g, b };
      }
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

  // Default fallback violet
  return { r: 124, g: 58, b: 237 };
}

/**
 * Blends multiple color strings (hex or hsl) by averaging their RGB components.
 */
export function blendHexColors(colors: string[]): string {
  if (colors.length === 0) return "#7c3aed";
  if (colors.length === 1) {
    const rgb = colorToRgb(colors[0]!);
    return `#${Math.max(0, Math.min(255, Math.round(rgb.r)))
      .toString(16)
      .padStart(2, "0")}${Math.max(0, Math.min(255, Math.round(rgb.g)))
      .toString(16)
      .padStart(2, "0")}${Math.max(0, Math.min(255, Math.round(rgb.b)))
      .toString(16)
      .padStart(2, "0")}`;
  }

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;

  for (const c of colors) {
    const rgb = colorToRgb(c);
    sumR += rgb.r;
    sumG += rgb.g;
    sumB += rgb.b;
  }

  const count = colors.length;
  const avgR = Math.max(0, Math.min(255, Math.round(sumR / count)))
    .toString(16)
    .padStart(2, "0");
  const avgG = Math.max(0, Math.min(255, Math.round(sumG / count)))
    .toString(16)
    .padStart(2, "0");
  const avgB = Math.max(0, Math.min(255, Math.round(sumB / count)))
    .toString(16)
    .padStart(2, "0");

  return `#${avgR}${avgG}${avgB}`;
}

/**
 * Returns a CSS gradient representing the combined colors of coalition members,
 * or a solid color string if only 1 color is provided.
 */
export function getCoalitionGradient(colors: string[], angle = 135): string {
  if (colors.length === 0) return "#7c3aed";
  if (colors.length === 1) return colors[0]!;
  return `linear-gradient(${angle}deg, ${colors.join(", ")})`;
}

/**
 * Returns an rgba() background tint string for paper card styling.
 */
export function getLightTint(color: string, alpha = 0.12): string {
  const { r, g, b } = colorToRgb(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Returns high-contrast text color (#ffffff or #1f1b16) for a given background color.
 */
export function getContrastTextColor(color: string): string {
  const { r, g, b } = colorToRgb(color);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.55 ? "#ffffff" : "#1f1b16";
}
