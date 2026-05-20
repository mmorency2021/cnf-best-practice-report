const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const claimParser = require('../parsers/claim-parser');
const logValidator = require('../parsers/log-validator');
const clusterParser = require('../parsers/cluster-parser');
const catalogMapper = require('../parsers/catalog-mapper');
const skipAnalyzer = require('../parsers/skip-analyzer');
const comparator = require('../parsers/comparator');

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 }
});

const compareFields = upload.fields([
  { name: 'claim_a', maxCount: 1 },
  { name: 'log_a', maxCount: 1 },
  { name: 'cluster_a', maxCount: 1 },
  { name: 'skipRules_a', maxCount: 1 },
  { name: 'claim_b', maxCount: 1 },
  { name: 'log_b', maxCount: 1 },
  { name: 'cluster_b', maxCount: 1 },
  { name: 'skipRules_b', maxCount: 1 }
]);

function processClaimSet(files, prefix) {
  const claimFile = files?.[`claim_${prefix}`]?.[0];
  if (!claimFile) throw new Error(`claim_${prefix} is required`);

  const claimData = claimParser.parse(claimFile.path, claimFile.originalname);
  claimData.results = catalogMapper.enrich(claimData.results);

  const skipRulesFile = files?.[`skipRules_${prefix}`]?.[0];
  const skipAnalysis = skipAnalyzer.analyze(
    claimData.results,
    claimData.metadata,
    skipRulesFile?.path || null
  );
  const skipMap = {};
  for (const sa of skipAnalysis) skipMap[sa.testId] = sa;
  claimData.results = claimData.results.map(r => ({
    ...r,
    skipAnalysis: skipMap[r.id] || null
  }));

  claimData.resultsBySuite = {};
  for (const result of claimData.results) {
    if (!claimData.resultsBySuite[result.suite]) claimData.resultsBySuite[result.suite] = [];
    claimData.resultsBySuite[result.suite].push(result);
  }

  return claimData;
}

async function processOptionalFiles(files, prefix) {
  let logValidation = { healthy: true, warnings: [], stats: {} };
  const logFile = files?.[`log_${prefix}`]?.[0];
  if (logFile) {
    logValidation = await logValidator.validate(logFile.path);
  }

  let clusterData = null;
  const clusterFile = files?.[`cluster_${prefix}`]?.[0];
  if (clusterFile) {
    try {
      clusterData = clusterParser.parse(clusterFile.path);
    } catch (err) {
      clusterData = { error: `Failed to parse cluster file: ${err.message}` };
    }
  }

  return { logValidation, clusterData };
}

router.post('/compare', compareFields, async (req, res) => {
  try {
    if (!req.files?.claim_a?.[0] || !req.files?.claim_b?.[0]) {
      return res.status(400).json({ error: 'Both claim_a and claim_b files are required' });
    }

    const sessionId = uuidv4();

    const claimDataA = processClaimSet(req.files, 'a');
    const claimDataB = processClaimSet(req.files, 'b');

    const [optA, optB] = await Promise.all([
      processOptionalFiles(req.files, 'a'),
      processOptionalFiles(req.files, 'b')
    ]);

    const comparison = comparator.compare(claimDataA, claimDataB);

    const sessions = req.app.get('sessions');
    sessions.set(sessionId, {
      createdAt: Date.now(),
      type: 'comparison',
      claimDataA,
      claimDataB,
      comparison,
      logValidationA: optA.logValidation,
      logValidationB: optB.logValidation,
      clusterDataA: optA.clusterData,
      clusterDataB: optB.clusterData
    });

    res.json({
      sessionId,
      metadataA: claimDataA.metadata,
      metadataB: claimDataB.metadata,
      totalsA: claimDataA.totals,
      totalsB: claimDataB.totals,
      ...comparison,
      logValidationA: optA.logValidation,
      logValidationB: optB.logValidation,
      clusterDataA: optA.clusterData,
      clusterDataB: optB.clusterData
    });
  } catch (err) {
    console.error('Compare error:', err);
    res.status(500).json({ error: `Comparison failed: ${err.message}` });
  }
});

module.exports = router;
