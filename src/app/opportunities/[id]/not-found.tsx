import Link from "next/link";
export default function TaskNotFound() {
  return <section className="directory-state"><h2>Task unavailable</h2><p>This task may not exist or may no longer be available to you. Existing participants can sign in to continue an archived task.</p><div className="actions"><Link className="button primary" href="/opportunities">Browse opportunities</Link><Link className="button secondary" href="/sign-in">Sign in</Link></div></section>;
}
