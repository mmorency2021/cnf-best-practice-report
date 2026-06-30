const { escapeHtml, formatSuiteName, loadCss, buildLightThemeCss } = require('./html-generator');

function buildMetaSpans(meta) {
  if (!meta) return '';
  const parts = [];
  if (meta.cnfVersion) parts.push(meta.cnfVersion);
  if (meta.ocpVersion) parts.push(`OCP ${meta.ocpVersion}`);
  if (meta.certSuiteVersion) parts.push(`Certsuite ${meta.certSuiteVersion}`);
  if (meta.startTime) parts.push(new Date(meta.startTime).toLocaleDateString());
  return parts.map(p => `<span>${escapeHtml(p)}</span>`).join('');
}

function buildComparisonHeaderHtml(metaA, metaB) {
  return `
    <header class="comparison-header">
      <div class="comparison-header-col">
        <span class="comparison-label">Report A</span>
        <div class="comparison-meta">${buildMetaSpans(metaA)}</div>
      </div>
      <div class="comparison-header-vs">vs</div>
      <div class="comparison-header-col">
        <span class="comparison-label">Report B</span>
        <div class="comparison-meta">${buildMetaSpans(metaB)}</div>
      </div>
    </header>`;
}

function buildDeltaSummaryHtml(summary) {
  if (!summary) return '';
  let html = `
    <div class="delta-summary">
      <div class="delta-pill delta-changed">${summary.changed} Changed</div>
      <div class="delta-pill delta-unchanged">${summary.unchanged} Unchanged</div>`;
  if (summary.addedInB) html += `<div class="delta-pill delta-added">${summary.addedInB} Added</div>`;
  if (summary.removedInB) html += `<div class="delta-pill delta-removed">${summary.removedInB} Removed</div>`;
  html += '</div>';
  return html;
}

function buildDeltaIndicator(val, invert) {
  if (val === 0) return '';
  const isGood = invert ? val < 0 : val > 0;
  const cls = isGood ? 'delta-good' : 'delta-bad';
  const sign = val > 0 ? '+' : '';
  return `<span class="delta-indicator ${cls}">${sign}${val}</span>`;
}

function buildComparisonTotalsHtml(totalsA, totalsB, deltaTotals) {
  return `
    <div class="comparison-totals">
      <div class="comp-total-card">
        <div class="comp-total-label">Total</div>
        <div class="comp-total-values">
          <span>${totalsA.total}</span>
          <span class="comp-arrow">&rarr;</span>
          <span>${totalsB.total}</span>
        </div>
      </div>
      <div class="comp-total-card card-passed">
        <div class="comp-total-label">Passed</div>
        <div class="comp-total-values">
          <span>${totalsA.passed}</span>
          <span class="comp-arrow">&rarr;</span>
          <span>${totalsB.passed}</span>
          ${buildDeltaIndicator(deltaTotals.passed, false)}
        </div>
      </div>
      <div class="comp-total-card card-failed">
        <div class="comp-total-label">Failed</div>
        <div class="comp-total-values">
          <span>${totalsA.failed}</span>
          <span class="comp-arrow">&rarr;</span>
          <span>${totalsB.failed}</span>
          ${buildDeltaIndicator(deltaTotals.failed, true)}
        </div>
      </div>
      <div class="comp-total-card card-skipped">
        <div class="comp-total-label">Skipped</div>
        <div class="comp-total-values">
          <span>${totalsA.skipped}</span>
          <span class="comp-arrow">&rarr;</span>
          <span>${totalsB.skipped}</span>
        </div>
      </div>
    </div>`;
}

function buildComparisonFilterBarHtml(comparisonBySuite) {
  const suites = Object.keys(comparisonBySuite).sort();
  const categoryOptions = suites
    .map(s => `<option value="${escapeHtml(s)}">${formatSuiteName(s)}</option>`)
    .join('');

  return `
    <div class="filter-bar">
      <div class="filter-group">
        <label for="comp-filter-category">Category</label>
        <select id="comp-filter-category" class="filter-select">
          <option value="all">All Categories</option>
          ${categoryOptions}
        </select>
      </div>
      <div class="filter-group">
        <label for="comp-filter-change">Change</label>
        <select id="comp-filter-change" class="filter-select">
          <option value="all">All Changes</option>
          <option value="changed">Changed</option>
          <option value="unchanged">Unchanged</option>
          <option value="added">Added</option>
          <option value="removed">Removed</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Priority</label>
        <div class="multi-select" id="comp-filter-priority">
          <button type="button" class="multi-select-toggle filter-select" aria-expanded="false">All Priorities</button>
          <div class="multi-select-menu">
            <label><input type="checkbox" value="0" checked> P0 — Security Critical</label>
            <label><input type="checkbox" value="1" checked> P1 — Host Access</label>
            <label><input type="checkbox" value="2" checked> P2 — Cluster/Scheduling</label>
            <label><input type="checkbox" value="3" checked> P3 — Lifecycle</label>
            <label><input type="checkbox" value="4" checked> P4 — Advisory</label>
          </div>
        </div>
      </div>
    </div>`;
}

function formatCompDetail(d) {
  const parts = [];
  if (d.podName) parts.push(d.podName);
  else if (d.objectType) parts.push(d.objectType);
  if (d.containerName) parts.push('container: ' + d.containerName);
  if (d.namespace) parts.push('ns: ' + d.namespace);
  if (d.reason) parts.push(d.reason);
  if (parts.length > 0) return parts.join(' | ');
  const r = d.reason || JSON.stringify(d);
  return typeof r === 'string' ? r : JSON.stringify(r);
}

function buildStateCell(state) {
  if (!state) return '<span class="status-badge" style="background:#f5f5f5;color:#999">N/A</span>';
  return `<span class="status-badge status-${state}">${state}</span>`;
}

function buildComparisonRowHtml(t) {
  const changeBadge = `<span class="change-badge change-${t.change}">${t.change}</span>`;

  let details = '';
  if (t.stateB === 'failed' && t.failureDetailsB?.length) {
    const items = t.failureDetailsB.map(d => `<li>${escapeHtml(formatCompDetail(d))}</li>`).join('');
    details = `<div class="failure-details"><ul class="fail-list">${items}</ul></div>`;
  } else {
    details = escapeHtml(t.descriptionB || t.descriptionA || '');
  }

  const impact = escapeHtml(t.impactB || t.impactA || '');

  return `
    <tr data-change="${t.change}" data-suite="${escapeHtml(t.suite)}" data-priority="${t.priorityB ?? t.priorityA ?? 4}">
      <td class="test-id">${escapeHtml(t.id)}</td>
      <td>${buildStateCell(t.stateA)}</td>
      <td>${buildStateCell(t.stateB)}</td>
      <td>${changeBadge}</td>
      <td class="impact-cell">${impact}</td>
      <td>${details}</td>
    </tr>`;
}

function buildComparisonSuitesHtml(comparisonBySuite) {
  const suites = Object.keys(comparisonBySuite).sort();
  let html = '';

  for (const suite of suites) {
    const data = comparisonBySuite[suite];
    const changes = { changed: 0, unchanged: 0, added: 0, removed: 0 };
    data.tests.forEach(t => changes[t.change]++);

    const countsHtml = [];
    if (changes.changed) countsHtml.push(`<span class="count-changed">${changes.changed} changed</span>`);
    if (changes.unchanged) countsHtml.push(`<span class="count-skipped">${changes.unchanged} unchanged</span>`);

    const rows = data.tests.map(t => buildComparisonRowHtml(t)).join('');

    html += `
      <div class="suite-section" data-suite="${escapeHtml(suite)}">
        <div class="suite-header" onclick="toggleSuite(this)">
          <h3><span class="toggle-icon">&#9660;</span> ${formatSuiteName(suite)}</h3>
          <div class="suite-counts">${countsHtml.join('')}</div>
        </div>
        <div class="suite-body">
          <table class="test-table comparison-table">
            <thead>
              <tr>
                <th>Test ID</th>
                <th>Report A</th>
                <th>Report B</th>
                <th>Change</th>
                <th>Impact</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  }

  return html;
}

function buildInlineScript() {
  return `
function toggleSuite(header) {
  header.classList.toggle('collapsed');
  header.nextElementSibling.classList.toggle('collapsed');
}

function getCheckedPriorities() {
  var wrapper = document.getElementById('comp-filter-priority');
  if (!wrapper) return null;
  var all = wrapper.querySelectorAll('input[type="checkbox"]');
  var checked = wrapper.querySelectorAll('input[type="checkbox"]:checked');
  if (checked.length === all.length) return null;
  var set = {};
  for (var i = 0; i < checked.length; i++) set[checked[i].value] = true;
  return set;
}

function updatePriorityLabel() {
  var wrapper = document.getElementById('comp-filter-priority');
  if (!wrapper) return;
  var toggle = wrapper.querySelector('.multi-select-toggle');
  var all = wrapper.querySelectorAll('input[type="checkbox"]');
  var checked = wrapper.querySelectorAll('input[type="checkbox"]:checked');
  if (checked.length === all.length) { toggle.textContent = 'All Priorities'; }
  else if (checked.length === 0) { toggle.textContent = 'None'; }
  else { var labels = []; for (var i = 0; i < checked.length; i++) labels.push('P' + checked[i].value); toggle.textContent = labels.join(', '); }
}

function applyComparisonFilters() {
  var category = document.getElementById('comp-filter-category').value;
  var change = document.getElementById('comp-filter-change').value;
  var allowedPriorities = getCheckedPriorities();

  document.querySelectorAll('.suite-section').forEach(function(section) {
    if (category !== 'all' && section.dataset.suite !== category) {
      section.style.display = 'none';
      return;
    }
    section.style.display = '';

    var visibleRows = 0;
    section.querySelectorAll('tbody tr').forEach(function(row) {
      var matchChange = change === 'all' || row.dataset.change === change;
      var matchPriority = !allowedPriorities || !!allowedPriorities[row.dataset.priority];
      var visible = matchChange && matchPriority;
      row.style.display = visible ? '' : 'none';
      if (visible) visibleRows++;
    });

    if (visibleRows === 0) section.style.display = 'none';
  });
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('comp-filter-category').addEventListener('change', applyComparisonFilters);
  document.getElementById('comp-filter-change').addEventListener('change', applyComparisonFilters);

  var pw = document.getElementById('comp-filter-priority');
  if (pw) {
    var ptoggle = pw.querySelector('.multi-select-toggle');
    ptoggle.addEventListener('click', function(e) {
      e.stopPropagation();
      pw.classList.toggle('open');
      ptoggle.setAttribute('aria-expanded', pw.classList.contains('open'));
    });
    pw.querySelectorAll('input[type="checkbox"]').forEach(function(cb) {
      cb.addEventListener('change', function() { updatePriorityLabel(); applyComparisonFilters(); });
    });
    document.addEventListener('click', function(e) {
      if (!pw.contains(e.target)) { pw.classList.remove('open'); ptoggle.setAttribute('aria-expanded', 'false'); }
    });
  }

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

function generate(session) {
  const css = loadCss();
  const { claimDataA, claimDataB, comparison } = session;
  const metaA = claimDataA?.metadata || {};
  const metaB = claimDataB?.metadata || {};
  const totalsA = claimDataA?.totals || { total: 0, passed: 0, failed: 0, skipped: 0 };
  const totalsB = claimDataB?.totals || { total: 0, passed: 0, failed: 0, skipped: 0 };
  const { summary, deltaTotals, comparisonBySuite } = comparison;

  const titleA = escapeHtml(metaA.cnfVersion || 'Report A');
  const titleB = escapeHtml(metaB.cnfVersion || 'Report B');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titleA} vs ${titleB} — Comparison Report</title>
  <style>${css}${buildLightThemeCss()}</style>
</head>
<body>
  <nav class="app-nav">
    <div class="nav-brand">CNF Comparison Report</div>
    <button class="theme-toggle" id="theme-toggle" title="Toggle light/dark mode">&#9789;</button>
  </nav>
  <button class="back-to-top" id="back-to-top" title="Back to top">&#8679;</button>

  <div class="comparison-screen" style="display:block;">
    ${buildComparisonHeaderHtml(metaA, metaB)}

    <div class="comparison-body">
      ${buildDeltaSummaryHtml(summary)}
      ${buildComparisonTotalsHtml(totalsA, totalsB, deltaTotals)}
      ${buildComparisonFilterBarHtml(comparisonBySuite)}
      <div class="test-tables">
        ${buildComparisonSuitesHtml(comparisonBySuite)}
      </div>
    </div>
  </div>

  <script>${buildInlineScript()}</script>
</body>
</html>`;

  return Buffer.from(html, 'utf-8');
}

module.exports = { generate };
