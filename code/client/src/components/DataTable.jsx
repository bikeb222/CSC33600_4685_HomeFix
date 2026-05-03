import React from 'react';
import EmptyState from './common/EmptyState';
import LoadingState from './common/LoadingState';

export default function DataTable({
  title,
  description,
  columns,
  rows = [],
  rowKey,
  searchFields = [],
  actions,
  loading = false,
  toolbar,
  emptyTitle,
  emptyDescription,
  compact = false
}) {
  const [query, setQuery] = React.useState('');
  const filtered = rows.filter((row) => {
    if (!query.trim()) {
      return true;
    }
    const text = searchFields.length
      ? searchFields.map((field) => row[field]).join(' ')
      : Object.values(row).join(' ');
    return text.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <section className={`panel table-panel ${compact ? 'compact-panel' : ''}`}>
      <div className="panel-heading table-heading">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <div className="table-toolbar">
          {searchFields.length > 0 && (
            <label className="search-field">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
              />
            </label>
          )}
          {toolbar}
        </div>
      </div>
      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
                {actions && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={typeof rowKey === 'function' ? rowKey(row) : row[rowKey]}>
                  {columns.map((column) => (
                    <td key={column.key}>
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                  {actions && <td className="row-actions">{actions(row)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
