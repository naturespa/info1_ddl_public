"use client";

import { CONFIDENCE_ITEMS, DIFFICULTY_OPTIONS, HELPFUL_OPTIONS, toggleSurveyChoice, type DataSurvey } from "./data-survey";
import styles from "./data-survey.module.css";

export function DataSurveyPage({ value, onChange }: { value: DataSurvey; onChange: (value: DataSurvey) => void }) {
  const update = (key: string, answer: string | string[]) => onChange({
    ...value, viewed: true, answers: { ...value.answers, [key]: answer }, updatedAt: new Date().toISOString()
  });
  const selected = (key: string): string[] => Array.isArray(value.answers[key]) ? value.answers[key] as string[] : [];
  const text = (key: string) => typeof value.answers[key] === "string" ? value.answers[key] as string : "";
  const scale = (key: string, label: string, options: readonly string[]) => (
    <label className={styles.label}>
      {label}
      <select className={styles.select} aria-label={label} value={text(key)} onChange={(e) => update(key, e.target.value)}>
        <option value="">選択してください（未回答でも進めます）</option>
        {options.map((option, index) => <option key={option} value={index < 5 ? String(index + 1) : "na"}>{option}</option>)}
      </select>
    </label>
  );
  const agreement = ["1：まったくそう思わない", "2：あまりそう思わない", "3：どちらともいえない", "4：ややそう思う", "5：とてもそう思う", "判断できない"];
  const confidence = ["1：まったく自信がない", "2：あまり自信がない", "3：どちらともいえない", "4：やや自信がある", "5：とても自信がある", "判断できない"];
  return (
    <div className={styles.page}>
      <h2>学習ふり返りアンケート（全14項目・採点対象外）</h2>
      <div className={styles.intro}>
        <p>このページは最終問題の次にあるアンケートです。テストの問題数・得点には含みません。</p>
        <p>授業・教材の改善と、統計・データサイエンスの授業実践の報告に役立てます。回答内容や未回答によって、点数・成績・Gが変わることはありません。よかった点も、難しかった点も、そのまま回答してください。自由記述には自分や他の人の名前を書かないでください。</p>
        <p>回答は受験番号とともに保存されます。外部への報告では個人が分からない集計結果を使い、自由記述を個別に引用する場合は学校の取扱いに従います。</p>
        <p><b>Q1〜Q6は、「学ぶ前を振り返った自分」と「現在の自分」の両方について答えてください。</b>各項目は任意です。アンケート回答中も40分の試験時間は進みます。</p>
      </div>
      {CONFIDENCE_ITEMS.map((question, index) => (
        <fieldset className={styles.field} key={question}>
          <legend>Q{index + 1}　{question}</legend>
          <div className={styles.pair}>
            {scale(`q${index + 1}_before`, `Q${index + 1}：学ぶ前を振り返って`, confidence)}
            {scale(`q${index + 1}_now`, `Q${index + 1}：現在`, confidence)}
          </div>
        </fieldset>
      ))}
      <fieldset className={styles.field}><legend>Q7　数字やグラフを使って物事を考えることに興味がある。</legend>{scale("q7", "Q7：興味", agreement)}</fieldset>
      <fieldset className={styles.field}><legend>Q8　今後、探究活動や生活上の判断で、データを使ってみたい。</legend>{scale("q8", "Q8：今後の活用", agreement)}</fieldset>
      <fieldset className={styles.field}><legend>Q9　分からなかったことや間違えたところを、自分から確かめ直した。</legend>{scale("q9", "Q9：確かめ直した頻度", ["1：一度もなかった", "2：ほとんどなかった", "3：ときどきあった", "4：よくあった", "5：何度もあった", "その機会がなかった"])}</fieldset>
      <fieldset className={styles.field}><legend>Q10　この教材は、自分に合った速さで学習を進めるのに役立った。</legend>{scale("q10", "Q10：学習の速さ", agreement)}</fieldset>
      <fieldset className={styles.field}>
        <legend>Q11　理解するのに役立ったものを、3つまで選んでください。</legend>
        <div className={styles.options}>{HELPFUL_OPTIONS.map((option) => <label className={styles.option} key={option}><input type="checkbox" checked={selected("q11").includes(option)} onChange={() => update("q11", toggleSurveyChoice(selected("q11"), option, HELPFUL_OPTIONS, 3, HELPFUL_OPTIONS.slice(-2)))} />{option}</label>)}</div>
        <p className={styles.note}>「特に役立ったものはなかった」「十分に利用していない」は、それぞれ単独で選びます。3つ選んだ後は、選択を外すと別のものを選べます。</p>
      </fieldset>
      <fieldset className={styles.field}>
        <legend>Q12　学習を進めるうえで、困ったことを選んでください。</legend>
        <div className={styles.options}>{DIFFICULTY_OPTIONS.map((option) => <label className={styles.option} key={option}><input type="checkbox" checked={selected("q12").includes(option)} onChange={() => update("q12", toggleSurveyChoice(selected("q12"), option, DIFFICULTY_OPTIONS, 8, ["特に困らなかった"]))} />{option}</label>)}</div>
        <label className={styles.label}>Q12：補足・改善してほしいこと（任意・800字以内）<textarea className={styles.text} maxLength={800} value={text("q12_note")} onChange={(e) => update("q12_note", e.target.value)} /></label>
      </fieldset>
      <fieldset className={styles.field}>
        <legend>Q13　理解や考え方が変わった具体例があれば教えてください。</legend>
        <p className={styles.note}>「以前の考え」「今の考え」「きっかけ」を書いてください。変わらなかったことや、まだ難しいことでも構いません。（任意・800字以内）</p>
        <textarea className={styles.text} aria-label="Q13：理解や考え方の具体例" maxLength={800} value={text("q13")} onChange={(e) => update("q13", e.target.value)} />
      </fieldset>
      <fieldset className={styles.field}>
        <legend>Q14　学校や生活の中で、データを使って調べてみたい疑問はありますか。</legend>
        <p className={styles.note}>あれば、集めたいデータも教えてください。「今は思いつかない」でも構いません。（任意・800字以内）</p>
        <textarea className={styles.text} aria-label="Q14：データを使って調べたい疑問" maxLength={800} value={text("q14")} onChange={(e) => update("q14", e.target.value)} />
      </fieldset>
    </div>
  );
}
