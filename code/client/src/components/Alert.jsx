import { X } from 'lucide-react';

export default function Alert({ message, type = 'error', onClose }) {
  if (!message) {
    return null;
  }

  return (
    <div className={`alert ${type}`}>
      <span>{message}</span>
      {onClose && (
        <button className="icon-button small" type="button" onClick={onClose} aria-label="Dismiss">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
