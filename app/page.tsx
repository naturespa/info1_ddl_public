"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Experiments } from "./experiments";
import { experimentCount, lessons, totalExperiments, totalQuestions } from "./lib/lessons";
import type { Lesson, Submission, StudentRecord } from "./lib/types";

const STORAGE_PREFIX = "joho-ddl-public-v2:";

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
  const [studentCode, setStudentCode] = useState("");
  const [active, setActive] = useState("home");
  const [drafts, setDrafts] = useState<Record<string, number[]>>({});
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [experiments, setExperiments] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const current = lessons.find((lesson) => lesson.id === active);

  const summary = useMemo(() => {
    const quizCorrect = Object.values(submissions).reduce((sum, submission) => sum + submission.correct, 0);
    const quizMax = totalQuestions;
    const experimentDone = Object.values(experiments).filter(Boolean).length;
    const completedLessons = lessons.filter((lesson) => {
      const done = Array.from({ length: experimentCount(lesson) }, (_, i) => experiments[`${lesson.id}-${i}`]).every(Boolean);
      return !!submissions[lesson.id] && done;
    }).length;
    const knowledge = Math.round((quizCorrect / quizMax) * 100);
    const thinking = Math.round((experimentDone / totalExperiments) * 100);
    return {
      totalScore: Math.round(knowledge * 0.6 + thinking * 0.4),
      perspective: { knowledge, thinking },
      quizCorrect,
      quizMax,
      experimentDone,
      experimentMax: totalExperiments,
      completedLessons,
      lessonCount: lessons.length
    };
  }, [submissions, experiments]);

  useEffect(() => setLoaded(true), []);

  useEffect(() => {
    if (!loaded || studentCode.length !== 4) return;
    const record: StudentRecord = { version: 2, studentCode, drafts, submissions, experiments, summary };
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${studentCode}`, JSON.stringify(record));
    } catch {
      /* 保存できない環境では黙って続行する */
    }
  }, [loaded, studentCode, drafts, submissions, experiments, summary]);

  const updateStudentCode = (value: string) => {
    const code = normalizeStudentCode(value);
    setStudentCode(code);
    const reset = () => {
      setDrafts({});
      setSubmissions({});
      setExperiments({});
    };
    if (code.length !== 4) {
      reset();
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${code}`) ?? "{}") as Partial<StudentRecord>;
      setDrafts(saved.drafts ?? {});
      setSubmissions(saved.submissions ?? {});
      setExperiments(saved.experiments ?? {});
    } catch {
      reset();
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
    const correct = lesson.questions.filter((question, index) => question.answer === answers[index]).length;
    setSubmissions((prev) => ({ ...prev, [lesson.id]: { answers, correct, submittedAt: new Date().toISOString() } }));
  };

  const markExperiment = (lessonId: string, index: number) =>
    setExperiments((prev) => ({ ...prev, [`${lessonId}-${index}`]: true }));

  const lessonProgress = (lesson: Lesson) =>
    Array.from({ length: experimentCount(lesson) }, (_, i) => experiments[`${lesson.id}-${i}`]).filter(Boolean).length;

  const exportJson = () => {
    if (studentCode.length !== 4) return;
    const record: StudentRecord = {
      version: 2,
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

  const endLearning = () => {
    setStudentCode("");
    setDrafts({});
    setSubmissions({});
    setExperiments({});
    setActive("home");
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
              <div className="mission-checks">
                {lesson.mission.checks.map((item, i) => (
                  <span key={item}>
                    <i>{i + 1}</i>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="theory-box">
              <b>理論</b>
              <p>{lesson.theory[index]}</p>
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
          {studentCode.length === 4 && <button onClick={endLearning}>学習を終了</button>}
        </nav>
      </header>

      <div className="shell">
        {active === "home" && (
          <>
            <section className="hero">
              <div>
                <h1>操作して、判断できる情報Iへ。</h1>
                <p>
                  全{lessons.length}単元・実験{totalExperiments}個・確認問題{totalQuestions}問。すべての実験は数値や文字を自分で入力して動かせます。
                  学習結果はこのブラウザに保存され、最後にJSONで出力できます。
                </p>
                <div className="lookup">
                  <label>
                    4桁番号
                    <input inputMode="numeric" value={studentCode} onChange={(e) => updateStudentCode(e.target.value)} placeholder="例: 1205" />
                  </label>
                  <div className="status-pill">{studentCode.length === 4 ? `番号 ${studentCode}` : "半角数字4桁を入力"}</div>
                </div>
              </div>
              <div className="score-panel">
                <div className="score-ring">
                  <strong>{summary.totalScore}</strong>
                  <span>/100</span>
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
                const selected = submitted ? submitted.answers[index] : (drafts[current.id]?.[index] ?? -1);
                return (
                  <article className="question" key={question.id}>
                    <h3>
                      <span className={`level level-${question.level}`}>{question.level}</span>
                      Q{index + 1}. {question.q}
                    </h3>
                    {question.source && <p className="source">出典: {question.source}</p>}
                    <div className="choices">
                      {question.choices.map((choice, choiceIndex) => (
                        <button
                          key={choice}
                          disabled={!!submitted}
                          className={`${selected === choiceIndex ? "selected" : ""} ${submitted && question.answer === choiceIndex ? "correct" : ""} ${
                            submitted && selected === choiceIndex && question.answer !== choiceIndex ? "wrong" : ""
                          }`}
                          onClick={() => choose(current, index, choiceIndex)}
                        >
                          {String.fromCharCode(65 + choiceIndex)}. {choice}
                        </button>
                      ))}
                    </div>
                    {submitted && (
                      <div className="feedback">
                        {selected === question.answer ? "正解。" : "不正解。"} {question.explanation}
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
                <div className="notice">送信済みです。得点はこのブラウザに保存されています。</div>
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
              知識・技能（確認問題）60％、思考・判断・表現（実験）40％で総合点を計算します。教員用の保存機能はありません。
            </p>
            <div className="result-grid">
              <div className="metric">
                <span>総合点</span>
                <b>{summary.totalScore}</b>
                <small>/100</small>
              </div>
              <div className="metric">
                <span>知識・技能</span>
                <b>{summary.perspective.knowledge}</b>
                <small>
                  {summary.quizCorrect}/{summary.quizMax}問
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
            <p className="muted small">
              完了した単元（全実験＋確認問題送信）: {summary.completedLessons} / {summary.lessonCount}
            </p>
            <div className="unit-results">
              {lessons.map((lesson) => (
                <div key={lesson.id}>
                  <span>{lesson.no}</span>
                  <b>{lesson.title}</b>
                  <em>
                    実験 {lessonProgress(lesson)}/{experimentCount(lesson)}
                  </em>
                  <em>{submissions[lesson.id] ? `${submissions[lesson.id].correct}/${lesson.questions.length}` : "未送信"}</em>
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
