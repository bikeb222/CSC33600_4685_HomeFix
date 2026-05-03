import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ open, title = 'Confirm action', message, confirmLabel = 'Confirm', onConfirm, onCancel }) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className="confirm-icon">
          <AlertTriangle size={22} />
        </div>
        <div>
          <h3 id="confirm-title">{title}</h3>
          <p>{message}</p>
        </div>
        <div className="dialog-actions">
          <button className="button ghost" type="button" onClick={onCancel}>Cancel</button>
          <button className="button danger" type="button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
