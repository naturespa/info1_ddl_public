// テストを受けるときの処理。
//
//  ・出題順と選択肢の順を、生徒の4桁番号で並べ替える（隣の画面を見ても写せない）
//  ・答えはすぐ「もとの選択肢番号」に直して記録する（集計のときに順番を気にしなくてよい）
//  ・採点は1問1点。単元別・観点別・難易度別の内訳も出す

import { seededRandom } from "./calc";
import { lessonById } from "./lessons";
import { seedFrom } from "./exam-types";
import type { ExamAnswer, ExamBreakdown, ExamQuestion, ExamResult, ExamSet, Viewpoint } from "./exam-types";
import type { QuestionLevel } from "./types";

/** 生徒の画面に出す1問。もとの位置と選択肢の対応を持ち歩く */
export type ServedQuestion = {
  question: ExamQuestion;
  /** もとのセットでの位置（0始まり）。集計と先生の確認では必ずこちらを使う */
  originalIndex: number;
  /** 画面に出す並びの選択肢 */
  choices: string[];
  /** 画面の位置 → もとの選択肢番号 */
  choiceMap: number[];
};

const shuffleIndexes = (count: number, rng: () => number) => {
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
};

/**
 * 出題順と選択肢の順を、生徒ごとに並べ替える。
 * 同じ生徒・同じセットなら必ず同じ並びになるので、
 * 途中でブラウザを閉じても続きから同じ画面に戻れる。
 */
export const serveForStudent = (set: ExamSet, studentCode: string): ServedQuestion[] => {
  const base = seedFrom(`${set.setId}:${studentCode}`);
  const order = shuffleIndexes(set.questions.length, seededRandom(base));
  return order.map((originalIndex, position) => {
    const question = set.questions[originalIndex];
    const map = shuffleIndexes(question.choices.length, seededRandom(base ^ seedFrom(`c${position}`)));
    return {
      question,
      originalIndex,
      choices: map.map((i) => question.choices[i]),
      choiceMap: map
    };
  });
};

/** 画面で選んだ位置を、もとの選択肢番号に直す */
export const toOriginalChoice = (served: ServedQuestion, screenIndex: number) =>
  screenIndex < 0 ? -1 : served.choiceMap[screenIndex];

/** もとの選択肢番号を、その生徒の画面での位置に直す（解説表示で使う） */
export const toScreenChoice = (served: ServedQuestion, originalIndex: number) =>
  originalIndex < 0 ? -1 : served.choiceMap.indexOf(originalIndex);

const rate = (correct: number, total: number) => (total ? Math.round((correct / total) * 100) : 0);

const tally = <T extends string>(
  questions: ExamQuestion[],
  answers: ExamAnswer[],
  keyOf: (q: ExamQuestion) => T,
  labelOf: (key: T) => string
): ExamBreakdown[] => {
  const map = new Map<T, { correct: number; total: number }>();
  questions.forEach((q, i) => {
    const key = keyOf(q);
    const cur = map.get(key) ?? { correct: 0, total: 0 };
    cur.total += 1;
    if (answers[i]?.correct) cur.correct += 1;
    map.set(key, cur);
  });
  return [...map.entries()]
    .map(([key, v]) => ({ key, label: labelOf(key), correct: v.correct, total: v.total, rate: rate(v.correct, v.total) }))
    .sort((a, b) => a.key.localeCompare(b.key));
};

/**
 * 採点する。
 * picked は「もとの選択肢番号」の配列で、セットの並び順（originalIndex順）にそろえてあること。
 */
export const gradeExam = (
  set: ExamSet,
  picked: number[],
  startedAt: string,
  finishedAt: string
): ExamResult => {
  const answers: ExamAnswer[] = set.questions.map((q, i) => {
    const p = picked[i] ?? -1;
    return { picked: p, correct: p === q.answer };
  });
  const score = answers.filter((a) => a.correct).length;
  const elapsed = Math.max(0, Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000));
  return {
    setId: set.setId,
    area: set.area,
    classNo: set.classNo,
    kind: set.kind,
    score,
    max: set.questions.length,
    answers,
    byLesson: tally(
      set.questions,
      answers,
      (q) => q.lessonId,
      (key) => {
        const lesson = lessonById(key);
        return lesson ? `${lesson.no} ${lesson.title}` : key;
      }
    ),
    byViewpoint: tally(set.questions, answers, (q) => q.viewpoint as Viewpoint, (k) => k),
    byLevel: tally(set.questions, answers, (q) => q.level as QuestionLevel, (k) => k),
    startedAt,
    finishedAt,
    elapsedSeconds: elapsed
  };
};

/** 秒を「12分34秒」の形にする */
export const formatElapsed = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m}分${s}秒` : `${s}秒`;
};

/* ============================================================
 * 途中保存
 * ========================================================== */

export const examStorageKey = (studentCode: string, setId: string) => `joho-ddl-exam:${studentCode}:${setId}`;

export type ExamProgress = {
  setId: string;
  studentCode: string;
  /** もとの並び順（originalIndex順）での選択。未解答は -1 */
  picked: number[];
  startedAt: string;
  /** 提出済みなら結果も持つ */
  result?: ExamResult;
};

export const loadProgress = (studentCode: string, setId: string): ExamProgress | null => {
  try {
    const raw = localStorage.getItem(examStorageKey(studentCode, setId));
    return raw ? (JSON.parse(raw) as ExamProgress) : null;
  } catch {
    return null;
  }
};

export const saveProgress = (progress: ExamProgress) => {
  try {
    localStorage.setItem(examStorageKey(progress.studentCode, progress.setId), JSON.stringify(progress));
  } catch {
    /* 保存できない環境では黙って続行する */
  }
};
