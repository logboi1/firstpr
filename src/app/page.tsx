import Link from "next/link";

const repository = "https://github.com/logboi1/firstpr";

const steps = [
  { number: "01", title: "Find your starting point", text: "Discover reviewed tasks that fit your skills, from documentation and design to code and testing.", tag: "Curated opportunities" },
  { number: "02", title: "Take it one step at a time", text: "Follow a practical checklist, understand the project, and ask a mentor when you hit a blocker.", tag: "Guidance & support" },
  { number: "03", title: "Make your contribution", text: "Submit your pull request and track its progress. Every thoughtful contribution is a step forward.", tag: "Visible progress" },
];

export default function Home() {
  return (
    <>
      <header className="shell header">
        <Link className="wordmark" href="/"><span className="brand-icon" aria-hidden="true">↗</span>First<span>PR</span><span className="alpha">building in public</span></Link>
        <nav aria-label="Main navigation"><Link href="/opportunities">Find a task</Link><Link href="/sign-in">Sign in</Link><a className="repo-link" href={repository}>GitHub <span aria-hidden="true">↗</span></a></nav>
      </header>
      <main id="main" tabIndex={-1}>
        <section className="shell hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span className="status-dot" aria-hidden="true"/> OPEN SOURCE. OPEN TO YOU.</p>
            <h1 id="hero-title">Your first<br/>contribution.<br/><span>A little closer.</span></h1>
            <p className="intro">You don’t have to figure out open source alone. We’re building a friendlier path from “where do I start?” to your first pull request.</p>
            <div className="actions"><Link className="button primary" href="/opportunities">Find your first task <span aria-hidden="true">↗</span></Link><a className="button secondary" href="#how-it-works">Explore the idea <span aria-hidden="true">↓</span></a></div>
            <p className="availability">In development · Browse tasks and create your profile. Save checklist progress as you contribute.</p>
          </div>
          <div className="journey" aria-label="Preview of the planned contribution journey">
            <div className="journey-top"><span className="mini-brand">↗ FIRST STEPS</span><span className="preview-label">CONCEPT PREVIEW</span></div>
            <h2>Small steps.<br/>Real contributions.</h2>
            <p className="journey-intro">A clearer path into open source.</p>
            <ol className="journey-list">
              <li><span className="step-icon" aria-hidden="true">⌕</span><div><strong>A task that fits you</strong><span>Start with what you already know.</span></div></li>
              <li><span className="step-icon" aria-hidden="true">☷</span><div><strong>A checklist to guide you</strong><span>One manageable step at a time.</span></div></li>
              <li><span className="step-icon" aria-hidden="true">↗</span><div><strong>Your first pull request</strong><span>Something you helped make better.</span></div></li>
            </ol>
            <div className="journey-note"><span aria-hidden="true">✳</span> Documentation, design, testing, code.<br/>There’s more than one way to contribute.</div>
          </div>
        </section>
        <section className="principles" aria-label="Project principles"><div className="shell principle-list"><span>Beginner friendly</span><span>Community supported</span><span>Thoughtful contributions</span><span>Open source by default</span></div></section>
        <section className="shell how" id="how-it-works" aria-labelledby="how-title">
          <div className="section-heading"><div><p className="eyebrow">THE PATH WE’RE BUILDING</p><h2 id="how-title">Less guesswork.<br/>More getting started.</h2></div><p>Built for curious people.<br/>No contribution history required.</p></div>
          <div className="steps">{steps.map(step=><article className="step" key={step.number}><span className="step-number">{step.number}</span><h3>{step.title}</h3><p>{step.text}</p><span className="tag">{step.tag}</span></article>)}</div>
        </section>
        <section className="shell build-section" aria-labelledby="build-title"><div><p className="eyebrow">FIRSTPR STARTS WITH US</p><h2 id="build-title">Help make the first step easier.</h2><p>We’re starting with a focused MVP: a task directory, contribution checklists, a mentor help queue, and PR progress tracking.</p></div><a className="button primary" href={`${repository}/blob/main/CONTRIBUTING.md`}>Contribute to the project <span aria-hidden="true">↗</span></a></section>
      </main>
      <footer className="shell footer"><span>↗ FirstPR · Made with the community.</span><a href={repository}>Independent open-source project <span aria-hidden="true">↗</span></a></footer>
    </>
  );
}
