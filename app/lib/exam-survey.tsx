"use client";

// 分野別テスト（データ活用分野）のあとに出すアンケート。
//
// 決めごと
//   ・テストを提出して、点数が確定・保存されたあとに出す。試験の制限時間は使わない
//   ・回答しても、しなくても、点数・G・成績は変わらない
//   ・全部の質問が任意。途中まででも送れるし、「回答せずに結果を見る」でも進める
//   ・回答はテスト結果といっしょに保存され、成績のJSON出力にも入る
//   ・集計するとき、未回答（null）と「判断できない」（0）を0点として数えないこと

import { useState } from "react";
import type { ExamSurvey } from "./exam-types";

/** Q1〜Q6：学ぶ前を振り返った自分／現在の自分 の2列で答える */
export const SURVEY_SELF = [
  "データの特徴に応じて、平均値と中央値を使い分けることができる。",
  "平均値だけでなく、ばらつきを使って集団の特徴を比べることができる。",
  "「相関があること」と「原因であること」の違いを説明できる。",
  "調べたいことに応じて、データを整理・分析する方法を選ぶことができる。",
  "シミュレーションの結果を考えるとき、設定した条件や試行回数に注意できる。",
  "AIなどが示した分析結果を、元データや別の計算で確かめることができる。"
];

const CONFIDENCE = [
  { value: 1, label: "1 まったく自信がない" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5 とても自信がある" },
  { value: 0, label: "判断できない" }
];

const AGREE = [
  { value: 1, label: "1 あてはまらない" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5 あてはまる" }
];

const FREQUENCY = [
  { value: 1, label: "一度もなかった" },
  { value: 2, label: "あまりなかった" },
  { value: 3, label: "ときどきあった" },
  { value: 4, label: "何度もあった" },
  { value: 0, label: "機会がなかった" }
];

export const SURVEY_HELPFUL = [
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
];
const HELPFUL_ALONE = ["特に役立ったものはなかった", "十分に利用していない"];

export const SURVEY_TROUBLE = [
  "文章・説明",
  "計算",
  "操作",
  "課題量",
  "時間",
  "端末・通信",
  "どこから取り組むか",
  "その他"
];
const TROUBLE_ALONE = ["特に困らなかった"];

export const SURVEY_FOUND = [
  "平均値だけでは分からないことがある",
  "グラフの見せ方で、受ける印象が変わる",
  "相関があっても、原因とは限らない",
  "同じデータでも、まとめ方で結論が変わる",
  "試行回数が少ないと、結果がぶれる",
  "AIが出した答えが、まちがっていることがある",
  "文字も画像も音も、0と1で表せる"
];
const FOUND_ALONE = ["特にない"];

export const SURVEY_TOPIC = [
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

const MAX_HELPFUL = 3;
const TEXT_LIMIT = 200;

const emptySurvey = (): ExamSurvey => ({
  version: 1,
  answeredAt: "",
  skipped: false,
  before: SURVEY_SELF.map(() => null),
  now: SURVEY_SELF.map(() => null),
  q7: null,
  q8: null,
  q9: null,
  q10: null,
  q11: [],
  q12: [],
  q12Note: "",
  q13: [],
  q13Before: "",
  q13Now: "",
  q14: "",
  q14Note: ""
});

/** 回答せずに進んだときの記録。「出したが答えなかった」ことが分かるように残す */
export const skippedSurvey = (): ExamSurvey => ({
  ...emptySurvey(),
  skipped: true,
  answeredAt: new Date().toISOString()
});

/** 1つでも答えてあるか */
const hasAnyAnswer = (s: ExamSurvey) =>
  s.before.some((v) => v !== null) ||
  s.now.some((v) => v !== null) ||
  [s.q7, s.q8, s.q9, s.q10].some((v) => v !== null) ||
  s.q11.length > 0 ||
  s.q12.length > 0 ||
  s.q13.length > 0 ||
  !!s.q14 ||
  [s.q12Note, s.q13Before, s.q13Now, s.q14Note].some((t) => t.trim());

/** 1つを選ぶ質問。もう一度押すと取り消せる（まちがって押したとき、未回答に戻せるように） */
function Scale({
  name,
  options,
  value,
  onChange
}: {
  name: string;
  options: { value: number; label: string }[];
  value: number | null;
  onChange: (next: number | null) => void;
}) {
  return (
    <div className="survey-scale">
      {options.map((o) => (
        <label key={o.value} className={`survey-opt ${value === o.value ? "on" : ""}`}>
          <input
            type="radio"
            name={name}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            onClick={() => {
              if (value === o.value) onChange(null);
            }}
          />
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
  options: string[];
  alone: string[];
  value: string[];
  max?: number;
  onChange: (next: string[]) => void;
}) {
  const toggle = (item: string) => {
    if (value.includes(item)) return onChange(value.filter((v) => v !== item));
    if (alone.includes(item)) return onChange([item]);
    const rest = value.filter((v) => !alone.includes(v));
    if (max && rest.length >= max) return;
    onChange([...rest, item]);
  };
  const full = !!max && value.filter((v) => !alone.includes(v)).length >= max;
  return (
    <div className="survey-checks">
      {[...options, ...alone].map((item) => {
        const on = value.includes(item);
        const blocked = !on && full && !alone.includes(item);
        return (
          <label key={item} className={`survey-opt ${on ? "on" : ""} ${blocked ? "blocked" : ""}`}>
            <input type="checkbox" checked={on} disabled={blocked} onChange={() => toggle(item)} />
            <span>{item}</span>
          </label>
        );
      })}
    </div>
  );
}

export function ExamSurveyForm({
  onSubmit,
  onSkip
}: {
  /** 回答を送る。1つも答えていないときは onSkip と同じ扱いになる */
  onSubmit: (survey: ExamSurvey) => void;
  onSkip: () => void;
}) {
  const [s, setS] = useState<ExamSurvey>(emptySurvey);
  const patch = (part: Partial<ExamSurvey>) => setS((prev) => ({ ...prev, ...part }));
  const setAt = (key: "before" | "now", i: number, v: number | null) =>
    setS((prev) => {
      const next = [...prev[key]];
      next[i] = v;
      return { ...prev, [key]: next };
    });

  const send = () => {
    if (!hasAnyAnswer(s)) return onSkip();
    onSubmit({
      ...s,
      q12Note: s.q12Note.trim(),
      q13Before: s.q13Before.trim(),
      q13Now: s.q13Now.trim(),
      q14Note: s.q14Note.trim(),
      answeredAt: new Date().toISOString()
    });
  };

  return (
    <div className="survey">
      <h2>授業・教材についてのアンケート</h2>
      <div className="survey-lead">
        <p>
          <b>テストの解答は提出され、点数は確定しています。</b>ここから先は、制限時間に関係ありません。
        </p>
        <p>
          このアンケートは、授業・教材の改善と、授業実践の報告に役立てるために行います。
          <b>回答内容や未回答によって、テストの点数・成績が変わることはありません。</b>
          よかった点も、難しかった点も、そのまま回答してください。
        </p>
        <p>
          自由に書く欄には、<b>自分や他の人の名前を書かないでください。</b>
          答えたくない質問は、空けたままで構いません。
        </p>
      </div>

      <section className="survey-part">
        <h3>1．できるようになったこと（Q1〜Q6）</h3>
        <p className="survey-note">
          それぞれについて、<b>「この分野を学ぶ前を振り返った自分」</b>と<b>「現在の自分」</b>の2つを答えてください。
        </p>
        {SURVEY_SELF.map((text, i) => (
          <fieldset className="survey-q" key={text}>
            <legend>
              <b>Q{i + 1}</b> {text}
            </legend>
            <div className="survey-pair">
              <span className="survey-when">学ぶ前</span>
              <Scale name={`self-before-${i}`} options={CONFIDENCE} value={s.before[i]} onChange={(v) => setAt("before", i, v)} />
            </div>
            <div className="survey-pair">
              <span className="survey-when">現在</span>
              <Scale name={`self-now-${i}`} options={CONFIDENCE} value={s.now[i]} onChange={(v) => setAt("now", i, v)} />
            </div>
          </fieldset>
        ))}
      </section>

      <section className="survey-part">
        <h3>2．いまの考えと、学習のしかた（Q7〜Q12）</h3>
        <fieldset className="survey-q">
          <legend>
            <b>Q7</b> 数字やグラフを使って物事を考えることに興味がある。
          </legend>
          <Scale name="q7" options={AGREE} value={s.q7} onChange={(v) => patch({ q7: v })} />
        </fieldset>
        <fieldset className="survey-q">
          <legend>
            <b>Q8</b> 今後、探究活動や生活上の判断で、データを使ってみたい。
          </legend>
          <Scale name="q8" options={AGREE} value={s.q8} onChange={(v) => patch({ q8: v })} />
        </fieldset>
        <fieldset className="survey-q">
          <legend>
            <b>Q9</b> 分からなかったことや間違えたところを、自分から確かめ直した。
          </legend>
          <Scale name="q9" options={FREQUENCY} value={s.q9} onChange={(v) => patch({ q9: v })} />
        </fieldset>
        <fieldset className="survey-q">
          <legend>
            <b>Q10</b> この教材は、自分に合った速さで学習を進めるのに役立った。
          </legend>
          <Scale
            name="q10"
            options={[...AGREE, { value: 0, label: "判断できない" }]}
            value={s.q10}
            onChange={(v) => patch({ q10: v })}
          />
        </fieldset>
        <fieldset className="survey-q">
          <legend>
            <b>Q11</b> 理解するのに役立ったものを、<b>{MAX_HELPFUL}つまで</b>選んでください。
          </legend>
          <Checks
            options={SURVEY_HELPFUL}
            alone={HELPFUL_ALONE}
            value={s.q11}
            max={MAX_HELPFUL}
            onChange={(v) => patch({ q11: v })}
          />
        </fieldset>
        <fieldset className="survey-q">
          <legend>
            <b>Q12</b> 学習を進めるうえで、困ったことを選んでください。（いくつでも）
          </legend>
          <Checks options={SURVEY_TROUBLE} alone={TROUBLE_ALONE} value={s.q12} onChange={(v) => patch({ q12: v })} />
          <label className="survey-text">
            <span>くわしく書けることがあれば（書かなくても構いません）</span>
            <textarea
              rows={2}
              maxLength={TEXT_LIMIT}
              value={s.q12Note}
              onChange={(e) => patch({ q12Note: e.target.value })}
            />
          </label>
        </fieldset>
      </section>

      <section className="survey-part">
        <h3>3．気づいたこと・調べてみたいこと（Q13・Q14）</h3>
        <fieldset className="survey-q">
          <legend>
            <b>Q13</b> この授業で「へぇ、そうなんだ」と思ったことに近いものを選んでください。（いくつでも）
          </legend>
          <Checks options={SURVEY_FOUND} alone={FOUND_ALONE} value={s.q13} onChange={(v) => patch({ q13: v })} />
          <div className="survey-fill">
            <p>選んだものについて、1つだけ教えてください。（思いつかなければ空けたままで構いません。名前は書かないでください）</p>
            <label>
              <span>前は</span>
              <input
                type="text"
                maxLength={TEXT_LIMIT}
                value={s.q13Before}
                onChange={(e) => patch({ q13Before: e.target.value })}
                aria-label="Q13 前はどう思っていたか"
              />
              <span>だと思っていたけれど、</span>
            </label>
            <label>
              <span>いまは</span>
              <input
                type="text"
                maxLength={TEXT_LIMIT}
                value={s.q13Now}
                onChange={(e) => patch({ q13Now: e.target.value })}
                aria-label="Q13 いまはどう思うか"
              />
              <span>だと思う。</span>
            </label>
          </div>
        </fieldset>
        <fieldset className="survey-q">
          <legend>
            <b>Q14</b> データを使って調べてみたいことがあるとすれば、どれに近いですか。（1つ）
          </legend>
          <div className="survey-checks">
            {SURVEY_TOPIC.map((item) => (
              <label key={item} className={`survey-opt ${s.q14 === item ? "on" : ""}`}>
                <input
                  type="radio"
                  name="q14"
                  checked={s.q14 === item}
                  onChange={() => patch({ q14: item })}
                  onClick={() => {
                    if (s.q14 === item) patch({ q14: "" });
                  }}
                />
                <span>{item}</span>
              </label>
            ))}
          </div>
          <label className="survey-text">
            <span>
              選んだことについて、調べてみたい疑問を1つ、短く書いてください。（思いつかなければ空けたままで構いません。名前は書かないでください）
              <br />
              例：「部活の練習時間と、大会の成績に関係はあるか」「寝る時間と、翌日の集中しやすさは関係するか」
            </span>
            <textarea
              rows={2}
              maxLength={TEXT_LIMIT}
              value={s.q14Note}
              onChange={(e) => patch({ q14Note: e.target.value })}
            />
          </label>
        </fieldset>
      </section>

      <div className="cbt-foot survey-foot">
        <button type="button" className="cbt-nav" onClick={onSkip}>
          回答せずに結果を見る
        </button>
        <button type="button" className="cbt-go" onClick={send}>
          回答を送って結果を見る &gt;
        </button>
      </div>
    </div>
  );
}
