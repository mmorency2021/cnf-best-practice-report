const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const REPORTS_DIR = process.env.REPORTS_DIR || path.join(__dirname, '..', 'server', 'reports');
const DB_PATH = process.env.REPORTS_DB_PATH || path.join(__dirname, '..', 'server', 'reports.db');

const files = fs.readdirSync(REPORTS_DIR).filter(f => f.endsWith('.json') && f !== '_index.json');

if (files.length === 0) {
  console.log('No JSON reports found to migrate.');
  process.exit(0);
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cnf_version TEXT,
    saved_at INTEGER NOT NULL,
    total INTEGER DEFAULT 0,
    passed INTEGER DEFAULT 0,
    failed INTEGER DEFAULT 0,
    skipped INTEGER DEFAULT 0,
    data TEXT NOT NULL
  )
`);

const insert = db.prepare(`
  INSERT OR IGNORE INTO reports (id, name, cnf_version, saved_at, total, passed, failed, skipped, data)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let migrated = 0;
let skipped = 0;

for (const file of files) {
  try {
    const record = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, file), 'utf-8'));
    const totals = record.totals || {};
    const result = insert.run(
      record.id,
      record.name || 'Untitled',
      record.cnfVersion || '',
      record.savedAt || Date.now(),
      totals.total || 0,
      totals.passed || 0,
      totals.failed || 0,
      totals.skipped || 0,
      JSON.stringify(record.sessionData)
    );
    if (result.changes > 0) {
      console.log(`  Migrated: ${record.name || file}`);
      migrated++;
    } else {
      console.log(`  Skipped (already exists): ${record.name || file}`);
      skipped++;
    }
  } catch (err) {
    console.error(`  Error migrating ${file}: ${err.message}`);
  }
}

db.close();
console.log(`\nDone. ${migrated} migrated, ${skipped} skipped. Database: ${DB_PATH}`);
