// Test-process preload only. Production code always calls the fixed GitHub API.
// Rewrite public PR GETs to the disposable fixture, never real GitHub.
const realFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  if (url.hostname === 'api.github.com') {
    const match = /^\/repos\/([^/]+)\/([^/]+)\/pulls\/(\d+)$/.exec(url.pathname);
    if (!match) throw new Error(`Unexpected GitHub request in tests: ${url.pathname}`);
    return realFetch(`http://localhost:54329/github-pr/${match.slice(1).join('/')}`, {
      signal: init?.signal,
    });
  }
  return realFetch(input, init);
};
