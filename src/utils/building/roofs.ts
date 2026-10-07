import { roughGen, createSeed, type PathInfo } from "../rough";
import type { BuildingRoofType } from "../../types/game";

export const ROOF_HEIGHT_FLAT = 16;
export const ROOF_HEIGHT_FLAT_CHAIRS = 32;
export const ROOF_HEIGHT_PITCHED = 38;
export const ROOF_HEIGHT_MANSARD = 30;

export const ROOF_TYPES: readonly BuildingRoofType[] = [
  "flat",
  "pitched",
  "mansard",
  "flat-chairs",
] as const;

export function getRoofHeight(type: BuildingRoofType): number {
  switch (type) {
    case "pitched":
      return ROOF_HEIGHT_PITCHED;
    case "mansard":
      return ROOF_HEIGHT_MANSARD;
    case "flat-chairs":
      return ROOF_HEIGHT_FLAT_CHAIRS;
    case "flat":
    default:
      return ROOF_HEIGHT_FLAT;
  }
}

/**
 * Deterministic fallback roof type for buildings lacking an explicit configuration.
 */
export function getDefaultBuildingRoofType(indexOrSeed: number | string): BuildingRoofType {
  const seed = typeof indexOrSeed === "number" ? Math.abs(indexOrSeed) : createSeed(indexOrSeed);
  const mod = seed % 4;
  if (mod === 1) return "flat";
  if (mod === 2) return "pitched";
  if (mod === 3) return "mansard";
  return "flat-chairs";
}

/**
 * Generates hand-drawn architectural SVG paths for the building rooftop.
 */
export function generateRoofPaths(
  type: BuildingRoofType,
  width: number,
  height: number,
  seed: number,
  stroke: string,
  isOrganized = false,
): PathInfo[] {
  const w = Math.max(120, width);
  const h = height;
  const s = seed;
  const paths: PathInfo[] = [];

  const mainStrokeWidth = isOrganized ? 2.2 : 1.6;
  const detailStrokeWidth = isOrganized ? 1.4 : 1.0;

  if (type === "pitched") {
    const peakX = w / 2;
    const peakY = 4;
    const leftEaveX = -3;
    const leftEaveY = h - 2;
    const rightEaveX = w + 3;
    const rightEaveY = h - 2;

    // 1. Triangular gable roof polygon
    const gable = roughGen.polygon(
      [
        [leftEaveX, leftEaveY],
        [peakX, peakY],
        [rightEaveX, rightEaveY],
      ],
      {
        roughness: 0.6,
        bowing: 0.4,
        stroke,
        strokeWidth: mainStrokeWidth,
        fill: "#eee8dc",
        fillStyle: "solid",
        seed: s + 1,
      },
    );
    paths.push(...roughGen.toPaths(gable));

    // 2. Horizontal eave cornice lines across the bottom
    const eaveLine1 = roughGen.line(-5, leftEaveY, w + 5, rightEaveY, {
      roughness: 0.4,
      stroke,
      strokeWidth: mainStrokeWidth,
      seed: s + 2,
    });
    const eaveLine2 = roughGen.line(-1, h, w + 1, h, {
      roughness: 0.35,
      stroke,
      strokeWidth: detailStrokeWidth,
      seed: s + 3,
    });
    paths.push(...roughGen.toPaths(eaveLine1), ...roughGen.toPaths(eaveLine2));

    // 3. Roof slope texture / seam lines
    const seamLeft = roughGen.line(w * 0.28, (h + peakY) / 2, w * 0.22, leftEaveY - 2, {
      roughness: 0.4,
      stroke: "#8c7e6c",
      strokeWidth: 0.8,
      seed: s + 4,
    });
    const seamRight = roughGen.line(w * 0.72, (h + peakY) / 2, w * 0.78, rightEaveY - 2, {
      roughness: 0.4,
      stroke: "#8c7e6c",
      strokeWidth: 0.8,
      seed: s + 5,
    });
    paths.push(...roughGen.toPaths(seamLeft), ...roughGen.toPaths(seamRight));

    // 4. Attic round window or arched louver in center of gable
    const windowY = Math.round(peakY + (h - peakY) * 0.52);
    const windowCircle = roughGen.circle(peakX, windowY, 13, {
      roughness: 0.5,
      stroke,
      strokeWidth: detailStrokeWidth,
      fill: "#fffdfa",
      fillStyle: "solid",
      seed: s + 6,
    });
    const crossH = roughGen.line(peakX - 6, windowY, peakX + 6, windowY, {
      roughness: 0.3,
      stroke: "#786957",
      strokeWidth: 0.9,
      seed: s + 7,
    });
    const crossV = roughGen.line(peakX, windowY - 6, peakX, windowY + 6, {
      roughness: 0.3,
      stroke: "#786957",
      strokeWidth: 0.9,
      seed: s + 8,
    });
    paths.push(
      ...roughGen.toPaths(windowCircle),
      ...roughGen.toPaths(crossH),
      ...roughGen.toPaths(crossV),
    );

    // 5. Rooftop Brick Chimney on the slope
    const chimX = Math.round(w * 0.74);
    const chimY = 6;
    const chimW = 12;
    const chimH = 16;
    const chimney = roughGen.rectangle(chimX, chimY, chimW, chimH, {
      roughness: 0.5,
      stroke,
      strokeWidth: detailStrokeWidth,
      fill: "#b45309",
      fillStyle: "solid",
      seed: s + 9,
    });
    const chimCap = roughGen.line(chimX - 2, chimY, chimX + chimW + 2, chimY, {
      roughness: 0.35,
      stroke,
      strokeWidth: 1.5,
      seed: s + 10,
    });
    const pot1 = roughGen.line(chimX + 3, chimY - 3, chimX + 3, chimY, {
      roughness: 0.3,
      stroke: "#78350f",
      strokeWidth: 2.0,
      seed: s + 11,
    });
    const pot2 = roughGen.line(chimX + 9, chimY - 3, chimX + 9, chimY, {
      roughness: 0.3,
      stroke: "#78350f",
      strokeWidth: 2.0,
      seed: s + 12,
    });
    paths.push(
      ...roughGen.toPaths(chimney),
      ...roughGen.toPaths(chimCap),
      ...roughGen.toPaths(pot1),
      ...roughGen.toPaths(pot2),
    );

    return paths;
  }

  if (type === "mansard") {
    const leftTopX = Math.round(w * 0.16);
    const rightTopX = Math.round(w * 0.84);
    const topY = 6;
    const bottomY = h - 2;

    // 1. Mansard sloped trapezoid
    const mansard = roughGen.polygon(
      [
        [-2, bottomY],
        [leftTopX, topY],
        [rightTopX, topY],
        [w + 2, bottomY],
      ],
      {
        roughness: 0.6,
        bowing: 0.4,
        stroke,
        strokeWidth: mainStrokeWidth,
        fill: "#e6dfd3",
        fillStyle: "solid",
        seed: s + 1,
      },
    );
    paths.push(...roughGen.toPaths(mansard));

    // 2. Top curb molding and bottom cornice line
    const topCurb = roughGen.line(leftTopX - 3, topY, rightTopX + 3, topY, {
      roughness: 0.4,
      stroke,
      strokeWidth: mainStrokeWidth,
      seed: s + 2,
    });
    const bottomCornice = roughGen.line(-4, bottomY, w + 4, bottomY, {
      roughness: 0.4,
      stroke,
      strokeWidth: mainStrokeWidth,
      seed: s + 3,
    });
    paths.push(...roughGen.toPaths(topCurb), ...roughGen.toPaths(bottomCornice));

    // 3. Center Dormer Window
    const dormerW = 20;
    const dormerH = 16;
    const dormerX = Math.round(w / 2 - dormerW / 2);
    const dormerY = Math.round(topY + 3);

    const dormerBody = roughGen.rectangle(dormerX, dormerY, dormerW, dormerH, {
      roughness: 0.5,
      stroke,
      strokeWidth: detailStrokeWidth,
      fill: "#fffdfa",
      fillStyle: "solid",
      seed: s + 4,
    });
    const dormerPediment = roughGen.polygon(
      [
        [dormerX - 2, dormerY],
        [w / 2, dormerY - 5],
        [dormerX + dormerW + 2, dormerY],
      ],
      {
        roughness: 0.5,
        stroke,
        strokeWidth: detailStrokeWidth,
        fill: "#ded5c5",
        fillStyle: "solid",
        seed: s + 5,
      },
    );
    const dormerCrossH = roughGen.line(
      dormerX + 2,
      dormerY + 8,
      dormerX + dormerW - 2,
      dormerY + 8,
      {
        roughness: 0.3,
        stroke: "#786957",
        strokeWidth: 0.9,
        seed: s + 6,
      },
    );
    const dormerCrossV = roughGen.line(w / 2, dormerY + 2, w / 2, dormerY + dormerH - 2, {
      roughness: 0.3,
      stroke: "#786957",
      strokeWidth: 0.9,
      seed: s + 7,
    });
    paths.push(
      ...roughGen.toPaths(dormerBody),
      ...roughGen.toPaths(dormerPediment),
      ...roughGen.toPaths(dormerCrossH),
      ...roughGen.toPaths(dormerCrossV),
    );

    // 4. Sloped side seam lines
    const leftSeam = roughGen.line(leftTopX * 0.7, topY + 4, leftTopX * 0.3, bottomY - 2, {
      roughness: 0.4,
      stroke: "#8c7e6c",
      strokeWidth: 0.8,
      seed: s + 8,
    });
    const rightSeam = roughGen.line(
      w - (w - rightTopX) * 0.7,
      topY + 4,
      w - (w - rightTopX) * 0.3,
      bottomY - 2,
      {
        roughness: 0.4,
        stroke: "#8c7e6c",
        strokeWidth: 0.8,
        seed: s + 9,
      },
    );
    paths.push(...roughGen.toPaths(leftSeam), ...roughGen.toPaths(rightSeam));

    return paths;
  }

  if (type === "flat-chairs") {
    // Flat roof with parapet, coping, and 2 larger, well-proportioned lawn chairs on top
    const parapetTopY = 16;
    const parapetBottomY = h - 2;

    // 1. Parapet coping line, band, and cornice
    const coping = roughGen.line(0, parapetTopY, w, parapetTopY, {
      roughness: 0.4,
      stroke,
      strokeWidth: mainStrokeWidth,
      seed: s + 1,
    });
    const parapetBand = roughGen.rectangle(2, parapetTopY, w - 4, parapetBottomY - parapetTopY, {
      roughness: 0.45,
      stroke: "#695844",
      fill: "#dfd7c9",
      fillStyle: "solid",
      strokeWidth: 0.9,
      seed: s + 2,
    });
    const cornice = roughGen.line(0, parapetBottomY, w, parapetBottomY, {
      roughness: 0.5,
      stroke,
      strokeWidth: mainStrokeWidth,
      seed: s + 3,
    });
    paths.push(
      ...roughGen.toPaths(coping),
      ...roughGen.toPaths(parapetBand),
      ...roughGen.toPaths(cornice),
    );

    // 2. Two prominent lawn chairs sitting on rooftop (facing each other)
    const cx = Math.round(w / 2);
    const yBase = parapetTopY;
    const ySeat = 9;
    const yTop = 2;

    // CHAIR 1 (Left chair, facing right towards center)
    const c1BackTopX = cx - 24;
    const c1SeatBackX = cx - 17;
    const c1SeatFrontX = cx - 4;

    // Woven webbing polygons (retro cyan / sky blue)
    const c1BackWeb = roughGen.polygon(
      [
        [c1BackTopX - 1, yTop],
        [c1BackTopX + 2.5, yTop],
        [c1SeatBackX + 2.5, ySeat],
        [c1SeatBackX - 1, ySeat],
      ],
      {
        roughness: 0.3,
        stroke: "#0284c7",
        fill: "#38bdf8",
        fillStyle: "solid",
        strokeWidth: 0.8,
        seed: s + 17,
      },
    );
    const c1SeatWeb = roughGen.polygon(
      [
        [c1SeatBackX, ySeat - 1.5],
        [c1SeatFrontX, ySeat - 1.5],
        [c1SeatFrontX, ySeat + 1.5],
        [c1SeatBackX, ySeat + 1.5],
      ],
      {
        roughness: 0.3,
        stroke: "#0284c7",
        fill: "#38bdf8",
        fillStyle: "solid",
        strokeWidth: 0.8,
        seed: s + 18,
      },
    );

    // Chair 1 tubular frame (backrest & seat)
    const c1Back = roughGen.line(c1BackTopX, yTop, c1SeatBackX, ySeat, {
      roughness: 0.25,
      stroke,
      strokeWidth: detailStrokeWidth,
      seed: s + 10,
    });
    const c1Seat = roughGen.line(c1SeatBackX, ySeat, c1SeatFrontX, ySeat, {
      roughness: 0.25,
      stroke,
      strokeWidth: detailStrokeWidth,
      seed: s + 11,
    });

    // Folding X-frame legs & foot runner
    const c1Leg1 = roughGen.line(c1SeatFrontX - 2, ySeat, c1SeatBackX - 2, yBase, {
      roughness: 0.3,
      stroke: "#52525b",
      strokeWidth: 1.0,
      seed: s + 12,
    });
    const c1Leg2 = roughGen.line(c1SeatBackX + 2, ySeat, c1SeatFrontX + 1, yBase, {
      roughness: 0.3,
      stroke: "#52525b",
      strokeWidth: 1.0,
      seed: s + 13,
    });
    const c1Foot = roughGen.line(c1SeatBackX - 3, yBase, c1SeatFrontX + 2, yBase, {
      roughness: 0.25,
      stroke: "#52525b",
      strokeWidth: 1.1,
      seed: s + 14,
    });

    // Armrest
    const c1Arm = roughGen.line(cx - 20, 5.5, cx - 8, 5.5, {
      roughness: 0.2,
      stroke,
      strokeWidth: detailStrokeWidth,
      seed: s + 15,
    });
    const c1ArmPost = roughGen.line(cx - 8, 5.5, cx - 8, ySeat, {
      roughness: 0.2,
      stroke,
      strokeWidth: detailStrokeWidth,
      seed: s + 16,
    });

    // White lattice accent stripes across webbing
    const c1Stripe1 = roughGen.line(cx - 21.5, 4.5, cx - 18.5, 4.5, {
      roughness: 0.2,
      stroke: "#ffffff",
      strokeWidth: 1.2,
      seed: s + 19,
    });
    const c1Stripe2 = roughGen.line(cx - 19, 7, cx - 16, 7, {
      roughness: 0.2,
      stroke: "#ffffff",
      strokeWidth: 1.2,
      seed: s + 20,
    });
    const c1Stripe3 = roughGen.line(cx - 13, ySeat - 1.5, cx - 13, ySeat + 1.5, {
      roughness: 0.2,
      stroke: "#ffffff",
      strokeWidth: 1.2,
      seed: s + 21,
    });
    const c1Stripe4 = roughGen.line(cx - 8, ySeat - 1.5, cx - 8, ySeat + 1.5, {
      roughness: 0.2,
      stroke: "#ffffff",
      strokeWidth: 1.2,
      seed: s + 22,
    });

    // CHAIR 2 (Right chair, facing left towards center)
    const c2SeatFrontX = cx + 4;
    const c2SeatBackX = cx + 17;
    const c2BackTopX = cx + 24;

    // Woven webbing polygons (warm retro orange / amber)
    const c2BackWeb = roughGen.polygon(
      [
        [c2BackTopX + 1, yTop],
        [c2BackTopX - 2.5, yTop],
        [c2SeatBackX - 2.5, ySeat],
        [c2SeatBackX + 1, ySeat],
      ],
      {
        roughness: 0.3,
        stroke: "#ea580c",
        fill: "#fb923c",
        fillStyle: "solid",
        strokeWidth: 0.8,
        seed: s + 37,
      },
    );
    const c2SeatWeb = roughGen.polygon(
      [
        [c2SeatBackX, ySeat - 1.5],
        [c2SeatFrontX, ySeat - 1.5],
        [c2SeatFrontX, ySeat + 1.5],
        [c2SeatBackX, ySeat + 1.5],
      ],
      {
        roughness: 0.3,
        stroke: "#ea580c",
        fill: "#fb923c",
        fillStyle: "solid",
        strokeWidth: 0.8,
        seed: s + 38,
      },
    );

    // Chair 2 tubular frame (backrest & seat)
    const c2Back = roughGen.line(c2BackTopX, yTop, c2SeatBackX, ySeat, {
      roughness: 0.25,
      stroke,
      strokeWidth: detailStrokeWidth,
      seed: s + 30,
    });
    const c2Seat = roughGen.line(c2SeatBackX, ySeat, c2SeatFrontX, ySeat, {
      roughness: 0.25,
      stroke,
      strokeWidth: detailStrokeWidth,
      seed: s + 31,
    });

    // Folding X-frame legs & foot runner
    const c2Leg1 = roughGen.line(c2SeatFrontX + 2, ySeat, c2SeatBackX + 2, yBase, {
      roughness: 0.3,
      stroke: "#52525b",
      strokeWidth: 1.0,
      seed: s + 32,
    });
    const c2Leg2 = roughGen.line(c2SeatBackX - 2, ySeat, c2SeatFrontX - 1, yBase, {
      roughness: 0.3,
      stroke: "#52525b",
      strokeWidth: 1.0,
      seed: s + 33,
    });
    const c2Foot = roughGen.line(c2SeatFrontX - 2, yBase, c2SeatBackX + 3, yBase, {
      roughness: 0.25,
      stroke: "#52525b",
      strokeWidth: 1.1,
      seed: s + 34,
    });

    // Armrest
    const c2Arm = roughGen.line(cx + 20, 5.5, cx + 8, 5.5, {
      roughness: 0.2,
      stroke,
      strokeWidth: detailStrokeWidth,
      seed: s + 35,
    });
    const c2ArmPost = roughGen.line(cx + 8, 5.5, cx + 8, ySeat, {
      roughness: 0.2,
      stroke,
      strokeWidth: detailStrokeWidth,
      seed: s + 36,
    });

    // White lattice accent stripes across webbing
    const c2Stripe1 = roughGen.line(cx + 21.5, 4.5, cx + 18.5, 4.5, {
      roughness: 0.2,
      stroke: "#ffffff",
      strokeWidth: 1.2,
      seed: s + 39,
    });
    const c2Stripe2 = roughGen.line(cx + 19, 7, cx + 16, 7, {
      roughness: 0.2,
      stroke: "#ffffff",
      strokeWidth: 1.2,
      seed: s + 40,
    });
    const c2Stripe3 = roughGen.line(cx + 13, ySeat - 1.5, cx + 13, ySeat + 1.5, {
      roughness: 0.2,
      stroke: "#ffffff",
      strokeWidth: 1.2,
      seed: s + 41,
    });
    const c2Stripe4 = roughGen.line(cx + 8, ySeat - 1.5, cx + 8, ySeat + 1.5, {
      roughness: 0.2,
      stroke: "#ffffff",
      strokeWidth: 1.2,
      seed: s + 42,
    });

    paths.push(
      ...roughGen.toPaths(c1BackWeb),
      ...roughGen.toPaths(c1SeatWeb),
      ...roughGen.toPaths(c1Back),
      ...roughGen.toPaths(c1Seat),
      ...roughGen.toPaths(c1Leg1),
      ...roughGen.toPaths(c1Leg2),
      ...roughGen.toPaths(c1Foot),
      ...roughGen.toPaths(c1Arm),
      ...roughGen.toPaths(c1ArmPost),
      ...roughGen.toPaths(c1Stripe1),
      ...roughGen.toPaths(c1Stripe2),
      ...roughGen.toPaths(c1Stripe3),
      ...roughGen.toPaths(c1Stripe4),
      ...roughGen.toPaths(c2BackWeb),
      ...roughGen.toPaths(c2SeatWeb),
      ...roughGen.toPaths(c2Back),
      ...roughGen.toPaths(c2Seat),
      ...roughGen.toPaths(c2Leg1),
      ...roughGen.toPaths(c2Leg2),
      ...roughGen.toPaths(c2Foot),
      ...roughGen.toPaths(c2Arm),
      ...roughGen.toPaths(c2ArmPost),
      ...roughGen.toPaths(c2Stripe1),
      ...roughGen.toPaths(c2Stripe2),
      ...roughGen.toPaths(c2Stripe3),
      ...roughGen.toPaths(c2Stripe4),
    );

    return paths;
  }

  // Case 3: Flat roof with parapet, cornice, and varied rooftop feature
  const parapetTopY = 4;
  const parapetBottomY = h - 2;

  // 1. Parapet cap and main lower cornice
  const coping = roughGen.line(0, parapetTopY, w, parapetTopY, {
    roughness: 0.4,
    stroke,
    strokeWidth: mainStrokeWidth,
    seed: s + 1,
  });
  const parapetBand = roughGen.rectangle(2, parapetTopY, w - 4, parapetBottomY - parapetTopY, {
    roughness: 0.45,
    stroke: "#695844",
    fill: "#dfd7c9",
    fillStyle: "solid",
    strokeWidth: 0.9,
    seed: s + 2,
  });
  const cornice = roughGen.line(0, parapetBottomY, w, parapetBottomY, {
    roughness: 0.5,
    stroke,
    strokeWidth: mainStrokeWidth,
    seed: s + 3,
  });
  paths.push(
    ...roughGen.toPaths(coping),
    ...roughGen.toPaths(parapetBand),
    ...roughGen.toPaths(cornice),
  );

  // 2. Charming Rooftop Architectural Feature
  const featureMod = s % 3;
  if (featureMod === 0) {
    // Feature A: Rooftop Chimney
    const chimX = Math.round(w - 38);
    const chimY = 0;
    const chimW = 14;
    const chimH = 7;
    const chimney = roughGen.rectangle(chimX, chimY, chimW, chimH, {
      roughness: 0.4,
      stroke,
      strokeWidth: detailStrokeWidth,
      fill: "#b45309",
      fillStyle: "solid",
      seed: s + 4,
    });
    const cap = roughGen.line(chimX - 1, chimY, chimX + chimW + 1, chimY, {
      roughness: 0.3,
      stroke,
      strokeWidth: 1.4,
      seed: s + 5,
    });
    const pot1 = roughGen.line(chimX + 4, chimY - 3, chimX + 4, chimY, {
      roughness: 0.3,
      stroke: "#78350f",
      strokeWidth: 1.8,
      seed: s + 6,
    });
    const pot2 = roughGen.line(chimX + 10, chimY - 3, chimX + 10, chimY, {
      roughness: 0.3,
      stroke: "#78350f",
      strokeWidth: 1.8,
      seed: s + 7,
    });
    paths.push(
      ...roughGen.toPaths(chimney),
      ...roughGen.toPaths(cap),
      ...roughGen.toPaths(pot1),
      ...roughGen.toPaths(pot2),
    );
  } else if (featureMod === 1) {
    // Feature B: Classic Rooftop Water Tank on Stilts
    const tankX = Math.round(w - 36);
    const tankY = -8;
    const tankW = 14;
    const tankH = 10;
    const stilt1 = roughGen.line(tankX + 2, parapetTopY, tankX + 4, tankY + tankH, {
      roughness: 0.35,
      stroke: "#5c4f3d",
      strokeWidth: 1.2,
      seed: s + 8,
    });
    const stilt2 = roughGen.line(tankX + tankW - 2, parapetTopY, tankX + tankW - 4, tankY + tankH, {
      roughness: 0.35,
      stroke: "#5c4f3d",
      strokeWidth: 1.2,
      seed: s + 9,
    });
    const tankBody = roughGen.rectangle(tankX, tankY, tankW, tankH, {
      roughness: 0.4,
      stroke: "#4a3d2c",
      strokeWidth: 1.0,
      fill: "#b45309",
      fillStyle: "solid",
      seed: s + 10,
    });
    const tankRoof = roughGen.polygon(
      [
        [tankX - 1, tankY],
        [tankX + tankW / 2, tankY - 5],
        [tankX + tankW + 1, tankY],
      ],
      {
        roughness: 0.4,
        stroke: "#3f382f",
        strokeWidth: 1.0,
        fill: "#78350f",
        fillStyle: "solid",
        seed: s + 11,
      },
    );
    paths.push(
      ...roughGen.toPaths(stilt1),
      ...roughGen.toPaths(stilt2),
      ...roughGen.toPaths(tankBody),
      ...roughGen.toPaths(tankRoof),
    );
  } else {
    // Feature C: Roof Access Bulkhead / Stair Penthouse with Antenna
    const bulkX = 14;
    const bulkY = 0;
    const bulkW = 18;
    const bulkH = 6;
    const bulk = roughGen.rectangle(bulkX, bulkY, bulkW, bulkH, {
      roughness: 0.4,
      stroke,
      strokeWidth: detailStrokeWidth,
      fill: "#dfd7c9",
      fillStyle: "solid",
      seed: s + 12,
    });
    const door = roughGen.rectangle(bulkX + 4, bulkY + 2, 5, 4, {
      roughness: 0.3,
      stroke: "#786957",
      strokeWidth: 0.8,
      fill: "#8c7e6c",
      fillStyle: "solid",
      seed: s + 13,
    });
    const antennaStem = roughGen.line(bulkX + 13, bulkY, bulkX + 13, bulkY - 8, {
      roughness: 0.3,
      stroke: "#52525b",
      strokeWidth: 1.1,
      seed: s + 14,
    });
    const antennaBar = roughGen.line(bulkX + 9, bulkY - 5, bulkX + 17, bulkY - 5, {
      roughness: 0.3,
      stroke: "#52525b",
      strokeWidth: 0.8,
      seed: s + 15,
    });
    paths.push(
      ...roughGen.toPaths(bulk),
      ...roughGen.toPaths(door),
      ...roughGen.toPaths(antennaStem),
      ...roughGen.toPaths(antennaBar),
    );
  }

  return paths;
}
