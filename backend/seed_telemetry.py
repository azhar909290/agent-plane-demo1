"""Generate ~30 days of realistic synthetic telemetry from your existing data/agents.json."""
import json, os, random
from datetime import datetime, timedelta, timezone
from telemetry_api import _normalise, write_events, TELEMETRY_FILE

random.seed(7)
MODELS = [("gpt-4o", .34, 2200), ("gpt-4o-mini", .26, 900), ("gpt-4.1", .18, 2600), ("claude-sonnet", .14, 2400), ("o3-mini", .08, 4200)]
ERRORS = ["RateLimitError 429", "Timeout after 30s", "ContentFilter triggered", "Context length exceeded", "Upstream 503"]

agents_path = os.path.join("data", "agents.json")
agents = json.load(open(agents_path, encoding="utf-8")) if os.path.exists(agents_path) else {}
pairs = []
for aid, a in agents.items():
    users = list((a.get("user_counts") or {}).get("users", {}).keys()) or ["anonymous"]
    pairs.append((aid, a.get("agent_name", aid), users, max(1, a.get("total_requests", 1))))
if not pairs:
    pairs = [(f"demo-agent-{i}", f"demo-agent-{i}", ["demo.user"], 10) for i in range(5)]

n = int(os.environ.get("N", 2500))
weights = [p[3] for p in pairs]
now = datetime.now(timezone.utc)
events = []
for _ in range(n):
    aid, name, users, _w = random.choices(pairs, weights)[0]
    model, _, base = random.choices(MODELS, [m[1] for m in MODELS])[0]
    ok = random.random() > 0.03
    events.append(_normalise({
        "timestamp": (now - timedelta(days=random.random() ** 1.2 * 30, hours=random.random() * 3)).isoformat(),
        "agent_id": aid, "agent_name": name, "username": random.choice(users), "model": model,
        "latency_ms": round(base * random.uniform(.5, 1.8) + (6000 if random.random() < .04 else 0)),
        "prompt_tokens": random.randint(400, 5600), "completion_tokens": random.randint(120, 1900),
        "success": ok, "error": None if ok else random.choice(ERRORS),
        "tool_calls": random.randint(0, 4), "feedback": random.choice([0, 0, 1, 1, 1, -1]),
    }))
if os.path.exists(TELEMETRY_FILE) and os.environ.get("APPEND") != "1":
    os.remove(TELEMETRY_FILE)
write_events(events)
print(f"Seeded {len(events)} telemetry events for {len(pairs)} agents -> {TELEMETRY_FILE}")
