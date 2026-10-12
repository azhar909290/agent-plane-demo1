# Agent Command Center (v2 – React)

React rewrite of the Agent Metrics Dashboard + a telemetry layer for the Flask backend.

## 1. Backend (your existing Flask app)

Copy `backend/*` next to your `app.py`, then add **2 lines** in `app.py` right after `CORS(app)`:

```python
from telemetry_api import telemetry_bp
app.register_blueprint(telemetry_bp)
```

Run it (`-X utf8` fixes the cp1252 `UnicodeDecodeError`):

```powershell
python -X utf8 app.py          # or double-click start_backend.bat
python -X utf8 seed_telemetry.py   # optional: 30 days of demo telemetry from your agents.json
```

## 2. Frontend

```powershell
cd frontend
npm install
npm run dev        # http://localhost:5173  (proxies API calls to :5000)
npm run build      # production build in dist/
```

If the backend is not running, the UI automatically switches to **demo data** (badge bottom-left).

## Pages
| Page | What it shows |
|---|---|
| Live Pulse | GitHub-style rotating globe with request arcs, live counters, live request stream |
| Command Center | KPIs w/ deltas, volume + 7-day trend, AI insights, top agents/users, health ranking |
| Activity | GitHub contribution graph (per agent, 3 palettes, clickable days), streaks, weekday×hour punchcard, timeline |
| Telemetry | p50/p95/p99 latency, error rate, tokens, CSAT, model performance, trace explorer |
| AI FinOps | Spend, run-rate vs budget burn-down, cost by model/agent/user, what-if model routing savings |
| Agent Network | Animated Users → Agents → Models flow graph |
| Agents | Grid/table, health score, trend, drill-down drawer (contribution graph, latency, users) |
| Users | Personas, podium leaderboard, agent-mix bars |
| Prompts | Token estimate, variable detection, copy, create |

Extras: Ctrl+K command palette, dark/light theme, 60s auto-refresh.

## Sending telemetry from an agent
```python
from telemetry_client import track
with track("code-reviewer", username="ani.k", model="gpt-4o") as t:
    resp = client.chat.completions.create(...)
    t.tokens(resp.usage.prompt_tokens, resp.usage.completion_tokens)
```
or raw: `POST /telemetry` with `{agent_name, username, model, latency_ms, prompt_tokens, completion_tokens, success, error, feedback}`.
Cost is auto-calculated from `PRICE_TABLE` in `telemetry_api.py` if `cost_usd` is not sent — update it to your contracted rates.

## Assumptions to tune (`src/analytics.js`)
`MINUTES_SAVED_PER_REQUEST = 6`, `BLENDED_HOURLY_RATE_USD = 25` drive "hours saved", "value delivered" and ROI.
