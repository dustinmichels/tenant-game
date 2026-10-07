/**
 * Color utilities for building and coalition visual representations.
 * Powered by culori color math via colorTheory.
 */
import { mergeColors, DEFAULT_COLOR } from "./colorTheory";

export * from "./colorTheory";

/**
 * Blends multiple color strings using OKLCH coalition color merging.
 */
export function blendHexColors(colors: string[]): string {
  if (!colors || colors.length === 0) return DEFAULT_COLOR;
  if (colors.length === 1) return colors[0]!;
  return mergeColors(colors);
}
