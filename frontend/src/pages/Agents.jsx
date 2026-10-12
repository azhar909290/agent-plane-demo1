import React, { useEffect, useMemo, useState } from 'react';
import { FiCpu, FiPlus, FiSearch } from 'react-icons/fi';
import { Card, Badge, Drawer, Tabs } from '../components/UI';
import { fmt, money } from '../analytics';
import { post } from '../data';

export default function Agents({ data, focusAgent, clearFocus, refresh, notify }) {
  const { agents, events } = data;
  const [q, setQ] = useState('');
  const [view, setView] = useState('Grid');
  const [open, setOpen] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => { if (focusAgent) { setOpen(agents.find(a => a.agent_name === focusAgent) || null); clearFocus(); } }, [focusAgent]);

  const rows = useMemo(() => agents
    .filter(a => (a.agent_name + ' ' + (a.description || '')).toLowerCase().includes(q.toLowerCase()))
    .sort((x, y) => x.agent_name.localeCompare(y.agent_name)), [agents, q]);

  return (
    <div className="page">
      <div className="page-h">
        <div><h1>Agents</h1><p>Agent catalogue and usage.</p></div>
        <button className="btn primary" onClick={() => setCreating(true)}><FiPlus /> New agent</button>
      </div>
      <div className="toolbar card">
        <div className="input-ic"><FiSearch /><input placeholder="Search agents…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <Tabs value={view} onChange={setView} items={['Grid', 'Table']} />
      </div>

      {view === 'Grid' ? (
        <div className="grid agents-grid">
          {rows.map((a, i) => (
            <div key={a.agent_id} className="card agent-card" style={{ animationDelay: i * 40 + 'ms' }} onClick={() => setOpen(a)}>
              <div className="ac-top"><div className="ac-logo"><FiCpu /></div><div className="ac-t"><b>{a.agent_name}</b><small>{a.description}</small></div><Badge status="neutral">{a.usage_status}</Badge></div>
              <div className="ac-stats">
                <div><span>Plugin calls</span><b>{fmt(a.plugin_calls)}</b></div>
                <div><span>Tokens est.</span><b>{fmt(a.tokens_est)}</b></div>
                <div><span>Cost</span><b>{money(a.cost_usd)}</b></div>
                <div><span>Version</span><b>{a.version}</b></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <table className="tbl">
            <thead><tr><th>Agent</th><th>Description</th><th>Version</th><th>Plugin calls</th><th>Tokens est.</th><th>Cost</th><th>Status</th></tr></thead>
            <tbody>{rows.map(a => (
              <tr key={a.agent_id} className="clickable" onClick={() => setOpen(a)}>
                <td><b>{a.agent_name}</b></td><td>{a.description}</td><td>{a.version}</td><td>{fmt(a.plugin_calls)}</td>
                <td>{fmt(a.tokens_est)}</td><td>{money(a.cost_usd)}</td><td><Badge status="neutral">{a.usage_status}</Badge></td>
              </tr>))}</tbody>
          </table>
        </Card>
      )}

      <Drawer open={!!open} onClose={() => setOpen(null)} title={open?.agent_name}>
        {open && <AgentDetail a={open} />}
      </Drawer>
      <Drawer open={creating} onClose={() => setCreating(false)} title="Create agent">
        <CreateAgent onDone={async msg => { setCreating(false); notify(msg); await refresh(); }} demo={data.source === 'demo'} />
      </Drawer>
    </div>
  );
}

function AgentDetail({ a }) {
  return (
    <div className="detail">
      <p className="muted">{a.description}</p>
      <div className="mini-kpis">
        <div><span>Plugin calls</span><b>{fmt(a.plugin_calls)}</b></div>
        <div><span>Tokens est.</span><b>{fmt(a.tokens_est)}</b></div>
        <div><span>Cost</span><b>{money(a.cost_usd)}</b></div>
        <div><span>Status</span><b>{a.usage_status}</b></div>
      </div>
      <h4 className="sub-h">Metadata</h4>
      <div className="kv"><span>Agent ID</span><code>{a.agent_id}</code><span>Version</span><code>{a.version}</code></div>
    </div>
  );
}

function CreateAgent({ onDone, demo }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      if (demo) throw new Error('Backend not connected - start Flask on :5000');
      await post('/ui/agents/create', new FormData(e.target), true);
      onDone('Agent created ✨');
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <form className="form" onSubmit={submit}>
      <label>Agent name<input name="agent_name" required placeholder="e.g. Code Reviewer" /></label>
      <label>Description<input name="description" placeholder="What does it do?" /></label>
      <label>System prompt<textarea name="prompt" rows="10" required placeholder="You are…" /></label>
      {err && <div className="form-err">{err}</div>}
      <button className="btn primary" disabled={busy}>{busy ? 'Creating…' : 'Create agent'}</button>
    </form>
  );
}
