import { describe, expect, it } from "bun:test";
import { getBuildingGridDimensions } from "../layout";
import { generateDefaultPositions } from "../positions";
import { BASELINE_PERSON_WIDTH, calculateOptimalPersonSize } from "../sizing";

describe("generated building layout", () => {
  it("caps sparse layouts so buildings keep comfortable gutters", () => {
    expect(calculateOptimalPersonSize(2, 5, 1050, 750).personWidth).toBe(80);
  });

  it("lays out five buildings in comfortably sized, ordered, centered rows", () => {
    const grid = getBuildingGridDimensions(5, 5, 1050, 750);
    const positions = generateDefaultPositions(5, 5, 1050, 750);
    const sizing = calculateOptimalPersonSize(5, 5, 1050, 750);

    expect(grid).toEqual({ cols: 3, rows: 2 });
    expect(sizing.personWidth).toBeGreaterThan(BASELINE_PERSON_WIDTH);

    expect(positions.slice(0, 3).map(({ y }) => y)).toEqual([5, 5, 5]);
    expect(positions.slice(0, 3).map(({ x }) => x)).toEqual([4, 35.5, 67]);
    expect(positions.slice(3).map(({ y }) => y)).toEqual([52.2, 52.2]);
    expect(positions.slice(3).map(({ x }) => x)).toEqual([19.8, 51.3]);
  });
});
