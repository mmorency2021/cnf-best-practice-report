function generate(claimData) {
  const envLines = buildEnvironmentHeader(claimData);

  const headers = ['Test ID', 'Category', 'Impact', 'Remediation', 'Priority'];

  const failedResults = (claimData.results || [])
    .filter(r => r.normalizedState === 'failed')
    .sort((a, b) => {
      const pDiff = (a.priority ?? 4) - (b.priority ?? 4);
      if (pDiff !== 0) return pDiff;
      return (a.suite || '').localeCompare(b.suite || '');
    });

  const rows = failedResults.map(r => [
    r.id,
    formatSuiteName(r.suite || ''),
    r.impact || r.description || '',
    r.remediation || '',
    r.priority ?? 4
  ]);

  const dataLines = [headers, ...rows].map(row =>
    row.map(field => escapeCsvField(String(field))).join(',')
  );

  const allLines = [...envLines, '', ...dataLines];
  return Buffer.from(allLines.join('\r\n') + '\r\n', 'utf-8');
}

function buildEnvironmentHeader(claimData) {
  const meta = claimData.metadata || {};
  const env = claimData.environment || {};
  const config = env.config || {};
  const pods = env.pods || {};
  const hw = env.hardware || {};

  const lines = [
    `# CNF Best Practice Report — ${meta.cnfVersion || 'CNF'}`,
    `# OCP: ${meta.ocpVersion || 'N/A'} | K8s: ${meta.k8sVersion || 'N/A'} | Certsuite: ${meta.certSuiteVersion || 'N/A'}`,
    `# Namespace: ${(config.targetNamespaces || []).join(', ') || 'N/A'}`,
    `# Test Pods: ${(pods.testPods || []).length} | Containers: ${(pods.testPods || []).reduce((s, p) => s + (p.containers || []).length, 0)}`,
  ];

  const sriov = hw.sriovPolicies || [];
  if (sriov.length > 0) {
    lines.push(`# SR-IOV Policies: ${sriov.length} (${sriov.map(p => `${p.name}:${p.numVfs}VFs`).join(', ')})`);
  }

  const helmCharts = env.helmCharts || [];
  if (helmCharts.length > 0) {
    lines.push(`# Helm Charts: ${helmCharts.length}`);
  }

  if (meta.startTime) {
    lines.push(`# Run: ${new Date(meta.startTime).toISOString()}`);
  }

  return lines;
}

function escapeCsvField(value) {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function formatSuiteName(suite) {
  return suite.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

module.exports = { generate };
