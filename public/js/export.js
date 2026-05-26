function initExportButtons(sessionId) {
  document.getElementById('btn-export-pptx').onclick = () => downloadExport('pptx', sessionId);
  document.getElementById('btn-export-xlsx').onclick = () => downloadExport('xlsx', sessionId);
  document.getElementById('btn-export-csv').onclick = () => downloadExport('csv', sessionId);
  document.getElementById('btn-export-html').onclick = () => downloadExport('html', sessionId);

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
  if (xlsxBtn) xlsxBtn.onclick = () => downloadExport('xlsx', sessionId);
  if (htmlBtn) htmlBtn.onclick = () => downloadExport('html', sessionId);
}

async function downloadExport(type, sessionId) {
  if (!sessionId) return;
  try {
    const resp = await fetch(`/api/export/${type}/${sessionId}`);
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
  }
}
