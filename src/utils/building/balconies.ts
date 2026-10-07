import { roughGen, createSeed, type PathInfo } from "../rough";

/**
 * Deterministic fallback balcony setting for buildings lacking an explicit configuration.
 */
export function getDefaultBuildingHasBalcony(indexOrSeed: number | string): boolean {
  const seed = typeof indexOrSeed === "number" ? Math.abs(indexOrSeed) : createSeed(indexOrSeed);
  return seed % 2 === 1;
}

/**
 * Generates hand-drawn architectural SVG paths for an ornamental window balcony railing.
 * Dimensions: fits directly inside BuildingWindow (viewBox 0 0 36 53).
 * Simple and clean: top rail, bottom rail, side posts, and slender baluster pickets.
 */
export function generateBalconyPaths(
  seed: number,
  stroke: string,
  isOrganized = false,
): PathInfo[] {
  const s = seed;
  const paths: PathInfo[] = [];

  const mainStrokeWidth = isOrganized ? 1.6 : 1.2;
  const detailStrokeWidth = isOrganized ? 1.2 : 0.85;

  // 1. Top handrail across window at y = 37
  const railTop = roughGen.line(1, 37, 35, 37, {
    roughness: 0.25,
    stroke,
    strokeWidth: mainStrokeWidth,
    seed: s + 1,
  });

  // 2. Bottom base rail at y = 48
  const railBottom = roughGen.line(1, 48, 35, 48, {
    roughness: 0.25,
    stroke,
    strokeWidth: mainStrokeWidth,
    seed: s + 2,
  });

  // 3. Side vertical posts
  const postL = roughGen.line(1.5, 37, 1.5, 48, {
    roughness: 0.2,
    stroke,
    strokeWidth: mainStrokeWidth,
    seed: s + 3,
  });
  const postR = roughGen.line(34.5, 37, 34.5, 48, {
    roughness: 0.2,
    stroke,
    strokeWidth: mainStrokeWidth,
    seed: s + 4,
  });

  paths.push(
    ...roughGen.toPaths(railTop),
    ...roughGen.toPaths(railBottom),
    ...roughGen.toPaths(postL),
    ...roughGen.toPaths(postR),
  );

  // 4. Slender vertical pickets (3 evenly spaced across the window)
  const pickets = [9.5, 18, 26.5];
  for (let i = 0; i < pickets.length; i++) {
    const px = pickets[i]!;
    const picket = roughGen.line(px, 37, px, 48, {
      roughness: 0.2,
      stroke,
      strokeWidth: detailStrokeWidth,
      seed: s + 10 + i,
    });
    paths.push(...roughGen.toPaths(picket));
  }

  return paths;
}
