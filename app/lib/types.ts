// 情報I Digital & Data Lab - 型定義
// 岡田メソッドExcelシート（兵庫県立明石南高等学校 岡田）の章立てに対応

export type QuestionLevel = "基礎" | "共通テスト" | "ITパスポート" | "基本情報";

export type Question = {
  id: string;
  q: string;
  choices: string[];
  answer: number;
  explanation: string;
  level: QuestionLevel;
  /** IPA過去問などの出典。オリジナル問題は undefined */
  source?: string;
};

export type Term = {
  word: string;
  meaning: string;
};

export type MissionStep = {
  /** 図解カードの見出し */
  label: string;
  /** その手順で何をするか */
  detail: string;
};

export type Mission = {
  title: string;
  body: string;
  /** 応用ミッションの手順を図解するための3ステップ */
  steps: MissionStep[];
};

export type Area = "デジタル" | "データ活用";

/** つまずいたときの立て直し方。ダッシュボードの弱点カードに表示する */
export type Remedy = {
  /** この単元でつまずく人に共通する原因 */
  stumble: string;
  /** 何をすれば理解できるようになるか（順番に3つ） */
  actions: string[];
};

export type Lesson = {
  id: string;
  no: string;
  area: Area;
  title: string;
  subtitle: string;
  concepts: string[];
  /** 教科書の該当ページ（Excelシートの記載に対応） */
  textbook: string;
  /** 学習時間の目安（分） */
  minutes: number;
  /** 用語集（赤シート学習に対応する重要語句） */
  terms: Term[];
  /** 「〜を理解する◯つのステップ」 */
  steps: string[];
  /** 実験ごとの理論解説。配列の長さ＝実験数 */
  theory: string[];
  /** 応用ミッション（実験の最後に配置） */
  mission: Mission;
  /** 正答率が低かったときに表示する学び直しの手順 */
  remedy: Remedy;
  questions: Question[];
};

/** 1問ごとの最終結果。Excelで集計しやすいように日本語のまま出力する */
export type QuestionResult = "1回目で正解" | "2回目で正解" | "不正解" | "2回目待ち";

export type Submission = {
  /** 1回目に選んだ選択肢の番号（0始まり） */
  answers: number[];
  /** 2回目に選んだ選択肢の番号。1回目が正解、またはまだ挑戦していない場合は -1 */
  retries: number[];
  /** 1回目で正解した問題数 */
  correct: number;
  /** 2回目で正解した問題数 */
  secondCorrect: number;
  /** 得点。1回目正解＝1点、2回目正解＝0.5点、不正解＝0点 */
  score: number;
  /** 問題ごとの結果 */
  results: QuestionResult[];
  submittedAt: string;
  /** 最後に2回目の解答をした時刻 */
  retriedAt?: string;
};

export type Done = Record<string, boolean>;

export type Perspective = {
  /** 知識・技能：確認問題の正答率 */
  knowledge: number;
  /** 思考・判断・表現：実験の実施率 */
  thinking: number;
};

/** 分野ごとの成績。デジタル分野・データ活用分野をそれぞれ100点満点で出す */
export type AreaScore = {
  area: Area;
  /** その分野の総合点（100点満点） */
  totalScore: number;
  perspective: Perspective;
  /** 確認問題の素点（0.5刻み） */
  quizScore: number;
  /** その分野の確認問題数＝満点 */
  quizMax: number;
  firstCorrect: number;
  secondCorrect: number;
  experimentDone: number;
  experimentMax: number;
  completedLessons: number;
  lessonCount: number;
};

export type Summary = {
  /** 総合点。デジタル分野100点＋データ活用分野100点の合計 */
  totalScore: number;
  /** 総合点の満点（分野数×100） */
  totalMax: number;
  /** 全体を1つとみなしたときの観点別の到達度（％） */
  perspective: Perspective;
  /** 確認問題の素点（1回目正解＝1点、2回目正解＝0.5点） */
  quizScore: number;
  /** 1回目で正解した問題数 */
  quizCorrect: number;
  /** 2回目で正解した問題数 */
  quizSecondCorrect: number;
  quizMax: number;
  experimentDone: number;
  experimentMax: number;
  completedLessons: number;
  lessonCount: number;
  /** 分野ごとの成績（それぞれ100点満点） */
  areas: AreaScore[];
};

/** 成績処理に必要な最低限だけを取り出した、分野別テストの1行 */
export type ExamRow = {
  studentCode: string;
  grade: number | null;
  classNo: number | null;
  seat: number | null;
  area: Area;
  kind: string;
  setId: string;
  score: number;
  max: number;
  rate: number;
  knowledge: string;
  thinking: string;
  startedAt: string;
  finishedAt: string;
  elapsedSeconds: number;
};

export type StudentRecord = {
  version: 4;
  exportedAt?: string;
  studentCode: string;
  drafts: Record<string, number[]>;
  submissions: Record<string, Submission>;
  experiments: Record<string, boolean>;
  summary: Summary;
  /** 分野別テストの結果。成績処理はまずこの exams を見れば足りる */
  exams: ExamRow[];
  /** 分野別テストの詳細（単元別・観点別・問題ごとの正誤） */
  examDetails: unknown[];
};
