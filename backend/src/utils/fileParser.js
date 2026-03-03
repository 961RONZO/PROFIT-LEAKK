const Papa = require('papaparse');
const XLSX = require('xlsx');

/**
 * Parse a file buffer into rows of data.
 * Supports CSV and Excel formats.
 */
function parseFile(buffer, mimetype, originalname) {
  const ext = originalname.split('.').pop().toLowerCase();

  if (ext === 'csv' || mimetype === 'text/csv') {
    const text = buffer.toString('utf-8');
    const result = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: true });
    return result.data;
  }

  if (['xlsx', 'xls'].includes(ext)) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet, { defval: null });
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

/**
 * Normalize column names to lowercase snake_case for consistent processing.
 */
function normalizeColumns(rows) {
  return rows.map(row => {
    const normalized = {};
    for (const [key, val] of Object.entries(row)) {
      const normKey = key
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      normalized[normKey] = val;
    }
    return normalized;
  });
}

module.exports = { parseFile, normalizeColumns };
