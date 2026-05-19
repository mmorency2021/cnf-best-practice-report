const express = require('express');
const router = express.Router();
const pptxGenerator = require('../generators/pptx-generator');

router.get('/pptx/:sessionId', async (req, res) => {
  const sessions = req.app.get('sessions');
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found or expired' });

  try {
    const buffer = await pptxGenerator.generate(session.claimData);
    const filename = `${session.claimData.metadata.cnfVersion || 'CNF'}-certsuite-results.pptx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('PPTX generation error:', err);
    res.status(500).json({ error: `PPTX generation failed: ${err.message}` });
  }
});

module.exports = router;
