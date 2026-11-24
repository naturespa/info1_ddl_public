const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const reports = require('./reports.cjs');

// 実際の画面スクリプトを小さなDOM上で実行。APIの検証とは別に、切替・絞込・表示を確認。
test('admin UI switches views, filters exports, distinguishes zero and missing, and opens edit/survey dialogs', async () => {
  class Element {
    constructor(tag = 'div') { this.tagName = tag; this.children = []; this.events = {}; this.dataset = {}; this.value = ''; this.attrs = {}; this._text = ''; this.classList = { toggle() {} }; }
    set textContent(v) { this._text = String(v ?? ''); this.children = []; }
    get textContent() { return this._text + this.children.map(c => c.textContent || '').join(''); }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this._text = ''; this.children = [...children]; }
    addEventListener(name, cb) { this.events[name] = cb; }
    setAttribute(name, v) { this.attrs[name] = v; }
    add(child) { this.children.push(child); }
    showModal() { this.open = true; }
    close() { this.open = false; }
    click() { return this.events.click?.({ target: this }); }
  }
  const ids = new Map(), get = id => { if (!ids.has(id)) ids.set(id, new Element()); return ids.get(id); };
  const tabs = ['submissions', 'grades', 'surveys', 'trash'].map(tab => { const e = new Element('button'); e.dataset.tab = tab; return e; });
  const modes = ['latest', 'all'].map(mode => { const e = new Element('button'); e.dataset.mode = mode; return e; });
  const savedSurvey = { version: 2, answeredAt: '2026-11-24T00:00:00Z', digital: { understand: 4 }, data: { understand: 5 }, before: [0], now: [5], topicNote: '試験用の疑問' };
  const raw = { summary: { areas: [{ area: 'デジタル', perspective: { knowledge: 0, thinking: 50, attitude: 100 } }] }, examDetails: [{ area: 'データ活用', kind: '本試験', setId: 'data-1', finishedAt: '2026-11-24T00:00:00Z', byViewpoint: [{ key: '知識・技能', points: 20, maxPoints: 30 }, { key: '思考・判断・表現', points: 35, maxPoints: 70 }], survey: savedSurvey }] };
  const records = [{ file: 'fixture1.json', studentCode: '1101', studentName: '試験 太郎', receivedAt: '2026-11-24T00:00:00Z', receiptId: 'fixture1', exams: [], examCount: 1, rosterStatus: 'matched', report: reports.enrich(raw) }, { file: 'fixture2.json', studentCode: '1202', studentName: '試験 花子', receivedAt: '2026-11-23T00:00:00Z', receiptId: 'fixture2', exams: [], examCount: 0, report: reports.enrich({}) }];
  get('exam-kind').value = '本試験'; get('survey-group').value = 'overview';
  const context = vm.createContext({
    document: { getElementById: get, createElement: tag => new Element(tag), querySelectorAll: sel => sel === '[data-tab]' ? tabs : sel === '[data-mode]' ? modes : [] },
    Option: function(label, value) { const e = new Element('option'); e.textContent = label; e.value = value; return e; },
    location: { protocol: 'http:' }, URLSearchParams, navigator: {}, setTimeout,
    fetch: async url => ({ ok: true, json: async () => url === '/api/admin/network' ? { addresses: [] } : { ok: true, records, archivedRecords: [], roster: { status: 'ready', count: 2 } } })
  });
  const html = await fs.readFile(path.join(__dirname, 'admin.html'), 'utf8');
  const script = html.match(/<script nonce="__DDL_NONCE__">([\s\S]*?)<\/script>/)[1];
  vm.runInContext(script, context); await new Promise(resolve => setImmediate(resolve));
  assert.equal(get('rows').children.length, 2);
  await tabs[1].click(); assert.equal(get('grade-view').hidden, false); assert.equal(get('submission-view').hidden, true);
  const first = get('grade-rows').children[0]; assert.match(first.textContent, /0 \/ 100/); assert.match(first.textContent, /20 \/ 30/); assert.match(first.textContent, /35 \/ 70/); assert.match(first.textContent, /対象外/); assert.match(first.textContent, /内訳なし/);
  get('class-filter').value = '11'; get('class-filter').events.change();
  assert.equal(get('grade-rows').children.length, 1);
  get('grade-export').click(); assert.match(context.location.href, /grades.xlsx\?/); assert.match(context.location.href, /class=11/);
  await tabs[2].click(); assert.match(get('survey-rows').textContent, /試験用の疑問/); assert.match(get('report-summary').textContent, /未回答 0件/);
  get('survey-group').value = 'self'; get('survey-group').events.change(); assert.match(get('survey-rows').textContent, /判断できない/);
  const last = get('survey-rows').children[0].children.at(-1); last.children[0].click(); assert.equal(get('survey-dialog').open, true); assert.match(get('survey-details').textContent, /試験用の疑問/);
  await tabs[0].click(); const actions = get('rows').children[0].children.at(-1); actions.children[1].click(); assert.equal(get('edit-dialog').open, true); assert.equal(get('edit-code').value, '1101');
  actions.children[2].click(); assert.equal(get('action-dialog').open, true); assert.match(get('action-warning').textContent, /元JSONは残り/);
});
