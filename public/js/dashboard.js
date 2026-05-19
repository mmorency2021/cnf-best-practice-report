function renderDashboard(data) {
  renderHeader(data.metadata);
  renderLogWarnings(data.logValidation);
  renderSummaryCards(data.totals);
  renderCategorySummary(data.resultsBySuite);
  renderTestTables(data.resultsBySuite);
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
  container.innerHTML = `
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
    </div>
  `;

  container.querySelectorAll('.summary-card').forEach(card => {
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
          <tbody>${renderTestRows(results)}</tbody>
        </table>
      </div>`;

    container.appendChild(section);
  }
}

function renderTestRows(results) {
  return results.map(r => {
    const statusClass = `status-${r.normalizedState}`;
    const priorityClass = `priority-${r.priority ?? 4}`;
    let detailsCell = '';

    if (r.normalizedState === 'failed' && r.failureDetails) {
      detailsCell = `<div class="failure-details">${escapeHtml(truncate(r.failureDetails, 300))}</div>`;
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

    return `<tr data-status="${r.normalizedState}" data-suite="${r.suite}" data-scenario='${JSON.stringify(r.scenarios || {})}'>
      <td class="test-id">${escapeHtml(r.id)}</td>
      <td><span class="status-badge ${statusClass}">${r.normalizedState}</span></td>
      <td>${escapeHtml(r.description || '')}</td>
      <td>${detailsCell}</td>
      <td><span class="priority-badge ${priorityClass}">${r.priority ?? '-'}</span></td>
    </tr>`;
  }).join('');
}

function toggleSuite(header) {
  header.classList.toggle('collapsed');
  const body = header.nextElementSibling;
  body.classList.toggle('collapsed');
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

function truncate(str, max) {
  if (!str || str.length <= max) return str;
  return str.slice(0, max) + '...';
}
