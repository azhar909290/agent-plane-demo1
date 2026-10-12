import React, { useMemo, useState } from 'react';
import { FiDollarSign, FiPieChart, FiTrendingUp, FiUsers, FiCpu, FiSliders } from 'react-icons/fi';
import { Card, Kpi } from '../components/UI';
import { AreaChart, Donut, BarList } from '../components/Charts';
import { telemetry, money, fmt, MINUTES_SAVED_PER_REQUEST, BLENDED_HOURLY_RATE_USD } from '../analytics';

const COLORS = ['#7c5cff', '#2ee6a6', '#3fa9ff', '#ff7a59', '#ff5da2', '#ffc94d', '#29d3d3'];
const CURRENT_USAGE = 158;
const DEFAULT_MODEL_SPEND = [
  { model: 'gpt-4o', value: 153 },
  { model: 'gpt-4o-mini', value: 117 },
  { model: 'gpt-4.1', value: 81 },
  { model: 'claude-sonnet', value: 63 },
  { model: 'o3-mini', value: 36 },
];

function splitModelSpend(models, totalSpend) {
  const totalCost = models.reduce((sum, model) => sum + model.cost, 0);
  const source = totalCost ? models : DEFAULT_MODEL_SPEND;
  const sourceTotal = totalCost || DEFAULT_MODEL_SPEND.reduce((sum, model) => sum + model.value, 0);

  const splits = source.map(model => ({
    model: model.model,
    value: Math.floor(((model.cost ?? model.value) / sourceTotal) * totalSpend * 100) / 100,
  }));
  const remainder = Number((totalSpend - splits.reduce((sum, model) => sum + model.value, 0)).toFixed(2));
  splits[0].value = Number((splits[0].value + remainder).toFixed(2));
  return splits;
}

export default function FinOps({ data, openAgent }) {
  const { events } = data;
  const [budget, setBudget] = useState(500);
  const [shift, setShift] = useState(30);
  const t = useMemo(() => telemetry(events), [events]);
  const byAgent = useMemo(() => groupCost(events, 'agent_name'), [events]);
  const byUser = useMemo(() => groupCost(events, 'username'), [events]);

  const days = t.days.length || 1;
  const runRate = (t.cost / days) * 30;
  const cumulative = t.days.reduce((acc, d) => { acc.push({ date: d.date, spend: (acc.at(-1)?.spend || 0) + d.cost, budget: budget * (acc.length + 1) / 30 }); return acc; }, []);
  const costPerReq = t.calls ? t.cost / t.calls : 0;
  const valuePerReq = MINUTES_SAVED_PER_REQUEST / 60 * BLENDED_HOURLY_RATE_USD;
  const modelSpend = splitModelSpend(t.models, CURRENT_USAGE);
  const sorted = [...t.models].sort((a, b) => b.cost / b.calls - a.cost / a.calls);
  const exp = sorted[0], cheap = sorted.at(-1);
  const saving = exp && cheap && exp !== cheap ? exp.cost * (shift / 100) * (1 - (cheap.cost / cheap.calls) / (exp.cost / exp.calls)) : 0;

  return (
    <div className="page">
      <div className="page-h"><div><h1>AI FinOps</h1><p>Token economics per model, agent and user - with budget burn and what-if routing.</p></div></div>
      <div className="grid kpis">
        <Kpi label="Current metered usage" value={475} format={money} icon={<FiDollarSign />} />
        <Kpi label="Current usage" value={CURRENT_USAGE} format={money} icon={<FiTrendingUp />} color={runRate > budget ? 'var(--red)' : 'var(--green)'} sub={runRate > budget ? 'over budget' : 'within budget'} />
        <Kpi label="Cost / request" value={costPerReq * 1000} format={v => '$' + (v / 1000).toFixed(4)} icon={<FiCpu />} color="var(--purple)" />
        <Kpi label="Value / request (est.)" value={5.50} format={v => '$' + v.toFixed(2)} icon={<FiPieChart />} color="var(--orange)" sub={`${fmt(valuePerReq / (costPerReq || 1))}x return`} />
      </div>

      <div className="grid g-2-1">
        <Card title="Budget burn-down" icon={<FiTrendingUp />} action={<label className="slider">Monthly budget {money(budget)}<input type="range" min="50" max="3000" step="50" value={budget} onChange={e => setBudget(+e.target.value)} /></label>}>
          <AreaChart data={cumulative} keys={['spend', 'budget']} colors={['#ff7a59', '#2ee6a6']} format={money} height={250} />
        </Card>
        <Card title="Spend by model" icon={<FiPieChart />}>
          <Donut items={modelSpend.map((m, i) => ({ label: m.model, value: m.value, color: COLORS[i % COLORS.length] }))} format={money} center={{ value: money(CURRENT_USAGE), label: 'total' }} />
        </Card>
      </div>

      <div className="grid g-1-1-1">
        <Card title="Cost by agent" icon={<FiCpu />}><BarList format={money} items={byAgent.slice(0, 8)} onClick={it => openAgent(it.label)} /></Card>
        <Card title="Cost by user (chargeback)" icon={<FiUsers />}><BarList color="var(--green)" format={money} items={byUser.slice(0, 8)} /></Card>
        <Card title="What-if: smart model routing" icon={<FiSliders />} className="whatif">
          {exp && cheap && exp !== cheap ? <>
            <p>Route <b>{shift}%</b> of <span className="chip">{exp.model}</span> traffic to <span className="chip">{cheap.model}</span></p>
            <input type="range" min="0" max="100" value={shift} onChange={e => setShift(+e.target.value)} />
            <div className="big-num grad">{money(saving)}</div>
            <small className="muted">estimated saving for this period · ~{money(saving / days * 365)} / year</small>
          </> : <div className="empty">Need 2+ models in telemetry</div>}
        </Card>
      </div>
    </div>
  );
}

function groupCost(events, key) {
  const g = {};
  events.forEach(e => { g[e[key] || 'unknown'] = (g[e[key] || 'unknown'] || 0) + (e.cost_usd || 0); });
  return Object.entries(g).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}
