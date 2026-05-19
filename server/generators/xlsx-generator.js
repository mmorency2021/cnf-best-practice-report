const ExcelJS = require('exceljs');

const PRIORITY_COLORS = {
  0: { bg: 'FFDC3545', font: 'FFFFFFFF' },
  1: { bg: 'FFFD7E14', font: 'FFFFFFFF' },
  2: { bg: 'FFFFC107', font: 'FF333333' },
  3: { bg: 'FF28A745', font: 'FFFFFFFF' },
  4: { bg: 'FF6C757D', font: 'FFFFFFFF' }
};

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
    for (let j = 1; j <= 6; j++) {
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

  return workbook.xlsx.writeBuffer();
}

function formatSuiteName(suite) {
  return suite.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

module.exports = { generate };
