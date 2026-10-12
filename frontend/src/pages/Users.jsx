import React, { useMemo, useState } from 'react';
import { FiUsers, FiAward, FiCompass, FiRepeat, FiSearch } from 'react-icons/fi';
import { Card, Kpi, Avatar, Tabs } from '../components/UI';
import { Donut } from '../components/Charts';
import { userTable, fmt, timeAgo } from '../analytics';

export default function Users({ data, openAgent }) {
  const [q, setQ] = useState(''); const [persona, setPersona] = useState('All');
  const users = useMemo(() => userTable(data.agents), [data.agents]);
  const counts = ['Power user', 'Regular', 'Explorer'].map(p => users.filter(u => u.persona === p).length);
  const active7 = users.filter(u => u.last && Date.now() - new Date(u.last) < 7 * 864e5).length;
  const list = users.filter(u => (persona === 'All' || u.persona === persona) && u.username.toLowerCase().includes(q.toLowerCase()));
  const podium = users.slice(0, 3);

  return (
    <div className="page">
      <div className="page-h"><div><h1>Users</h1><p>Who is adopting agents, how deeply, and which ones they love.</p></div></div>
      <div className="grid kpis four">
        <Kpi label="Total users" value={users.length} icon={<FiUsers />} />
        <Kpi label="Active (7d)" value={active7} icon={<FiRepeat />} color="var(--green)" sub={users.length ? `${Math.round(active7 / users.length * 100)}% stickiness` : ''} />
        <Kpi label="Avg agents / user" value={users.length ? users.reduce((s, u) => s + u.agentsUsed, 0) / users.length : 0} format={v => v.toFixed(1)} icon={<FiCompass />} color="var(--purple)" />
        <Kpi label="Power users" value={counts[0]} icon={<FiAward />} color="var(--orange)" sub="> 150 requests" />
      </div>

      <div className="grid g-1-2">
        <Card title="Personas" icon={<FiCompass />}>
          <Donut items={[{ label: 'Power user', value: counts[0], color: '#ff7a59' }, { label: 'Regular', value: counts[1], color: '#7c5cff' }, { label: 'Explorer', value: counts[2], color: '#2ee6a6' }]}
            center={{ value: users.length, label: 'users' }} />
        </Card>
        <Card title="Leaderboard" icon={<FiAward />}>
          <div className="podium">
            {[1, 0, 2].map(i => podium[i] && (
              <div key={i} className={'pod p' + (i + 1)}>
                <Avatar name={podium[i].username} size={i === 0 ? 64 : 48} />
                <b>{podium[i].username}</b><span>{fmt(podium[i].total)} req</span>
                <div className="pod-bar">{['🥇', '🥈', '🥉'][i]}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="All users" icon={<FiUsers />} action={<div className="row-gap"><div className="input-ic"><FiSearch /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" /></div><Tabs value={persona} onChange={setPersona} items={['All', 'Power user', 'Regular', 'Explorer']} /></div>}>
        <table className="tbl">
          <thead><tr><th>#</th><th>User</th><th>Persona</th><th>Requests</th><th>Agents</th><th>Favourite agent</th><th>Agent mix</th><th>Last active</th></tr></thead>
          <tbody>{list.slice(0, 50).map((u, i) => (
            <tr key={u.username}>
              <td className="muted">{i + 1}</td><td><span className="user-cell"><Avatar name={u.username} size={26} />{u.username}</span></td>
              <td><span className={'chip persona ' + u.persona.split(' ')[0].toLowerCase()}>{u.persona}</span></td>
              <td><b>{fmt(u.total)}</b></td><td>{u.agentsUsed}</td>
              <td><button className="link" onClick={() => openAgent(u.favourite)}>{u.favourite}</button></td>
              <td><div className="mix">{Object.entries(u.agents).sort((a, b) => b[1] - a[1]).map(([a, v], k) => <i key={a} title={`${a}: ${v}`} style={{ flex: v, background: `hsl(${(k * 47 + 250) % 360} 70% 60%)` }} />)}</div></td>
              <td className="muted">{u.last ? timeAgo(u.last) : '-'}</td>
            </tr>))}</tbody>
        </table>
      </Card>
    </div>
  );
}
