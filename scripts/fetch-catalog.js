const https = require('https');
const fs = require('fs');
const path = require('path');

const CATALOG_URL = 'https://raw.githubusercontent.com/redhat-best-practices-for-k8s/certsuite/main/CATALOG.md';
const OUTPUT_PATH = path.join(__dirname, '..', 'server', 'data', 'catalog.json');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseCatalog(md) {
  const catalog = {};
  let currentSuite = null;
  let currentTest = null;
  let inScenarioSection = false;

  const lines = md.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // H3 = suite name (### access-control)
    const suiteMatch = line.match(/^### ([a-z][a-z0-9-]+)\s*$/);
    if (suiteMatch) {
      currentSuite = suiteMatch[1].trim();
      currentTest = null;
      inScenarioSection = false;
      continue;
    }

    // H4 = test ID (#### access-control-bpf-capability-check)
    const testMatch = line.match(/^#### ([a-z][a-z0-9-]+)\s*$/);
    if (testMatch) {
      currentTest = testMatch[1].trim();
      inScenarioSection = false;
      catalog[currentTest] = {
        suite: currentSuite || '',
        description: '',
        remediation: '',
        bestPracticeReference: '',
        tags: '',
        impact: '',
        scenarios: {}
      };
      continue;
    }

    // Reset on any other heading
    if (line.match(/^#{1,2} /)) {
      currentTest = null;
      inScenarioSection = false;
      continue;
    }

    if (!currentTest || !catalog[currentTest]) continue;

    // Table separator row
    if (line.match(/^\|[-\s|]+\|$/)) continue;

    // Table row: |key|value|
    const rowMatch = line.match(/^\|(.+?)\|(.+?)\|?\s*$/);
    if (!rowMatch) {
      if (line.trim() === '') inScenarioSection = false;
      continue;
    }

    let key = rowMatch[1].trim().replace(/\*\*/g, '');
    let value = rowMatch[2].trim().replace(/\*\*/g, '');

    // Skip header rows
    if (key === 'Property' && value === 'Description') continue;
    if (key === 'Scenario' && value.match(/optional.*mandatory/i)) {
      inScenarioSection = true;
      continue;
    }

    if (inScenarioSection) {
      const normalizedScenario = key
        .replace(/far[- ]?edge/i, 'FarEdge')
        .replace(/non[- ]?telco/i, 'NonTelco');
      catalog[currentTest].scenarios[normalizedScenario] = value;
      continue;
    }

    // Map property names
    const keyLower = key.toLowerCase();
    if (keyLower === 'description') {
      catalog[currentTest].description = value;
    } else if (keyLower === 'suggested remediation' || keyLower === 'remediation') {
      catalog[currentTest].remediation = value;
    } else if (keyLower === 'best practice reference') {
      catalog[currentTest].bestPracticeReference = value;
    } else if (keyLower === 'tags') {
      catalog[currentTest].tags = value;
    } else if (keyLower === 'impact statement' || keyLower === 'impact') {
      catalog[currentTest].impact = value;
    } else if (keyLower.match(/^(extended|far-?edge|non-?telco|telco)$/)) {
      // Scenario row without explicit Scenario header
      inScenarioSection = true;
      const normalizedScenario = key
        .replace(/far[- ]?edge/i, 'FarEdge')
        .replace(/non[- ]?telco/i, 'NonTelco');
      catalog[currentTest].scenarios[normalizedScenario] = value;
    }
  }

  for (const entry of Object.values(catalog)) {
    if (entry.remediation) {
      entry.remediation = stripExceptionText(entry.remediation);
    }
  }

  return catalog;
}

function stripExceptionText(text) {
  return text
    .split(/(?<=[.;])\s+|(?:^|\s+)(?=No exceptions?\b)/i)
    .filter(s => !/\bexceptions?\b/i.test(s))
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function main() {
  console.log('Fetching CATALOG.md...');
  const md = await fetch(CATALOG_URL);
  console.log(`Downloaded ${(md.length / 1024).toFixed(1)} KB`);

  const catalog = parseCatalog(md);
  const count = Object.keys(catalog).length;
  console.log(`Parsed ${count} test entries`);

  const suites = {};
  for (const entry of Object.values(catalog)) {
    suites[entry.suite] = (suites[entry.suite] || 0) + 1;
  }
  console.log('Suites:', JSON.stringify(suites));

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(catalog, null, 2));
  console.log(`Written to ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
