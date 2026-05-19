const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const claimParser = require('../parsers/claim-parser');
const logValidator = require('../parsers/log-validator');
const clusterParser = require('../parsers/cluster-parser');
const catalogMapper = require('../parsers/catalog-mapper');
const skipAnalyzer = require('../parsers/skip-analyzer');

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 }
});

const fileFields = upload.fields([
  { name: 'claim', maxCount: 1 },
  { name: 'log', maxCount: 1 },
  { name: 'cluster', maxCount: 1 },
  { name: 'skipRules', maxCount: 1 }
]);

router.post('/upload', fileFields, async (req, res) => {
  try {
    const claimFile = req.files?.claim?.[0];
    if (!claimFile) {
      return res.status(400).json({ error: 'claim.json is required' });
    }

    const sessionId = uuidv4();

    // 1. Parse claim
    const claimData = claimParser.parse(claimFile.path, claimFile.originalname);

    // 2. Enrich with catalog
    claimData.results = catalogMapper.enrich(claimData.results);

    // 3. Analyze skips
    const skipRulesFile = req.files?.skipRules?.[0];
    const skipAnalysis = skipAnalyzer.analyze(
      claimData.results,
      claimData.metadata,
      skipRulesFile?.path || null
    );
    const skipMap = {};
    for (const sa of skipAnalysis) {
      skipMap[sa.testId] = sa;
    }
    claimData.results = claimData.results.map(r => ({
      ...r,
      skipAnalysis: skipMap[r.id] || null
    }));

    // Rebuild resultsBySuite with enriched data
    claimData.resultsBySuite = {};
    for (const result of claimData.results) {
      if (!claimData.resultsBySuite[result.suite]) claimData.resultsBySuite[result.suite] = [];
      claimData.resultsBySuite[result.suite].push(result);
    }

    // 4. Validate log
    let logValidation = { healthy: true, warnings: [], stats: {} };
    const logFile = req.files?.log?.[0];
    if (logFile) {
      logValidation = await logValidator.validate(logFile.path);
    }

    // 5. Parse cluster
    let clusterData = null;
    const clusterFile = req.files?.cluster?.[0];
    if (clusterFile) {
      try {
        clusterData = clusterParser.parse(clusterFile.path);
      } catch (err) {
        clusterData = { error: `Failed to parse cluster file: ${err.message}` };
      }
    }

    // Store session
    const sessions = req.app.get('sessions');
    sessions.set(sessionId, {
      createdAt: Date.now(),
      claimData,
      logValidation,
      clusterData
    });

    res.json({
      sessionId,
      metadata: claimData.metadata,
      totals: claimData.totals,
      resultsBySuite: claimData.resultsBySuite,
      results: claimData.results,
      logValidation,
      clusterData
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: `Processing failed: ${err.message}` });
  }
});

module.exports = router;
