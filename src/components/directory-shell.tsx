import Link from "next/link";
export function DirectoryShell({ children, active="opportunities" }: { children: React.ReactNode; active?:"opportunities"|"progress" }) {
  return <><header className="shell header directory-header"><Link className="wordmark" href="/" aria-label="FirstPR home"><span className="brand-icon" aria-hidden="true">↗</span>First<span>PR</span></Link><nav aria-label="Main navigation"><Link href="/opportunities" aria-current={active==="opportunities"?"page":undefined}>Opportunities</Link><Link href="/progress" aria-current={active==="progress"?"page":undefined}>Public progress</Link><Link href="/dashboard">My dashboard</Link></nav></header><main id="main" className="shell directory-main">{children}</main></>;
}
