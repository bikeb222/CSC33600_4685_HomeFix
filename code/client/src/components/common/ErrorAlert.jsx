import { AlertTriangle, X } from 'lucide-react';

export default function ErrorAlert({ message, onClose }) {
  if (!message) {
    return null;
  }

  return (
    <div className="alert error">
      <AlertTriangle size={18} />
      <span>{message}</span>
      {onClose && (
        <button className="icon-button small" type="button" onClick={onClose} aria-label="Dismiss error">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
