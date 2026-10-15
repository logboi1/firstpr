export function ProgressCounts({counts}:{counts:{submitted:number;merged:number;closed:number}}){
  return <dl className="progress-stats" aria-label="Pull-request status counts">{([['submitted','Submitted'],['merged','Merged'],['closed','Closed']] as const).map(([key,label])=><div key={key} data-status={key}><dt>{label}</dt><dd>{counts[key]}</dd></div>)}</dl>;
}
