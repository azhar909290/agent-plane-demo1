import React, { useState, useEffect, useRef } from 'react';
import { fmt } from '../analytics';

// Animated number counter
export function Counter({ value, format = fmt, duration = 1100 }) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    let raf; const start = performance.now(); const a = from.current;
    const tick = t => {
      const p = Math.min(1, (t - start) / duration); const e = 1 - Math.pow(1 - p, 3);
      setV(a + (value - a) * e);
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(v)}</>;
}

export function Sparkline({ data, color = 'var(--accent)', w = 110, h = 32 }) {
  if (!data?.length) return null;
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - (v / max) * (h - 4) - 2]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const id = 'sp' + Math.random().toString(36).slice(2);
  return (
    <svg width={w} height={h} className="spark">
      <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".35" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" className="draw" />
    </svg>
  );
}

// Multi-series area/line chart with hover tooltip
export function AreaChart({ data, keys, colors, height = 240, format = fmt, xKey = 'date' }) {
  const [hover, setHover] = useState(null);
  const W = 800, H = height, P = { l: 44, r: 12, t: 12, b: 26 };
  if (!data?.length) return <div className="empty">No data yet</div>;
  const max = Math.max(1, ...data.flatMap(d => keys.map(k => d[k] || 0))) * 1.1;
  const x = i => P.l + (i / Math.max(1, data.length - 1)) * (W - P.l - P.r);
  const y = v => H - P.b - (v / max) * (H - P.t - P.b);
  const smooth = k => data.map((d, i) => {
    const px = x(i), py = y(d[k] || 0);
    if (!i) return `M${px},${py}`;
    const cx = (x(i - 1) + px) / 2;
    return `C${cx},${y(data[i - 1][k] || 0)} ${cx},${py} ${px},${py}`;
  }).join(' ');
  const ticks = [0, .25, .5, .75, 1].map(t => max * t);
  const step = Math.ceil(data.length / 8);
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height }}
        onMouseLeave={() => setHover(null)}
        onMouseMove={e => {
          const r = e.currentTarget.getBoundingClientRect();
          const rx = ((e.clientX - r.left) / r.width) * W;
          const i = Math.round(((rx - P.l) / (W - P.l - P.r)) * (data.length - 1));
          setHover(Math.max(0, Math.min(data.length - 1, i)));
        }}>
        <defs>{keys.map((k, i) => (
          <linearGradient key={k} id={`g-${k}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={colors[i]} stopOpacity=".32" /><stop offset="1" stopColor={colors[i]} stopOpacity="0" />
          </linearGradient>))}</defs>
        {ticks.map((t, i) => <g key={i}><line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} className="grid" />
          <text x={P.l - 6} y={y(t) + 4} className="axis" textAnchor="end">{format(t)}</text></g>)}
        {data.map((d, i) => i % step === 0 && <text key={i} x={x(i)} y={H - 6} className="axis" textAnchor="middle">{String(d[xKey]).slice(5)}</text>)}
        {keys.map((k, i) => <g key={k}>
          <path d={`${smooth(k)} L${x(data.length - 1)},${H - P.b} L${P.l},${H - P.b} Z`} fill={`url(#g-${k})`} className="fade" />
          <path d={smooth(k)} fill="none" stroke={colors[i]} strokeWidth="2.4" className="draw" />
        </g>)}
        {hover != null && <g>
          <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="var(--muted)" strokeDasharray="4 4" />
          {keys.map((k, i) => <circle key={k} cx={x(hover)} cy={y(data[hover][k] || 0)} r="4.5" fill={colors[i]} stroke="var(--card)" strokeWidth="2" />)}
        </g>}
      </svg>
      {hover != null && (
        <div className="tooltip" style={{ left: `${(x(hover) / W) * 100}%` }}>
          <b>{data[hover][xKey]}</b>
          {keys.map((k, i) => <div key={k}><i style={{ background: colors[i] }} />{k}: {format(data[hover][k] || 0)}</div>)}
        </div>
      )}
    </div>
  );
}

export function BarList({ items, color = 'var(--accent)', format = fmt, onClick }) {
  const max = Math.max(1, ...items.map(i => i.value));
  return (
    <div className="barlist">
      {items.map((it, i) => (
        <div key={it.label} className={'barrow' + (onClick ? ' clickable' : '')} onClick={() => onClick?.(it)}>
          <div className="barfill" style={{ width: `${(it.value / max) * 100}%`, background: it.color || color, animationDelay: `${i * 60}ms` }} />
          <span className="barlabel">{it.icon}{it.label}</span>
          <span className="barval">{format(it.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function Donut({ items, size = 190, thickness = 26, center, format = fmt }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const R = size / 2 - thickness / 2, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="var(--track)" strokeWidth={thickness} />
        {items.map(it => {
          const len = (it.value / total) * C; const off = acc; acc += len;
          return <circle key={it.label} cx={size / 2} cy={size / 2} r={R} fill="none" stroke={it.color} strokeWidth={thickness}
            strokeDasharray={`${Math.max(0, len - 2)} ${C}`} strokeDashoffset={-off} transform={`rotate(-90 ${size / 2} ${size / 2})`} className="donut-seg" />;
        })}
        <text x="50%" y="48%" textAnchor="middle" className="donut-c">{center?.value}</text>
        <text x="50%" y="60%" textAnchor="middle" className="donut-l">{center?.label}</text>
      </svg>
      <div className="legend">
        {items.map(it => <div key={it.label}><i style={{ background: it.color }} />{it.label}<b>{format(it.value)}</b><span>{(it.value / total * 100).toFixed(0)}%</span></div>)}
      </div>
    </div>
  );
}

export function Gauge({ value, label, color = 'var(--green)', size = 150 }) {
  const R = size / 2 - 12, C = Math.PI * R;
  return (
    <svg width={size} height={size / 2 + 22} className="gauge">
      <path d={`M12,${size / 2} A${R},${R} 0 0 1 ${size - 12},${size / 2}`} fill="none" stroke="var(--track)" strokeWidth="12" strokeLinecap="round" />
      <path d={`M12,${size / 2} A${R},${R} 0 0 1 ${size - 12},${size / 2}`} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={`${(Math.min(100, value) / 100) * C} ${C}`} className="gauge-arc" />
      <text x="50%" y={size / 2 - 4} textAnchor="middle" className="gauge-v">{value.toFixed(1)}%</text>
      <text x="50%" y={size / 2 + 16} textAnchor="middle" className="donut-l">{label}</text>
    </svg>
  );
}

// GitHub-style contribution grid, cells animate in column by column
export function ContributionGrid({ weeks, onSelect, selected, palette = 'green' }) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [tip, setTip] = useState(null);
  return (
    <div className="contrib" data-palette={palette}>
      <div className="contrib-months">
        {weeks.map((w, i) => <span key={i}>{w[0] && (i === 0 || w[0].month !== weeks[i - 1][0]?.month) ? months[w[0].month] : ''}</span>)}
      </div>
      <div className="contrib-body">
        <div className="contrib-days"><span /> <span>Mon</span><span /><span>Wed</span><span /><span>Fri</span><span /></div>
        <div className="contrib-grid">
          {weeks.map((w, i) => (
            <div key={i} className="contrib-col">
              {(i === 0 ? Array(7 - w.length).fill(null).concat(w) : w).map((c, j) => c ? (
                <div key={j} className={`cell l${c.level}${selected === c.date ? ' sel' : ''}`} style={{ animationDelay: `${i * 14 + j * 6}ms` }}
                  onClick={() => onSelect?.(c)} onMouseEnter={e => setTip({ c, x: e.target.offsetLeft, y: e.target.offsetTop })} onMouseLeave={() => setTip(null)} />
              ) : <div key={j} className="cell empty-cell" />)}
            </div>
          ))}
          {tip && <div className="cell-tip" style={{ left: tip.x, top: tip.y - 34 }}><b>{tip.c.value} requests</b> on {tip.c.date}</div>}
        </div>
      </div>
      <div className="contrib-legend">Less {[0, 1, 2, 3, 4].map(l => <div key={l} className={`cell l${l}`} />)} More</div>
    </div>
  );
}

export function Punchcard({ matrix }) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const max = Math.max(1, ...matrix.flat());
  return (
    <div className="punch">
      {matrix.map((row, d) => (
        <div key={d} className="punch-row"><span>{days[d]}</span>
          {row.map((v, h) => <div key={h} className="punch-cell" title={`${days[d]} ${h}:00 - ${v} calls`}>
            <i style={{ transform: `scale(${v ? 0.2 + (v / max) * 0.8 : 0})`, opacity: 0.35 + (v / max) * 0.65 }} />
          </div>)}
        </div>
      ))}
      <div className="punch-row axis-row"><span />{Array.from({ length: 24 }, (_, h) => <div key={h} className="punch-cell">{h % 3 === 0 ? h : ''}</div>)}</div>
    </div>
  );
}
