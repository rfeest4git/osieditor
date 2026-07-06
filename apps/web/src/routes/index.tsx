import { createFileRoute } from '@tanstack/react-router';
import { PButtonPure } from '@porsche-design-system/components-react';
import { useState } from 'react';
import { EditorPane } from '../components/editor/EditorPane.js';
import { SourcePreview } from '../components/editor/SourcePreview.js';
import { GraphView } from '../components/graph/GraphView.js';
import { EmptyState } from '../components/shell/EmptyState.js';
import { useEditorStore } from '../store/editorStore.js';

export const Route = createFileRoute('/')({
  component: EditorWorkspace,
});

type WorkspaceView = 'form' | 'graph';

/**
 * The main workspace: a center pane that switches between the form editor and
 * the relationship graph, and a right-hand live source-preview pane that can be
 * collapsed to give the center pane more horizontal space.
 */
function EditorWorkspace() {
  const doc = useEditorStore((s) => s.doc);
  const previewCollapsed = useEditorStore((s) => s.sourcePreviewCollapsed);
  const togglePreview = useEditorStore((s) => s.toggleSourcePreviewCollapsed);
  const [view, setView] = useState<WorkspaceView>('form');

  if (!doc) {
    return <EmptyState />;
  }

  return (
    <div className="flex h-full min-h-0">
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1 border-b border-border bg-surface px-3 py-2">
          <ViewTab active={view === 'form'} onClick={() => setView('form')}>
            Form editor
          </ViewTab>
          <ViewTab active={view === 'graph'} onClick={() => setView('graph')}>
            Relationship graph
          </ViewTab>
          {previewCollapsed && (
            <div className="ml-auto hidden lg:block">
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
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {view === 'form' ? <EditorPane /> : <GraphView />}
        </div>
      </section>
      {!previewCollapsed && (
        <aside className="hidden w-96 shrink-0 border-l border-border bg-surface-sunken lg:block">
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
