import React, { useMemo, useState } from 'react';
import { FiZap, FiClock, FiCheckCircle, FiAlertOctagon, FiHash, FiThumbsUp, FiList, FiCpu } from 'react-icons/fi';
import { Card, Kpi, Tabs } from '../components/UI';
import { AreaChart, Gauge, BarList } from '../components/Charts';
import { telemetry, fmt, ms, money, timeAgo } from '../analytics';

export default function Telemetry({ data, openAgent }) {
  const { events } = data;
  const [metric, setMetric] = useState('Latency');
  const [filter, setFilter] = useState('All');
  const t = useMemo(() => telemetry(events), [events]);
  const list = events.filter(e => filter === 'All' || (filter === 'Errors' ? !e.success : e.latency_ms > t.p95)).slice(0, 40);

  const chart = {
    Latency: { keys: ['p50', 'p95'], colors: ['#2ee6a6', '#ff7a59'], format: ms },
    Errors: { keys: ['errorRate'], colors: ['#ff5d7a'], format: v => v.toFixed(1) + '%' },
    Tokens: { keys: ['tokens'], colors: ['#7c5cff'], format: fmt },
    Calls: { keys: ['calls'], colors: ['#3fa9ff'], format: fmt },
  }[metric];

  if (!events.length) return (
    <div className="page"><div className="page-h"><div><h1>Telemetry</h1></div></div>
      <Card><div className="empty big">No telemetry received yet.<br />Send events to <code>POST /telemetry</code> or run <code>python seed_telemetry.py</code>.</div></Card></div>
  );

  return (
    <div className="page">
      <div className="page-h"><div><h1>Telemetry</h1><p>OpenTelemetry-style tracing for every agent call: latency, tokens, errors, feedback.</p></div></div>

      <div className="grid kpis">
        <Kpi label="Traced calls" value={t.calls} icon={<FiHash />} />
        <Kpi label="p50 latency" value={t.p50} format={ms} icon={<FiClock />} color="var(--green)" />
        <Kpi label="p95 latency" value={t.p95} format={ms} icon={<FiClock />} color="var(--orange)" sub={`p99 ${ms(t.p99)}`} />
        <Kpi label="Error rate" value={100 - t.successRate} format={v => v.toFixed(2) + '%'} icon={<FiAlertOctagon />} color="var(--red)" />
        <Kpi label="Tokens processed" value={t.tokens} icon={<FiZap />} color="var(--purple)" />
        <Kpi label="User satisfaction" value={t.csat ?? 0} format={v => t.csat == null ? 'n/a' : v.toFixed(0) + '%'} icon={<FiThumbsUp />} color="var(--teal)" sub="thumbs-up ratio" />
      </div>

      <div className="grid g-2-1">
        <Card title="Signals over time" icon={<FiZap />} action={<Tabs value={metric} onChange={setMetric} items={['Latency', 'Errors', 'Tokens', 'Calls']} />}>
          <AreaChart data={t.days} keys={chart.keys} colors={chart.colors} format={chart.format} height={260} key={metric} />
        </Card>
        <Card title="Reliability" icon={<FiCheckCircle />}>
          <div className="center"><Gauge value={t.successRate} label="success rate" color={t.successRate > 97 ? 'var(--green)' : t.successRate > 92 ? 'var(--orange)' : 'var(--red)'} size={190} /></div>
          <h4 className="sub-h">Top failure reasons</h4>
          <BarList color="var(--red)" items={t.errors.slice(0, 5).map(([label, value]) => ({ label, value }))} />
        </Card>
      </div>

      <div className="grid g-1-2">
        <Card title="Model performance" icon={<FiCpu />}>
          <table className="tbl">
            <thead><tr><th>Model</th><th>Calls</th><th>p95</th><th>Tokens</th><th>Cost</th></tr></thead>
            <tbody>{t.models.map(mo => <tr key={mo.model}><td><span className="chip">{mo.model}</span></td><td>{fmt(mo.calls)}</td><td>{ms(mo.p95)}</td><td>{fmt(mo.tokens)}</td><td>{money(mo.cost)}</td></tr>)}</tbody>
          </table>
        </Card>
        <Card title="Trace explorer" icon={<FiList />} action={<Tabs value={filter} onChange={setFilter} items={['All', 'Errors', 'Slow']} />}>
          <div className="trace-list">
            <div className="trace head"><span>Time</span><span>Agent</span><span>User</span><span>Model</span><span>Latency</span><span>Tokens</span><span>Status</span></div>
            {list.map(e => (
              <div key={e.id} className="trace" onClick={() => openAgent(e.agent_name)}>
                <span className="muted">{timeAgo(e.timestamp)}</span><b>{e.agent_name}</b><span>{e.username}</span>
                <span className="chip">{e.model}</span>
                <span><div className="lat"><i style={{ width: Math.min(100, e.latency_ms / (t.p99 || 1) * 100) + '%' }} className={e.latency_ms > t.p95 ? 'slow' : ''} /></div>{ms(e.latency_ms)}</span>
                <span>{fmt((e.prompt_tokens || 0) + (e.completion_tokens || 0))}</span>
                <span>{e.success ? <span className="badge healthy">OK</span> : <span className="badge critical" title={e.error}>ERR</span>}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
