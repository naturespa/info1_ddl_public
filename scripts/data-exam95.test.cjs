// 実行: node --test scripts/data-exam95.test.cjs
// TypeScriptはプロジェクト既存のコンパイラで読み込む。実問題・パスワードは使わない。
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { test } = require('node:test');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText, filename);
};
const root = path.resolve(__dirname, '..');
const runtime = require(path.join(root, 'app/lib/exam-runtime.ts'));
const policy = require(path.join(root, 'app/lib/data-exam95.ts'));
const survey = require(path.join(root, 'app/lib/data-survey.ts'));

function question(i, viewpoint, area = 'データ活用') {
  return { id: `test:${i}`, area, lessonId: 'organize', q: `動作確認用 ${i}`, choices: ['A', 'B', 'C', 'D'],
    answer: i % 4, explanation: '動作確認用', level: '基礎', viewpoint };
}
const updated = {
  setId: 'data-c1-main-95-v1', area: 'データ活用', classNo: 1, kind: '本試験',
  questions: Array.from({ length: 95 }, (_, i) => question(i, i < 38 ? '知識・技能' : '思考・判断・表現'))
};
const legacy = {
  setId: 'digital-c1-main', area: 'デジタル', classNo: 1, kind: '本試験',
  questions: Array.from({ length: 65 }, (_, i) => question(i, i < 30 ? '知識・技能' : '思考・判断・表現', 'デジタル'))
};
const start = '2026-11-16T02:00:00.000Z';
const end = '2026-11-16T02:40:00.000Z';
const grade = (set, picks) => runtime.gradeExam(set, picks, start, end);
const answers = (set) => set.questions.map(q => q.answer);

test('新版は95問、知識38問・思考57問を検証する', () => {
  policy.validateDataExam95(updated);
  assert.throws(() => policy.validateDataExam95({ ...updated, questions: updated.questions.slice(0, 65) }), /95問/);
  assert.throws(() => policy.validateDataExam95({ ...updated, questions: updated.questions.map(q => ({ ...q, viewpoint: '知識・技能' })) }), /38問/);
  assert.throws(() => policy.validateDataExam95({ ...updated, questions: [updated.questions[1], ...updated.questions.slice(1)] }), /問題ID/);
});
test('満点100点、観点別40点・60点、未解答0点', () => {
  const result = grade(updated, answers(updated));
  assert.equal(result.score, 100);
  assert.equal(result.max, 100);
  assert.equal(result.questionCount, 95);
  assert.equal(result.elapsedSeconds, 2400);
  const views = Object.fromEntries(result.byViewpoint.map(r => [r.key, r]));
  assert.equal(views['知識・技能'].maxPoints, 40);
  assert.equal(views['思考・判断・表現'].maxPoints, 60);
  assert.equal(grade(updated, Array(95).fill(-1)).score, 0);
  assert.equal(grade(updated, updated.questions.map((q, i) => i < 38 ? q.answer : -1)).score, 40);
  assert.equal(grade(updated, updated.questions.map((q, i) => i >= 38 ? q.answer : -1)).score, 60);
});
test('デジタル65問の既存配点・出題順は変えない', () => {
  const result = grade(legacy, answers(legacy));
  assert.equal(result.score, 100);
  assert.equal(result.byViewpoint.find(r => r.key === '知識・技能').points, 30);
  assert.equal(result.byViewpoint.find(r => r.key === '思考・判断・表現').points, 70);
  assert.equal(runtime.pointsOf(legacy.questions[0], legacy), 1);
  assert.equal(runtime.pointsOf(legacy.questions[64], legacy), 2);
  const served = runtime.serveForStudent(legacy, '1101');
  assert.deepEqual(served, runtime.serveForStudent(legacy, '1101'));
  const picked = [];
  for (const item of served) {
    picked[item.originalIndex] = runtime.toOriginalChoice(item, item.choiceMap.indexOf(item.question.answer));
  }
  assert.equal(grade(legacy, picked).score, 100);
});
test('新版と旧版は別の途中保存キーで保持できる', () => {
  const oldData = { ...legacy, setId: 'data-c1-main', area: 'データ活用' };
  const old = grade(oldData, answers(oldData));
  const digital = grade(legacy, answers(legacy));
  const next = grade(updated, answers(updated));
  const original = JSON.stringify([digital, old]);
  const merged = policy.mergeExamResult([digital, old], next);
  assert.equal(merged.length, 3);
  assert.equal(JSON.stringify([digital, old]), original);
  assert.notEqual(runtime.examStorageKey('1101', oldData.setId), runtime.examStorageKey('1101', updated.setId));
  assert.equal(policy.isCurrentData95Result(next), true);
  assert.equal(policy.isCurrentData95Result({ ...next, setId: 'digital-c1-main' }), false);
  const again = { ...next, finishedAt: '2026-11-17T02:40:00.000Z' };
  const updatedResults = policy.mergeExamResult(merged, again);
  assert.equal(updatedResults.length, 3);
  assert.equal(updatedResults.find(r => r.setId === oldData.setId), old);
});
test('アンケートは未回答と判断不能を区別して保存し、採点に影響しない', () => {
  const before = grade(updated, answers(updated));
  const form = survey.newDataSurvey();
  form.answers = { q1_now: 'na', q2_now: '4', q11: ['ヒント'], q13: '' };
  const exported = JSON.parse(JSON.stringify({ ...before, dataSurvey: form }));
  assert.equal(exported.score, before.score);
  assert.equal(exported.answers.length, 95);
  assert.equal(exported.dataSurvey.answers.q1_now, 'na');
  assert.equal(Object.hasOwn(exported.dataSurvey.answers, 'q1_before'), false);
  assert.equal(survey.surveyResponseCount(form), 3);
  assert.deepEqual(exported.byViewpoint, before.byViewpoint);
});
test('複数選択は最大3つ・排他的な選択肢を守る', () => {
  const { HELPFUL_OPTIONS: options, toggleSurveyChoice: toggle } = survey;
  const exclusive = options.slice(-2);
  let checked = options.slice(0, 3);
  assert.deepEqual(toggle(checked, options[3], options, 3, exclusive), checked);
  checked = toggle(checked, exclusive[0], options, 3, exclusive);
  assert.deepEqual(checked, [exclusive[0]]);
  assert.deepEqual(toggle(checked, options[0], options, 3, exclusive), [options[0]]);
});
