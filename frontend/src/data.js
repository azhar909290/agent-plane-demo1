// ---------------------------------------------------------------------------
// Data layer: tries the live Flask backend first, falls back to demo data.
// ---------------------------------------------------------------------------
const API = import.meta.env.VITE_API_URL || '';

async function get(path) {
  const r = await fetch(API + path);
  if (!r.ok) throw new Error(`${path} -> HTTP ${r.status}`);
  return r.json();
}

export async function post(path, body, form = false) {
  const opts = form
    ? { method: 'POST', body }
    : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
  const r = await fetch(API + path, opts);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
  return j;
}

async function loadPrompts() {
  const list = await get('/prompts');
  const out = [];
  for (const type of list.prompts || []) {
    try {
      const p = await get(`/prompts/${encodeURIComponent(type)}`);
      out.push({ type, content: typeof p.prompt === 'string' ? p.prompt : JSON.stringify(p.prompt, null, 2) });
    } catch { /* skip */ }
  }
  return out;
}

export async function loadAll({ forceDemo = false } = {}) {
  if (!forceDemo) {
    try {
      const agents = await get('/api/dashboard/agent-usage');
      const [events, prompts] = await Promise.all([
        get('/api/telemetry/events?limit=5000').catch(() => []),
        loadPrompts().catch(() => []),
      ]);
      return { source: 'live', agents, events, prompts, loadedAt: new Date() };
    } catch (e) {
      console.warn('Backend not reachable, using demo data:', e.message);
    }
  }
  const { buildMock } = await import('./mock.js');
  return { source: 'demo', ...buildMock(), loadedAt: new Date() };
}
