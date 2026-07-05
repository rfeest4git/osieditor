import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * A self-contained modal (backdrop + opaque centered panel), styled with
 * Tailwind so it renders correctly even when the PDS web components have not
 * loaded (e.g. their CDN is unreachable). Rendered into `document.body` via a
 * portal to escape any parent stacking/overflow context.
 */
export function Modal({
  open,
  onClose,
  labelledById,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  labelledById?: string;
  children: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledById}
        className={`relative z-10 w-full max-w-md rounded-card border border-border bg-surface-raised p-5 text-content shadow-2xl ${className ?? ''}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
