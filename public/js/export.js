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

function downloadExport(type, sessionId) {
  if (!sessionId) return;
  const a = document.createElement('a');
  a.href = `/api/export/${type}/${sessionId}`;
  a.download = '';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
