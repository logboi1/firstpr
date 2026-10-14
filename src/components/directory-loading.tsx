export function DirectoryLoading() {
  return <section aria-busy="true" aria-label="Loading opportunities"><p role="status">Loading opportunities…</p><div className="opportunity-grid" aria-hidden="true">{[0, 1, 2].map(id => <div className="opportunity-card skeleton-card" key={id}><div className="skeleton-line"/><div className="skeleton-line"/><div className="skeleton-line"/></div>)}</div></section>;
}
