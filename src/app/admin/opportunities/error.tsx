'use client';
export default function ErrorPage() {return <section className="directory-state"><h1>Curator workspace unavailable.</h1><p>We could not load this workspace. Try again, or check that your account still has curator access.</p><button className="button primary" onClick={()=>window.location.reload()}>Try again</button></section>;}
