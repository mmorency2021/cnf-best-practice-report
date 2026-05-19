function initFilters(data) {
  populateCategoryDropdown(data.resultsBySuite);

  document.getElementById('filter-category').addEventListener('change', applyFilters);
  document.getElementById('filter-scenario').addEventListener('change', applyFilters);
  document.getElementById('filter-passed').addEventListener('change', applyFilters);
  document.getElementById('filter-failed').addEventListener('change', applyFilters);
  document.getElementById('filter-skipped').addEventListener('change', applyFilters);
}

function populateCategoryDropdown(resultsBySuite) {
  const select = document.getElementById('filter-category');
  select.innerHTML = '<option value="all">All Categories</option>';
  const suites = Object.keys(resultsBySuite).sort();
  for (const suite of suites) {
    const opt = document.createElement('option');
    opt.value = suite;
    opt.textContent = formatSuiteName(suite);
    select.appendChild(opt);
  }
}

function applyFilters() {
  const category = document.getElementById('filter-category').value;
  const scenario = document.getElementById('filter-scenario').value;
  const showPassed = document.getElementById('filter-passed').checked;
  const showFailed = document.getElementById('filter-failed').checked;
  const showSkipped = document.getElementById('filter-skipped').checked;

  const allowedStatuses = new Set();
  if (showPassed) allowedStatuses.add('passed');
  if (showFailed) allowedStatuses.add('failed');
  if (showSkipped) allowedStatuses.add('skipped');

  // Filter suite sections
  document.querySelectorAll('.suite-section').forEach(section => {
    const suite = section.dataset.suite;
    const categoryMatch = category === 'all' || suite === category;
    section.style.display = categoryMatch ? '' : 'none';

    if (!categoryMatch) return;

    let visibleCount = 0;
    section.querySelectorAll('.test-table tbody tr').forEach(row => {
      const status = row.dataset.status;
      const statusMatch = allowedStatuses.has(status);
      const scenarioMatch = matchScenario(row, scenario);
      const visible = statusMatch && scenarioMatch;
      row.style.display = visible ? '' : 'none';
      if (visible) visibleCount++;
    });

    section.style.display = categoryMatch && visibleCount > 0 ? '' : 'none';
  });

  // Update category summary visibility
  updateCategorySummaryFiltered(category, allowedStatuses, scenario);
}

function matchScenario(row, scenario) {
  if (scenario === 'all') return true;

  try {
    const scenarios = JSON.parse(row.dataset.scenario || '{}');
    if (scenario === 'telco-mandatory') {
      return scenarios.Telco === 'Mandatory' || scenarios.telco === 'Mandatory';
    }
    if (scenario === 'telco-optional') {
      return scenarios.Telco === 'Optional' || scenarios.telco === 'Optional';
    }
  } catch {
    return true;
  }
  return true;
}

function updateCategorySummaryFiltered(category, allowedStatuses, scenario) {
  if (!appState.data) return;
  const resultsBySuite = appState.data.resultsBySuite;
  const container = document.getElementById('category-summary');
  const suites = Object.keys(resultsBySuite).sort();

  let rows = '';
  for (const suite of suites) {
    if (category !== 'all' && suite !== category) continue;

    let results = resultsBySuite[suite];
    if (scenario !== 'all') {
      results = results.filter(r => {
        const sc = r.scenarios || {};
        if (scenario === 'telco-mandatory') return sc.Telco === 'Mandatory' || sc.telco === 'Mandatory';
        if (scenario === 'telco-optional') return sc.Telco === 'Optional' || sc.telco === 'Optional';
        return true;
      });
    }

    const passed = results.filter(r => r.normalizedState === 'passed' && allowedStatuses.has('passed')).length;
    const failed = results.filter(r => r.normalizedState === 'failed' && allowedStatuses.has('failed')).length;
    const skipped = results.filter(r => r.normalizedState === 'skipped' && allowedStatuses.has('skipped')).length;
    const total = passed + failed + skipped;
    if (total === 0) continue;

    rows += `<tr>
      <td style="font-weight:600;">${formatSuiteName(suite)}</td>
      <td>${total}</td>
      <td style="color:var(--color-passed);font-weight:600;">${passed}</td>
      <td style="color:var(--color-failed);font-weight:600;">${failed}</td>
      <td style="color:var(--color-skipped);font-weight:600;">${skipped}</td>
    </tr>`;
  }

  container.innerHTML = `<table>
    <thead><tr><th>Category</th><th>Total</th><th>Passed</th><th>Failed</th><th>Skipped</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}
