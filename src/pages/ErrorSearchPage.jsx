import React, { useState } from 'react';
import { Search, AlertTriangle, Loader2 } from 'lucide-react';
import NotesBadge from '../components/common/NotesBadge';

export default function ErrorSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    fetch(`/api/logs/search/${encodeURIComponent(query.trim())}`)
      .then(r => r.json()).then(setResults).catch(() => setResults({})).finally(() => setLoading(false));
  };

  const totalMatches = results
    ? Object.values(results).reduce((sum, arr) => sum + arr.length, 0)
    : 0;

  return (
    <div className="error-search">
      <div className="page-header">
        <h2><Search size={20} /> Error Code Search</h2>
      </div>

      <form className="search-form" onSubmit={handleSearch}>
        <div className="search-input-wrapper">
          <Search size={16} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Enter error code, keyword, or pattern... (e.g., InternalError, 11042, FailStatus)"
            className="search-input"
          />
        </div>
        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? <Loader2 size={14} className="spinning" /> : <Search size={14} />}
          Search
        </button>
      </form>

      {results && (
        <div className="search-results">
          <div className="search-results__summary">
            Found <strong>{totalMatches}</strong> matches in <strong>{Object.keys(results).length}</strong> files
          </div>
          {Object.entries(results).map(([filename, matches]) => (
            <div key={filename} className="search-file-group">
              <div className="search-file-group__header">
                <AlertTriangle size={14} />
                <span>{filename}</span>
                <span className="badge">{matches.length}</span>
              </div>
              <div className="search-file-group__matches">
                {matches.map((m, i) => (
                  <div key={i} className="search-match">
                    <div className="search-match__meta">
                      {m.timestamp && <span className="search-match__time">{m.timestamp}</span>}
                      {m.processId && <span className="search-match__pid">PID: {m.processId}</span>}
                      <span className="search-match__line">L{m.line}</span>
                      <NotesBadge message={m.text} timestamp={m.timestamp} />
                    </div>
                    <div className="search-match__text">{m.text}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
