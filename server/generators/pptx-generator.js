const PptxGenJS = require('pptxgenjs');

const RH_RED = 'EE0000';
const RH_DARK = '151515';
const RH_GREY = '6A6E73';
const WHITE = 'FFFFFF';
const LIGHT_BG = 'F0F0F0';

const PRIORITY_COLORS = {
  0: 'DC3545',
  1: 'FD7E14',
  2: 'FFC107',
  3: '28A745',
  4: '6C757D'
};

async function generate(claimData) {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 });
  pptx.layout = 'WIDE';
  pptx.author = 'CNF Best Practice Report Generator';

  const meta = claimData.metadata || {};
  const cnf = meta.cnfVersion || 'CNF';
  const results = claimData.results || [];
  const totals = claimData.totals || {};
  const resultsBySuite = claimData.resultsBySuite || {};

  // Slide 1: Title
  addTitleSlide(pptx);

  // Slide 2: CNF + Best Practices Results
  addCnfIntroSlide(pptx, cnf);

  // Slide 3: Plan / Table of Contents
  addPlanSlide(pptx);

  // Slide 4: Red Hat Best Practice intro
  addBestPracticeIntroSlide(pptx);

  // Slide 5: Cert Suite overview
  addCertSuiteSlide(pptx);

  // Slide 6: Test cases summary
  addTestSummarySlide(pptx, totals, resultsBySuite);

  // Slide 7: Section divider
  addSectionDivider(pptx, 'CNF Test Results');

  // Slide 8: Cluster Architecture overview
  addEnvironmentSlide(pptx, cnf, claimData.environment);

  // Slide 9: Test scenario — versions
  addTestScenarioSlide(pptx, meta);

  // Slide 10: Summary of results
  addResultsSummarySlide(pptx, totals, resultsBySuite);

  // Slides 11+: Failed test per category
  addFailedByCategorySlides(pptx, resultsBySuite);

  // Slides N-2: Failed test case details tables
  addFailedDetailsSlides(pptx, results);

  // Slide N-1: Recommendations
  addRecommendationsSlide(pptx);

  // Slide N: Thank you
  addThankYouSlide(pptx);

  return pptx.write({ outputType: 'nodebuffer' });
}

function addRedBar(slide) {
  slide.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: RH_RED } });
}

function addFooter(slide, text) {
  slide.addText(text || 'Red Hat — Telco Engineering', {
    x: 0.5, y: 7.0, w: 12, h: 0.3,
    fontSize: 8, color: RH_GREY, align: 'left'
  });
}

function addTitleSlide(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: RH_DARK };
  slide.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.12, fill: { color: RH_RED } });
  slide.addText('Red Hat', {
    x: 0.8, y: 2.0, w: 11, h: 1.0,
    fontSize: 44, color: RH_RED, fontFace: 'Arial', bold: true
  });
  slide.addText('Telco Engineering / Workload Team', {
    x: 0.8, y: 3.0, w: 11, h: 0.8,
    fontSize: 24, color: WHITE, fontFace: 'Arial'
  });
  slide.addText('Best Practices Analysis Report', {
    x: 0.8, y: 4.0, w: 11, h: 0.6,
    fontSize: 18, color: RH_GREY, fontFace: 'Arial'
  });
}

function addCnfIntroSlide(pptx, cnf) {
  const slide = pptx.addSlide();
  addRedBar(slide);
  slide.addText(`${cnf}`, {
    x: 0.8, y: 1.5, w: 11, h: 1.0,
    fontSize: 36, color: RH_DARK, bold: true
  });
  slide.addText('Best Practices Results', {
    x: 0.8, y: 2.5, w: 11, h: 0.8,
    fontSize: 24, color: RH_GREY
  });
  addFooter(slide);
}

function addPlanSlide(pptx) {
  const slide = pptx.addSlide();
  addRedBar(slide);
  slide.addText('Plan', {
    x: 0.8, y: 0.5, w: 11, h: 0.8,
    fontSize: 28, color: RH_DARK, bold: true
  });
  const items = [
    'Red Hat Best Practice overview',
    'Cert Suite — test suites and scenarios',
    'Cluster Architecture & Configuration',
    'Test execution scenario',
    'Summary of results',
    'Failed test case analysis',
    'Detailed failed test case breakdown',
    'Recommendations'
  ];
  slide.addText(items.map((t, i) => ({ text: `${i + 1}. ${t}\n`, options: { fontSize: 16, color: RH_DARK, paraSpaceAfter: 8 } })), {
    x: 1.0, y: 1.5, w: 10, h: 5.0
  });
  addFooter(slide);
}

function addBestPracticeIntroSlide(pptx) {
  const slide = pptx.addSlide();
  addRedBar(slide);
  slide.addText('Red Hat Best Practice', {
    x: 0.8, y: 0.5, w: 11, h: 0.8,
    fontSize: 28, color: RH_DARK, bold: true
  });
  slide.addText(
    'Red Hat Best Practices for Kubernetes is a set of guidelines for building, deploying, ' +
    'and operating containerized applications on OpenShift/Kubernetes. These practices ensure ' +
    'workloads are secure, resilient, maintainable, and compliant with telco certification requirements.\n\n' +
    'The certsuite validates CNF workloads against these practices, covering security context, ' +
    'networking, lifecycle management, observability, and platform integrity.',
    {
      x: 0.8, y: 1.5, w: 11.5, h: 4.5,
      fontSize: 14, color: RH_DARK, valign: 'top', paraSpaceAfter: 6
    }
  );
  addFooter(slide);
}

function addCertSuiteSlide(pptx) {
  const slide = pptx.addSlide();
  addRedBar(slide);
  slide.addText('Cert Suite', {
    x: 0.8, y: 0.5, w: 11, h: 0.8,
    fontSize: 28, color: RH_DARK, bold: true
  });

  const suites = [
    'Access Control', 'Affiliated Certification', 'Lifecycle',
    'Manageability', 'Networking', 'Observability',
    'Operator', 'Performance', 'Platform Alteration', 'Preflight'
  ];

  const tableData = [
    [{ text: '#', options: { bold: true, color: WHITE, fill: { color: RH_DARK } } },
     { text: 'Test Suite', options: { bold: true, color: WHITE, fill: { color: RH_DARK } } }]
  ];
  suites.forEach((s, i) => {
    tableData.push([
      { text: String(i + 1), options: { align: 'center' } },
      { text: s }
    ]);
  });

  slide.addTable(tableData, {
    x: 0.8, y: 1.5, w: 6, colW: [0.6, 5.4],
    fontSize: 12, border: { pt: 0.5, color: 'E0E0E0' },
    rowH: 0.35, autoPage: false
  });

  slide.addText(
    'Scenarios:\n- Telco (Mandatory / Optional)\n- Non-Telco\n- Far-Edge\n- Extended',
    { x: 7.5, y: 1.5, w: 5, h: 3, fontSize: 13, color: RH_DARK, valign: 'top' }
  );
  addFooter(slide);
}

function addTestSummarySlide(pptx, totals, resultsBySuite) {
  const slide = pptx.addSlide();
  addRedBar(slide);
  slide.addText('Test Cases Summary', {
    x: 0.8, y: 0.5, w: 11, h: 0.8,
    fontSize: 28, color: RH_DARK, bold: true
  });

  slide.addText(`Total Test Cases: ${totals.total}`, {
    x: 0.8, y: 1.4, w: 11, h: 0.5,
    fontSize: 18, color: RH_DARK, bold: true
  });

  const tableData = [
    [
      { text: 'Suite', options: { bold: true, color: WHITE, fill: { color: RH_DARK } } },
      { text: 'Count', options: { bold: true, color: WHITE, fill: { color: RH_DARK }, align: 'center' } }
    ]
  ];

  const suites = Object.keys(resultsBySuite).sort();
  for (const suite of suites) {
    tableData.push([
      { text: formatSuiteName(suite) },
      { text: String(resultsBySuite[suite].length), options: { align: 'center' } }
    ]);
  }

  slide.addTable(tableData, {
    x: 0.8, y: 2.1, w: 8, colW: [5, 3],
    fontSize: 11, border: { pt: 0.5, color: 'E0E0E0' },
    rowH: 0.35, autoPage: false
  });
  addFooter(slide);
}

function addSectionDivider(pptx, title) {
  const slide = pptx.addSlide();
  slide.background = { color: RH_DARK };
  slide.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.12, fill: { color: RH_RED } });
  slide.addText(title, {
    x: 0, y: 2.5, w: 13.33, h: 2.0,
    fontSize: 40, color: WHITE, align: 'center', bold: true
  });
}

function addEnvironmentSlide(pptx, cnf, environment) {
  const env = environment || {};
  const pods = env.pods || {};
  const cluster = env.cluster || {};
  const hw = env.hardware || {};
  const config = env.config || {};

  const slide = pptx.addSlide();
  addRedBar(slide);
  slide.addText(`${cnf} — Cluster Architecture`, {
    x: 0.8, y: 0.5, w: 11, h: 0.8,
    fontSize: 28, color: RH_DARK, bold: true
  });

  // Left: Cluster & workload summary table
  const ns = (config.targetNamespaces || []).join(', ') || 'N/A';
  const labels = (config.podsUnderTestLabels || []).join(', ') || 'N/A';
  const testPodCount = (pods.testPods || []).length;
  const containerCount = (pods.testPods || []).reduce((sum, p) => sum + (p.containers || []).length, 0);
  const depCount = (pods.testDeployments || []).length;
  const stsCount = (pods.testStatefulSets || []).length;
  const opCount = (cluster.operators || []).length;
  const failedOps = (cluster.operators || []).filter(o => o.status === 'Failed').length;

  const infoTable = [
    [{ text: 'Property', options: { bold: true, color: WHITE, fill: { color: RH_DARK } } },
     { text: 'Value', options: { bold: true, color: WHITE, fill: { color: RH_DARK } } }],
    [{ text: 'Target Namespace' }, { text: ns }],
    [{ text: 'Pod Selector' }, { text: labels }],
    [{ text: 'Test Pods' }, { text: `${testPodCount} pods, ${containerCount} containers` }],
    [{ text: 'Workloads' }, { text: `${depCount} Deployments, ${stsCount} StatefulSets` }],
    [{ text: 'PDB Count' }, { text: String((pods.podDisruptionBudgets || []).length) }],
    [{ text: 'Operators' }, { text: `${opCount} total${failedOps ? `, ${failedOps} failed` : ''}` }],
    [{ text: 'Storage Classes' }, { text: String((cluster.storageClasses || []).length) }]
  ];

  slide.addTable(infoTable, {
    x: 0.8, y: 1.5, w: 6, colW: [2.5, 3.5],
    fontSize: 11, border: { pt: 0.5, color: 'E0E0E0' },
    rowH: 0.35, autoPage: false
  });

  // Right: Hardware / SR-IOV summary
  const sriovPolicies = hw.sriovPolicies || [];
  if (sriovPolicies.length > 0) {
    slide.addText('SR-IOV Network Policies', {
      x: 7.5, y: 1.5, w: 5, h: 0.4,
      fontSize: 13, color: RH_DARK, bold: true
    });

    const sriovTable = [
      [{ text: 'Policy', options: { bold: true, color: WHITE, fill: { color: RH_DARK }, fontSize: 9 } },
       { text: 'VFs', options: { bold: true, color: WHITE, fill: { color: RH_DARK }, fontSize: 9, align: 'center' } },
       { text: 'Type', options: { bold: true, color: WHITE, fill: { color: RH_DARK }, fontSize: 9 } },
       { text: 'NIC', options: { bold: true, color: WHITE, fill: { color: RH_DARK }, fontSize: 9 } }]
    ];
    for (const p of sriovPolicies) {
      const nic = p.nicSelector || {};
      sriovTable.push([
        { text: p.name, options: { fontSize: 8 } },
        { text: String(p.numVfs), options: { fontSize: 8, align: 'center' } },
        { text: p.deviceType, options: { fontSize: 8 } },
        { text: `${nic.vendor || ''}:${nic.deviceID || ''}`, options: { fontSize: 8 } }
      ]);
    }
    slide.addTable(sriovTable, {
      x: 7.5, y: 2.0, w: 5.3, colW: [2, 0.6, 1.2, 1.5],
      border: { pt: 0.5, color: 'E0E0E0' },
      rowH: 0.3, autoPage: false
    });
  } else {
    slide.addText('No SR-IOV policies configured', {
      x: 7.5, y: 1.5, w: 5, h: 1,
      fontSize: 12, color: RH_GREY, italic: true, valign: 'top'
    });
  }

  // Bottom: Pod summary
  const testPods = pods.testPods || [];
  if (testPods.length > 0) {
    const podTableY = Math.max(sriovPolicies.length > 0 ? 2.0 + (sriovPolicies.length + 1) * 0.3 + 0.3 : 3.0, 4.2);
    slide.addText('Test Pods', {
      x: 0.8, y: podTableY, w: 12, h: 0.4,
      fontSize: 13, color: RH_DARK, bold: true
    });

    const podTable = [
      [{ text: 'Pod', options: { bold: true, color: WHITE, fill: { color: RH_DARK }, fontSize: 9 } },
       { text: 'Containers', options: { bold: true, color: WHITE, fill: { color: RH_DARK }, fontSize: 9, align: 'center' } },
       { text: 'CPU (req/lim)', options: { bold: true, color: WHITE, fill: { color: RH_DARK }, fontSize: 9 } },
       { text: 'Memory (req/lim)', options: { bold: true, color: WHITE, fill: { color: RH_DARK }, fontSize: 9 } },
       { text: 'Security', options: { bold: true, color: WHITE, fill: { color: RH_DARK }, fontSize: 9 } }]
    ];

    for (const pod of testPods) {
      const containers = pod.containers || [];
      const cpuReqs = containers.map(c => (c.resources?.requests?.cpu) || '-').join(', ');
      const cpuLims = containers.map(c => (c.resources?.limits?.cpu) || '-').join(', ');
      const memReqs = containers.map(c => (c.resources?.requests?.memory) || '-').join(', ');
      const memLims = containers.map(c => (c.resources?.limits?.memory) || '-').join(', ');

      const secIssues = [];
      if (pod.hostNetwork) secIssues.push('hostNet');
      if (pod.hostPID) secIssues.push('hostPID');
      const hasPrivEsc = containers.some(c => c.securityContext?.allowPrivilegeEscalation !== false);
      if (hasPrivEsc) secIssues.push('privEsc');
      const secText = secIssues.length > 0 ? secIssues.join(', ') : 'OK';
      const secColor = secIssues.length > 0 ? 'DC3545' : '28A745';

      podTable.push([
        { text: pod.name, options: { fontSize: 8 } },
        { text: String(containers.length), options: { fontSize: 8, align: 'center' } },
        { text: `${cpuReqs} / ${cpuLims}`, options: { fontSize: 8 } },
        { text: `${memReqs} / ${memLims}`, options: { fontSize: 8 } },
        { text: secText, options: { fontSize: 8, color: secColor, bold: true } }
      ]);
    }

    slide.addTable(podTable, {
      x: 0.8, y: podTableY + 0.4, w: 12, colW: [3.5, 1, 2.5, 2.5, 2.5],
      border: { pt: 0.5, color: 'E0E0E0' },
      rowH: 0.35, autoPage: false
    });
  }

  addFooter(slide);
}

function addTestScenarioSlide(pptx, meta) {
  const slide = pptx.addSlide();
  addRedBar(slide);
  slide.addText('Test Scenario', {
    x: 0.8, y: 0.5, w: 11, h: 0.8,
    fontSize: 28, color: RH_DARK, bold: true
  });

  const versionTable = [
    [
      { text: 'Component', options: { bold: true, color: WHITE, fill: { color: RH_DARK } } },
      { text: 'Version', options: { bold: true, color: WHITE, fill: { color: RH_DARK } } }
    ],
    [{ text: 'Kubernetes' }, { text: meta.k8sVersion || 'N/A' }],
    [{ text: 'OpenShift' }, { text: meta.ocpVersion || 'N/A' }],
    [{ text: 'Certsuite' }, { text: meta.certSuiteVersion || 'N/A' }],
    [{ text: 'CNF' }, { text: meta.cnfVersion || 'N/A' }]
  ];

  slide.addTable(versionTable, {
    x: 0.8, y: 1.5, w: 6, colW: [3, 3],
    fontSize: 13, border: { pt: 0.5, color: 'E0E0E0' },
    rowH: 0.4, autoPage: false
  });

  const runInfo = [];
  if (meta.startTime) runInfo.push(`Start: ${new Date(meta.startTime).toLocaleString()}`);
  if (meta.endTime) runInfo.push(`End: ${new Date(meta.endTime).toLocaleString()}`);
  if (runInfo.length > 0) {
    slide.addText(runInfo.join('\n'), {
      x: 7.5, y: 1.5, w: 5, h: 1.5,
      fontSize: 12, color: RH_GREY, valign: 'top'
    });
  }
  addFooter(slide);
}

function addResultsSummarySlide(pptx, totals, resultsBySuite) {
  const slide = pptx.addSlide();
  addRedBar(slide);
  slide.addText('Summary of Results', {
    x: 0.8, y: 0.5, w: 11, h: 0.8,
    fontSize: 28, color: RH_DARK, bold: true
  });

  // Left side: totals
  const totalItems = [
    { label: 'Failed', value: totals.failed, color: 'DC3545' },
    { label: 'Passed', value: totals.passed, color: '28A745' },
    { label: 'Skipped', value: totals.skipped, color: '6C757D' },
    { label: 'Total', value: totals.total, color: RH_DARK }
  ];

  totalItems.forEach((item, i) => {
    const y = 1.8 + i * 0.9;
    slide.addText(item.label, { x: 1.0, y, w: 2.5, h: 0.6, fontSize: 18, color: RH_DARK, valign: 'middle' });
    slide.addText(String(item.value), {
      x: 3.5, y, w: 2, h: 0.6,
      fontSize: 24, color: item.color, bold: true, align: 'center', valign: 'middle'
    });
  });

  // Right side: per-suite breakdown
  const suiteTable = [
    [
      { text: 'Suite', options: { bold: true, color: WHITE, fill: { color: RH_DARK }, fontSize: 9 } },
      { text: 'Pass', options: { bold: true, color: WHITE, fill: { color: RH_DARK }, fontSize: 9, align: 'center' } },
      { text: 'Fail', options: { bold: true, color: WHITE, fill: { color: RH_DARK }, fontSize: 9, align: 'center' } },
      { text: 'Skip', options: { bold: true, color: WHITE, fill: { color: RH_DARK }, fontSize: 9, align: 'center' } }
    ]
  ];

  const suites = Object.keys(resultsBySuite).sort();
  for (const suite of suites) {
    const r = resultsBySuite[suite];
    const p = r.filter(x => x.normalizedState === 'passed').length;
    const f = r.filter(x => x.normalizedState === 'failed').length;
    const s = r.filter(x => x.normalizedState === 'skipped').length;
    suiteTable.push([
      { text: formatSuiteName(suite), options: { fontSize: 9 } },
      { text: String(p), options: { fontSize: 9, align: 'center', color: '28A745' } },
      { text: String(f), options: { fontSize: 9, align: 'center', color: 'DC3545' } },
      { text: String(s), options: { fontSize: 9, align: 'center', color: '6C757D' } }
    ]);
  }

  slide.addTable(suiteTable, {
    x: 6.5, y: 1.5, w: 6.3, colW: [2.7, 1.2, 1.2, 1.2],
    border: { pt: 0.5, color: 'E0E0E0' },
    rowH: 0.33, autoPage: false
  });
  addFooter(slide);
}

function addFailedByCategorySlides(pptx, resultsBySuite) {
  const failed = [];
  for (const [suite, results] of Object.entries(resultsBySuite)) {
    for (const r of results) {
      if (r.normalizedState === 'failed') failed.push(r);
    }
  }
  if (failed.length === 0) return;

  failed.sort((a, b) => {
    const cat = (a.suite || '').localeCompare(b.suite || '');
    if (cat !== 0) return cat;
    return (a.priority ?? 4) - (b.priority ?? 4);
  });

  const rowsPerSlide = 10;
  for (let i = 0; i < failed.length; i += rowsPerSlide) {
    const batch = failed.slice(i, i + rowsPerSlide);
    const slide = pptx.addSlide();
    addRedBar(slide);

    const pageNum = Math.floor(i / rowsPerSlide) + 1;
    const totalPages = Math.ceil(failed.length / rowsPerSlide);
    slide.addText(`Failed Tests per Category (${pageNum}/${totalPages})`, {
      x: 0.8, y: 0.5, w: 11, h: 0.7,
      fontSize: 24, color: RH_DARK, bold: true
    });

    const tableData = [
      [
        { text: 'Test ID', options: { bold: true, color: WHITE, fill: { color: RH_DARK }, fontSize: 9 } },
        { text: 'Category', options: { bold: true, color: WHITE, fill: { color: RH_DARK }, fontSize: 9 } },
        { text: 'Priority', options: { bold: true, color: WHITE, fill: { color: RH_DARK }, fontSize: 9, align: 'center' } }
      ]
    ];

    for (const r of batch) {
      const pColor = PRIORITY_COLORS[r.priority ?? 4] || '6C757D';
      tableData.push([
        { text: r.id, options: { fontSize: 8, fontFace: 'Courier New' } },
        { text: formatSuiteName(r.suite || ''), options: { fontSize: 8 } },
        { text: String(r.priority ?? 4), options: { fontSize: 10, bold: true, color: WHITE, fill: { color: pColor }, align: 'center' } }
      ]);
    }

    slide.addTable(tableData, {
      x: 0.5, y: 1.3, w: 12.3, colW: [7.5, 3.5, 1.3],
      border: { pt: 0.5, color: 'E0E0E0' },
      rowH: 0.45, autoPage: false
    });
    addFooter(slide);
  }
}

function addFailedDetailsSlides(pptx, results) {
  const failed = results
    .filter(r => r.normalizedState === 'failed')
    .sort((a, b) => (a.priority ?? 4) - (b.priority ?? 4));

  if (failed.length === 0) return;

  const rowsPerSlide = 5;
  for (let i = 0; i < failed.length; i += rowsPerSlide) {
    const batch = failed.slice(i, i + rowsPerSlide);
    const slide = pptx.addSlide();
    addRedBar(slide);

    const pageNum = Math.floor(i / rowsPerSlide) + 1;
    const totalPages = Math.ceil(failed.length / rowsPerSlide);
    slide.addText(`Failed Test Case Details (${pageNum}/${totalPages})`, {
      x: 0.8, y: 0.5, w: 11, h: 0.7,
      fontSize: 24, color: RH_DARK, bold: true
    });

    const tableData = [
      [
        { text: 'Test ID', options: { bold: true, color: WHITE, fill: { color: RH_DARK }, fontSize: 9 } },
        { text: 'Category', options: { bold: true, color: WHITE, fill: { color: RH_DARK }, fontSize: 9 } },
        { text: 'Impact', options: { bold: true, color: WHITE, fill: { color: RH_DARK }, fontSize: 9 } },
        { text: 'Remediation', options: { bold: true, color: WHITE, fill: { color: RH_DARK }, fontSize: 9 } },
        { text: 'Priority', options: { bold: true, color: WHITE, fill: { color: RH_DARK }, fontSize: 9, align: 'center' } }
      ]
    ];

    for (const r of batch) {
      const pColor = PRIORITY_COLORS[r.priority ?? 4] || '6C757D';
      tableData.push([
        { text: r.id, options: { fontSize: 8, fontFace: 'Courier New' } },
        { text: formatSuiteName(r.suite || ''), options: { fontSize: 8 } },
        { text: r.impact || r.description || '', options: { fontSize: 8 } },
        { text: r.remediation || '', options: { fontSize: 8 } },
        { text: String(r.priority ?? 4), options: { fontSize: 10, bold: true, color: WHITE, fill: { color: pColor }, align: 'center' } }
      ]);
    }

    slide.addTable(tableData, {
      x: 0.3, y: 1.3, w: 12.7, colW: [3, 1.8, 3.2, 3.5, 1.2],
      border: { pt: 0.5, color: 'E0E0E0' },
      rowH: 0.9, autoPage: false
    });
    addFooter(slide);
  }
}

function addRecommendationsSlide(pptx) {
  const slide = pptx.addSlide();
  addRedBar(slide);
  slide.addText('Recommendations', {
    x: 0.8, y: 0.5, w: 11, h: 0.8,
    fontSize: 28, color: RH_DARK, bold: true
  });

  const recs = [
    'Address all Priority 0 (security-critical) failures before certification submission',
    'Review Priority 1 host access violations — these often indicate missing security context constraints',
    'Ensure all pods have proper lifecycle probes (readiness, liveness, startup)',
    'Verify network policies are configured for all namespaces',
    'Review skipped tests marked as "Needs Review" for potential missed configurations',
    'Re-run the certsuite after applying fixes to confirm resolution'
  ];

  slide.addText(
    recs.map(r => ({ text: r + '\n', options: { fontSize: 14, color: RH_DARK, bullet: true, paraSpaceAfter: 10 } })),
    { x: 1.0, y: 1.5, w: 11, h: 5.0 }
  );
  addFooter(slide);
}

function addThankYouSlide(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: RH_DARK };
  slide.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.12, fill: { color: RH_RED } });
  slide.addText('Thank you', {
    x: 0, y: 2.0, w: 13.33, h: 1.5,
    fontSize: 48, color: WHITE, align: 'center', bold: true
  });
  slide.addText('Red Hat Telco Engineering', {
    x: 0, y: 3.8, w: 13.33, h: 0.8,
    fontSize: 18, color: RH_GREY, align: 'center'
  });
  slide.addText('redhat.com  |  github.com/redhat-best-practices-for-k8s', {
    x: 0, y: 5.5, w: 13.33, h: 0.5,
    fontSize: 11, color: RH_GREY, align: 'center'
  });
}

function formatSuiteName(suite) {
  return suite.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

module.exports = { generate };
