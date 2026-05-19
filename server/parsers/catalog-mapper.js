const fs = require('fs');
const path = require('path');

let catalogData = null;

const PRIORITY_MAP = {
  'access-control-security-context-non-root-user-id-check': 0,
  'access-control-security-context-privilege-escalation': 0,
  'access-control-pod-host-pid': 1,
  'access-control-pod-host-path': 1,
  'access-control-pod-host-network': 1,
  'access-control-pod-host-ipc': 1,
  'access-control-security-context': 1,
  'access-control-pod-automount-service-account-token': 1,
  'access-control-namespace-resource-quota': 1,
  'networking-ocp-reserved-ports-usage': 1,
  'networking-undeclared-container-ports-usage': 1,
  'networking-network-policy-deny-all': 1,
  'access-control-ssh-daemons': 2,
  'access-control-cluster-role-bindings': 2,
  'lifecycle-pod-scheduling': 2,
  'lifecycle-pod-toleration-bypass': 2,
  'lifecycle-startup-probe': 2,
  'observability-termination-policy': 2,
  'lifecycle-readiness-probe': 2,
  'lifecycle-liveness-probe': 2,
  'lifecycle-container-prestop': 3,
  'lifecycle-pod-owner-type': 3,
  'access-control-one-process-per-container': 4,
  'platform-alteration-isredhat-release': 4
};

function load() {
  if (catalogData) return catalogData;
  const catalogPath = path.join(__dirname, '..', 'data', 'catalog.json');
  try {
    catalogData = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
  } catch {
    catalogData = {};
  }
  return catalogData;
}

function assignPriority(testId) {
  if (PRIORITY_MAP[testId] !== undefined) return PRIORITY_MAP[testId];

  // Heuristic-based priority for unmapped tests
  if (testId.includes('security-context') || testId.includes('privilege') || testId.includes('root')) return 0;
  if (testId.includes('host-') || testId.includes('reserved-port') || testId.includes('network-policy')) return 1;
  if (testId.includes('role-binding') || testId.includes('scheduling') || testId.includes('toleration') || testId.includes('probe')) return 2;
  if (testId.includes('prestop') || testId.includes('owner-type') || testId.includes('graceful')) return 3;
  return 4;
}

function enrich(results) {
  const catalog = load();
  return results.map(result => {
    const catalogEntry = catalog[result.id] || {};
    return {
      ...result,
      description: result.description || catalogEntry.description || '',
      remediation: result.remediation || catalogEntry.remediation || '',
      exceptionProcess: result.exceptionProcess || catalogEntry.exceptionProcess || '',
      bestPracticeRef: result.bestPracticeRef || catalogEntry.bestPracticeReference || '',
      impact: catalogEntry.impact || '',
      tags: result.tags || catalogEntry.tags || '',
      scenarios: catalogEntry.scenarios || result.categoryClassification || {},
      priority: assignPriority(result.id)
    };
  });
}

function getScenarioClassification(testId) {
  const catalog = load();
  const entry = catalog[testId];
  if (!entry) return {};
  return entry.scenarios || {};
}

module.exports = { load, enrich, assignPriority, getScenarioClassification };
