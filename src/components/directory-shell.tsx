import { SiteHeader, SiteFooter } from "./site-chrome";
export function DirectoryShell({ children }: { children: React.ReactNode; active?: "opportunities" | "progress" }) {
  return <><SiteHeader/><main id="main" tabIndex={-1} className="shell directory-main">{children}</main><SiteFooter/></>;
}
