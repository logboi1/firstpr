"use client";
export default function HelpError() { return <section className="directory-state"><h1>Help requests unavailable.</h1><p>We could not load your requests. Try again.</p><button className="button primary" onClick={() => window.location.reload()}>Try again</button></section>; }
