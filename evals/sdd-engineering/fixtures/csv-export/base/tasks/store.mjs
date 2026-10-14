// In-memory task store. A Task is { id, title, status, due }, where due is
// an ISO date string or null.
const tasks = [];

export function addTask({ id, title, status = 'todo', due = null }) {
  const task = { id, title, status, due };
  tasks.push(task);
  return { ...task };
}

export function listTasks() {
  return tasks.map((t) => ({ ...t }));
}

export function clearTasks() {
  tasks.length = 0;
}
