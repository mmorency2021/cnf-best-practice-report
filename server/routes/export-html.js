const express = require('express');
const router = express.Router();
const htmlGenerator = require('../generators/html-generator');

router.get('/html/:sessionId', (req, res) => {
  const sessions = req.app.get('sessions');
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found or expired' });

  try {
    const buffer = htmlGenerator.generate(session.claimData);
    const filename = `${session.claimData.metadata.cnfVersion || 'CNF'}-best-practice-report.html`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('HTML generation error:', err);
    res.status(500).json({ error: `HTML generation failed: ${err.message}` });
  }
});

module.exports = router;
