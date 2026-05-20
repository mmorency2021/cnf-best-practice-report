const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const BaseStore = require('./base-store');

const REPORTS_DIR = path.join(__dirname, '..', 'reports');
const INDEX_FILE = path.join(REPORTS_DIR, '_index.json');

class JsonStore extends BaseStore {
  constructor() {
    super();
    if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  save(report) {
    const id = uuidv4();
    const savedAt = Date.now();
    const meta = report.sessionData?.claimData?.metadata || {};
    const totals = report.sessionData?.claimData?.totals || {};

    const record = {
      id,
      name: report.name,
      cnfVersion: meta.cnfVersion || '',
      savedAt,
      totals: { total: totals.total || 0, passed: totals.passed || 0, failed: totals.failed || 0, skipped: totals.skipped || 0 },
      sessionData: report.sessionData
    };

    fs.writeFileSync(path.join(REPORTS_DIR, `${id}.json`), JSON.stringify(record));

    const index = this._readIndex();
    index.push({ id, name: record.name, cnfVersion: record.cnfVersion, savedAt, totals: record.totals });
    this._writeIndex(index);

    return { id, name: record.name, savedAt };
  }

  list() {
    const index = this._readIndex();
    return index.sort((a, b) => b.savedAt - a.savedAt);
  }

  get(id) {
    const filePath = path.join(REPORTS_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) return null;
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      return null;
    }
  }

  delete(id) {
    const filePath = path.join(REPORTS_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) return false;
    fs.unlinkSync(filePath);

    const index = this._readIndex().filter(r => r.id !== id);
    this._writeIndex(index);
    return true;
  }

  _readIndex() {
    try {
      if (fs.existsSync(INDEX_FILE)) {
        return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
      }
    } catch { /* rebuild below */ }
    return this._rebuildIndex();
  }

  _writeIndex(index) {
    fs.writeFileSync(INDEX_FILE, JSON.stringify(index));
  }

  _rebuildIndex() {
    const index = [];
    try {
      const files = fs.readdirSync(REPORTS_DIR).filter(f => f.endsWith('.json') && f !== '_index.json');
      for (const file of files) {
        try {
          const record = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, file), 'utf-8'));
          index.push({ id: record.id, name: record.name, cnfVersion: record.cnfVersion, savedAt: record.savedAt, totals: record.totals });
        } catch { /* skip corrupt files */ }
      }
    } catch { /* empty dir */ }
    this._writeIndex(index);
    return index;
  }
}

module.exports = JsonStore;
