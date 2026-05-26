const ExcelJS = require('exceljs');

const STATUS_COLORS = {
  passed: { bg: 'FF28A745', font: 'FFFFFFFF' },
  failed: { bg: 'FFDC3545', font: 'FFFFFFFF' },
  skipped: { bg: 'FF6C757D', font: 'FFFFFFFF' }
};

const CHANGE_COLORS = {
  improved:  { bg: 'FF28A745', font: 'FFFFFFFF' },
  regressed: { bg: 'FFDC3545', font: 'FFFFFFFF' },
  unchanged: { bg: 'FF6C757D', font: 'FFFFFFFF' },
  added:     { bg: 'FF0D6EFD', font: 'FFFFFFFF' },
  removed:   { bg: 'FFADB5BD', font: 'FF333333' }
};

const HEADER_STYLE = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF151515' } };
const SECTION_STYLE = { bold: true, size: 12, color: { argb: 'FFEE0000' } };
const THIN_BORDER = {
  top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
  left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
  bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
  right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
};

const CHANGE_ORDER = { regressed: 0, improved: 1, added: 2, removed: 3, unchanged: 4 };

function formatSuiteName(suite) {
  return suite.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function applyHeaderRow(row) {
  row.font = HEADER_STYLE;
  row.fill = HEADER_FILL;
  row.alignment = { vertical: 'middle', wrapText: true };
  row.height = 28;
  row.eachCell(c => { c.border = THIN_BORDER; });
}

function applyBorders(sheet) {
  const total = sheet.rowCount;
  const cols = sheet.columnCount;
  for (let i = 1; i <= total; i++) {
    const row = sheet.getRow(i);
    for (let j = 1; j <= cols; j++) {
      row.getCell(j).border = THIN_BORDER;
    }
  }
}

function colorStatusCell(cell, state) {
  if (!state) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
    cell.font = { color: { argb: 'FF999999' } };
    return;
  }
  const c = STATUS_COLORS[state] || STATUS_COLORS.skipped;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.bg } };
  cell.font = { bold: true, color: { argb: c.font } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
}

function colorChangeCell(cell, change) {
  const c = CHANGE_COLORS[change] || CHANGE_COLORS.unchanged;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.bg } };
  cell.font = { bold: true, color: { argb: c.font } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
}

function getTestDetails(t) {
  if (t.change === 'regressed' && t.failureDetailsB?.length) {
    const reason = t.failureDetailsB[0].reason || JSON.stringify(t.failureDetailsB[0]);
    return typeof reason === 'string' ? reason : JSON.stringify(reason);
  }
  if (t.change === 'improved' && t.failureDetailsA?.length) {
    const reason = t.failureDetailsA[0].reason || JSON.stringify(t.failureDetailsA[0]);
    return 'Was: ' + (typeof reason === 'string' ? reason : JSON.stringify(reason));
  }
  return t.descriptionB || t.descriptionA || '';
}

function collectAllTests(comparisonBySuite) {
  const tests = [];
  for (const [suite, data] of Object.entries(comparisonBySuite)) {
    for (const t of data.tests) {
      tests.push({ ...t, suite });
    }
  }
  return tests;
}

function addSummarySheet(workbook, session) {
  const sheet = workbook.addWorksheet('Comparison Summary');
  const metaA = session.claimDataA?.metadata || {};
  const metaB = session.claimDataB?.metadata || {};
  const { summary, deltaTotals, comparisonBySuite } = session.comparison;
  const totalsA = session.claimDataA?.totals || {};
  const totalsB = session.claimDataB?.totals || {};

  let row = 1;

  // Report A metadata
  const rA = sheet.getRow(row++);
  rA.getCell(1).value = 'Report A';
  rA.getCell(1).font = SECTION_STYLE;
  sheet.getRow(row).values = [
    metaA.cnfVersion || 'N/A',
    `OCP ${metaA.ocpVersion || 'N/A'}`,
    `Certsuite ${metaA.certSuiteVersion || 'N/A'}`,
    metaA.startTime ? new Date(metaA.startTime).toLocaleString() : 'N/A'
  ];
  row++;
  row++;

  // Report B metadata
  const rB = sheet.getRow(row++);
  rB.getCell(1).value = 'Report B';
  rB.getCell(1).font = SECTION_STYLE;
  sheet.getRow(row).values = [
    metaB.cnfVersion || 'N/A',
    `OCP ${metaB.ocpVersion || 'N/A'}`,
    `Certsuite ${metaB.certSuiteVersion || 'N/A'}`,
    metaB.startTime ? new Date(metaB.startTime).toLocaleString() : 'N/A'
  ];
  row++;
  row++;

  // Overall Delta
  const deltaHeader = sheet.getRow(row++);
  deltaHeader.getCell(1).value = 'Overall Delta';
  deltaHeader.getCell(1).font = SECTION_STYLE;

  const deltaHdr = sheet.getRow(row++);
  deltaHdr.values = ['Metric', 'Report A', 'Report B', 'Delta'];
  applyHeaderRow(deltaHdr);

  const deltaRows = [
    ['Passed', totalsA.passed || 0, totalsB.passed || 0, deltaTotals.passed || 0],
    ['Failed', totalsA.failed || 0, totalsB.failed || 0, deltaTotals.failed || 0],
    ['Skipped', totalsA.skipped || 0, totalsB.skipped || 0, deltaTotals.skipped || 0],
    ['Total', totalsA.total || 0, totalsB.total || 0, (totalsB.total || 0) - (totalsA.total || 0)]
  ];
  for (const d of deltaRows) {
    const r = sheet.getRow(row++);
    r.values = d;
    const deltaCell = r.getCell(4);
    const val = d[3];
    if (d[0] === 'Passed' && val > 0) {
      deltaCell.font = { bold: true, color: { argb: 'FF28A745' } };
    } else if (d[0] === 'Failed' && val > 0) {
      deltaCell.font = { bold: true, color: { argb: 'FFDC3545' } };
    } else if (d[0] === 'Failed' && val < 0) {
      deltaCell.font = { bold: true, color: { argb: 'FF28A745' } };
    } else if (d[0] === 'Passed' && val < 0) {
      deltaCell.font = { bold: true, color: { argb: 'FFDC3545' } };
    }
  }
  row++;

  // Change Summary
  const changeHeader = sheet.getRow(row++);
  changeHeader.getCell(1).value = 'Change Summary';
  changeHeader.getCell(1).font = SECTION_STYLE;

  const changeHdr = sheet.getRow(row++);
  changeHdr.values = ['Change Type', 'Count'];
  applyHeaderRow(changeHdr);

  const changes = [
    ['Improved', summary.improved],
    ['Regressed', summary.regressed],
    ['Unchanged', summary.unchanged],
    ['Added', summary.addedInB],
    ['Removed', summary.removedInB]
  ];
  for (const [label, count] of changes) {
    const r = sheet.getRow(row++);
    r.values = [label, count];
    const changeCell = r.getCell(1);
    const key = label.toLowerCase();
    if (CHANGE_COLORS[key]) {
      changeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CHANGE_COLORS[key].bg } };
      changeCell.font = { bold: true, color: { argb: CHANGE_COLORS[key].font } };
    }
  }
  row++;

  // Per-Suite Breakdown
  const suiteHeader = sheet.getRow(row++);
  suiteHeader.getCell(1).value = 'Per-Suite Breakdown';
  suiteHeader.getCell(1).font = SECTION_STYLE;

  const suiteHdr = sheet.getRow(row++);
  suiteHdr.values = ['Suite', 'Passed A', 'Failed A', 'Skipped A', 'Passed B', 'Failed B', 'Skipped B'];
  applyHeaderRow(suiteHdr);

  for (const [suite, data] of Object.entries(comparisonBySuite).sort(([a], [b]) => a.localeCompare(b))) {
    const r = sheet.getRow(row++);
    r.values = [
      formatSuiteName(suite),
      data.totalsA.passed, data.totalsA.failed, data.totalsA.skipped,
      data.totalsB.passed, data.totalsB.failed, data.totalsB.skipped
    ];
  }

  sheet.columns = [
    { width: 30 }, { width: 15 }, { width: 15 }, { width: 15 },
    { width: 15 }, { width: 15 }, { width: 15 }
  ];

  applyBorders(sheet);
}

function addChangedTestsSheet(workbook, session) {
  const sheet = workbook.addWorksheet('Changed Tests', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  });

  sheet.columns = [
    { header: 'Test ID', key: 'testId', width: 45 },
    { header: 'Category', key: 'category', width: 25 },
    { header: 'Report A', key: 'stateA', width: 12 },
    { header: 'Report B', key: 'stateB', width: 12 },
    { header: 'Change', key: 'change', width: 12 },
    { header: 'Details', key: 'details', width: 50 }
  ];

  applyHeaderRow(sheet.getRow(1));

  const allTests = collectAllTests(session.comparison.comparisonBySuite);
  const changed = allTests
    .filter(t => t.change !== 'unchanged')
    .sort((a, b) => {
      const co = (CHANGE_ORDER[a.change] ?? 4) - (CHANGE_ORDER[b.change] ?? 4);
      if (co !== 0) return co;
      return (a.suite || '').localeCompare(b.suite || '');
    });

  for (const t of changed) {
    const row = sheet.addRow({
      testId: t.id,
      category: formatSuiteName(t.suite || ''),
      stateA: t.stateA || 'N/A',
      stateB: t.stateB || 'N/A',
      change: t.change,
      details: getTestDetails(t)
    });
    row.alignment = { vertical: 'top', wrapText: true };
    colorStatusCell(row.getCell('stateA'), t.stateA);
    colorStatusCell(row.getCell('stateB'), t.stateB);
    colorChangeCell(row.getCell('change'), t.change);
  }

  applyBorders(sheet);
}

function addAllTestsSheet(workbook, session) {
  const sheet = workbook.addWorksheet('All Tests Comparison', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  });

  sheet.columns = [
    { header: 'Test ID', key: 'testId', width: 45 },
    { header: 'Category', key: 'category', width: 25 },
    { header: 'Report A', key: 'stateA', width: 12 },
    { header: 'Report B', key: 'stateB', width: 12 },
    { header: 'Change', key: 'change', width: 12 },
    { header: 'Priority', key: 'priority', width: 10 },
    { header: 'Description', key: 'description', width: 40 }
  ];

  applyHeaderRow(sheet.getRow(1));

  const allTests = collectAllTests(session.comparison.comparisonBySuite)
    .sort((a, b) => {
      const cat = (a.suite || '').localeCompare(b.suite || '');
      if (cat !== 0) return cat;
      return (CHANGE_ORDER[a.change] ?? 4) - (CHANGE_ORDER[b.change] ?? 4);
    });

  for (const t of allTests) {
    const row = sheet.addRow({
      testId: t.id,
      category: formatSuiteName(t.suite || ''),
      stateA: t.stateA || 'N/A',
      stateB: t.stateB || 'N/A',
      change: t.change,
      priority: t.priorityB ?? t.priorityA ?? '-',
      description: t.descriptionB || t.descriptionA || ''
    });
    row.alignment = { vertical: 'top', wrapText: true };
    colorStatusCell(row.getCell('stateA'), t.stateA);
    colorStatusCell(row.getCell('stateB'), t.stateB);
    colorChangeCell(row.getCell('change'), t.change);
  }

  applyBorders(sheet);
}

async function generate(session) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CNF Best Practice Report Generator';
  workbook.created = new Date();

  addSummarySheet(workbook, session);
  addChangedTestsSheet(workbook, session);
  addAllTestsSheet(workbook, session);

  return workbook.xlsx.writeBuffer();
}

module.exports = { generate };
