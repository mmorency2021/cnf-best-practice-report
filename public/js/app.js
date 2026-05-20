let appState = {
  sessionId: null,
  data: null,
  currentView: 'upload',
  reportId: null,
  reportName: null
};

document.addEventListener('DOMContentLoaded', () => {
  initUploadForm();
  initDropZones();
  document.getElementById('btn-new-report')?.addEventListener('click', showUploadScreen);
});

function initDropZones() {
  document.querySelectorAll('.drop-zone').forEach(zone => {
    const inputId = zone.dataset.input;
    const input = document.getElementById(inputId);
    if (!input) return;

    zone.addEventListener('click', () => input.click());

    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));

    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      if (e.dataTransfer.files.length) {
        input.files = e.dataTransfer.files;
        updateDropZone(zone, e.dataTransfer.files[0]);
        checkUploadReady();
      }
    });

    input.addEventListener('change', () => {
      if (input.files.length) {
        updateDropZone(zone, input.files[0]);
        checkUploadReady();
      }
    });
  });
}

function updateDropZone(zone, file) {
  zone.classList.add('has-file');
  const fileLabel = zone.querySelector('.drop-zone-file');
  if (fileLabel) fileLabel.textContent = file.name;
}

function checkUploadReady() {
  const claimInput = document.getElementById('claim-file');
  const btn = document.getElementById('upload-btn');
  btn.disabled = !(claimInput && claimInput.files.length > 0);
}

function initUploadForm() {
  const form = document.getElementById('upload-form');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('upload-btn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoading = btn.querySelector('.btn-loading');
    const errorDiv = document.getElementById('upload-error');

    btn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    errorDiv.style.display = 'none';

    const formData = new FormData();
    const claimFile = document.getElementById('claim-file').files[0];
    if (claimFile) formData.append('claim', claimFile);

    const logFile = document.getElementById('log-file').files[0];
    if (logFile) formData.append('log', logFile);

    const clusterFile = document.getElementById('cluster-file').files[0];
    if (clusterFile) formData.append('cluster', clusterFile);

    const skipFile = document.getElementById('skip-rules-file').files[0];
    if (skipFile) formData.append('skipRules', skipFile);

    try {
      const resp = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Upload failed');

      appState.sessionId = data.sessionId;
      appState.data = data;
      appState.reportId = null;
      appState.reportName = null;
      showDashboard(data);
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

function showDashboard(data) {
  document.getElementById('upload-screen').style.display = 'none';
  document.getElementById('history-screen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  appState.currentView = 'dashboard';
  updateNavState();

  renderDashboard(data);
  initFilters(data);
  renderClusterPanel(data.clusterData);
  initExportButtons(appState.sessionId);
}

function showUploadScreen() {
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('history-screen').style.display = 'none';
  document.getElementById('upload-screen').style.display = 'flex';
  document.getElementById('upload-form').reset();
  document.querySelectorAll('.drop-zone').forEach(z => {
    z.classList.remove('has-file');
    const fl = z.querySelector('.drop-zone-file');
    if (fl) fl.textContent = '';
  });
  checkUploadReady();
  appState.sessionId = null;
  appState.data = null;
  appState.reportId = null;
  appState.reportName = null;
  appState.currentView = 'upload';
  updateNavState();
}

function showHistoryScreen() {
  document.getElementById('upload-screen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('history-screen').style.display = 'block';
  appState.currentView = 'history';
  updateNavState();
  loadReportHistory();
}

function updateNavState() {
  document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
  if (appState.currentView === 'upload' || appState.currentView === 'dashboard') {
    document.getElementById('nav-upload')?.classList.add('active');
  } else if (appState.currentView === 'history') {
    document.getElementById('nav-history')?.classList.add('active');
  }
}

function showToast(message, type) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast toast-' + (type || 'success');
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3000);
}
