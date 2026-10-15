"use client";
export default function ErrorPage(){return <section className="shell directory-state"><h1>Dashboard unavailable.</h1><p>We could not load your progress. Try again.</p><button className="button primary" onClick={()=>window.location.reload()}>Try again</button></section>;}
