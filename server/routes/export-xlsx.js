const express = require('express');
const router = express.Router();
const xlsxGenerator = require('../generators/xlsx-generator');
const comparisonXlsxGenerator = require('../generators/comparison-xlsx-generator');

router.get('/xlsx/:sessionId', async (req, res) => {
  const sessions = req.app.get('sessions');
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found or expired' });

  try {
    if (session.type === 'comparison') {
      const buffer = await comparisonXlsxGenerator.generate(session);
      const vA = session.claimDataA?.metadata?.cnfVersion || 'ReportA';
      const vB = session.claimDataB?.metadata?.cnfVersion || 'ReportB';
      const filename = `${vA}-vs-${vB}-comparison.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    }

    const buffer = await xlsxGenerator.generate(session.claimData);
    const filename = `${session.claimData.metadata.cnfVersion || 'CNF'}-failed-case-summary.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('XLSX generation error:', err);
    res.status(500).json({ error: `XLSX generation failed: ${err.message}` });
  }
});

module.exports = router;
