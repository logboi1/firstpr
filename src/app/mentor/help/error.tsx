"use client";
export default function ErrorPage() {return <section className="directory-state"><h1>Mentor queue unavailable.</h1><p>Try again, or check that you still have mentor access.</p><button className="button primary" onClick={()=>window.location.reload()}>Try again</button></section>;}
