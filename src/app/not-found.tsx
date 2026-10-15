import Link from "next/link";

export default function NotFound() {
  return <main id="main" tabIndex={-1} className="shell how"><p className="eyebrow">404 · PAGE NOT FOUND</p><h1>Let’s find your way back.</h1><p className="intro">This page doesn’t exist. FirstPR is still in development.</p><Link className="button primary" href="/">Back to FirstPR</Link></main>;
}
