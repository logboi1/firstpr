import { SessionLink } from "./session-link";
import { Brand } from "./brand";
import { SiteNavigation } from "./site-navigation";
export function SiteHeader({ account = false }: { account?: boolean }) {
  return <header className={`site-header ${account ? 'account-header' : 'directory-header'}`}><div className="shell header"><div className="brand-lockup"><Brand/><span className="brand-caption">the open-source workshop</span></div><SiteNavigation account={account}>{!account && <SessionLink/>}</SiteNavigation></div></header>;
}
export function SiteFooter() {
  return <footer className="shell footer"><div><span className="footer-brand">firstpr.</span><span>A place to start. A community to build with.</span></div><a href="https://github.com/logboi1/firstpr">Built in the open <span aria-hidden="true">↗</span></a><p>Independent community project.</p></footer>;
}
