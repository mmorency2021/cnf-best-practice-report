const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const claimParser = require('../parsers/claim-parser');
const logValidator = require('../parsers/log-validator');
const catalogMapper = require('../parsers/catalog-mapper');
const skipAnalyzer = require('../parsers/skip-analyzer');

const fs = require('fs');
const ExcelJS = require('exceljs');

const router = express.Router();

function parsePriorityCSV(filePath) {
  const overrides = {};
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim() || line.startsWith('test_id') || line.startsWith('#')) continue;
    const cols = line.split(',');
    const testId = (cols[0] || '').trim();
    const priority = parseInt((cols[3] || cols[1] || '').trim(), 10);
    if (testId && !isNaN(priority) && priority >= 0 && priority <= 4) {
      overrides[testId] = priority;
    }
  }
  return Object.keys(overrides).length > 0 ? overrides : null;
}

async function parsePriorityXLSX(filePath) {
  const overrides = {};
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  if (!sheet) return null;

  let priorityCol = -1;
  let testIdCol = 0;
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    const val = String(cell.value || '').toLowerCase().trim();
    if (val === 'priority') priorityCol = colNumber;
    if (val === 'test_id' || val === 'test id' || val === 'testid') testIdCol = colNumber;
  });

  if (priorityCol === -1) priorityCol = testIdCol + 1;

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const testId = String(row.getCell(testIdCol).value ?? '').trim();
    const rawVal = row.getCell(priorityCol).value;
    const priority = parseInt(String(rawVal ?? ''), 10);
    if (testId && !isNaN(priority) && priority >= 0 && priority <= 4) {
      overrides[testId] = priority;
    }
  });
  return Object.keys(overrides).length > 0 ? overrides : null;
}

async function parsePriorityFile(filePath, originalName) {
  const ext = path.extname(originalName || filePath).toLowerCase();
  if (ext === '.xlsx' || ext === '.xls') {
    return parsePriorityXLSX(filePath);
  }
  return parsePriorityCSV(filePath);
}

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
  { name: 'priorityMapping', maxCount: 1 }
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

    // Override cnfVersion if user provided a CNF name
    const cnfName = (req.body.cnfName || '').trim();
    if (cnfName) {
      claimData.metadata.cnfVersion = cnfName;
    }

    // 2. Enrich with catalog (apply priority overrides if uploaded)
    let priorityOverrides = null;
    const priorityFile = req.files?.priorityMapping?.[0];
    if (priorityFile) {
      priorityOverrides = await parsePriorityFile(priorityFile.path, priorityFile.originalname);
    }
    claimData.results = catalogMapper.enrich(claimData.results, priorityOverrides);

    // 3. Analyze skips
    const skipAnalysis = skipAnalyzer.analyze(
      claimData.results,
      claimData.metadata,
      null
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

    // Store session
    const sessions = req.app.get('sessions');
    sessions.set(sessionId, {
      createdAt: Date.now(),
      claimData,
      logValidation
    });

    res.json({
      sessionId,
      metadata: claimData.metadata,
      totals: claimData.totals,
      resultsBySuite: claimData.resultsBySuite,
      results: claimData.results,
      environment: claimData.environment,
      logValidation
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: `Processing failed: ${err.message}` });
  }
});

module.exports = router;
