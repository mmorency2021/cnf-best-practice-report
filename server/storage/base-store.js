/**
 * @typedef {Object} ReportSummary
 * @property {string} id
 * @property {string} name
 * @property {string} cnfVersion
 * @property {number} savedAt
 * @property {{ total: number, passed: number, failed: number, skipped: number }} totals
 */

/**
 * @typedef {Object} StoredReport
 * @property {string} id
 * @property {string} name
 * @property {string} cnfVersion
 * @property {number} savedAt
 * @property {{ total: number, passed: number, failed: number, skipped: number }} totals
 * @property {Object} sessionData
 */

class BaseStore {
  /** @param {{ name: string, sessionData: Object }} report  @returns {{ id: string, name: string, savedAt: number }} */
  save(report) { throw new Error('Not implemented'); }

  /** @returns {ReportSummary[]} */
  list() { throw new Error('Not implemented'); }

  /** @param {string} id  @returns {StoredReport|null} */
  get(id) { throw new Error('Not implemented'); }

  /** @param {string} id  @returns {boolean} */
  delete(id) { throw new Error('Not implemented'); }
}

module.exports = BaseStore;
