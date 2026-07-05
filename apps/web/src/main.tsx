import { PorscheDesignSystemProvider } from '@porsche-design-system/components-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { routeTree } from './routeTree.gen';
// PDS v4 ships its design tokens (`--p-color-*`, `--p-radius-*`, …) as global CSS
// custom properties. Newer components (e.g. the p-select flyout) consume these via
// `var(--p-color-canvas)` with no fallback, so without this import their overlays
// render unstyled — transparent, no border/background/radius. Imported before our
// own styles so our overrides still win.
import '@porsche-design-system/components-react/variables.css';
import './styles.css';

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const queryClient = new QueryClient();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <StrictMode>
    <PorscheDesignSystemProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </PorscheDesignSystemProvider>
  </StrictMode>,
);
