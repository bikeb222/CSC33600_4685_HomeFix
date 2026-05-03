import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'No data yet', description = 'Records will appear here once they are available.' }) {
  return (
    <div className="state-card empty-state">
      <Inbox size={26} />
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
