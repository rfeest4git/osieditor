import { Outlet, createRootRoute } from '@tanstack/react-router';
import { PButtonPure } from '@porsche-design-system/components-react';
import { useEffect } from 'react';
import { Header } from '../components/shell/Header.js';
import { Navigator } from '../components/shell/Navigator.js';
import { ResizeHandle } from '../components/shell/ResizeHandle.js';
import type { FullscreenRegion } from '../lib/panelLayout.js';
import { useEditorStore } from '../store/editorStore.js';

export const Route = createRootRoute({
  component: RootLayout,
});

/**
 * App shell: a fixed header on top and a two-column body — the navigator
 * sidebar on the left, and the routed content (editor + source preview) on the
 * right via `<Outlet />`. The navigator can be collapsed to a thin rail, resized
 * by dragging its inner edge, or maximized to fill the whole workspace.
 */
function RootLayout() {
  const fullscreen = useEditorStore((s) => s.fullscreenRegion);
  const exitFullscreen = useEditorStore((s) => s.exitFullscreen);

  // Allow Esc to leave full-screen mode.
  useEffect(() => {
    if (fullscreen === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') exitFullscreen();
    };
    globalThis.addEventListener('keydown', onKeyDown);
    return () => globalThis.removeEventListener('keydown', onKeyDown);
  }, [fullscreen, exitFullscreen]);

  const navFullscreen = fullscreen === 'navigator';

  return (
    <div className="flex h-full flex-col">
      <Header />
      <div className="flex min-h-0 flex-1">
        <NavigatorRegion fullscreen={fullscreen} />
        {navFullscreen ? null : (
          <main className="min-w-0 flex-1 overflow-hidden">
            <Outlet />
          </main>
        )}
      </div>
    </div>
  );
}

/** The left navigator region: collapsed rail, resizable panel, or full-screen. */
function NavigatorRegion({ fullscreen }: Readonly<{ fullscreen: FullscreenRegion | null }>) {
  const collapsed = useEditorStore((s) => s.navigatorCollapsed);
  const toggle = useEditorStore((s) => s.toggleNavigatorCollapsed);
  const width = useEditorStore((s) => s.navigatorWidth);
  const setWidth = useEditorStore((s) => s.setNavigatorWidth);
  const toggleFullscreen = useEditorStore((s) => s.toggleFullscreenRegion);

  const navFullscreen = fullscreen === 'navigator';
  // When another region is maximized, the navigator is hidden entirely.
  if (fullscreen !== null && !navFullscreen) return null;

  if (collapsed && !navFullscreen) {
    return (
      <div className="flex w-10 shrink-0 flex-col items-center border-r border-border bg-surface-raised py-2">
        <PButtonPure
          icon="arrow-head-right"
          hideLabel={true}
          onClick={toggle}
          aria-label="Expand navigator"
          title="Expand navigator"
        >
          Expand navigator
        </PButtonPure>
      </div>
    );
  }

  return (
    <aside
      className={`relative flex flex-col border-r border-border bg-surface-raised ${
        navFullscreen ? 'min-w-0 flex-1' : 'shrink-0'
      }`}
      style={navFullscreen ? undefined : { width }}
    >
      <div className="flex items-center justify-end gap-1 border-b border-border px-2 py-1.5">
        <PButtonPure
          icon={navFullscreen ? 'close' : 'arrows'}
          hideLabel={true}
          onClick={() => toggleFullscreen('navigator')}
          aria-label={navFullscreen ? 'Exit full screen' : 'Maximize navigator'}
          title={navFullscreen ? 'Exit full screen' : 'Maximize navigator'}
        >
          {navFullscreen ? 'Exit full screen' : 'Maximize navigator'}
        </PButtonPure>
        {!navFullscreen && (
          <PButtonPure
            icon="arrow-head-left"
            hideLabel={true}
            onClick={toggle}
            aria-label="Collapse navigator"
            title="Collapse navigator"
          >
            Collapse navigator
          </PButtonPure>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Navigator />
      </div>
      {!navFullscreen && (
        <ResizeHandle
          side="left"
          getWidth={() => useEditorStore.getState().navigatorWidth}
          setWidth={setWidth}
          ariaLabel="Resize navigator"
        />
      )}
    </aside>
  );
}
