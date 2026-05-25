const fs = require('fs');
const path = require('path');

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncate(str, max) {
  if (!str || str.length <= max) return str;
  return str.slice(0, max) + '...';
}

function formatSuiteName(suite) {
  return suite.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function loadCss() {
  const cssPath = path.join(__dirname, '../../public/css/styles.css');
  let css = fs.readFileSync(cssPath, 'utf-8');
  css = css.replace("'DM Sans', ", '');
  return css;
}

function buildLightThemeCss() {
  return `
[data-theme="light"] {
  --bg: #f0f2f5;
  --bg2: #e4e7ec;
  --surface: #ffffff;
  --surface2: #f5f6f8;
  --border: #d1d5db;
  --text: #1a1a2e;
  --muted: #5a6577;
  --accent: #0284c7;
  --purple: #7c3aed;
  --pink: #db2777;
  --rh-red: #cc0000;
  --color-passed: #16a34a;
  --color-failed: #dc2626;
  --color-skipped: #6b7280;
  --color-warning: #d97706;
  --color-info: #0284c7;
  --shadow: 0 4px 16px rgba(0,0,0,0.08);
  --shadow-hover: 0 8px 24px rgba(0,0,0,0.12);
}
[data-theme="light"] body {
  background: linear-gradient(165deg, var(--bg) 0%, var(--bg2) 45%, var(--bg) 100%);
}
[data-theme="light"] .card-total { background: linear-gradient(145deg, rgba(2,132,199,0.10), var(--surface)); border-color: rgba(2,132,199,0.30); }
[data-theme="light"] .card-passed { background: linear-gradient(145deg, rgba(22,163,74,0.10), var(--surface)); border-color: rgba(22,163,74,0.30); }
[data-theme="light"] .card-failed { background: linear-gradient(145deg, rgba(220,38,38,0.10), var(--surface)); border-color: rgba(220,38,38,0.30); }
[data-theme="light"] .card-skipped { background: linear-gradient(145deg, rgba(107,114,128,0.10), var(--surface)); border-color: rgba(107,114,128,0.30); }
[data-theme="light"] .status-passed { background: rgba(22,163,74,0.12); }
[data-theme="light"] .status-failed { background: rgba(220,38,38,0.12); }
[data-theme="light"] .status-skipped { background: rgba(107,114,128,0.12); }
[data-theme="light"] .failure-details { background: rgba(220,38,38,0.06); border-color: rgba(220,38,38,0.20); }
[data-theme="light"] .remediation-box { background: rgba(2,132,199,0.06); border-color: rgba(2,132,199,0.20); }
[data-theme="light"] .skip-valid { background: rgba(22,163,74,0.12); }
[data-theme="light"] .skip-review { background: rgba(217,119,6,0.12); }
[data-theme="light"] .chip-passed { background: rgba(22,163,74,0.08); border-color: rgba(22,163,74,0.25); }
[data-theme="light"] .chip-failed { background: rgba(220,38,38,0.08); border-color: rgba(220,38,38,0.25); }
[data-theme="light"] .chip-skipped { background: rgba(107,114,128,0.08); border-color: rgba(107,114,128,0.25); }
[data-theme="light"] .suite-header:hover { background: rgba(2,132,199,0.06); }
[data-theme="light"] .test-table tr:hover td { background: rgba(2,132,199,0.04); }
[data-theme="light"] .test-table tbody tr:nth-child(even) td { background: rgba(2,132,199,0.02); }
[data-theme="light"] .category-summary tr:hover td { background: rgba(2,132,199,0.04); }
[data-theme="light"] .category-summary tbody tr:nth-child(even) td { background: rgba(2,132,199,0.02); }
[data-theme="light"] .env-table tr:hover td { background: rgba(2,132,199,0.04); }
[data-theme="light"] .env-table code { background: #eef2f7; color: var(--accent); border-color: var(--border); }
[data-theme="light"] .env-badge-ok { background: rgba(22,163,74,0.12); }
[data-theme="light"] .env-badge-fail { background: rgba(220,38,38,0.12); }
[data-theme="light"] .env-badge-warn { background: rgba(217,119,6,0.12); }
[data-theme="light"] .arch-card.arch-ok { border-top-color: var(--color-passed); }
[data-theme="light"] .arch-card.arch-warn { border-top-color: var(--color-failed); }
[data-theme="light"] .arch-card.arch-info { border-top-color: var(--accent); }
[data-theme="light"] .arch-security-item:hover { background: rgba(2,132,199,0.04); }
[data-theme="light"] .arch-card[data-target]:hover { box-shadow: 0 10px 28px rgba(2,132,199,0.10); }
[data-theme="light"] .alert-warning { background: rgba(217,119,6,0.08); border-color: rgba(217,119,6,0.25); }
[data-theme="light"] .drop-zone { background: var(--surface); }
[data-theme="light"] .btn-save { border-color: rgba(22,163,74,0.30); }
[data-theme="light"] .tab-btn:hover { background: rgba(2,132,199,0.06); }
[data-theme="light"] .filter-select { background: var(--surface); }
[data-theme="light"] ::-webkit-scrollbar-track { background: var(--bg); }
[data-theme="light"] ::-webkit-scrollbar-thumb { background: var(--border); }
.theme-toggle {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.25);
  color: var(--text);
  font-size: 1.1rem;
  padding: 0.2rem 0.55rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1;
}
.theme-toggle:hover { background: rgba(56,189,248,0.1); }
[data-theme="light"] .theme-toggle { border-color: var(--border); }
[data-theme="light"] .theme-toggle:hover { background: rgba(2,132,199,0.08); }
.back-to-top {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--rh-red);
  color: #fff;
  border: none;
  font-size: 1.3rem;
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  z-index: 150;
  transition: transform 0.15s ease, opacity 0.2s ease;
}
.back-to-top:hover { transform: translateY(-2px); }
`;
}

function buildHeaderMetaHtml(meta) {
  const items = [];
  if (meta.ocpVersion) items.push(`<span>OCP ${escapeHtml(meta.ocpVersion)}</span>`);
  if (meta.k8sVersion) items.push(`<span>K8s ${escapeHtml(meta.k8sVersion)}</span>`);
  if (meta.certSuiteVersion) items.push(`<span>Certsuite ${escapeHtml(meta.certSuiteVersion)}</span>`);
  if (meta.startTime) items.push(`<span>Run: ${escapeHtml(new Date(meta.startTime).toLocaleString())}</span>`);
  return items.join('');
}

function buildLogWarningsHtml(logValidation) {
  if (!logValidation || logValidation.healthy) return '';
  const warnings = logValidation.warnings;
  if (!Array.isArray(warnings) || warnings.length === 0) return '';
  const items = warnings.map(w =>
    `<li>${escapeHtml(w.message || w)}</li>`
  ).join('');
  return `<div class="alert alert-warning">
    <strong>Execution Health Warning</strong>
    <ul>${items}</ul>
    <p>Consider re-running the certsuite for more reliable results.</p>
  </div>`;
}

function buildSummaryCardsHtml(totals) {
  return `
    <div class="summary-card card-total" data-filter="all">
      <div class="card-value">${totals.total}</div>
      <div class="card-label">Total</div>
    </div>
    <div class="summary-card card-passed" data-filter="passed">
      <div class="card-value">${totals.passed}</div>
      <div class="card-label">Passed</div>
    </div>
    <div class="summary-card card-failed" data-filter="failed">
      <div class="card-value">${totals.failed}</div>
      <div class="card-label">Failed</div>
    </div>
    <div class="summary-card card-skipped" data-filter="skipped">
      <div class="card-value">${totals.skipped}</div>
      <div class="card-label">Skipped</div>
    </div>`;
}

function buildCategorySummaryHtml(resultsBySuite) {
  const suites = Object.keys(resultsBySuite).sort();
  let rows = '';
  for (const suite of suites) {
    const results = resultsBySuite[suite];
    const passed = results.filter(r => r.normalizedState === 'passed').length;
    const failed = results.filter(r => r.normalizedState === 'failed').length;
    const skipped = results.filter(r => r.normalizedState === 'skipped').length;
    const total = results.length;
    rows += `<tr>
      <td style="font-weight:600;">${formatSuiteName(suite)}</td>
      <td>${total}</td>
      <td style="color:var(--color-passed);font-weight:600;">${passed}</td>
      <td style="color:var(--color-failed);font-weight:600;">${failed}</td>
      <td style="color:var(--color-skipped);font-weight:600;">${skipped}</td>
    </tr>`;
  }
  return `<table>
    <thead><tr><th>Category</th><th>Total</th><th>Passed</th><th>Failed</th><th>Skipped</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function buildTestRows(results) {
  return results.map(r => {
    const statusClass = `status-${r.normalizedState}`;
    const priorityClass = `priority-${r.priority ?? 4}`;
    let detailsCell = '';

    if (r.normalizedState === 'failed' && r.failureDetails) {
      let failText = '';
      if (Array.isArray(r.failureDetails)) {
        failText = r.failureDetails.map(d => d.reason || d.podName || d.objectType || JSON.stringify(d)).join('; ');
      } else {
        failText = String(r.failureDetails);
      }
      detailsCell = `<div class="failure-details">${escapeHtml(truncate(failText, 300))}</div>`;
      if (r.remediation) {
        detailsCell += `<div class="remediation-box" style="margin-top:4px;">${escapeHtml(r.remediation)}</div>`;
      }
    } else if (r.normalizedState === 'skipped') {
      const sa = r.skipAnalysis;
      if (sa) {
        const badgeClass = sa.skipClassification === 'valid-skip' ? 'skip-valid' : 'skip-review';
        const label = sa.skipClassification === 'valid-skip' ? 'Valid' : 'Needs Review';
        detailsCell = `<span class="skip-badge ${badgeClass}">${label}</span> ${escapeHtml(sa.reason)}`;
      } else if (r.skipReason) {
        detailsCell = escapeHtml(r.skipReason);
      }
    } else if (r.normalizedState === 'passed') {
      detailsCell = '<span style="color:var(--color-passed);">Compliant</span>';
    }

    const scenarioJson = escapeHtml(JSON.stringify(r.scenarios || {}));
    return `<tr data-status="${r.normalizedState}" data-suite="${escapeHtml(r.suite)}" data-scenario="${scenarioJson}">
      <td class="test-id">${escapeHtml(r.id)}</td>
      <td><span class="status-badge ${statusClass}">${r.normalizedState}</span></td>
      <td>${escapeHtml(r.description || '')}</td>
      <td>${detailsCell}</td>
      <td><span class="priority-badge ${priorityClass}">${r.priority ?? '-'}</span></td>
    </tr>`;
  }).join('');
}

function buildTestTablesHtml(resultsBySuite) {
  const suites = Object.keys(resultsBySuite).sort();
  let html = '';
  for (const suite of suites) {
    const results = resultsBySuite[suite];
    const passed = results.filter(r => r.normalizedState === 'passed').length;
    const failed = results.filter(r => r.normalizedState === 'failed').length;
    const skipped = results.filter(r => r.normalizedState === 'skipped').length;

    html += `<div class="suite-section" data-suite="${escapeHtml(suite)}">
      <div class="suite-header" onclick="toggleSuite(this)">
        <h3><span class="toggle-icon">&#9660;</span> ${formatSuiteName(suite)}</h3>
        <div class="suite-counts">
          <span class="count-passed">${passed} passed</span>
          <span class="count-failed">${failed} failed</span>
          <span class="count-skipped">${skipped} skipped</span>
        </div>
      </div>
      <div class="suite-body">
        <table class="test-table">
          <thead><tr>
            <th>Test ID</th>
            <th>Status</th>
            <th>Description</th>
            <th>Details</th>
            <th>Priority</th>
          </tr></thead>
          <tbody>${buildTestRows(results)}</tbody>
        </table>
      </div>
    </div>`;
  }
  return html;
}

function buildArchSummaryHtml(env, results) {
  if (!env) return '';

  const pods = env.pods || {};
  const testPods = pods.testPods || [];
  const cluster = env.cluster || {};
  const hw = env.hardware || {};
  const helmCharts = env.helmCharts || [];
  const deps = pods.testDeployments || [];
  const sts = pods.testStatefulSets || [];

  const containerCount = testPods.reduce((s, p) => s + (p.containers || []).length, 0);
  const totalVFs = (hw.sriovPolicies || []).reduce((s, p) => s + (p.numVfs || 0), 0);

  const allResults = results || [];
  const p0Tests = allResults.filter(r => r.priority === 0);
  const p1Tests = allResults.filter(r => r.priority === 1);
  const p0Failed = p0Tests.filter(r => r.normalizedState === 'failed').length;
  const p1Failed = p1Tests.filter(r => r.normalizedState === 'failed').length;
  const securityIssues = p0Failed + p1Failed;

  function testShortName(id) {
    return id.replace(/^[a-z]+-[a-z]+-/, '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  function renderSecurityItems(tests) {
    return tests.map(r => {
      const state = r.normalizedState;
      const cls = state === 'passed' ? 'sec-ok' : state === 'failed' ? 'sec-warn' : 'sec-skip';
      const icon = state === 'passed' ? '&#10003;' : state === 'failed' ? '&#10007;' : '&#9644;';
      const label = state.charAt(0).toUpperCase() + state.slice(1);
      return `<div class="arch-security-item ${cls}">
        <span class="arch-check">${icon}</span>
        ${testShortName(r.id)}: <strong>${label}</strong>
      </div>`;
    }).join('');
  }

  return `
    <div class="arch-card arch-info" data-target="env-pods">
      <div class="arch-card-value">${testPods.length}</div>
      <div class="arch-card-label">Test Pods</div>
      <div class="arch-card-detail">${containerCount} containers | ${pods.allPodsCount || 0} total in ns</div>
    </div>
    <div class="arch-card arch-info" data-target="env-pods">
      <div class="arch-card-value">${deps.length + sts.length}</div>
      <div class="arch-card-label">Workloads</div>
      <div class="arch-card-detail">${deps.length} deployments, ${sts.length} statefulsets</div>
    </div>
    <div class="arch-card arch-info" data-target="env-cluster">
      <div class="arch-card-value">${cluster.operators ? cluster.operators.length : 0}</div>
      <div class="arch-card-label">Operators</div>
      <div class="arch-card-detail">${(cluster.storageClasses || []).length} storage classes</div>
    </div>
    <div class="arch-card arch-info" data-target="env-hardware">
      <div class="arch-card-value">${(hw.sriovPolicies || []).length}</div>
      <div class="arch-card-label">SR-IOV Policies</div>
      <div class="arch-card-detail">${totalVFs} total VFs configured</div>
    </div>
    <div class="arch-card arch-info" data-target="env-helm">
      <div class="arch-card-value">${helmCharts.length}</div>
      <div class="arch-card-label">Helm Charts</div>
      <div class="arch-card-detail">${(cluster.nodeCount || {}).total || 0} cluster nodes</div>
    </div>
    <div class="arch-card ${securityIssues === 0 ? 'arch-ok' : 'arch-warn'}">
      <div class="arch-card-value">${securityIssues === 0 ? 'Clean' : securityIssues}</div>
      <div class="arch-card-label">Security ${securityIssues === 0 ? 'Posture' : 'Findings'}</div>
      <div class="arch-card-detail">${securityIssues === 0 ? 'All P0/P1 tests passed' : p0Failed + ' P0, ' + p1Failed + ' P1 failures'}</div>
    </div>
    <div class="arch-security-grid">
      <div class="arch-security-title">Security Test Results (P0 &amp; P1)</div>
      <div class="arch-security-items">
        ${p0Tests.length > 0 ? `<div class="priority-section-title"><span class="sec-dot dot-p0"></span> P0 — Security Critical (${p0Tests.length})</div>` : ''}
        ${renderSecurityItems(p0Tests)}
        ${p1Tests.length > 0 ? `<div class="priority-section-title"><span class="sec-dot dot-p1"></span> P1 — Host Access &amp; Capabilities (${p1Tests.length})</div>` : ''}
        ${renderSecurityItems(p1Tests)}
        ${p0Tests.length === 0 && p1Tests.length === 0 ? '<p class="env-empty">No P0/P1 test results available</p>' : ''}
      </div>
    </div>`;
}

function buildEnvConfigHtml(config) {
  if (!config) return '';
  const ns = (config.targetNamespaces || []).join(', ') || 'N/A';
  const labels = (config.podsUnderTestLabels || []).join(', ') || 'N/A';
  return `
    <div class="env-section-header">Test Configuration</div>
    <div class="env-section-body">
      <div class="env-kv-grid">
        <span class="env-kv-label">Target Namespaces</span>
        <span class="env-kv-value"><code>${escapeHtml(ns)}</code></span>
        <span class="env-kv-label">Pod Selector Labels</span>
        <span class="env-kv-value"><code>${escapeHtml(labels)}</code></span>
      </div>
    </div>`;
}

function buildEnvClusterHtml(cluster) {
  if (!cluster) return '';
  const ops = cluster.operators || [];
  let opsHtml = '';
  if (ops.length > 0) {
    const rows = ops.map(op => {
      const statusClass = op.status === 'Succeeded' ? 'env-badge-ok' :
        op.status === 'Failed' ? 'env-badge-fail' : 'env-badge-warn';
      return `<tr>
        <td>${escapeHtml(op.name)}</td>
        <td>${escapeHtml(op.version)}</td>
        <td>${escapeHtml(op.namespace)}</td>
        <td><span class="env-badge ${statusClass}">${escapeHtml(op.status)}</span></td>
      </tr>`;
    }).join('');
    opsHtml = `<table class="env-table">
      <thead><tr><th>Operator</th><th>Version</th><th>Namespace</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  } else {
    opsHtml = '<p class="env-empty">No operator data available</p>';
  }

  const scRows = (cluster.storageClasses || []).map(sc =>
    `<tr><td>${escapeHtml(sc.name)}</td><td><code>${escapeHtml(sc.provisioner)}</code></td></tr>`
  ).join('');
  const scHtml = scRows
    ? `<table class="env-table"><thead><tr><th>Storage Class</th><th>Provisioner</th></tr></thead><tbody>${scRows}</tbody></table>`
    : '';

  const csiHtml = (cluster.csiDrivers || []).length > 0
    ? `<p style="margin-top:0.5rem;font-size:0.85rem;"><strong>CSI Drivers:</strong> ${cluster.csiDrivers.map(d => `<code>${escapeHtml(d)}</code>`).join(', ')}</p>`
    : '';

  const nodeInfo = cluster.nodeCount || {};
  const nodeHtml = nodeInfo.total
    ? `<p style="font-size:0.85rem;"><strong>Nodes:</strong> ${nodeInfo.total} (${(nodeInfo.names || []).join(', ')})</p>`
    : '';

  return `
    <div class="env-section-header">Cluster (${ops.length} operators)</div>
    <div class="env-section-body">
      ${nodeHtml}
      ${opsHtml}
      ${scHtml}
      ${csiHtml}
    </div>`;
}

function buildEnvHardwareHtml(hw) {
  if (!hw) return '';
  const policies = hw.sriovPolicies || [];
  let sriovHtml = '';
  if (policies.length > 0) {
    const rows = policies.map(p => {
      const nic = p.nicSelector || {};
      const vendor = nic.vendor || '';
      const deviceId = nic.deviceID || '';
      const pfs = (nic.pfNames || []).join(', ');
      return `<tr>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.deviceType)}</td>
        <td>${p.numVfs}</td>
        <td><code>${escapeHtml(p.resourceName)}</code></td>
        <td>${escapeHtml(vendor)}${deviceId ? ':' + escapeHtml(deviceId) : ''}</td>
        <td><code>${escapeHtml(pfs)}</code></td>
      </tr>`;
    }).join('');
    sriovHtml = `<table class="env-table">
      <thead><tr><th>Policy</th><th>Device Type</th><th>VFs</th><th>Resource</th><th>NIC Vendor:ID</th><th>PF Names</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  } else {
    sriovHtml = '<p class="env-empty">No SR-IOV policies configured</p>';
  }

  const hwInfo = hw.nodesHwInfo || {};
  let hwInfoHtml = '';
  if (Object.keys(hwInfo).length > 0) {
    hwInfoHtml = '<h4 style="margin-top:1rem;">Node Hardware Info</h4>';
    for (const [nodeName, info] of Object.entries(hwInfo)) {
      hwInfoHtml += `<p><strong>${escapeHtml(nodeName)}</strong></p>`;
      hwInfoHtml += `<pre style="font-size:0.8rem;background:var(--surface2);padding:0.5rem;border-radius:4px;overflow-x:auto;">${escapeHtml(JSON.stringify(info, null, 2))}</pre>`;
    }
  } else {
    hwInfoHtml = '<p class="env-empty">Hardware inventory not collected in this run</p>';
  }

  return `
    <div class="env-section-header">Hardware &amp; Networking</div>
    <div class="env-section-body">
      <h4 style="margin-top:0;margin-bottom:0.5rem;">SR-IOV Network Node Policies</h4>
      ${sriovHtml}
      ${hwInfoHtml}
    </div>`;
}

function buildEnvPodsHtml(pods) {
  if (!pods) return '';
  const testPods = pods.testPods || [];
  let podsHtml = '';
  if (testPods.length > 0) {
    const rows = testPods.map(pod => {
      const containers = pod.containers || [];
      const contSummary = containers.map(c => {
        const res = c.resources || {};
        const req = res.requests || {};
        const lim = res.limits || {};
        const cpuReq = req.cpu || '-';
        const cpuLim = lim.cpu || '-';
        const memReq = req.memory || '-';
        const memLim = lim.memory || '-';
        return `<div style="margin-bottom:0.3rem;">
          <strong>${escapeHtml(c.name)}</strong><br>
          <code style="font-size:0.75rem;">${escapeHtml(c.image)}</code><br>
          <span style="font-size:0.8rem;">CPU: ${cpuReq}/${cpuLim} | Mem: ${memReq}/${memLim}</span>
        </div>`;
      }).join('');

      const sc = containers.map(c => c.securityContext || {});
      const hasPrivEsc = sc.some(s => s.allowPrivilegeEscalation !== false);
      const hasCaps = sc.some(s => {
        const caps = (s.capabilities || {}).drop || [];
        return !caps.includes('ALL');
      });
      const securityHtml = `
        <span class="${!hasPrivEsc ? 'security-ok' : 'security-warn'}">${!hasPrivEsc ? 'No privEsc' : 'privEsc!'}</span>,
        <span class="${!hasCaps ? 'security-ok' : 'security-warn'}">${!hasCaps ? 'Caps dropped' : 'Caps!'}</span>,
        <span class="${!pod.hostNetwork ? 'security-ok' : 'security-warn'}">${!pod.hostNetwork ? 'No hostNet' : 'hostNet!'}</span>
      `;

      return `<tr>
        <td><strong>${escapeHtml(pod.name)}</strong><br><span style="font-size:0.8rem;color:var(--muted);">${escapeHtml(pod.namespace)}</span></td>
        <td><code style="font-size:0.8rem;">${escapeHtml(pod.nodeName)}</code></td>
        <td>${contSummary}</td>
        <td>${securityHtml}</td>
        <td><span class="env-badge env-badge-ok">${escapeHtml(pod.phase)}</span></td>
      </tr>`;
    }).join('');

    podsHtml = `<table class="env-table">
      <thead><tr><th>Pod</th><th>Node</th><th>Containers (image, CPU req/lim, Mem req/lim)</th><th>Security</th><th>Phase</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  } else {
    podsHtml = '<p class="env-empty">No test pod data available</p>';
  }

  const deps = pods.testDeployments || [];
  const sts = pods.testStatefulSets || [];
  let workloadHtml = '';
  if (deps.length > 0 || sts.length > 0) {
    const wRows = [
      ...deps.map(d => `<tr><td>Deployment</td><td>${escapeHtml(d.name)}</td><td>${escapeHtml(d.namespace)}</td><td>${d.replicas}</td></tr>`),
      ...sts.map(s => `<tr><td>StatefulSet</td><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.namespace)}</td><td>${s.replicas}</td></tr>`)
    ].join('');
    workloadHtml = `<h4 style="margin-top:1rem;">Workloads</h4>
      <table class="env-table">
        <thead><tr><th>Type</th><th>Name</th><th>Namespace</th><th>Replicas</th></tr></thead>
        <tbody>${wRows}</tbody>
      </table>`;
  }

  const pdbs = pods.podDisruptionBudgets || [];
  let pdbHtml = '';
  if (pdbs.length > 0) {
    const pdbRows = pdbs.map(p =>
      `<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.namespace)}</td><td>${p.maxUnavailable ?? '-'}</td><td>${p.minAvailable ?? '-'}</td></tr>`
    ).join('');
    pdbHtml = `<h4 style="margin-top:1rem;">Pod Disruption Budgets</h4>
      <table class="env-table">
        <thead><tr><th>Name</th><th>Namespace</th><th>Max Unavailable</th><th>Min Available</th></tr></thead>
        <tbody>${pdbRows}</tbody>
      </table>`;
  }

  return `
    <div class="env-section-header">Pods &amp; Workloads (${testPods.length} test pods, ${pods.allPodsCount || 0} total in namespace)</div>
    <div class="env-section-body">
      ${podsHtml}
      ${workloadHtml}
      ${pdbHtml}
    </div>`;
}

function buildEnvHelmHtml(helmCharts) {
  if (!helmCharts || helmCharts.length === 0) {
    return `
      <div class="env-section-header">Helm Chart Releases</div>
      <div class="env-section-body"><p class="env-empty">No Helm chart data available</p></div>`;
  }
  const rows = helmCharts.map(h =>
    `<tr><td>${escapeHtml(h.name)}</td><td>${escapeHtml(h.chartName)}</td><td>${escapeHtml(h.chartVersion)}</td><td>${escapeHtml(h.namespace)}</td></tr>`
  ).join('');
  return `
    <div class="env-section-header">Helm Chart Releases (${helmCharts.length})</div>
    <div class="env-section-body">
      <table class="env-table">
        <thead><tr><th>Release</th><th>Chart</th><th>Version</th><th>Namespace</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function buildInlineScript(resultsBySuite) {
  const dataJson = JSON.stringify(resultsBySuite);
  return `
var RESULTS_BY_SUITE = ${dataJson};

function toggleSuite(header) {
  header.classList.toggle('collapsed');
  header.nextElementSibling.classList.toggle('collapsed');
}

function formatSuiteName(suite) {
  return suite.split('-').map(function(w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
}

function escapeHtml(str) {
  if (!str) return '';
  var d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
  document.querySelector('.tab-btn[data-tab="' + tab + '"]').classList.add('active');
  document.getElementById('dashboard-layout').style.display = tab === 'results' ? '' : 'none';
  document.getElementById('environment-panel').style.display = tab === 'environment' ? '' : 'none';
}

function applyFilters() {
  var category = document.getElementById('filter-category').value;
  var scenario = document.getElementById('filter-scenario').value;
  var showPassed = document.getElementById('filter-passed').checked;
  var showFailed = document.getElementById('filter-failed').checked;
  var showSkipped = document.getElementById('filter-skipped').checked;

  var allowed = {};
  if (showPassed) allowed['passed'] = true;
  if (showFailed) allowed['failed'] = true;
  if (showSkipped) allowed['skipped'] = true;

  document.querySelectorAll('.suite-section').forEach(function(section) {
    var suite = section.dataset.suite;
    var catMatch = category === 'all' || suite === category;
    section.style.display = catMatch ? '' : 'none';
    if (!catMatch) return;

    var visibleCount = 0;
    section.querySelectorAll('.test-table tbody tr').forEach(function(row) {
      var status = row.dataset.status;
      var statusMatch = !!allowed[status];
      var scenarioMatch = matchScenario(row, scenario);
      var visible = statusMatch && scenarioMatch;
      row.style.display = visible ? '' : 'none';
      if (visible) visibleCount++;
    });
    section.style.display = catMatch && visibleCount > 0 ? '' : 'none';
  });

  updateCategorySummary(category, allowed, scenario);
}

function matchScenario(row, scenario) {
  if (scenario === 'all') return true;
  try {
    var sc = JSON.parse(row.dataset.scenario || '{}');
    if (scenario === 'telco-mandatory') return sc.Telco === 'Mandatory' || sc.telco === 'Mandatory';
    if (scenario === 'telco-optional') return sc.Telco === 'Optional' || sc.telco === 'Optional';
  } catch(e) { return true; }
  return true;
}

function updateCategorySummary(category, allowed, scenario) {
  var suites = Object.keys(RESULTS_BY_SUITE).sort();
  var rows = '';
  for (var i = 0; i < suites.length; i++) {
    var suite = suites[i];
    if (category !== 'all' && suite !== category) continue;
    var results = RESULTS_BY_SUITE[suite];
    if (scenario !== 'all') {
      results = results.filter(function(r) {
        var sc = r.scenarios || {};
        if (scenario === 'telco-mandatory') return sc.Telco === 'Mandatory' || sc.telco === 'Mandatory';
        if (scenario === 'telco-optional') return sc.Telco === 'Optional' || sc.telco === 'Optional';
        return true;
      });
    }
    var passed = results.filter(function(r) { return r.normalizedState === 'passed' && allowed['passed']; }).length;
    var failed = results.filter(function(r) { return r.normalizedState === 'failed' && allowed['failed']; }).length;
    var skipped = results.filter(function(r) { return r.normalizedState === 'skipped' && allowed['skipped']; }).length;
    var total = passed + failed + skipped;
    if (total === 0) continue;
    rows += '<tr><td style="font-weight:600;">' + formatSuiteName(suite) + '</td><td>' + total + '</td>'
      + '<td style="color:var(--color-passed);font-weight:600;">' + passed + '</td>'
      + '<td style="color:var(--color-failed);font-weight:600;">' + failed + '</td>'
      + '<td style="color:var(--color-skipped);font-weight:600;">' + skipped + '</td></tr>';
  }
  document.getElementById('category-summary').innerHTML = '<table>'
    + '<thead><tr><th>Category</th><th>Total</th><th>Passed</th><th>Failed</th><th>Skipped</th></tr></thead>'
    + '<tbody>' + rows + '</tbody></table>';
}

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { switchTab(this.dataset.tab); });
  });

  document.getElementById('filter-category').addEventListener('change', applyFilters);
  document.getElementById('filter-scenario').addEventListener('change', applyFilters);
  document.getElementById('filter-passed').addEventListener('change', applyFilters);
  document.getElementById('filter-failed').addEventListener('change', applyFilters);
  document.getElementById('filter-skipped').addEventListener('change', applyFilters);

  document.querySelectorAll('.summary-card[data-filter]').forEach(function(card) {
    card.addEventListener('click', function() {
      var filter = this.dataset.filter;
      document.querySelectorAll('.summary-card').forEach(function(c) { c.classList.remove('active'); });
      this.classList.add('active');
      if (filter === 'all') {
        document.getElementById('filter-passed').checked = true;
        document.getElementById('filter-failed').checked = true;
        document.getElementById('filter-skipped').checked = true;
      } else {
        document.getElementById('filter-passed').checked = filter === 'passed';
        document.getElementById('filter-failed').checked = filter === 'failed';
        document.getElementById('filter-skipped').checked = filter === 'skipped';
      }
      applyFilters();
    });
  });

  document.querySelectorAll('.arch-card[data-target]').forEach(function(card) {
    card.addEventListener('click', function() {
      var target = document.getElementById(this.dataset.target);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  var themeBtn = document.getElementById('theme-toggle');
  var saved = localStorage.getItem('report-theme');
  if (saved === 'light') { document.documentElement.setAttribute('data-theme', 'light'); themeBtn.textContent = '\\u2600'; }
  themeBtn.addEventListener('click', function() {
    var current = document.documentElement.getAttribute('data-theme');
    if (current === 'light') {
      document.documentElement.removeAttribute('data-theme');
      themeBtn.textContent = '\\u263D';
      localStorage.setItem('report-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      themeBtn.textContent = '\\u2600';
      localStorage.setItem('report-theme', 'light');
    }
  });

  var btt = document.getElementById('back-to-top');
  window.addEventListener('scroll', function() {
    btt.style.display = window.scrollY > 400 ? 'flex' : 'none';
  });
  btt.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});`;
}

function generate(claimData) {
  const css = loadCss();
  const meta = claimData.metadata || {};
  const totals = claimData.totals || { total: 0, passed: 0, failed: 0, skipped: 0 };
  const resultsBySuite = claimData.resultsBySuite || {};
  const env = claimData.environment || {};
  const results = claimData.results || [];
  const logValidation = claimData.logValidation || {};

  const categoryOptions = Object.keys(resultsBySuite).sort()
    .map(s => `<option value="${escapeHtml(s)}">${formatSuiteName(s)}</option>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(meta.cnfVersion || 'CNF')} Best Practice Report</title>
  <style>${css}${buildLightThemeCss()}</style>
</head>
<body>
  <nav class="app-nav">
    <div class="nav-brand">CNF Best Practice Report</div>
    <button class="theme-toggle" id="theme-toggle" title="Toggle light/dark mode">&#9789;</button>
  </nav>
  <button class="back-to-top" id="back-to-top" title="Back to top">&#8679;</button>

  <div class="dashboard" style="display:block;">
    <header class="dashboard-header">
      <div class="header-left">
        <h1>${escapeHtml(meta.cnfVersion || 'CNF')} Best Practice Analysis</h1>
        <div class="header-meta">${buildHeaderMetaHtml(meta)}</div>
      </div>
    </header>

    ${buildLogWarningsHtml(logValidation)}

    <div class="tab-bar">
      <button class="tab-btn active" data-tab="results">Test Results</button>
      <button class="tab-btn" data-tab="environment">Cluster Architecture</button>
    </div>

    <div id="dashboard-layout" class="dashboard-layout">
      <main class="main-content">
        <div class="summary-cards">${buildSummaryCardsHtml(totals)}</div>

        <div class="filter-bar">
          <div class="filter-group">
            <label for="filter-category">Category</label>
            <select id="filter-category" class="filter-select">
              <option value="all">All Categories</option>
              ${categoryOptions}
            </select>
          </div>
          <div class="filter-group">
            <label for="filter-scenario">Scenario</label>
            <select id="filter-scenario" class="filter-select">
              <option value="all">All Scenarios</option>
              <option value="telco-mandatory">Telco Mandatory</option>
              <option value="telco-optional">Telco Optional</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Status</label>
            <div class="status-checkboxes">
              <label class="checkbox-chip chip-passed">
                <input type="checkbox" id="filter-passed" checked> Passed
              </label>
              <label class="checkbox-chip chip-failed">
                <input type="checkbox" id="filter-failed" checked> Failed
              </label>
              <label class="checkbox-chip chip-skipped">
                <input type="checkbox" id="filter-skipped" checked> Skipped
              </label>
            </div>
          </div>
        </div>

        <div id="category-summary" class="category-summary">${buildCategorySummaryHtml(resultsBySuite)}</div>
        <div id="test-tables" class="test-tables">${buildTestTablesHtml(resultsBySuite)}</div>
      </main>
    </div>

    <div id="environment-panel" class="environment-panel" style="display:none;">
      <div id="arch-summary" class="arch-summary">${buildArchSummaryHtml(env, results)}</div>
      <div class="env-grid">
        <div id="env-config" class="env-section">${buildEnvConfigHtml(env.config)}</div>
        <div id="env-cluster" class="env-section">${buildEnvClusterHtml(env.cluster)}</div>
        <div id="env-hardware" class="env-section">${buildEnvHardwareHtml(env.hardware)}</div>
        <div id="env-pods" class="env-section">${buildEnvPodsHtml(env.pods)}</div>
        <div id="env-helm" class="env-section">${buildEnvHelmHtml(env.helmCharts)}</div>
      </div>
    </div>
  </div>

  <script>${buildInlineScript(resultsBySuite)}</script>
</body>
</html>`;

  return Buffer.from(html, 'utf-8');
}

module.exports = { generate };
