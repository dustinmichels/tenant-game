import rough from "roughjs";
import type { Options, PathInfo } from "roughjs/bin/core";

export type { Options, PathInfo };

// Shared Rough.js generator instance
export const roughGen = rough.generator();

/**
 * Generate a deterministic integer seed from a string or number.
 * Hash string characters or clamp number to positive integer.
 */
export function createSeed(key: string | number): number {
  if (typeof key === "number") {
    return Math.floor(Math.abs(key)) || 1;
  }
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}
