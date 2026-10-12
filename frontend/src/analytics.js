// Pure functions that turn raw agents + telemetry events into dashboard views.
export const MINUTES_SAVED_PER_REQUEST = 6;   // assumption - tune for your org
export const BLENDED_HOURLY_RATE_USD = 25;     // assumption - tune for your org

const iso = d => d.toISOString().slice(0, 10);
export const pct = (arr, p) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};
export const fmt = n => {
  if (n == null || isNaN(n)) return '-';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'k';
  return Math.round(n).toLocaleString();
};
export const money = n => '$' + (n >= 1000 ? fmt(n) : (n || 0).toFixed(2));
export const ms = n => (n >= 1000 ? (n / 1000).toFixed(2) + 's' : Math.round(n) + 'ms');
export const timeAgo = t => {
  const m = Math.floor((Date.now() - new Date(t)) / 60000);
  if (m < 1) return 'just now'; if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60); if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
};

export function dailyTotals(agents) {
  const out = {};
  agents.forEach(a => Object.entries(a.daily_stats || {}).forEach(([d, c]) => (out[d] = (out[d] || 0) + c)));
  return out;
}

export function series(daily, days) {
  const res = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = iso(d); res.push({ date: k, value: daily[k] || 0 });
  }
  return res;
}

export function heatmapWeeks(daily) {
  const end = new Date(); const start = new Date(end); start.setDate(start.getDate() - 364 - start.getDay());
  const weeks = []; let wk = [];
  const max = Math.max(1, ...Object.values(daily));
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const k = iso(d); const v = daily[k] || 0;
    const level = v === 0 ? 0 : Math.min(4, Math.ceil((v / max) * 4));
    wk.push({ date: k, value: v, level, month: d.getMonth(), dow: d.getDay() });
    if (d.getDay() === 6) { weeks.push(wk); wk = []; }
  }
  if (wk.length) weeks.push(wk);
  return weeks;
}

export function streaks(daily) {
  let cur = 0, best = 0, run = 0;
  const s = series(daily, 365);
  s.forEach(x => { run = x.value > 0 ? run + 1 : 0; best = Math.max(best, run); });
  for (let i = s.length - 1; i >= 0 && s[i].value > 0; i--) cur++;
  const busiest = s.reduce((m, x) => (x.value > m.value ? x : m), { value: 0 });
  return { current: cur, best, busiest, activeDays: s.filter(x => x.value).length };
}

export function userTable(agents) {
  const u = {};
  agents.forEach(a => Object.entries(a.user_counts?.users || {}).forEach(([name, d]) => {
    u[name] ??= { username: name, total: 0, agents: {}, last: null, first: null };
    u[name].total += d.request_count || 0;
    u[name].agents[a.agent_name] = (u[name].agents[a.agent_name] || 0) + (d.request_count || 0);
    if (d.last_used && (!u[name].last || d.last_used > u[name].last)) u[name].last = d.last_used;
    if (d.first_used && (!u[name].first || d.first_used < u[name].first)) u[name].first = d.first_used;
  }));
  return Object.values(u).map(x => ({
    ...x, agentsUsed: Object.keys(x.agents).length,
    favourite: Object.entries(x.agents).sort((a, b) => b[1] - a[1])[0]?.[0] || '-',
    persona: x.total > 150 ? 'Power user' : x.total > 50 ? 'Regular' : 'Explorer',
  })).sort((a, b) => b.total - a.total);
}

export function telemetry(events) {
  const ok = events.filter(e => e.success);
  const lat = events.map(e => e.latency_ms || 0);
  const tokens = events.reduce((s, e) => s + (e.prompt_tokens || 0) + (e.completion_tokens || 0), 0);
  const cost = events.reduce((s, e) => s + (e.cost_usd || 0), 0);
  const fb = events.filter(e => e.feedback);
  const byModel = {}, byDay = {}, punch = Array.from({ length: 7 }, () => Array(24).fill(0)), errors = {};
  events.forEach(e => {
    const m = (byModel[e.model || 'unknown'] ??= { model: e.model || 'unknown', calls: 0, cost: 0, tokens: 0, lat: [] });
    m.calls++; m.cost += e.cost_usd || 0; m.tokens += (e.prompt_tokens || 0) + (e.completion_tokens || 0); m.lat.push(e.latency_ms || 0);
    const t = new Date(e.timestamp); const d = iso(t);
    const day = (byDay[d] ??= { date: d, lat: [], calls: 0, fail: 0, cost: 0, tokens: 0 });
    day.lat.push(e.latency_ms || 0); day.calls++; if (!e.success) day.fail++; day.cost += e.cost_usd || 0;
    day.tokens += (e.prompt_tokens || 0) + (e.completion_tokens || 0);
    punch[t.getDay()][t.getHours()]++;
    if (!e.success) errors[e.error || 'Unknown'] = (errors[e.error || 'Unknown'] || 0) + 1;
  });
  const days = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)).map(d => ({
    date: d.date, calls: d.calls, p50: pct(d.lat, 50), p95: pct(d.lat, 95), errorRate: d.fail / d.calls * 100, cost: d.cost, tokens: d.tokens,
  }));
  return {
    calls: events.length, successRate: events.length ? ok.length / events.length * 100 : 100,
    p50: pct(lat, 50), p95: pct(lat, 95), p99: pct(lat, 99), tokens, cost,
    csat: fb.length ? fb.filter(e => e.feedback > 0).length / fb.length * 100 : null,
    models: Object.values(byModel).map(m => ({ ...m, p95: pct(m.lat, 95) })).sort((a, b) => b.calls - a.calls),
    days, punch, errors: Object.entries(errors).sort((a, b) => b[1] - a[1]),
  };
}

export function agentHealth(agent, events) {
  const ev = events.filter(e => e.agent_id === agent.agent_id || e.agent_name === agent.agent_name);
  const recent = ev.filter(e => Date.now() - new Date(e.timestamp) < 3 * 864e5);
  const sr = recent.length ? recent.filter(e => e.success).length / recent.length * 100 : (ev.length ? ev.filter(e => e.success).length / ev.length * 100 : 100);
  const p95 = pct(ev.map(e => e.latency_ms), 95);
  let score = 100 - Math.max(0, 98 - sr) * 3 - Math.max(0, (p95 - 8000) / 300);
  score = Math.max(0, Math.min(100, Math.round(score)));
  const status = score >= 85 ? 'healthy' : score >= 65 ? 'warning' : 'critical';
  const spark = series(agent.daily_stats || {}, 21).map(x => x.value);
  const last7 = spark.slice(-7).reduce((a, b) => a + b, 0), prev7 = spark.slice(-14, -7).reduce((a, b) => a + b, 0);
  return {
    calls: ev.length, successRate: sr, p95, cost: ev.reduce((s, e) => s + (e.cost_usd || 0), 0),
    tokens: ev.reduce((s, e) => s + (e.prompt_tokens || 0) + (e.completion_tokens || 0), 0),
    score, status, spark, trend: prev7 ? (last7 - prev7) / prev7 * 100 : 0, events: ev,
  };
}

export function insights(agents, events) {
  const out = [];
  const enriched = agents.map(a => ({ a, h: agentHealth(a, events) }));
  enriched.filter(x => x.h.status !== 'healthy' && x.h.calls).forEach(({ a, h }) =>
    out.push({ kind: 'risk', title: `${a.agent_name} health dropped to ${h.score}`, body: `Success ${h.successRate.toFixed(1)}% in last 72h, p95 latency ${ms(h.p95)}. Check model quota and prompt size.` }));
  const rising = enriched.filter(x => x.h.trend > 25).sort((x, y) => y.h.trend - x.h.trend)[0];
  if (rising) out.push({ kind: 'growth', title: `${rising.a.agent_name} is trending +${Math.round(rising.h.trend)}% WoW`, body: 'Consider promoting it in the marketplace and pre-scaling capacity.' });
  const t = telemetry(events);
  const exp = t.models[0];
  if (exp && t.models.length > 1) {
    const cheap = [...t.models].sort((a, b) => a.cost / a.calls - b.cost / b.calls)[0];
    if (cheap.model !== exp.model) out.push({ kind: 'cost', title: `Route simple calls from ${exp.model} to ${cheap.model}`, body: `Shifting 30% of ${exp.model} traffic could save ~${money(exp.cost * 0.3 * (1 - (cheap.cost / cheap.calls) / (exp.cost / exp.calls)))} for this period.` });
  }
  const idle = agents.filter(a => !a.last_called || Date.now() - new Date(a.last_called) > 14 * 864e5);
  if (idle.length) out.push({ kind: 'idle', title: `${idle.length} agent(s) idle for 14+ days`, body: idle.map(a => a.agent_name).slice(0, 4).join(', ') + ' - candidates for retirement or re-launch.' });
  if (t.errors[0]) out.push({ kind: 'risk', title: `Top failure: ${t.errors[0][0]}`, body: `${t.errors[0][1]} occurrences. Add retry/backoff or fallback model.` });
  return out;
}
