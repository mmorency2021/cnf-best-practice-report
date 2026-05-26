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
      <div class="delta-pill delta-improved">${summary.improved} Improved</div>
      <div class="delta-pill delta-regressed">${summary.regressed} Regressed</div>
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
          <option value="regressed">Regressed</option>
          <option value="improved">Improved</option>
          <option value="unchanged">Unchanged</option>
          <option value="added">Added</option>
          <option value="removed">Removed</option>
        </select>
      </div>
    </div>`;
}

function buildStateCell(state) {
  if (!state) return '<span class="status-badge" style="background:#f5f5f5;color:#999">N/A</span>';
  return `<span class="status-badge status-${state}">${state}</span>`;
}

function buildComparisonRowHtml(t) {
  const changeBadge = `<span class="change-badge change-${t.change}">${t.change}</span>`;

  let details = '';
  if (t.change === 'regressed' && t.failureDetailsB?.length) {
    const firstFail = t.failureDetailsB[0];
    const reason = firstFail.reason || JSON.stringify(firstFail);
    details = `<div class="failure-details">${escapeHtml(typeof reason === 'string' ? reason : JSON.stringify(reason))}</div>`;
  } else if (t.change === 'improved' && t.failureDetailsA?.length) {
    const firstFail = t.failureDetailsA[0];
    const reason = firstFail.reason || JSON.stringify(firstFail);
    details = `<div class="remediation-box">Was: ${escapeHtml(typeof reason === 'string' ? reason : JSON.stringify(reason))}</div>`;
  } else {
    details = escapeHtml(t.descriptionB || t.descriptionA || '');
  }

  return `
    <tr data-change="${t.change}" data-suite="${escapeHtml(t.suite)}">
      <td class="test-id">${escapeHtml(t.id)}</td>
      <td>${buildStateCell(t.stateA)}</td>
      <td>${buildStateCell(t.stateB)}</td>
      <td>${changeBadge}</td>
      <td>${details}</td>
    </tr>`;
}

function buildComparisonSuitesHtml(comparisonBySuite) {
  const suites = Object.keys(comparisonBySuite).sort();
  let html = '';

  for (const suite of suites) {
    const data = comparisonBySuite[suite];
    const changes = { improved: 0, regressed: 0, unchanged: 0, added: 0, removed: 0 };
    data.tests.forEach(t => changes[t.change]++);

    const countsHtml = [];
    if (changes.regressed) countsHtml.push(`<span class="count-failed">${changes.regressed} regressed</span>`);
    if (changes.improved) countsHtml.push(`<span class="count-passed">${changes.improved} improved</span>`);
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

function applyComparisonFilters() {
  var category = document.getElementById('comp-filter-category').value;
  var change = document.getElementById('comp-filter-change').value;

  document.querySelectorAll('.suite-section').forEach(function(section) {
    if (category !== 'all' && section.dataset.suite !== category) {
      section.style.display = 'none';
      return;
    }
    section.style.display = '';

    var visibleRows = 0;
    section.querySelectorAll('tbody tr').forEach(function(row) {
      var matchChange = change === 'all' || row.dataset.change === change;
      row.style.display = matchChange ? '' : 'none';
      if (matchChange) visibleRows++;
    });

    if (visibleRows === 0) section.style.display = 'none';
  });
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('comp-filter-category').addEventListener('change', applyComparisonFilters);
  document.getElementById('comp-filter-change').addEventListener('change', applyComparisonFilters);

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
