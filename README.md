# CNF Best Practice Report Generator

A web application for analyzing [Red Hat Best Practices Test Suite for Kubernetes](https://github.com/redhat-best-practices-for-k8s/certsuite) (certsuite) results. Upload certsuite output files and get an interactive dashboard with downloadable PPTX, XLSX, and CSV reports.

## What is the CNF Best Practice Test Suite?

The **Red Hat Best Practices Test Suite for Kubernetes** (commonly called "certsuite") is the official test framework used to validate that Cloud-Native Network Functions (CNFs) follow Kubernetes and OpenShift best practices. It is a critical part of the partner certification workflow for workloads running on Red Hat OpenShift Container Platform (OCP).

### Why it matters

Telco partners deploying CNF workloads (vDU, vCU-CP, vCU-UP, 5G Core, etc.) on OpenShift must demonstrate that their applications conform to a defined set of best practices covering:

- **Access Control** — Pods should not run as root, should drop all Linux capabilities, must not use host namespaces (PID, IPC, Network), and should avoid privilege escalation. These tests verify that the workload follows the principle of least privilege.
- **Lifecycle** — Workloads must define liveness, readiness, and startup probes, use proper image pull policies, support graceful shutdown via preStop hooks, and be managed by higher-level controllers (Deployments, StatefulSets) rather than bare pods.
- **Networking** — Containers should declare all ports, avoid using reserved OCP ports, support dual-stack services where applicable, and define NetworkPolicies to restrict traffic. SR-IOV and Multus configurations are also validated.
- **Observability** — Containers must log to stdout/stderr, define PodDisruptionBudgets for high availability, set termination grace periods, and expose CRD status subresources for operator-managed workloads.
- **Platform Alteration** — The workload must not modify the underlying platform: no tainted kernels, no custom kernel boot parameters, SELinux must be enforcing, and base images should be UBI (Universal Base Image).
- **Affiliated Certification** — Container images, Helm charts, and operators should be certified through the Red Hat partner certification pipeline.
- **Operator** — OLM-managed operators must install successfully, use semantic versioning, define proper CRD OpenAPI schemas, and not require elevated privileges.
- **Performance** — CPU-pinned workloads must avoid exec probes (which break CPU isolation), real-time applications need proper scheduling policies, and resource limits must be correctly set for exclusive vs. shared CPU pools.
- **Manageability** — Container ports should follow IANA naming conventions and images should use versioned tags rather than `:latest`.

### Certsuite workflow

1. The partner deploys their CNF workload on an OpenShift cluster
2. The certsuite runs ~120 tests across these categories against the target namespaces
3. The suite produces a `claim.json` file containing all test results, cluster configuration, and environment data
4. **This tool** ingests that `claim.json` and turns it into an actionable report with priority-ranked failures, remediation guidance, and exportable documents for stakeholder review

### Scenario classification

Tests are classified into scenarios that determine which are mandatory for certification:

| Scenario | Description |
|----------|-------------|
| **Telco Mandatory** | Must pass for telco partner certification |
| **Telco Optional** | Recommended but not blocking |
| **Non-Telco** | Applicable to general Kubernetes workloads |
| **Far-Edge** | Specific to far-edge deployment topologies (single-node OpenShift) |
| **Extended** | Advanced tests for specialized configurations |

## Features

- **Dark-themed Interactive Dashboard** — Filter results by category, scenario (Telco Mandatory/Optional), and status (passed/failed/skipped)
- **P0/P1 Security Summary** — Cluster Architecture tab shows actual certsuite security test results grouped by priority
- **Skip Analysis** — Automatically classifies skipped tests as valid or needing review based on cluster context
- **Log Health Validation** — Detects excessive errors, missing probe pods, panics, and incomplete executions
- **Environment Visualization** — Operators, SR-IOV policies, test pods, workloads, Helm charts, and hardware inventory
- **Custom Priority Mapping** — Upload a CSV or XLSX file to override the built-in test priority assignments
- **Report Comparison** — Compare two certsuite runs side-by-side to track regressions and improvements
- **Report History** — Save and reload reports for future reference
- **PPTX Export** — Red Hat branded presentation with test summary, environment overview, and failed case analysis
- **XLSX Export** — Failed case summary + environment summary worksheets sorted by priority
- **CSV Export** — Failed case data with environment header for Google Sheets
- **Large File Support** — Handles claim.json and log files up to 1GB

## Quick Start

```bash
npm install
npm start
```

Open `http://localhost:3000` in your browser.

## Usage

1. **Enter CNF Name** (optional) — identifies the workload in the report banner (e.g., `vDUCNF00`)
2. **Upload claim.json** (required) — certsuite test results file
3. **Upload execution log** (optional) — validates test run health before reporting
4. **Upload priority mapping** (optional) — CSV or XLSX file to override default test priorities

The dashboard renders automatically after upload. Use the filters to focus on specific categories, scenarios, or statuses. Switch to the **Cluster Architecture** tab for environment details and security posture. Download reports from the export bar.

### Compare Mode

Click "Compare Reports" on the upload screen to compare two certsuite runs side-by-side (Report A vs Report B) to see which tests regressed, improved, or stayed the same. You can also compare two saved reports from the Report History screen by selecting them with checkboxes.

## File Inputs

| File | Format | Purpose |
|------|--------|---------|
| claim.json | JSON | Certsuite test results (required) |
| Execution log | .log/.txt | Validate test run health |
| Priority mapping | .csv/.xlsx | Override default test priority assignments |

### Priority Mapping Format

Upload a CSV or Excel file to override the built-in priority assignments. Two formats are supported:

**4-column CSV** (matches the full mapping file):
```csv
test_id,category,description,priority
access-control-pod-host-network,access-control,Verifies pods do not use host networking,0
lifecycle-liveness-probe,lifecycle,Checks liveness probes are defined,1
```

**2-column CSV** (simple override):
```csv
test_id,priority
access-control-pod-host-network,0
lifecycle-liveness-probe,1
```

**XLSX**: First worksheet with `test_id` and `priority` column headers.

Only tests present in the uploaded file are overridden; all others keep their default priority.

## Reports

### PPTX (PowerPoint)

Red Hat branded slide deck with:
- Title slide with CNF name and version info
- Cert Suite overview (test suites, scenario types)
- Test result summary with per-suite breakdown
- Version information (K8s, OCP, Certsuite, CNF)
- Failed tests grouped by category with priority
- Environment overview (operators, SR-IOV, pods)
- Recommendations

### XLSX (Excel)

Two worksheets:
- **Failed Case Summary** — Test ID, Category, Impact, Remediation, Priority, Partner Comments (sorted by priority, color-coded)
- **Environment Summary** — Test configuration, operators, SR-IOV policies, test pods with resource limits and security context, workloads, Helm charts

### CSV

Failed case data with environment header block, suitable for import into Google Sheets or other spreadsheet tools.

## Priority Scale

| Priority | Description |
|----------|-------------|
| 0 | Security-critical (root user, privilege escalation) |
| 1 | Host access violations (host PID/path/network/IPC, capabilities, reserved ports) |
| 2 | Cluster role bindings, scheduling, tolerations, probes, SSH daemons |
| 3 | PreStop hooks, pod owner type |
| 4 | One process per container, non-UBI base image |

## Server Deployment

For running on a shared server where a team can access the tool.

### Basic Setup

```bash
npm install
PORT=3000 npm start
```

Open port 3000 (or your chosen port) in your firewall.

### Report Storage

Reports are stored in a SQLite database (`server/reports.db` by default). On a server, you should store the database outside the application directory so it survives redeployments and updates.

#### Option 1: Environment Variable (Recommended)

Point `REPORTS_DB_PATH` to a persistent location:

```bash
# Create a persistent data directory
sudo mkdir -p /var/data/cnf-reports
sudo chown $USER:$USER /var/data/cnf-reports

# Start with external DB path
REPORTS_DB_PATH=/var/data/cnf-reports/reports.db npm start
```

#### Option 2: Symlink

Create a symlink from the default path to a persistent location:

```bash
# Create a persistent data directory
sudo mkdir -p /var/data/cnf-reports
sudo chown $USER:$USER /var/data/cnf-reports

# If a reports.db already exists in the app, move it first
mv server/reports.db /var/data/cnf-reports/reports.db

# Create the symlink
ln -s /var/data/cnf-reports/reports.db server/reports.db
```

Now `npm start` works without any env vars and the database lives outside the app directory.

#### Option 3: Docker / Podman Volume Mount

```bash
# Mount a host directory for the database
podman run -p 3000:3000 \
  -v /var/data/cnf-reports:/data:Z \
  -e REPORTS_DB_PATH=/data/reports.db \
  cnf-report-generator
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server listen port |
| `STORAGE_BACKEND` | `sqlite` | Storage backend (`sqlite` or `json`) |
| `REPORTS_DB_PATH` | `server/reports.db` | SQLite database file path |
| `REPORTS_DIR` | `server/reports/` | JSON storage directory (only when `STORAGE_BACKEND=json`) |

### Systemd Service (Linux)

To run as a background service:

```ini
# /etc/systemd/system/cnf-report.service
[Unit]
Description=CNF Best Practice Report Generator
After=network.target

[Service]
Type=simple
User=cnfreport
WorkingDirectory=/opt/cnf-report-generator
Environment=PORT=3000
Environment=REPORTS_DB_PATH=/var/data/cnf-reports/reports.db
ExecStart=/usr/bin/node server/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now cnf-report.service
```

## Updating the Catalog

The test catalog is pre-fetched from the certsuite repository. To refresh:

```bash
node scripts/fetch-catalog.js
```

## Tech Stack

- **Backend**: Node.js, Express, multer
- **Frontend**: Vanilla HTML/CSS/JS (no build step), DM Sans font
- **PPTX**: pptxgenjs
- **XLSX**: exceljs

## License

MIT
