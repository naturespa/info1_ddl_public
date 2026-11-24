const catalog = require('./report-catalog.cjs');
const { workbook } = require('./xlsx.cjs');
const AREAS = ['デジタル', 'データ活用'];
const K = '知識・技能', T = '思考・判断・表現';
const finite = v => typeof v === 'number' && Number.isFinite(v) ? v : null;
const round = v => Math.round(v * 10) / 10;
const object = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
const array = v => Array.isArray(v) ? v : [];
const text = v => typeof v === 'string' ? v : '';
const firstNumber = (...values) => values.map(finite).find(v => v !== null) ?? null;
const ratio100 = (n, d) => finite(n) !== null && finite(d) > 0 ? Math.round(n / d * 100) : null;
const canonicalArea = v => ({ digital: 'デジタル', data: 'データ活用' })[v] || v;
const canonicalKind = v => ({ main: '本試験', retake: '追試', teacher: '教員用', demo: 'デモ' })[v] || v;
const time = v => Number.isFinite(Date.parse(v)) ? Date.parse(v) : 0;
const dateJst = v => time(v) ? new Date(v).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', hour12: false }) : '';
const className = code => /^[1-9][1-9]\d{2}$/.test(code) ? `${code[0]}年${code[1]}組` : 'その他';
const rosterLabel = status => ({ matched: '一致', name_mismatch: '氏名不一致', number_missing: '番号が名簿にない', name_missing: '提出に名前なし', duplicate: '名簿で番号重複', unavailable: '照合不可' })[status] || '照合不可';

function learningOf(raw, area) {
  const a = object(array(raw.summary?.areas).find(a => a?.area === area));
  const p = object(a.perspective);
  const att = object(array(raw.attitude?.byArea).find(a => a?.area === area));
  const clearRate = firstNumber(a.clear?.rate, att.clear?.rate);
  const reflectionRate = firstNumber(a.reflection?.rate, att.reflection?.rate);
  const knowledge = firstNumber(p.knowledge, ratio100(a.knowledgeScore, a.knowledgeMax));
  const thinking = firstNumber(p.thinking, ratio100(a.experimentDone, a.experimentMax));
  const attitude = firstNumber(p.attitude, att.score100, clearRate !== null && reflectionRate !== null ? round(clearRate * .7 + reflectionRate * .3) : null);
  return { area, knowledge, thinking, attitude, total: finite(a.totalScore), knowledgeMax: 100, thinkingMax: 100, attitudeMax: 100,
    knowledgeRaw: finite(a.knowledgeScore), knowledgeRawMax: finite(a.knowledgeMax), experimentDone: finite(a.experimentDone), experimentMax: finite(a.experimentMax),
    status: [knowledge, thinking, attitude].every(v => v !== null) ? '記録あり' : '内訳なし（旧データ等）' };
}

function examsOf(raw) {
  const details = array(raw.examDetails).filter(e => e && typeof e === 'object');
  const same = (a, b) => a.setId === b.setId && a.finishedAt === b.finishedAt && canonicalArea(a.area) === canonicalArea(b.area);
  const all = [...details, ...array(raw.exams).filter(e => e && !details.some(d => same(d, e)))];
  return all.map(e => {
    const views = array(e.byViewpoint);
    const k = object(views.find(v => v?.key === K || v?.label === K)), t = object(views.find(v => v?.key === T || v?.label === T));
    return { area: canonicalArea(e.area), kind: canonicalKind(e.kind), setId: text(e.setId), finishedAt: text(e.finishedAt),
      score: finite(e.score), max: finite(e.max), knowledge: finite(k.points), knowledgeMax: finite(k.maxPoints), thinking: finite(t.points), thinkingMax: finite(t.maxPoints),
      knowledgeCorrect: finite(k.correct), knowledgeQuestions: finite(k.total), thinkingCorrect: finite(t.correct), thinkingQuestions: finite(t.total),
      elapsedSeconds: finite(e.elapsedSeconds), survey: e.survey && typeof e.survey === 'object' ? e.survey : null };
  }).sort((a, b) => time(b.finishedAt) - time(a.finishedAt));
}
function enrich(raw) { return { learning: AREAS.map(area => learningOf(raw, area)), exams: examsOf(raw) }; }
function kindMatches(exam, kind) { return kind === 'regular' ? ['本試験', '追試'].includes(exam.kind) : exam.kind === kind; }
function selectedExam(record, area, kind = '本試験') { return array(record.report?.exams).find(e => e.area === area && kindMatches(e, kind)) ?? null; }
function selectedSurvey(record, kind = '本試験') {
  return array(record.report?.exams).filter(e => e.area === 'データ活用' && kindMatches(e, kind) && e.survey)
    .sort((a, b) => time(b.survey.answeredAt || b.finishedAt) - time(a.survey.answeredAt || a.finishedAt))[0] ?? null;
}
function filterRecords(records, params) {
  const mode = params.get('mode') === 'all' ? 'all' : 'latest', term = (params.get('q') || '').trim(), cls = params.get('class') || '', roster = params.get('roster') || '';
  const seen = new Set();
  return records.filter(r => {
    if (mode === 'latest') { if (seen.has(r.studentCode)) return false; seen.add(r.studentCode); }
    return (!term || [r.studentCode, r.studentName, r.rosterName].some(v => (v || '').includes(term))) && (!cls || r.studentCode.slice(0, 2) === cls) && (!roster || r.rosterStatus === roster);
  }).sort((a, b) => a.studentCode.localeCompare(b.studentCode) || b.receivedAt.localeCompare(a.receivedAt));
}
const SELF = ['平均値と中央値の使い分け', 'ばらつきによる集団の比較', '相関と原因の違い', '整理・分析方法の選択', 'シミュレーションの条件・試行回数', 'AI等の分析結果の検証'];
const definitions = [];
for (const [key, name, first] of [['digital', 'デジタル', 1], ['data', 'データ活用', 6]]) {
  for (const [offset, field, label, type] of [[0, 'understand', '理解度', 'scale'], [1, 'hard', '難しかった単元', 'units'], [2, 'good', '分かった・面白かった単元', 'units'], [3, 'difficulty', 'テストの難しさ', 'scale'], [4, 'time', 'テスト時間', 'scale']]) definitions.push({ key: `${key}.${field}`, label: `Q${first + offset} ${name} ${label}`, type, min: 1, max: 5 });
}
SELF.forEach((label, i) => {
  for (const when of ['before', 'now']) definitions.push({ key: `${when}.${i}`, label: `Q${11 + i} ${label}（${when === 'before' ? '学ぶ前' : '現在'}）`, type: 'scale', min: 1, max: 5, zero: '判断できない' });
});
definitions.push(
  { key: 'interest', label: 'Q17 数字やグラフで考えることへの興味', type: 'scale', min: 1, max: 5 },
  { key: 'useData', label: 'Q18 今後データを使いたい', type: 'scale', min: 1, max: 5 },
  { key: 'recheck', label: 'Q19 自分から確かめ直した', type: 'scale', min: 1, max: 4, zero: '機会がなかった' },
  { key: 'pace', label: 'Q20 自分に合った速さで学べた', type: 'scale', min: 1, max: 5, zero: '判断できない' },
  { key: 'helpful', label: 'Q21 役立ったもの（3つまで）', type: 'multi' },
  { key: 'trouble', label: 'Q22 困ったこと', type: 'multi' },
  { key: 'troubleNote', label: 'Q22 詳細（任意）', type: 'text', optional: true },
  { key: 'found', label: 'Q23 気づいたこと', type: 'multi' },
  { key: 'foundBefore', label: 'Q23 前の考え（任意）', type: 'text', optional: true },
  { key: 'foundNow', label: 'Q23 今の考え（任意）', type: 'text', optional: true },
  { key: 'topic', label: 'Q24 調べてみたい分野', type: 'text' },
  { key: 'topicNote', label: 'Q24 調べてみたい疑問（任意）', type: 'text', optional: true }
);
function valueAt(s, key) { return key.split('.').reduce((v, key) => v?.[key], s); }
function surveyValue(s, d) {
  const value = valueAt(s, d.key);
  if (d.type === 'scale') return finite(value) === 0 && d.zero ? d.zero : finite(value);
  if (d.type === 'units') return array(value).map(v => v === 'none' ? '特になかった' : catalog.find(l => l.id === v)?.label || String(v)).join(' ／ ');
  if (d.type === 'multi') return array(value).map(String).join(' ／ ');
  return text(value);
}
function surveyStatus(exam) {
  if (!exam) return '未回答';
  if (exam.survey.version !== 2) return `旧・未対応形式（v${exam.survey.version ?? '?'}）`;
  const missing = definitions.some(d => !d.optional && (d.type === 'scale' ? !(finite(valueAt(exam.survey, d.key)) !== null && valueAt(exam.survey, d.key) >= (d.zero ? 0 : d.min) && valueAt(exam.survey, d.key) <= d.max) : !surveyValue(exam.survey, d)));
  return missing ? '回答あり（一部項目なし）' : '回答済';
}
function gradeValues(r, kind) {
  const scores = [], status = [];
  for (const area of AREAS) {
    const a = r.report?.learning?.find(a => a.area === area) || {};
    scores.push(a.knowledge ?? null, a.thinking ?? null, a.attitude ?? null);
    status.push(`${area}学習：${a.status || '内訳なし'}`);
  }
  for (const area of AREAS) {
    const e = selectedExam(r, area, kind);
    scores.push(e?.knowledge ?? null, e?.thinking ?? null, '採点対象外');
    status.push(`${area}テスト：${!e ? '未受験' : e.knowledge === null || e.thinking === null ? '内訳なし' : '受験済'}`);
  }
  return { scores, status: status.join(' ／ ') };
}
const identityHeaders = ['受験番号', 'クラス', '提出された名前', '名簿の名前', '名簿照合'];
const identity = r => [r.studentCode, className(r.studentCode), r.studentName, r.rosterName, rosterLabel(r.rosterStatus)];
const scoreHeaders = ['デジタル通常 知識・技能(/100)', 'デジタル通常 思考・判断・表現(/100)', 'デジタル通常 主体性(/100)', 'データ活用通常 知識・技能(/100)', 'データ活用通常 思考・判断・表現(/100)', 'データ活用通常 主体性(/100)', 'デジタルテスト 知識・技能', 'デジタルテスト 思考・判断・表現', 'デジタルテスト 主体性', 'データ活用テスト 知識・技能', 'データ活用テスト 思考・判断・表現', 'データ活用テスト 主体性'];
function notes(params, count) { return [['項目', '内容'], ['出力日時（日本時間）', dateJst(new Date().toISOString())], ['対象件数', count], ['表示対象', params.get('mode') === 'all' ? '全提出（同じ生徒が複数行になる場合あり）' : '番号ごとの最新提出'], ['クラス', params.get('class') || '全クラス'], ['検索', params.get('q') || '指定なし'], ['名簿照合', params.get('roster') || 'すべて'], ['テスト対象', params.get('examKind') || '本試験'], ['通常学習の3観点', '各100点換算。総合点は知識60%＋思考40%。主体性は別評価。'], ['分野別テスト', '通常の配点は知識30点＋思考70点。保存された内訳の得点・満点を使用。主体性は採点対象外。'], ['空欄', '未受験・内訳なし。0点とは区別。過去の提出や全体の観点から分野別得点を補完しない。'], ['アンケート', '成績への加点なし。選んだ試験種別に含まれる最新回答を使用。判断できない・機会なし（0）は平均から除外。'], ['名前・番号', '管理画面の修正を反映。受信時の元JSONは変更しない。'], ['元データ', 'dataフォルダーのJSONは読み取りのみ。削除操作は管理上のごみ箱へ移動。']]; }
function gradeWorkbook(records, params) {
  const kind = params.get('examKind') || '本試験';
  const examHeaders = AREAS.flatMap(area => [`${area}テスト 種類`, `${area}テスト 総得点`, `${area}テスト 総満点`, `${area}テスト 知識満点`, `${area}テスト 思考満点`, `${area}テスト 終了日時（日本時間）`, `${area}テスト セットID`]);
  const rows = [[...identityHeaders, ...scoreHeaders, ...examHeaders, '内訳の状態', '受信日時（日本時間）', '受付番号', '保存ファイル'], ...records.map(r => {
    const grade = gradeValues(r, kind);
    return [...identity(r), ...grade.scores, ...AREAS.flatMap(area => { const e = selectedExam(r, area, kind); return [e?.kind, e?.score, e?.max, e?.knowledgeMax, e?.thinkingMax, dateJst(e?.finishedAt), e?.setId]; }), grade.status, dateJst(r.receivedAt), r.receiptId, r.file];
  })];
  const history = [[...identityHeaders, '分野', '種類', '得点', '満点', '知識得点', '知識満点', '思考得点', '思考満点', '終了日時（日本時間）', '所要秒', 'セットID', '受信日時（日本時間）', '保存ファイル'], ...records.flatMap(r => array(r.report?.exams).map(e => [...identity(r), e.area, e.kind, e.score, e.max, e.knowledge, e.knowledgeMax, e.thinking, e.thinkingMax, dateJst(e.finishedAt), e.elapsedSeconds, e.setId, dateJst(r.receivedAt), r.file]))];
  const groupRows = [['クラス', '対象提出件数', '指標', '得点のある件数', '平均点']];
  for (const cls of [...new Set(records.map(r => className(r.studentCode)))].sort()) {
    const group = records.filter(r => className(r.studentCode) === cls);
    scoreHeaders.forEach((label, index) => { if ([8, 11].includes(index)) return; const values = group.map(r => gradeValues(r, kind).scores[index]).filter(v => finite(v) !== null); groupRows.push([cls, group.length, label, values.length, values.length ? round(values.reduce((a, b) => a + b, 0) / values.length) : null]); });
  }
  return workbook([{ name: '観点別成績', rows }, { name: 'テスト履歴', rows: history }, { name: 'クラス集計', rows: groupRows }, { name: '配点と出力条件', rows: notes(params, records.length) }]);
}
function surveyStatistics(records, kind) {
  const surveys = records.map(r => selectedSurvey(r, kind)?.survey).filter(s => s?.version === 2);
  const rows = [['設問', '集計項目', '件数', '値・平均（0は除外）']];
  for (const d of definitions) {
    if (d.type === 'scale') {
      const values = surveys.map(s => valueAt(s, d.key)).filter(v => finite(v) !== null && v >= d.min && v <= d.max);
      rows.push([d.label, '有効回答・平均', values.length, values.length ? round(values.reduce((a, b) => a + b, 0) / values.length) : null]);
      if (d.zero) rows.push([d.label, d.zero + '（平均から除外）', surveys.filter(s => valueAt(s, d.key) === 0).length, null]);
      for (let v = d.min; v <= d.max; v++) rows.push([d.label, `選択肢 ${v}`, values.filter(x => x === v).length, null]);
    } else if (!d.optional) {
      const counts = new Map();
      for (const s of surveys) { const value = valueAt(s, d.key); for (const item of new Set(Array.isArray(value) ? value : value ? [value] : [])) { const label = d.type === 'units' ? (item === 'none' ? '特になかった' : catalog.find(l => l.id === item)?.label || String(item)) : String(item); counts.set(label, (counts.get(label) || 0) + 1); } }
      for (const [item, n] of [...counts].sort((a, b) => b[1] - a[1])) rows.push([d.label, item, n, null]);
    }
  }
  SELF.forEach((label, i) => {
    const pairs = surveys.map(s => [s.before?.[i], s.now?.[i]]).filter(([a, b]) => finite(a) !== null && finite(b) !== null && a >= 1 && a <= 5 && b >= 1 && b <= 5);
    rows.push([`Q${11 + i} ${label}`, '同じ回答者の現在－学ぶ前（回顧式自己評価）', pairs.length, pairs.length ? round(pairs.reduce((n, [a, b]) => n + b - a, 0) / pairs.length) : null]);
  });
  return rows;
}
function surveyWorkbook(records, params) {
  const kind = params.get('examKind') || '本試験';
  const rows = [[...identityHeaders, '回答状態', '回答日時（日本時間）', '試験種類', 'セットID', ...definitions.map(d => d.label), '未対応形式の原文JSON', '受信日時（日本時間）', '保存ファイル'], ...records.map(r => {
    const e = selectedSurvey(r, kind), s = e?.survey;
    return [...identity(r), surveyStatus(e), dateJst(s?.answeredAt), e?.kind, e?.setId, ...definitions.map(d => s?.version === 2 ? surveyValue(s, d) : null), s && s.version !== 2 ? JSON.stringify(s) : '', dateJst(r.receivedAt), r.file];
  })];
  const legend = [['列', '保存項目', '回答の意味'], ...definitions.map(d => [d.label, d.key, d.type === 'scale' ? `${d.min}〜${d.max}${d.zero ? `、0=${d.zero}（平均から除外）` : ''}` : d.type === 'units' ? '単元IDを教材の単元名に変換。複数選択は ／ 区切り' : d.optional ? '自由記述・任意（空欄可）' : '選択した内容。複数選択は ／ 区切り']), ['注意', 'Q11〜Q16', '学ぶ前は、現在から振り返って答えた回顧式の自己評価。実測の事前テストではない。'], ['尺度の端点', 'Q1・Q6', '1=ほとんど理解できなかった、5=よく理解できた'], ['尺度の端点', 'Q4・Q9', '1=とても易しかった、5=とても難しかった'], ['時間', 'Q5・Q10', '1=かなり余った、2=少し余った、3=ちょうどよかった、4=少し足りなかった、5=まったく足りなかった'], ['尺度の端点', 'Q11〜Q16', '1=まったく自信がない、5=とても自信がある'], ['尺度の端点', 'Q17・Q18・Q20', '1=あてはまらない、5=あてはまる'], ['頻度', 'Q19', '1=一度もなかった、2=あまりなかった、3=ときどきあった、4=何度もあった']];
  return workbook([{ name: 'アンケート回答', rows }, { name: 'アンケート集計', rows: surveyStatistics(records, kind) }, { name: '設問と選択肢', rows: legend }, { name: '出力条件', rows: notes(params, records.length) }]);
}
module.exports = { enrich, filterRecords, gradeWorkbook, surveyWorkbook, definitions, surveyValue, surveyStatus, selectedExam, selectedSurvey, gradeValues };
