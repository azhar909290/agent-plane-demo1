import React, { useEffect, useState } from 'react';
import { FiArrowUpRight, FiArrowDownRight, FiX } from 'react-icons/fi';
import { Counter, Sparkline } from './Charts';

export const Card = ({ title, icon, action, children, className = '', style }) => (
  <section className={'card ' + className} style={style}>
    {(title || action) && <header className="card-h"><h3>{icon}{title}</h3>{action}</header>}
    {children}
  </section>
);

export const Kpi = ({ label, value, format, icon, delta, spark, color = 'var(--accent)', sub }) => (
  <div className="kpi card" style={{ '--c': color }}>
    <div className="kpi-top"><span className="kpi-icon">{icon}</span><span className="kpi-label">{label}</span></div>
    <div className="kpi-value"><Counter value={value} format={format} /></div>
    <div className="kpi-foot">
      {delta != null && <span className={'delta ' + (delta >= 0 ? 'up' : 'down')}>{delta >= 0 ? <FiArrowUpRight /> : <FiArrowDownRight />}{Math.abs(delta).toFixed(1)}%</span>}
      {sub && <span className="kpi-sub">{sub}</span>}
      {spark && <Sparkline data={spark} color={color} />}
    </div>
  </div>
);

export const Badge = ({ status, children }) => <span className={'badge ' + status}>{children || status}</span>;

export const Avatar = ({ name, size = 30 }) => {
  const hue = [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % 360;
  return <span className="avatar" style={{ width: size, height: size, background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 50) % 360} 70% 45%))` }}>{name[0]?.toUpperCase()}</span>;
};

export function Drawer({ open, onClose, title, children }) {
  useEffect(() => {
    const k = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className={'drawer-bg' + (open ? ' open' : '')} onClick={onClose}>
      <aside className="drawer" onClick={e => e.stopPropagation()}>
        <header><h2>{title}</h2><button className="icon-btn" onClick={onClose}><FiX /></button></header>
        <div className="drawer-body">{open && children}</div>
      </aside>
    </div>
  );
}

export function Toast({ msg }) {
  const [show, setShow] = useState(false);
  useEffect(() => { if (msg) { setShow(true); const t = setTimeout(() => setShow(false), 2600); return () => clearTimeout(t); } }, [msg]);
  return <div className={'toast' + (show ? ' show' : '')}>{msg?.text}</div>;
}

export const Tabs = ({ value, onChange, items }) => (
  <div className="tabs">{items.map(i => <button key={i} className={value === i ? 'on' : ''} onClick={() => onChange(i)}>{i}</button>)}</div>
);
