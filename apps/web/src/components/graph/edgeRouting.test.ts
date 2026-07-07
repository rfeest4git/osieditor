import { describe, expect, it } from 'vitest';
import {
  directOrthogonalPath,
  inflateRect,
  labelAnchor,
  pathIsClear,
  routeEdge,
  segmentIntersectsRect,
  simplify,
  type Point,
  type Rect,
} from './edgeRouting.js';

/** A box between the two endpoints used across the routing tests. */
const middleBox: Rect = { x: 90, y: 40, width: 40, height: 40 };

/** True when no segment of the polyline passes through the OPEN interior of `rect`. */
function polylineAvoids(points: Point[], rect: Rect): boolean {
  return pathIsClear(points, [rect]);
}

describe('inflateRect', () => {
  it('grows the rectangle by the padding on every side', () => {
    expect(inflateRect({ x: 10, y: 10, width: 20, height: 20 }, 5)).toEqual({
      x: 5,
      y: 5,
      width: 30,
      height: 30,
    });
  });
});

describe('segmentIntersectsRect', () => {
  const rect: Rect = { x: 0, y: 0, width: 10, height: 10 };

  it('detects a horizontal segment crossing the interior', () => {
    expect(segmentIntersectsRect({ x: -5, y: 5 }, { x: 15, y: 5 }, rect)).toBe(true);
  });

  it('detects a vertical segment crossing the interior', () => {
    expect(segmentIntersectsRect({ x: 5, y: -5 }, { x: 5, y: 15 }, rect)).toBe(true);
  });

  it('treats a segment flush against an edge as non-crossing', () => {
    expect(segmentIntersectsRect({ x: -5, y: 0 }, { x: 15, y: 0 }, rect)).toBe(false);
    expect(segmentIntersectsRect({ x: 0, y: -5 }, { x: 0, y: 15 }, rect)).toBe(false);
  });

  it('ignores a segment entirely outside the rect', () => {
    expect(segmentIntersectsRect({ x: -5, y: 20 }, { x: 15, y: 20 }, rect)).toBe(false);
  });
});

describe('simplify', () => {
  it('drops duplicate and collinear points', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    expect(simplify(points)).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]);
  });
});

describe('labelAnchor', () => {
  it('returns the midpoint of a straight segment', () => {
    expect(labelAnchor([{ x: 0, y: 0 }, { x: 100, y: 0 }])).toEqual({ x: 50, y: 0 });
  });
});

describe('routeEdge', () => {
  const source: Point = { x: 0, y: 60 };
  const target: Point = { x: 220, y: 60 };

  it('uses the direct path when the channel is clear', () => {
    const result = routeEdge(source, target, 'right', 'left', []);
    // A clear right→left channel collapses to a single straight segment.
    expect(result.points).toEqual([source, target]);
    expect(result.path).toBe('M0,60L220,60');
  });

  it('produces a path that avoids a box placed between the endpoints', () => {
    // The box straddles y=60, so the direct horizontal channel is blocked.
    const box: Rect = { x: 90, y: 40, width: 40, height: 60 };
    const result = routeEdge(source, target, 'right', 'left', [box]);
    expect(polylineAvoids(result.points, box)).toBe(true);
    // Detour introduces at least one bend beyond the two endpoints.
    expect(result.points.length).toBeGreaterThan(2);
  });

  it('never crosses any non-endpoint rectangle among several obstacles', () => {
    const obstacles: Rect[] = [
      { x: 60, y: 40, width: 40, height: 40 },
      { x: 120, y: 30, width: 40, height: 60 },
      { x: 160, y: 70, width: 30, height: 40 },
    ];
    const result = routeEdge(source, target, 'right', 'left', obstacles);
    for (const rect of obstacles) {
      expect(polylineAvoids(result.points, rect)).toBe(true);
    }
  });

  it('keeps endpoints as the path start and end', () => {
    const result = routeEdge(source, target, 'right', 'left', [middleBox]);
    expect(result.points[0]).toEqual(source);
    expect(result.points[result.points.length - 1]).toEqual(target);
  });
});

describe('directOrthogonalPath', () => {
  it('builds a Z path split at the horizontal midpoint', () => {
    const path = directOrthogonalPath({ x: 0, y: 0 }, { x: 100, y: 40 }, 'right', 'left');
    expect(path).toEqual([
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 40 },
      { x: 100, y: 40 },
    ]);
  });
});
