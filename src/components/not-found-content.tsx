import Link from "next/link";
export function NotFoundContent() {
  return <section className="how"><p className="eyebrow">404 · PAGE NOT FOUND</p><h1>Let’s find your way back.</h1><p className="intro">This page doesn’t exist or isn’t available to your account.</p><Link className="button primary" href="/">Back to FirstPR</Link></section>;
}
