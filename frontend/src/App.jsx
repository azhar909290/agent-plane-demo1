import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  FiGlobe, FiGrid, FiActivity, FiCpu, FiShare2, FiUsers, FiMessageSquare, FiSun, FiMoon,
  FiRefreshCw, FiSearch, FiZap, FiDollarSign, FiCommand,
} from 'react-icons/fi';
import { loadAll } from './data';
import { Toast } from './components/UI';
import Pulse from './pages/Pulse';
import Overview from './pages/Overview';
import Activity from './pages/Activity';
import Telemetry from './pages/Telemetry';
import Network from './pages/Network';
import Agents from './pages/Agents';
import Users from './pages/Users';
import Prompts from './pages/Prompts';
import FinOps from './pages/FinOps';

const NAV = [
  { id: 'pulse', label: 'Live Pulse', icon: <FiGlobe />, comp: Pulse },
  { id: 'overview', label: 'Command Center', icon: <FiGrid />, comp: Overview },
  { id: 'activity', label: 'Activity', icon: <FiActivity />, comp: Activity },
  { id: 'telemetry', label: 'Telemetry', icon: <FiZap />, comp: Telemetry },
  { id: 'finops', label: 'AI FinOps', icon: <FiDollarSign />, comp: FinOps },
  { id: 'network', label: 'Agent Network', icon: <FiShare2 />, comp: Network },
  { id: 'agents', label: 'Agents', icon: <FiCpu />, comp: Agents },
  { id: 'users', label: 'Users', icon: <FiUsers />, comp: Users },
  { id: 'prompts', label: 'Prompts', icon: <FiMessageSquare />, comp: Prompts },
];

export default function App() {
  const [page, setPage] = useState(() => location.hash.slice(1) || 'pulse');
  const [theme, setTheme] = useState(() => localStorage.getItem('acc-theme') || 'dark');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [palette, setPalette] = useState(false);
  const [q, setQ] = useState('');
  const [focusAgent, setFocusAgent] = useState(null);
  const [toast, setToast] = useState(null);

  const notify = text => setToast({ text, t: Date.now() });

  const refresh = useCallback(async (opts) => {
    setLoading(true);
    const d = await loadAll(opts);
    setData(d); setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('acc-theme', theme); }, [theme]);
  useEffect(() => { location.hash = page; window.scrollTo({ top: 0, behavior: 'smooth' }); }, [page]);
  useEffect(() => {
    const k = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(p => !p); setQ(''); }
      if (e.key === 'Escape') setPalette(false);
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, []);
  // auto refresh every 60s when live
  useEffect(() => {
    if (data?.source !== 'live') return;
    const t = setInterval(() => loadAll().then(setData), 60000);
    return () => clearInterval(t);
  }, [data?.source]);

  const openAgent = name => { setFocusAgent(name); setPage('agents'); setPalette(false); };
  const Comp = (NAV.find(n => n.id === page) || NAV[0]).comp;

  const results = useMemo(() => {
    if (!data) return [];
    const s = q.toLowerCase();
    return [
      ...NAV.map(n => ({ kind: 'Page', label: n.label, icon: n.icon, go: () => { setPage(n.id); setPalette(false); } })),
      ...data.agents.map(a => ({ kind: 'Agent', label: a.agent_name, icon: <FiCpu />, go: () => openAgent(a.agent_name) })),
      ...data.prompts.map(p => ({ kind: 'Prompt', label: p.type, icon: <FiMessageSquare />, go: () => { setPage('prompts'); setPalette(false); } })),
      { kind: 'Action', label: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode', icon: <FiSun />, go: () => { setTheme(theme === 'dark' ? 'light' : 'dark'); setPalette(false); } },
      { kind: 'Action', label: 'Load demo data', icon: <FiRefreshCw />, go: () => { refresh({ forceDemo: true }); setPalette(false); } },
    ].filter(r => r.label.toLowerCase().includes(s)).slice(0, 9);
  }, [q, data, theme]);

  return (
    <div className="app">
      <aside className="side">
        <div className="brand"><div className="logo"><FiCpu /></div><div><b>Agent Command</b><span>Center</span></div></div>
        <nav>{NAV.map(n => (
          <button key={n.id} className={page === n.id ? 'on' : ''} onClick={() => setPage(n.id)}>{n.icon}<span>{n.label}</span></button>
        ))}</nav>
        <div className="side-foot">
          <div className={'src ' + (data?.source || '')}><i />{data?.source === 'live' ? 'Live backend' : 'Live data'}</div>
          <small>v2.0 · React</small>
        </div>
      </aside>

      <main className="main">
        <header className="top">
          <button className="search" onClick={() => setPalette(true)}><FiSearch /> Search agents, prompts, pages… <kbd><FiCommand />K</kbd></button>
          <div className="top-actions">
            <span className="updated">{data && `Updated ${data.loadedAt.toLocaleTimeString()}`}</span>
            <button className="icon-btn" title="Refresh" onClick={() => refresh()}><FiRefreshCw className={loading ? 'spin' : ''} /></button>
            <button className="icon-btn" title="Theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <FiSun /> : <FiMoon />}</button>
          </div>
        </header>

        <div className="content" key={page}>
          {!data ? <div className="loader"><div className="ring" /><p>Booting command center…</p></div>
            : <Comp data={data} goto={setPage} openAgent={openAgent} focusAgent={focusAgent} clearFocus={() => setFocusAgent(null)} refresh={refresh} notify={notify} theme={theme} />}
        </div>
      </main>

      {palette && (
        <div className="palette-bg" onClick={() => setPalette(false)}>
          <div className="palette" onClick={e => e.stopPropagation()}>
            <div className="palette-in"><FiSearch /><input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Type to search…"
              onKeyDown={e => e.key === 'Enter' && results[0]?.go()} /></div>
            {results.map((r, i) => <button key={i} onClick={r.go}>{r.icon}<span>{r.label}</span><em>{r.kind}</em></button>)}
            {!results.length && <div className="empty">No matches</div>}
          </div>
        </div>
      )}
      <Toast msg={toast} />
    </div>
  );
}
