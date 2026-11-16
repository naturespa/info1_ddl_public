"use client";

// 分野別テスト（データ活用分野）のあとに出すアンケート。全24問。
//
// 決めごと
//   ・テストを提出して、点数が確定・保存されたあとに出す。試験の制限時間は使わない
//   ・回答しても点数・G・成績は変わらない
//   ・選ぶ質問はすべて必須。答え終わるまで結果・解説の画面には進めない
//     （無理に答えを作らせないよう、「判断できない」「特になかった」などの選択肢を用意してある）
//   ・自由に書く欄（3か所）だけは任意
//   ・回答はテスト結果といっしょに保存され、成績のJSON出力にも入る
//   ・集計するとき、「判断できない／機会がなかった」（0）を0点として数えないこと

import { useState } from "react";
import type { ExamSurvey, SurveyAreaAnswer } from "./exam-types";
import { lessons } from "./lessons";

type Option<T> = { value: T; label: string };

/** 「特になかった」を選んだときに保存する値 */
const NONE = "none";

const unitOptions = (area: "デジタル" | "データ活用"): Option<string>[] =>
  lessons.filter((lesson) => lesson.area === area).map((lesson) => ({ value: lesson.id, label: `${lesson.no} ${lesson.title}` }));

const AREAS = [
  { key: "digital" as const, name: "デジタル分野", units: unitOptions("デジタル"), first: 1 },
  { key: "data" as const, name: "データ活用分野", units: unitOptions("データ活用"), first: 6 }
];

const UNDERSTAND: Option<number>[] = [
  { value: 1, label: "1 ほとんど理解できなかった" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5 よく理解できた" }
];

const DIFFICULTY: Option<number>[] = [
  { value: 1, label: "1 とても易しかった" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5 とても難しかった" }
];

const TIME: Option<number>[] = [
  { value: 1, label: "かなり余った" },
  { value: 2, label: "少し余った" },
  { value: 3, label: "ちょうどよかった" },
  { value: 4, label: "少し足りなかった" },
  { value: 5, label: "まったく足りなかった" }
];

/** Q11〜Q16：学ぶ前を振り返った自分／現在の自分 の2列で答える */
export const SURVEY_SELF = [
  "データの特徴に応じて、平均値と中央値を使い分けることができる。",
  "平均値だけでなく、ばらつきを使って集団の特徴を比べることができる。",
  "「相関があること」と「原因であること」の違いを説明できる。",
  "調べたいことに応じて、データを整理・分析する方法を選ぶことができる。",
  "シミュレーションの結果を考えるとき、設定した条件や試行回数に注意できる。",
  "AIなどが示した分析結果を、元データや別の計算で確かめることができる。"
];
const SELF_FIRST = 11;

const CONFIDENCE: Option<number>[] = [
  { value: 1, label: "1 まったく自信がない" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5 とても自信がある" },
  { value: 0, label: "判断できない" }
];

const AGREE: Option<number>[] = [
  { value: 1, label: "1 あてはまらない" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5 あてはまる" }
];

const FREQUENCY: Option<number>[] = [
  { value: 1, label: "一度もなかった" },
  { value: 2, label: "あまりなかった" },
  { value: 3, label: "ときどきあった" },
  { value: 4, label: "何度もあった" },
  { value: 0, label: "機会がなかった" }
];

const asOptions = (items: string[]): Option<string>[] => items.map((item) => ({ value: item, label: item }));

const HELPFUL = asOptions([
  "操作して確かめる実験",
  "表計算の練習",
  "確認問題と解説",
  "重要語句の学習",
  "ヒント",
  "解き直し",
  "G・レベルなどの仕組み",
  "ステータスでの学習状況の確認",
  "先生の説明",
  "友達との相談"
]);
const HELPFUL_ALONE = asOptions(["特に役立ったものはなかった", "十分に利用していない"]);

const TROUBLE = asOptions(["文章・説明", "計算", "操作", "課題量", "時間", "端末・通信", "どこから取り組むか", "その他"]);
const TROUBLE_ALONE = asOptions(["特に困らなかった"]);

const FOUND = asOptions([
  "平均値だけでは分からないことがある",
  "グラフの見せ方で、受ける印象が変わる",
  "相関があっても、原因とは限らない",
  "同じデータでも、まとめ方で結論が変わる",
  "試行回数が少ないと、結果がぶれる",
  "AIが出した答えが、まちがっていることがある",
  "文字も画像も音も、0と1で表せる"
]);
const FOUND_ALONE = asOptions(["特にない"]);

const TOPIC = [
  "部活動やスポーツのこと",
  "ゲーム・音楽・動画などの趣味のこと",
  "勉強や成績のこと",
  "睡眠・食事・健康のこと",
  "通学や交通のこと",
  "学校生活（行事・時間割・校則など）",
  "住んでいる地域のこと",
  "世の中のニュースのこと",
  "いまは思いつかない"
];

const NONE_OPTION: Option<string>[] = [{ value: NONE, label: "特になかった" }];
const MAX_PICK = 3;
const TEXT_LIMIT = 200;

const emptyArea = (): SurveyAreaAnswer => ({ understand: null, hard: [], good: [], difficulty: null, time: null });

const emptySurvey = (): ExamSurvey => ({
  version: 2,
  answeredAt: "",
  digital: emptyArea(),
  data: emptyArea(),
  before: SURVEY_SELF.map(() => null),
  now: SURVEY_SELF.map(() => null),
  interest: null,
  useData: null,
  recheck: null,
  pace: null,
  helpful: [],
  trouble: [],
  troubleNote: "",
  found: [],
  foundBefore: "",
  foundNow: "",
  topic: "",
  topicNote: ""
});

/** まだ答えていない質問の番号（Q1〜Q24）。自由に書く欄は数えない */
const missingOf = (s: ExamSurvey): number[] => {
  const out: number[] = [];
  AREAS.forEach((area) => {
    const a = s[area.key];
    if (a.understand === null) out.push(area.first);
    if (a.hard.length === 0) out.push(area.first + 1);
    if (a.good.length === 0) out.push(area.first + 2);
    if (a.difficulty === null) out.push(area.first + 3);
    if (a.time === null) out.push(area.first + 4);
  });
  SURVEY_SELF.forEach((_, i) => {
    if (s.before[i] === null || s.now[i] === null) out.push(SELF_FIRST + i);
  });
  if (s.interest === null) out.push(17);
  if (s.useData === null) out.push(18);
  if (s.recheck === null) out.push(19);
  if (s.pace === null) out.push(20);
  if (s.helpful.length === 0) out.push(21);
  if (s.trouble.length === 0) out.push(22);
  if (s.found.length === 0) out.push(23);
  if (!s.topic) out.push(24);
  return out;
};

/** 1つを選ぶ質問 */
function Scale({
  name,
  options,
  value,
  onChange
}: {
  name: string;
  options: Option<number>[];
  value: number | null;
  onChange: (next: number) => void;
}) {
  return (
    <div className="survey-scale">
      {options.map((o) => (
        <label key={o.value} className={`survey-opt ${value === o.value ? "on" : ""}`}>
          <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}

/** いくつか選ぶ質問。alone に入れた選択肢は、ほかと同時には選べない */
function Checks({
  options,
  alone,
  value,
  max,
  onChange
}: {
  options: Option<string>[];
  alone: Option<string>[];
  value: string[];
  max?: number;
  onChange: (next: string[]) => void;
}) {
  const aloneValues = alone.map((o) => o.value);
  const toggle = (item: string) => {
    if (value.includes(item)) return onChange(value.filter((v) => v !== item));
    if (aloneValues.includes(item)) return onChange([item]);
    const rest = value.filter((v) => !aloneValues.includes(v));
    if (max && rest.length >= max) return;
    onChange([...rest, item]);
  };
  const full = !!max && value.filter((v) => !aloneValues.includes(v)).length >= max;
  return (
    <div className="survey-checks">
      {[...options, ...alone].map((o) => {
        const on = value.includes(o.value);
        const blocked = !on && full && !aloneValues.includes(o.value);
        return (
          <label key={o.value} className={`survey-opt ${on ? "on" : ""} ${blocked ? "blocked" : ""}`}>
            <input type="checkbox" checked={on} disabled={blocked} onChange={() => toggle(o.value)} />
            <span>{o.label}</span>
          </label>
        );
      })}
    </div>
  );
}

export function ExamSurveyForm({
  onSubmit,
  onDemoSkip
}: {
  onSubmit: (survey: ExamSurvey) => void;
  /** デモ・動作確認用の番号（8008）だけに渡す。研修で流れを見せるとき、答えずに結果へ進める */
  onDemoSkip?: () => void;
}) {
  const [s, setS] = useState<ExamSurvey>(emptySurvey);
  /** 送ろうとして、未回答が残っていたとき true。未回答の質問に印を付ける */
  const [checked, setChecked] = useState(false);
  const patch = (part: Partial<ExamSurvey>) => setS((prev) => ({ ...prev, ...part }));
  const patchArea = (key: "digital" | "data", part: Partial<SurveyAreaAnswer>) =>
    setS((prev) => ({ ...prev, [key]: { ...prev[key], ...part } }));
  const setAt = (key: "before" | "now", i: number, v: number) =>
    setS((prev) => {
      const next = [...prev[key]];
      next[i] = v;
      return { ...prev, [key]: next };
    });

  const missing = missingOf(s);
  const jump = (no: number) => document.getElementById(`survey-q${no}`)?.scrollIntoView({ behavior: "smooth", block: "center" });

  const send = () => {
    if (missing.length > 0) {
      setChecked(true);
      jump(missing[0]);
      return;
    }
    onSubmit({
      ...s,
      troubleNote: s.troubleNote.trim(),
      foundBefore: s.foundBefore.trim(),
      foundNow: s.foundNow.trim(),
      topicNote: s.topicNote.trim(),
      answeredAt: new Date().toISOString()
    });
  };

  /** 質問1つぶんの枠。未回答のまま送ろうとしたあとは、枠に印が付く */
  const q = (no: number, text: React.ReactNode, body: React.ReactNode) => (
    <fieldset className={`survey-q ${checked && missing.includes(no) ? "missing" : ""}`} id={`survey-q${no}`} key={no}>
      <legend>
        <b>Q{no}</b> {text}
        {checked && missing.includes(no) && <span className="survey-miss">未回答です</span>}
      </legend>
      {body}
    </fieldset>
  );

  return (
    <div className="survey">
      <h2>授業・教材についてのアンケート（全24問）</h2>
      <div className="survey-lead">
        <p>
          <b>テストの解答は提出され、点数は確定しています。</b>ここから先は、制限時間に関係ありません。
        </p>
        <p>
          このアンケートは、授業・教材の改善と、授業実践の報告に役立てるために行います。
          <b>回答内容によって、テストの点数・成績が変わることはありません。</b>
          よかった点も、難しかった点も、そのまま回答してください。
        </p>
        <p>
          <b>選ぶ質問は、すべて答えてください。</b>答え終わると、テストの結果と解説が見られます。
          自由に書く欄は、書かなくても構いません。書くときは、<b>自分や他の人の名前を書かないでください。</b>
        </p>
      </div>

      {AREAS.map((area, index) => {
        const a = s[area.key];
        return (
          <section className="survey-part" key={area.key}>
            <h3>
              {index + 1}．{area.name}について（Q{area.first}〜Q{area.first + 4}）
            </h3>
            {q(
              area.first,
              `${area.name}の内容を、どのくらい理解できたと思いますか。`,
              <Scale name={`${area.key}-understand`} options={UNDERSTAND} value={a.understand} onChange={(v) => patchArea(area.key, { understand: v })} />
            )}
            {q(
              area.first + 1,
              <>
                {area.name}で、むずかしかった単元を<b>{MAX_PICK}つまで</b>選んでください。
              </>,
              <Checks options={area.units} alone={NONE_OPTION} value={a.hard} max={MAX_PICK} onChange={(v) => patchArea(area.key, { hard: v })} />
            )}
            {q(
              area.first + 2,
              <>
                {area.name}で、よく分かった、または面白かった単元を<b>{MAX_PICK}つまで</b>選んでください。
              </>,
              <Checks options={area.units} alone={NONE_OPTION} value={a.good} max={MAX_PICK} onChange={(v) => patchArea(area.key, { good: v })} />
            )}
            {q(
              area.first + 3,
              `${area.name}の分野別テストの問題は、自分にとってどのくらいの難しさでしたか。`,
              <Scale name={`${area.key}-difficulty`} options={DIFFICULTY} value={a.difficulty} onChange={(v) => patchArea(area.key, { difficulty: v })} />
            )}
            {q(
              area.first + 4,
              `${area.name}の分野別テストの時間は、どうでしたか。`,
              <Scale name={`${area.key}-time`} options={TIME} value={a.time} onChange={(v) => patchArea(area.key, { time: v })} />
            )}
          </section>
        );
      })}

      <section className="survey-part">
        <h3>3．できるようになったこと（Q11〜Q16）</h3>
        <p className="survey-note">
          それぞれについて、<b>「この分野を学ぶ前を振り返った自分」</b>と<b>「現在の自分」</b>の2つを答えてください。
        </p>
        {SURVEY_SELF.map((text, i) =>
          q(
            SELF_FIRST + i,
            text,
            <>
              <div className="survey-pair">
                <span className="survey-when">学ぶ前</span>
                <Scale name={`self-before-${i}`} options={CONFIDENCE} value={s.before[i]} onChange={(v) => setAt("before", i, v)} />
              </div>
              <div className="survey-pair">
                <span className="survey-when">現在</span>
                <Scale name={`self-now-${i}`} options={CONFIDENCE} value={s.now[i]} onChange={(v) => setAt("now", i, v)} />
              </div>
            </>
          )
        )}
      </section>

      <section className="survey-part">
        <h3>4．いまの考えと、学習のしかた（Q17〜Q22）</h3>
        {q(17, "数字やグラフを使って物事を考えることに興味がある。", <Scale name="interest" options={AGREE} value={s.interest} onChange={(v) => patch({ interest: v })} />)}
        {q(18, "今後、探究活動や生活上の判断で、データを使ってみたい。", <Scale name="useData" options={AGREE} value={s.useData} onChange={(v) => patch({ useData: v })} />)}
        {q(19, "分からなかったことや間違えたところを、自分から確かめ直した。", <Scale name="recheck" options={FREQUENCY} value={s.recheck} onChange={(v) => patch({ recheck: v })} />)}
        {q(
          20,
          "この教材は、自分に合った速さで学習を進めるのに役立った。",
          <Scale name="pace" options={[...AGREE, { value: 0, label: "判断できない" }]} value={s.pace} onChange={(v) => patch({ pace: v })} />
        )}
        {q(
          21,
          <>
            理解するのに役立ったものを、<b>{MAX_PICK}つまで</b>選んでください。
          </>,
          <Checks options={HELPFUL} alone={HELPFUL_ALONE} value={s.helpful} max={MAX_PICK} onChange={(v) => patch({ helpful: v })} />
        )}
        {q(
          22,
          "学習を進めるうえで、困ったことを選んでください。（いくつでも）",
          <>
            <Checks options={TROUBLE} alone={TROUBLE_ALONE} value={s.trouble} onChange={(v) => patch({ trouble: v })} />
            <label className="survey-text">
              <span>くわしく書けることがあれば（書かなくても構いません）</span>
              <textarea rows={2} maxLength={TEXT_LIMIT} value={s.troubleNote} onChange={(e) => patch({ troubleNote: e.target.value })} />
            </label>
          </>
        )}
      </section>

      <section className="survey-part">
        <h3>5．気づいたこと・調べてみたいこと（Q23・Q24）</h3>
        {q(
          23,
          "この授業で「へぇ、そうなんだ」と思ったことに近いものを選んでください。（いくつでも）",
          <>
            <Checks options={FOUND} alone={FOUND_ALONE} value={s.found} onChange={(v) => patch({ found: v })} />
            <div className="survey-fill">
              <p>選んだものについて、1つだけ教えてください。（書かなくても構いません。名前は書かないでください）</p>
              <label>
                <span>前は</span>
                <input
                  type="text"
                  maxLength={TEXT_LIMIT}
                  value={s.foundBefore}
                  onChange={(e) => patch({ foundBefore: e.target.value })}
                  aria-label="Q23 前はどう思っていたか"
                />
                <span>だと思っていたけれど、</span>
              </label>
              <label>
                <span>いまは</span>
                <input
                  type="text"
                  maxLength={TEXT_LIMIT}
                  value={s.foundNow}
                  onChange={(e) => patch({ foundNow: e.target.value })}
                  aria-label="Q23 いまはどう思うか"
                />
                <span>だと思う。</span>
              </label>
            </div>
          </>
        )}
        {q(
          24,
          "データを使って調べてみたいことがあるとすれば、どれに近いですか。（1つ）",
          <>
            <div className="survey-checks">
              {TOPIC.map((item) => (
                <label key={item} className={`survey-opt ${s.topic === item ? "on" : ""}`}>
                  <input type="radio" name="topic" checked={s.topic === item} onChange={() => patch({ topic: item })} />
                  <span>{item}</span>
                </label>
              ))}
            </div>
            <label className="survey-text">
              <span>
                選んだことについて、調べてみたい疑問を1つ、短く書いてください。（書かなくても構いません。名前は書かないでください）
                <br />
                例：「部活の練習時間と、大会の成績に関係はあるか」「寝る時間と、翌日の集中しやすさは関係するか」
              </span>
              <textarea rows={2} maxLength={TEXT_LIMIT} value={s.topicNote} onChange={(e) => patch({ topicNote: e.target.value })} />
            </label>
          </>
        )}
      </section>

      {checked && missing.length > 0 && (
        <div className="verdict ng survey-missing" role="alert">
          <b>まだ答えていない質問が {missing.length}問 あります。</b>番号を押すと、その質問へ移ります。
          <div className="survey-missing-list">
            {missing.map((no) => (
              <button type="button" className="cbt-nav" key={no} onClick={() => jump(no)}>
                Q{no}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="cbt-foot survey-foot">
        <span className="survey-progress">
          回答済み {24 - missing.length} / 24問
        </span>
        {onDemoSkip && (
          <button type="button" className="cbt-nav" onClick={onDemoSkip}>
            （デモ用）回答せずに結果を見る
          </button>
        )}
        <button type="button" className="cbt-go" onClick={send}>
          回答を送って結果を見る &gt;
        </button>
      </div>
    </div>
  );
}
