/**
 * Shared layout constants and helpers for the resizable workspace panels.
 *
 * Widths are stored as numeric pixels in the editor store and applied via inline
 * styles. Each region is clamped to a shared minimum and a viewport-relative
 * maximum so the center pane always keeps usable space.
 */

/** The three side regions that can be resized / maximized. */
export type ResizableRegion = 'navigator' | 'sourcePreview' | 'inspector';

/**
 * A region that can be maximized to fill the workspace. In addition to the
 * resizable side regions, the center pane (form editor / relationship graph)
 * can be maximized even though it has no adjustable width.
 */
export type FullscreenRegion = ResizableRegion | 'center';

/** Default widths, seeded from the previous fixed Tailwind widths (w-72 / w-96). */
export const PANEL_WIDTH_DEFAULTS: Record<ResizableRegion, number> = {
  navigator: 288,
  sourcePreview: 384,
  inspector: 384,
};

/** Minimum width for any resizable region so it stays legible. */
export const PANEL_MIN_WIDTH = 200;

/** Hard upper bound (px) for any region regardless of viewport size. */
export const PANEL_MAX_WIDTH_PX = 800;

/** Fraction of the viewport width a region may occupy at most. */
export const PANEL_MAX_VIEWPORT_FRACTION = 0.4;

/** Current maximum panel width, clamped to a fraction of the viewport. */
export function panelMaxWidth(): number {
  const viewport = globalThis.window === undefined ? 1280 : globalThis.innerWidth;
  return Math.min(PANEL_MAX_WIDTH_PX, Math.round(viewport * PANEL_MAX_VIEWPORT_FRACTION));
}

/** Clamp a candidate width to the shared `[MIN, MAX]` bounds. */
export function clampPanelWidth(width: number): number {
  return Math.max(PANEL_MIN_WIDTH, Math.min(panelMaxWidth(), Math.round(width)));
}
