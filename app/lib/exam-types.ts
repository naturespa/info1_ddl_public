// 分野別テストの型定義
//
// 1セットは 65問・100点満点。
//   知識・技能 30問 × 1点 ＝ 30点
//   思考・判断・表現 35問 × 2点 ＝ 70点
// 普段の学習の200点とは完全に別に扱う。

import type { Area, QuestionLevel } from "./types";

/** 観点。1セット65問を 知識・技能30問／思考・判断・表現35問 に配分する */
export type Viewpoint = "知識・技能" | "思考・判断・表現";

/** 本試験か追試か */
export type ExamKind = "本試験" | "追試" | "教員用" | "デモ";

/** クラス。4桁番号の2桁目（1年2組05番なら "1205" → 2組） */
export type ClassNo = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const CLASS_NUMBERS: ClassNo[] = [1, 2, 3, 4, 5, 6, 7];

/** 文字列から数値の種を作る（同じ文字列なら必ず同じ種になる。FNV-1a） */
export const seedFrom = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 1;
};

/** 4桁番号からクラスを取り出す。規則は 学年1桁＋組1桁＋出席番号2桁 */
export const classOf = (studentCode: string): ClassNo | null => {
  const digit = Number(studentCode[1]);
  return CLASS_NUMBERS.includes(digit as ClassNo) ? (digit as ClassNo) : null;
};

/** 4桁番号から学年を取り出す */
export const gradeOf = (studentCode: string): number | null => {
  const digit = Number(studentCode[0]);
  return Number.isFinite(digit) && digit >= 1 && digit <= 3 ? digit : null;
};

/** 4桁番号から出席番号を取り出す */
export const seatOf = (studentCode: string): number | null => {
  const seat = Number(studentCode.slice(2));
  return Number.isFinite(seat) ? seat : null;
};

/** 出題される1問。生成されたものも、IPA過去問も、同じ形にそろえる */
export type ExamQuestion = {
  /** 問題の識別子。自動生成は "gen:base-dec2bin:3" のようにテンプレートと種を含む */
  id: string;
  /** どちらの分野の問題か */
  area: Area;
  /** 出題元の単元ID（lessons の id）。集計で単元別の内訳を出すのに使う */
  lessonId: string;
  /** 問題文 */
  q: string;
  choices: string[];
  /** 正解の選択肢番号（0始まり） */
  answer: number;
  /** 解説。直後に表示する */
  explanation: string;
  level: QuestionLevel;
  viewpoint: Viewpoint;
  /**
   * この1問の配点。知識・技能は1点、思考・判断・表現は2点。
   * 入っていない古いファイルは1点として扱う。
   */
  points?: number;
  /** IPA過去問などの出典。自動生成・オリジナルは undefined */
  source?: string;
  /** 自動生成なら true。集計とデバッグ用 */
  generated?: boolean;
};

/** 1つの分野・1クラス・本試験／追試／教員用／デモ、に対応する1セット */
export type ExamSet = {
  /** 例: "digital-c3-main"。JSONにそのまま出す */
  setId: string;
  area: Area;
  classNo: ClassNo;
  kind: ExamKind;
  /** 本試験なら65問。教員用も65問、デモは13問 */
  questions: ExamQuestion[];
};

/** 生徒の解答。部分点はなく、正解ならその問題の配点がまるごと入る */
export type ExamAnswer = {
  /** 選んだ選択肢番号。未解答は -1 */
  picked: number;
  /** 正解したか */
  correct: boolean;
};

/** 単元別・観点別・難易度別の内訳 */
export type ExamBreakdown = {
  key: string;
  label: string;
  /** 正解した問題数 */
  correct: number;
  /** 出題された問題数 */
  total: number;
  /** 正答率（％）。問題数で計算する */
  rate: number;
  /** 得点（配点の合計） */
  points: number;
  /** その区分の満点 */
  maxPoints: number;
};

/** 受験結果。1回の受験につき1つ */
export type ExamResult = {
  setId: string;
  area: Area;
  classNo: ClassNo;
  kind: ExamKind;
  /** 得点。正解した問題の配点の合計（知識1点・思考2点） */
  score: number;
  /** 満点。全問の配点の合計 */
  max: number;
  /** 正解した問題数 */
  correctCount: number;
  /** 出題された問題数 */
  questionCount: number;
  answers: ExamAnswer[];
  /** 単元別の正答 */
  byLesson: ExamBreakdown[];
  /** 観点別の正答 */
  byViewpoint: ExamBreakdown[];
  /** 難易度別の正答 */
  byLevel: ExamBreakdown[];
  startedAt: string;
  finishedAt: string;
  /** 所要時間（秒） */
  elapsedSeconds: number;
};

/** 暗号化して配布する1ファイルぶんの中身 */
export type EncryptedBundle = {
  /** 何のセットか（復号しなくても分かってよい情報だけ） */
  setId: string;
  area: Area;
  classNo: ClassNo;
  kind: ExamKind;
  /**
   * 制限時間（分）。生成キットの --minutes で先生が決める。
   * 古いファイルには入っていないので、無いときは既定の45分として扱う。
   */
  minutes?: number;
  /** PBKDF2 の塩（base64） */
  salt: string;
  /** AES-GCM の初期化ベクトル（base64） */
  iv: string;
  /** 暗号文（base64）。復号すると ExamQuestion[] のJSONになる */
  data: string;
  /** PBKDF2 の繰り返し回数 */
  iterations: number;
};
