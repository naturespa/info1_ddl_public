const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { inflateRawSync } = require('node:zlib');
const { createServer } = require('./server.cjs');
const reports = require('./reports.cjs');
const at = '2026-11-24T00:00:00.000Z';
const survey = () => ({ version: 2, answeredAt: at, digital: { understand: 4, hard: ['base'], good: ['none'], difficulty: 3, time: 2 }, data: { understand: 5, hard: ['organize'], good: ['none'], difficulty: 4, time: 3 }, before: [0, 1, 2, 3, 4, 5], now: [4, 3, 4, 5, 5, 5], interest: 5, useData: 4, recheck: 0, pace: 0, helpful: ['表計算の練習'], trouble: ['特に困らなかった'], troubleNote: '', found: ['特にない'], foundBefore: '', foundNow: '', topic: '部活動やスポーツのこと', topicNote: '=HYPERLINK("https://untrusted.example")' });
function fixture(code = '1101') {
  const detail = { setId: 'data-1', area: 'データ活用', kind: '本試験', score: 55, max: 100, questionCount: 85, finishedAt: at, elapsedSeconds: 1200, byViewpoint: [{ key: '知識・技能', correct: 26, total: 39, points: 20, maxPoints: 30 }, { key: '思考・判断・表現', correct: 23, total: 46, points: 35, maxPoints: 70 }], survey: survey() };
  const raw = { version: 6, studentCode: code, studentName: '山田 太郎', exportedAt: at, lastLesson: '', exams: [{ ...detail, byViewpoint: undefined, survey: undefined, rate: 55 }], examDetails: [detail] };
  for (const key of ['drafts', 'submissions', 'experiments', 'understanding', 'wordDrafts', 'wordSubmissions', 'missionNotes', 'boughtHints', 'practiced', 'coins', 'attitude', 'summary', 'retakes', 'gLocks']) raw[key] = {};
  raw.summary = { totalScore: 110, totalMax: 200, areas: [{ area: 'デジタル', totalScore: 0, perspective: { knowledge: 0, thinking: 0, attitude: 0 } }, { area: 'データ活用', totalScore: 90, perspective: { knowledge: 80, thinking: 100, attitude: 75 } }], perspective: { knowledge: 40, thinking: 50, attitude: 42 }, completedLessons: 7, lessonCount: 19 };
  return raw;
}
function unpack(buffer) {
  const files = new Map(); let n = 0;
  while (buffer.readUInt32LE(n) === 0x04034b50) {
    const size = buffer.readUInt32LE(n + 18), len = buffer.readUInt16LE(n + 26), extra = buffer.readUInt16LE(n + 28), start = n + 30 + len + extra;
    const name = buffer.subarray(n + 30, n + 30 + len).toString();
    files.set(name, inflateRawSync(buffer.subarray(start, start + size)).toString()); n = start + size;
  }
  return files;
}
test('learning and exams retain true zero, missing values, actual points and kind selection', () => {
  const raw = fixture(), report = reports.enrich(raw), r = { report };
  assert.equal(report.learning[0].knowledge, 0); assert.equal(report.learning[1].attitude, 75);
  assert.equal(report.exams.length, 1); // summary and detail must not double-count
  assert.equal(reports.selectedExam(r, 'データ活用').knowledge, 20); // not 26 correct or 67%
  assert.equal(reports.selectedExam(r, 'データ活用').thinking, 35);
  raw.examDetails.push({ ...raw.examDetails[0], setId: 'retake', kind: '追試', finishedAt: '2026-11-25T00:00:00Z', score: 100 });
  const updated = { report: reports.enrich(raw) };
  assert.equal(reports.selectedExam(updated, 'データ活用', '本試験').setId, 'data-1');
  assert.equal(reports.selectedExam(updated, 'データ活用', 'regular').setId, 'retake');
  const old = fixture(); old.summary.areas = [{ area: 'デジタル', totalScore: 50 }]; old.examDetails = [];
  const legacy = reports.enrich(old);
  assert.equal(legacy.learning[0].knowledge, null); assert.equal(legacy.learning[1].knowledge, null); assert.equal(legacy.exams[0].knowledge, null);
  assert.equal(reports.enrich({ summary: { areas: [{ area: 'デジタル', knowledgeScore: 72, knowledgeMax: 144, experimentDone: 30.5, experimentMax: 61 }] }, attitude: { byArea: [{ area: 'デジタル', score100: 62.5 }] } }).learning[0].knowledge, 50);
});
test('survey maps all questions and excludes unknowns from averages and paired changes', () => {
  const r = { report: reports.enrich(fixture()) }, e = reports.selectedSurvey(r);
  assert.equal(reports.surveyStatus(e), '回答済');
  assert.equal(reports.surveyValue(e.survey, reports.definitions.find(d => d.key === 'digital.hard')), 'D1 基数変換・2進加算・シフト演算');
  assert.equal(reports.surveyValue(e.survey, reports.definitions.find(d => d.key === 'before.0')), '判断できない');
  const files = unpack(reports.surveyWorkbook([{ ...r, studentCode: '0001', studentName: '試験 太郎', file: 'fixture.json' }], new URLSearchParams()));
  const xml = files.get('xl/worksheets/sheet1.xml');
  assert.match(xml, /t="inlineStr"[^>]*><is><t[^>]*>0001</);
  assert.match(xml, /=HYPERLINK/); assert.doesNotMatch(xml, /<f[ >]/); // text cannot become a formula
  assert.match(files.get('xl/worksheets/sheet2.xml'), /機会がなかった/);
  assert.match(files.get('xl/worksheets/sheet3.xml'), /回顧式/);
  e.survey.now[3] = null; assert.equal(reports.surveyStatus(e), '回答あり（一部項目なし）');
});

async function context(callback) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ddl-reports-')), roster = path.join(dir, 'meibo.csv');
  await fs.writeFile(roster, '4桁番号,生徒名\n1101,山田 太郎\n1202,変更 花子\n');
  const server = createServer({ dataDir: dir, rosterFile: roster.replace('.csv', '.scv') });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const root = `http://127.0.0.1:${server.address().port}`;
  const post = raw => fetch(root + '/api/submissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(raw) });
  const list = async () => (await (await fetch(root + '/api/admin/submissions')).json());
  const html = await (await fetch(root + '/admin')).text(), token = /const ADMIN_TOKEN='([^']+)'/.exec(html)[1];
  const change = (action, body, headers = {}) => fetch(root + '/api/admin/records/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: root, 'X-DDL-Admin': token, ...headers }, body: JSON.stringify(body) });
  try { await callback({ dir, root, post, list, change, token }); }
  finally { await new Promise(resolve => server.close(resolve)); await fs.rm(dir, { recursive: true, force: true }); }
}
test('legacy CSV stays intact; Excel filters latest/class/name/roster and keeps missing scores blank', async () => context(async ({ root, post, list, dir }) => {
  const raw = fixture(); await post(raw); await post({ ...raw, summary: { ...raw.summary, totalScore: 199 } }); await post(fixture('1202'));
  const result = await list(); assert.equal(result.records.length, 3); assert.equal(result.roster.status, 'ready');
  const csv = await (await fetch(root + '/api/admin/summary.csv')).text(); assert.equal(csv.split('\r\n').length, 5); assert.match(csv, /提出された名前/); assert.match(csv, /名簿の名前/); assert.match(csv, /"199"/);
  assert.equal(reports.filterRecords(result.records, new URLSearchParams('mode=latest&class=11')).length, 1);
  assert.equal(reports.filterRecords(result.records, new URLSearchParams('mode=all&class=11')).length, 2);
  assert.equal(reports.filterRecords(result.records, new URLSearchParams('roster=matched')).length, 1);
  assert.equal(reports.filterRecords(result.records, new URLSearchParams('q=変更')).length, 1);
  const response = await fetch(root + '/api/admin/grades.xlsx?mode=latest&class=11');
  assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /spreadsheetml/);
  const buf = Buffer.from(await response.arrayBuffer()), files = unpack(buf), xml = files.get('xl/worksheets/sheet1.xml');
  assert.match(xml, /1101/); assert.doesNotMatch(xml, /1202/); assert.match(xml, /r="F2"><v>0</); assert.match(xml, /r="O2"><v>20</); assert.match(xml, /r="P2"><v>35</); assert.match(xml, /採点対象外/);
  assert.equal((xml.match(/<row /g) || []).length, 2);
  assert.match(files.get('xl/worksheets/sheet3.xml'), /平均点/);
  const surveyResponse = await fetch(root + '/api/admin/surveys.xlsx?class=12'); assert.equal(surveyResponse.status, 200);
  assert.doesNotMatch(unpack(Buffer.from(await surveyResponse.arrayBuffer())).get('xl/worksheets/sheet1.xml'), /1101/);
  const empty = await fetch(root + '/api/admin/grades.xlsx?class=99'); assert.equal(empty.status, 200);
  // Reads and exports create no administrative state and modify no received JSON.
  assert.equal((await fs.readdir(dir)).includes('admin-state.json'), false);
}));
test('identity correction, concurrent edit guard, archive and restore never change original JSON bytes', async () => context(async ({ root, dir, post, list, change }) => {
  await post(fixture()); await post(fixture());
  const before = await list(), selected = before.records[0], originals = new Map();
  for (const r of before.records) originals.set(r.file, await fs.readFile(path.join(dir, r.file)));
  assert.equal((await change('edit', { file: selected.file, revision: 0, scope: 'file', studentCode: '../x', studentName: '変更 花子' })).status, 400);
  assert.equal((await change('edit', { file: selected.file, revision: 0, scope: 'file', studentCode: '1202', studentName: '変更　花子' }, { 'X-DDL-Admin': 'wrong' })).status, 403);
  assert.equal((await change('edit', { file: selected.file, revision: 0, scope: 'file', studentCode: '1202', studentName: '変更　花子' }, { Origin: 'https://naturespa.github.io' })).status, 403);
  const input = { file: selected.file, revision: 0, scope: 'file', studentCode: '1202', studentName: '変更　花子' };
  const edits = await Promise.all([change('edit', input), change('edit', input)]);
  assert.deepEqual(edits.map(r => r.status).sort(), [200, 409]);
  let result = await list(), edited = result.records.find(r => r.file === selected.file);
  assert.equal(edited.studentCode, '1202'); assert.equal(edited.studentName, '変更 花子'); assert.equal(edited.rosterStatus, 'matched'); assert.equal(edited.originalStudentCode, '1101');
  assert.equal(result.records.find(r => r.file !== selected.file).studentCode, '1101');
  const excel = unpack(Buffer.from(await (await fetch(root + '/api/admin/grades.xlsx?class=12')).arrayBuffer())).get('xl/worksheets/sheet1.xml'); assert.match(excel, /変更 花子/); assert.match(excel, /1202/);
  assert.equal((await change('archive', { files: [selected.file] })).status, 200);
  result = await list(); assert.equal(result.records.length, 1); assert.equal(result.archivedRecords.length, 1);
  assert.doesNotMatch(await (await fetch(root + '/api/admin/summary.csv')).text(), /変更 花子/);
  assert.equal((await change('archive', { files: [selected.file] })).status, 409);
  assert.equal((await change('restore', { files: [selected.file] })).status, 200);
  result = await list(); assert.equal(result.records.length, 2); assert.equal(result.archivedRecords.length, 0); assert.equal(result.records.find(r => r.file === selected.file).studentCode, '1202');
  for (const [file, bytes] of originals) {
    assert.deepEqual(await fs.readFile(path.join(dir, file)), bytes);
    assert.deepEqual(Buffer.from(await (await fetch(root + '/api/admin/files/' + file)).arrayBuffer()), bytes);
  }
  assert.ok((await fs.readdir(path.join(dir, '.admin-history'))).length >= 3);
}));
test('editing all submissions has an explicit scope and persists across restart state reads', async () => context(async ({ post, list, change, dir }) => {
  await post(fixture()); await post(fixture()); const all = await list();
  const result = await change('edit', { file: all.records[0].file, revision: 0, scope: 'student', studentCode: '0001', studentName: '試験 次郎' });
  assert.equal((await result.json()).count, 2);
  const after = await list(); assert.ok(after.records.every(r => r.studentCode === '0001' && r.studentName === '試験 次郎'));
  const { readState, applyState } = require('./admin-state.cjs'); const state = await readState(dir);
  assert.equal(Object.keys(state.records).length, 2); assert.equal(applyState(all.records, state)[0].studentCode, '0001');
}));
module.exports = { fixture, unpack };
