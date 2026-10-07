/// <reference types="bun" />
import { describe, it, expect } from "bun:test";
import {
  getEdgeConnectionPoints,
  getNearestEdgePointOnRect,
  computeThreadCurve,
  getEstimatedBuildingRect,
  type BuildingRect,
} from "../utils/geometry";

function createRect(x1: number, y1: number, width: number, height: number): BuildingRect {
  return {
    x1,
    y1,
    x2: x1 + width,
    y2: y1 + height,
    cx: x1 + width / 2,
    cy: y1 + height / 2,
    width,
    height,
  };
}

describe("geometry utils", () => {
  it("connects horizontal buildings edge-to-edge at facing vertical centers", () => {
    // r1: [100, 260] x [100, 320], r2: [500, 660] x [100, 320]
    const r1 = createRect(100, 100, 160, 220);
    const r2 = createRect(500, 100, 160, 220);
    const { p1, p2 } = getEdgeConnectionPoints(r1, r2);

    expect(p1.x).toBe(260); // right edge of r1
    expect(p1.y).toBe(210); // vertical center of r1
    expect(p2.x).toBe(500); // left edge of r2
    expect(p2.y).toBe(210); // vertical center of r2
  });

  it("connects vertical buildings edge-to-edge at facing horizontal centers", () => {
    // r1: [100, 260] x [100, 320], r2: [100, 260] x [500, 720]
    const r1 = createRect(100, 100, 160, 220);
    const r2 = createRect(100, 500, 160, 220);
    const { p1, p2 } = getEdgeConnectionPoints(r1, r2);

    expect(p1.x).toBe(180); // horizontal center of r1
    expect(p1.y).toBe(320); // bottom edge of r1
    expect(p2.x).toBe(180); // horizontal center of r2
    expect(p2.y).toBe(500); // top edge of r2
  });

  it("connects diagonal buildings along facing edges", () => {
    const r1 = createRect(100, 100, 160, 220);
    const r2 = createRect(500, 500, 160, 220);
    const { p1, p2 } = getEdgeConnectionPoints(r1, r2);

    expect(p1.x).toBe(260); // on right edge of r1
    expect(p1.y).toBeGreaterThan(100);
    expect(p1.y).toBeLessThanOrEqual(320);

    expect(p2.x).toBe(500); // on left edge of r2
    expect(p2.y).toBeGreaterThanOrEqual(500);
    expect(p2.y).toBeLessThan(720);
  });

  it("finds nearest edge point on rectangle towards an external point", () => {
    // r: [300, 460] x [200, 420]
    const r = createRect(300, 200, 160, 220);
    // Point directly to the left at y=310
    const ptLeft = getNearestEdgePointOnRect(100, 310, r);
    expect(ptLeft.x).toBe(300); // left edge
    expect(ptLeft.y).toBe(310);

    // Point directly above at x=380
    const ptAbove = getNearestEdgePointOnRect(380, 50, r);
    expect(ptAbove.x).toBe(380);
    expect(ptAbove.y).toBe(200); // top edge
  });

  it("computes quadratic thread curve and sag midpoint correctly", () => {
    const curve = computeThreadCurve(100, 100, 500, 100);
    expect(curve.pathData).toContain("M 100 100 Q");
    expect(curve.cx).toBe(300);
    expect(curve.cy).toBeGreaterThan(100); // positive sag
    expect(curve.midX).toBe(300);
    expect(curve.midY).toBe((100 + curve.cy) / 2);
  });

  it("provides fallback estimated rectangle", () => {
    const rect = getEstimatedBuildingRect(50, 50, 1000, 800);
    expect(rect.x1).toBe(500);
    expect(rect.y1).toBe(400);
    expect(rect.width).toBe(180);
    expect(rect.height).toBe(220);
    expect(rect.x2).toBe(680);
    expect(rect.y2).toBe(620);
  });
});
