#!/usr/bin/env python3
"""Generate howardchan.me/dashboards static pages from repo inventory.
Safe-by-design: emits only repo metadata (name, role, LOC, langs, commits,
activity, git status). No secrets, no env values, no security-vuln details.
Run:  python3 build_dashboards.py
"""
import json, html, datetime, pathlib, re

HERE = pathlib.Path(__file__).parent
INV = json.load(open(HERE / "_inventory.json"))
REPOS = INV["repos"]
GEN = INV.get("generated", "")

# --- classification -------------------------------------------------------
MINE_RE = re.compile(r"imjusthoward|Premier-Trophy|ElevateOS-Limited|Kiwanis-Voice|AryaaSk", re.I)

# Howard's project taxonomy: map repo -> (category, one-line)
NOTE = {
    "ElevateOS": ("Venture", "Tutoring-ops SaaS (HK inc.); first pilots Jun 2026"),
    "CrystalCentury": ("Business", "Premier Trophy e-commerce + SEO (since 2008)"),
    "pt-backend": ("Business", "Premier Trophy backend / AI CRM tooling"),
    "super-investor-mirror": ("Quant", "Prior Moves — 13F forecasting + no-look-ahead backtest"),
    "quant": ("Quant", "Quant research data-lake (w/ AryaaSk)"),
    "quant-pipeline": ("Quant", "Live market collector pipeline"),
    "prediction-market-edge": ("Quant", "Prediction-market edge scanner"),
    "nobill": ("Venture", "Local-first subscription tracker (MIT OSS)"),
    "kasuhara": ("Venture", "Tatemori — JP customer-harassment incident classifier"),
    "pt-engine": ("Infra", "Priormoves engine tooling monorepo"),
    "howard-me": ("Site", "howardchan.me personal site (this site)"),
    "ThinkCollegeLevel": ("Site", "thinkcollegelevel.com (CF Pages)"),
    "japan-tcg-arb-copilot": ("Side", "JP TCG arbitrage copilot"),
    "tcg-arb-scanner": ("Side", "TCG arbitrage scanner"),
    "Pulse-Manila-26": ("Kiwanis", "Pulse — Kiwanis Manila 2026 event platform"),
    "Katalyst": ("Kiwanis", "Katalyst — Kiwanis youth-service infra"),
    "kiwanis-coordination": ("Kiwanis", "Kiwanis Voice Club coordination"),
    "lead-engine": ("Infra", "Lead-gen engine"),
    "fi-scraper": ("Infra", "Founder Institute scraper"),
    "claude-flywheel": ("Infra", "Claude self-improvement flywheel"),
    "HireVue-Preparation": ("Side", "Interview prep tooling"),
    "gbrain": ("Vendor", "Forked knowledge/code-graph engine (garrytan)"),
    "codegraph": ("Vendor", "Code-graph reference (colbymchenry)"),
    "12-factor-agents": ("Vendor", "Agent design reference (humanlayer)"),
    "AionUi": ("Vendor", "Desktop agent UI (iOfficeAI)"),
    "bifrost": ("Vendor", "LLM gateway (maximhq)"),
    "cocoindex": ("Vendor", "Incremental indexer (cocoindex-io)"),
    "langfuse": ("Vendor", "LLM observability (langfuse)"),
    "open-seo": ("Vendor", "SEO toolkit (every-app)"),
    "optillm": ("Vendor", "Inference proxy"),
    "paperclip": ("Vendor", "Agent-as-org (paperclipai)"),
    "ralph-orchestrator": ("Vendor", "Agent orchestrator (mikeyobrien)"),
    "OpenOutreach": ("Vendor", "Outreach automation (eracle)"),
}

def owner(remote):
    if not remote or remote == "none":
        return "local"
    m = re.search(r"[/:]([^/]+)/[^/]+?(?:\.git)?$", remote)
    return m.group(1) if m else remote

def days_ago(n):
    n = int(n)
    if n == 0: return "today"
    if n == 1: return "1d ago"
    if n < 30: return f"{n}d ago"
    if n < 365: return f"{n//30}mo ago"
    return f"{n//365}y ago"

def status_tags(r):
    t = []
    if r["dirty"]: t.append(("dirty", f"{r['dirty']} uncommitted"))
    if r["ahead"]: t.append(("ahead", f"{r['ahead']} unpushed"))
    if r["untracked"] > 50: t.append(("warn", f"{r['untracked']} untracked"))
    if r["todo"] > 100: t.append(("todo", f"{r['todo']} TODO"))
    if r["tracked_files"] == 0: t.append(("warn", "empty"))
    if not t: t.append(("clean", "clean"))
    return t

rows = []
for r in REPOS:
    cat, note = NOTE.get(r["repo"], ("Other", ""))
    mine = cat != "Vendor"
    rows.append({**r, "cat": cat, "note": note, "mine": mine, "owner": owner(r["remote"])})

mine = [r for r in rows if r["mine"]]
vendor = [r for r in rows if not r["mine"]]
mine.sort(key=lambda r: (r["age_days"], -r["loc"]))
vendor.sort(key=lambda r: -r["loc"])

tot_loc = sum(r["loc"] for r in mine)
tot_commits = sum(r["commits"] for r in mine)
tot_files = sum(r["tracked_files"] for r in mine)
active7 = sum(1 for r in mine if r["age_days"] <= 7)

CSS = """
:root{--bg:#0b0d10;--panel:#14181d;--line:#222a31;--ink:#e6edf3;--dim:#8b97a3;--acc:#5ec8f8;--good:#3fb950;--warn:#d29922;--bad:#f85149;--mono:'SF Mono',ui-monospace,Menlo,monospace}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
a{color:var(--acc);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:1180px;margin:0 auto;padding:32px 22px 80px}
.top{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:10px;border-bottom:1px solid var(--line);padding-bottom:16px;margin-bottom:24px}
h1{font-size:22px;margin:0;letter-spacing:-.02em}
.crumb{font-size:13px;color:var(--dim)}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin:0 0 28px}
.stat{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px 16px}
.stat b{display:block;font:600 24px/1.1 var(--mono);letter-spacing:-.03em}
.stat span{font-size:12px;color:var(--dim);text-transform:uppercase;letter-spacing:.04em}
.bar{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 16px}
.bar button{background:var(--panel);border:1px solid var(--line);color:var(--dim);padding:6px 13px;border-radius:20px;font-size:13px;cursor:pointer}
.bar button.on{color:var(--ink);border-color:var(--acc)}
h2{font-size:14px;text-transform:uppercase;letter-spacing:.06em;color:var(--dim);margin:30px 0 12px}
table{width:100%;border-collapse:collapse;font-size:13.5px}
th{text-align:left;color:var(--dim);font-weight:500;font-size:12px;text-transform:uppercase;letter-spacing:.04em;padding:8px 10px;border-bottom:1px solid var(--line)}
td{padding:10px;border-bottom:1px solid var(--line);vertical-align:top}
tr:hover td{background:#11161b}
.repo{font-weight:600}
.cat{font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.03em}
.note{color:var(--dim);font-size:12.5px}
.num{font-family:var(--mono);text-align:right;color:#c9d5e0}
.langs{font-family:var(--mono);font-size:11.5px;color:var(--dim)}
.tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;margin:1px 3px 1px 0;font-family:var(--mono)}
.t-clean{background:#13261a;color:var(--good)}.t-dirty{background:#2a2410;color:var(--warn)}
.t-ahead{background:#0d2230;color:var(--acc)}.t-warn{background:#2a1414;color:var(--bad)}.t-todo{background:#1c1c22;color:var(--dim)}
.foot{margin-top:40px;color:var(--dim);font-size:12px;border-top:1px solid var(--line);padding-top:16px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin:8px 0 30px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:20px;display:block}
.card:hover{border-color:var(--acc);text-decoration:none}
.card h3{margin:0 0 6px;font-size:17px;color:var(--ink)}
.card p{margin:0;color:var(--dim);font-size:13px}
.card .k{font:600 13px var(--mono);color:var(--acc);margin-top:10px}
"""

def head(title, crumb):
    return f"""<!doctype html><html lang=en><head><meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1">
<meta name=robots content="noindex,nofollow">
<title>{html.escape(title)}</title><style>{CSS}</style></head><body><div class=wrap>
<div class=top><h1>{html.escape(title)}</h1><div class=crumb>{crumb}</div></div>"""

FOOT = lambda src: f"""<div class=foot>Generated {html.escape(GEN)} from local git scan · {html.escape(src)} · metadata only — no secrets, no API keys, no env values. <a href="/dashboards/">← hub</a></div></div></body></html>"""

# ---- repos.html ----------------------------------------------------------
def repo_row(r):
    tags = "".join(f'<span class="tag t-{c}">{html.escape(l)}</span>' for c, l in status_tags(r))
    rem = "" if r["remote"] == "none" else f'<a href="{html.escape(r["remote"].replace("git@github.com:","https://github.com/").replace(".git",""))}" target=_blank rel=noopener>{html.escape(r["owner"])}</a>'
    if not rem: rem = '<span class=note>local-only</span>'
    return f"""<tr data-cat="{r['cat']}">
<td><div class=repo>{html.escape(r['repo'])}</div><div class=cat>{r['cat']}</div></td>
<td class=note>{html.escape(r['note'])}<br><span class=langs>{html.escape(r['top_langs'])}</span></td>
<td class=num>{r['loc']:,}</td>
<td class=num>{r['commits']:,}</td>
<td class=num>{r['tracked_files']:,}</td>
<td>{days_ago(r['age_days'])}</td>
<td>{tags}</td>
<td>{rem}</td></tr>"""

cats = sorted({r["cat"] for r in mine})
filterbar = '<div class=bar><button class=on onclick="flt(this,\'all\')">All mine</button>' + \
    "".join(f'<button onclick="flt(this,\'{c}\')">{c}</button>' for c in cats) + \
    '<button onclick="flt(this,\'Vendor\')">Vendored / reference</button></div>'

repos_html = head("Repositories", '<a href="/dashboards/">dashboards</a> / repos') + f"""
<div class=stats>
<div class=stat><b>{len(mine)}</b><span>my repos</span></div>
<div class=stat><b>{tot_loc:,}</b><span>lines of code</span></div>
<div class=stat><b>{tot_commits:,}</b><span>commits</span></div>
<div class=stat><b>{tot_files:,}</b><span>tracked files</span></div>
<div class=stat><b>{active7}</b><span>active &le;7d</span></div>
<div class=stat><b>{len(vendor)}</b><span>vendored clones</span></div>
</div>
{filterbar}
<table id=tbl><thead><tr><th>Repo</th><th>What · top languages</th><th>LOC</th><th>Commits</th><th>Files</th><th>Last commit</th><th>Status</th><th>Remote</th></tr></thead><tbody>
{"".join(repo_row(r) for r in mine)}
{"".join(repo_row(r) for r in vendor)}
</tbody></table>
<script>
function flt(btn,c){{document.querySelectorAll('.bar button').forEach(b=>b.classList.remove('on'));btn.classList.add('on');
document.querySelectorAll('#tbl tbody tr').forEach(tr=>{{const cat=tr.dataset.cat;
let show = c==='all' ? cat!=='Vendor' : cat===c; tr.style.display=show?'':'none';}});}}
flt(document.querySelector('.bar button'),'all');
</script>
""" + FOOT("inventory.json · 33 repos")
open(HERE / "repos.html", "w").write(repos_html)

# ---- hub index.html ------------------------------------------------------
plate = [r for r in mine if r["cat"] in ("Venture", "Business", "Quant", "Kiwanis") and r["age_days"] <= 14]
plate.sort(key=lambda r: r["age_days"])
plate_rows = "".join(
    f'<tr><td class=repo>{html.escape(r["repo"])}</td><td class=cat>{r["cat"]}</td>'
    f'<td class=note>{html.escape(r["note"])}</td><td>{days_ago(r["age_days"])}</td>'
    f'<td class=num>{r["commits"]}</td></tr>' for r in plate)

hub = head("Howard · Dashboards", "private · unlisted") + f"""
<p class=note style="margin-top:-10px;max-width:680px">Operating snapshot — everything currently on my plate, plus build telemetry. Metadata only; no secrets or API keys exposed.</p>
<div class=cards>
<a class=card href="/dashboards/repos.html"><h3>Repositories →</h3><p>All {len(mine)} active repos: LOC, languages, commits, git status, last activity. Filterable by category.</p><div class=k>{tot_loc:,} LOC · {tot_commits:,} commits</div></a>
<a class=card href="/dashboards/claude-usage.html"><h3>Claude usage →</h3><p>Build telemetry: token burn by model, tool calls, MCP servers, per-project activity from agent transcripts.</p><div class=k>opus · sonnet · haiku</div></a>
</div>
<h2>On my plate — active &le;14d</h2>
<table><thead><tr><th>Project</th><th>Track</th><th>What</th><th>Last commit</th><th>Commits</th></tr></thead><tbody>
{plate_rows}
</tbody></table>
""" + FOOT("repo inventory + transcripts")
open(HERE / "index.html", "w").write(hub)

print("WROTE repos.html, index.html ;", len(mine), "mine /", len(vendor), "vendor")
