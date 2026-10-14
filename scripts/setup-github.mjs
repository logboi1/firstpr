import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const repository = "logboi1/firstpr";
const dryRun = process.argv.includes("--dry-run");
const unexpectedArgs = process.argv.slice(2).filter((arg) => arg !== "--dry-run");
if (unexpectedArgs.length) throw new Error("Only --dry-run is supported.");
const backlog = JSON.parse(readFileSync(new URL("../docs/github-backlog.json", import.meta.url), "utf8"));
const milestoneTitle = "MVP v0.1";
const trackingTitle = "FirstPR MVP v0.1 — project tracker";
const labels = [
  ["setup", "5663e9"], ["frontend", "087f5b"], ["backend", "7950b3"],
  ["documentation", "0075ca"], ["accessibility", "c27803"], ["testing", "c42d62"],
];
const taskLabels = [
  ["setup"], ["backend"], ["backend", "frontend"], ["frontend"],
  ["frontend", "backend"], ["frontend", "backend"], ["frontend", "backend"],
  ["frontend", "backend"], ["frontend", "backend"], ["frontend", "backend"],
  ["testing", "accessibility"], ["documentation", "testing"],
];

function gh(args, input) {
  return execFileSync("gh", args, { encoding: "utf8", input, stdio: ["pipe", "pipe", "inherit"] }).trim();
}
function readPages(endpoint) {
  return JSON.parse(gh(["api", "--paginate", "--slurp", endpoint])).flat();
}
function api(method, endpoint, payload) {
  return JSON.parse(gh(["api", "--method", method, endpoint, "--input", "-"], JSON.stringify(payload)));
}

async function main() {
  if (dryRun) {
    console.log(`Target: ${repository}\nMilestone: ${milestoneTitle}\nLabels: ${labels.map(([name]) => name).join(", ")}`);
    for (const task of backlog) console.log(`- ${task.title}`);
    console.log(`Tracker: ${trackingTitle}\nDry run only: no GitHub requests or changes made.`);
    return;
  }
  gh(["auth", "status"]);
  const repo = JSON.parse(gh(["api", `repos/${repository}`]));
  if (repo.full_name !== repository || repo.private) throw new Error("Expected the public logboi1/firstpr repository.");

  const milestones = readPages(`repos/${repository}/milestones?state=all&per_page=100`);
  let milestone = milestones.find((item) => item.title === milestoneTitle);
  if (!milestone) milestone = api("POST", `repos/${repository}/milestones`, {
    title: milestoneTitle,
    description: "FirstPR: curated opportunities, guided contributions, mentor support, and PR progress tracking.",
  });

  const existingLabels = readPages(`repos/${repository}/labels?per_page=100`);
  for (const [name, color] of labels) {
    if (!existingLabels.some((label) => label.name.toLowerCase() === name.toLowerCase())) {
      api("POST", `repos/${repository}/labels`, { name, color });
    }
  }
  const existingIssues = readPages(`repos/${repository}/issues?state=all&per_page=100`).filter((item) => !item.pull_request);
  const tasks = [];
  for (let index = 0; index < backlog.length; index++) {
    const task = backlog[index];
    let issue = existingIssues.find((item) => item.title === task.title);
    if (!issue) {
      issue = api("POST", `repos/${repository}/issues`, { ...task, labels: taskLabels[index], milestone: milestone.number });
      existingIssues.push(issue);
    }
    tasks.push(issue);
    console.log(`#${issue.number}: ${issue.title}`);
  }

  const tracker = existingIssues.find((item) => item.title === trackingTitle);
  if (!tracker) {
    const body = "## Goal\nHelp a newcomer choose a suitable task, follow contribution steps, get mentor support, and record a PR.\n\n## Backlog\n\n"
      + tasks.map((issue) => `- [${issue.state === "closed" ? "x" : " "}] #${issue.number} — ${issue.title}`).join("\n")
      + "\n\n## Delivery order\nFoundation → data/auth → participant journey → mentor support → contribution tracking → pilot.\n\nSee docs/MVP-PLAN.md. Keep the tracker updated as tasks land; the setup script preserves an existing tracker's manual edits.";
    const created = api("POST", `repos/${repository}/issues`, { title: trackingTitle, body, milestone: milestone.number });
    console.log(`Tracker: ${created.html_url}`);
  } else {
    console.log(`Existing tracker preserved: ${tracker.html_url}`);
  }
}

main().catch((error) => {
  console.error(`GitHub setup stopped: ${error.message}\nFix the reported access or configuration problem, then run again to resume.`);
  process.exitCode = 1;
});
