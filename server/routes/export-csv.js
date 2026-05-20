const express = require('express');
const router = express.Router();
const csvGenerator = require('../generators/csv-generator');

router.get('/csv/:sessionId', (req, res) => {
  const sessions = req.app.get('sessions');
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found or expired' });

  try {
    const buffer = csvGenerator.generate(session.claimData);
    const filename = `${session.claimData.metadata.cnfVersion || 'CNF'}-failed-case-summary.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('CSV generation error:', err);
    res.status(500).json({ error: `CSV generation failed: ${err.message}` });
  }
});

module.exports = router;
