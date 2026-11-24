// 管理者の修正・ごみ箱だけを別ファイルに保存。受信したJSONには書き込まない。
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const queues = new Map();
async function readState(dataDir) {
  try {
    const state = JSON.parse(await fs.readFile(path.join(dataDir, 'admin-state.json'), 'utf8'));
    if (state.version !== 1 || !state.records || typeof state.records !== 'object' || Array.isArray(state.records)) throw new Error('Invalid admin state');
    return state;
  } catch (error) { if (error.code === 'ENOENT') return { version: 1, records: {} }; throw error; }
}
function applyState(records, state) {
  return records.map(r => {
    const edit = state.records[r.file] || {};
    return { ...r, originalStudentCode: r.studentCode, originalStudentName: r.studentName,
      studentCode: edit.studentCode ?? r.studentCode, studentName: edit.studentName ?? r.studentName,
      corrected: edit.studentCode !== undefined || edit.studentName !== undefined,
      archivedAt: edit.archivedAt || null, adminRevision: edit.revision || 0 };
  });
}
function changeState(dataDir, change) {
  const previous = queues.get(dataDir) || Promise.resolve();
  const task = previous.catch(() => {}).then(async () => {
    const state = await readState(dataDir), backup = JSON.stringify(state, null, 2);
    const result = await change(state);
    const at = new Date().toISOString().replace(/[:.]/g, '-'), id = randomUUID();
    await fs.mkdir(path.join(dataDir, '.admin-history'), { recursive: true });
    await fs.writeFile(path.join(dataDir, '.admin-history', `${at}_${id}.json`), backup, { flag: 'wx', mode: 0o600, flush: true });
    const temp = path.join(dataDir, `.admin-state-${id}.tmp`);
    try {
      await fs.writeFile(temp, JSON.stringify(state, null, 2), { flag: 'wx', mode: 0o600, flush: true });
      await fs.rename(temp, path.join(dataDir, 'admin-state.json'));
    } finally { await fs.rm(temp, { force: true }); }
    return result;
  });
  queues.set(dataDir, task);
  task.finally(() => { if (queues.get(dataDir) === task) queues.delete(dataDir); }).catch(() => {});
  return task;
}
module.exports = { readState, applyState, changeState };
