"use client";
export default function DirectoryError() {
  return <section className="directory-state" aria-labelledby="directory-error"><h2 id="directory-error">We could not load the opportunities.</h2><p>Your filters are still in the address bar. Try again in a moment, or come back later if the problem continues.</p><div className="actions"><button className="button primary" onClick={() => window.location.reload()}>Try again</button><button className="button secondary" onClick={() => window.location.assign(new URL("/opportunities", window.location.href).href)}>Clear filters and retry</button></div></section>;
}
