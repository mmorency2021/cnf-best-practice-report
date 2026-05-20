const backend = process.env.STORAGE_BACKEND || 'sqlite';

function createStore() {
  if (backend === 'sqlite') {
    const SqliteStore = require('./sqlite-store');
    return new SqliteStore();
  }
  const JsonStore = require('./json-store');
  return new JsonStore();
}

module.exports = createStore();
