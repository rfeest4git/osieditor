import { Outlet, createRootRoute } from '@tanstack/react-router';
import { Header } from '../components/shell/Header.js';
import { Navigator } from '../components/shell/Navigator.js';

export const Route = createRootRoute({
  component: RootLayout,
});

/**
 * App shell: a fixed header on top and a two-column body — the navigator
 * sidebar on the left, and the routed content (editor + source preview) on the
 * right via `<Outlet />`.
 */
function RootLayout() {
  return (
    <div className="flex h-full flex-col">
      <Header />
      <div className="flex min-h-0 flex-1">
        <aside className="w-72 shrink-0 overflow-y-auto border-r border-border bg-surface-raised">
          <Navigator />
        </aside>
        <main className="min-w-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
