import Link from "next/link";
export function AccountShell({ children }: { children: React.ReactNode }) {
  return <><header className="shell header"><Link className="wordmark" href="/">↗ FirstPR</Link><nav aria-label="Account navigation"><Link href="/dashboard">Dashboard</Link><Link href="/profile">Profile</Link></nav></header><main id="main" className="shell account-main">{children}</main></>;
}
