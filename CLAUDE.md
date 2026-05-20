# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CNF Best Practice Report Generator** — a Node.js web application that parses Red Hat Best Practices Test Suite for Kubernetes (certsuite) output and produces an interactive dashboard with downloadable PPTX and XLSX reports. The user is a telco engineer on OpenShift Container Platform (OCP) analyzing partner CNF workload compliance.

## Commands

```bash
npm install              # Install dependencies
npm start                # Start server on port 3000 (or PORT env)
STORAGE_BACKEND=sqlite npm start  # Use SQLite instead of JSON file storage
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
  → Store in memory session (30-min TTL)
  → Return dashboard JSON (includes environment data + flat results array)

GET /api/export/pptx/:sessionId → pptx-generator.js → .pptx buffer
GET /api/export/xlsx/:sessionId → xlsx-generator.js → .xlsx buffer
GET /api/export/csv/:sessionId  → csv-generator.js  → .csv buffer

POST /api/compare (multipart: claim_a, log_a, claim_b, log_b)
  → Parse both through same pipeline
  → comparator.js → match tests by ID, classify changes
  → Return comparison JSON (deltas, per-suite diffs)

POST /api/reports         → Save current session as named report
GET  /api/reports         → List all saved reports (summary only)
GET  /api/reports/:id     → Load saved report (injects into session for exports)
DELETE /api/reports/:id   → Delete a saved report
```

### Report Storage

Persistent storage backend selected via `STORAGE_BACKEND` env var:
- `json` (default): Individual JSON files in `server/reports/` with `_index.json` manifest
- `sqlite`: Single `server/reports.db` file using `better-sqlite3` (WAL mode)

Both implement the same interface: `save()`, `list()`, `get()`, `delete()`. Loading a saved report injects it into the in-memory sessions Map so export routes work without modification.

### Key Modules

| Module | Purpose |
|--------|---------|
| `server/parsers/claim-parser.js` | Parse claim.json: normalize error→failed, extract NonCompliantObjectsOut, extract environment (cluster/hardware/pods/helm) |
| `server/parsers/catalog-mapper.js` | Enrich results with catalog descriptions, remediation, priority 0-4; accepts optional priority overrides map |
| `server/parsers/skip-analyzer.js` | Classify skips: built-in rules → skip reason text analysis |
| `server/parsers/log-validator.js` | Stream-based log scanning: ERROR count, probe pod missing, panics, completion |
| `server/generators/pptx-generator.js` | Red Hat branded slide deck using pptxgenjs (includes environment slide) |
| `server/generators/xlsx-generator.js` | Failed case summary + Environment Summary worksheet using exceljs |
| `server/generators/csv-generator.js` | Failed case CSV with environment header for Google Sheets (no dependencies) |
| `server/data/catalog.json` | Pre-fetched certsuite catalog (102 test entries) |
| `server/data/skip-rules.json` | Built-in valid skip reason patterns (14 rules) |
| `server/storage/index.js` | Storage backend factory (json or sqlite via env var) |
| `server/storage/json-store.js` | JSON file storage: `server/reports/{id}.json` + `_index.json` |
| `server/storage/sqlite-store.js` | SQLite storage: `server/reports.db` with better-sqlite3 |
| `server/routes/reports.js` | CRUD API for saving/loading/deleting reports |
| `server/parsers/comparator.js` | Compare two parsed claim datasets: match by test ID, classify changes |
| `server/routes/compare.js` | POST /api/compare endpoint for two-file comparison |
| `server/routes/export-csv.js` | GET /api/export/csv/:sessionId endpoint |

### Frontend Files

| File | Purpose |
|------|---------|
| `public/index.html` | SPA shell: upload (single/compare), dashboard, comparison, history views |
| `public/js/app.js` | Four-view navigation (upload/dashboard/comparison/history), drag-and-drop, upload, tab switching |
| `public/js/dashboard.js` | Render header, log warnings, summary cards, category tables, test rows, Environment tab (includes P0/P1 security summary) |
| `public/js/filters.js` | Category dropdown, scenario dropdown, status checkboxes (AND logic) |
| `public/js/export.js` | Trigger PPTX/XLSX/CSV download + save report button wiring |
| `public/js/history.js` | Report history list, save/load/delete, modal and toast UI |
| `public/js/comparison.js` | Compare mode: upload toggle, comparison view rendering, delta badges |

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

### Comparison Change Classification

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
