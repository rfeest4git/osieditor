import { createFileRoute } from '@tanstack/react-router';
import { PButtonPure } from '@porsche-design-system/components-react';
import { useState } from 'react';
import { EditorPane } from '../components/editor/EditorPane.js';
import { SourcePreview } from '../components/editor/SourcePreview.js';
import { GraphView } from '../components/graph/GraphView.js';
import { ResizeHandle } from '../components/shell/ResizeHandle.js';
import { EmptyState } from '../components/shell/EmptyState.js';
import { useEditorStore } from '../store/editorStore.js';

export const Route = createFileRoute('/')({
  component: EditorWorkspace,
});

type WorkspaceView = 'form' | 'graph';

/**
 * The main workspace: a center pane that switches between the form editor and
 * the relationship graph, and a right-hand live source-preview pane that can be
 * collapsed, resized by dragging its inner edge, or maximized to fill the
 * workspace.
 */
function EditorWorkspace() {
  const doc = useEditorStore((s) => s.doc);
  const previewCollapsed = useEditorStore((s) => s.sourcePreviewCollapsed);
  const togglePreview = useEditorStore((s) => s.toggleSourcePreviewCollapsed);
  const width = useEditorStore((s) => s.sourcePreviewWidth);
  const setWidth = useEditorStore((s) => s.setSourcePreviewWidth);
  const fullscreen = useEditorStore((s) => s.fullscreenRegion);
  const toggleFullscreen = useEditorStore((s) => s.toggleFullscreenRegion);
  const [view, setView] = useState<WorkspaceView>('form');

  if (!doc) {
    return <EmptyState />;
  }

  const previewFullscreen = fullscreen === 'sourcePreview';
  const centerFullscreen = fullscreen === 'center';
  // The source preview is shown when maximized, or in normal layout while not
  // collapsed and no other region is maximized.
  const showPreview = previewFullscreen || (!previewCollapsed && fullscreen === null);

  return (
    <div className="flex h-full min-h-0">
      {!previewFullscreen && (
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1 border-b border-border bg-surface px-3 py-2">
            <ViewTab active={view === 'form'} onClick={() => setView('form')}>
              Form editor
            </ViewTab>
            <ViewTab active={view === 'graph'} onClick={() => setView('graph')}>
              Relationship graph
            </ViewTab>
            <div className="ml-auto flex items-center gap-2">
              {previewCollapsed && fullscreen === null && (
                <div className="hidden lg:block">
                  <PButtonPure
                    icon="arrow-head-left"
                    hideLabel={true}
                    onClick={togglePreview}
                    aria-label="Show source preview"
                    title="Show source preview"
                  >
                    Show source preview
                  </PButtonPure>
                </div>
              )}
              <PButtonPure
                icon={centerFullscreen ? 'close' : 'arrows'}
                hideLabel={true}
                onClick={() => toggleFullscreen('center')}
                aria-label={centerFullscreen ? 'Exit full screen' : 'Maximize editor'}
                title={centerFullscreen ? 'Exit full screen' : 'Maximize editor'}
              >
                {centerFullscreen ? 'Exit full screen' : 'Maximize editor'}
              </PButtonPure>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {view === 'form' ? <EditorPane /> : <GraphView />}
          </div>
        </section>
      )}
      {showPreview && (
        <aside
          className={`relative hidden border-l border-border bg-surface-sunken lg:flex lg:flex-col ${
            previewFullscreen ? 'min-w-0 flex-1' : 'shrink-0'
          }`}
          style={previewFullscreen ? undefined : { width }}
        >
          {!previewFullscreen && (
            <ResizeHandle
              side="right"
              getWidth={() => useEditorStore.getState().sourcePreviewWidth}
              setWidth={setWidth}
              ariaLabel="Resize source preview"
            />
          )}
          <SourcePreview onCollapse={togglePreview} />
        </aside>
      )}
    </div>
  );
}

function ViewTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-brand text-white'
          : 'text-content-muted hover:bg-surface-raised hover:text-content'
      }`}
    >
      {children}
    </button>
  );
}
