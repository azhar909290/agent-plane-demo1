// Deterministic synthetic data so the UI looks alive without a backend.
function rng(seed = 42) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

const AGENTS = [
  ['Format-Agent', 'A basic agent that cleans up markdown text.'],
  ['Ping-Agent', 'A lightweight test agent that confirms CI/CD workflow build success.'],
  ['Test-Orchestrator', 'Analyzes source files and automatically drafts comprehensive unit test suites covering happy paths, edge cases, and interactions using mocks and stubs. Optimizes test structure, naming, and setup to improve reliability and maintainability across the codebase.'],
  ['Context-Architect', 'An agent that helps plan and execute multi-file changes by identifying relevant context and dependencies.'],
  ['Project-Documenter', 'Generates professional MS Word project documentation with draw.io architecture diagrams and embedded PNG images. Automatically discovers any project\'s technology stack, architecture, and code structure. Produces Markdown, draw.io diagrams, PNG exports, and .docx output.'],
  ['Agile-Builder', 'Your SDLC planning assistant for user stories and acceptance criteria.'],
  ['Code-Reviewer', 'An SDLC development assistant that reviews code for quality and vulnerabilities.'],
  ['QA-Architect', 'Analyzes code logic complexity and builds comprehensive test plans.'],
  ['API-Documenter', 'Extracts endpoints from raw source code and writes API documentation.'],
  ['UX-Wordsmith', 'Reviews UI code to improve the copywriting of buttons, alerts, and placeholders.'],
  ['Code-Smell-Scanner', 'Scans code for hardcoded secrets, TODOs, and magic numbers.'],
  ['Codebase-Testcase-Agent', 'Generates detailed, codebase-specific test cases by analyzing provided source code, existing tests, and requirements, focusing on edge cases, coverage gaps, and clear test structure.'],
  ['Syntax-Check-Agent', 'Identifies and explains syntax errors in code snippets, suggesting precise corrections while preserving the original intent. Supports multiple languages and highlights exact error locations for quick fixes.'],
  ['Logic-Review-Agent', 'Analyzes code to identify the logical flaws, edge-case bugs, and inconsistent behavior before execution or testing.'],
  ['Api-Response-Tracker', 'Tracks, audits and summarizes API responses used in code.'],
  ['System-Discovery-Agent', 'Identifies and describes the major systems and subsystems present in a codebase based on code structure, naming, and dependencies. Helps developers quickly understand architectural building blocks and how they relate to each other.'],
  ['Code-Refactor-Agent', 'Automates code refactoring to reduce complexity, remove duplication, and improve readability while preserving behavior. Produces clear, modern, and maintainable code with concise explanations of key changes.'],
  ['Error-Diagnosis-Agent', 'Analyzes stack traces and error logs to identify likely root causes and propose practical fixes, including code changes and configuration adjustments. Helps developers quickly triage failures and plan next debugging steps.'],
  ['PR-Review-Agent', 'Reviews pull request diffs for logic bugs, anti-patterns, and security vulnerabilities, providing clear, actionable feedback. Focuses on risk, code quality, and maintainability while staying tightly scoped to the changes in the diff.'],
  ['Security-Auditor', 'Reviews code diffs and pull requests specifically for OWASP Top 10 issues, insecure dependencies, and secret leaks, providing precise, actionable remediation guidance. Focuses strictly on security concerns without general code review or style feedback.'],
  ['Production-Issue-Analyzer', 'Analyzes code and surrounding context to identify likely production issues, then produces a clear, prioritized risk and issue report with actionable recommendations.'],
  ['Prod-Error-Diagnostics-Agent', 'Analyzes production error logs and traces to identify likely root causes and propose concrete bug fixes. Helps turn noisy runtime failures into clear, prioritized debugging actions with suggested code-level changes.'],
  ['Architecture-Design-Agent', 'Designs coherent database schemas, API contracts, and high-level system architectures starting from functional specifications, ensuring alignment between data model, services, and integration points.'],
  ['Release-Docs-Agent', 'Automatically generates and maintains up-to-date release notes, technical changelogs, and API/developer documentation by scanning merged commits, pull requests, and closed issues across deployment and maintenance stages.'],
];
const TELEMETRY_AGENTS = [
  ['code-reviewer', 'Reviews pull requests for quality, bugs and style'],
  ['test-orchestrator', 'Generates unit and integration tests from source'],
  ['security-auditor', 'Scans code for OWASP and secrets issues'],
  ['project documentor', 'Explains legacy code and builds documentation'],
  ['ux-wordsmith', 'Rewrites slow SQL and suggests indexes'],
  ['doc-writer', 'Creates README, ADRs and API docs'],
  ['api-designer', 'Designs REST/OpenAPI contracts'],
  ['refactor-pro', 'Suggests safe refactors with diffs'],
  ['incident-triage', 'Summarises logs and proposes root cause'],
  ['migration-assistant', 'Migrates frameworks and language versions'],
];
const USERS = ['ani.k', 'gopi.k', 'kamalesh.s', 'gunaseelan.s', 'nalini.p', 'anshuman.s', 'jeyaprakash.k', 'priya.r', 'rahul.s',
  'disha.g', 'chirag.s', 'kriti.v', 'manoj.d', 'yash.g', 'navya.b', 'sahil.p', 'ravi.t', 'anish.g', 'deepak.r', 'ranjith.m',
  'shefali.r', 'vishnu.s', 'arun.m', 'beaulah.m', 'chandru.m'];
const MODELS = [
  { model: 'gpt-4o', w: 0.34, lat: 2200, inP: 2.5, outP: 10 },
  { model: 'gpt-4o-mini', w: 0.26, lat: 900, inP: 0.15, outP: 0.6 },
  { model: 'gpt-4.1', w: 0.18, lat: 2600, inP: 2, outP: 8 },
  { model: 'claude-sonnet', w: 0.14, lat: 2400, inP: 3, outP: 15 },
  { model: 'o3-mini', w: 0.08, lat: 4200, inP: 1.1, outP: 4.4 },
];
const ERRORS = ['RateLimitError 429', 'Timeout after 30s', 'ContentFilter triggered', 'Context length exceeded', 'Upstream 503'];

const iso = d => d.toISOString().slice(0, 10);

export function buildMock() {
  const r = rng(7);
  const pick = arr => arr[Math.floor(r() * arr.length)];
  const pickModel = () => { let x = r(), a = 0; for (const m of MODELS) { a += m.w; if (x <= a) return m; } return MODELS[0]; };
  const now = new Date();

  const telemetryAgents = TELEMETRY_AGENTS.map(([name, desc], i) => {
    const popularity = 1.4 - i * 0.11;
    const daily = {};
    let total = 0;
    for (let d = 364; d >= 0; d--) {
      const day = new Date(now); day.setDate(day.getDate() - d);
      const dow = day.getDay();
      const growth = 0.25 + (364 - d) / 364;
      const weekend = dow === 0 || dow === 6 ? 0.2 : 1;
      const v = r() < 0.12 ? 0 : Math.round(r() * 9 * popularity * growth * weekend);
      if (v > 0) { daily[iso(day)] = v; total += v; }
    }
    const users = {};
    const n = 4 + Math.floor(r() * 14 * popularity);
    for (let u = 0; u < n; u++) {
      const name = pick(USERS);
      users[name] = {
        request_count: (users[name]?.request_count || 0) + 1 + Math.floor(r() * 60 * popularity),
        first_used: new Date(now - (200 + r() * 160) * 864e5).toISOString(),
        last_used: new Date(now - r() * 6 * 864e5).toISOString(),
      };
    }
    return {
      agent_id: `${name}-${1000 + i}`, agent_name: name, description: desc, total_requests: total,
      total_users: Object.keys(users).length,
      last_called: new Date(now - r() * 36e5 * 30).toISOString(),
      daily_stats: daily, user_counts: { total_users: Object.keys(users).length, users },
    };
  });

  const agents = AGENTS.map(([name, description]) => ({
    agent_id: name.toLowerCase(), agent_name: name, description, version: '1.0.0',
    plugin_calls: 0, tokens_est: 0, cost_usd: 0, usage_status: 'No usage',
    total_requests: 0, total_users: 0, last_called: null, daily_stats: {},
    user_counts: { total_users: 0, users: {} },
  }));

  // telemetry for last 30 days
  const events = [];
  for (let i = 0; i < 2600; i++) {
    const a = telemetryAgents[Math.min(telemetryAgents.length - 1, Math.floor(Math.pow(r(), 1.6) * telemetryAgents.length))];
    const m = pickModel();
    const ts = new Date(now - Math.pow(r(), 1.2) * 30 * 864e5);
    const hour = ts.getHours();
    if ((hour < 8 || hour > 20) && r() < 0.7) ts.setHours(9 + Math.floor(r() * 9));
    const degraded = a.agent_name === 'incident-triage' && (now - ts) < 3 * 864e5;
    const success = r() > (degraded ? 0.16 : 0.025);
    const pt = 400 + Math.floor(r() * 5200), ct = 120 + Math.floor(r() * 1800);
    const latency = Math.round(m.lat * (0.5 + r() * 1.3) * (degraded ? 1.8 : 1) + (r() < 0.04 ? 6000 : 0));
    events.push({
      id: `evt-${i}`, timestamp: ts.toISOString(), agent_id: a.agent_id, agent_name: a.agent_name,
      username: pick(USERS), model: m.model, latency_ms: latency, prompt_tokens: pt, completion_tokens: ct,
      cost_usd: +((pt * m.inP + ct * m.outP) / 1e6).toFixed(5), success,
      error: success ? null : pick(ERRORS), tool_calls: Math.floor(r() * 5), feedback: r() < 0.3 ? (r() < 0.85 ? 1 : -1) : 0,
    });
  }
  events.sort((x, y) => y.timestamp.localeCompare(x.timestamp));

  const prompts = [
    ['analyze-code', 'You are a senior engineer. Analyze the given code for correctness, complexity and maintainability.\nReturn findings grouped by severity.'],
    ['write-unit-tests', 'Generate pytest/jest unit tests covering edge cases, happy path and failure modes.'],
    ['explain-legacy', 'Explain the following legacy module step by step and draw a mermaid sequence diagram.'],
    ['security-review', 'Review for OWASP Top 10 issues, hardcoded secrets and insecure dependencies.'],
    ['sql-tuning', 'Given the query and execution plan, propose index and rewrite options with expected gain.'],
    ['release-notes', 'Summarise commits into customer-facing release notes grouped by feature/fix.'],
    ['api-contract', 'Design an OpenAPI 3.1 contract with examples, error model and pagination.'],
    ['incident-summary', 'Summarise logs into timeline, impact, probable root cause and next actions.'],
  ].map(([type, content]) => ({ type, content }));

  return { agents, events, prompts };
}
