"use client";

import { useEffect, useMemo, useState } from "react";

type Area = "デジタル" | "データ活用";
type Question = { id: string; q: string; choices: string[]; answer: number; explanation: string };
type Lesson = { id: string; no: string; area: Area; title: string; subtitle: string; concepts: string[]; questions: Question[] };
type Submission = { answers: number[]; correct: number; submittedAt: string };
type StudentRecord = {
  version: 1;
  exportedAt?: string;
  studentCode: string;
  drafts: Record<string, number[]>;
  submissions: Record<string, Submission>;
  experiments: Record<string, boolean>;
  reflection: string;
  summary: { totalScore: number; quizCorrect: number; quizMax: number; completedLessons: number; lessonCount: number };
};

const STORAGE_PREFIX = "joho-ddl-public-v1:";
const lessonDefs: Array<Omit<Lesson, "questions"> & { point: string }> = [
  { id: "base", no: "D1", area: "デジタル", title: "基数と情報量", subtitle: "2進数・10進数・16進数と情報量を扱う。", concepts: ["ビット", "バイト", "基数変換", "2のn乗"], point: "4ビットは16通りを表せるため、16進数1桁に対応します。" },
  { id: "number", no: "D2", area: "デジタル", title: "整数・実数の表現", subtitle: "補数、オーバーフロー、小数誤差を確認する。", concepts: ["2の補数", "オーバーフロー", "浮動小数点"], point: "有限桁で数を扱うため、範囲外の値や小数誤差に注意します。" },
  { id: "logic", no: "D3", area: "デジタル", title: "論理演算と論理回路", subtitle: "真理値表とゲートの働きを判断する。", concepts: ["AND", "OR", "XOR", "真理値表"], point: "ANDは両方、ORは少なくとも一方、XORは異なるときに真です。" },
  { id: "computer", no: "D4", area: "デジタル", title: "コンピュータの構成", subtitle: "五大装置、CPU、主記憶、補助記憶を整理する。", concepts: ["CPU", "RAM", "SSD", "五大装置"], point: "CPU、主記憶、補助記憶は役割と速度が異なります。" },
  { id: "text", no: "D5", area: "デジタル", title: "文字のデジタル化", subtitle: "文字コードと文字化けの原因を扱う。", concepts: ["文字コード", "Unicode", "UTF-8"], point: "保存時と読込時の文字コードが違うと文字化けが起きます。" },
  { id: "audio", no: "D6", area: "デジタル", title: "音声のデジタル化", subtitle: "標本化、量子化、符号化と容量を扱う。", concepts: ["標本化", "量子化", "符号化"], point: "標本化周波数、量子化ビット数、チャネル数、時間で容量が決まります。" },
  { id: "image", no: "D7", area: "デジタル", title: "画像のデジタル化", subtitle: "画素、色深度、画像形式を使い分ける。", concepts: ["画素", "RGB", "JPEG", "PNG"], point: "写真はJPEG、透過ロゴはPNGが向く場面が多いです。" },
  { id: "video", no: "D8", area: "デジタル", title: "動画・圧縮・通信", subtitle: "fps、圧縮、Mbps、転送時間を扱う。", concepts: ["fps", "圧縮", "Mbps"], point: "MBとMbitを区別し、通信速度で割って時間を見積もります。" },
  { id: "clean", no: "A1", area: "データ活用", title: "データの種類と整理", subtitle: "量的・質的データ、欠損、重複を扱う。", concepts: ["尺度", "欠損値", "外れ値"], point: "欠損や外れ値は、削除前に原因と件数を確認します。" },
  { id: "center", no: "A2", area: "データ活用", title: "代表値と四分位数", subtitle: "平均、中央値、四分位数を比較する。", concepts: ["平均", "中央値", "箱ひげ図"], point: "外れ値があるときは中央値や四分位数も確認します。" },
  { id: "spread", no: "A3", area: "データ活用", title: "ばらつき・正規分布・偏差値", subtitle: "分散、標準偏差、標準化を扱う。", concepts: ["分散", "標準偏差", "偏差値"], point: "z得点は平均との差を標準偏差で割った値です。" },
  { id: "relation", no: "A4", area: "データ活用", title: "相関・回帰・因果関係", subtitle: "相関を読み、因果を断定しない。", concepts: ["散布図", "相関係数", "因果"], point: "相関が強くても、それだけで因果関係は断定できません。" },
  { id: "simulation", no: "A5", area: "データ活用", title: "確率とシミュレーション", subtitle: "乱数実験とモデルの限界を考える。", concepts: ["乱数", "試行", "モデル"], point: "シミュレーションは仮定を明示して、多数回試行します。" },
  { id: "test", no: "A6", area: "データ活用", title: "仮説検定", subtitle: "帰無仮説、有意水準、p値を判断する。", concepts: ["帰無仮説", "p値", "有意水準"], point: "p値が有意水準より小さいとき、帰無仮説を棄却します。" },
  { id: "timeseries", no: "A7", area: "データ活用", title: "時系列データ", subtitle: "トレンド、季節性、移動平均を扱う。", concepts: ["時系列", "トレンド", "移動平均"], point: "移動平均は短期的な上下をならして傾向を見やすくします。" },
  { id: "ai", no: "A8", area: "データ活用", title: "AI分析の検証", subtitle: "AIの分析結果を検算し、個人情報を除く。", concepts: ["検算", "根拠", "個人情報"], point: "AIの結果は別手段で検算し、不要な個人情報は入力しません。" }
];

const makeQuestions = (lesson: Omit<Lesson, "questions"> & { point: string }): Question[] => [
  { id: `${lesson.id}-1`, q: `${lesson.title}で最も重視する考え方はどれか。`, choices: [lesson.point, "得点だけを見て理由は記録しない。", "単位や前提を確認しない。", "結果を必ず因果関係とみなす。"], answer: 0, explanation: lesson.point },
  { id: `${lesson.id}-2`, q: "計算や分析で最初に確認すべきことはどれか。", choices: ["単位・前提・データの意味", "見た目の印象だけ", "都合のよい結果だけ", "ファイル名だけ"], answer: 0, explanation: "単位、前提、データの意味を確認すると誤解を減らせます。" },
  { id: `${lesson.id}-3`, q: "学習結果を説明するときに適切な態度はどれか。", choices: ["根拠と限界を示す", "理由を書かない", "外れ値を無条件に削除する", "個人情報を追加する"], answer: 0, explanation: "根拠、前提、限界を示すことが大切です。" },
  { id: `${lesson.id}-4`, q: "ITパスポート型の問題で注意すべき点はどれか。", choices: ["用語の意味と具体例を結びつける", "暗記語だけを見る", "選択肢を読まない", "単位を無視する"], answer: 0, explanation: "用語を具体例や計算手順と結びつけます。" },
  { id: `${lesson.id}-5`, q: "公開・提出前に行うべき確認はどれか。", choices: ["不要な個人情報が含まれないか確認する", "氏名住所を追加する", "点数を手で書き換える", "保存した記録を確認しない"], answer: 0, explanation: "提出データは必要最小限にします。" }
];

const lessons: Lesson[] = lessonDefs.map((lesson) => ({ ...lesson, questions: makeQuestions(lesson) }));
const normalizeStudentCode = (value: string) => value.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0)).replace(/[^0-9]/g, "").slice(0, 4);
const todayNumber = () => { const now = new Date(); return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`; };

export default function Home() {
  const [studentCode, setStudentCode] = useState("");
  const [active, setActive] = useState("home");
  const [drafts, setDrafts] = useState<Record<string, number[]>>({});
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [experiments, setExperiments] = useState<Record<string, boolean>>({});
  const [reflection, setReflection] = useState("");
  const [loaded, setLoaded] = useState(false);
  const current = lessons.find((lesson) => lesson.id === active);
  const summary = useMemo(() => {
    const quizCorrect = Object.values(submissions).reduce((sum, submission) => sum + submission.correct, 0);
    const quizMax = lessons.length * 5;
    const completedLessons = lessons.filter((lesson) => submissions[lesson.id] && experiments[`${lesson.id}-1`] && experiments[`${lesson.id}-2`] && experiments[`${lesson.id}-3`]).length;
    const totalScore = Math.round((quizCorrect / quizMax) * 80 + (completedLessons / lessons.length) * 20);
    return { totalScore, quizCorrect, quizMax, completedLessons, lessonCount: lessons.length };
  }, [submissions, experiments]);

  useEffect(() => setLoaded(true), []);
  useEffect(() => {
    if (!loaded || studentCode.length !== 4) return;
    localStorage.setItem(`${STORAGE_PREFIX}${studentCode}`, JSON.stringify({ version: 1, studentCode, drafts, submissions, experiments, reflection, summary } satisfies StudentRecord));
  }, [loaded, studentCode, drafts, submissions, experiments, reflection, summary]);

  const updateStudentCode = (value: string) => {
    const code = normalizeStudentCode(value);
    setStudentCode(code);
    if (code.length !== 4) { setDrafts({}); setSubmissions({}); setExperiments({}); setReflection(""); return; }
    try {
      const saved = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${code}`) ?? "{}") as Partial<StudentRecord>;
      setDrafts(saved.drafts ?? {}); setSubmissions(saved.submissions ?? {}); setExperiments(saved.experiments ?? {}); setReflection(saved.reflection ?? "");
    } catch { setDrafts({}); setSubmissions({}); setExperiments({}); setReflection(""); }
  };
  const lessonProgress = (lesson: Lesson) => Number(!!experiments[`${lesson.id}-1`]) + Number(!!experiments[`${lesson.id}-2`]) + Number(!!experiments[`${lesson.id}-3`]);
  const choose = (lesson: Lesson, questionIndex: number, choiceIndex: number) => {
    if (submissions[lesson.id]) return;
    setDrafts((prev) => { const next = [...(prev[lesson.id] ?? Array(5).fill(-1))]; next[questionIndex] = choiceIndex; return { ...prev, [lesson.id]: next }; });
  };
  const submitLesson = (lesson: Lesson) => {
    const answers = drafts[lesson.id] ?? [];
    if (answers.length !== 5 || answers.some((answer) => answer === -1 || answer === undefined)) return;
    const correct = lesson.questions.filter((question, index) => question.answer === answers[index]).length;
    setSubmissions((prev) => ({ ...prev, [lesson.id]: { answers, correct, submittedAt: new Date().toISOString() } }));
  };
  const exportJson = () => {
    if (studentCode.length !== 4) return;
    const record: StudentRecord = { version: 1, exportedAt: new Date().toISOString(), studentCode, drafts, submissions, experiments, reflection, summary };
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${studentCode}_ddl_${todayNumber()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return <main>
    <header className="topbar"><button className="brand" onClick={() => setActive("home")}>情報I Digital & Data Lab</button><nav className="nav"><button onClick={() => setActive("home")}>学習マップ</button><button onClick={() => setActive("results")}>成績・JSON出力</button>{studentCode.length === 4 && <button onClick={() => updateStudentCode("")}>学習を終了</button>}</nav></header>
    <div className="shell">
      {active === "home" && <>
        <section className="hero"><div><h1>操作して、判断できる情報Iへ。</h1><p>全16単元。各単元は実験3つと確認問題5問で進みます。結果はこのブラウザに保存され、最後にJSONで出力できます。</p><div className="lookup"><label>4桁番号<input inputMode="numeric" value={studentCode} onChange={(event) => updateStudentCode(event.target.value)} placeholder="例: 1205" /></label><div className="status-pill">{studentCode.length === 4 ? `番号 ${studentCode}` : "半角数字4桁を入力"}</div></div></div><div className="score-ring"><strong>{summary.totalScore}</strong><span>/100</span></div></section>
        {(["デジタル", "データ活用"] as const).map((area) => <section key={area}><div className="section-heading"><h2>{area}</h2><span className="muted">{lessons.filter((lesson) => lesson.area === area && submissions[lesson.id]).length} / 8 テスト送信済み</span></div><div className="lesson-grid">{lessons.filter((lesson) => lesson.area === area).map((lesson) => <button className={`lesson-card ${submissions[lesson.id] ? "done" : ""}`} key={lesson.id} onClick={() => setActive(lesson.id)}><b>{lesson.no}</b><h3>{lesson.title}</h3><p>{lesson.subtitle}</p><div className="tags">{lesson.concepts.map((concept) => <span key={concept}>{concept}</span>)}</div><strong>{submissions[lesson.id] ? `${submissions[lesson.id].correct}/5点` : `${lessonProgress(lesson)}/3実験`}</strong></button>)}</div></section>)}
      </>}
      {current && <section className="workspace"><button className="back" onClick={() => setActive("home")}>学習マップへ戻る</button><div className="lesson-hero"><div><h1>{current.no} {current.title}</h1><p>{current.subtitle}</p><div className="tags">{current.concepts.map((concept) => <span key={concept}>{concept}</span>)}</div></div><div className="lesson-status"><span>実験 {lessonProgress(current)}/3</span><span>確認問題 {submissions[current.id] ? `${submissions[current.id].correct}/5` : "未送信"}</span></div></div><div className="experiments">{[1, 2, 3].map((no) => <article className="experiment" key={no}><div><b>実験 {no}</b><p className="muted">{no === 1 ? "基本事項を操作して確認します。" : no === 2 ? "条件を変えて結果を比較します。" : "現実の場面に当てはめて判断します。"}</p></div><button className={experiments[`${current.id}-${no}`] ? "recorded" : "ghost"} disabled={!!experiments[`${current.id}-${no}`]} onClick={() => setExperiments((prev) => ({ ...prev, [`${current.id}-${no}`]: true }))}>{experiments[`${current.id}-${no}`] ? "記録済み" : "記録する"}</button></article>)}</div><section className="quiz"><h2>確認問題 5問</h2>{current.questions.map((question, index) => { const submitted = submissions[current.id]; const selected = submitted ? submitted.answers[index] : drafts[current.id]?.[index] ?? -1; return <article className="question" key={question.id}><h3>Q{index + 1}. {question.q}</h3><div className="choices">{question.choices.map((choice, choiceIndex) => <button key={choice} disabled={!!submitted} className={`${selected === choiceIndex ? "selected" : ""} ${submitted && question.answer === choiceIndex ? "correct" : ""} ${submitted && selected === choiceIndex && question.answer !== choiceIndex ? "wrong" : ""}`} onClick={() => choose(current, index, choiceIndex)}>{String.fromCharCode(65 + choiceIndex)}. {choice}</button>)}</div>{submitted && <div className="feedback">{selected === question.answer ? "正解。" : "不正解。"} {question.explanation}</div>}</article>; })}{!submissions[current.id] ? <button className="primary" disabled={(drafts[current.id] ?? []).filter((answer) => answer >= 0).length !== 5} onClick={() => submitLesson(current)}>5問の解答を送信して得点を確定</button> : <div className="notice">送信済みです。得点はこのブラウザに保存されています。</div>}</section></section>}
      {active === "results" && <section className="workspace"><button className="back" onClick={() => setActive("home")}>学習マップへ戻る</button><h1>成績・JSON出力</h1><p className="muted">知識問題80点 + 全単元の実験完了20点で総合点を計算します。教員用の保存機能はありません。</p><div className="result-grid"><div className="metric"><span>総合点</span><b>{summary.totalScore}</b><small>/100</small></div><div className="metric"><span>確認問題</span><b>{summary.quizCorrect}</b><small>/{summary.quizMax}</small></div><div className="metric"><span>完了単元</span><b>{summary.completedLessons}</b><small>/{summary.lessonCount}</small></div></div><div className="unit-results">{lessons.map((lesson) => <div key={lesson.id}><span>{lesson.no}</span><b>{lesson.title}</b><em>{submissions[lesson.id] ? `${submissions[lesson.id].correct}/5` : "未送信"}</em></div>)}</div><div className="field notice"><label>学習の振り返り<textarea value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="理解できたこと、まだ説明しにくいこと、次に試したいことを書きましょう。" /></label></div><div className="actions"><button className="primary" disabled={studentCode.length !== 4} onClick={exportJson}>JSONを保存</button><span className="muted">{studentCode.length === 4 ? `保存ファイル名: ${studentCode}_ddl_${todayNumber()}.json` : "4桁番号を入力するとJSON出力できます。"}</span></div></section>}
    </div><footer>学習履歴と得点は使用中のブラウザに保存されます。氏名・名簿データは含みません。</footer>
  </main>;
}
