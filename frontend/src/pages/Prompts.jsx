import React, { useMemo, useState } from 'react';
import { FiMessageSquare, FiCopy, FiPlus, FiSearch, FiEye, FiHash, FiFileText } from 'react-icons/fi';
import { Card, Kpi, Drawer } from '../components/UI';
import { post } from '../data';

const estTokens = s => Math.ceil(s.length / 4);
const vars = s => [...new Set((s.match(/\{\{?\s*[\w.]+\s*\}?\}/g) || []))];

export default function Prompts({ data, notify, refresh }) {
  const [q, setQ] = useState(''); const [open, setOpen] = useState(null); const [creating, setCreating] = useState(false);
  const prompts = data.prompts;
  const list = useMemo(() => prompts.filter(p => (p.type + p.content).toLowerCase().includes(q.toLowerCase())), [prompts, q]);
  const cats = new Set(prompts.map(p => p.type.split('-')[0])).size;
  const copy = p => navigator.clipboard.writeText(p.content).then(() => notify('Prompt copied 📋'));

  return (
    <div className="page">
      <div className="page-h">
        <div><h1>Prompt Library</h1><p>Versioned, reusable prompts with token estimates and variable detection.</p></div>
        <button className="btn primary" onClick={() => setCreating(true)}><FiPlus /> New prompt</button>
      </div>
      <div className="grid kpis four">
        <Kpi label="Prompts" value={prompts.length} icon={<FiMessageSquare />} />
        <Kpi label="Categories" value={cats} icon={<FiFileText />} color="var(--purple)" />
        <Kpi label="Avg tokens" value={prompts.length ? prompts.reduce((s, p) => s + estTokens(p.content), 0) / prompts.length : 0} icon={<FiHash />} color="var(--green)" sub="≈ chars / 4" />
        <Kpi label="With variables" value={prompts.filter(p => vars(p.content).length).length} icon={<FiHash />} color="var(--orange)" />
      </div>
      <div className="toolbar card"><div className="input-ic"><FiSearch /><input placeholder="Search prompts…" value={q} onChange={e => setQ(e.target.value)} /></div></div>
      <div className="grid prompts-grid">
        {list.map((p, i) => (
          <div key={p.type} className="card prompt-card" style={{ animationDelay: i * 40 + 'ms' }}>
            <div className="ac-top"><div className="ac-logo purple"><FiMessageSquare /></div><div className="ac-t"><b>{p.type.replace(/-/g, ' ')}</b><small className="mono">{p.type}</small></div></div>
            <pre className="prompt-pre">{p.content.slice(0, 220)}{p.content.length > 220 ? '…' : ''}</pre>
            <div className="prompt-meta"><span className="chip">~{estTokens(p.content)} tokens</span><span className="chip">{p.content.split('\n').length} lines</span>{vars(p.content).slice(0, 2).map(v => <span key={v} className="chip var">{v}</span>)}</div>
            <div className="row-gap"><button className="btn ghost sm" onClick={() => setOpen(p)}><FiEye /> View</button><button className="btn ghost sm" onClick={() => copy(p)}><FiCopy /> Copy</button></div>
          </div>
        ))}
        {!list.length && <div className="empty">No prompts found</div>}
      </div>
      <Drawer open={!!open} onClose={() => setOpen(null)} title={open?.type}>
        {open && <><pre className="prompt-full">{open.content}</pre><button className="btn primary" onClick={() => copy(open)}><FiCopy /> Copy prompt</button></>}
      </Drawer>
      <Drawer open={creating} onClose={() => setCreating(false)} title="Create prompt">
        <CreatePrompt demo={data.source === 'demo'} onDone={async () => { setCreating(false); notify('Prompt created ✨'); await refresh(); }} />
      </Drawer>
    </div>
  );
}

function CreatePrompt({ onDone, demo }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [txt, setTxt] = useState('');
  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr('');
    try { if (demo) throw new Error('Backend not connected - start Flask on :5000'); await post('/ui/prompts/create', new FormData(e.target), true); onDone(); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <form className="form" onSubmit={submit}>
      <label>Prompt name<input name="prompt_name" required placeholder="e.g. Analyze Code" /></label>
      <label>Content <small className="muted">~{estTokens(txt)} tokens</small><textarea name="prompt_content" rows="12" required value={txt} onChange={e => setTxt(e.target.value)} /></label>
      {err && <div className="form-err">{err}</div>}
      <button className="btn primary" disabled={busy}>{busy ? 'Creating…' : 'Create prompt'}</button>
    </form>
  );
}
