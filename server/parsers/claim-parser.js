const fs = require('fs');
const path = require('path');

function extractCnfVersion(filename) {
  if (!filename) return 'Unknown';
  const match = filename.match(/claim[_-]?(.+)\.json$/i);
  return match ? match[1] : path.basename(filename, '.json');
}

function parseCheckDetails(checkDetailsRaw) {
  if (!checkDetailsRaw) return { compliant: [], nonCompliant: [] };
  try {
    const parsed = typeof checkDetailsRaw === 'string' ? JSON.parse(checkDetailsRaw) : checkDetailsRaw;
    return {
      compliant: parsed.CompliantObjectsOut || [],
      nonCompliant: parsed.NonCompliantObjectsOut || []
    };
  } catch {
    return { compliant: [], nonCompliant: [] };
  }
}

function extractFailureDetails(nonCompliantObjects) {
  if (!Array.isArray(nonCompliantObjects) || nonCompliantObjects.length === 0) return [];
  return nonCompliantObjects.map(obj => {
    const keys = obj.ObjectFieldsKeys || [];
    const values = obj.ObjectFieldsValues || [];
    const detail = { objectType: obj.ObjectType || '' };
    keys.forEach((key, idx) => {
      const val = values[idx] || '';
      const keyLower = key.toLowerCase().replace(/\s+/g, '');
      if (keyLower.includes('reason') || keyLower.includes('noncomplian')) detail.reason = val;
      else if (keyLower.includes('namespace')) detail.namespace = val;
      else if (keyLower.includes('podname') || keyLower === 'name') detail.podName = val;
      else if (keyLower.includes('container')) detail.containerName = val;
      else detail[key] = val;
    });
    if (!detail.reason && values.length > 0) detail.reason = values[0];
    return detail;
  });
}

function parse(filePath, filename) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const claim = JSON.parse(raw);

  const claimData = claim.claim || claim;
  const results = claimData.results || {};
  const versions = claimData.versions || {};
  const metadata = claimData.metadata || {};

  const cnfVersion = extractCnfVersion(filename);

  const parsedResults = [];
  const totals = { total: 0, passed: 0, failed: 0, skipped: 0 };
  const resultsBySuite = {};

  for (const [testKey, result] of Object.entries(results)) {
    const testID = result.testID || {};
    const state = (result.state || '').toLowerCase();
    const normalizedState = state === 'error' ? 'failed' : state;
    const catalogInfo = result.catalogInfo || {};
    const categoryClassification = result.categoryClassification || {};

    const checkDetails = parseCheckDetails(result.checkDetails);
    const failureDetails = extractFailureDetails(checkDetails.nonCompliant);

    const entry = {
      id: testID.id || testKey,
      suite: testID.suite || '',
      tags: testID.tags || '',
      state,
      normalizedState,
      description: catalogInfo.description || '',
      remediation: catalogInfo.remediation || '',
      exceptionProcess: catalogInfo.exceptionProcess || '',
      bestPracticeRef: catalogInfo.bestPracticeReference || '',
      failureDetails,
      categoryClassification,
      startTime: result.startTime || '',
      endTime: result.endTime || '',
      skipReason: result.skipReason || checkDetails.nonCompliant?.[0]?.ObjectFieldsValues?.[0] || '',
      checkDetails
    };

    totals.total++;
    if (normalizedState === 'passed') totals.passed++;
    else if (normalizedState === 'failed') totals.failed++;
    else if (normalizedState === 'skipped') totals.skipped++;

    if (!resultsBySuite[entry.suite]) resultsBySuite[entry.suite] = [];
    resultsBySuite[entry.suite].push(entry);
    parsedResults.push(entry);
  }

  return {
    metadata: {
      cnfVersion,
      certSuiteVersion: versions.certSuite || versions.tnf || '',
      ocpVersion: versions.ocp || '',
      k8sVersion: versions.k8s || '',
      startTime: metadata.startTime || '',
      endTime: metadata.endTime || ''
    },
    results: parsedResults,
    totals,
    resultsBySuite
  };
}

module.exports = { parse, extractCnfVersion };
