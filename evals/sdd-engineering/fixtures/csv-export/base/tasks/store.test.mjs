import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { addTask, listTasks, clearTasks } from './store.mjs';

beforeEach(() => clearTasks());

test('addTask defaults status to todo and due to null', () => {
  assert.deepEqual(addTask({ id: 't1', title: 'Write report' }), {
    id: 't1', title: 'Write report', status: 'todo', due: null,
  });
});

test('listTasks returns copies in insertion order', () => {
  addTask({ id: 't1', title: 'A' });
  addTask({ id: 't2', title: 'B' });
  const list = listTasks();
  assert.deepEqual(list.map((t) => t.id), ['t1', 't2']);
  list[0].title = 'changed';
  assert.equal(listTasks()[0].title, 'A');
});
