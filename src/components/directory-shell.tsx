import Link from "next/link";
export function DirectoryShell({ children }: { children: React.ReactNode }) {
  return <><header className="shell header directory-header"><Link className="wordmark" href="/" aria-label="FirstPR home"><span className="brand-icon" aria-hidden="true">↗</span>First<span>PR</span></Link><nav aria-label="Main navigation"><Link href="/opportunities" aria-current="page">Opportunities</Link><Link href="/dashboard">My dashboard</Link></nav></header><main id="main" className="shell directory-main"><div className="directory-heading"><p className="eyebrow">OPEN SOURCE. OPEN TO YOU.</p><h1>Find your starting point.</h1><p>Explore published contribution tasks. Start with what you know, or try something new.</p></div>{children}</main></>;
}
