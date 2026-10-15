"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const accountLinks = [['/opportunities', 'Find a task'], ['/dashboard', 'Dashboard'], ['/help', 'My help requests'], ['/progress', 'Public progress'], ['/profile', 'Profile']] as const;
const publicLinks = [['/opportunities', 'Opportunities'], ['/progress', 'Public progress'], ['/dashboard', 'My dashboard']] as const;
export function SiteNavigation({ account = false }: { account?: boolean }) {
  const pathname = usePathname();
  return <nav className="site-navigation" aria-label={account ? 'Account navigation' : 'Main navigation'}>{(account ? accountLinks : publicLinks).map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href || pathname.startsWith(href + '/') ? 'page' : undefined}>{label}</Link>)}</nav>;
}
