import { PButton, PHeading } from '@porsche-design-system/components-react';

/** Common chrome for entity forms: a heading, optional delete action, and body. */
export function FormShell({
  title,
  subtitle,
  onDelete,
  deleteLabel = 'Delete',
  children,
}: {
  title: string;
  subtitle?: string;
  onDelete?: () => void;
  deleteLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <PHeading tag="h2" size="medium">
            {title}
          </PHeading>
          {subtitle && <p className="mt-1 text-sm text-content-muted">{subtitle}</p>}
        </div>
        {onDelete && (
          <PButton type="button" variant="secondary" icon="delete" onClick={onDelete}>
            {deleteLabel}
          </PButton>
        )}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}
