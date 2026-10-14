import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCsv } from './csv.mjs';

const HEADER = '"id","title","status","due"';
const task = (over = {}) => ({ id: 't1', title: 'Write report', status: 'todo', due: '2026-10-09', ...over });

test('AC-1 header row then one row per task in input order', () => {
  const csv = toCsv([task({ id: 't2', title: 'B' }), task({ id: 't1', title: 'A' })]);
  assert.deepEqual(csv.split('\r\n'), [
    HEADER,
    '"t2","B","todo","2026-10-09"',
    '"t1","A","todo","2026-10-09"',
  ]);
});

test('AC-2 / EC-2 quotes every field and doubles inner quotes', () => {
  const csv = toCsv([task({ title: 'Say "hi", then\nleave' })]);
  assert.equal(csv.split('\r\n')[1], '"t1","Say ""hi"", then\nleave","todo","2026-10-09"');
});

test('AC-4 / EC-1 empty list returns only the header row', () => {
  assert.equal(toCsv([]), HEADER);
});

test('NFR-1 rows separated by CRLF with no trailing line break', () => {
  const csv = toCsv([task(), task({ id: 't2' })]);
  assert.equal(csv.split('\r\n').length, 3);
  assert.ok(!csv.endsWith('\r\n') && !csv.endsWith('\n'));
});

test('custom column order', () => {
  assert.equal(toCsv([task()], ['title', 'id']), '"title","id"\r\n"Write report","t1"');
});
