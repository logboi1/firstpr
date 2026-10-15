import { SiteHeader, SiteFooter } from "./site-chrome";
export function AccountShell({ children, publicNavigation = false }: { children: React.ReactNode; publicNavigation?: boolean }) {
  return <><SiteHeader account={!publicNavigation}/><main id="main" tabIndex={-1} className="shell account-main">{children}</main><SiteFooter/></>;
}
