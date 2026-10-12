"""
Drop-in helper for your agents / VS Code extension backend.

    from telemetry_client import track

    with track("code-reviewer", username="ani.k", model="gpt-4o") as t:
        resp = client.chat.completions.create(...)
        t.tokens(resp.usage.prompt_tokens, resp.usage.completion_tokens)
"""
import json
import time
import urllib.request

API = "http://localhost:5000"


class track:
    def __init__(self, agent_name, username="anonymous", model="unknown", agent_id=None, **metadata):
        self.e = {"agent_name": agent_name, "agent_id": agent_id or agent_name, "username": username,
                  "model": model, "metadata": metadata, "success": True}

    def tokens(self, prompt_tokens, completion_tokens):
        self.e["prompt_tokens"], self.e["completion_tokens"] = prompt_tokens, completion_tokens

    def feedback(self, value):  # 1 or -1
        self.e["feedback"] = value

    def __enter__(self):
        self.t0 = time.perf_counter()
        return self

    def __exit__(self, exc_type, exc, tb):
        self.e["latency_ms"] = round((time.perf_counter() - self.t0) * 1000, 1)
        if exc:
            self.e["success"], self.e["error"] = False, f"{exc_type.__name__}: {exc}"[:200]
        try:
            req = urllib.request.Request(f"{API}/telemetry", data=json.dumps(self.e).encode("utf-8"),
                                         headers={"Content-Type": "application/json"}, method="POST")
            urllib.request.urlopen(req, timeout=2)
        except Exception:
            pass  # telemetry must never break the agent
        return False
