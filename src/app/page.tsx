import Link from "next/link";
import { Brand } from "@/components/brand";
import { SiteFooter } from "@/components/site-chrome";

const repository = "https://github.com/logboi1/firstpr";
const steps = [
  { number: "01", title: "Find a small, good task.", text: "Pick a reviewed opportunity that fits your skills. Documentation, design, tests, and code all count.", tag: "Explore the directory" },
  { number: "02", title: "Make a little progress.", text: "Get set up, work through your checklist, and ask a mentor when something doesn't click.", tag: "One step at a time" },
  { number: "03", title: "Open that pull request.", text: "Share your work, get a curator's review, and decide whether to add it to the public progress board.", tag: "Your work, out in the world" },
];
export default function Home() {
  return <>
    <header className="site-header"><div className="shell header"><div className="brand-lockup"><Brand/><span className="brand-caption">the open-source workshop</span></div><nav className="site-navigation" aria-label="Main navigation"><Link href="/opportunities">Find a task</Link><Link href="/progress">Public progress</Link><a className="github-link" href={repository}>GitHub <span aria-hidden="true">↗</span></a><Link className="nav-signin" href="/sign-in">Sign in <span aria-hidden="true">→</span></Link></nav></div></header>
    <main id="main" tabIndex={-1}>
      <section className="shell hero" aria-labelledby="hero-title">
        <div className="hero-copy"><p className="eyebrow"><span className="status-dot" aria-hidden="true"/> GOOD PEOPLE. SMALL PULL REQUESTS.</p><h1 id="hero-title">Big things start<br/>with a <span className="highlight-word">small PR.</span></h1><p className="intro">You don’t need to know everything to contribute. Find your first task, get a little guidance, and make something better. Together.</p><div className="actions"><Link className="button primary" href="/opportunities">Find your first task <span aria-hidden="true">↗</span></Link><a className="text-link" href="#how-it-works">How it works <span aria-hidden="true">↓</span></a></div><div className="hero-footnote"><span className="tiny-branch" aria-hidden="true">↳</span><p>New to open source? You’re in the right place.<br/><span>Documentation, design, testing, and code welcome.</span></p></div></div>
        <div className="workshop-board" role="group" aria-label="Illustrated contribution checklist, not a live task"><div className="board-top"><span><span className="board-dot"/> first-contribution.md</span><span aria-hidden="true">↗</span></div><div className="board-body"><span className="paper-label">YOUR NEXT CHAPTER</span><h2>From “I could…”<br/>to <span>“I contributed.”</span></h2><ol className="board-checklist"><li><span className="drawn-check" aria-hidden="true">✓</span><div><strong>Find a task that feels right</strong><p>Small scope. Clear starting point.</p></div></li><li><span className="drawn-check" aria-hidden="true">✓</span><div><strong>Work through the checklist</strong><p>A little support along the way.</p></div></li><li><span className="drawn-check check-empty" aria-hidden="true"/><div><strong>Open your first pull request</strong><p>That’s something to be proud of.</p></div></li></ol><div className="board-bottom"><span className="branch-chip">your-first-pr</span><span>One thoughtful change.</span></div></div><span className="workshop-stamp" aria-hidden="true">BUILT<br/>TOGETHER <span>✳</span></span></div>
      </section>
      <div className="principles"><div className="shell principle-list"><span>Small tasks, real impact</span><span>Mentors in your corner</span><span>Every skill welcome</span><span>Open source, always</span></div></div>
      <section className="shell how" id="how-it-works" aria-labelledby="how-title"><div className="section-heading"><div><p className="eyebrow">NO PERFECT START REQUIRED</p><h2 id="how-title">A place to get your hands dirty.</h2></div><p>Bring your curiosity.<br/>We’ll help with the first steps.</p></div><div className="steps">{steps.map(step => <article className="step" key={step.number}><span className="step-number">/{step.number}</span><h3>{step.title}</h3><p>{step.text}</p><span className="step-tag">{step.tag}</span></article>)}</div></section>
      <section className="shell build-section" aria-labelledby="build-title"><div><p className="eyebrow">THIS WORKSHOP IS OPEN SOURCE, TOO</p><h2 id="build-title">Help build the place<br/>you wish you’d started.</h2><p>FirstPR is a community project in early development. Found a rough edge? Have an idea? There’s room for your contribution here.</p></div><a className="button primary" href={`${repository}/blob/main/CONTRIBUTING.md`}>Contribute to FirstPR <span aria-hidden="true">↗</span></a></section>
    </main><SiteFooter/>
  </>;
}
