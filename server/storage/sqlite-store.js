const path = require('path');
const { v4: uuidv4 } = require('uuid');
const BaseStore = require('./base-store');

const DB_PATH = path.join(__dirname, '..', 'reports.db');

class SqliteStore extends BaseStore {
  constructor() {
    super();
    const Database = require('better-sqlite3');
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
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
  }

  save(report) {
    const id = uuidv4();
    const savedAt = Date.now();
    const meta = report.sessionData?.claimData?.metadata || {};
    const totals = report.sessionData?.claimData?.totals || {};

    this.db.prepare(`
      INSERT INTO reports (id, name, cnf_version, saved_at, total, passed, failed, skipped, data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      report.name,
      meta.cnfVersion || '',
      savedAt,
      totals.total || 0,
      totals.passed || 0,
      totals.failed || 0,
      totals.skipped || 0,
      JSON.stringify(report.sessionData)
    );

    return { id, name: report.name, savedAt };
  }

  list() {
    const rows = this.db.prepare(
      'SELECT id, name, cnf_version, saved_at, total, passed, failed, skipped FROM reports ORDER BY saved_at DESC'
    ).all();

    return rows.map(r => ({
      id: r.id,
      name: r.name,
      cnfVersion: r.cnf_version,
      savedAt: r.saved_at,
      totals: { total: r.total, passed: r.passed, failed: r.failed, skipped: r.skipped }
    }));
  }

  get(id) {
    const row = this.db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      cnfVersion: row.cnf_version,
      savedAt: row.saved_at,
      totals: { total: row.total, passed: row.passed, failed: row.failed, skipped: row.skipped },
      sessionData: JSON.parse(row.data)
    };
  }

  delete(id) {
    const result = this.db.prepare('DELETE FROM reports WHERE id = ?').run(id);
    return result.changes > 0;
  }
}

module.exports = SqliteStore;
