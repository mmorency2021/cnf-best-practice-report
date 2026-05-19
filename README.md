# CNF Best Practice Report Generator

A web application for analyzing Red Hat Best Practices Test Suite for Kubernetes (certsuite) results. Upload certsuite output files and get an interactive dashboard with downloadable PPTX and XLSX reports.

## Features

- **Interactive Dashboard**: Filter results by category, scenario (Telco Mandatory/Optional), and status (passed/failed/skipped)
- **Skip Analysis**: Automatically classifies skipped tests as valid or needing review based on cluster context
- **Log Health Validation**: Detects excessive errors, missing probe pods, panics, and incomplete executions
- **Cluster Topology**: Visualize node architecture and download pod YAML definitions
- **PPTX Export**: Red Hat branded presentation with test summary, failed case analysis, and recommendations
- **XLSX Export**: Failed case summary sorted by priority (0-4) with impact and remediation details
- **Large File Support**: Handles claim.json and log files up to 1GB

## Quick Start

```bash
npm install
npm start
```

Open `http://localhost:3000` in your browser.

## Usage

1. **Upload claim.json** (required) — certsuite test results file
2. **Upload execution log** (optional) — validates test run health before reporting
3. **Upload cluster architecture** (optional) — YAML or JSON file with node/pod definitions
4. **Upload custom skip rules** (optional) — JSON file with project-specific valid skip reasons

The dashboard renders automatically after upload. Use the filters to focus on specific categories, scenarios, or statuses. Download PPTX or XLSX reports from the export bar.

## File Inputs

| File | Format | Purpose |
| --- | --- | --- |
| claim.json | JSON | Certsuite test results (required) |
| Execution log | .log/.txt | Validate test run health |
| Cluster architecture | YAML/JSON | Node topology + pod definitions |
| Custom skip rules | JSON | Additional valid skip reason patterns |

### Custom Skip Rules Format

```json
[
  {
    "testIdPattern": "operator-*",
    "reason": "No operators under test",
    "validWhen": "No operator workloads configured"
  }
]
```

## Reports

### PPTX (PowerPoint)

Generates a Red Hat branded slide deck with:
- Title and CNF introduction
- Cert Suite overview (10 test suites, scenario types)
- Test case summary with per-suite breakdown
- Version information (K8s, OCP, Certsuite, CNF)
- Summary of results (totals + per-suite table)
- Failed tests grouped by category
- Detailed failed test case table with priority
- Recommendations

### XLSX (Excel)

Generates a failed case summary spreadsheet with:
- Test ID, Category, Impact, Remediation, Priority, Partner Comments
- Sorted by priority (0 = highest, 4 = lowest)
- Color-coded priority cells
- Priority legend

## Priority Scale

| Priority | Description |
| --- | --- |
| 0 | Security-critical (root user, privilege escalation) |
| 1 | Host access violations (host PID/path/network/IPC, reserved ports) |
| 2 | Cluster role bindings, scheduling, tolerations, probes |
| 3 | PreStop hooks, pod owner type |
| 4 | One process per container, non-UBI base image |

## Updating the Catalog

The test catalog is pre-fetched from the certsuite repository. To refresh:

```bash
node scripts/fetch-catalog.js
```

## Tech Stack

- **Backend**: Node.js, Express, multer
- **Frontend**: Vanilla HTML/CSS/JS (no build step)
- **PPTX**: pptxgenjs
- **XLSX**: exceljs
- **YAML**: js-yaml

## License

MIT
