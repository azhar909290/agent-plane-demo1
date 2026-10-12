import React, { useMemo, useState } from 'react';
import { FiShare2 } from 'react-icons/fi';
import { Card } from '../components/UI';
import { fmt } from '../analytics';

// Animated 3-layer flow graph: Users -> Agents -> Models, particles travel along edges.
export default function Network({ data, openAgent }) {
  const { agents, events } = data;
  const [hover, setHover] = useState(null);
  const g = useMemo(() => build(agents, events), [agents, events]);
  const W = 1100, H = Math.max(520, Math.max(g.cols[0].length, g.cols[1].length, g.cols[2].length) * 46 + 60);
  const colX = [130, W / 2, W - 130];
  const pos = {};
  g.cols.forEach((col, ci) => col.forEach((n, i) => { pos[n.id] = { x: colX[ci], y: 50 + (i + 0.5) * ((H - 80) / col.length) }; }));
  const maxW = Math.max(1, ...g.links.map(l => l.value));
  const lit = l => !hover || l.source === hover || l.target === hover;

  return (
    <div className="page">
      <div className="page-h"><div><h1>Agent Network</h1><p>How requests flow from people, through agents, to foundation models. Hover any node.</p></div></div>
      <Card title="Request flow graph" icon={<FiShare2 />} action={<span className="legend-inline"><i style={{ background: '#3fa9ff' }} />Users <i style={{ background: '#7c5cff' }} />Agents <i style={{ background: '#2ee6a6' }} />Models</span>}>
        <div className="net-wrap">
          <svg viewBox={`0 0 ${W} ${H}`} className="net">
            {['USERS', 'AGENTS', 'MODELS'].map((t, i) => <text key={t} x={colX[i]} y={24} className="net-col">{t}</text>)}
            {g.links.map((l, i) => {
              const a = pos[l.source], b = pos[l.target]; if (!a || !b) return null;
              const mx = (a.x + b.x) / 2;
              const d = `M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`;
              const w = 1 + (l.value / maxW) * 7;
              return <g key={i} className={'edge' + (lit(l) ? ' lit' : ' dim')}>
                <path d={d} strokeWidth={w} stroke={l.color} className="edge-base" />
                <path d={d} strokeWidth={Math.max(1.5, w * 0.5)} stroke="#fff" className="edge-flow" style={{ animationDuration: `${2.8 - (l.value / maxW) * 1.8}s`, animationDelay: `${(i % 9) * -0.3}s` }} />
              </g>;
            })}
            {g.cols.flat().map(n => {
              const p = pos[n.id]; const r = 7 + Math.sqrt(n.value / g.maxNode) * 16;
              return <g key={n.id} transform={`translate(${p.x},${p.y})`} className={'node ' + n.type + (hover && hover !== n.id && !g.links.some(l => (l.source === hover && l.target === n.id) || (l.target === hover && l.source === n.id)) ? ' dim' : '')}
                onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)} onClick={() => n.type === 'agent' && openAgent(n.label)}>
                <circle r={r + 6} className="halo" /><circle r={r} />
                <text x={n.type === 'user' ? -r - 10 : r + 10} y="4" textAnchor={n.type === 'user' ? 'end' : 'start'}>{n.label}<tspan className="nv"> {fmt(n.value)}</tspan></text>
              </g>;
            })}
          </svg>
        </div>
      </Card>
    </div>
  );
}

function build(agents, events) {
  const users = {}, ag = {}, models = {}, links = {};
  const add = (s, t, v, color) => { const k = s + '>' + t; links[k] ??= { source: s, target: t, value: 0, color }; links[k].value += v; };
  if (events.length) {
    events.forEach(e => {
      users[e.username] = (users[e.username] || 0) + 1; ag[e.agent_name] = (ag[e.agent_name] || 0) + 1; models[e.model] = (models[e.model] || 0) + 1;
    });
  } else {
    agents.forEach(a => { ag[a.agent_name] = a.total_requests; Object.entries(a.user_counts?.users || {}).forEach(([u, d]) => (users[u] = (users[u] || 0) + d.request_count)); });
  }
  const topU = Object.entries(users).sort((a, b) => b[1] - a[1]).slice(0, 10).map(x => x[0]);
  const topA = Object.entries(ag).sort((a, b) => b[1] - a[1]).slice(0, 10).map(x => x[0]);
  if (events.length) {
    events.forEach(e => {
      if (topU.includes(e.username) && topA.includes(e.agent_name)) add('u:' + e.username, 'a:' + e.agent_name, 1, '#3fa9ff');
      if (topA.includes(e.agent_name)) add('a:' + e.agent_name, 'm:' + e.model, 1, '#7c5cff');
    });
  } else {
    agents.forEach(a => topA.includes(a.agent_name) && Object.entries(a.user_counts?.users || {}).forEach(([u, d]) => topU.includes(u) && add('u:' + u, 'a:' + a.agent_name, d.request_count, '#3fa9ff')));
  }
  const L = Object.values(links).filter(l => l.value > 0);
  const cols = [
    topU.map(u => ({ id: 'u:' + u, label: u, value: users[u], type: 'user' })),
    topA.map(a => ({ id: 'a:' + a, label: a, value: ag[a], type: 'agent' })),
    Object.entries(models).sort((a, b) => b[1] - a[1]).map(([m, v]) => ({ id: 'm:' + m, label: m, value: v, type: 'model' })),
  ];
  return { cols, links: L, maxNode: Math.max(1, ...cols.flat().map(n => n.value)) };
}
