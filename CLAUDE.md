# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CNF Best Practice Report Generator** — a Node.js web application that parses Red Hat Best Practices Test Suite for Kubernetes (certsuite) output and produces an interactive dashboard with downloadable PPTX, XLSX, and HTML reports. The user is a telco engineer on OpenShift Container Platform (OCP) analyzing partner CNF workload compliance.

## Commands

```bash
npm install              # Install dependencies
npm start                # Start server on port 3000 (or PORT env), uses SQLite by default
STORAGE_BACKEND=json npm start    # Use JSON file storage instead of SQLite
node scripts/fetch-catalog.js   # Refresh catalog data from upstream CATALOG.md
```

## Architecture

**Backend**: Express.js server (`server/index.js`) serving static frontend + REST API.

**Frontend**: Vanilla HTML/CSS/JS in `public/` — no build step. Dark theme with DM Sans font, gradient stat cards, accent colors (cyan/purple/pink).

### Request Flow

```
POST /api/upload (multipart: claim, log, priorityMapping)
  → claim-parser.js    → normalized test results + environment extraction
  → catalog-mapper.js  → enrich with catalog data + priority (0-4, with optional CSV/XLSX overrides)
  → skip-analyzer.js   → classify skipped tests (valid-skip / needs-review)
  → log-validator.js   → health warnings (stream-based for large files)
  → Store in memory session (no TTL — persists until server restart)
  → Return dashboard JSON (includes environment data + flat results array)

GET /api/export/pptx/:sessionId → pptx-generator.js → .pptx buffer
GET /api/export/xlsx/:sessionId → xlsx-generator.js (or comparison-xlsx-generator.js) → .xlsx buffer
GET /api/export/csv/:sessionId  → csv-generator.js  → .csv buffer
GET /api/export/html/:sessionId → html-generator.js (or comparison-html-generator.js) → self-contained .html file

POST /api/compare (multipart: claim_a, log_a, claim_b, log_b)
  → Parse both through same pipeline
  → comparator.js → match tests by ID, classify changes
  → Return comparison JSON (deltas, per-suite diffs)

POST /api/reports              → Save current session as named report
GET  /api/reports              → List all saved reports (summary only)
GET  /api/reports/:id          → Load saved report (injects into session for exports)
DELETE /api/reports/:id        → Delete a saved report
POST /api/reports/compare      → Compare two saved reports by ID (uses comparator.js)
```

### Report Storage

Persistent storage backend selected via `STORAGE_BACKEND` env var:
- `sqlite` (default): Single DB file using `better-sqlite3` (WAL mode). Path configurable via `REPORTS_DB_PATH` (default: `server/reports.db`)
- `json`: Individual JSON files. Directory configurable via `REPORTS_DIR` (default: `server/reports/`)

Both implement the same interface: `save()`, `list()`, `get()`, `delete()`. Loading a saved report injects it into the in-memory sessions Map so export routes work without modification.

### Key Modules

| Module | Purpose |
|--------|---------|
| `server/parsers/claim-parser.js` | Parse claim.json: normalize error→failed, extract NonCompliantObjectsOut, extract environment (cluster/hardware/pods/helm) |
| `server/parsers/catalog-mapper.js` | Enrich results with catalog descriptions, remediation, priority 0-4; accepts optional priority overrides map |
| `server/parsers/skip-analyzer.js` | Classify skips: built-in rules → skip reason text analysis |
| `server/parsers/log-validator.js` | Stream-based log scanning: probe pod/daemonset missing, panics, completion check (ERROR lines ignored — normal in certsuite) |
| `server/generators/pptx-generator.js` | Red Hat branded slide deck using pptxgenjs (includes environment slide, table-based failed-by-category) |
| `server/generators/xlsx-generator.js` | Failed Case Summary + Environment Summary + All Tests worksheets using exceljs |
| `server/generators/csv-generator.js` | Failed case CSV with environment header for Google Sheets (no dependencies) |
| `server/generators/html-generator.js` | Self-contained HTML dashboard export with dark/light theme toggle, inlined CSS/JS, filters, and back-to-top navigation. Also exports utility functions (`escapeHtml`, `formatSuiteName`, `loadCss`, `buildLightThemeCss`) for reuse by comparison generator |
| `server/generators/comparison-html-generator.js` | Self-contained HTML comparison report: delta summary, totals cards, per-suite comparison tables with inline filters and theme toggle |
| `server/generators/comparison-xlsx-generator.js` | Comparison XLSX with 3 worksheets: Comparison Summary, Changed Tests, All Tests Comparison. Color-coded status/change cells |
| `server/data/catalog.json` | Pre-fetched certsuite catalog (102 test entries) |
| `server/data/skip-rules.json` | Built-in valid skip reason patterns (14 rules) |
| `server/storage/index.js` | Storage backend factory (json or sqlite via env var) |
| `server/storage/json-store.js` | JSON file storage: `server/reports/{id}.json` + `_index.json` |
| `server/storage/sqlite-store.js` | SQLite storage: `server/reports.db` with better-sqlite3 |
| `server/routes/reports.js` | CRUD API for saving/loading/deleting reports + compare two saved reports |
| `server/parsers/comparator.js` | Compare two parsed claim datasets: match by test ID, classify changes |
| `server/routes/compare.js` | POST /api/compare endpoint for two-file comparison |
| `server/routes/export-csv.js` | GET /api/export/csv/:sessionId endpoint |
| `server/routes/export-html.js` | GET /api/export/html/:sessionId endpoint (delegates to comparison generator when `session.type === 'comparison'`) |
| `server/routes/export-xlsx.js` | GET /api/export/xlsx/:sessionId endpoint (delegates to comparison generator when `session.type === 'comparison'`) |

### Frontend Files

| File | Purpose |
|------|---------|
| `public/index.html` | SPA shell: upload (single/compare), dashboard, comparison, history views |
| `public/js/app.js` | Four-view navigation (upload/dashboard/comparison/history), drag-and-drop (scoped to `#upload-form`), upload, tab switching, back-to-top button |
| `public/js/dashboard.js` | Render header, log warnings, summary cards, category tables, test rows, Environment tab (includes P0/P1 security summary) |
| `public/js/filters.js` | Category dropdown, scenario dropdown, status checkboxes (AND logic) |
| `public/js/export.js` | Trigger PPTX/XLSX/CSV/HTML download (fetch+blob), comparison export buttons, save report button wiring |
| `public/js/history.js` | Report history list, save/load/delete, compare two saved reports, modal and toast UI |
| `public/js/comparison.js` | Compare mode: upload toggle, comparison view rendering, delta badges, export button init |

## Data Model

### Test Result States
- `passed`, `failed`, `skipped`, `error` (error normalized to failed)

### Priority Scale (XLSX + PPTX)
- **0**: Security-critical (root user, privilege escalation)
- **1**: Host access violations (host PID/path/network/IPC, reserved ports, network policy)
- **2**: Cluster role bindings, scheduling, tolerations, probes, SSH
- **3**: PreStop hooks, pod owner type
- **4**: One process per container, non-UBI base image

### Priority Mapping Override
Users can upload a CSV or XLSX file to override the built-in `PRIORITY_MAP` in `catalog-mapper.js`. Supports:
- **4-column CSV**: `test_id,category,description,priority` (priority in column 4)
- **2-column CSV**: `test_id,priority` (priority in column 2)
- **XLSX**: First worksheet, auto-detects `test_id` and `priority` columns by header name

If no file is uploaded, the built-in priority map applies. Overrides only affect tests present in the uploaded file; all other tests use defaults.

### Skip Classification
1. Built-in rules (`server/data/skip-rules.json`) matched by testIdPattern
2. Skip reason text analysis (IPv6, SNO, no operators, performance profile)
3. Fallback: `needs-review`

### Comparison

Two ways to compare reports:
1. **Live upload**: Upload two claim.json files via Compare Reports mode (`POST /api/compare`)
2. **From history**: Select two saved reports with checkboxes on the Report History screen (`POST /api/reports/compare`)

Both paths use `comparator.compare()` and render via the same `showComparisonView()` frontend.

Tests matched by `id` across two runs. State ranking: passed (2) > skipped (1) > failed (0).

- **improved**: state moved toward better (e.g., failed→passed)
- **regressed**: state moved toward worse (e.g., passed→failed)
- **unchanged**: same normalizedState in both runs
- **added**: test exists in new run only
- **removed**: test exists in baseline only

### Environment Data

Extracted from `claim.configurations` and `claim.nodes` by `extractEnvironment()` in claim-parser.js. All sub-sections are defensively parsed — missing or malformed data results in empty arrays/objects, never parse failures.

```
environment: {
  cluster: { operators[], storageClasses[], csiDrivers[], nodeCount }
  hardware: { sriovPolicies[], nodesHwInfo }
  pods: { testPods[], allPodsCount, testDeployments[], testStatefulSets[], podDisruptionBudgets[] }
  helmCharts: [{ name, namespace, chartName, chartVersion }]
  config: { targetNamespaces[], podsUnderTestLabels[] }
}
```

- **operators**: Parsed from `AllOperatorsSummary` strings (format: `"Status operator: name ver: version in ns: [namespace]"`)
- **sriovPolicies**: From `AllSriovNetworkNodePolicies` — includes NIC vendor/device ID from nicSelector
- **nodesHwInfo**: From `nodes.nodesHwInfo` — populated when certsuite collects hardware inventory (often empty)
- **testPods**: From `testPods` — includes container images, resource requests/limits, securityContext, tolerations
- **helmCharts**: From `testHelmChartReleases` — chart name/version from nested `chart.metadata`

Surfaced in: dashboard Environment tab, PPTX environment slide, XLSX "Environment Summary" worksheet, CSV header block.

### XLSX Worksheets
1. **Failed Case Summary** — Failed tests sorted by priority then category, with color-coded priority cells and priority legend
2. **Environment Summary** — Config, operators, SR-IOV, test pods, workloads, helm charts
3. **All Tests** — Every test case (passed/failed/skipped), sorted by category then priority, with color-coded Status and Priority cells

### PPTX Failed-by-Category Slides
Table-based layout with 3 columns (Test ID, Category, Priority), 10 rows per slide, sorted by category then priority. Uses same styling as Failed Test Case Details slides.

### HTML Export
Self-contained single `.html` file (~400KB) that mirrors the web dashboard. Opens offline from disk with no external dependencies (Google Fonts replaced with system font stack). Features:
- **Two tabs**: Test Results (summary cards, filters, category table, collapsible test suites) and Cluster Architecture (arch summary, environment sections)
- **Dark/light theme toggle**: Moon/sun button in nav bar, persisted to `localStorage`
- **Interactive filters**: Category dropdown, scenario dropdown, status checkboxes — all functional via inline JS
- **Back-to-top button**: Floating button appears after scrolling 400px
- **Embedded data**: `resultsBySuite` JSON embedded in inline script for dynamic filter updates

The generator (`html-generator.js`) ports all `dashboard.js` render functions to server-side string assembly, reads and inlines `public/css/styles.css`, and appends light theme CSS overrides via `[data-theme="light"]` selectors.

### Comparison Exports

Both HTML and XLSX exports are available for comparison sessions (both upload-compare and history-compare flows). The export routes detect `session.type === 'comparison'` and delegate to dedicated generators.

**Comparison XLSX** (`comparison-xlsx-generator.js`): Three worksheets:
1. **Comparison Summary** — Report A/B metadata, overall delta table (Passed/Failed/Skipped A→B + delta), change summary counts, per-suite breakdown
2. **Changed Tests** — Only non-unchanged tests, sorted by change type (regressed first). Columns: Test ID, Category, Report A/B Status, Change, Details. Color-coded cells.
3. **All Tests Comparison** — Every test with status, change, priority, description. Same color coding.

**Comparison HTML** (`comparison-html-generator.js`): Self-contained file mirroring the web comparison view. Includes comparison header, delta summary pills, totals cards, category/change filter dropdowns, collapsible per-suite tables, dark/light theme toggle. Reuses utility functions from `html-generator.js`.

Surfaced in: dashboard Environment tab, PPTX environment slide, XLSX "Environment Summary" worksheet, CSV header block, HTML export Environment tab.

### Log Validation
The log validator (`log-validator.js`) checks for:
- **Probe pod/daemonset failures** — probe pod not running, probe daemonset not spawning, failed to deploy probe
- **Crashes** — panic, fatal, segfault
- **Incomplete execution** — no completion marker in last 100 lines

ERROR lines are **not** counted or flagged — they are normal certsuite output and not indicative of problems.

### Cluster Architecture Security Summary
The Environment tab's "Security Test Results" section displays actual P0 and P1 certsuite test results (from `data.results` flat array) instead of manual pod-spec inspection. Test results are threaded through `renderEnvironment(env, results)` → `renderArchSummary(env, results)` and grouped by priority level with pass/fail/skip status for each test.

### Scenario Classification
From catalog: Telco Mandatory/Optional, Non-Telco, Far-Edge, Extended

## File Size Support

Files up to **1GB** — multer uses disk storage (not memory) and log validation uses stream-based readline.

## Upstream References

- Certsuite catalog: `https://raw.githubusercontent.com/redhat-best-practices-for-k8s/certsuite/main/CATALOG.md`
- CNF version extracted from claim filename (e.g., `claim-vDUCNF00.json` → `vDUCNF00`)

## GitHub

Repository: `mmorency2021` org. **Never add claude as collaborator.**
