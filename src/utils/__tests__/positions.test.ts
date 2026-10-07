import { describe, expect, it } from "bun:test";
import { spaceOutNodes, DEFAULT_SPACE_OUT_BOUNDS, DEFAULT_ACTION_PANEL_BOUNDS } from "../positions";

describe("spaceOutNodes", () => {
  it("returns empty array when given empty input", () => {
    expect(spaceOutNodes([])).toEqual([]);
  });

  it("centers a single node within bounds", () => {
    const single = [{ id: "b1", x: 10, y: 10, w: 16, h: 22 }];
    const result = spaceOutNodes(single);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("b1");
    // Midpoint between minX (2.5) and maxX - w (97.5 - 16 = 81.5) is (2.5 + 81.5) / 2 = 42.0
    expect(result[0]!.x).toBeCloseTo(42.0, 1);
    // Midpoint between minY (3.0) and maxY - h (95.0 - 22 = 73.0) is (3.0 + 73.0) / 2 = 38.0
    expect(result[0]!.y).toBeCloseTo(38.0, 1);
  });

  it("spreads multiple clustered nodes across available space", () => {
    // 4 nodes in a tight cluster in top-left
    const clustered = [
      { id: "b1", x: 10, y: 10, w: 15, h: 20 },
      { id: "b2", x: 15, y: 10, w: 15, h: 20 },
      { id: "b3", x: 10, y: 15, w: 15, h: 20 },
      { id: "b4", x: 15, y: 15, w: 15, h: 20 },
    ];

    const result = spaceOutNodes(clustered);
    expect(result).toHaveLength(4);

    // Initial spread was ~5% across X and Y
    // After spacing out, nodes should span a much larger fraction of the canvas
    const xs = result.map((r) => r.x);
    const ys = result.map((r) => r.y);
    const spreadX = Math.max(...xs) - Math.min(...xs);
    const spreadY = Math.max(...ys) - Math.min(...ys);

    expect(spreadX).toBeGreaterThan(40);
    expect(spreadY).toBeGreaterThan(40);

    // All nodes must stay within canvas bounds
    for (const r of result) {
      expect(r.x).toBeGreaterThanOrEqual(DEFAULT_SPACE_OUT_BOUNDS.minX - 0.1);
      expect(r.x + 15).toBeLessThanOrEqual(DEFAULT_SPACE_OUT_BOUNDS.maxX + 0.1);
      expect(r.y).toBeGreaterThanOrEqual(DEFAULT_SPACE_OUT_BOUNDS.minY - 0.1);
      expect(r.y + 20).toBeLessThanOrEqual(DEFAULT_SPACE_OUT_BOUNDS.maxY + 0.1);
    }
  });

  it("guarantees no overlaps among spaced out nodes", () => {
    const nodes = [
      { id: "b1", x: 5, y: 5, w: 14, h: 20 },
      { id: "b2", x: 25, y: 5, w: 14, h: 20 },
      { id: "b3", x: 45, y: 5, w: 14, h: 20 },
      { id: "b4", x: 65, y: 5, w: 14, h: 20 },
      { id: "b5", x: 5, y: 35, w: 14, h: 20 },
      { id: "b6", x: 25, y: 35, w: 14, h: 20 },
      { id: "b7", x: 45, y: 35, w: 14, h: 20 },
      { id: "b8", x: 65, y: 35, w: 14, h: 20 },
    ];

    const result = spaceOutNodes(nodes);
    expect(result).toHaveLength(8);

    // Verify pairwise no-overlap
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const n1 = result[i]!;
        const n2 = result[j]!;

        const w1 = 14;
        const h1 = 20;
        const w2 = 14;
        const h2 = 20;

        const overlapX = Math.min(n1.x + w1, n2.x + w2) - Math.max(n1.x, n2.x);
        const overlapY = Math.min(n1.y + h1, n2.y + h2) - Math.max(n1.y, n2.y);

        const hasOverlap = overlapX > 0.05 && overlapY > 0.05;
        expect(hasOverlap).toBe(false);
      }
    }
  });

  it("avoids the bottom-right action panel region", () => {
    // 6 nodes placed near bottom-right
    const nodes = [
      { id: "b1", x: 70, y: 70, w: 15, h: 20 },
      { id: "b2", x: 75, y: 70, w: 15, h: 20 },
      { id: "b3", x: 80, y: 70, w: 15, h: 20 },
      { id: "b4", x: 70, y: 75, w: 15, h: 20 },
      { id: "b5", x: 75, y: 75, w: 15, h: 20 },
      { id: "b6", x: 80, y: 75, w: 15, h: 20 },
    ];

    const result = spaceOutNodes(nodes);
    for (const r of result) {
      const right = r.x + 15;
      const bottom = r.y + 20;
      const inActionPanel =
        right > DEFAULT_ACTION_PANEL_BOUNDS.minX && bottom > DEFAULT_ACTION_PANEL_BOUNDS.minY;
      expect(inActionPanel).toBe(false);
    }
  });

  it("handles completely overlapping input nodes cleanly", () => {
    // 4 nodes at the exact same location
    const identical = [
      { id: "b1", x: 40, y: 40, w: 16, h: 22 },
      { id: "b2", x: 40, y: 40, w: 16, h: 22 },
      { id: "b3", x: 40, y: 40, w: 16, h: 22 },
      { id: "b4", x: 40, y: 40, w: 16, h: 22 },
    ];

    const result = spaceOutNodes(identical);
    expect(result).toHaveLength(4);

    // Each node should now have a distinct position
    const positions = new Set(result.map((r) => `${r.x},${r.y}`));
    expect(positions.size).toBe(4);
  });

  it("handles collinear input nodes by expanding into 2D space", () => {
    // 3 nodes in a horizontal line
    const collinear = [
      { id: "b1", x: 20, y: 30, w: 15, h: 20 },
      { id: "b2", x: 35, y: 30, w: 15, h: 20 },
      { id: "b3", x: 50, y: 30, w: 15, h: 20 },
    ];

    const result = spaceOutNodes(collinear);
    expect(result).toHaveLength(3);

    // Vertical spread should now be significant (> 20%)
    const ys = result.map((r) => r.y);
    const spreadY = Math.max(...ys) - Math.min(...ys);
    expect(spreadY).toBeGreaterThan(20);
  });
});
