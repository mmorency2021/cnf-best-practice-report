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

function parseOperatorSummary(str) {
  // Format: "Status operator: name ver: version in ns: [namespace]" or "(all namespaces)"
  const match = str.match(/^(\w+)\s+operator:\s+(.+?)\s+ver:\s+(.+?)(?:\s+in\s+ns:\s+\[(.+?)\]|\s+\(all namespaces\))$/);
  if (!match) return { name: str, version: '', namespace: '', status: '' };
  return {
    name: match[2],
    version: match[3],
    namespace: match[4] || 'all namespaces',
    status: match[1]
  };
}

function extractEnvironment(claimData) {
  const configs = claimData.configurations || {};
  const nodes = claimData.nodes || {};
  const versions = claimData.versions || {};

  const env = {
    cluster: { operators: [], storageClasses: [], csiDrivers: [], nodeCount: {} },
    hardware: { sriovPolicies: [], nodesHwInfo: {} },
    pods: {
      testPods: [], allPodsCount: 0,
      testDeployments: [], testStatefulSets: [],
      podDisruptionBudgets: []
    },
    helmCharts: [],
    config: { targetNamespaces: [], podsUnderTestLabels: [] }
  };

  try {
    const opsSummary = configs.AllOperatorsSummary || [];
    env.cluster.operators = opsSummary.map(s =>
      typeof s === 'string' ? parseOperatorSummary(s) : s
    );
  } catch (_) {}

  try {
    env.cluster.storageClasses = (configs.StorageClassList || []).map(sc => ({
      name: (sc.metadata || {}).name || '',
      provisioner: sc.provisioner || ''
    }));
  } catch (_) {}

  try {
    const csiItems = (nodes.csiDriver || {}).items || [];
    env.cluster.csiDrivers = csiItems.map(d => (d.metadata || {}).name || '');
  } catch (_) {}

  try {
    const summary = nodes.nodeSummary || {};
    const nodeNames = Object.keys(summary);
    env.cluster.nodeCount = { total: nodeNames.length, names: nodeNames };
  } catch (_) {}

  try {
    env.hardware.sriovPolicies = (configs.AllSriovNetworkNodePolicies || []).map(p => {
      const spec = p.spec || {};
      return {
        name: (p.metadata || {}).name || '',
        deviceType: spec.deviceType || '',
        numVfs: spec.numVfs || 0,
        resourceName: spec.resourceName || '',
        nicSelector: spec.nicSelector || {}
      };
    });
  } catch (_) {}

  try {
    const hwInfo = nodes.nodesHwInfo || {};
    if (Object.keys(hwInfo).length > 0) env.hardware.nodesHwInfo = hwInfo;
  } catch (_) {}

  try {
    env.pods.testPods = (configs.testPods || []).map(pod => {
      const meta = pod.metadata || {};
      const spec = pod.spec || {};
      const status = pod.status || {};
      return {
        name: meta.name || '',
        namespace: meta.namespace || '',
        nodeName: spec.nodeName || '',
        phase: status.phase || '',
        hostNetwork: spec.hostNetwork || false,
        hostPID: spec.hostPID || false,
        hostIPC: spec.hostIPC || false,
        containers: (pod.Containers || []).map(c => {
          const cd = c.ContainerData || c;
          return {
            name: cd.name || '',
            image: cd.image || '',
            resources: cd.resources || {},
            securityContext: cd.securityContext || {}
          };
        }),
        tolerations: (spec.tolerations || []).map(t => ({
          key: t.key || '*',
          effect: t.effect || '*'
        }))
      };
    });
  } catch (_) {}

  try { env.pods.allPodsCount = (configs.AllPods || []).length; } catch (_) {}

  try {
    env.pods.testDeployments = (configs.testDeployments || []).map(d => ({
      name: (d.metadata || {}).name || '',
      namespace: (d.metadata || {}).namespace || '',
      replicas: (d.spec || {}).replicas ?? 0
    }));
  } catch (_) {}

  try {
    env.pods.testStatefulSets = (configs.testStatefulSets || []).map(s => ({
      name: (s.metadata || {}).name || '',
      namespace: (s.metadata || {}).namespace || '',
      replicas: (s.spec || {}).replicas ?? 0
    }));
  } catch (_) {}

  try {
    env.pods.podDisruptionBudgets = (configs.PodDisruptionBudgets || []).map(p => ({
      name: (p.metadata || {}).name || '',
      namespace: (p.metadata || {}).namespace || '',
      maxUnavailable: (p.spec || {}).maxUnavailable ?? null,
      minAvailable: (p.spec || {}).minAvailable ?? null
    }));
  } catch (_) {}

  try {
    env.helmCharts = (configs.testHelmChartReleases || []).map(h => {
      const chartMeta = (h.chart || {}).metadata || {};
      return {
        name: h.name || '',
        namespace: h.namespace || '',
        chartName: chartMeta.name || '',
        chartVersion: chartMeta.version || ''
      };
    });
  } catch (_) {}

  try {
    const cfg = configs.Config || {};
    env.config.targetNamespaces = (cfg.targetNameSpaces || []).map(n => n.name || n);
    env.config.podsUnderTestLabels = cfg.podsUnderTestLabels || [];
  } catch (_) {}

  return env;
}

function parse(filePath, filename) {
  const raw = fs.readFileSync(filePath, 'utf-8');

  let claim;
  try {
    claim = JSON.parse(raw);
  } catch (e) {
    const position = e.message.match(/position (\d+)/)?.[1];
    const context = position ? ` near byte ${position}: "...${raw.slice(Math.max(0, +position - 20), +position + 20)}..."` : '';
    throw new Error(`Invalid JSON in claim file "${filename}"${context}. Ensure the file is a valid certsuite claim.json.`);
  }

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
    resultsBySuite,
    environment: extractEnvironment(claimData)
  };
}

module.exports = { parse, extractCnfVersion };
