"""
Telemetry add-on for the Agent Metrics Flask backend.

Register in app.py (2 lines, right after `CORS(app)`):
    from telemetry_api import telemetry_bp
    app.register_blueprint(telemetry_bp)

Events are stored append-only in telemetry/telemetry.jsonl (outside the
watched `data` folder, so the watchdog reloader is not triggered on every call).
"""
import json
import os
import threading
import uuid
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request

telemetry_bp = Blueprint("telemetry", __name__)

TELEMETRY_DIR = "telemetry"
TELEMETRY_FILE = os.path.join(TELEMETRY_DIR, "telemetry.jsonl")
_lock = threading.Lock()

# USD per 1M tokens (input, output). Edit to match your contracted rates.
PRICE_TABLE = {
    "gpt-4o": (2.50, 10.00),
    "gpt-4o-mini": (0.15, 0.60),
    "gpt-4.1": (2.00, 8.00),
    "gpt-4.1-mini": (0.40, 1.60),
    "o3-mini": (1.10, 4.40),
    "claude-sonnet": (3.00, 15.00),
    "default": (1.00, 4.00),
}


def _now():
    return datetime.now(timezone.utc).isoformat()


def _cost(model, pt, ct):
    inp, out = PRICE_TABLE.get(model, PRICE_TABLE["default"])
    return round((pt * inp + ct * out) / 1_000_000, 6)


def _normalise(e):
    pt = int(e.get("prompt_tokens", 0) or 0)
    ct = int(e.get("completion_tokens", 0) or 0)
    model = e.get("model", "unknown")
    return {
        "id": e.get("id") or f"evt-{uuid.uuid4().hex[:12]}",
        "timestamp": e.get("timestamp") or _now(),
        "agent_id": e.get("agent_id", ""),
        "agent_name": e.get("agent_name") or e.get("agent_id", "unknown"),
        "username": e.get("username", "anonymous"),
        "model": model,
        "latency_ms": float(e.get("latency_ms", 0) or 0),
        "prompt_tokens": pt,
        "completion_tokens": ct,
        "cost_usd": float(e["cost_usd"]) if e.get("cost_usd") is not None else _cost(model, pt, ct),
        "success": bool(e.get("success", True)),
        "error": e.get("error"),
        "tool_calls": int(e.get("tool_calls", 0) or 0),
        "feedback": int(e.get("feedback", 0) or 0),   # 1 = thumbs up, -1 = thumbs down
        "trace_id": e.get("trace_id"),
        "session_id": e.get("session_id"),
        "metadata": e.get("metadata", {}),
    }


def read_events(since_days=None, agent=None):
    if not os.path.exists(TELEMETRY_FILE):
        return []
    cutoff = None
    if since_days:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=int(since_days))).isoformat()
    out = []
    with open(TELEMETRY_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                e = json.loads(line)
            except json.JSONDecodeError:
                continue
            if cutoff and e.get("timestamp", "") < cutoff:
                continue
            if agent and agent not in (e.get("agent_id"), e.get("agent_name")):
                continue
            out.append(e)
    out.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return out


def write_events(events):
    os.makedirs(TELEMETRY_DIR, exist_ok=True)
    with _lock, open(TELEMETRY_FILE, "a", encoding="utf-8") as f:
        for e in events:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")


@telemetry_bp.route("/telemetry", methods=["POST"])
def ingest():
    """Accepts one event object or a list of events."""
    body = request.get_json(silent=True)
    if body is None:
        return jsonify({"error": "No JSON body"}), 400
    items = body if isinstance(body, list) else [body]
    events = [_normalise(e) for e in items if isinstance(e, dict)]
    write_events(events)
    return jsonify({"success": True, "ingested": len(events), "ids": [e["id"] for e in events]}), 201


@telemetry_bp.route("/api/telemetry/events", methods=["GET"])
def events():
    limit = int(request.args.get("limit", 500))
    ev = read_events(request.args.get("since_days", 30), request.args.get("agent"))
    return jsonify(ev[:limit])


def _pct(vals, p):
    if not vals:
        return 0
    s = sorted(vals)
    return s[min(len(s) - 1, int(p / 100 * len(s)))]


@telemetry_bp.route("/api/telemetry/summary", methods=["GET"])
def summary():
    ev = read_events(request.args.get("since_days", 30), request.args.get("agent"))
    lat = [e["latency_ms"] for e in ev]
    by_model, by_agent = {}, {}
    for e in ev:
        for key, bucket in (("model", by_model), ("agent_name", by_agent)):
            b = bucket.setdefault(e[key], {"calls": 0, "errors": 0, "cost_usd": 0.0, "tokens": 0})
            b["calls"] += 1
            b["errors"] += 0 if e["success"] else 1
            b["cost_usd"] = round(b["cost_usd"] + e["cost_usd"], 6)
            b["tokens"] += e["prompt_tokens"] + e["completion_tokens"]
    return jsonify({
        "calls": len(ev),
        "success_rate": round(sum(e["success"] for e in ev) / len(ev) * 100, 2) if ev else 100,
        "latency": {"p50": _pct(lat, 50), "p95": _pct(lat, 95), "p99": _pct(lat, 99)},
        "tokens": sum(e["prompt_tokens"] + e["completion_tokens"] for e in ev),
        "cost_usd": round(sum(e["cost_usd"] for e in ev), 4),
        "by_model": by_model,
        "by_agent": by_agent,
        "timestamp": _now(),
    })


@telemetry_bp.route("/api/telemetry/pricing", methods=["GET"])
def pricing():
    return jsonify({k: {"input_per_1m": v[0], "output_per_1m": v[1]} for k, v in PRICE_TABLE.items()})
