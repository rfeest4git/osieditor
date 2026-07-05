import { PHeading, PText } from '@porsche-design-system/components-react';
import { ImportButton } from '../io/ImportButton.js';
import { NewModelButton } from '../io/NewModelButton.js';
import { NewOntologyButton } from '../io/NewOntologyButton.js';

/** Shown when no document is loaded: prompt to create or import one. */
export function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <div>
          <PHeading tag="h1" size="large">
            OSI Editor
          </PHeading>
          <div className="mt-2">
            <PText color="contrast-medium">
              Create a new semantic model or ontology, or import an existing OSI file to get
              started.
            </PText>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <NewModelButton variant="primary">New model</NewModelButton>
          <NewOntologyButton variant="secondary">New ontology</NewOntologyButton>
          <ImportButton variant="secondary">Import file</ImportButton>
        </div>
      </div>
    </div>
  );
}
