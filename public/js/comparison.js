document.addEventListener('DOMContentLoaded', () => {
  initCompareForm();
  initCompareDropZones();
});

function setUploadMode(mode) {
  appState.compareMode = (mode === 'compare');
  document.getElementById('mode-single').classList.toggle('active', mode === 'single');
  document.getElementById('mode-compare').classList.toggle('active', mode === 'compare');
  document.getElementById('upload-form').style.display = mode === 'single' ? '' : 'none';
  document.getElementById('compare-form').style.display = mode === 'compare' ? '' : 'none';
}

function initCompareDropZones() {
  document.querySelectorAll('#compare-form .drop-zone').forEach(zone => {
    const inputId = zone.dataset.input;
    const input = document.getElementById(inputId);
    if (!input) return;

    zone.addEventListener('click', () => input.click());
    zone.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      if (e.dataTransfer.files.length) {
        input.files = e.dataTransfer.files;
        updateDropZone(zone, e.dataTransfer.files[0]);
        checkCompareReady();
      }
    });
    input.addEventListener('change', () => {
      if (input.files.length) {
        updateDropZone(zone, input.files[0]);
        checkCompareReady();
      }
    });
  });
}

function checkCompareReady() {
  const a = document.getElementById('claim-file-a');
  const b = document.getElementById('claim-file-b');
  const btn = document.getElementById('compare-btn');
  btn.disabled = !(a?.files.length > 0 && b?.files.length > 0);
}

function initCompareForm() {
  const form = document.getElementById('compare-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('compare-btn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoading = btn.querySelector('.btn-loading');
    const errorDiv = document.getElementById('upload-error');

    btn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    errorDiv.style.display = 'none';

    const formData = new FormData();
    const fields = ['claim-file-a:claim_a', 'log-file-a:log_a', 'claim-file-b:claim_b', 'log-file-b:log_b'];
    for (const entry of fields) {
      const [inputId, fieldName] = entry.split(':');
      const file = document.getElementById(inputId)?.files[0];
      if (file) formData.append(fieldName, file);
    }

    try {
      const resp = await fetch('/api/compare', { method: 'POST', body: formData });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Comparison failed');

      appState.sessionId = data.sessionId;
      appState.comparisonData = data;
      showComparisonView(data);
    } catch (err) {
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'block';
    } finally {
      btn.disabled = false;
      btnText.style.display = 'inline';
      btnLoading.style.display = 'none';
    }
  });
}

function showComparisonView(data) {
  document.getElementById('upload-screen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('history-screen').style.display = 'none';
  document.getElementById('comparison-screen').style.display = 'block';
  appState.currentView = 'comparison';
  updateNavState();

  renderComparisonHeader(data.metadataA, data.metadataB);
  renderDeltaSummary(data.summary);
  renderComparisonTotals(data.totalsA, data.totalsB, data.deltaTotals);
  renderComparisonBySuite(data.comparisonBySuite);
  initComparisonFilters(data.comparisonBySuite);
  initComparisonExportButtons(appState.sessionId);
}

function renderComparisonHeader(metaA, metaB) {
  const renderMeta = (meta) => {
    if (!meta) return '';
    const parts = [];
    if (meta.cnfVersion) parts.push(meta.cnfVersion);
    if (meta.ocpVersion) parts.push(`OCP ${meta.ocpVersion}`);
    if (meta.certSuiteVersion) parts.push(`Certsuite ${meta.certSuiteVersion}`);
    if (meta.startTime) parts.push(new Date(meta.startTime).toLocaleDateString());
    return parts.map(p => `<span>${escapeHtml(p)}</span>`).join('');
  };
  document.getElementById('comp-meta-a').innerHTML = renderMeta(metaA);
  document.getElementById('comp-meta-b').innerHTML = renderMeta(metaB);
}

function renderDeltaSummary(summary) {
  if (!summary) return;
  const el = document.getElementById('delta-summary');
  el.innerHTML = `
    <div class="delta-pill delta-changed">${summary.changed} Changed</div>
    <div class="delta-pill delta-unchanged">${summary.unchanged} Unchanged</div>
    ${summary.addedInB ? `<div class="delta-pill delta-added">${summary.addedInB} Added</div>` : ''}
    ${summary.removedInB ? `<div class="delta-pill delta-removed">${summary.removedInB} Removed</div>` : ''}
  `;
}

function renderComparisonTotals(totalsA, totalsB, deltaTotals) {
  const el = document.getElementById('comparison-totals');
  const delta = (val, invert) => {
    if (val === 0) return '';
    const isGood = invert ? val < 0 : val > 0;
    const cls = isGood ? 'delta-good' : 'delta-bad';
    const sign = val > 0 ? '+' : '';
    return `<span class="delta-indicator ${cls}">${sign}${val}</span>`;
  };

  el.innerHTML = `
    <div class="comp-total-card">
      <div class="comp-total-label">Total</div>
      <div class="comp-total-values">
        <span>${totalsA.total}</span>
        <span class="comp-arrow">→</span>
        <span>${totalsB.total}</span>
      </div>
    </div>
    <div class="comp-total-card card-passed">
      <div class="comp-total-label">Passed</div>
      <div class="comp-total-values">
        <span>${totalsA.passed}</span>
        <span class="comp-arrow">→</span>
        <span>${totalsB.passed}</span>
        ${delta(deltaTotals.passed, false)}
      </div>
    </div>
    <div class="comp-total-card card-failed">
      <div class="comp-total-label">Failed</div>
      <div class="comp-total-values">
        <span>${totalsA.failed}</span>
        <span class="comp-arrow">→</span>
        <span>${totalsB.failed}</span>
        ${delta(deltaTotals.failed, true)}
      </div>
    </div>
    <div class="comp-total-card card-skipped">
      <div class="comp-total-label">Skipped</div>
      <div class="comp-total-values">
        <span>${totalsA.skipped}</span>
        <span class="comp-arrow">→</span>
        <span>${totalsB.skipped}</span>
      </div>
    </div>
  `;
}

function renderComparisonBySuite(comparisonBySuite) {
  const container = document.getElementById('comparison-suites');
  container.innerHTML = '';

  for (const [suite, data] of Object.entries(comparisonBySuite)) {
    const section = document.createElement('div');
    section.className = 'suite-section';
    section.dataset.suite = suite;

    const changes = { changed: 0, unchanged: 0, added: 0, removed: 0 };
    data.tests.forEach(t => changes[t.change]++);

    const countsHtml = [];
    if (changes.changed) countsHtml.push(`<span class="count-changed">${changes.changed} changed</span>`);
    if (changes.unchanged) countsHtml.push(`<span class="count-skipped">${changes.unchanged} unchanged</span>`);

    section.innerHTML = `
      <div class="suite-header" role="button" tabindex="0" aria-expanded="true">
        <h3><span class="toggle-icon">&#9660;</span> ${escapeHtml(suite)}</h3>
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
          <tbody>
            ${data.tests.map(t => renderComparisonRow(t)).join('')}
          </tbody>
        </table>
      </div>
    `;
    const header = section.querySelector('.suite-header');
    header.addEventListener('click', () => toggleSuite(header));
    header.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSuite(header); }
    });
    container.appendChild(section);
  }
}

function renderComparisonRow(t) {
  const stateCell = (state) => {
    if (!state) return '<span class="status-badge status-na">N/A</span>';
    return `<span class="status-badge status-${state}">${state}</span>`;
  };

  const changeBadge = `<span class="change-badge change-${t.change}">${t.change}</span>`;

  let details = '';
  if (t.stateB === 'failed' && t.failureDetailsB?.length) {
    const items = t.failureDetailsB.map(d => `<li>${escapeHtml(formatFailureDetail(d))}</li>`).join('');
    details = `<div class="failure-details"><ul class="fail-list">${items}</ul></div>`;
  }

  const impact = escapeHtml(t.impactB || t.impactA || '');

  return `
    <tr data-change="${t.change}" data-suite="${t.suite}" data-priority="${t.priorityB ?? t.priorityA ?? 4}">
      <td class="test-id">${escapeHtml(t.id)}</td>
      <td>${stateCell(t.stateA)}</td>
      <td>${stateCell(t.stateB)}</td>
      <td>${changeBadge}</td>
      <td class="impact-cell">${impact}</td>
      <td>${details || (t.descriptionB || t.descriptionA || '')}</td>
    </tr>
  `;
}

function initComparisonFilters(comparisonBySuite) {
  const catSelect = document.getElementById('comp-filter-category');
  catSelect.innerHTML = '<option value="all">All Categories</option>';
  for (const suite of Object.keys(comparisonBySuite).sort()) {
    const opt = document.createElement('option');
    opt.value = suite;
    opt.textContent = suite;
    catSelect.appendChild(opt);
  }

  catSelect.onchange = applyComparisonFilters;
  document.getElementById('comp-filter-change').onchange = applyComparisonFilters;
  initMultiSelect('comp-filter-priority', applyComparisonFilters);
}

function applyComparisonFilters() {
  const category = document.getElementById('comp-filter-category').value;
  const change = document.getElementById('comp-filter-change').value;
  const allowedPriorities = getSelectedPriorities('comp-filter-priority');

  document.querySelectorAll('#comparison-suites .suite-section').forEach(section => {
    if (category !== 'all' && section.dataset.suite !== category) {
      section.style.display = 'none';
      return;
    }
    section.style.display = '';

    let visibleRows = 0;
    section.querySelectorAll('tbody tr').forEach(row => {
      const matchChange = change === 'all' || row.dataset.change === change;
      const matchPriority = !allowedPriorities || allowedPriorities.has(Number(row.dataset.priority));
      row.style.display = matchChange && matchPriority ? '' : 'none';
      if (matchChange && matchPriority) visibleRows++;
    });

    if (visibleRows === 0) section.style.display = 'none';
  });
}

function escapeCompHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
