import type { CSSProperties } from "react";
import styles from "./app-loading.module.css";

type Stage = "code" | "push" | "pr" | "merge";
const stages: { id: Stage; label: string }[] = [
  { id: "code", label: "Code" },
  { id: "push", label: "Push" },
  { id: "pr", label: "Pull request" },
  { id: "merge", label: "Merge" },
];

function GitIcon({ stage }: { stage: Stage }) {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" focusable="false">
    {stage === "code" && <path d="m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16"/>}
    {stage === "push" && <path d="M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4"/>}
    {stage === "pr" && <><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/><path d="M6 7v10m12 0V9a4 4 0 0 0-4-4h-2m3-3-3 3 3 3"/></>}
    {stage === "merge" && <><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M6 7v10m12-10v1a6 6 0 0 1-6 6 6 6 0 0 0-6 3"/></>}
  </svg>;
}

/** Indeterminate loading, illustrated as a Git handoff. Never represents live Git progress. */
export function AppLoading({ label = "Loading FirstPR…" }: { label?: string }) {
  return <div className={styles.root} data-app-loading>
    <div className={styles.panel}>
      <div className={styles.artwork} aria-hidden="true">
        <div className={styles.topline}><span className={styles.lights}><i/><i/><i/></span><span>firstpr / working</span><span>↳</span></div>
        <div className={styles.flow}>
          {stages.map((stage, index) => <div className={styles.stage} data-git-stage={stage.id} key={stage.id} style={{ "--handoff-delay": `${index * 1.2}s` } as CSSProperties}>
            <div className={styles.icon}><GitIcon stage={stage.id}/></div>
            <span className={styles.stageLabel}>{stage.label}</span>
            {index < stages.length - 1 && <span className={styles.connector}><span className={styles.commit}/></span>}
          </div>)}
        </div>
        <div className={styles.caption}><span>small steps, good things</span><span>code → contribution</span></div>
      </div>
      <div className={styles.message}>
        <p className={styles.label} role="status" aria-live="polite" aria-atomic="true">{label}</p>
        <p className={styles.hint}>A little work in the background.</p>
      </div>
    </div>
  </div>;
}
