import { describe, it, expect } from "bun:test";
import {
  getRoofHeight,
  getDefaultBuildingRoofType,
  getDefaultBuildingHasBalcony,
  getDefaultBuildingPlant,
  getDefaultBuildingBush,
  generateRoofPaths,
  generateBalconyPaths,
  generateBushPaths,
  generateFlowerPaths,
  generatePlantPaths,
  pickFlowerPaletteForBuilding,
  FLOWER_PALETTES,
  ROOF_HEIGHT_FLAT,
  ROOF_HEIGHT_FLAT_CHAIRS,
  ROOF_HEIGHT_PITCHED,
  ROOF_HEIGHT_MANSARD,
} from "../buildingArchitecture";

describe("buildingArchitecture utility", () => {
  it("returns correct roof heights for each roof type", () => {
    expect(getRoofHeight("flat")).toBe(ROOF_HEIGHT_FLAT);
    expect(getRoofHeight("pitched")).toBe(ROOF_HEIGHT_PITCHED);
    expect(getRoofHeight("mansard")).toBe(ROOF_HEIGHT_MANSARD);
    expect(getRoofHeight("flat-chairs")).toBe(ROOF_HEIGHT_FLAT_CHAIRS);
  });

  it("produces deterministic fallbacks across different indices", () => {
    expect(getDefaultBuildingRoofType(1)).toBe("flat");
    expect(getDefaultBuildingRoofType(2)).toBe("pitched");
    expect(getDefaultBuildingRoofType(3)).toBe("mansard");
    expect(getDefaultBuildingRoofType(4)).toBe("flat-chairs");
    expect(getDefaultBuildingHasBalcony(1)).toBe(true);
    expect(getDefaultBuildingHasBalcony(2)).toBe(false);
    expect(getDefaultBuildingHasBalcony(3)).toBe(true);
    expect(getDefaultBuildingHasBalcony(4)).toBe(false);
    expect(getDefaultBuildingPlant(1)).toBe("flower");
    expect(getDefaultBuildingPlant(2)).toBe("none");
    expect(getDefaultBuildingPlant(3)).toBe("bush");
    expect(getDefaultBuildingPlant(4)).toBe("none");
    expect(getDefaultBuildingPlant(5)).toBe("none");
    expect(getDefaultBuildingBush(1)).toBe("flower");
    expect(getDefaultBuildingBush(2)).toBe("none");
    expect(getDefaultBuildingBush(3)).toBe("bush");
    expect(getDefaultBuildingBush(4)).toBe("none");
    expect(getDefaultBuildingBush(5)).toBe("none");
  });

  it("enforces rarity: no more than 1 bush and no more than 1 flower per 5 houses", () => {
    // Check sliding windows of 5 across 50 houses
    const totalHouses = 50;
    const plants = Array.from({ length: totalHouses }, (_, i) => getDefaultBuildingPlant(i + 1));

    for (let start = 0; start <= totalHouses - 5; start++) {
      const window = plants.slice(start, start + 5);
      const bushCount = window.filter((p) => p === "bush").length;
      const flowerCount = window.filter((p) => p === "flower").length;

      expect(bushCount).toBeLessThanOrEqual(1);
      expect(flowerCount).toBeLessThanOrEqual(1);
    }
  });
  it("generates valid SVG paths for pitched roof", () => {
    const paths = generateRoofPaths("pitched", 200, 38, 100, "#3f382f", false);
    expect(paths.length).toBeGreaterThan(0);
    const strokes = paths.map((p) => p.stroke).filter((s) => s && s !== "none");
    expect(strokes.length).toBeGreaterThan(0);
    for (const p of paths) {
      expect(typeof p.d).toBe("string");
      expect(p.d.length).toBeGreaterThan(0);
    }
  });

  it("generates valid SVG paths for mansard roof", () => {
    const paths = generateRoofPaths("mansard", 220, 30, 200, "#2563eb", true);
    expect(paths.length).toBeGreaterThan(0);
    const strokes = paths.map((p) => p.stroke).filter((s) => s && s !== "none");
    expect(strokes.length).toBeGreaterThan(0);
    for (const p of paths) {
      expect(typeof p.d).toBe("string");
      expect(p.d.length).toBeGreaterThan(0);
    }
  });

  it("generates valid SVG paths for flat roof across all feature variants", () => {
    // 300 % 3 === 0: Chimney
    // 301 % 3 === 1: Water tank
    // 302 % 3 === 2: Industrial HVAC unit
    for (const seed of [300, 301, 302]) {
      const paths = generateRoofPaths("flat", 180, 16, seed, "#e11d48", false);
      expect(paths.length).toBeGreaterThan(0);
      for (const p of paths) {
        expect(typeof p.d).toBe("string");
        expect(p.d.length).toBeGreaterThan(0);
      }
    }
  });

  it("generates valid SVG paths for flat roof with lawn chairs", () => {
    const paths = generateRoofPaths(
      "flat-chairs",
      180,
      ROOF_HEIGHT_FLAT_CHAIRS,
      400,
      "#2563eb",
      false,
    );
    expect(paths.length).toBeGreaterThan(0);
    const strokes = paths.map((p) => p.stroke).filter((s) => s && s !== "none");
    expect(strokes.length).toBeGreaterThan(0);
    for (const p of paths) {
      expect(typeof p.d).toBe("string");
      expect(p.d.length).toBeGreaterThan(0);
    }
  });

  it("generates valid landscaping bush paths", () => {
    const paths = generateBushPaths(500, "#3f382f", false);
    expect(paths.length).toBeGreaterThan(0);
    const strokes = paths.map((p) => p.stroke).filter((s) => s && s !== "none");
    expect(strokes.length).toBeGreaterThan(0);
    for (const p of paths) {
      expect(typeof p.d).toBe("string");
      expect(p.d.length).toBeGreaterThan(0);
    }
  });

  it("generates valid landscaping flower paths", () => {
    const paths = generateFlowerPaths(500, "#3f382f", false);
    expect(paths.length).toBeGreaterThan(0);
    const strokes = paths.map((p) => p.stroke).filter((s) => s && s !== "none");
    expect(strokes.length).toBeGreaterThan(0);
    for (const p of paths) {
      expect(typeof p.d).toBe("string");
      expect(p.d.length).toBeGreaterThan(0);
    }
  });
  it("keeps botanical green strokes for flowers when building is organized", () => {
    const paths = generateFlowerPaths(500, "#00a8e8", true);
    const strokes = paths.map((p) => p.stroke);
    expect(strokes).not.toContain("#00a8e8");
    expect(strokes).toContain("#153314");
  });

  it("keeps botanical green strokes for bushes when building is organized", () => {
    const paths = generateBushPaths(500, "#00a8e8", true);
    const strokes = paths.map((p) => p.stroke);
    expect(strokes).not.toContain("#00a8e8");
    expect(strokes).toContain("#153314");
  });

  it("generates correct paths via generatePlantPaths", () => {
    const flowerPaths = generatePlantPaths("flower", 500, "#3f382f", false);
    const bushPaths = generatePlantPaths("bush", 500, "#3f382f", false);
    const nonePaths = generatePlantPaths("none", 500, "#3f382f", false);
    expect(flowerPaths.length).toBeGreaterThan(0);
    expect(bushPaths.length).toBeGreaterThan(0);
    expect(nonePaths.length).toBe(0);
  });
  it("generates valid ornamental balcony paths", () => {
    const paths = generateBalconyPaths(700, "#5c4f3d", false);
    expect(paths.length).toBeGreaterThan(0);
    const strokes = paths.map((p) => p.stroke).filter((s) => s && s !== "none");
    expect(strokes.length).toBeGreaterThan(0);
    for (const p of paths) {
      expect(typeof p.d).toBe("string");
      expect(p.d.length).toBeGreaterThan(0);
    }
  });

  it("picks a contrasting flower color palette for various building colors", () => {
    const redBuilding = "#c4545d"; // Warm red hue
    const blueBuilding = "#456fc3"; // Royal blue hue
    const amberBuilding = "#c48452"; // Amber gold hue

    const redFlower = pickFlowerPaletteForBuilding(redBuilding, 1);
    // Red building must not get a red/coral flower
    expect(["gold", "lavender", "cornflower", "cream"]).toContain(redFlower.name);

    const blueFlower = pickFlowerPaletteForBuilding(blueBuilding, 1);
    // Blue building must not get a blue/cornflower flower
    expect(["gold", "rose", "marigold", "coral", "cream"]).toContain(blueFlower.name);

    const amberFlower = pickFlowerPaletteForBuilding(amberBuilding, 1);
    // Amber building must not get amber/gold/marigold flower
    expect(["lavender", "cornflower"]).toContain(amberFlower.name);
  });

  it("uses contrasting flower colors in generateFlowerPaths and generatePlantPaths", () => {
    const redBuilding = "#c4545d";
    const flowerPaths = generateFlowerPaths(500, "#3f382f", false, undefined, redBuilding);
    expect(flowerPaths.length).toBeGreaterThan(0);

    const plantPaths = generatePlantPaths("flower", 500, "#3f382f", false, undefined, redBuilding);
    expect(plantPaths.length).toBeGreaterThan(0);
    // Verify fill colors contain the selected contrasting petal fill
    const fills = plantPaths.map((p) => p.fill).filter(Boolean);
    const redFlower = pickFlowerPaletteForBuilding(redBuilding, 500);
    expect(fills).toContain(redFlower.petal);
  });
});
