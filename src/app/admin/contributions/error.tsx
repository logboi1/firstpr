"use client";
export default function ErrorPage(){return <section className="directory-state"><h1>Submissions unavailable.</h1><p>We could not load submissions. Try again.</p><button className="button primary" onClick={()=>window.location.reload()}>Try again</button></section>;}
