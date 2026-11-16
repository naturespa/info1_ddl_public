import type { ExamQuestion, ExamResult, ExamSet, Viewpoint } from "./exam-types";

/** 新版だけを識別する。既存65問・デジタル分野の配点や保存データには適用しない。 */
export const DATA95_SUFFIX = "-95-v1";
export const DATA95_MINUTES = 40;
export const DATA95_COUNT = 95;
export const DATA95_COUNTS: Record<Viewpoint, number> = { "知識・技能": 38, "思考・判断・表現": 57 };
export const DATA95_MAX: Record<Viewpoint, number> = { "知識・技能": 40, "思考・判断・表現": 60 };

export const isDataExam95 = (set: Pick<ExamSet, "area" | "setId">) =>
  set.area === "データ活用" && /^data-(?:c[1-7]-main|teacher|makeup-\d{4})-95-v1$/.test(set.setId);

export function validateDataExam95(set: ExamSet): void {
  if (!isDataExam95(set)) return;
  if (set.questions.length !== DATA95_COUNT) throw new Error("データ活用新版の問題数が95問ではありません。");
  const ids = new Set<string>();
  const counts: Record<Viewpoint, number> = { "知識・技能": 0, "思考・判断・表現": 0 };
  for (const q of set.questions) {
    if (q.area !== "データ活用" || !Object.hasOwn(counts, q.viewpoint) || ids.has(q.id) ||
        q.choices.length !== 4 || !Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) {
      throw new Error("データ活用新版の問題形式・観点・問題IDを確認してください。");
    }
    ids.add(q.id);
    counts[q.viewpoint] += 1;
  }
  if (counts["知識・技能"] !== 38 || counts["思考・判断・表現"] !== 57) {
    throw new Error("データ活用新版は知識・技能38問、思考・判断・表現57問で作成してください。");
  }
}

export const data95QuestionPoints = (q: ExamQuestion) => DATA95_MAX[q.viewpoint] / DATA95_COUNTS[q.viewpoint];
export const roundExamPoints = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000;
export const formatExamPoints = (n: number) => String(roundExamPoints(n));

/** 旧形式100問の除外条件は保ち、新版95問だけを追加で受け入れる。 */
export const isCurrentData95Result = (r: ExamResult) =>
  isDataExam95(r) && r.questionCount === 95 && r.answers?.length === 95 && r.max === 100;

/** 新版と旧版は別に保持。デジタルの既存の結果更新ルールはそのまま。 */
export function mergeExamResult(previous: ExamResult[], result: ExamResult): ExamResult[] {
  if (previous.some((r) => r.setId === result.setId && r.finishedAt === result.finishedAt)) return previous;
  return [...previous.filter((r) => {
    if (isDataExam95(r) || isDataExam95(result)) return r.setId !== result.setId;
    return !(r.area === result.area && r.kind === result.kind);
  }), result].sort((a, b) =>
    a.area === b.area ? a.kind.localeCompare(b.kind) : a.area.localeCompare(b.area)
  );
}
