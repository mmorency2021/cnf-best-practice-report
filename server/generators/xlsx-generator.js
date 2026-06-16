const ExcelJS = require('exceljs');

const PRIORITY_COLORS = {
  0: { bg: 'FFDC3545', font: 'FFFFFFFF' },
  1: { bg: 'FFFD7E14', font: 'FFFFFFFF' },
  2: { bg: 'FFFFC107', font: 'FF333333' },
  3: { bg: 'FF28A745', font: 'FFFFFFFF' },
  4: { bg: 'FF6C757D', font: 'FFFFFFFF' }
};

const STATUS_COLORS = {
  passed: { bg: 'FF28A745', font: 'FFFFFFFF' },
  failed: { bg: 'FFDC3545', font: 'FFFFFFFF' },
  skipped: { bg: 'FF6C757D', font: 'FFFFFFFF' }
};

function formatFailureDetails(failureDetails) {
  if (!Array.isArray(failureDetails) || failureDetails.length === 0) return '';
  return failureDetails.map(d => {
    const parts = [];
    if (d.podName) parts.push(d.podName);
    else if (d.objectType) parts.push(d.objectType);
    if (d.containerName) parts.push('container: ' + d.containerName);
    if (d.namespace) parts.push('ns: ' + d.namespace);
    if (d.reason) parts.push(d.reason);
    return parts.length > 0 ? parts.join(' | ') : JSON.stringify(d);
  }).join('\n');
}

async function generate(claimData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CNF Best Practice Report Generator';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Failed Case Summary', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  });

  sheet.columns = [
    { header: 'Test ID', key: 'testId', width: 45 },
    { header: 'Category', key: 'category', width: 25 },
    { header: 'Impact', key: 'impact', width: 40 },
    { header: 'Details (Non-Compliant Objects)', key: 'details', width: 60 },
    { header: 'Best Practice Reference', key: 'bestPracticeRef', width: 45 },
    { header: 'Remediation', key: 'remediation', width: 50 },
    { header: 'Priority', key: 'priority', width: 10 },
    { header: 'Partner Comments', key: 'comments', width: 35 }
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF151515' } };
  headerRow.alignment = { vertical: 'middle', wrapText: true };
  headerRow.height = 28;

  // Collect failed tests sorted by priority then category
  const failedResults = (claimData.results || [])
    .filter(r => r.normalizedState === 'failed')
    .sort((a, b) => {
      const pDiff = (a.priority ?? 4) - (b.priority ?? 4);
      if (pDiff !== 0) return pDiff;
      return (a.suite || '').localeCompare(b.suite || '');
    });

  for (const result of failedResults) {
    const row = sheet.addRow({
      testId: result.id,
      category: formatSuiteName(result.suite || ''),
      impact: result.impact || result.description || '',
      details: formatFailureDetails(result.failureDetails),
      bestPracticeRef: result.bestPracticeRef || '',
      remediation: result.remediation || '',
      priority: result.priority ?? 4,
      comments: ''
    });

    row.alignment = { vertical: 'top', wrapText: true };

    // Color the priority cell
    const priorityCell = row.getCell('priority');
    const pColor = PRIORITY_COLORS[result.priority ?? 4] || PRIORITY_COLORS[4];
    priorityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: pColor.bg } };
    priorityCell.font = { bold: true, color: { argb: pColor.font } };
    priorityCell.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  // Add borders
  const totalRows = sheet.rowCount;
  for (let i = 1; i <= totalRows; i++) {
    const row = sheet.getRow(i);
    for (let j = 1; j <= 8; j++) {
      const cell = row.getCell(j);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
      };
    }
  }

  // Add priority legend at the bottom
  sheet.addRow([]);
  const legendHeader = sheet.addRow(['Priority Legend']);
  legendHeader.font = { bold: true, size: 10 };

  const legends = [
    [0, 'Security-critical (root user, privilege escalation)'],
    [1, 'Host access violations (host PID/path/network/IPC, reserved ports, security context)'],
    [2, 'Cluster role bindings, scheduling, tolerations, probes, SSH daemons'],
    [3, 'PreStop hooks, pod owner type'],
    [4, 'One process per container, non-UBI base image']
  ];

  for (const [p, desc] of legends) {
    const row = sheet.addRow([`Priority ${p}`, desc]);
    const pCell = row.getCell(1);
    const color = PRIORITY_COLORS[p];
    pCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color.bg } };
    pCell.font = { bold: true, color: { argb: color.font }, size: 9 };
    row.getCell(2).font = { size: 9 };
  }

  addEnvironmentSheet(workbook, claimData.environment);
  addAllTestsSheet(workbook, claimData);

  return workbook.xlsx.writeBuffer();
}

function addEnvironmentSheet(workbook, environment) {
  const env = environment || {};
  const sheet = workbook.addWorksheet('Environment Summary', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 0 }]
  });

  const headerStyle = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF151515' } };
  const sectionStyle = { bold: true, size: 12, color: { argb: 'FFEE0000' } };
  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
  };

  let row = 1;

  // Config section
  const config = env.config || {};
  const configRow = sheet.getRow(row++);
  configRow.getCell(1).value = 'Test Configuration';
  configRow.getCell(1).font = sectionStyle;
  sheet.getRow(row).values = ['Target Namespaces', (config.targetNamespaces || []).join(', ') || 'N/A'];
  row++;
  sheet.getRow(row).values = ['Pod Selector Labels', (config.podsUnderTestLabels || []).join(', ') || 'N/A'];
  row++;
  row++;

  // Cluster operators section
  const ops = (env.cluster || {}).operators || [];
  const opsHeaderRow = sheet.getRow(row++);
  opsHeaderRow.getCell(1).value = `Cluster Operators (${ops.length})`;
  opsHeaderRow.getCell(1).font = sectionStyle;

  if (ops.length > 0) {
    const opHdr = sheet.getRow(row++);
    opHdr.values = ['Operator', 'Version', 'Namespace', 'Status'];
    opHdr.font = headerStyle;
    opHdr.eachCell(c => { c.fill = headerFill; c.border = thinBorder; });

    for (const op of ops) {
      const r = sheet.getRow(row++);
      r.values = [op.name, op.version, op.namespace, op.status];
      r.eachCell(c => { c.border = thinBorder; });
    }
  }
  row++;

  // SR-IOV section
  const sriov = (env.hardware || {}).sriovPolicies || [];
  const sriovHeaderRow = sheet.getRow(row++);
  sriovHeaderRow.getCell(1).value = `SR-IOV Policies (${sriov.length})`;
  sriovHeaderRow.getCell(1).font = sectionStyle;

  if (sriov.length > 0) {
    const srHdr = sheet.getRow(row++);
    srHdr.values = ['Policy', 'Device Type', 'VFs', 'Resource Name', 'NIC Vendor', 'NIC Device ID', 'PF Names'];
    srHdr.font = headerStyle;
    srHdr.eachCell(c => { c.fill = headerFill; c.border = thinBorder; });

    for (const p of sriov) {
      const nic = p.nicSelector || {};
      const r = sheet.getRow(row++);
      r.values = [p.name, p.deviceType, p.numVfs, p.resourceName, nic.vendor || '', nic.deviceID || '', (nic.pfNames || []).join(', ')];
      r.eachCell(c => { c.border = thinBorder; });
    }
  }
  row++;

  // Test Pods section
  const testPods = (env.pods || {}).testPods || [];
  const podsHeaderRow = sheet.getRow(row++);
  podsHeaderRow.getCell(1).value = `Test Pods (${testPods.length})`;
  podsHeaderRow.getCell(1).font = sectionStyle;

  if (testPods.length > 0) {
    const podHdr = sheet.getRow(row++);
    podHdr.values = ['Pod', 'Namespace', 'Node', 'Container', 'Image', 'CPU Req', 'CPU Lim', 'Mem Req', 'Mem Lim', 'PrivEsc', 'HostNetwork', 'Phase'];
    podHdr.font = headerStyle;
    podHdr.eachCell(c => { c.fill = headerFill; c.border = thinBorder; });

    for (const pod of testPods) {
      for (const c of (pod.containers || [])) {
        const res = c.resources || {};
        const req = res.requests || {};
        const lim = res.limits || {};
        const sc = c.securityContext || {};
        const r = sheet.getRow(row++);
        r.values = [
          pod.name, pod.namespace, pod.nodeName, c.name, c.image,
          req.cpu || '', lim.cpu || '', req.memory || '', lim.memory || '',
          sc.allowPrivilegeEscalation === false ? 'No' : 'Yes',
          pod.hostNetwork ? 'Yes' : 'No',
          pod.phase
        ];
        r.eachCell(c => { c.border = thinBorder; });
      }
    }
    // Resource totals row
    let totalCpuReq = 0, totalCpuLim = 0, totalMemReq = 0, totalMemLim = 0;
    for (const pod of testPods) {
      for (const c of (pod.containers || [])) {
        const res = c.resources || {};
        const req = res.requests || {};
        const lim = res.limits || {};
        const cpuR = String(req.cpu || '');
        const cpuL = String(lim.cpu || '');
        const memR = String(req.memory || '');
        const memL = String(lim.memory || '');
        totalCpuReq += cpuR.endsWith('m') ? (parseInt(cpuR, 10) || 0) : (parseFloat(cpuR) || 0) * 1000;
        totalCpuLim += cpuL.endsWith('m') ? (parseInt(cpuL, 10) || 0) : (parseFloat(cpuL) || 0) * 1000;
        const parseM = v => { if (!v) return 0; if (v.endsWith('Gi')) return (parseFloat(v)||0)*1024; if (v.endsWith('Mi')) return parseFloat(v)||0; if (v.endsWith('Ki')) return (parseFloat(v)||0)/1024; if (v.endsWith('G')) return (parseFloat(v)||0)*1000; if (v.endsWith('M')) return parseFloat(v)||0; return 0; };
        totalMemReq += parseM(memR);
        totalMemLim += parseM(memL);
      }
    }
    const fmtCpu = m => m === 0 ? '0' : m % 1000 === 0 ? String(m/1000) : (m/1000).toFixed(1);
    const fmtMem = m => m === 0 ? '0' : m >= 1024 ? (m/1024).toFixed(1).replace(/\.0$/, '') + 'Gi' : Math.round(m) + 'Mi';
    const totalsRow = sheet.getRow(row++);
    totalsRow.values = ['', '', '', '', 'Total CPU', fmtCpu(totalCpuReq), fmtCpu(totalCpuLim), '', '', '', '', ''];
    totalsRow.font = { bold: true, size: 10 };
    totalsRow.eachCell(c => { c.border = thinBorder; });
    const memTotalsRow = sheet.getRow(row++);
    memTotalsRow.values = ['', '', '', '', 'Total Memory', '', '', fmtMem(totalMemReq), fmtMem(totalMemLim), '', '', ''];
    memTotalsRow.font = { bold: true, size: 10 };
    memTotalsRow.eachCell(c => { c.border = thinBorder; });
  }
  row++;

  // Workloads
  const deps = (env.pods || {}).testDeployments || [];
  const sts = (env.pods || {}).testStatefulSets || [];
  if (deps.length > 0 || sts.length > 0) {
    const wlHeaderRow = sheet.getRow(row++);
    wlHeaderRow.getCell(1).value = 'Workloads';
    wlHeaderRow.getCell(1).font = sectionStyle;
    const wlHdr = sheet.getRow(row++);
    wlHdr.values = ['Type', 'Name', 'Namespace', 'Replicas'];
    wlHdr.font = headerStyle;
    wlHdr.eachCell(c => { c.fill = headerFill; c.border = thinBorder; });
    for (const d of deps) {
      const r = sheet.getRow(row++);
      r.values = ['Deployment', d.name, d.namespace, d.replicas];
      r.eachCell(c => { c.border = thinBorder; });
    }
    for (const s of sts) {
      const r = sheet.getRow(row++);
      r.values = ['StatefulSet', s.name, s.namespace, s.replicas];
      r.eachCell(c => { c.border = thinBorder; });
    }
    row++;
  }

  // Helm Charts
  const helmCharts = env.helmCharts || [];
  if (helmCharts.length > 0) {
    const hcHeaderRow = sheet.getRow(row++);
    hcHeaderRow.getCell(1).value = `Helm Charts (${helmCharts.length})`;
    hcHeaderRow.getCell(1).font = sectionStyle;
    const hcHdr = sheet.getRow(row++);
    hcHdr.values = ['Release', 'Chart', 'Version', 'Namespace'];
    hcHdr.font = headerStyle;
    hcHdr.eachCell(c => { c.fill = headerFill; c.border = thinBorder; });
    for (const h of helmCharts) {
      const r = sheet.getRow(row++);
      r.values = [h.name, h.chartName, h.chartVersion, h.namespace];
      r.eachCell(c => { c.border = thinBorder; });
    }
  }

  // Auto-fit column widths
  sheet.columns = [
    { width: 35 }, { width: 25 }, { width: 25 }, { width: 20 },
    { width: 45 }, { width: 10 }, { width: 10 }, { width: 10 },
    { width: 10 }, { width: 10 }, { width: 12 }, { width: 10 }
  ];
}

function addAllTestsSheet(workbook, claimData) {
  const sheet = workbook.addWorksheet('All Tests', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  });

  sheet.columns = [
    { header: 'Test ID', key: 'testId', width: 45 },
    { header: 'Category', key: 'category', width: 25 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Priority', key: 'priority', width: 10 },
    { header: 'Impact', key: 'impact', width: 40 },
    { header: 'Details (Non-Compliant Objects)', key: 'details', width: 60 },
    { header: 'Best Practice Reference', key: 'bestPracticeRef', width: 45 },
    { header: 'Remediation', key: 'remediation', width: 50 },
    { header: 'Scenario', key: 'scenario', width: 20 }
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF151515' } };
  headerRow.alignment = { vertical: 'middle', wrapText: true };
  headerRow.height = 28;

  const allResults = (claimData.results || [])
    .slice()
    .sort((a, b) => {
      const cat = (a.suite || '').localeCompare(b.suite || '');
      if (cat !== 0) return cat;
      return (a.priority ?? 4) - (b.priority ?? 4);
    });

  for (const result of allResults) {
    const row = sheet.addRow({
      testId: result.id,
      category: formatSuiteName(result.suite || ''),
      status: result.normalizedState || 'unknown',
      priority: result.priority ?? 4,
      impact: result.impact || result.description || '',
      details: result.normalizedState === 'failed' ? formatFailureDetails(result.failureDetails) : '',
      bestPracticeRef: result.bestPracticeRef || '',
      remediation: result.remediation || '',
      scenario: result.scenario || ''
    });

    row.alignment = { vertical: 'top', wrapText: true };

    const statusCell = row.getCell('status');
    const sColor = STATUS_COLORS[result.normalizedState] || STATUS_COLORS.skipped;
    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: sColor.bg } };
    statusCell.font = { bold: true, color: { argb: sColor.font } };
    statusCell.alignment = { horizontal: 'center', vertical: 'middle' };

    const priorityCell = row.getCell('priority');
    const pColor = PRIORITY_COLORS[result.priority ?? 4] || PRIORITY_COLORS[4];
    priorityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: pColor.bg } };
    priorityCell.font = { bold: true, color: { argb: pColor.font } };
    priorityCell.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  const totalRows = sheet.rowCount;
  for (let i = 1; i <= totalRows; i++) {
    const r = sheet.getRow(i);
    for (let j = 1; j <= 9; j++) {
      r.getCell(j).border = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
      };
    }
  }
}

function formatSuiteName(suite) {
  return suite.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

module.exports = { generate };
