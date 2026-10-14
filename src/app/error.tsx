"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main id="main" className="shell account-main"><section className="account-card"><h1>Something went wrong.</h1><p>We could not load this page. Try again. If it keeps happening, contact the project maintainer.</p><button className="button primary" onClick={reset}>Try again</button></section></main>;
}
