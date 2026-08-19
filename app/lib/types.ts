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

export type Mission = {
  title: string;
  body: string;
  checks: string[];
};

export type Area = "デジタル" | "データ活用";

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
  questions: Question[];
};

export type Submission = {
  answers: number[];
  correct: number;
  submittedAt: string;
};

export type Done = Record<string, boolean>;

export type Perspective = {
  /** 知識・技能：確認問題の正答率 */
  knowledge: number;
  /** 思考・判断・表現：実験の実施率 */
  thinking: number;
};

export type StudentRecord = {
  version: 2;
  exportedAt?: string;
  studentCode: string;
  drafts: Record<string, number[]>;
  submissions: Record<string, Submission>;
  experiments: Record<string, boolean>;
  summary: {
    totalScore: number;
    perspective: Perspective;
    quizCorrect: number;
    quizMax: number;
    experimentDone: number;
    experimentMax: number;
    completedLessons: number;
    lessonCount: number;
  };
};
