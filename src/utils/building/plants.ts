import { roughGen, createSeed, type PathInfo } from "../rough";
import type { BuildingBush, BuildingPlant } from "../../types/game";

/**
 * Deterministic fallback plant setting for buildings lacking an explicit configuration.
 */
export function getDefaultBuildingPlant(indexOrSeed: number | string): BuildingPlant {
  const seed = typeof indexOrSeed === "number" ? Math.abs(indexOrSeed) : createSeed(indexOrSeed);
  const mod = seed % 5;
  if (mod === 1 || mod === 4) return "flower";
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
export function generateBushPaths(seed: number, stroke: string, isOrganized = false): PathInfo[] {
  const s = seed;
  const paths: PathInfo[] = [];

  const mainStrokeWidth = isOrganized ? 1.6 : 1.25;
  const inkColor = isOrganized ? stroke || "#153314" : "#1c3d1a";
  const earthColor = stroke || "#383129";

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

/**
 * Generates hand-drawn architectural SVG paths for an organic flowering plant in front of the house.
 * Dimensions: fits directly into the building card corner (viewBox 0 0 58 44).
 * Features: earth baseline, sketched soil mound, grass root anchors, curving stems, watercolor green leaves
 * with sketched veins, and vibrant multi-petal blossoms with bright center disks and blooming buds.
 */
export function generateFlowerPaths(seed: number, stroke: string, isOrganized = false): PathInfo[] {
  const s = seed;
  const paths: PathInfo[] = [];

  const mainStrokeWidth = isOrganized ? 1.6 : 1.25;
  const inkColor = isOrganized ? stroke || "#153314" : "#1c3d1a";
  const earthColor = stroke || "#383129";

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
  const palettes = [
    { petal: "#fb7185", petalStroke: "#be123c", center: "#fef08a", centerStroke: "#d97706" },
    { petal: "#facc15", petalStroke: "#b45309", center: "#78350f", centerStroke: "#451a03" },
    { petal: "#c084fc", petalStroke: "#7c3aed", center: "#fde047", centerStroke: "#ca8a04" },
    { petal: "#f43f5e", petalStroke: "#9f1239", center: "#fef08a", centerStroke: "#d97706" },
  ];
  const pal = palettes[Math.abs(s) % palettes.length]!;

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

  // Tiny top budding accent at (34, 10)
  const budStem = roughGen.line(28, 14, 34, 10, {
    roughness: 0.25,
    stroke: inkColor,
    strokeWidth: 1.0,
    seed: s + 80,
  });
  const budCalyx = roughGen.circle(34, 10, 4.0, {
    roughness: 0.3,
    stroke: inkColor,
    strokeWidth: 0.8,
    fill: "#48823c",
    fillStyle: "solid",
    seed: s + 81,
  });
  const budPetal = roughGen.circle(35.5, 8.5, 3.5, {
    roughness: 0.35,
    stroke: pal.petalStroke,
    strokeWidth: 0.8,
    fill: pal.petal,
    fillStyle: "solid",
    seed: s + 82,
  });
  paths.push(
    ...roughGen.toPaths(budStem),
    ...roughGen.toPaths(budCalyx),
    ...roughGen.toPaths(budPetal),
  );

  return paths;
}

/**
 * Generates hand-drawn architectural SVG paths for the chosen front plant (flower, bush, or none).
 */
export function generatePlantPaths(
  plant: BuildingPlant | BuildingBush,
  seed: number,
  stroke: string,
  isOrganized = false,
): PathInfo[] {
  if (plant === "flower") {
    return generateFlowerPaths(seed, stroke, isOrganized);
  }
  if (plant === "bush" || plant === "left" || plant === "right") {
    return generateBushPaths(seed, stroke, isOrganized);
  }
  return [];
}
