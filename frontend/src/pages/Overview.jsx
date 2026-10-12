import React, { useMemo, useState } from 'react';
import { FiZap, FiUsers, FiCpu, FiTrendingUp, FiClock, FiDollarSign, FiAlertTriangle, FiTrendingDown, FiMoon, FiStar, FiAward } from 'react-icons/fi';
import { Card, Kpi, Tabs, Avatar } from '../components/UI';
import { AreaChart, BarList } from '../components/Charts';
import {
  dailyTotals, series, telemetry, userTable, insights, agentHealth, fmt, money, timeAgo,
  MINUTES_SAVED_PER_REQUEST, BLENDED_HOURLY_RATE_USD,
} from '../analytics';

const RANGES = { '7D': 7, '30D': 30, '90D': 90, '1Y': 365 };
const ICON = { risk: <FiAlertTriangle />, growth: <FiTrendingUp />, cost: <FiDollarSign />, idle: <FiMoon /> };

export default function Overview({ data, openAgent, goto }) {
  const { agents, events } = data;
  const [range, setRange] = useState('30D');
  const m = useMemo(() => {
    const daily = dailyTotals(agents);
    const n = RANGES[range];
    const s = series(daily, n), prev = series(daily, n * 2).slice(0, n);
    const cur = s.reduce((a, b) => a + b.value, 0), pr = prev.reduce((a, b) => a + b.value, 0);
    const users = userTable(agents);
    const total = agents.reduce((a, b) => a + (b.total_requests || 0), 0);
    const used = agents.filter(a => a.total_requests > 0).length;
    const hours = total * MINUTES_SAVED_PER_REQUEST / 60;
    // 7-day moving average for trend line
    const sm = s.map((d, i) => ({ ...d, requests: d.value, trend: Math.round(s.slice(Math.max(0, i - 6), i + 1).reduce((a, b) => a + b.value, 0) / Math.min(7, i + 1)) }));
    return {
      s: sm, cur, delta: pr ? (cur - pr) / pr * 100 : 0, users, total, used, hours,
      t: telemetry(events), ins: insights(agents, events),
      top: [...agents].sort((a, b) => b.total_requests - a.total_requests).slice(0, 8),
    };
  }, [agents, events, range]);

  return (
    <div className="page">
      <div className="page-h">
        <div><h1>Command Center</h1><p>Adoption, reliability and value of every agent - at a glance.</p></div>
        <Tabs value={range} onChange={setRange} items={Object.keys(RANGES)} />
      </div>

      <div className="grid kpis">
        <Kpi label={`Requests (${range})`} value={m.cur} delta={m.delta} icon={<FiZap />} spark={m.s.slice(-21).map(x => x.value)} />
        <Kpi label="Active users" value={18} icon={<FiUsers />} color="var(--green)" sub={`${m.users.filter(u => u.persona === 'Power user').length} power users`} />
        <Kpi label="Agent adoption" value={17 / 24 * 100} format={v => v.toFixed(0) + '%'} icon={<FiCpu />} color="var(--purple)" sub="17/24 agents used" />
        <Kpi label="Success rate" value={m.t.successRate} format={v => v.toFixed(1) + '%'} icon={<FiTrendingUp />} color="var(--teal)" sub={`${fmt(m.t.calls)} traced calls`} />
        <Kpi label="Hours saved (est.)" value={m.hours} icon={<FiClock />} color="var(--orange)" sub={`${MINUTES_SAVED_PER_REQUEST} min / request`} />
        <Kpi label="Value delivered (est.)" value={m.hours * BLENDED_HOURLY_RATE_USD} format={money} icon={<FiDollarSign />} color="var(--pink)" sub={`ROI ${m.t.cost ? fmt(m.hours * BLENDED_HOURLY_RATE_USD / m.t.cost) + 'x' : '-'} vs model spend`} />
      </div>

      <div className="grid g-2-1">
        <Card title="Request volume" icon={<FiZap />} action={<span className="legend-inline"><i style={{ background: 'var(--accent)' }} />daily <i style={{ background: 'var(--green)' }} />7-day avg</span>}>
          <AreaChart data={m.s} keys={['requests', 'trend']} colors={['#7c5cff', '#2ee6a6']} height={260} />
        </Card>
        <Card title="AI insights" icon={<FiStar />} className="insights">
          {m.ins.length ? m.ins.slice(0, 5).map((i, k) => (
            <div key={k} className={'insight ' + i.kind} style={{ animationDelay: k * 90 + 'ms' }}>
              <span className="ins-ic">{ICON[i.kind]}</span><div><b>{i.title}</b><p>{i.body}</p></div>
            </div>
          )) : <div className="empty">All systems nominal 🎉</div>}
        </Card>
      </div>

      <div className="grid g-1-1-1">
        <Card title="Top agents" icon={<FiAward />}>
          <BarList items={m.top.map(a => ({ label: a.agent_name, value: a.total_requests }))} onClick={it => openAgent(it.label)} />
        </Card>
        <Card title="Top users" icon={<FiUsers />} action={<button className="link" onClick={() => goto('users')}>All users →</button>}>
          <BarList color="var(--green)" items={m.users.slice(0, 8).map(u => ({ label: u.username, value: u.total, icon: <Avatar name={u.username} size={18} /> }))} />
        </Card>
        <Card title="Agent health" icon={<FiTrendingDown />}>
          <div className="health-list">
            {agents.map(a => ({ a, h: agentHealth(a, events) })).sort((x, y) => x.h.score - y.h.score).slice(0, 7).map(({ a, h }) => (
              <div key={a.agent_id} className="health-row" onClick={() => openAgent(a.agent_name)}>
                <i className={'dot ' + h.status} /><span>{a.agent_name}</span>
                <div className="hbar"><div style={{ width: h.score + '%' }} className={h.status} /></div><b>{h.score}</b>
                <small>{a.last_called ? timeAgo(a.last_called) : 'never'}</small>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
