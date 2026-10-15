"use client";
export default function ErrorPage(){return <section className="directory-state"><h1>Public progress unavailable.</h1><p>We could not load the board. Try again.</p><button className="button primary" onClick={()=>window.location.reload()}>Try again</button></section>;}
