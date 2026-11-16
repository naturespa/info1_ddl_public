// 分野別テストの型定義
// デジタル分野100問・100点、データ活用分野100問・100点。普段の学習の200点とは完全に別に扱う。

import type { Area, QuestionLevel } from "./types";

/** 観点。100問全体で 知識・技能60問／思考・判断・表現40問 になるように配分する */
export type Viewpoint = "知識・技能" | "思考・判断・表現";

/** 観点ごとの配点。65問（知識30＋思考35）で 30 + 70 = 100点 */
export const VIEWPOINT_POINTS: Record<Viewpoint, number> = { "知識・技能": 1, "思考・判断・表現": 2 };

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
  /** IPA過去問などの出典。自動生成・オリジナルは undefined */
  source?: string;
  /** 自動生成なら true。集計とデバッグ用 */
  generated?: boolean;
  /** 配点。知識・技能1点、思考・判断・表現2点。古いファイルには無いので観点から決める */
  points?: number;
};

/** 1つの分野・1クラス・本試験か追試か、に対応する100問のまとまり */
export type ExamSet = {
  /** 例: "digital-c3-main"。JSONにそのまま出す */
  setId: string;
  area: Area;
  classNo: ClassNo;
  kind: ExamKind;
  /** 100問 */
  questions: ExamQuestion[];
};

/** 生徒の解答。1問1点、部分点なし */
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
  /** 問題数 */
  total: number;
  /** 得点（配点の合計） */
  points: number;
  /** 満点（配点の合計） */
  maxPoints: number;
  /** 得点率（％） */
  rate: number;
};

/** アンケートの「分野について」5問ぶん（デジタル・データ活用で同じ形） */
export type SurveyAreaAnswer = {
  /** ① 理解度：1（ほとんど理解できなかった）〜5（よく理解できた） */
  understand: number | null;
  /** ② むずかしかった単元（単元ID、3つまで）。「特になかった」は ["none"] */
  hard: string[];
  /** ③ よく分かった・面白かった単元（単元ID、3つまで）。「特になかった」は ["none"] */
  good: string[];
  /** ④ テストの難しさ：1（とても易しかった）〜5（とても難しかった） */
  difficulty: number | null;
  /** ⑤ テストの時間：1（かなり余った）〜3（ちょうどよかった）〜5（まったく足りなかった） */
  time: number | null;
};

/**
 * テストのあとのアンケート（データ活用分野の提出後に出す。全24問）。得点・G・成績には一切使わない。
 * 選ぶ質問はすべて必須、自由に書く欄だけ任意。
 * 集計するときは、「判断できない／機会がなかった」（0）を0点として数えないこと。
 *
 *   Q1〜Q5   digital        デジタル分野について
 *   Q6〜Q10  data           データ活用分野について
 *   Q11〜Q16 before / now   できるようになったこと（学ぶ前を振り返った自分／現在の自分）
 *   Q17 interest　Q18 useData　Q19 recheck　Q20 pace　Q21 helpful　Q22 trouble（＋troubleNote）
 *   Q23 found（＋foundBefore・foundNow）　Q24 topic（＋topicNote）
 */
export type ExamSurvey = {
  version: 2;
  /** 送った時刻（ISO） */
  answeredAt: string;
  digital: SurveyAreaAnswer;
  data: SurveyAreaAnswer;
  /** Q11〜Q16「学ぶ前を振り返った自分」。1〜5、0＝判断できない */
  before: (number | null)[];
  /** Q11〜Q16「現在の自分」。値の意味は before と同じ */
  now: (number | null)[];
  /** Q17・Q18：1（あてはまらない）〜5（あてはまる） */
  interest: number | null;
  useData: number | null;
  /** Q19：1（一度もなかった）〜4（何度もあった）、0＝機会がなかった */
  recheck: number | null;
  /** Q20：1〜5、0＝判断できない */
  pace: number | null;
  /** Q21：役立ったもの（3つまで） */
  helpful: string[];
  /** Q22：困ったこと */
  trouble: string[];
  troubleNote: string;
  /** Q23：「へぇ」と思ったこと */
  found: string[];
  foundBefore: string;
  foundNow: string;
  /** Q24：調べてみたい分野（1つ）と、その疑問 */
  topic: string;
  topicNote: string;
};

/** 受験結果。1回の受験につき1つ */
export type ExamResult = {
  setId: string;
  area: Area;
  classNo: ClassNo;
  kind: ExamKind;
  /** 得点＝配点の合計。満点は max（100点） */
  score: number;
  max: number;
  correctCount: number;
  /** 問題数（65問） */
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
  /** テスト後のアンケート。出していない分野・まだ答えていないときは無い */
  survey?: ExamSurvey;
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
   * 古いファイルには入っていないので、無いときは既定の50分として扱う。
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
