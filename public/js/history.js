const historySelection = new Set();

function toggleHistorySelect(reportId, checkbox) {
  if (checkbox.checked) {
    if (historySelection.size >= 2) {
      checkbox.checked = false;
      showToast('Select exactly 2 reports to compare', 'error');
      return;
    }
    historySelection.add(reportId);
  } else {
    historySelection.delete(reportId);
  }
  updateCompareButton();
}

function updateCompareButton() {
  const btn = document.getElementById('btn-compare-history');
  if (!btn) return;
  btn.style.display = historySelection.size > 0 ? '' : 'none';
  btn.disabled = historySelection.size !== 2;
  btn.textContent = `Compare Selected (${historySelection.size})`;
}

async function compareFromHistory() {
  const ids = [...historySelection];
  const btn = document.getElementById('btn-compare-history');
  btn.disabled = true;
  btn.textContent = 'Comparing...';

  try {
    const resp = await fetch('/api/reports/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportIdA: ids[0], reportIdB: ids[1] })
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Comparison failed');

    appState.sessionId = data.sessionId;
    appState.comparisonData = data;
    historySelection.clear();
    showComparisonView(data);
  } catch (err) {
    showToast('Comparison failed: ' + err.message, 'error');
  } finally {
    updateCompareButton();
  }
}

async function loadReportHistory() {
  const listEl = document.getElementById('history-list');
  const storageInfo = document.getElementById('storage-info');

  listEl.innerHTML = '<p class="history-loading">Loading saved reports...</p>';

  try {
    const resp = await fetch('/api/reports');
    if (!resp.ok) throw new Error('Failed to load reports');
    const reports = await resp.json();

    storageInfo.textContent = `${reports.length} saved report${reports.length !== 1 ? 's' : ''}`;

    if (reports.length === 0) {
      listEl.innerHTML = '<p class="history-empty">No saved reports yet. Upload and analyze results, then save them for future reference.</p>';
      return;
    }

    historySelection.clear();
    updateCompareButton();

    listEl.innerHTML = '';
    reports.forEach(report => {
      const card = document.createElement('div');
      card.className = 'history-card';

      const savedDate = new Date(report.savedAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      const totals = report.totals || {};
      card.innerHTML = `
        <label class="history-checkbox">
          <input type="checkbox" aria-label="Select ${escapeHtml(report.name)} for comparison" onchange="toggleHistorySelect('${report.id}', this)">
        </label>
        <div class="history-card-info">
          <h3 class="history-card-title">${escapeHtml(report.name)}</h3>
          <div class="history-card-meta">
            ${report.cnfVersion ? `<span class="history-meta-item">CNF: ${escapeHtml(report.cnfVersion)}</span>` : ''}
            <span class="history-meta-item">Saved: ${savedDate}</span>
          </div>
          <div class="history-card-totals">
            <span class="history-total">${totals.total || 0} tests</span>
            <span class="history-passed">${totals.passed || 0} passed</span>
            <span class="history-failed">${totals.failed || 0} failed</span>
            <span class="history-skipped">${totals.skipped || 0} skipped</span>
          </div>
        </div>
        <div class="history-card-actions">
          <button class="btn btn-primary btn-sm" onclick="loadReport('${report.id}')">Load</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDeleteReport('${report.id}', this)">Delete</button>
        </div>
      `;
      listEl.appendChild(card);
    });
  } catch (err) {
    listEl.innerHTML = `<p class="history-empty history-error">Error loading reports: ${escapeHtml(err.message)}</p>`;
  }
}

async function loadReport(reportId) {
  try {
    const resp = await fetch(`/api/reports/${reportId}`);
    if (!resp.ok) throw new Error('Failed to load report');
    const data = await resp.json();

    appState.sessionId = data.sessionId;
    appState.data = data;
    appState.reportId = data.reportId;
    appState.reportName = data.reportName;

    showDashboard(data);
    showToast('Report loaded successfully');
  } catch (err) {
    showToast('Failed to load report: ' + err.message, 'error');
  }
}

function confirmDeleteReport(reportId, btnEl) {
  if (btnEl.dataset.confirming) {
    deleteReport(reportId);
    return;
  }
  btnEl.dataset.confirming = 'true';
  btnEl.textContent = 'Confirm?';
  btnEl.classList.add('btn-danger-confirm');
  setTimeout(() => {
    btnEl.textContent = 'Delete';
    btnEl.classList.remove('btn-danger-confirm');
    delete btnEl.dataset.confirming;
  }, 3000);
}

async function deleteReport(reportId) {
  try {
    const resp = await fetch(`/api/reports/${reportId}`, { method: 'DELETE' });
    if (!resp.ok) throw new Error('Failed to delete report');
    showToast('Report deleted');
    loadReportHistory();
  } catch (err) {
    showToast('Failed to delete report: ' + err.message, 'error');
  }
}

function openSaveModal() {
  const modal = document.getElementById('save-modal');
  const nameInput = document.getElementById('report-name-input');
  const meta = appState.data?.metadata || {};
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  nameInput.value = `${meta.cnfVersion || 'CNF'} - ${today}`;
  modal.style.display = 'flex';
  nameInput.focus();
  nameInput.select();

  document.getElementById('save-modal-cancel').onclick = () => { modal.style.display = 'none'; };
  document.getElementById('save-modal-confirm').onclick = () => saveReport();

  nameInput.onkeydown = (e) => {
    if (e.key === 'Enter') saveReport();
    if (e.key === 'Escape') modal.style.display = 'none';
  };
}

async function saveReport() {
  const modal = document.getElementById('save-modal');
  const nameInput = document.getElementById('report-name-input');
  const name = nameInput.value.trim();
  if (!name) return;

  const confirmBtn = document.getElementById('save-modal-confirm');
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Saving...';

  try {
    const resp = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: appState.sessionId, name })
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || 'Save failed');
    }

    const result = await resp.json();
    appState.reportId = result.id;
    appState.reportName = name;

    modal.style.display = 'none';
    showToast('Report saved successfully');

    const saveBtn = document.getElementById('btn-save-report');
    if (saveBtn) {
      saveBtn.textContent = 'Saved';
      saveBtn.disabled = true;
    }
  } catch (err) {
    showToast('Failed to save report: ' + err.message, 'error');
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Save';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
