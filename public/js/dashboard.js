function renderDashboard(data) {
  renderHeader(data.metadata);
  renderLogWarnings(data.logValidation);
  renderSummaryCards(data.totals);
  renderCategorySummary(data.resultsBySuite);
  renderTestTables(data.resultsBySuite);
  if (data.environment) renderEnvironment(data.environment, data.results || []);
}

function renderHeader(meta) {
  const title = document.getElementById('dashboard-title');
  title.textContent = `${meta.cnfVersion || 'CNF'} Best Practice Analysis`;

  const metaDiv = document.getElementById('header-meta');
  const items = [];
  if (meta.ocpVersion) items.push(`<span>OCP ${meta.ocpVersion}</span>`);
  if (meta.k8sVersion) items.push(`<span>K8s ${meta.k8sVersion}</span>`);
  if (meta.certSuiteVersion) items.push(`<span>Certsuite ${meta.certSuiteVersion}</span>`);
  if (meta.startTime) items.push(`<span>Run: ${new Date(meta.startTime).toLocaleString()}</span>`);
  metaDiv.innerHTML = items.join('');
}

function renderLogWarnings(logValidation) {
  const banner = document.getElementById('log-warnings');
  const list = document.getElementById('log-warning-list');
  if (!logValidation || logValidation.healthy) {
    banner.style.display = 'none';
    return;
  }
  list.innerHTML = '';
  for (const w of logValidation.warnings) {
    const li = document.createElement('li');
    li.textContent = w.message || w;
    list.appendChild(li);
  }
  banner.style.display = 'block';
}

function renderSummaryCards(totals) {
  const container = document.getElementById('summary-cards');
  const passRate = totals.total > 0 ? Math.round((totals.passed / totals.total) * 100) : 0;
  const iconCheck = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  const iconX = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  const iconDash = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>';

  container.innerHTML = `
    <div class="summary-card card-total" data-filter="all" tabindex="0" role="button" aria-label="Show all ${totals.total} tests">
      <div class="card-value">${totals.total}</div>
      <div class="card-rate">${passRate}% pass rate</div>
      <div class="card-label">Total</div>
    </div>
    <div class="summary-card card-passed" data-filter="passed" tabindex="0" role="button" aria-label="Filter to ${totals.passed} passed tests">
      <div class="card-value">${totals.passed}</div>
      <div class="card-label-row"><span class="card-label-icon">${iconCheck}</span><span class="card-label">Passed</span></div>
    </div>
    <div class="summary-card card-failed" data-filter="failed" tabindex="0" role="button" aria-label="Filter to ${totals.failed} failed tests">
      <div class="card-value">${totals.failed}</div>
      <div class="card-label-row"><span class="card-label-icon">${iconX}</span><span class="card-label">Failed</span></div>
    </div>
    <div class="summary-card card-skipped" data-filter="skipped" tabindex="0" role="button" aria-label="Filter to ${totals.skipped} skipped tests">
      <div class="card-value">${totals.skipped}</div>
      <div class="card-label-row"><span class="card-label-icon">${iconDash}</span><span class="card-label">Skipped</span></div>
    </div>
  `;

  container.querySelectorAll('.summary-card').forEach(card => {
    card.addEventListener('keydown', handleKeyboardActivate);
    card.addEventListener('click', () => {
      const filter = card.dataset.filter;
      container.querySelectorAll('.summary-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');

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
}

function renderCategorySummary(resultsBySuite) {
  const container = document.getElementById('category-summary');
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

  container.innerHTML = `<table>
    <thead><tr><th>Category</th><th>Total</th><th>Passed</th><th>Failed</th><th>Skipped</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderTestTables(resultsBySuite) {
  const container = document.getElementById('test-tables');
  container.innerHTML = '';
  const suites = Object.keys(resultsBySuite).sort();

  for (const suite of suites) {
    const results = resultsBySuite[suite];
    const section = document.createElement('div');
    section.className = 'suite-section';
    section.dataset.suite = suite;

    const passed = results.filter(r => r.normalizedState === 'passed').length;
    const failed = results.filter(r => r.normalizedState === 'failed').length;
    const skipped = results.filter(r => r.normalizedState === 'skipped').length;

    section.innerHTML = `
      <div class="suite-header" role="button" tabindex="0" aria-expanded="true">
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
            <th>Impact</th>
            <th>Best Practice Ref</th>
            <th>Details</th>
            <th>Priority</th>
          </tr></thead>
          <tbody>${renderTestRows(results)}</tbody>
        </table>
      </div>`;

    const header = section.querySelector('.suite-header');
    header.addEventListener('click', () => toggleSuite(header));
    header.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSuite(header); }
    });

    container.appendChild(section);
  }
}

function renderTestRows(results) {
  return results.map(r => {
    const statusClass = `status-${r.normalizedState}`;
    const priorityClass = `priority-${r.priority ?? 4}`;
    let detailsCell = '';

    if (r.normalizedState === 'failed' && r.failureDetails) {
      if (Array.isArray(r.failureDetails) && r.failureDetails.length > 0) {
        const items = r.failureDetails.map(d => `<li>${escapeHtml(formatFailureDetail(d))}</li>`).join('');
        detailsCell = `<div class="failure-details"><ul class="fail-list">${items}</ul></div>`;
      } else if (r.failureDetails) {
        detailsCell = `<div class="failure-details">${escapeHtml(String(r.failureDetails))}</div>`;
      }
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

    return `<tr data-status="${r.normalizedState}" data-suite="${r.suite}" data-priority="${r.priority ?? 4}" data-scenario='${JSON.stringify(r.scenarios || {})}'>
      <td class="test-id">${escapeHtml(r.id)}</td>
      <td><span class="status-badge ${statusClass}">${r.normalizedState}</span></td>
      <td>${escapeHtml(r.description || '')}</td>
      <td class="impact-cell">${escapeHtml(r.impact || '')}</td>
      <td class="ref-cell">${r.bestPracticeRef ? `<a href="${escapeHtml(r.bestPracticeRef)}" target="_blank" rel="noopener">Link</a>` : ''}</td>
      <td>${detailsCell}</td>
      <td><span class="priority-badge ${priorityClass}">${r.priority ?? '-'}</span></td>
    </tr>`;
  }).join('');
}

function toggleSuite(header) {
  header.classList.toggle('collapsed');
  const body = header.nextElementSibling;
  body.classList.toggle('collapsed');
  header.setAttribute('aria-expanded', !header.classList.contains('collapsed'));
}

function formatSuiteName(suite) {
  return suite.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function escapeHtml(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function formatFailureDetail(d) {
  const parts = [];
  if (d.podName) parts.push(d.podName);
  else if (d.objectType) parts.push(d.objectType);
  if (d.containerName) parts.push('container: ' + d.containerName);
  if (d.namespace) parts.push('ns: ' + d.namespace);
  if (d.reason) parts.push(d.reason);
  if (parts.length > 0) return parts.join(' | ');
  return JSON.stringify(d);
}

function truncate(str, max) {
  if (!str || str.length <= max) return str;
  return str.slice(0, max) + '...';
}

function renderEnvironment(env, results) {
  renderArchSummary(env, results);
  renderEnvConfig(env.config);
  renderEnvCluster(env.cluster, env.config);
  renderEnvHardware(env.hardware);
  renderEnvPods(env.pods);
  renderEnvHelm(env.helmCharts);
}

function parseCpu(val) {
  if (!val) return 0;
  const s = String(val);
  if (s.endsWith('m')) return parseInt(s, 10) || 0;
  return (parseFloat(s) || 0) * 1000;
}

function parseMem(val) {
  if (!val) return 0;
  const s = String(val);
  if (s.endsWith('Gi')) return (parseFloat(s) || 0) * 1024;
  if (s.endsWith('Mi')) return parseFloat(s) || 0;
  if (s.endsWith('Ki')) return (parseFloat(s) || 0) / 1024;
  if (s.endsWith('G')) return (parseFloat(s) || 0) * 1000;
  if (s.endsWith('M')) return parseFloat(s) || 0;
  if (s.endsWith('K')) return (parseFloat(s) || 0) / 1000;
  return (parseFloat(s) || 0) / (1024 * 1024);
}

function formatCpu(millicores) {
  if (millicores === 0) return '0';
  if (millicores % 1000 === 0) return String(millicores / 1000);
  return (millicores / 1000).toFixed(1);
}

function formatMem(mi) {
  if (mi === 0) return '0';
  if (mi >= 1024) return (mi / 1024).toFixed(1).replace(/\.0$/, '') + 'Gi';
  return Math.round(mi) + 'Mi';
}

function renderArchSummary(env, results) {
  const el = document.getElementById('arch-summary');
  if (!env) { el.style.display = 'none'; return; }

  const pods = env.pods || {};
  const testPods = pods.testPods || [];
  const cluster = env.cluster || {};
  const hw = env.hardware || {};
  const helmCharts = env.helmCharts || [];
  const deps = pods.testDeployments || [];
  const sts = pods.testStatefulSets || [];

  const containerCount = testPods.reduce((s, p) => s + (p.containers || []).length, 0);
  const totalVFs = (hw.sriovPolicies || []).reduce((s, p) => s + (p.numVfs || 0), 0);

  let totalCpuReq = 0, totalCpuLim = 0, totalMemReq = 0, totalMemLim = 0;
  testPods.forEach(p => (p.containers || []).forEach(c => {
    const res = c.resources || {};
    const req = res.requests || {};
    const lim = res.limits || {};
    totalCpuReq += parseCpu(req.cpu);
    totalCpuLim += parseCpu(lim.cpu);
    totalMemReq += parseMem(req.memory);
    totalMemLim += parseMem(lim.memory);
  }));

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

  el.innerHTML = `
    <div class="arch-card arch-info" data-target="env-pods">
      <div class="arch-card-value">${testPods.length}</div>
      <div class="arch-card-label">Test Pods</div>
      <div class="arch-card-detail">${containerCount} containers | ${pods.allPodsCount || 0} total in ns</div>
    </div>
    <div class="arch-card arch-info" data-target="env-pods">
      <div class="arch-card-value">${formatCpu(totalCpuReq)} / ${formatCpu(totalCpuLim)}</div>
      <div class="arch-card-label">Pod Resources (CPU)</div>
      <div class="arch-card-detail">${formatMem(totalMemReq)} / ${formatMem(totalMemLim)} memory</div>
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

  el.querySelectorAll('.arch-card[data-target]').forEach(card => {
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.addEventListener('click', () => {
      const target = document.getElementById(card.dataset.target);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    card.addEventListener('keydown', handleKeyboardActivate);
  });
}

function renderEnvConfig(config) {
  const el = document.getElementById('env-config');
  if (!config) { el.style.display = 'none'; return; }

  const ns = (config.targetNamespaces || []).join(', ') || 'N/A';
  const labels = (config.podsUnderTestLabels || []).join(', ') || 'N/A';

  el.innerHTML = `
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

function renderEnvCluster(cluster, config) {
  const el = document.getElementById('env-cluster');
  if (!cluster) { el.style.display = 'none'; return; }

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
    ? `<p class="mt-sm text-sm"><strong>CSI Drivers:</strong> ${cluster.csiDrivers.map(d => `<code>${escapeHtml(d)}</code>`).join(', ')}</p>`
    : '';

  const nodeInfo = cluster.nodeCount || {};
  const nodeHtml = nodeInfo.total
    ? `<p class="text-sm"><strong>Nodes:</strong> ${nodeInfo.total} (${(nodeInfo.names || []).join(', ')})</p>`
    : '';

  el.innerHTML = `
    <div class="env-section-header">Cluster (${ops.length} operators)</div>
    <div class="env-section-body">
      ${nodeHtml}
      ${opsHtml}
      ${scHtml}
      ${csiHtml}
    </div>`;
}

function renderEnvHardware(hw) {
  const el = document.getElementById('env-hardware');
  if (!hw) { el.style.display = 'none'; return; }

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
    hwInfoHtml = '<h4 class="mt-md">Node Hardware Info</h4>';
    for (const [nodeName, info] of Object.entries(hwInfo)) {
      hwInfoHtml += `<p><strong>${escapeHtml(nodeName)}</strong></p>`;
      hwInfoHtml += `<pre style="font-size:0.8rem;background:var(--surface2);padding:0.5rem;border-radius:4px;overflow-x:auto;">${escapeHtml(JSON.stringify(info, null, 2))}</pre>`;
    }
  } else {
    hwInfoHtml = '<p class="env-empty">Hardware inventory not collected in this run</p>';
  }

  el.innerHTML = `
    <div class="env-section-header">Hardware & Networking</div>
    <div class="env-section-body">
      <h4 class="mt-0 mb-sm">SR-IOV Network Node Policies</h4>
      ${sriovHtml}
      ${hwInfoHtml}
    </div>`;
}

function renderEnvPods(pods) {
  const el = document.getElementById('env-pods');
  if (!pods) { el.style.display = 'none'; return; }

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
        <td><strong>${escapeHtml(pod.name)}</strong><br><span style="font-size:0.8rem;color:var(--rh-grey);">${escapeHtml(pod.namespace)}</span></td>
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
    workloadHtml = `<h4 class="mt-md">Workloads</h4>
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
    pdbHtml = `<h4 class="mt-md">Pod Disruption Budgets</h4>
      <table class="env-table">
        <thead><tr><th>Name</th><th>Namespace</th><th>Max Unavailable</th><th>Min Available</th></tr></thead>
        <tbody>${pdbRows}</tbody>
      </table>`;
  }

  el.innerHTML = `
    <div class="env-section-header">Pods & Workloads (${testPods.length} test pods, ${pods.allPodsCount} total in namespace)</div>
    <div class="env-section-body">
      ${podsHtml}
      ${workloadHtml}
      ${pdbHtml}
    </div>`;
}

function renderEnvHelm(helmCharts) {
  const el = document.getElementById('env-helm');
  if (!helmCharts || helmCharts.length === 0) {
    el.innerHTML = `
      <div class="env-section-header">Helm Chart Releases</div>
      <div class="env-section-body"><p class="env-empty">No Helm chart data available</p></div>`;
    return;
  }

  const rows = helmCharts.map(h =>
    `<tr><td>${escapeHtml(h.name)}</td><td>${escapeHtml(h.chartName)}</td><td>${escapeHtml(h.chartVersion)}</td><td>${escapeHtml(h.namespace)}</td></tr>`
  ).join('');

  el.innerHTML = `
    <div class="env-section-header">Helm Chart Releases (${helmCharts.length})</div>
    <div class="env-section-body">
      <table class="env-table">
        <thead><tr><th>Release</th><th>Chart</th><th>Version</th><th>Namespace</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}
