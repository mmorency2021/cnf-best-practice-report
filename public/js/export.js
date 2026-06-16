function initExportButtons(sessionId) {
  const pptx = document.getElementById('btn-export-pptx');
  const xlsx = document.getElementById('btn-export-xlsx');
  const csv = document.getElementById('btn-export-csv');
  const html = document.getElementById('btn-export-html');
  pptx.onclick = () => downloadExport('pptx', sessionId, pptx);
  xlsx.onclick = () => downloadExport('xlsx', sessionId, xlsx);
  csv.onclick = () => downloadExport('csv', sessionId, csv);
  html.onclick = () => downloadExport('html', sessionId, html);

  const saveBtn = document.getElementById('btn-save-report');
  if (saveBtn) {
    if (appState.reportId) {
      saveBtn.textContent = 'Saved';
      saveBtn.disabled = true;
    } else {
      saveBtn.textContent = 'Save Report';
      saveBtn.disabled = false;
      saveBtn.onclick = () => openSaveModal();
    }
  }
}

function initComparisonExportButtons(sessionId) {
  const xlsxBtn = document.getElementById('btn-comp-export-xlsx');
  const htmlBtn = document.getElementById('btn-comp-export-html');
  if (xlsxBtn) xlsxBtn.onclick = () => downloadExport('xlsx', sessionId, xlsxBtn);
  if (htmlBtn) htmlBtn.onclick = () => downloadExport('html', sessionId, htmlBtn);
}

async function downloadExport(type, sessionId, triggerBtn) {
  if (!sessionId) return;

  if (triggerBtn) {
    triggerBtn.classList.add('is-loading');
    const label = triggerBtn.querySelector('.btn-label');
    const origText = label?.textContent;
    if (label) label.textContent = 'Exporting...';
    triggerBtn._origText = origText;
  }

  try {
    let exportUrl = `/api/export/${type}/${sessionId}`;
    const selectedPriorities = typeof getSelectedPriorities === 'function' ? getSelectedPriorities('filter-priority') || getSelectedPriorities('comp-filter-priority') : null;
    if (selectedPriorities) {
      exportUrl += '?priorities=' + Array.from(selectedPriorities).join(',');
    }
    const resp = await fetch(exportUrl);
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'Export failed' }));
      throw new Error(err.error || 'Export failed');
    }
    const blob = await resp.blob();
    const disposition = resp.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : `report.${type}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    showToast('Export failed: ' + err.message, 'error');
  } finally {
    if (triggerBtn) {
      triggerBtn.classList.remove('is-loading');
      const label = triggerBtn.querySelector('.btn-label');
      if (label && triggerBtn._origText) label.textContent = triggerBtn._origText;
    }
  }
}
