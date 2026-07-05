import { useId } from 'react';
import { Button } from './Button.js';
import { Modal } from './Modal.js';

export interface ConfirmDialogProps {
  open: boolean;
  heading: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When true, styles the confirm button as a destructive action. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** A confirm/cancel dialog built on the local `Modal` primitive. */
export function ConfirmDialog({
  open,
  heading,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const headingId = useId();
  return (
    <Modal open={open} onClose={onCancel} labelledById={headingId}>
      <h2 id={headingId} className="text-lg font-semibold text-content">
        {heading}
      </h2>
      <div className="mt-2 text-sm text-content-muted">{message}</div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
