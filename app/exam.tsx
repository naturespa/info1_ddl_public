"use client";

// 分野別テストの画面。
//
// 流れ
//   1. 先生が言うパスワードを入れる
//   2. そのクラス・分野の暗号ファイルを取りに行き、復号できたものが今日のテストになる
//   3. 10問ずつ8ページ（＋残り）で解く。答えは自動保存される
//   4. 提出すると採点し、その場で正解と解説が出る
//
// 問題は暗号化された状態で置いてあるので、パスワードを聞くまで誰も読めない。

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { decryptQuestions, makeupPassword, normalizePassword } from "./lib/exam-crypto";
import {
  formatElapsed,
  gradeExam,
  loadProgress,
  saveProgress,
  serveForStudent,
  toOriginalChoice,
  toScreenChoice,
  type ExamProgress,
  type ServedQuestion
} from "./lib/exam-runtime";
import { classOf, gradeOf, seatOf, type ClassNo, type EncryptedBundle, type ExamResult, type ExamSet } from "./lib/exam-types";

const PER_PAGE = 10;

/** 静的書き出しのときの公開パス。GitHub Pages では /info1_ddl_public が前につく */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * その生徒が受けられる可能性のあるファイル。上から順に試し、復号できたものが今日のテストになる。
 * 追試はその生徒専用のファイルなので、ファイル名に4桁番号が入る。
 */
const candidateFiles = (classNo: ClassNo, studentCode: string) => [
  { file: `digital-c${classNo}-main`, makeup: false },
  { file: `data-c${classNo}-main`, makeup: false },
  { file: `digital-makeup-${studentCode}`, makeup: true },
  { file: `data-makeup-${studentCode}`, makeup: true }
];

type Phase = "password" | "ready" | "running" | "done";

export function ExamView({
  studentCode,
  onResult
}: {
  studentCode: string;
  /** 採点が終わったら、成績ページとJSON出力に渡す */
  onResult: (result: ExamResult) => void;
}) {
  const classNo = classOf(studentCode);
  const [phase, setPhase] = useState<Phase>("password");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [set, setSet] = useState<ExamSet | null>(null);
  const [served, setServed] = useState<ServedQuestion[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [startedAt, setStartedAt] = useState("");
  const [result, setResult] = useState<ExamResult | null>(null);
  const [page, setPage] = useState(0);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<"all" | "wrong">("wrong");
  const topRef = useRef<HTMLDivElement>(null);

  /* ---------- パスワードを入れて、今日のテストを開く ---------- */

  const openExam = async () => {
    if (!classNo) {
      setError("4桁番号からクラスが読み取れません。番号を確認してください。");
      return;
    }
    const pw = normalizePassword(password);
    if (!pw) {
      setError("パスワードを入力してください。");
      return;
    }
    setBusy(true);
    setError("");
    try {
      for (const candidate of candidateFiles(classNo, studentCode)) {
        let bundle: EncryptedBundle;
        try {
          const res = await fetch(`${basePath}/exams/${candidate.file}.json`, { cache: "no-store" });
          if (!res.ok) continue;
          bundle = (await res.json()) as EncryptedBundle;
        } catch {
          continue;
        }
        // 追試は「基本パスワード＋その生徒の4桁番号」でしか開かない
        const tryWith = candidate.makeup ? makeupPassword(pw, studentCode) : pw;
        const questions = await decryptQuestions(bundle, tryWith);
        if (!questions) continue;

        const opened: ExamSet = {
          setId: bundle.setId,
          area: bundle.area,
          classNo: bundle.classNo,
          kind: bundle.kind,
          questions
        };
        const saved = loadProgress(studentCode, opened.setId);
        setSet(opened);
        setServed(serveForStudent(opened, studentCode));
        setPicked(saved?.picked ?? new Array(questions.length).fill(-1));
        setStartedAt(saved?.startedAt ?? new Date().toISOString());
        if (saved?.result) {
          setResult(saved.result);
          setPhase("done");
        } else {
          setPhase("ready");
        }
        setBusy(false);
        return;
      }
      setError("このパスワードでは開けませんでした。先生が言った文字を、もう一度確かめてください。");
    } catch {
      setError("テストの読み込みに失敗しました。通信の状態を確かめて、もう一度試してください。");
    }
    setBusy(false);
  };

  /* ---------- 解答 ---------- */

  const persist = useCallback(
    (next: number[], finished?: ExamResult) => {
      if (!set) return;
      const progress: ExamProgress = {
        setId: set.setId,
        studentCode,
        picked: next,
        startedAt,
        ...(finished ? { result: finished } : {})
      };
      saveProgress(progress);
    },
    [set, studentCode, startedAt]
  );

  const choose = (served: ServedQuestion, screenIndex: number) => {
    if (phase !== "running") return;
    setPicked((prev) => {
      const next = [...prev];
      next[served.originalIndex] = toOriginalChoice(served, screenIndex);
      persist(next);
      return next;
    });
  };

  const answered = picked.filter((p) => p >= 0).length;
  const total = served.length;
  const pageCount = Math.ceil(total / PER_PAGE);
  const pageItems = useMemo(() => served.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE), [served, page]);

  const goPage = (next: number) => {
    setPage(Math.max(0, Math.min(pageCount - 1, next)));
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submit = () => {
    if (!set) return;
    const finished = gradeExam(set, picked, startedAt, new Date().toISOString());
    setResult(finished);
    persist(picked, finished);
    onResult(finished);
    setPhase("done");
    setConfirmSubmit(false);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /** もう一方の分野を受けるために、パスワード画面へ戻る（提出済みの結果は保存されたまま） */
  const openAnother = () => {
    setSet(null);
    setServed([]);
    setPicked([]);
    setResult(null);
    setStartedAt("");
    setPassword("");
    setError("");
    setPage(0);
    setConfirmSubmit(false);
    setReviewFilter("wrong");
    setPhase("password");
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // 提出済みの結果は、開き直したときも成績ページへ渡す
  useEffect(() => {
    if (phase === "done" && result) onResult(result);
    // result が変わったときだけでよい
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, result]);

  /* ---------- 画面 ---------- */

  if (!classNo) {
    return (
      <section className="workspace">
        <h1>分野別テスト</h1>
        <div className="notice">
          4桁番号からクラスが読み取れません。番号は「学年1けた＋組1けた＋出席番号2けた」の形で入力してください（例: 1年2組5番なら 1205）。
        </div>
      </section>
    );
  }

  return (
    <section className="workspace exam-view" ref={topRef}>
      <div className="exam-head">
        <h1>分野別テスト</h1>
        <span className="exam-who">
          {gradeOf(studentCode)}年{classNo}組{seatOf(studentCode)}番（{studentCode}）
        </span>
      </div>

      {/* --- パスワード --- */}
      {phase === "password" && (
        <div className="exam-gate">
          <p className="muted">
            先生の合図があるまで、テストは開きません。合図があったら、先生が言うパスワードを入れてください。
          </p>
          <div className="input-row">
            <label className="field field-wide">
              <span className="field-label">
                テストのパスワード
                <i className="field-hint">大文字・小文字・記号もそのとおりに</i>
              </span>
              <span className="field-input">
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") openExam();
                  }}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="先生が板書または口頭で伝えます"
                />
              </span>
            </label>
          </div>
          <div className="code-actions">
            <button className="primary" onClick={openExam} disabled={busy}>
              {busy ? "確認しています…" : "テストを開く"}
            </button>
          </div>
          {error && <div className="verdict ng">{error}</div>}
          <p className="hint-line">
            追試の人は、先生から渡された追試用のパスワードを入れてください。自分の4桁番号でしか開きません。
          </p>
        </div>
      )}

      {/* --- 開始前の確認 --- */}
      {phase === "ready" && set && (
        <div className="exam-gate">
          <div className="exam-badge">
            <b>{set.area}分野</b>
            <span>
              {set.kind}・{set.questions.length}問・{set.questions.length}点満点
            </span>
          </div>
          <ul className="exam-rules">
            <li>1問1点です。すべて4つの選択肢から1つ選びます。</li>
            <li>答えは自動で保存されます。途中でページを閉じても、同じ番号で開けば続きから再開できます。</li>
            <li>提出するまで、何度でも選び直せます。</li>
            <li>提出すると採点され、その場で正解と解説が出ます。</li>
            <li>出題の順番と選択肢の並びは、一人ひとり違います。</li>
          </ul>
          {answered > 0 && (
            <div className="verdict ok">
              前回の続きがあります（{answered} / {total}問 解答済み）。
            </div>
          )}
          <div className="code-actions">
            <button className="primary" onClick={() => setPhase("running")}>
              {answered > 0 ? "続きから始める" : "テストを始める"}
            </button>
          </div>
        </div>
      )}

      {/* --- 受験中 --- */}
      {phase === "running" && set && (
        <>
          <div className="exam-bar">
            <div className="exam-progress">
              <i style={{ width: `${(answered / total) * 100}%` }} />
            </div>
            <span>
              解答済み <b>{answered}</b> / {total}問
            </span>
            <span className="muted small">
              {set.area}分野・{set.kind}
            </span>
          </div>

          {pageItems.map((item, i) => {
            const number = page * PER_PAGE + i + 1;
            const screen = toScreenChoice(item, picked[item.originalIndex]);
            return (
              <article className="question exam-question" key={item.question.id}>
                <h3>
                  <span className="exam-no">{number}</span>
                  {item.question.q}
                </h3>
                <div className="choices">
                  {item.choices.map((choice, ci) => (
                    <button
                      key={choice}
                      className={screen === ci ? "selected" : ""}
                      onClick={() => choose(item, ci)}
                    >
                      {String.fromCharCode(65 + ci)}. {choice}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}

          <div className="exam-pager">
            <button onClick={() => goPage(page - 1)} disabled={page === 0}>
              前の10問
            </button>
            <div className="exam-pages">
              {Array.from({ length: pageCount }, (_, p) => {
                const from = p * PER_PAGE;
                const to = Math.min(total, from + PER_PAGE);
                const pageAnswered = served
                  .slice(from, to)
                  .filter((s) => picked[s.originalIndex] >= 0).length;
                return (
                  <button
                    key={p}
                    className={`${p === page ? "active" : ""} ${pageAnswered === to - from ? "filled" : ""}`}
                    onClick={() => goPage(p)}
                    title={`${from + 1}〜${to}問（${pageAnswered}/${to - from} 解答済み）`}
                  >
                    {from + 1}〜{to}
                  </button>
                );
              })}
            </div>
            <button onClick={() => goPage(page + 1)} disabled={page >= pageCount - 1}>
              次の10問
            </button>
          </div>

          {confirmSubmit ? (
            <div className="exam-submit">
              <p>
                <b>提出すると、もう答えを変えられません。</b>
                {answered < total ? `まだ ${total - answered}問 が未解答です。` : "すべて解答できています。"}
              </p>
              <div className="code-actions">
                <button className="primary" onClick={submit}>
                  提出して採点する
                </button>
                <button className="ghost" onClick={() => setConfirmSubmit(false)}>
                  まだ見直す
                </button>
              </div>
            </div>
          ) : (
            <div className="exam-submit">
              <button className="primary" onClick={() => setConfirmSubmit(true)}>
                解答を提出する（{answered}/{total}問）
              </button>
            </div>
          )}
        </>
      )}

      {/* --- 結果 --- */}
      {phase === "done" && set && result && (
        <>
          <div className="exam-score">
            <div className="exam-score-main">
              <span>{result.area}分野・{result.kind}</span>
              <strong>{result.score}</strong>
              <em>/ {result.max}点</em>
            </div>
            <dl className="area-detail">
              <div>
                <dt>正答率</dt>
                <dd>{Math.round((result.score / result.max) * 100)}%</dd>
              </div>
              <div>
                <dt>かかった時間</dt>
                <dd>{formatElapsed(result.elapsedSeconds)}</dd>
              </div>
              {result.byViewpoint.map((row) => (
                <div key={row.key}>
                  <dt>{row.label}</dt>
                  <dd>
                    {row.correct}/{row.total}（{row.rate}%）
                  </dd>
                </div>
              ))}
            </dl>
            <div className="exam-score-actions">
              <button type="button" className="ghost" onClick={openAnother}>
                別の分野のテストを受ける
              </button>
              <span className="muted small">
                この結果は保存済みです。もう一方の分野のパスワードを入れると、そのテストが開きます。
              </span>
            </div>
          </div>

          <div className="dash-panel">
            <h3>難易度別</h3>
            <div className="level-bars">
              {result.byLevel.map((row) => (
                <div className="level-row" key={row.key}>
                  <span className={`level level-${row.key}`}>{row.label}</span>
                  <div className="bar-track">
                    <i style={{ width: `${row.rate}%` }} />
                  </div>
                  <b>{row.rate}%</b>
                  <em>
                    {row.correct}/{row.total}問
                  </em>
                </div>
              ))}
            </div>
          </div>

          <div className="dash-panel">
            <h3>単元別の正答</h3>
            <p className="muted small">正答率の低い単元から並べています。ここが立て直しの出発点です。</p>
            <div className="level-bars">
              {[...result.byLesson]
                .sort((a, b) => a.rate - b.rate)
                .map((row) => (
                  <div className="level-row" key={row.key}>
                    <span className="lesson-name">{row.label}</span>
                    <div className="bar-track">
                      <i
                        style={{ width: `${row.rate}%` }}
                        className={row.rate >= 80 ? "good" : row.rate >= 60 ? "warn" : "bad"}
                      />
                    </div>
                    <b>{row.rate}%</b>
                    <em>
                      {row.correct}/{row.total}問
                    </em>
                  </div>
                ))}
            </div>
          </div>

          <div className="dash-panel">
            <div className="dash-head">
              <h3>解答と解説</h3>
              <div className="tabs">
                <button className={reviewFilter === "wrong" ? "active" : ""} onClick={() => setReviewFilter("wrong")}>
                  間違えた問題だけ（{result.max - result.score}問）
                </button>
                <button className={reviewFilter === "all" ? "active" : ""} onClick={() => setReviewFilter("all")}>
                  全{result.max}問
                </button>
              </div>
            </div>
            {served
              .map((item, position) => ({ item, position }))
              .filter(({ item }) => reviewFilter === "all" || !result.answers[item.originalIndex].correct)
              .map(({ item, position }) => {
                const ans = result.answers[item.originalIndex];
                const myScreen = toScreenChoice(item, ans.picked);
                const correctScreen = toScreenChoice(item, item.question.answer);
                return (
                  <article className={`question exam-review ${ans.correct ? "ok" : "ng"}`} key={item.question.id}>
                    <h3>
                      <span className="exam-no">{position + 1}</span>
                      <span className={`level level-${item.question.level}`}>{item.question.level}</span>
                      <span className={`result-tag ${ans.correct ? "first" : "miss"}`}>
                        {ans.correct ? "正解（1点）" : ans.picked < 0 ? "未解答（0点）" : "不正解（0点）"}
                      </span>
                      {item.question.q}
                    </h3>
                    {item.question.source && <p className="source">出典: {item.question.source}</p>}
                    <div className="choices">
                      {item.choices.map((choice, ci) => (
                        <button
                          key={choice}
                          disabled
                          className={[
                            ci === correctScreen ? "correct" : "",
                            ci === myScreen && ci !== correctScreen ? "wrong" : ""
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {String.fromCharCode(65 + ci)}. {choice}
                          {ci === myScreen && <em className="pick-tag">あなたの答え</em>}
                        </button>
                      ))}
                    </div>
                    <div className="feedback">{item.question.explanation}</div>
                  </article>
                );
              })}
          </div>

          <div className="notice">
            この結果は成績ページに記録され、JSONにも出力されます。画面を閉じても残ります。
          </div>
        </>
      )}
    </section>
  );
}
