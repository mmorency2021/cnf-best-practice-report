const fs = require('fs');
const path = require('path');

let builtinRules = null;

function loadBuiltinRules() {
  if (builtinRules) return builtinRules;
  const rulesPath = path.join(__dirname, '..', 'data', 'skip-rules.json');
  try {
    builtinRules = JSON.parse(fs.readFileSync(rulesPath, 'utf-8'));
  } catch {
    builtinRules = [];
  }
  return builtinRules;
}

function patternToRegex(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`, 'i');
}

function matchRule(testId, rules) {
  for (const rule of rules) {
    const regex = patternToRegex(rule.testIdPattern);
    if (regex.test(testId)) {
      return rule;
    }
  }
  return null;
}

function detectClusterContext(claimMetadata, results) {
  const context = {
    isSNO: false,
    isIPv4Only: false,
    hasDaemonSets: false,
    hasOperators: false,
    hasPerformanceProfile: false
  };

  // SNO detection: check node count from results or metadata
  const nodeCount = claimMetadata?.nodeCount;
  if (nodeCount === 1) context.isSNO = true;

  // Check if all operator tests are skipped → likely no operators configured
  const operatorResults = results.filter(r => r.suite === 'operator');
  if (operatorResults.length > 0 && operatorResults.every(r => r.normalizedState === 'skipped')) {
    context.hasOperators = false;
  }

  // Check if all performance tests are skipped
  const perfResults = results.filter(r => r.suite === 'performance');
  if (perfResults.length > 0 && perfResults.every(r => r.normalizedState === 'skipped')) {
    context.hasPerformanceProfile = false;
  }

  // Check if affiliated-certification tests are skipped
  const certResults = results.filter(r => r.suite === 'affiliated-certification');
  if (certResults.length > 0 && certResults.every(r => r.normalizedState === 'skipped')) {
    context.hasOperators = false;
  }

  return context;
}

function analyzeSkipReason(result, clusterContext) {
  const skipReason = result.skipReason || '';
  const lowerReason = skipReason.toLowerCase();

  // Check for common valid skip patterns in the skip reason text
  if (lowerReason.includes('ipv6') && (lowerReason.includes('not configured') || lowerReason.includes('not supported'))) {
    return { valid: true, reason: 'IPv6 not configured on cluster' };
  }
  if (lowerReason.includes('single node') || lowerReason.includes('sno')) {
    return { valid: true, reason: 'Single Node OpenShift — test requires multi-node' };
  }
  if (lowerReason.includes('no operator') || lowerReason.includes('operator not')) {
    return { valid: true, reason: 'No operators under test' };
  }
  if (lowerReason.includes('performance profile') || lowerReason.includes('no performance')) {
    return { valid: true, reason: 'Performance profile not configured' };
  }
  if (lowerReason.includes('daemonset')) {
    return { valid: true, reason: 'Test not applicable to DaemonSet workloads' };
  }
  if (lowerReason.includes('not applicable') || lowerReason.includes('n/a')) {
    return { valid: true, reason: skipReason };
  }

  return null;
}

function analyze(allResults, claimMetadata, customRulesPath) {
  const rules = [...loadBuiltinRules()];

  if (customRulesPath) {
    try {
      const custom = JSON.parse(fs.readFileSync(customRulesPath, 'utf-8'));
      if (Array.isArray(custom)) rules.push(...custom);
    } catch { /* ignore invalid custom rules */ }
  }

  const skippedResults = allResults.filter(r => r.normalizedState === 'skipped');
  const clusterContext = detectClusterContext(claimMetadata, allResults);

  return skippedResults.map(result => {
    // Check built-in + custom rules first
    const ruleMatch = matchRule(result.id, rules);
    if (ruleMatch) {
      return {
        testId: result.id,
        skipClassification: 'valid-skip',
        reason: ruleMatch.reason,
        validWhen: ruleMatch.validWhen || '',
        ruleMatched: ruleMatch.testIdPattern
      };
    }

    // Analyze the skip reason from the test result
    const reasonAnalysis = analyzeSkipReason(result, clusterContext);
    if (reasonAnalysis) {
      return {
        testId: result.id,
        skipClassification: 'valid-skip',
        reason: reasonAnalysis.reason,
        validWhen: '',
        ruleMatched: 'auto-detected'
      };
    }

    return {
      testId: result.id,
      skipClassification: 'needs-review',
      reason: result.skipReason || 'No skip reason provided',
      validWhen: '',
      ruleMatched: null
    };
  });
}

module.exports = { analyze, loadBuiltinRules };
