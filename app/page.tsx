"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Experiments } from "./experiments";
import { experimentCount, lessons, totalExperiments, totalQuestions } from "./lib/lessons";
import type { Area, Lesson, QuestionResult, Submission, StudentRecord, Summary } from "./lib/types";

const STORAGE_PREFIX = "joho-ddl-public-v2:";
/** 確定した4桁番号を覚えておくキー。次に開いたときも同じ番号で続きから始める */
const ACTIVE_KEY = "joho-ddl-public-active";

const AREAS: Area[] = ["デジタル", "データ活用"];

/** 1回目正解＝1点、2回目正解＝0.5点、不正解＝0点 */
const FIRST_POINT = 1;
const SECOND_POINT = 0.5;

/** 小数第1位まで（0.5刻みの得点を見やすく丸める） */
const point = (value: number) => Math.round(value * 10) / 10;

/**
 * 保存されている解答から、問題ごとの結果と得点を組み立て直す。
 * 旧バージョン（2回目の記録がない）の保存データもここで読めるようにしている。
 */
const gradeSubmission = (lesson: Lesson, saved: Partial<Submission> | undefined): Submission | undefined => {
  if (!saved || !Array.isArray(saved.answers)) return undefined;
  const answers = lesson.questions.map((_, i) => saved.answers?.[i] ?? -1);
  const retries = lesson.questions.map((_, i) => saved.retries?.[i] ?? -1);
  const results: QuestionResult[] = lesson.questions.map((question, i) => {
    if (answers[i] === question.answer) return "1回目で正解";
    if (retries[i] === -1) return "2回目待ち";
    return retries[i] === question.answer ? "2回目で正解" : "不正解";
  });
  const correct = results.filter((r) => r === "1回目で正解").length;
  const secondCorrect = results.filter((r) => r === "2回目で正解").length;
  return {
    answers,
    retries,
    correct,
    secondCorrect,
    score: point(correct * FIRST_POINT + secondCorrect * SECOND_POINT),
    results,
    submittedAt: saved.submittedAt ?? new Date().toISOString(),
    ...(saved.retriedAt ? { retriedAt: saved.retriedAt } : {})
  };
};

const normalizeStudentCode = (value: string) =>
  value
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[^0-9]/g, "")
    .slice(0, 4);

const todayNumber = () => {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
};

export default function Home() {
  /** 確定した番号。確定するまでは空文字 */
  const [studentCode, setStudentCode] = useState("");
  /** 入力中の番号（まだ確定していない） */
  const [codeDraft, setCodeDraft] = useState("");
  const [active, setActive] = useState("home");
  const [drafts, setDrafts] = useState<Record<string, number[]>>({});
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [experiments, setExperiments] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  /** 「学習を終了」を押したあとの確認中フラグ */
  const [endConfirm, setEndConfirm] = useState(false);

  const current = lessons.find((lesson) => lesson.id === active);

  const summary = useMemo<Summary>(() => {
    /** 単元の集合をまとめて集計する。分野ごとにも、全体にも同じ式を使う */
    const tally = (group: Lesson[]) => {
      let quizScore = 0;
      let firstCorrect = 0;
      let secondCorrect = 0;
      let quizMax = 0;
      let experimentDone = 0;
      let experimentMax = 0;
      let completedLessons = 0;
      group.forEach((lesson) => {
        const submission = submissions[lesson.id];
        quizMax += lesson.questions.length;
        if (submission) {
          quizScore += submission.score;
          firstCorrect += submission.correct;
          secondCorrect += submission.secondCorrect;
        }
        const expTotal = experimentCount(lesson);
        const expDone = Array.from({ length: expTotal }, (_, i) => experiments[`${lesson.id}-${i}`]).filter(Boolean).length;
        experimentMax += expTotal;
        experimentDone += expDone;
        if (submission && expDone === expTotal) completedLessons += 1;
      });
      const knowledge = quizMax ? Math.round((quizScore / quizMax) * 100) : 0;
      const thinking = experimentMax ? Math.round((experimentDone / experimentMax) * 100) : 0;
      return {
        totalScore: Math.round(knowledge * 0.6 + thinking * 0.4),
        perspective: { knowledge, thinking },
        quizScore: point(quizScore),
        firstCorrect,
        secondCorrect,
        quizMax,
        experimentDone,
        experimentMax,
        completedLessons,
        lessonCount: group.length
      };
    };

    const whole = tally(lessons);
    const areas = AREAS.map((area) => ({ area, ...tally(lessons.filter((lesson) => lesson.area === area)) }));
    return {
      // 総合点は、分野ごとの100点を足した200点満点
      totalScore: areas.reduce((sum, area) => sum + area.totalScore, 0),
      totalMax: areas.length * 100,
      perspective: whole.perspective,
      quizScore: whole.quizScore,
      quizCorrect: whole.firstCorrect,
      quizSecondCorrect: whole.secondCorrect,
      quizMax: whole.quizMax,
      experimentDone: whole.experimentDone,
      experimentMax: whole.experimentMax,
      completedLessons: whole.completedLessons,
      lessonCount: whole.lessonCount,
      areas
    };
  }, [submissions, experiments]);

  /** 成績ページのダッシュボード用に、単元別・難易度別の理解度を集計する */
  const analysis = useMemo(() => {
    const perLesson = lessons.map((lesson) => {
      const submission = submissions[lesson.id];
      const total = lesson.questions.length;
      const correct = submission?.correct ?? 0;
      const score = submission?.score ?? 0;
      const rate = submission ? Math.round((score / total) * 100) : null;
      const wrong = submission
        ? lesson.questions
            .map((question, index) => ({
              question,
              index,
              picked: submission.answers[index],
              retried: submission.retries[index],
              result: submission.results[index]
            }))
            .filter((row) => row.result !== "1回目で正解")
        : [];
      const expTotal = experimentCount(lesson);
      const expDone = Array.from({ length: expTotal }, (_, i) => experiments[`${lesson.id}-${i}`]).filter(Boolean).length;
      const state: "none" | "good" | "warn" | "bad" =
        rate === null ? "none" : rate >= 80 ? "good" : rate >= 60 ? "warn" : "bad";
      return { lesson, submitted: !!submission, total, correct, score, rate, wrong, expDone, expTotal, state };
    });

    const levels = ["基礎", "共通テスト", "ITパスポート", "基本情報"] as const;
    const byLevel = levels.map((level) => {
      let score = 0;
      let correct = 0;
      let total = 0;
      perLesson.forEach((row) => {
        if (!row.submitted) return;
        const submission = submissions[row.lesson.id]!;
        row.lesson.questions.forEach((question, index) => {
          if (question.level !== level) return;
          total += 1;
          if (submission.results[index] === "1回目で正解") {
            correct += 1;
            score += FIRST_POINT;
          } else if (submission.results[index] === "2回目で正解") {
            score += SECOND_POINT;
          }
        });
      });
      return { level, correct, score: point(score), total, rate: total ? Math.round((score / total) * 100) : null };
    });

    const answered = perLesson.filter((row) => row.submitted);
    const weak = answered.filter((row) => (row.rate ?? 100) < 80).sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0)).slice(0, 3);
    const strong = answered.filter((row) => (row.rate ?? 0) >= 80);
    const basic = byLevel[0];
    const applied = byLevel.slice(1).reduce(
      (acc, row) => ({ score: acc.score + row.score, total: acc.total + row.total }),
      { score: 0, total: 0 }
    );
    const appliedRate = applied.total ? Math.round((applied.score / applied.total) * 100) : null;
    const untouched = perLesson.filter((row) => row.expDone === 0 && !row.submitted).length;

    /** 集計結果から、事実だけを根拠にした短い講評を組み立てる */
    const verdicts: string[] = [];
    if (!answered.length) {
      verdicts.push("まだ確認問題が1つも送信されていません。どの単元でもよいので1つ送信すると、ここに得意と弱点が表示されます。");
    } else {
      const totalCorrect = answered.reduce((a, b) => a + b.correct, 0);
      const totalSecond = answered.reduce((a, b) => a + b.lesson.questions.length - b.correct - b.wrong.filter((w) => w.result !== "2回目で正解").length, 0);
      const totalAsked = answered.reduce((a, b) => a + b.total, 0);
      verdicts.push(
        `送信した${answered.length}単元で、${totalAsked}問中${totalCorrect}問を1回目で正解しています（${Math.round((totalCorrect / totalAsked) * 100)}%）。` +
          (totalSecond > 0 ? `さらに${totalSecond}問を2回目で正解しました。` : "")
      );
      if (basic.rate !== null && appliedRate !== null && basic.rate - appliedRate >= 20) {
        verdicts.push(`用語や定義（基礎${basic.rate}%）は入っていますが、計算や判断を求める問題（${appliedRate}%）で落としています。手順を実験でたどり直すのが近道です。`);
      } else if (basic.rate !== null && appliedRate !== null && appliedRate - basic.rate >= 20) {
        verdicts.push(`計算問題（${appliedRate}%）は解けていますが、用語の問題（基礎${basic.rate}%）で落としています。各単元の重要語句を開いて確認しましょう。`);
      }
      const weakLowExp = weak.filter((row) => row.expDone < row.expTotal / 2);
      if (weakLowExp.length) {
        verdicts.push(`弱点の単元のうち${weakLowExp.length}つは、実験もまだ半分以下しか触れていません。読むより先に、手を動かすほうが効きます。`);
      }
      if (strong.length) {
        verdicts.push(`${strong.length}単元が8割を超えています。ここは自信を持って先へ進んで大丈夫です。`);
      }
    }

    return { perLesson, byLevel, weak, strong, answered, untouched, verdicts };
  }, [submissions, experiments]);

  // 前回この端末で確定した番号があれば、そのまま続きから始める
  useEffect(() => {
    setLoaded(true);
    try {
      const saved = normalizeStudentCode(localStorage.getItem(ACTIVE_KEY) ?? "");
      if (saved.length === 4) {
        setStudentCode(saved);
        setCodeDraft(saved);
        loadRecord(saved);
      }
    } catch {
      /* 読めない環境では、番号の入力から始める */
    }
    // 初回マウントのときだけ実行する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded || studentCode.length !== 4) return;
    const record: StudentRecord = { version: 3, studentCode, drafts, submissions, experiments, summary };
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${studentCode}`, JSON.stringify(record));
    } catch {
      /* 保存できない環境では黙って続行する */
    }
  }, [loaded, studentCode, drafts, submissions, experiments, summary]);

  /** 保存済みの記録を読み出す。旧バージョンのデータもここで採点し直す */
  const loadRecord = (code: string) => {
    try {
      const saved = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${code}`) ?? "{}") as Partial<StudentRecord>;
      const restored: Record<string, Submission> = {};
      lessons.forEach((lesson) => {
        const graded = gradeSubmission(lesson, saved.submissions?.[lesson.id] as Partial<Submission> | undefined);
        if (graded) restored[lesson.id] = graded;
      });
      setDrafts(saved.drafts ?? {});
      setSubmissions(restored);
      setExperiments(saved.experiments ?? {});
    } catch {
      setDrafts({});
      setSubmissions({});
      setExperiments({});
    }
  };

  /** 入力中の番号に、このブラウザの記録があるかを見て、確認画面に出す内容を決める */
  const draftPreview = useMemo(() => {
    if (codeDraft.length !== 4 || !loaded) return null;
    try {
      const saved = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${codeDraft}`) ?? "null") as StudentRecord | null;
      if (!saved) return { found: false, lessons: 0, experiments: 0 };
      return {
        found: true,
        lessons: Object.keys(saved.submissions ?? {}).length,
        experiments: Object.values(saved.experiments ?? {}).filter(Boolean).length
      };
    } catch {
      return { found: false, lessons: 0, experiments: 0 };
    }
  }, [codeDraft, loaded]);

  /** 番号を確定する。確定するとこのブラウザではもう変えられない */
  const confirmCode = () => {
    if (codeDraft.length !== 4) return;
    setStudentCode(codeDraft);
    loadRecord(codeDraft);
    try {
      localStorage.setItem(ACTIVE_KEY, codeDraft);
    } catch {
      /* 保存できない環境では黙って続行する */
    }
  };

  const choose = (lesson: Lesson, questionIndex: number, choiceIndex: number) => {
    if (submissions[lesson.id]) return;
    setDrafts((prev) => {
      const next = [...(prev[lesson.id] ?? Array(lesson.questions.length).fill(-1))];
      next[questionIndex] = choiceIndex;
      return { ...prev, [lesson.id]: next };
    });
  };

  const submitLesson = (lesson: Lesson) => {
    const answers = drafts[lesson.id] ?? [];
    if (answers.length !== lesson.questions.length || answers.some((a) => a === -1 || a === undefined)) return;
    const graded = gradeSubmission(lesson, { answers, submittedAt: new Date().toISOString() });
    if (graded) setSubmissions((prev) => ({ ...prev, [lesson.id]: graded }));
  };

  /** 1回目に間違えた問題だけ、もう1回だけ選び直せる */
  const retry = (lesson: Lesson, questionIndex: number, choiceIndex: number) => {
    const submission = submissions[lesson.id];
    if (!submission) return;
    if (submission.results[questionIndex] !== "2回目待ち") return;
    const retries = [...submission.retries];
    retries[questionIndex] = choiceIndex;
    const graded = gradeSubmission(lesson, { ...submission, retries, retriedAt: new Date().toISOString() });
    if (graded) setSubmissions((prev) => ({ ...prev, [lesson.id]: graded }));
  };

  const markExperiment = (lessonId: string, index: number) =>
    setExperiments((prev) => ({ ...prev, [`${lessonId}-${index}`]: true }));

  const lessonProgress = (lesson: Lesson) =>
    Array.from({ length: experimentCount(lesson) }, (_, i) => experiments[`${lesson.id}-${i}`]).filter(Boolean).length;

  const exportJson = () => {
    if (studentCode.length !== 4) return;
    const record: StudentRecord = {
      version: 3,
      exportedAt: new Date().toISOString(),
      studentCode,
      drafts,
      submissions,
      experiments,
      summary
    };
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${studentCode}_ddl_${todayNumber()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  /**
   * 学習を終了して、番号の入力からやり直せる状態に戻す。
   * 共用パソコンで次の人に渡すための機能なので、押し間違いを防ぐため2段階にしている。
   * 記録そのものは消えないので、同じ番号を入れ直せば続きから再開できる。
   */
  const endLearning = () => {
    setStudentCode("");
    setCodeDraft("");
    setEndConfirm(false);
    setDrafts({});
    setSubmissions({});
    setExperiments({});
    setActive("home");
    try {
      localStorage.removeItem(ACTIVE_KEY);
    } catch {
      /* 消せない環境では黙って続行する */
    }
  };

  /** 実験カードの共通枠。理論 → 操作 → 記録ボタン の順に並べる */
  const renderCard = (lesson: Lesson) => {
    const last = lesson.theory.length;
    return (index: number, title: string, goal: string, body: ReactNode): ReactNode => {
      const key = `${lesson.id}-${index}`;
      const done = !!experiments[key];
      const isMission = index === last;
      const label = isMission ? "応用" : `実験${index + 1}`;
      return (
        <article className={`experiment-card ${isMission ? "application-card" : ""}`} key={key}>
          <div className="experiment-heading">
            <span>{isMission ? "応用" : `実験 ${index + 1}`}</span>
            <div>
              <h2>{title}</h2>
              <p>{goal}</p>
            </div>
          </div>
          {isMission ? (
            <div className="mission-box">
              <b>応用ミッション</b>
              <p>{lesson.mission.body}</p>
              <div className="mission-steps">
                {lesson.mission.steps.map((item, i) => (
                  <div className="mission-step" key={item.label}>
                    <span>手順 {i + 1}</span>
                    <b>{item.label}</b>
                    <p>{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="theory-box">
              <b>理論</b>
              {lesson.theory[index].split("\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          )}
          <div className="experiment-body">{body}</div>
          <button
            type="button"
            className={`record-experiment ${done ? "recorded" : ""}`}
            onClick={() => markExperiment(lesson.id, index)}
            disabled={done}
          >
            {done ? `${label} 記録済み` : `${label}を記録する`}
          </button>
        </article>
      );
    };
  };

  return (
    <main>
      <header className="topbar">
        <button className="brand" onClick={() => setActive("home")}>
          情報I Digital &amp; Data Lab
        </button>
        <nav className="nav">
          <button onClick={() => setActive("home")}>学習マップ</button>
          <button onClick={() => setActive("results")}>成績・JSON出力</button>
          {studentCode.length === 4 &&
            (endConfirm ? (
              <>
                <button className="danger" onClick={endLearning}>
                  終了する（記録は残ります）
                </button>
                <button onClick={() => setEndConfirm(false)}>やめる</button>
              </>
            ) : (
              <button onClick={() => setEndConfirm(true)}>学習を終了</button>
            ))}
        </nav>
      </header>

      <div className="shell">
        {active === "home" && (
          <>
            <section className="hero">
              <div>
                <h1>さあ、どの単元から攻略する？</h1>
                <p>
                  全{lessons.length}単元・実験{totalExperiments}個・確認問題{totalQuestions}問。読むだけの単元はひとつもありません。
                  数値を打ちこみ、ビットを押し、絵を描いて確かめていきます。挑んだ記録はこのブラウザに残り、成績ページで弱点まで見えます。
                  {studentCode.length === 4
                    ? ""
                    : "はじめに4桁番号を入れ、確認してから確定してください。確定するとこのブラウザでは番号を変えられません。"}
                </p>
                {studentCode.length === 4 ? (
                  <div className="code-locked">
                    <b>番号 {studentCode}</b>
                    <span>確定しました。この番号で記録しています。</span>
                  </div>
                ) : (
                  <div className="code-entry">
                    <div className="lookup">
                      <label>
                        4桁番号
                        <input
                          inputMode="numeric"
                          value={codeDraft}
                          onChange={(e) => setCodeDraft(normalizeStudentCode(e.target.value))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") confirmCode();
                          }}
                          placeholder="例: 1205"
                          autoComplete="off"
                        />
                      </label>
                      <div className="status-pill">
                        {codeDraft.length === 4 ? "下のボタンで確定します" : "半角数字4桁を入力"}
                      </div>
                    </div>

                    {codeDraft.length === 4 && draftPreview && (
                      <div className="code-confirm">
                        <p className="code-ask">
                          <b>{codeDraft}</b> ですね？
                        </p>
                        <p className="code-note">
                          {draftPreview.found
                            ? `このブラウザに ${codeDraft} の記録があります（確認問題 ${draftPreview.lessons}単元送信済み・実験 ${draftPreview.experiments}個）。続きから始めます。`
                            : `このブラウザに ${codeDraft} の記録はありません。新しく始めます。`}
                        </p>
                        <p className="code-warn">
                          確定すると、このブラウザでは番号を変えられなくなります。間違いがないか確かめてください。
                        </p>
                        <div className="code-actions">
                          <button className="primary" onClick={confirmCode}>
                            はい、{codeDraft} で始める
                          </button>
                          <button className="ghost" onClick={() => setCodeDraft("")}>
                            入力し直す
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="score-panel">
                <div className="score-ring">
                  <strong>{summary.totalScore}</strong>
                  <span>/{summary.totalMax}</span>
                </div>
                <ul className="perspective">
                  <li>
                    <span>知識・技能</span>
                    <b>{summary.perspective.knowledge}</b>
                  </li>
                  <li>
                    <span>思考・判断・表現</span>
                    <b>{summary.perspective.thinking}</b>
                  </li>
                </ul>
              </div>
            </section>

            {(["デジタル", "データ活用"] as const).map((area) => {
              const areaLessons = lessons.filter((lesson) => lesson.area === area);
              return (
                <section key={area}>
                  <div className="section-heading">
                    <h2>{area}</h2>
                    <span className="muted">
                      {areaLessons.filter((lesson) => submissions[lesson.id]).length} / {areaLessons.length} テスト送信済み
                    </span>
                  </div>
                  <div className="lesson-grid">
                    {areaLessons.map((lesson) => (
                      <button className={`lesson-card ${submissions[lesson.id] ? "done" : ""}`} key={lesson.id} onClick={() => setActive(lesson.id)}>
                        <b>{lesson.no}</b>
                        <h3>{lesson.title}</h3>
                        <p>{lesson.subtitle}</p>
                        <div className="tags">
                          {lesson.concepts.slice(0, 4).map((concept) => (
                            <span key={concept}>{concept}</span>
                          ))}
                        </div>
                        <strong>
                          実験 {lessonProgress(lesson)}/{experimentCount(lesson)}
                          {submissions[lesson.id] ? ` ・ 問題 ${submissions[lesson.id].correct}/${lesson.questions.length}` : ""}
                        </strong>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        )}

        {current && (
          <section className="workspace">
            <button className="back" onClick={() => setActive("home")}>
              学習マップへ戻る
            </button>
            <div className="lesson-hero">
              <div>
                <h1>
                  {current.no} {current.title}
                </h1>
                <p>{current.subtitle}</p>
                <div className="tags">
                  {current.concepts.map((concept) => (
                    <span key={concept}>{concept}</span>
                  ))}
                </div>
                <p className="muted small">
                  教科書 {current.textbook} ／ 学習時間の目安 {current.minutes}分
                </p>
              </div>
              <div className="lesson-status">
                <span>
                  実験 {lessonProgress(current)}/{experimentCount(current)}
                </span>
                <span>
                  確認問題 {submissions[current.id] ? `${submissions[current.id].correct}/${current.questions.length}` : "未送信"}
                </span>
              </div>
            </div>

            <section className="steps-box">
              <h2>
                {current.title}を理解する{current.steps.length}つのステップ
              </h2>
              <ol>
                {current.steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </section>

            <section className="terms-box">
              <button type="button" className="terms-toggle" onClick={() => setShowTerms(!showTerms)}>
                重要語句 {current.terms.length}語 {showTerms ? "を閉じる" : "を開く"}
              </button>
              {showTerms && (
                <dl>
                  {current.terms.map((term) => (
                    <div key={term.word}>
                      <dt>{term.word}</dt>
                      <dd>{term.meaning}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>

            <Experiments lessonId={current.id} card={renderCard(current)} />

            <section className="quiz">
              <h2>確認問題 {current.questions.length}問</h2>
              <p className="muted small">
                共通テスト・ITパスポート・基本情報技術者の出題範囲に対応しています。出典のある問題は問題文の下に表示されます。
              </p>
              {current.questions.map((question, index) => {
                const submitted = submissions[current.id];
                const result = submitted?.results[index];
                // 1回目に間違えて、まだ2回目を選んでいない状態
                const awaiting = result === "2回目待ち";
                const first = submitted ? submitted.answers[index] : (drafts[current.id]?.[index] ?? -1);
                const second = submitted ? submitted.retries[index] : -1;
                const selected = awaiting ? first : second >= 0 ? second : first;
                // 2回目待ちのあいだは、正解も解説もまだ見せない
                const resolved = !!submitted && !awaiting;
                return (
                  <article className={`question ${awaiting ? "retry-open" : ""}`} key={question.id}>
                    <h3>
                      <span className={`level level-${question.level}`}>{question.level}</span>
                      Q{index + 1}. {question.q}
                      {result && result !== "2回目待ち" && (
                        <span className={`result-tag ${result === "1回目で正解" ? "first" : result === "2回目で正解" ? "second" : "miss"}`}>
                          {result}
                          {result === "2回目で正解" ? "（0.5点）" : result === "1回目で正解" ? "（1点）" : "（0点）"}
                        </span>
                      )}
                    </h3>
                    {question.source && <p className="source">出典: {question.source}</p>}
                    {awaiting && (
                      <p className="retry-banner">
                        1回目は不正解でした。<b>もう1回だけ選べます</b>（2回目で正解すると0.5点）。よく読んで選び直しましょう。
                      </p>
                    )}
                    <div className="choices">
                      {question.choices.map((choice, choiceIndex) => {
                        const isFirstPick = !!submitted && first === choiceIndex;
                        const isSecondPick = second === choiceIndex;
                        return (
                          <button
                            key={choice}
                            // 未送信なら自由に選べる。2回目待ちのあいだは、1回目に選んだ選択肢以外を押せる
                            disabled={submitted ? !awaiting || isFirstPick : false}
                            className={[
                              !submitted && selected === choiceIndex ? "selected" : "",
                              resolved && question.answer === choiceIndex ? "correct" : "",
                              resolved && selected === choiceIndex && question.answer !== choiceIndex ? "wrong" : "",
                              resolved && isFirstPick && question.answer !== choiceIndex ? "wrong tried" : "",
                              awaiting && isFirstPick ? "wrong tried" : "",
                              isSecondPick ? "second-pick" : ""
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onClick={() => (awaiting ? retry(current, index, choiceIndex) : choose(current, index, choiceIndex))}
                          >
                            {String.fromCharCode(65 + choiceIndex)}. {choice}
                            {isFirstPick && question.answer !== choiceIndex && <em className="pick-tag">1回目に選んだ</em>}
                            {resolved && isSecondPick && <em className="pick-tag">2回目に選んだ</em>}
                          </button>
                        );
                      })}
                    </div>
                    {resolved && (
                      <div className="feedback">
                        {result === "1回目で正解"
                          ? "1回目で正解。"
                          : result === "2回目で正解"
                            ? "2回目で正解。半分の0.5点です。"
                            : "2回とも不正解。"}{" "}
                        {question.explanation}
                      </div>
                    )}
                  </article>
                );
              })}
              {!submissions[current.id] ? (
                <button
                  className="primary"
                  disabled={(drafts[current.id] ?? []).filter((a) => a >= 0).length !== current.questions.length}
                  onClick={() => submitLesson(current)}
                >
                  {current.questions.length}問の解答を送信して得点を確定
                </button>
              ) : (
                (() => {
                  const submission = submissions[current.id]!;
                  const waiting = submission.results.filter((r) => r === "2回目待ち").length;
                  return (
                    <div className="notice">
                      {waiting > 0 ? (
                        <>
                          あと <b>{waiting}問</b> が2回目の解答待ちです。上の赤い枠の問題を選び直すと得点が確定します。
                        </>
                      ) : (
                        <>
                          この単元の得点は <b>{submission.score}</b> / {current.questions.length}点です（1回目正解 {submission.correct}問、
                          2回目正解 {submission.secondCorrect}問）。記録はこのブラウザに保存されています。
                        </>
                      )}
                    </div>
                  );
                })()
              )}
            </section>

          </section>
        )}

        {active === "results" && (
          <section className="workspace">
            <button className="back" onClick={() => setActive("home")}>
              学習マップへ戻る
            </button>
            <h1>成績・JSON出力</h1>
            <p className="muted">
              デジタル分野100点＋データ活用分野100点の<b>200点満点</b>です。分野ごとに、知識・技能（確認問題）60％、
              思考・判断・表現（実験）40％で計算します。確認問題は1回目で正解すると1点、2回目で正解すると0.5点です。
              教員用の保存機能はありません。
            </p>
            <div className="result-grid">
              <div className="metric">
                <span>総合点（2分野の合計）</span>
                <b>{summary.totalScore}</b>
                <small>/{summary.totalMax}</small>
              </div>
              <div className="metric">
                <span>知識・技能</span>
                <b>{summary.perspective.knowledge}</b>
                <small>
                  {summary.quizScore}/{summary.quizMax}点
                </small>
              </div>
              <div className="metric">
                <span>思考・判断・表現</span>
                <b>{summary.perspective.thinking}</b>
                <small>
                  {summary.experimentDone}/{summary.experimentMax}実験
                </small>
              </div>
            </div>

            <div className="area-grid">
              {summary.areas.map((area) => (
                <div className="area-card" key={area.area}>
                  <div className="area-head">
                    <b>{area.area}分野</b>
                    <span>
                      {area.lessonCount}単元 ・ 確認問題{area.quizMax}問 ・ 実験{area.experimentMax}個
                    </span>
                  </div>
                  <div className="area-score">
                    <strong>{area.totalScore}</strong>
                    <span>/ 100点</span>
                  </div>
                  <div className="area-bar">
                    <i style={{ width: `${area.totalScore}%` }} />
                  </div>
                  <dl className="area-detail">
                    <div>
                      <dt>確認問題の素点</dt>
                      <dd>
                        {area.quizScore} / {area.quizMax}点
                      </dd>
                    </div>
                    <div>
                      <dt>1回目で正解</dt>
                      <dd>{area.firstCorrect}問</dd>
                    </div>
                    <div>
                      <dt>2回目で正解</dt>
                      <dd>{area.secondCorrect}問</dd>
                    </div>
                    <div>
                      <dt>実験の実施</dt>
                      <dd>
                        {area.experimentDone} / {area.experimentMax}個
                      </dd>
                    </div>
                    <div>
                      <dt>知識・技能</dt>
                      <dd>{area.perspective.knowledge}</dd>
                    </div>
                    <div>
                      <dt>思考・判断・表現</dt>
                      <dd>{area.perspective.thinking}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>

            <p className="muted small">
              完了した単元（全実験＋確認問題送信）: {summary.completedLessons} / {summary.lessonCount}　／
              確認問題は 1回目で {summary.quizCorrect}問、2回目で {summary.quizSecondCorrect}問 正解しています。
            </p>

            <section className="dashboard">
              <div className="dash-head">
                <h2>理解度ダッシュボード</h2>
                <span className="muted small">送信済みの確認問題から、得意な単元と弱点を割り出します</span>
              </div>

              <div className="verdict-box">
                {analysis.verdicts.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>

              <div className="dash-panel">
                  <h3>難易度別の到達度</h3>
                  <p className="muted small">同じ範囲でも、問われ方が変わると正答率は変わります。</p>
                  <div className="level-bars">
                    {analysis.byLevel.map((row) => (
                      <div className="level-row" key={row.level} title={`${row.level}: ${row.correct}/${row.total}問正解`}>
                        <span className={`level level-${row.level}`}>{row.level}</span>
                        <div className="bar-track">
                          <i style={{ width: `${row.rate ?? 0}%` }} />
                        </div>
                        <b>{row.rate === null ? "—" : `${row.rate}%`}</b>
                        <em>
                          {row.correct}/{row.total}問
                        </em>
                      </div>
                    ))}
                  </div>
                  <p className="hint-line">
                    基礎は用語や定義、共通テスト以上は計算と判断を問う問題です。差が20ポイント以上あると、覚え方と使い方のどちらかに偏りがあります。
                  </p>
              </div>

              <div className="dash-panel">
                  <h3>単元別の理解度マップ</h3>
                  <p className="muted small">色と文字の両方で状態を示しています。押すとその単元へ移動します。</p>
                  <div className="unit-map">
                    {analysis.perLesson.map((row) => (
                      <button
                        type="button"
                        key={row.lesson.id}
                        className={`map-row state-${row.state}`}
                        onClick={() => setActive(row.lesson.id)}
                        title={`${row.lesson.no} ${row.lesson.title} — ${row.submitted ? `${row.correct}/${row.total}問正解` : "未送信"} / 実験 ${row.expDone}/${row.expTotal}`}
                      >
                        <span className="map-no">{row.lesson.no}</span>
                        <span className="map-title">{row.lesson.title}</span>
                        <span className="bar-track">
                          <i style={{ width: `${row.rate ?? 0}%` }} />
                        </span>
                        <b>{row.rate === null ? "—" : `${row.rate}%`}</b>
                        <em className="map-state">
                          {row.state === "good" ? "定着" : row.state === "warn" ? "あと一歩" : row.state === "bad" ? "要復習" : "未受験"}
                        </em>
                        <em className="map-exp">
                          実験 {row.expDone}/{row.expTotal}
                        </em>
                      </button>
                    ))}
                  </div>
              </div>

              {analysis.weak.length > 0 && (
                <div className="dash-panel">
                  <h3>いま優先して立て直したい単元</h3>
                  <p className="muted small">正答率の低い順に、最大3つまで表示しています。</p>
                  <div className="weak-cards">
                    {analysis.weak.map((row) => (
                      <article className="weak-card" key={row.lesson.id}>
                        <header>
                          <span className="map-no">{row.lesson.no}</span>
                          <b>{row.lesson.title}</b>
                          <em>
                            {row.correct}/{row.total}問正解（{row.rate}%）
                          </em>
                        </header>
                        <div className="weak-block">
                          <span>つまずいている可能性</span>
                          <p>{row.lesson.remedy.stumble}</p>
                        </div>
                        {row.wrong.length > 0 && (
                          <div className="weak-block">
                            <span>間違えた問題で問われていたこと</span>
                            <ul>
                              {row.wrong.slice(0, 3).map((w) => (
                                <li key={w.question.id}>{w.question.q.length > 46 ? `${w.question.q.slice(0, 46)}…` : w.question.q}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="weak-block">
                          <span>こうすれば分かるようになります</span>
                          <ol className="remedy-steps">
                            {row.lesson.remedy.actions.map((action, i) => (
                              <li key={action}>
                                <i>{i + 1}</i>
                                {action}
                              </li>
                            ))}
                          </ol>
                        </div>
                        <div className="weak-foot">
                          <span className="muted small">
                            実験の実施 {row.expDone}/{row.expTotal}
                            {row.expDone < row.expTotal / 2 ? "（まず実験に戻るのが近道です）" : ""}
                          </span>
                          <button type="button" className="primary" onClick={() => setActive(row.lesson.id)}>
                            {row.lesson.no} をやり直す
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {analysis.strong.length > 0 && (
                <div className="dash-panel">
                  <h3>もう身についている単元</h3>
                  <div className="strong-list">
                    {analysis.strong.map((row) => (
                      <span key={row.lesson.id}>
                        {row.lesson.no} {row.lesson.title}
                        <i>{row.rate}%</i>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {analysis.answered.some((row) => row.wrong.length > 0) && (
                <details className="dash-panel review">
                  <summary>
                    間違えた問題をまとめて復習する（{analysis.answered.reduce((a, b) => a + b.wrong.length, 0)}問）
                  </summary>
                  {analysis.answered
                    .filter((row) => row.wrong.length > 0)
                    .map((row) => (
                      <div className="review-lesson" key={row.lesson.id}>
                        <h4>
                          {row.lesson.no} {row.lesson.title}
                        </h4>
                        {row.wrong.map((w) => (
                          <div className="review-item" key={w.question.id}>
                            <p className="review-q">
                              <span className={`level level-${w.question.level}`}>{w.question.level}</span>
                              {w.question.q}
                            </p>
                            <p className="review-a">
                              <span className="ng">1回目: {w.picked >= 0 ? w.question.choices[w.picked] : "無回答"}</span>
                              {w.retried >= 0 && (
                                <span className={w.result === "2回目で正解" ? "ok" : "ng"}>
                                  2回目: {w.question.choices[w.retried]}
                                </span>
                              )}
                              {w.result === "2回目待ち" && <span className="wait">2回目はまだ解答していません</span>}
                              <span className="ok">正解: {w.question.choices[w.question.answer]}</span>
                            </p>
                            {w.result !== "2回目待ち" && <p className="review-e">{w.question.explanation}</p>}
                          </div>
                        ))}
                      </div>
                    ))}
                </details>
              )}
            </section>
            <div className="unit-results">
              {lessons.map((lesson) => (
                <div key={lesson.id}>
                  <span>{lesson.no}</span>
                  <b>{lesson.title}</b>
                  <em>
                    実験 {lessonProgress(lesson)}/{experimentCount(lesson)}
                  </em>
                  <em>
                    {submissions[lesson.id]
                      ? `${submissions[lesson.id].score}/${lesson.questions.length}点（1回目${submissions[lesson.id].correct}問・2回目${submissions[lesson.id].secondCorrect}問）`
                      : "未送信"}
                  </em>
                </div>
              ))}
            </div>
            <div className="actions">
              <button className="primary" disabled={studentCode.length !== 4} onClick={exportJson}>
                JSONを保存
              </button>
              <span className="muted">
                {studentCode.length === 4 ? `保存ファイル名: ${studentCode}_ddl_${todayNumber()}.json` : "4桁番号を入力するとJSON出力できます。"}
              </span>
            </div>
          </section>
        )}
      </div>
      <footer>
        学習履歴と得点は使用中のブラウザに保存されます。氏名・名簿データは含みません。
        <br />
        単元構成は岡田メソッド（兵庫県立明石南高等学校 岡田）のExcelシートに対応しています。掲載した過去問題の著作権はIPA（情報処理推進機構）に帰属します。
      </footer>
    </main>
  );
}
