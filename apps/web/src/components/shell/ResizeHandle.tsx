import { usePanelResize, type ResizeSide } from '../../lib/usePanelResize.js';

/**
 * A thin, hoverable drag strip on the inner edge of a resizable side panel.
 * Absolutely positioned within a `relative` panel container; the parent panel
 * owns the actual width. `side` matches the panel's dock side so the handle sits
 * on the inner edge and the drag delta widens/narrows correctly.
 */
export function ResizeHandle({
  side,
  getWidth,
  setWidth,
  ariaLabel,
}: Readonly<{
  side: ResizeSide;
  getWidth: () => number;
  setWidth: (width: number) => void;
  ariaLabel: string;
}>) {
  const { onPointerDown } = usePanelResize(side, getWidth, setWidth);
  const edgeClass = side === 'left' ? 'right-0' : 'left-0';

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      className={`absolute inset-y-0 ${edgeClass} z-20 w-1.5 cursor-col-resize touch-none border-0 bg-transparent p-0 transition-colors hover:bg-brand/40`}
    />
  );
}
