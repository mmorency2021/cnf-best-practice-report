const express = require('express');
const router = express.Router();
const htmlGenerator = require('../generators/html-generator');
const comparisonHtmlGenerator = require('../generators/comparison-html-generator');

function filterByPriority(claimData, priorities) {
  if (!priorities) return claimData;
  const pSet = new Set(priorities.split(',').map(Number));
  const filtered = { ...claimData };
  filtered.results = (claimData.results || []).filter(r => pSet.has(r.priority ?? 4));
  const rbs = {};
  for (const [suite, tests] of Object.entries(claimData.resultsBySuite || {})) {
    const ft = tests.filter(r => pSet.has(r.priority ?? 4));
    if (ft.length > 0) rbs[suite] = ft;
  }
  filtered.resultsBySuite = rbs;
  filtered.totals = {
    total: filtered.results.length,
    passed: filtered.results.filter(r => r.normalizedState === 'passed').length,
    failed: filtered.results.filter(r => r.normalizedState === 'failed').length,
    skipped: filtered.results.filter(r => r.normalizedState === 'skipped').length
  };
  return filtered;
}

router.get('/html/:sessionId', (req, res) => {
  const sessions = req.app.get('sessions');
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found or expired' });

  try {
    if (session.type === 'comparison') {
      const buffer = comparisonHtmlGenerator.generate(session);
      const vA = session.claimDataA?.metadata?.cnfVersion || 'ReportA';
      const vB = session.claimDataB?.metadata?.cnfVersion || 'ReportB';
      const filename = `${vA}-vs-${vB}-comparison.html`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    }

    const data = filterByPriority(session.claimData, req.query.priorities);
    const buffer = htmlGenerator.generate(data);
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
