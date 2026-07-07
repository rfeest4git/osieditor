import { useCallback, useRef } from 'react';

/**
 * Which edge the resize handle lives on. Left-docked regions (navigator) grow
 * when the pointer moves right; right-docked regions (source preview, inspector)
 * grow when the pointer moves left, so their delta sign is inverted.
 */
export type ResizeSide = 'left' | 'right';

/**
 * Lightweight drag-to-resize hook built on pointer events. On `pointerdown` it
 * captures the pointer and tracks `pointermove`/`pointerup` on `window`, feeding
 * the running width (start width +/- pointer delta) to a clamped setter. Text
 * selection and the col-resize cursor are managed on `document.body` for the
 * duration of the drag.
 *
 * @param side     Which side the panel is docked on (inverts the delta sign).
 * @param getWidth Reads the current width at drag start.
 * @param setWidth Applies the new (clamped) width to the store.
 */
export function usePanelResize(
  side: ResizeSide,
  getWidth: () => number,
  setWidth: (width: number) => void,
) {
  const stateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      const state = stateRef.current;
      if (!state) return;
      const delta = event.clientX - state.startX;
      const next = side === 'left' ? state.startWidth + delta : state.startWidth - delta;
      setWidth(next);
    },
    [side, setWidth],
  );

  const endDrag = useCallback(() => {
    stateRef.current = null;
    globalThis.removeEventListener('pointermove', onPointerMove);
    globalThis.removeEventListener('pointerup', endDrag);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, [onPointerMove]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      stateRef.current = { startX: event.clientX, startWidth: getWidth() };
      // Pointer capture keeps the drag alive when the cursor leaves the handle,
      // but the move/up listeners live on `window` so a capture failure (e.g. an
      // already-released pointer) must not abort the drag.
      try {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      } catch {
        // ignore — window listeners still drive the resize
      }
      globalThis.addEventListener('pointermove', onPointerMove);
      globalThis.addEventListener('pointerup', endDrag);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    },
    [getWidth, onPointerMove, endDrag],
  );

  return { onPointerDown };
}
