function initFilters(data) {
  populateCategoryDropdown(data.resultsBySuite);

  document.getElementById('filter-category').addEventListener('change', applyFilters);
  document.getElementById('filter-scenario').addEventListener('change', applyFilters);
  document.getElementById('filter-passed').addEventListener('change', applyFilters);
  document.getElementById('filter-failed').addEventListener('change', applyFilters);
  document.getElementById('filter-skipped').addEventListener('change', applyFilters);

  initMultiSelect('filter-priority', applyFilters);
}

function initMultiSelect(id, onChange) {
  const wrapper = document.getElementById(id);
  if (!wrapper) return;
  const toggle = wrapper.querySelector('.multi-select-toggle');
  const checkboxes = wrapper.querySelectorAll('input[type="checkbox"]');

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.multi-select.open').forEach(el => { if (el !== wrapper) el.classList.remove('open'); });
    wrapper.classList.toggle('open');
    toggle.setAttribute('aria-expanded', wrapper.classList.contains('open'));
  });

  checkboxes.forEach(cb => cb.addEventListener('change', () => {
    updateMultiSelectLabel(wrapper);
    onChange();
  }));
}

function updateMultiSelectLabel(wrapper) {
  const toggle = wrapper.querySelector('.multi-select-toggle');
  const checkboxes = wrapper.querySelectorAll('input[type="checkbox"]');
  const checked = wrapper.querySelectorAll('input[type="checkbox"]:checked');
  if (checked.length === checkboxes.length) {
    toggle.textContent = 'All Priorities';
  } else if (checked.length === 0) {
    toggle.textContent = 'None';
  } else {
    toggle.textContent = Array.from(checked).map(cb => 'P' + cb.value).join(', ');
  }
}

function getSelectedPriorities(id) {
  const wrapper = document.getElementById(id);
  if (!wrapper) return null;
  const checkboxes = wrapper.querySelectorAll('input[type="checkbox"]');
  const checked = wrapper.querySelectorAll('input[type="checkbox"]:checked');
  if (checked.length === checkboxes.length) return null;
  return new Set(Array.from(checked).map(cb => Number(cb.value)));
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

  const allowedPriorities = getSelectedPriorities('filter-priority');

  let totalVisible = 0;

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
      const priorityMatch = !allowedPriorities || allowedPriorities.has(Number(row.dataset.priority));
      const visible = statusMatch && scenarioMatch && priorityMatch;
      row.style.display = visible ? '' : 'none';
      if (visible) visibleCount++;
    });

    section.style.display = categoryMatch && visibleCount > 0 ? '' : 'none';
    totalVisible += visibleCount;
  });

  let emptyEl = document.getElementById('filter-empty-state');
  if (totalVisible === 0) {
    if (!emptyEl) {
      emptyEl = document.createElement('div');
      emptyEl.id = 'filter-empty-state';
      emptyEl.className = 'filter-empty';
      emptyEl.innerHTML = '<p>No tests match the current filters.</p><button class="btn btn-outline" onclick="clearAllFilters()">Clear Filters</button>';
      document.getElementById('test-tables').appendChild(emptyEl);
    }
    emptyEl.style.display = '';
  } else if (emptyEl) {
    emptyEl.style.display = 'none';
  }

  // Update category summary visibility
  updateCategorySummaryFiltered(category, allowedStatuses, scenario, allowedPriorities);
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

function updateCategorySummaryFiltered(category, allowedStatuses, scenario, allowedPriorities) {
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
    if (allowedPriorities) {
      results = results.filter(r => allowedPriorities.has(r.priority ?? 4));
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

function clearAllFilters() {
  document.getElementById('filter-category').value = 'all';
  document.getElementById('filter-scenario').value = 'all';
  document.getElementById('filter-passed').checked = true;
  document.getElementById('filter-failed').checked = true;
  document.getElementById('filter-skipped').checked = true;
  const pw = document.getElementById('filter-priority');
  if (pw) {
    pw.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = true; });
    updateMultiSelectLabel(pw);
  }
  document.querySelectorAll('.summary-card').forEach(c => c.classList.remove('active'));
  applyFilters();
}
