import { oklch } from "culori";
import { colorDistance, muteColor } from "../colorTheory";
import { roughGen, createSeed, type PathInfo } from "../rough";
import type { BuildingBush, BuildingPlant } from "../../types/game";

/**
 * Deterministic fallback plant setting for buildings lacking an explicit configuration.
 * Enforces rarity: no more than 1 in 5 buildings has flowers (1/5) and no more than 1 in 5 has bushes (1/5).
 */
export function getDefaultBuildingPlant(indexOrSeed: number | string): BuildingPlant {
  const seed = typeof indexOrSeed === "number" ? Math.abs(indexOrSeed) : createSeed(indexOrSeed);
  const mod = seed % 5;
  if (mod === 1) return "flower";
  if (mod === 3) return "bush";
  return "none";
}
/**
 * Deterministic fallback bush setting for buildings lacking an explicit configuration (backward compatible alias).
 */
export const getDefaultBuildingBush = getDefaultBuildingPlant;

/**
 * Generates hand-drawn architectural SVG paths for an organic landscaping bush.
 * Dimensions: fits directly into the building card corner (viewBox 0 0 58 44).
 * Rich and charming: ground anchor with grass tufts, woody stem and organic branching,
 * layered foliage masses in natural watercolor greens, perimeter scalloped ink arcs,
 * and sketchy interior leaf gestures.
 */
export function generateBushPaths(seed: number, stroke?: string, isOrganized = false): PathInfo[] {
  const s = seed;
  const paths: PathInfo[] = [];

  const mainStrokeWidth = isOrganized ? 1.6 : 1.25;
  const inkColor = isOrganized ? "#153314" : "#1c3d1a";
  const earthColor = "#383129";

  // 1. Earth/ground baseline at y = 41
  const ground = roughGen.line(3, 41, 55, 41, {
    roughness: 0.35,
    stroke: earthColor,
    strokeWidth: mainStrokeWidth,
    seed: s,
  });
  // Base grass tufts anchoring the shrub
  const g1 = roughGen.line(6, 41, 5, 35, {
    roughness: 0.2,
    stroke: "#3d6531",
    strokeWidth: 1.1,
    seed: s + 1,
  });
  const g2 = roughGen.line(8, 41, 9, 34, {
    roughness: 0.2,
    stroke: "#3d6531",
    strokeWidth: 1.1,
    seed: s + 2,
  });
  const g3 = roughGen.line(51, 41, 52, 35, {
    roughness: 0.2,
    stroke: "#3d6531",
    strokeWidth: 1.1,
    seed: s + 3,
  });
  paths.push(
    ...roughGen.toPaths(ground),
    ...roughGen.toPaths(g1),
    ...roughGen.toPaths(g2),
    ...roughGen.toPaths(g3),
  );

  // 2. Woody stem and organic lower branches
  const trunk = roughGen.line(29, 41, 29, 31, {
    roughness: 0.25,
    stroke: "#543a24",
    strokeWidth: 2.2,
    seed: s + 4,
  });
  const bLeft = roughGen.line(29, 36, 19, 30, {
    roughness: 0.25,
    stroke: "#543a24",
    strokeWidth: 1.4,
    seed: s + 5,
  });
  const bRight = roughGen.line(29, 35, 39, 29, {
    roughness: 0.25,
    stroke: "#543a24",
    strokeWidth: 1.4,
    seed: s + 6,
  });
  paths.push(...roughGen.toPaths(trunk), ...roughGen.toPaths(bLeft), ...roughGen.toPaths(bRight));

  // 3. Foliage mass layering
  // Layer A: Deep moss shadow lobes (rear/bottom volume)
  const lobesBase: [number, number, number][] = [
    [17, 30, 24],
    [40, 30, 24],
    [29, 27, 26],
  ];
  for (let i = 0; i < lobesBase.length; i++) {
    const [lx, ly, ld] = lobesBase[i]!;
    const lobe = roughGen.circle(lx, ly, ld, {
      roughness: 0.45,
      stroke: "none",
      fill: "#295425",
      fillStyle: "solid",
      seed: s + 10 + i,
    });
    paths.push(...roughGen.toPaths(lobe));
  }

  // Layer B: Midtone rich leafy lobes
  const lobesMid: [number, number, number][] = [
    [19, 23, 22],
    [38, 22, 22],
    [25, 17, 21],
    [34, 16, 21],
    [29, 24, 21],
  ];
  for (let i = 0; i < lobesMid.length; i++) {
    const [lx, ly, ld] = lobesMid[i]!;
    const lobe = roughGen.circle(lx, ly, ld, {
      roughness: 0.4,
      stroke: "none",
      fill: "#48823c",
      fillStyle: "solid",
      seed: s + 20 + i,
    });
    paths.push(...roughGen.toPaths(lobe));
  }

  // Layer C: Sunlit warm meadow highlights (top and sun-dappled crown)
  const lobesTop: [number, number, number][] = [
    [29, 13, 17],
    [22, 14, 13],
    [36, 14, 13],
    [28, 19, 13],
  ];
  for (let i = 0; i < lobesTop.length; i++) {
    const [lx, ly, ld] = lobesTop[i]!;
    const lobe = roughGen.circle(lx, ly, ld, {
      roughness: 0.4,
      stroke: "none",
      fill: "#72ab59",
      fillStyle: "solid",
      seed: s + 30 + i,
    });
    paths.push(...roughGen.toPaths(lobe));
  }

  // 4. Perimeter hand-drawn ink arcs (cloud-scalloped silhouette)
  const perimeterArcs: [number, number, number, number, number, number][] = [
    // Bottom left up along the side
    [11, 31, 16, 16, 1.9, 3.8],
    // Upper left lobe
    [17, 19, 17, 17, 2.7, 4.4],
    // Top left crown
    [25, 12, 17, 16, 3.3, 5.0],
    // Top right crown
    [35, 12, 17, 16, 4.3, 5.9],
    // Upper right lobe
    [44, 20, 17, 17, 4.9, 6.6],
    // Bottom right down to ground
    [45, 31, 16, 16, 5.7, 7.3],
  ];
  for (let i = 0; i < perimeterArcs.length; i++) {
    const [ax, ay, aw, ah, st, sp] = perimeterArcs[i]!;
    const arc = roughGen.arc(ax, ay, aw, ah, st, sp, false, {
      roughness: 0.45,
      stroke: inkColor,
      strokeWidth: mainStrokeWidth,
      seed: s + 40 + i,
    });
    paths.push(...roughGen.toPaths(arc));
  }

  // 5. Sketchy interior leaf texture arcs (gentle hand-drawn pen gestures)
  const interiorArcs: [number, number, number, number, number, number][] = [
    [22, 26, 9, 7, 0.4, 2.3],
    [35, 25, 9, 7, 0.8, 2.7],
    [28, 19, 9, 6, 0.3, 2.1],
    [21, 17, 7, 5, 0.5, 2.2],
    [36, 18, 7, 5, 0.7, 2.4],
  ];
  for (let i = 0; i < interiorArcs.length; i++) {
    const [ax, ay, aw, ah, st, sp] = interiorArcs[i]!;
    const arc = roughGen.arc(ax, ay, aw, ah, st, sp, false, {
      roughness: 0.35,
      stroke: "#184015",
      strokeWidth: 0.95,
      seed: s + 50 + i,
    });
    paths.push(...roughGen.toPaths(arc));
  }

  return paths;
}

export interface FlowerPalette {
  name: string;
  petal: string;
  petalStroke: string;
  center: string;
  centerStroke: string;
}

export const FLOWER_PALETTES: readonly FlowerPalette[] = [
  {
    name: "gold",
    petal: "#facc15",
    petalStroke: "#b45309",
    center: "#78350f",
    centerStroke: "#451a03",
  }, // Sunny gold daisy
  {
    name: "lavender",
    petal: "#c084fc",
    petalStroke: "#7c3aed",
    center: "#fde047",
    centerStroke: "#ca8a04",
  }, // Lavender violet
  {
    name: "rose",
    petal: "#fb7185",
    petalStroke: "#be123c",
    center: "#fef08a",
    centerStroke: "#d97706",
  }, // Soft rose pink
  {
    name: "marigold",
    petal: "#fb923c",
    petalStroke: "#c2410c",
    center: "#fef08a",
    centerStroke: "#b45309",
  }, // Marigold amber
  {
    name: "cornflower",
    petal: "#60a5fa",
    petalStroke: "#1d4ed8",
    center: "#fef08a",
    centerStroke: "#d97706",
  }, // Cornflower azure
  {
    name: "coral",
    petal: "#f43f5e",
    petalStroke: "#9f1239",
    center: "#fef08a",
    centerStroke: "#d97706",
  }, // Coral poppy
  {
    name: "cream",
    petal: "#fef08a",
    petalStroke: "#ca8a04",
    center: "#ea580c",
    centerStroke: "#9a3412",
  }, // Warm cream lily
] as const;

/**
 * Picks a flower color palette that goes nicely and contrasts well with the building color.
 * Prioritizes high perceptual contrast (Delta E) and distinct hue separation so blossoms pop
 * and do not clash or blend into the building facade.
 */
export function pickFlowerPaletteForBuilding(buildingColor?: string, seed = 0): FlowerPalette {
  if (!buildingColor) {
    return FLOWER_PALETTES[Math.abs(seed) % FLOWER_PALETTES.length]!;
  }

  const bLch = oklch(buildingColor);
  if (!bLch) {
    return FLOWER_PALETTES[Math.abs(seed) % FLOWER_PALETTES.length]!;
  }

  const bHue = bLch.h ?? 0;

  // Score each palette based on perceptual distance (Delta E) and hue separation
  const scored = FLOWER_PALETTES.map((pal) => {
    const fLch = oklch(pal.petal);
    const fHue = fLch?.h ?? 0;
    const dE = colorDistance(buildingColor, pal.petal);
    const rawHueDiff = Math.abs(bHue - fHue);
    const hueDiff = Math.min(rawHueDiff, 360 - rawHueDiff);
    return { pal, dE, hueDiff };
  });

  // Filter candidates that have good Delta E and sufficient hue difference
  // (avoiding flowers of the same hue family as the building)
  const contrasting = scored.filter((c) => c.dE >= 0.2 && c.hueDiff >= 45);

  if (contrasting.length > 0) {
    return contrasting[Math.abs(seed) % contrasting.length]!.pal;
  }

  // Fallback: pick the palette with highest Delta E if no palette met both thresholds
  scored.sort((a, b) => b.dE - a.dE);
  return scored[0]!.pal;
}

export function resolveFlowerPalette(
  seed: number,
  flowerColor?: string,
  buildingColor?: string,
): FlowerPalette {
  if (flowerColor) {
    const found = FLOWER_PALETTES.find((p) => p.petal.toLowerCase() === flowerColor.toLowerCase());
    if (found) {
      if (buildingColor) {
        const dE = colorDistance(buildingColor, found.petal);
        if (dE >= 0.15) return found;
        return pickFlowerPaletteForBuilding(buildingColor, seed);
      }
      return found;
    }

    if (buildingColor) {
      const dE = colorDistance(buildingColor, flowerColor);
      if (dE < 0.15) {
        return pickFlowerPaletteForBuilding(buildingColor, seed);
      }
    }

    return {
      name: "custom",
      petal: flowerColor,
      petalStroke: muteColor(flowerColor, 0.7),
      center: "#fef08a",
      centerStroke: "#d97706",
    };
  }

  if (buildingColor) {
    return pickFlowerPaletteForBuilding(buildingColor, seed);
  }

  return FLOWER_PALETTES[Math.abs(seed) % FLOWER_PALETTES.length]!;
}

/**
 * Generates hand-drawn architectural SVG paths for an organic flowering plant in front of the house.
 * Dimensions: fits directly into the building card corner (viewBox 0 0 58 44).
 * Features: earth baseline, sketched soil mound, grass root anchors, curving stems, watercolor green leaves
 * with sketched veins, and vibrant multi-petal blossoms with bright center disks and blooming buds.
 */
export function generateFlowerPaths(
  seed: number,
  stroke?: string,
  isOrganized = false,
  flowerColor?: string,
  buildingColor?: string,
): PathInfo[] {
  const s = seed;
  const paths: PathInfo[] = [];

  const mainStrokeWidth = isOrganized ? 1.6 : 1.25;
  const inkColor = isOrganized ? "#153314" : "#1c3d1a";
  const earthColor = "#383129";

  // 1. Earth/ground baseline at y = 41
  const ground = roughGen.line(4, 41, 54, 41, {
    roughness: 0.35,
    stroke: earthColor,
    strokeWidth: mainStrokeWidth,
    seed: s,
  });
  paths.push(...roughGen.toPaths(ground));

  // Sketched earthen soil mound
  const soil = roughGen.ellipse(29, 41, 28, 5.5, {
    roughness: 0.35,
    stroke: "#543a24",
    strokeWidth: 0.85,
    fill: "#e5d5c0",
    fillStyle: "solid",
    seed: s + 1,
  });
  paths.push(...roughGen.toPaths(soil));

  // Base grass tufts
  const g1 = roughGen.line(10, 41, 8, 34, {
    roughness: 0.2,
    stroke: "#3d6531",
    strokeWidth: 1.1,
    seed: s + 2,
  });
  const g2 = roughGen.line(14, 41, 15, 33, {
    roughness: 0.2,
    stroke: "#3d6531",
    strokeWidth: 1.1,
    seed: s + 3,
  });
  const g3 = roughGen.line(44, 41, 43, 33, {
    roughness: 0.2,
    stroke: "#3d6531",
    strokeWidth: 1.1,
    seed: s + 4,
  });
  const g4 = roughGen.line(48, 41, 50, 34, {
    roughness: 0.2,
    stroke: "#3d6531",
    strokeWidth: 1.1,
    seed: s + 5,
  });
  paths.push(
    ...roughGen.toPaths(g1),
    ...roughGen.toPaths(g2),
    ...roughGen.toPaths(g3),
    ...roughGen.toPaths(g4),
  );

  // 2. Organic curving green stems
  const stemCenter = roughGen.curve(
    [
      [29, 41],
      [27.5, 29],
      [29, 21],
      [28, 14],
    ],
    {
      roughness: 0.25,
      stroke: inkColor,
      strokeWidth: 1.6,
      seed: s + 6,
    },
  );
  const stemLeft = roughGen.curve(
    [
      [28, 35],
      [21, 29],
      [15, 21],
    ],
    {
      roughness: 0.25,
      stroke: inkColor,
      strokeWidth: 1.35,
      seed: s + 7,
    },
  );
  const stemRight = roughGen.curve(
    [
      [28, 33],
      [36, 28],
      [42, 20],
    ],
    {
      roughness: 0.25,
      stroke: inkColor,
      strokeWidth: 1.35,
      seed: s + 8,
    },
  );
  paths.push(
    ...roughGen.toPaths(stemCenter),
    ...roughGen.toPaths(stemLeft),
    ...roughGen.toPaths(stemRight),
  );

  // 3. Lush foliage leaves
  const leafL = roughGen.ellipse(19, 31, 12, 6, {
    roughness: 0.35,
    stroke: inkColor,
    strokeWidth: 0.9,
    fill: "#48823c",
    fillStyle: "solid",
    seed: s + 9,
  });
  const leafR = roughGen.ellipse(37, 30, 13, 6.5, {
    roughness: 0.35,
    stroke: inkColor,
    strokeWidth: 0.9,
    fill: "#72ab59",
    fillStyle: "solid",
    seed: s + 10,
  });
  const leafC1 = roughGen.ellipse(33, 22, 10, 5, {
    roughness: 0.35,
    stroke: inkColor,
    strokeWidth: 0.85,
    fill: "#48823c",
    fillStyle: "solid",
    seed: s + 11,
  });
  const leafC2 = roughGen.ellipse(24, 25, 9, 4.5, {
    roughness: 0.35,
    stroke: inkColor,
    strokeWidth: 0.85,
    fill: "#72ab59",
    fillStyle: "solid",
    seed: s + 12,
  });
  paths.push(
    ...roughGen.toPaths(leafL),
    ...roughGen.toPaths(leafR),
    ...roughGen.toPaths(leafC1),
    ...roughGen.toPaths(leafC2),
  );

  // Leaf veins
  const veinL = roughGen.line(14, 31, 23, 31, {
    roughness: 0.2,
    stroke: "#184015",
    strokeWidth: 0.8,
    seed: s + 13,
  });
  const veinR = roughGen.line(32, 30, 42, 30, {
    roughness: 0.2,
    stroke: "#184015",
    strokeWidth: 0.8,
    seed: s + 14,
  });
  paths.push(...roughGen.toPaths(veinL), ...roughGen.toPaths(veinR));

  // 4. Color palettes
  const pal = resolveFlowerPalette(s, flowerColor, buildingColor);

  // Main center blossom at (28, 13)
  const cx = 28;
  const cy = 13;
  const numPetals = 6;
  const r = 5.2;
  for (let i = 0; i < numPetals; i++) {
    const angle = (i * 2 * Math.PI) / numPetals;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    const petal = roughGen.circle(px, py, 7.2, {
      roughness: 0.35,
      stroke: pal.petalStroke,
      strokeWidth: 0.9,
      fill: pal.petal,
      fillStyle: "solid",
      seed: s + 20 + i,
    });
    paths.push(...roughGen.toPaths(petal));
  }
  const center = roughGen.circle(cx, cy, 6.6, {
    roughness: 0.3,
    stroke: pal.centerStroke,
    strokeWidth: 1.05,
    fill: pal.center,
    fillStyle: "solid",
    seed: s + 30,
  });
  const centerArc = roughGen.arc(cx, cy, 3.5, 3.5, 0.4, 2.6, false, {
    roughness: 0.25,
    stroke: pal.centerStroke,
    strokeWidth: 0.85,
    seed: s + 31,
  });
  paths.push(...roughGen.toPaths(center), ...roughGen.toPaths(centerArc));

  // Left blossom at (15, 21)
  const lcx = 15;
  const lcy = 21;
  const lNumPetals = 5;
  const lr = 4.2;
  for (let i = 0; i < lNumPetals; i++) {
    const angle = (i * 2 * Math.PI) / lNumPetals - Math.PI / 2;
    const px = lcx + Math.cos(angle) * lr;
    const py = lcy + Math.sin(angle) * lr;
    const petal = roughGen.circle(px, py, 5.8, {
      roughness: 0.35,
      stroke: pal.petalStroke,
      strokeWidth: 0.85,
      fill: pal.petal,
      fillStyle: "solid",
      seed: s + 40 + i,
    });
    paths.push(...roughGen.toPaths(petal));
  }
  const lCenter = roughGen.circle(lcx, lcy, 5.0, {
    roughness: 0.3,
    stroke: pal.centerStroke,
    strokeWidth: 0.95,
    fill: pal.center,
    fillStyle: "solid",
    seed: s + 50,
  });
  paths.push(...roughGen.toPaths(lCenter));

  // Right blossom at (42, 20)
  const rcx = 42;
  const rcy = 20;
  const rNumPetals = 5;
  const rr = 4.2;
  for (let i = 0; i < rNumPetals; i++) {
    const angle = (i * 2 * Math.PI) / rNumPetals;
    const px = rcx + Math.cos(angle) * rr;
    const py = rcy + Math.sin(angle) * rr;
    const petal = roughGen.circle(px, py, 5.8, {
      roughness: 0.35,
      stroke: pal.petalStroke,
      strokeWidth: 0.85,
      fill: pal.petal,
      fillStyle: "solid",
      seed: s + 60 + i,
    });
    paths.push(...roughGen.toPaths(petal));
  }
  const rCenter = roughGen.circle(rcx, rcy, 5.0, {
    roughness: 0.3,
    stroke: pal.centerStroke,
    strokeWidth: 0.95,
    fill: pal.center,
    fillStyle: "solid",
    seed: s + 70,
  });
  paths.push(...roughGen.toPaths(rCenter));

  return paths;
}

/**
 * Generates hand-drawn architectural SVG paths for the chosen front plant (flower, bush, or none).
 */
export function generatePlantPaths(
  plant: BuildingPlant | BuildingBush,
  seed: number,
  stroke?: string,
  isOrganized = false,
  flowerColor?: string,
  buildingColor?: string,
): PathInfo[] {
  if (plant === "flower") {
    return generateFlowerPaths(seed, stroke, isOrganized, flowerColor, buildingColor);
  }
  if (plant === "bush" || plant === "left" || plant === "right") {
    return generateBushPaths(seed, stroke, isOrganized);
  }
  return [];
}
