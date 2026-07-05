import { createFileRoute } from '@tanstack/react-router';
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
 * the relationship graph, and a right-hand live source-preview pane.
 */
function EditorWorkspace() {
  const doc = useEditorStore((s) => s.doc);
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
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {view === 'form' ? <EditorPane /> : <GraphView />}
        </div>
      </section>
      <aside className="hidden w-96 shrink-0 border-l border-border bg-surface-sunken lg:block">
        <SourcePreview />
      </aside>
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
