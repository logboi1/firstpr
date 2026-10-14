"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
export default function DirectoryError({ reset }: { reset: () => void }) {
  const router = useRouter();
  return <section className="directory-state" aria-labelledby="directory-error"><h2 id="directory-error">We could not load the opportunities.</h2><p>Your filters are still in the address bar. Try again in a moment, or come back later if the problem continues.</p><div className="actions"><button className="button primary" onClick={() => { router.refresh(); reset(); }}>Try again</button><Link className="button secondary" href="/opportunities">Clear filters and retry</Link></div></section>;
}
