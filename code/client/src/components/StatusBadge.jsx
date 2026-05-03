import { statusLabel } from '../utils/format';

export default function StatusBadge({ value }) {
  return <span className={`status-badge status-${value || 'neutral'}`}>{statusLabel(value)}</span>;
}
