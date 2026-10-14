// CSV export of tasks (SPEC-2026-10-01-csv-export).
const COLUMNS = ['id', 'title', 'status', 'due'];

function field(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function toCsv(tasks, columns = COLUMNS) {
  const rows = [columns, ...tasks.map((task) => columns.map((column) => task[column]))];
  return rows.map((row) => row.map(field).join(',')).join('\r\n');
}
