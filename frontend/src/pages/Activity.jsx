import React, { useMemo, useState } from 'react';
import { FiActivity, FiCalendar, FiAward, FiTrendingUp, FiClock, FiGitCommit } from 'react-icons/fi';
import { Card, Kpi, Tabs, Avatar } from '../components/UI';
import { ContributionGrid, Punchcard } from '../components/Charts';
import { dailyTotals, heatmapWeeks, streaks, telemetry, fmt, ms, timeAgo } from '../analytics';

export default function Activity({ data }) {
  const { agents, events } = data;
  const [agent, setAgent] = useState('All agents');
  const [palette, setPalette] = useState('green');
  const [sel, setSel] = useState(null);

  const scope = agent === 'All agents' ? agents : agents.filter(a => a.agent_name === agent);
  const m = useMemo(() => {
    const daily = dailyTotals(scope);
    return { weeks: heatmapWeeks(daily), st: streaks(daily), total: Object.values(daily).reduce((a, b) => a + b, 0) };
  }, [scope]);
  const scopedEvents = agent === 'All agents' ? events : events.filter(e => e.agent_name === agent);
  const t = useMemo(() => telemetry(scopedEvents), [scopedEvents]);
  const dayEvents = sel ? scopedEvents.filter(e => e.timestamp.slice(0, 10) === sel.date) : scopedEvents.slice(0, 12);

  return (
    <div className="page">
      <div className="page-h">
        <div><h1>Activity</h1><p>A GitHub-style contribution view of agent usage over the past year.</p></div>
        <div className="row-gap">
          <select className="select" value={agent} onChange={e => { setAgent(e.target.value); setSel(null); }}>
            <option>All agents</option>{agents.map(a => <option key={a.agent_id}>{a.agent_name}</option>)}
          </select>
          <Tabs value={palette} onChange={setPalette} items={['green', 'violet', 'ocean']} />
        </div>
      </div>

      <Card title={`${fmt(m.total)} requests in the last year`} icon={<FiCalendar />} key={agent + palette}>
        <ContributionGrid weeks={m.weeks} palette={palette} selected={sel?.date} onSelect={c => setSel(sel?.date === c.date ? null : c)} />
      </Card>

      <div className="grid kpis four">
        <Kpi label="Current streak" value={m.st.current} format={v => Math.round(v) + ' days'} icon={<FiActivity />} color="var(--green)" />
        <Kpi label="Longest streak" value={m.st.best} format={v => Math.round(v) + ' days'} icon={<FiAward />} color="var(--orange)" />
        <Kpi label="Active days" value={m.st.activeDays} format={v => Math.round(v) + ' / 365'} icon={<FiCalendar />} color="var(--purple)" />
        <Kpi label="Busiest day" value={m.st.busiest.value || 0} icon={<FiTrendingUp />} sub={m.st.busiest.date} color="var(--pink)" />
      </div>

      <div className="grid g-1-1">
        <Card title="When do people use agents?" icon={<FiClock />}><Punchcard matrix={t.punch} /></Card>
        <Card title={sel ? `Timeline · ${sel.date}` : 'Recent timeline'} icon={<FiGitCommit />}>
          <div className="timeline">
            {dayEvents.slice(0, 12).map(e => (
              <div key={e.id} className={'tl-item ' + (e.success ? 'ok' : 'bad')}>
                <i />
                <div className="tl-body">
                  <div><Avatar name={e.username || '?'} size={20} /> <b>{e.username}</b> called <b>{e.agent_name}</b></div>
                  <small>{e.model} · {ms(e.latency_ms)} · {fmt((e.prompt_tokens || 0) + (e.completion_tokens || 0))} tokens {e.error ? '· ' + e.error : ''}</small>
                </div>
                <time>{timeAgo(e.timestamp)}</time>
              </div>
            ))}
            {!dayEvents.length && <div className="empty">No traced events {sel ? 'on this day' : 'yet'}</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
