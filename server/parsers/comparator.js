const STATE_RANK = { passed: 2, skipped: 1, failed: 0 };

function compare(claimDataA, claimDataB) {
  const mapA = buildTestMap(claimDataA.results);
  const mapB = buildTestMap(claimDataB.results);

  const allIds = new Set([...mapA.keys(), ...mapB.keys()]);

  const summary = { changed: 0, unchanged: 0, addedInB: 0, removedInB: 0 };
  const testDiffs = [];

  for (const id of allIds) {
    const a = mapA.get(id);
    const b = mapB.get(id);
    const diff = buildTestDiff(a, b);
    testDiffs.push(diff);
    summary[diff.change === 'added' ? 'addedInB' : diff.change === 'removed' ? 'removedInB' : diff.change]++;
  }

  const comparisonBySuite = groupBySuite(testDiffs, claimDataA, claimDataB);

  const deltaTotals = {
    passed: (claimDataB.totals.passed || 0) - (claimDataA.totals.passed || 0),
    failed: (claimDataB.totals.failed || 0) - (claimDataA.totals.failed || 0),
    skipped: (claimDataB.totals.skipped || 0) - (claimDataA.totals.skipped || 0)
  };

  return { summary, deltaTotals, comparisonBySuite };
}

function buildTestMap(results) {
  const map = new Map();
  for (const r of results) {
    map.set(r.id, r);
  }
  return map;
}

function buildTestDiff(a, b) {
  if (!a) {
    return {
      id: b.id,
      suite: b.suite,
      stateA: null,
      stateB: b.normalizedState,
      change: 'added',
      descriptionA: null,
      descriptionB: b.description || '',
      remediationA: null,
      remediationB: b.remediation || '',
      impactA: null,
      impactB: b.impact || '',
      bestPracticeRefA: null,
      bestPracticeRefB: b.bestPracticeRef || '',
      priorityA: null,
      priorityB: b.priority,
      failureDetailsA: null,
      failureDetailsB: b.failureDetails || [],
      skipAnalysisA: null,
      skipAnalysisB: b.skipAnalysis
    };
  }

  if (!b) {
    return {
      id: a.id,
      suite: a.suite,
      stateA: a.normalizedState,
      stateB: null,
      change: 'removed',
      descriptionA: a.description || '',
      descriptionB: null,
      remediationA: a.remediation || '',
      remediationB: null,
      impactA: a.impact || '',
      impactB: null,
      bestPracticeRefA: a.bestPracticeRef || '',
      bestPracticeRefB: null,
      priorityA: a.priority,
      priorityB: null,
      failureDetailsA: a.failureDetails || [],
      failureDetailsB: null,
      skipAnalysisA: a.skipAnalysis,
      skipAnalysisB: null
    };
  }

  const rankA = STATE_RANK[a.normalizedState] ?? 0;
  const rankB = STATE_RANK[b.normalizedState] ?? 0;

  let change = 'unchanged';
  if (rankB !== rankA) change = 'changed';

  return {
    id: a.id,
    suite: a.suite,
    stateA: a.normalizedState,
    stateB: b.normalizedState,
    change,
    descriptionA: a.description || '',
    descriptionB: b.description || '',
    remediationA: a.remediation || '',
    remediationB: b.remediation || '',
    impactA: a.impact || '',
    impactB: b.impact || '',
    bestPracticeRefA: a.bestPracticeRef || '',
    bestPracticeRefB: b.bestPracticeRef || '',
    priorityA: a.priority,
    priorityB: b.priority,
    failureDetailsA: a.failureDetails || [],
    failureDetailsB: b.failureDetails || [],
    skipAnalysisA: a.skipAnalysis,
    skipAnalysisB: b.skipAnalysis
  };
}

function groupBySuite(testDiffs, claimDataA, claimDataB) {
  const suites = {};

  for (const diff of testDiffs) {
    const suite = diff.suite;
    if (!suites[suite]) {
      suites[suite] = {
        totalsA: { passed: 0, failed: 0, skipped: 0 },
        totalsB: { passed: 0, failed: 0, skipped: 0 },
        tests: []
      };
    }
    if (diff.stateA) suites[suite].totalsA[diff.stateA]++;
    if (diff.stateB) suites[suite].totalsB[diff.stateB]++;
    suites[suite].tests.push(diff);
  }

  for (const suite of Object.values(suites)) {
    suite.tests.sort((a, b) => {
      const order = { changed: 0, added: 1, removed: 2, unchanged: 3 };
      return (order[a.change] ?? 5) - (order[b.change] ?? 5);
    });
  }

  return suites;
}

module.exports = { compare };
