function initExportButtons(sessionId) {
  document.getElementById('btn-export-pptx').onclick = () => downloadExport('pptx', sessionId);
  document.getElementById('btn-export-xlsx').onclick = () => downloadExport('xlsx', sessionId);
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
