import { describe, it, expect } from "bun:test";
import {
  getRoofHeight,
  getDefaultBuildingRoofType,
  getDefaultBuildingHasBalcony,
  getDefaultBuildingHasGrass,
  generateRoofPaths,
  generateBalconyPaths,
  generateFrontLawnPaths,
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
    expect(getDefaultBuildingHasGrass(1)).toBe(false);
    expect(getDefaultBuildingHasGrass(2)).toBe(true);
    expect(getDefaultBuildingHasGrass(3)).toBe(false);
    expect(getDefaultBuildingHasGrass(4)).toBe(true);
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

  it("generates valid SVG paths for flat roof", () => {
    const paths = generateRoofPaths("flat", 180, 16, 300, "#e11d48", false);
    expect(paths.length).toBeGreaterThan(0);
    for (const p of paths) {
      expect(typeof p.d).toBe("string");
      expect(p.d.length).toBeGreaterThan(0);
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

  it("generates valid front lawn grass paths", () => {
    const paths = generateFrontLawnPaths(180, 500, "#3f382f", false);
    expect(paths.length).toBeGreaterThan(0);
    const strokes = paths.map((p) => p.stroke).filter((s) => s && s !== "none");
    expect(strokes.length).toBeGreaterThan(0);
    for (const p of paths) {
      expect(typeof p.d).toBe("string");
      expect(p.d.length).toBeGreaterThan(0);
    }
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
});
