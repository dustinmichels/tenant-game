export interface BuildingRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cx: number;
  cy: number;
  width: number;
  height: number;
}

/**
 * Calculates the connection points on the nearest edges between two building bounding boxes.
 * Traces a ray between the centers of the two rectangles and intersects each rectangle boundary.
 */
export function getEdgeConnectionPoints(
  r1: BuildingRect,
  r2: BuildingRect,
): { p1: { x: number; y: number }; p2: { x: number; y: number } } {
  const dx = r2.cx - r1.cx;
  const dy = r2.cy - r1.cy;

  if (Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4) {
    return {
      p1: { x: r1.cx, y: r1.cy },
      p2: { x: r2.cx, y: r2.cy },
    };
  }

  const hw1 = r1.width / 2;
  const hh1 = r1.height / 2;
  const scale1 = Math.min(
    dx !== 0 ? hw1 / Math.abs(dx) : Infinity,
    dy !== 0 ? hh1 / Math.abs(dy) : Infinity,
  );

  const hw2 = r2.width / 2;
  const hh2 = r2.height / 2;
  const scale2 = Math.min(
    dx !== 0 ? hw2 / Math.abs(dx) : Infinity,
    dy !== 0 ? hh2 / Math.abs(dy) : Infinity,
  );

  return {
    p1: {
      x: r1.cx + dx * scale1,
      y: r1.cy + dy * scale1,
    },
    p2: {
      x: r2.cx - dx * scale2,
      y: r2.cy - dy * scale2,
    },
  };
}

/**
 * Calculates the point on the boundary of rectangle `r` that intersects the line towards `(fromX, fromY)`.
 */
export function getNearestEdgePointOnRect(
  fromX: number,
  fromY: number,
  r: BuildingRect,
): { x: number; y: number } {
  const dx = fromX - r.cx;
  const dy = fromY - r.cy;

  if (Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4) {
    return { x: r.cx, y: r.cy };
  }

  const hw = r.width / 2;
  const hh = r.height / 2;
  const scale = Math.min(
    dx !== 0 ? hw / Math.abs(dx) : Infinity,
    dy !== 0 ? hh / Math.abs(dy) : Infinity,
  );

  return {
    x: r.cx + dx * scale,
    y: r.cy + dy * scale,
  };
}

/**
 * Computes a quadratic Bezier curve with natural sag between two connection endpoints.
 * Returns the path string, control point, and midpoint for scissors/action pins.
 */
export function computeThreadCurve(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): {
  pathData: string;
  cx: number;
  cy: number;
  midX: number;
  midY: number;
} {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const sag = Math.min(50, Math.max(14, dist * 0.12));

  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  let cx = mx;
  let cy = my + sag;

  // For nearly vertical threads, add gentle lateral bow so the curve doesn't collapse into a straight line
  if (Math.abs(dx) < dist * 0.45) {
    cx = mx + sag * 0.35 * (1.0 - Math.abs(dx) / (dist * 0.45 + 1e-4));
  }

  const midX = (mx + cx) / 2;
  const midY = (my + cy) / 2;

  return {
    pathData: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`,
    cx,
    cy,
    midX,
    midY,
  };
}

/**
 * Fallback geometry estimate for buildings whose DOM nodes are not yet measured.
 */
export function getEstimatedBuildingRect(
  xPercent: number,
  yPercent: number,
  canvasW: number,
  canvasH: number,
  width = 180,
  height = 220,
): BuildingRect {
  const x1 = (xPercent / 100) * canvasW;
  const y1 = (yPercent / 100) * canvasH;
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
