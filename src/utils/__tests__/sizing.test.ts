import { describe, expect, it } from "bun:test";
import { BASELINE_PERSON_WIDTH, calculateOptimalPersonSize } from "../sizing";

describe("calculateOptimalPersonSize", () => {
  it("keeps extra canvas space between buildings in a four-building game", () => {
    const sizing = calculateOptimalPersonSize(4, 5, 1200, 842);

    expect(sizing.personWidth).toBe(BASELINE_PERSON_WIDTH);
    expect(sizing.personScale).toBe(1);
  });

  it("still shrinks people when a dense game needs the space", () => {
    const sizing = calculateOptimalPersonSize(8, 8, 1050, 750);

    expect(sizing.personWidth).toBeLessThan(BASELINE_PERSON_WIDTH);
    expect(sizing.personScale).toBeLessThan(1);
  });
});
