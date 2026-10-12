import React, { useEffect, useMemo, useState } from 'react';
import { FiCheckCircle, FiXCircle, FiArrowRight, FiCpu, FiUsers, FiZap, FiClock } from 'react-icons/fi';
import Globe from '../components/Globe';
import { Counter } from '../components/Charts';
import { Avatar } from '../components/UI';
import { dailyTotals, telemetry, fmt, ms, money, MINUTES_SAVED_PER_REQUEST } from '../analytics';

export default function Pulse({ data, goto }) {
  const { agents, events } = data;
  const totals = useMemo(() => {
    const daily = dailyTotals(agents);
    const today = new Date().toISOString().slice(0, 10);
    const users = new Set(agents.flatMap(a => Object.keys(a.user_counts?.users || {})));
    const total = agents.reduce((s, a) => s + (a.total_requests || 0), 0);
    return { total, today: daily[today] || 0, users: users.size, agents: agents.length, t: telemetry(events), hours: total * MINUTES_SAVED_PER_REQUEST / 60 };
  }, [agents, events]);

  // live ticker: replays recent events (demo) or shows latest (live)
  const [feed, setFeed] = useState(() => events.slice(0, 7));
  const [bump, setBump] = useState(0);
  useEffect(() => {
    if (!events.length) return;
    let i = 7;
    const t = setInterval(() => {
      const e = { ...events[i % events.length], _k: Date.now(), timestamp: new Date().toISOString() };
      setFeed(f => [e, ...f].slice(0, 7)); setBump(b => b + 1); i++;
    }, 2200);
    return () => clearInterval(t);
  }, [events]);

  return (
    <div className="pulse">
      <div className="pulse-hero">
        <div className="pulse-copy">
          <span className="eyebrow"><i className="live-dot" /> Live across your organisation</span>
          <h1>Every agent.<br /><span className="grad">Every request.</span><br />In one view.</h1>
          <p>Observability, telemetry, adoption and FinOps for your GenAI agents - from first prompt to business value.</p>
          <div className="hero-stats">
            <div><b><Counter value={totals.total + bump} /></b><span>requests served</span></div>
            <div><b><Counter value={totals.users} /></b><span>engineers using agents</span></div>
            <div><b><Counter value={totals.hours} /></b><span>hours saved (est.)</span></div>
          </div>
          <div className="hero-cta">
            <button className="btn primary" onClick={() => goto('overview')}>Open Command Center <FiArrowRight /></button>
            <button className="btn ghost" onClick={() => goto('activity')}>View activity graph</button>
          </div>
        </div>
        <div className="pulse-globe"><Globe size={540} /></div>
      </div>

      <div className="pulse-strip">
        <div><FiCpu /><b>{totals.agents}</b> agents online</div>
        <div><FiZap /><b>{fmt(totals.today)}</b> requests today</div>
        <div><FiCheckCircle /><b>{totals.t.successRate.toFixed(1)}%</b> success</div>
        <div><FiClock /><b>{ms(totals.t.p95)}</b> p95 latency</div>
        <div><FiUsers /><b>{money(totals.t.cost)}</b> model spend (30d)</div>
      </div>

      <div className="ticker card">
        <header className="card-h"><h3><i className="live-dot" /> Live request stream</h3><span className="muted">{data.source === 'demo' ? 'replaying telemetry' : 'latest events'}</span></header>
        {feed.map(e => (
          <div key={e._k || e.id} className="tick-row">
            <Avatar name={e.username || '?'} size={26} />
            <span className="mono">{e.username}</span>
            <FiArrowRight className="muted" />
            <b>{e.agent_name}</b>
            <span className="chip">{e.model}</span>
            <span className="mono muted">{ms(e.latency_ms)}</span>
            <span className="mono muted">{fmt((e.prompt_tokens || 0) + (e.completion_tokens || 0))} tok</span>
            {e.success ? <FiCheckCircle className="ok" /> : <span className="err"><FiXCircle /> {e.error}</span>}
          </div>
        ))}
        {!feed.length && <div className="empty">No telemetry yet - POST events to /telemetry</div>}
      </div>
    </div>
  );
}
