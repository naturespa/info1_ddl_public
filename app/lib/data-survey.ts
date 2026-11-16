/** 得点・Gとは独立した、データ活用新版の学習ふり返り。 */
export type DataSurvey = {
  version: 1;
  viewed: boolean;
  answers: Record<string, string | string[]>;
  updatedAt: string;
  submittedAt?: string;
};

export const CONFIDENCE_ITEMS = [
  "データの特徴に応じて、平均値と中央値を使い分けることができる。",
  "平均値だけでなく、ばらつきを使って集団の特徴を比べることができる。",
  "「相関があること」と「原因であること」の違いを説明できる。",
  "調べたいことに応じて、データを整理・分析する方法を選ぶことができる。",
  "シミュレーションの結果を考えるとき、設定した条件や試行回数に注意できる。",
  "AIなどが示した分析結果を、元データや別の計算で確かめることができる。"
] as const;

export const HELPFUL_OPTIONS = [
  "操作して確かめる実験", "表計算の練習", "確認問題と解説", "重要語句の学習", "ヒント", "解き直し",
  "G・レベルなどの仕組み", "ステータスでの学習状況の確認", "先生の説明", "友達との相談",
  "特に役立ったものはなかった", "十分に利用していない"
] as const;
export const DIFFICULTY_OPTIONS = [
  "文章・説明", "計算", "操作", "課題量", "時間", "端末・通信", "どこから取り組むか", "その他", "特に困らなかった"
] as const;

export const newDataSurvey = (): DataSurvey => ({ version: 1, viewed: false, answers: {}, updatedAt: new Date().toISOString() });

export function toggleSurveyChoice(current: string[], choice: string, options: readonly string[], max: number, exclusive: readonly string[]): string[] {
  const clean = current.filter((value) => options.includes(value));
  if (!options.includes(choice)) return clean;
  if (clean.includes(choice)) return clean.filter((value) => value !== choice);
  if (exclusive.includes(choice)) return [choice];
  const next = clean.filter((value) => !exclusive.includes(value));
  return next.length < max ? [...next, choice] : next;
}

export const surveyResponseCount = (survey: DataSurvey) => Object.entries(survey.answers)
  .filter(([key, value]) => /^q(?:[1-9]|1[0-4])(?:_before|_now|_note)?$/.test(key) &&
    (Array.isArray(value) ? value.length > 0 : value.trim().length > 0)).length;
