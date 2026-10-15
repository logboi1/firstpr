import Link from "next/link";
export function AccountShell({ children }: { children: React.ReactNode }) {
  return <><header className="shell header account-header"><Link className="wordmark" href="/">↗ FirstPR</Link><nav aria-label="Account navigation"><Link href="/opportunities">Find a task</Link><Link href="/dashboard">Dashboard</Link><Link href="/help">My help requests</Link><Link href="/progress">Public progress</Link><Link href="/profile">Profile</Link></nav></header><main id="main" className="shell account-main">{children}</main></>;
}
