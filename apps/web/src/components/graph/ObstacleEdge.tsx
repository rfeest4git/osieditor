import { BaseEdge, EdgeLabelRenderer, useStore, type EdgeProps, type ReactFlowState } from '@xyflow/react';
import { memo, useMemo } from 'react';
import { routeEdge, type Rect, type Side } from './edgeRouting.js';

/** A node's id + bounding box, read from the React Flow store. */
interface NodeBox extends Rect {
  id: string;
}

/** Collect every measured node box from the store (absolute positions + sizes). */
function nodeBoxSelector(state: ReactFlowState): NodeBox[] {
  const boxes: NodeBox[] = [];
  state.nodeLookup.forEach((n) => {
    const width = n.measured?.width ?? n.width ?? 0;
    const height = n.measured?.height ?? n.height ?? 0;
    if (width <= 0 || height <= 0) return;
    boxes.push({
      id: n.id,
      x: n.internals.positionAbsolute.x,
      y: n.internals.positionAbsolute.y,
      width,
      height,
    });
  });
  return boxes;
}

/** Value-equality for the box list so the edge only re-routes on real geometry changes. */
function boxesEqual(a: NodeBox[], b: NodeBox[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((x, i) => {
    const y = b[i];
    return (
      y !== undefined &&
      x.id === y.id &&
      x.x === y.x &&
      x.y === y.y &&
      x.width === y.width &&
      x.height === y.height
    );
  });
}

/** Map a React Flow `Position` to the router's `Side`. Defaults to a horizontal channel. */
function toSide(position: EdgeProps['sourcePosition']): Side {
  switch (position) {
    case 'left':
      return 'left';
    case 'right':
      return 'right';
    case 'top':
      return 'top';
    case 'bottom':
      return 'bottom';
    default:
      return 'right';
  }
}

/**
 * Obstacle-aware orthogonal edge. Reads every node box from the store, treats all
 * boxes except this edge's own two endpoints as obstacles, and routes an
 * orthogonal polyline around them via {@link routeEdge}. Recomputes automatically
 * as node positions change (drag / "Arrange") because it subscribes to the store.
 */
function ObstacleEdgeComponent({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  markerEnd,
  markerStart,
  style,
}: EdgeProps) {
  const boxes = useStore(nodeBoxSelector, boxesEqual);

  const { path, labelX, labelY } = useMemo(() => {
    // Every box except the edge's own endpoints is an obstacle to route around.
    const obstacles: Rect[] = boxes
      .filter((b) => b.id !== source && b.id !== target)
      .map(({ x, y, width, height }) => ({ x, y, width, height }));
    return routeEdge(
      { x: sourceX, y: sourceY },
      { x: targetX, y: targetY },
      toSide(sourcePosition),
      toSide(targetPosition),
      obstacles,
    );
  }, [boxes, source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition]);

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} markerStart={markerStart} style={style} />
      {label != null && label !== '' && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              padding: '2px 4px',
              borderRadius: 4,
              fontSize: 11,
              background: 'var(--rf-edge-label-bg, #ffffffcc)',
              color: '#333',
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

/** Memoized so an edge only re-renders when its own props or subscribed boxes change. */
export const ObstacleEdge = memo(ObstacleEdgeComponent);
