import React, { useEffect, useMemo, useState } from 'react';
import { FiCpu, FiPlus, FiSearch, FiTrendingUp, FiTrendingDown, FiClock, FiUsers, FiDollarSign, FiCheckCircle } from 'react-icons/fi';
import { Card, Badge, Drawer, Avatar, Tabs } from '../components/UI';
import { Sparkline, AreaChart, ContributionGrid, BarList } from '../components/Charts';
import { agentHealth, heatmapWeeks, telemetry, fmt, ms, money, timeAgo } from '../analytics';
import { post } from '../data';

export default function Agents({ data, focusAgent, clearFocus, refresh, notify }) {
  const { agents, events } = data;
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('Requests');
  const [view, setView] = useState('Grid');
  const [open, setOpen] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => { if (focusAgent) { setOpen(agents.find(a => a.agent_name === focusAgent) || null); clearFocus(); } }, [focusAgent]);

  const rows = useMemo(() => agents.map(a => ({ a, h: agentHealth(a, events) }))
    .filter(({ a }) => (a.agent_name + ' ' + (a.description || '')).toLowerCase().includes(q.toLowerCase()))
    .sort((x, y) => ({
      Requests: y.a.total_requests - x.a.total_requests, Health: x.h.score - y.h.score,
      Trending: y.h.trend - x.h.trend, Recent: String(y.a.last_called).localeCompare(String(x.a.last_called)),
    }[sort])), [agents, events, q, sort]);

  return (
    <div className="page">
      <div className="page-h">
        <div><h1>Agents</h1><p>Catalogue with live health score, trend and drill-down telemetry.</p></div>
        <button className="btn primary" onClick={() => setCreating(true)}><FiPlus /> New agent</button>
      </div>
      <div className="toolbar card">
        <div className="input-ic"><FiSearch /><input placeholder="Search agents…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <Tabs value={sort} onChange={setSort} items={['Requests', 'Trending', 'Health', 'Recent']} />
        <Tabs value={view} onChange={setView} items={['Grid', 'Table']} />
      </div>

      {view === 'Grid' ? (
        <div className="grid agents-grid">
          {rows.map(({ a, h }, i) => (
            <div key={a.agent_id} className="card agent-card" style={{ animationDelay: i * 40 + 'ms' }} onClick={() => setOpen(a)}>
              <div className="ac-top"><div className="ac-logo"><FiCpu /></div><div className="ac-t"><b>{a.agent_name}</b><small>{a.description}</small></div><Badge status={h.status} /></div>
              <div className="ac-mid"><Sparkline data={h.spark} w={170} h={40} color={h.status === 'critical' ? 'var(--red)' : 'var(--accent)'} />
                <span className={'delta ' + (h.trend >= 0 ? 'up' : 'down')}>{h.trend >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}{Math.abs(h.trend).toFixed(0)}%</span></div>
              <div className="ac-stats">
                <div><span>Requests</span><b>{fmt(a.total_requests)}</b></div>
                <div><span>Users</span><b>{a.user_counts?.total_users || 0}</b></div>
                <div><span>p95</span><b>{h.calls ? ms(h.p95) : '-'}</b></div>
                <div><span>Health</span><b>{h.score}</b></div>
              </div>
              <div className="ac-foot"><FiClock /> {a.last_called ? timeAgo(a.last_called) : 'never called'}</div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <table className="tbl">
            <thead><tr><th>Agent</th><th>Status</th><th>Requests</th><th>Users</th><th>Success</th><th>p95</th><th>Cost</th><th>Trend</th><th>Last called</th></tr></thead>
            <tbody>{rows.map(({ a, h }) => (
              <tr key={a.agent_id} className="clickable" onClick={() => setOpen(a)}>
                <td><b>{a.agent_name}</b></td><td><Badge status={h.status} /></td><td>{fmt(a.total_requests)}</td><td>{a.user_counts?.total_users || 0}</td>
                <td>{h.calls ? h.successRate.toFixed(1) + '%' : '-'}</td><td>{h.calls ? ms(h.p95) : '-'}</td><td>{money(h.cost)}</td>
                <td><Sparkline data={h.spark} w={80} h={22} /></td><td className="muted">{a.last_called ? timeAgo(a.last_called) : '-'}</td>
              </tr>))}</tbody>
          </table>
        </Card>
      )}

      <Drawer open={!!open} onClose={() => setOpen(null)} title={open?.agent_name}>
        {open && <AgentDetail a={open} events={events} />}
      </Drawer>
      <Drawer open={creating} onClose={() => setCreating(false)} title="Create agent">
        <CreateAgent onDone={async msg => { setCreating(false); notify(msg); await refresh(); }} demo={data.source === 'demo'} />
      </Drawer>
    </div>
  );
}

function AgentDetail({ a, events }) {
  const h = agentHealth(a, events);
  const t = telemetry(h.events);
  const users = Object.entries(a.user_counts?.users || {}).sort((x, y) => y[1].request_count - x[1].request_count);
  return (
    <div className="detail">
      <p className="muted">{a.description}</p>
      <div className="mini-kpis">
        <div><FiCheckCircle /><span>Success</span><b>{h.calls ? h.successRate.toFixed(1) + '%' : '-'}</b></div>
        <div><FiClock /><span>p95</span><b>{h.calls ? ms(h.p95) : '-'}</b></div>
        <div><FiUsers /><span>Users</span><b>{users.length}</b></div>
        <div><FiDollarSign /><span>Cost</span><b>{money(h.cost)}</b></div>
      </div>
      <h4 className="sub-h">Health score <Badge status={h.status}>{h.score} / 100</Badge></h4>
      <div className="hbar big"><div className={h.status} style={{ width: h.score + '%' }} /></div>
      <h4 className="sub-h">Contribution graph</h4>
      <div className="scroll-x"><ContributionGrid weeks={heatmapWeeks(a.daily_stats || {})} /></div>
      {t.days.length > 0 && <><h4 className="sub-h">Latency (p50 / p95)</h4><AreaChart data={t.days} keys={['p50', 'p95']} colors={['#2ee6a6', '#ff7a59']} format={ms} height={170} /></>}
      {t.models.length > 0 && <><h4 className="sub-h">Models used</h4><BarList color="var(--purple)" items={t.models.map(m => ({ label: m.model, value: m.calls }))} /></>}
      <h4 className="sub-h">Users</h4>
      <div className="user-chips">{users.slice(0, 16).map(([u, d]) => <span key={u} className="uchip"><Avatar name={u} size={20} />{u}<b>{d.request_count}</b></span>)}</div>
      <h4 className="sub-h">Metadata</h4>
      <div className="kv"><span>Agent ID</span><code>{a.agent_id}</code><span>Created</span><code>{a.created_at || '-'}</code><span>Last called</span><code>{a.last_called || '-'}</code></div>
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
