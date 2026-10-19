import { readPullRequest } from '../../../src/lib/github/pull-request.ts';

// Authenticated participant scope is derived from GoTrue, never from the body.
// Only the narrow completion RPC receives trusted service credentials.
export function createMergeHandler(env, fetcher = fetch) {
  return async request => {
    const reply = (body, status = 200) => Response.json(body, {status, headers:{'Cache-Control':'no-store'}});
    if (request.method !== 'POST') return reply({error:'Method not allowed'},405);
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) return reply({error:'Sign in required'},401);
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) return reply({error:'Sync is not configured'},503);
    try {
      const auth = await fetcher(`${env.SUPABASE_URL}/auth/v1/user`, {
        headers:{apikey:env.SUPABASE_ANON_KEY,Authorization:authorization}, signal:AbortSignal.timeout(5000),
      });
      if (!auth.ok) return reply({error:'Sign in required'},401);
      const user = await auth.json();
      if (typeof user.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(user.id)) return reply({error:'Sign in required'},401);
      const rpc = async (name, body) => {
        const result = await fetcher(`${env.SUPABASE_URL}/rest/v1/rpc/${name}`, {
          method:'POST', headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,
            ...(env.SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_secret_') ? {} : {Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`}),
            'Content-Type':'application/json'},
          body:JSON.stringify(body),signal:AbortSignal.timeout(5000),
        });
        if(!result.ok) throw new Error('Sync storage unavailable');
        const text = await result.text();
        return text.trim() ? JSON.parse(text) : null;
      };
      const candidates = await rpc('github_merge_candidates',{actor:user.id});
      if (!Array.isArray(candidates) || candidates.length > 10) throw new Error('Unexpected candidate list');
      let completed = 0, checked = 0;
      // Bounded sequential work also respects GitHub's secondary request limits.
      for (const item of candidates) {
        const evidence = await readPullRequest(item.pr_url, fetcher, env.GITHUB_PUBLIC_READ_TOKEN);
        checked++;
        await rpc('note_github_merge_check',{wanted:item.id,expected_url:item.pr_url,expected_version:item.updated_at});
        if(evidence.kind !== 'found' || evidence.state !== 'merged' || !evidence.mergeProof) continue;
        if(item.repository_url?.toLowerCase() !== `https://github.com/${evidence.repository.toLowerCase()}`) continue;
        const saved = await rpc('complete_github_merge',{
          wanted:item.id,expected_url:item.pr_url,expected_version:item.updated_at,
          author_id:evidence.mergeProof.authorId,repository:evidence.repository,
          pr_id:evidence.mergeProof.prId,merged_at:evidence.mergeProof.mergedAt,
        });
        if(saved === true) completed++;
      }
      return reply({checked,completed});
    } catch {
      // Never log tokens, provider identities, or private contribution URLs.
      return reply({error:'GitHub sync is unavailable. Saved contributions are unchanged unless already confirmed.'},503);
    }
  };
}
