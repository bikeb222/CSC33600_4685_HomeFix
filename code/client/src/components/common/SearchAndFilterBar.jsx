import { Search } from 'lucide-react';

export default function SearchAndFilterBar({ search, onSearchChange, placeholder = 'Search', filters, right }) {
  return (
    <div className="filter-bar">
      <label className="search-field">
        <Search size={16} />
        <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={placeholder} />
      </label>
      {filters}
      {right && <div className="filter-right">{right}</div>}
    </div>
  );
}
