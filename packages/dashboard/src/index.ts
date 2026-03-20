import http, { IncomingMessage, ServerResponse } from "http";
import { exec } from "child_process";
import path from "path";
import {
  AgentResult,
  configure,
  getBuiltInAgentById,
  getBuiltInAgents,
  listRunRecords,
  listSavedAgentDefinitions,
  loadAgent,
} from "@agentos/agents";

export interface DashboardOptions {
  projectDir?: string;
  port?: number;
  open?: boolean;
}

export interface DashboardServerHandle {
  port: number;
  projectDir: string;
  url: string;
  close(): Promise<void>;
}

function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function json(res: ServerResponse, payload: unknown, statusCode = 200): void {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function html(res: ServerResponse, markup: string): void {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(markup);
}

function openBrowser(url: string): void {
  const command =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;

  exec(command);
}

function dashboardPage(projectName: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>AgentOS Dashboard</title>
    <style>
      :root {
        --bg: #f5efe4;
        --panel: rgba(255, 250, 241, 0.92);
        --ink: #1f2933;
        --muted: #5f6c76;
        --accent: #a53f2b;
        --accent-soft: #f0c2a8;
        --line: rgba(31, 41, 51, 0.12);
        --shadow: 0 20px 60px rgba(65, 49, 32, 0.12);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Segoe UI", "Aptos", sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(165, 63, 43, 0.16), transparent 30%),
          radial-gradient(circle at bottom right, rgba(42, 102, 79, 0.15), transparent 25%),
          linear-gradient(135deg, #f7f0e2, #ebe2d0);
        min-height: 100vh;
      }
      .shell {
        max-width: 1440px;
        margin: 0 auto;
        padding: 32px 20px 40px;
      }
      .hero {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: end;
        margin-bottom: 20px;
      }
      .hero h1 {
        margin: 0;
        font-size: 40px;
        line-height: 1;
        letter-spacing: -0.04em;
      }
      .hero p {
        margin: 8px 0 0;
        color: var(--muted);
        max-width: 720px;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.55);
        color: var(--muted);
      }
      .grid {
        display: grid;
        grid-template-columns: 1.2fr 1fr;
        gap: 20px;
      }
      .panel {
        background: var(--panel);
        border: 1px solid rgba(255,255,255,0.6);
        border-radius: 24px;
        box-shadow: var(--shadow);
        backdrop-filter: blur(14px);
        overflow: hidden;
      }
      .panel-header {
        padding: 18px 20px 14px;
        border-bottom: 1px solid var(--line);
      }
      .panel-header h2 {
        margin: 0;
        font-size: 18px;
      }
      .panel-header p {
        margin: 6px 0 0;
        color: var(--muted);
        font-size: 14px;
      }
      .panel-body {
        padding: 18px 20px 20px;
      }
      .filters, .composer {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-bottom: 16px;
      }
      .composer {
        grid-template-columns: 1fr auto;
      }
      label {
        display: block;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--muted);
        margin-bottom: 6px;
      }
      select, textarea, button {
        width: 100%;
        border-radius: 14px;
        border: 1px solid var(--line);
        padding: 12px 14px;
        font: inherit;
      }
      textarea {
        min-height: 92px;
        resize: vertical;
        background: rgba(255,255,255,0.8);
      }
      select {
        background: rgba(255,255,255,0.8);
      }
      button {
        background: var(--ink);
        color: white;
        border: none;
        cursor: pointer;
        transition: transform .15s ease, opacity .15s ease;
      }
      button:hover { transform: translateY(-1px); }
      button.secondary {
        background: rgba(31, 41, 51, 0.08);
        color: var(--ink);
        border: 1px solid var(--line);
      }
      .list {
        display: grid;
        gap: 10px;
        max-height: 620px;
        overflow: auto;
        padding-right: 4px;
      }
      .card {
        border: 1px solid var(--line);
        border-radius: 18px;
        padding: 14px;
        background: rgba(255,255,255,0.7);
      }
      .card strong { display: block; font-size: 16px; margin-bottom: 4px; }
      .card p { margin: 0 0 10px; color: var(--muted); font-size: 14px; }
      .meta, .tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 10px;
      }
      .pill {
        border-radius: 999px;
        background: rgba(165, 63, 43, 0.1);
        color: var(--accent);
        padding: 6px 10px;
        font-size: 12px;
      }
      .meta .pill {
        background: rgba(31, 41, 51, 0.08);
        color: var(--muted);
      }
      .actions {
        display: flex;
        gap: 8px;
      }
      .run-detail pre {
        white-space: pre-wrap;
        word-break: break-word;
        padding: 12px;
        border-radius: 16px;
        background: rgba(31, 41, 51, 0.05);
        border: 1px solid var(--line);
      }
      .empty {
        border: 1px dashed var(--line);
        padding: 18px;
        border-radius: 18px;
        color: var(--muted);
        background: rgba(255,255,255,0.4);
      }
      @media (max-width: 980px) {
        .grid { grid-template-columns: 1fr; }
        .filters, .composer { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="hero">
        <div>
          <div class="badge">Project: ${projectName}</div>
          <h1>AgentOS Dashboard</h1>
          <p>Catalog your built-in and custom agents, inspect local run history, and trigger runs without leaving the project.</p>
        </div>
      </div>
      <div class="grid">
        <section class="panel">
          <div class="panel-header">
            <h2>Agent Catalog</h2>
            <p>Prebuilt agents and saved custom agents from <code>.agentos/agents</code>.</p>
          </div>
          <div class="panel-body">
            <div class="filters">
              <div>
                <label for="agent-kind">Kind</label>
                <select id="agent-kind">
                  <option value="">All</option>
                  <option value="built_in">Built in</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label for="agent-category">Category</label>
                <select id="agent-category">
                  <option value="">All</option>
                </select>
              </div>
            </div>
            <div class="composer">
              <div>
                <label for="run-input">Run selected agent</label>
                <textarea id="run-input" placeholder="Describe what the agent should do..."></textarea>
              </div>
              <div style="display:flex;align-items:end;">
                <button id="run-agent">Run Agent</button>
              </div>
            </div>
            <div id="catalog" class="list"></div>
          </div>
        </section>
        <section class="panel">
          <div class="panel-header">
            <h2>Run History</h2>
            <p>Runs from <code>.agentos/runs</code>, with filters and deep inspection.</p>
          </div>
          <div class="panel-body">
            <div class="filters">
              <div>
                <label for="run-status">Status</label>
                <select id="run-status">
                  <option value="">All</option>
                  <option value="success">Success</option>
                  <option value="error">Error</option>
                </select>
              </div>
              <div>
                <label for="run-days">Date range</label>
                <select id="run-days">
                  <option value="0">All time</option>
                  <option value="1">Last 24 hours</option>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                </select>
              </div>
            </div>
            <div id="runs" class="list"></div>
            <div class="run-detail" style="margin-top:16px;">
              <div class="panel-header" style="padding:0 0 12px;border-bottom:none;">
                <h2 style="font-size:16px;">Run Detail</h2>
              </div>
              <div id="run-detail" class="empty">Select a run to inspect its output, tools, and metadata.</div>
            </div>
          </div>
        </section>
      </div>
    </div>
    <script>
      const state = {
        agents: [],
        runs: [],
        selectedAgent: null,
      };

      const els = {
        catalog: document.getElementById("catalog"),
        runs: document.getElementById("runs"),
        runDetail: document.getElementById("run-detail"),
        agentKind: document.getElementById("agent-kind"),
        agentCategory: document.getElementById("agent-category"),
        runStatus: document.getElementById("run-status"),
        runDays: document.getElementById("run-days"),
        runInput: document.getElementById("run-input"),
        runAgent: document.getElementById("run-agent"),
      };

      async function fetchJson(url, options) {
        const res = await fetch(url, options);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Request failed");
        }
        return res.json();
      }

      function escapeHtml(value) {
        return value
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;");
      }

      function uniqueCategories() {
        return [...new Set(state.agents.map((agent) => agent.category))].sort();
      }

      function renderCategoryFilter() {
        const categories = uniqueCategories();
        els.agentCategory.innerHTML = '<option value="">All</option>' + categories.map((category) => \`<option value="\${category}">\${category}</option>\`).join("");
      }

      function filteredAgents() {
        return state.agents.filter((agent) => {
          if (els.agentKind.value && agent.kind !== els.agentKind.value) return false;
          if (els.agentCategory.value && agent.category !== els.agentCategory.value) return false;
          return true;
        });
      }

      function filteredRuns() {
        const days = Number(els.runDays.value);
        const cutoff = days > 0 ? Date.now() - (days * 24 * 60 * 60 * 1000) : 0;

        return state.runs.filter((run) => {
          if (els.runStatus.value === "success" && !run.success) return false;
          if (els.runStatus.value === "error" && run.success) return false;
          if (cutoff && new Date(run.timestamp).getTime() < cutoff) return false;
          return true;
        });
      }

      function renderCatalog() {
        const agents = filteredAgents();
        if (agents.length === 0) {
          els.catalog.innerHTML = '<div class="empty">No agents match the current filters.</div>';
          return;
        }

        els.catalog.innerHTML = agents.map((agent) => \`
          <article class="card">
            <strong>\${agent.name}</strong>
            <p>\${agent.summary}</p>
            <div class="meta">
              <span class="pill">\${agent.kind === "built_in" ? "Built in" : "Custom"}</span>
              <span class="pill">\${agent.category}</span>
              <span class="pill">\${agent.allowedTools.length} tools</span>
            </div>
            <div class="tags">\${agent.tags.map((tag) => \`<span class="pill">\${tag}</span>\`).join("")}</div>
            <div class="actions">
              <button class="secondary" data-select-agent="\${agent.id}">Select</button>
            </div>
          </article>
        \`).join("");
      }

      function renderRuns() {
        const runs = filteredRuns();
        if (runs.length === 0) {
          els.runs.innerHTML = '<div class="empty">No runs yet. Run an agent from the catalog to populate this view.</div>';
          return;
        }

        els.runs.innerHTML = runs.map((run) => \`
          <article class="card">
            <strong>\${run.agent.name}</strong>
            <p>\${new Date(run.timestamp).toLocaleString()} · \${run.success ? "success" : "error"} · \${run.authMode}</p>
            <div class="meta">
              <span class="pill">\${run.cost.toFixed(4)} USD</span>
              <span class="pill">\${run.tokensUsed.total} tokens</span>
              <span class="pill">\${run.duration} ms</span>
            </div>
            <div class="actions">
              <button class="secondary" data-open-run="\${run.id}">Inspect</button>
            </div>
          </article>
        \`).join("");
      }

      function renderRunDetail(run) {
        if (!run) {
          els.runDetail.className = "empty";
          els.runDetail.textContent = "Select a run to inspect its output, tools, and metadata.";
          return;
        }

        els.runDetail.className = "";
        els.runDetail.innerHTML = \`
          <div class="meta">
            <span class="pill">\${run.agent.name}</span>
            <span class="pill">\${run.success ? "success" : "error"}</span>
            <span class="pill">\${run.authMode}</span>
            <span class="pill">\${run.loops} loops</span>
          </div>
          <p><strong>Input</strong></p>
          <pre>\${escapeHtml(run.input)}</pre>
          <p><strong>Output</strong></p>
          <pre>\${escapeHtml(run.output || run.error || "")}</pre>
          <p><strong>Tool Calls</strong></p>
          <pre>\${escapeHtml(JSON.stringify(run.toolCalls, null, 2))}</pre>
        \`;
      }

      async function refresh() {
        const data = await fetchJson("/api/agents");
        state.agents = [...data.builtIn, ...data.custom];
        renderCategoryFilter();
        renderCatalog();

        const runs = await fetchJson("/api/runs");
        state.runs = runs.items;
        renderRuns();
      }

      async function runSelectedAgent() {
        if (!state.selectedAgent) {
          alert("Select an agent first.");
          return;
        }
        if (!els.runInput.value.trim()) {
          alert("Provide input for the agent.");
          return;
        }

        els.runAgent.disabled = true;
        els.runAgent.textContent = "Running...";
        try {
          const result = await fetchJson("/api/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: state.selectedAgent.id,
              kind: state.selectedAgent.kind,
              input: els.runInput.value,
            }),
          });

          els.runInput.value = "";
          await refresh();
          renderRunDetail(result.result);
        } catch (error) {
          alert(error.message);
        } finally {
          els.runAgent.disabled = false;
          els.runAgent.textContent = "Run Agent";
        }
      }

      document.addEventListener("click", async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        const selectId = target.getAttribute("data-select-agent");
        if (selectId) {
          state.selectedAgent = state.agents.find((agent) => agent.id === selectId || agent.slug === selectId);
          document.querySelectorAll("[data-select-agent]").forEach((node) => node.textContent = "Select");
          target.textContent = "Selected";
          return;
        }

        const runId = target.getAttribute("data-open-run");
        if (runId) {
          const run = await fetchJson("/api/runs/" + runId);
          renderRunDetail(run.item);
        }
      });

      [els.agentKind, els.agentCategory].forEach((el) => el.addEventListener("change", renderCatalog));
      [els.runStatus, els.runDays].forEach((el) => el.addEventListener("change", renderRuns));
      els.runAgent.addEventListener("click", runSelectedAgent);

      refresh().catch((error) => {
        els.catalog.innerHTML = '<div class="empty">' + error.message + '</div>';
        els.runs.innerHTML = '<div class="empty">' + error.message + '</div>';
      });
    </script>
  </body>
</html>`;
}

async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
  options: Required<DashboardOptions>
): Promise<boolean> {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");

  if (req.method === "GET" && url.pathname === "/api/agents") {
    const builtIn = getBuiltInAgents();
    const custom = await listSavedAgentDefinitions(path.join(options.projectDir, ".agentos"));
    json(res, { builtIn, custom });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/runs") {
    const items = await listRunRecords(path.join(options.projectDir, ".agentos"));
    json(res, { items });
    return true;
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/runs/")) {
    const runId = url.pathname.split("/").pop() ?? "";
    const items = await listRunRecords(path.join(options.projectDir, ".agentos"));
    const item = items.find((run) => run.id === runId);
    if (!item) {
      json(res, { error: "Run not found" }, 404);
      return true;
    }
    json(res, { item });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/run") {
    const rawBody = await readRequestBody(req);
    const body = JSON.parse(rawBody) as {
      id: string;
      kind: "built_in" | "custom";
      input: string;
    };

    if (!body.input?.trim()) {
      json(res, { error: "Input is required" }, 400);
      return true;
    }

    let result: AgentResult;
    if (body.kind === "built_in") {
      const agent = getBuiltInAgentById(body.id);
      if (!agent) {
        json(res, { error: "Built-in agent not found" }, 404);
        return true;
      }
      result = await agent.run(body.input);
    } else {
      const customAgent = await loadAgent(body.id, path.join(options.projectDir, ".agentos"));
      if (!customAgent) {
        json(res, { error: "Custom agent not found" }, 404);
        return true;
      }
      result = await customAgent.run(body.input);
    }

    const runs = await listRunRecords(path.join(options.projectDir, ".agentos"));
    json(res, { result: runs[0] ?? result });
    return true;
  }

  return false;
}

export async function startDashboardServer(
  options: DashboardOptions = {}
): Promise<DashboardServerHandle> {
  const projectDir = options.projectDir ?? process.cwd();
  const port = options.port ?? 3210;
  const storageDir = path.join(projectDir, ".agentos");

  configure({
    storageDir,
    projectName: path.basename(projectDir),
    persistRuns: true,
  });

  const server = http.createServer(async (req, res) => {
    try {
      const handled = await handleApiRequest(req, res, {
        projectDir,
        port,
        open: options.open ?? false,
      });

      if (handled) {
        return;
      }

      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
        html(res, dashboardPage(path.basename(projectDir)));
        return;
      }

      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
    } catch (error) {
      json(
        res,
        { error: error instanceof Error ? error.message : String(error) },
        500
      );
    }
  });

  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));

  const url = `http://127.0.0.1:${port}`;
  if (options.open) {
    openBrowser(url);
  }

  return {
    port,
    projectDir,
    url,
    async close() {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
    },
  };
}
