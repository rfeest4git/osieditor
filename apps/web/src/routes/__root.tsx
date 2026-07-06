import { Outlet, createRootRoute } from '@tanstack/react-router';
import { PButtonPure } from '@porsche-design-system/components-react';
import { Header } from '../components/shell/Header.js';
import { Navigator } from '../components/shell/Navigator.js';
import { useEditorStore } from '../store/editorStore.js';

export const Route = createRootRoute({
  component: RootLayout,
});

/**
 * App shell: a fixed header on top and a two-column body — the navigator
 * sidebar on the left, and the routed content (editor + source preview) on the
 * right via `<Outlet />`. The navigator can be collapsed to a thin rail to give
 * the routed content more horizontal space.
 */
function RootLayout() {
  const collapsed = useEditorStore((s) => s.navigatorCollapsed);
  const toggle = useEditorStore((s) => s.toggleNavigatorCollapsed);

  return (
    <div className="flex h-full flex-col">
      <Header />
      <div className="flex min-h-0 flex-1">
        {collapsed ? (
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
        ) : (
          <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-surface-raised">
            <div className="flex items-center justify-end border-b border-border px-2 py-1.5">
              <PButtonPure
                icon="arrow-head-left"
                hideLabel={true}
                onClick={toggle}
                aria-label="Collapse navigator"
                title="Collapse navigator"
              >
                Collapse navigator
              </PButtonPure>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <Navigator />
            </div>
          </aside>
        )}
        <main className="min-w-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
