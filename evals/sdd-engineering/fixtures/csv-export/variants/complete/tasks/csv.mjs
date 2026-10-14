// CSV export of tasks (SPEC-2026-10-01-csv-export).
const COLUMNS = ['id', 'title', 'status', 'due'];
const FORMULA_START = /^[=+\-@]/;

function field(value) {
  let text = value == null ? '' : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function toCsv(tasks) {
  const rows = [COLUMNS, ...tasks.map((task) => COLUMNS.map((column) => task[column]))];
  return rows.map((row) => row.map(field).join(',')).join('\r\n');
}
