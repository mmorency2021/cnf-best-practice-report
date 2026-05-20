const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

router.post('/reports', (req, res) => {
  const store = req.app.get('store');
  const sessions = req.app.get('sessions');
  const { sessionId, name } = req.body || {};

  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found or expired' });

  const meta = session.claimData?.metadata || {};
  const reportName = name || `${meta.cnfVersion || 'CNF'} - ${new Date().toLocaleDateString()}`;

  try {
    const result = store.save({ name: reportName, sessionData: session });
    res.json(result);
  } catch (err) {
    console.error('Save report error:', err);
    res.status(500).json({ error: `Failed to save report: ${err.message}` });
  }
});

router.get('/reports', (req, res) => {
  const store = req.app.get('store');
  try {
    res.json(store.list());
  } catch (err) {
    console.error('List reports error:', err);
    res.status(500).json({ error: `Failed to list reports: ${err.message}` });
  }
});

router.get('/reports/:id', (req, res) => {
  const store = req.app.get('store');
  const sessions = req.app.get('sessions');

  try {
    const report = store.get(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const sessionId = uuidv4();
    sessions.set(sessionId, report.sessionData);

    const sd = report.sessionData;
    res.json({
      sessionId,
      metadata: sd.claimData?.metadata,
      totals: sd.claimData?.totals,
      resultsBySuite: sd.claimData?.resultsBySuite,
      results: sd.claimData?.results,
      environment: sd.claimData?.environment,
      logValidation: sd.logValidation,
      clusterData: sd.clusterData,
      reportId: report.id,
      reportName: report.name
    });
  } catch (err) {
    console.error('Load report error:', err);
    res.status(500).json({ error: `Failed to load report: ${err.message}` });
  }
});

router.delete('/reports/:id', (req, res) => {
  const store = req.app.get('store');
  try {
    const deleted = store.delete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Report not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete report error:', err);
    res.status(500).json({ error: `Failed to delete report: ${err.message}` });
  }
});

module.exports = router;
