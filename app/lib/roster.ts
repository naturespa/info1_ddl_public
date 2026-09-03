// 使える4桁番号の名簿。
//
// ここに載っていない番号は入力できません。打ち間違いで、別の人の記録に
// 上書きしてしまう事故を防ぐためのものです。
//
//   各組 … 出席番号1〜41番（例: 1組なら 1101〜1141）＋ 予備の1つ
//   予備 … 1組から順に 88 / 77 / 88 / 77 … と交互
//   計   … 7組 × 42 ＝ 294
//
// 試し用（教員用）の4つは、名簿とは別に持っています。
//
// 番号を増やすとき（転入生など）は、下の EXTRA_SEATS か TEACHER_CODES に足してください。

export const CLASS_COUNT = 7;
/** 出席番号の範囲 */
export const SEAT_FROM = 1;
export const SEAT_TO = 41;
/** 組ごとの予備番号（下2けた）。1組から順に */
export const EXTRA_SEATS = [88, 77, 88, 77, 88, 77, 88];

/**
 * 教員用の番号。生徒には配りません。
 *
 *   0001〜0005 … 先生5名分。分野別テストでは「教員用の共通セット」が開きます
 *   3156 ほか  … 以前から使っている試し用。記録が消えないよう残してあります
 */
export const TEACHER_SEATS = ["0001", "0002", "0003", "0004", "0005"];

/**
 * デモ・動作確認用の番号。
 *
 * 研修や公開授業で、その場の人に画面を触ってもらうための番号です。
 *   ・入るときは教員用パスワードが必要（生徒が 8008 を見つけても入れない）
 *   ・触った記録はいっさい保存しない（再読み込みすれば、まっさらに戻る）
 *   ・分野別テストは、デモ専用の短いセット（20問・10分）が開く
 */
export const DEMO_CODE = "8008";

const LEGACY_TEACHER_CODES = ["3156", "0808", "8080"];
export const TEACHER_CODES = [...TEACHER_SEATS, DEMO_CODE, ...LEGACY_TEACHER_CODES];

/** デモ用の番号か */
export const isDemoCode = (code: string) => code === DEMO_CODE;

const build = () => {
  const list: string[] = [];
  for (let cls = 1; cls <= CLASS_COUNT; cls++) {
    for (let seat = SEAT_FROM; seat <= SEAT_TO; seat++) {
      list.push(String(1000 + cls * 100 + seat));
    }
    list.push(String(1000 + cls * 100 + EXTRA_SEATS[cls - 1]));
  }
  return list;
};

/** 生徒の番号（294個） */
export const studentCodes = build();

const studentSet = new Set(studentCodes);
const teacherSet = new Set(TEACHER_CODES);

export const isTeacherCode = (code: string) => teacherSet.has(code);
export const isStudentCode = (code: string) => studentSet.has(code);

/** その番号を使ってよいか */
export const isAllowedCode = (code: string) => studentSet.has(code) || teacherSet.has(code);

/** 画面に出す、その番号の読み方 */
export const describeCode = (code: string) => {
  if (code === DEMO_CODE) return "デモ・動作確認用の番号";
  if (teacherSet.has(code)) {
    const n = TEACHER_SEATS.indexOf(code);
    return n >= 0 ? `教員用の番号（${n + 1}人目）` : "試し用の番号です";
  }
  if (!studentSet.has(code)) return "";
  const grade = Number(code[0]);
  const cls = Number(code[1]);
  const seat = Number(code.slice(2));
  const extra = EXTRA_SEATS[cls - 1];
  return seat === extra ? `${grade}年${cls}組の予備の番号` : `${grade}年${cls}組${seat}番`;
};

/** 分野別テストで使う組。教員用の番号は、教員用セットが無いときだけ1組の問題を開く */
export const examClassOf = (code: string): number | null => {
  if (teacherSet.has(code)) return 1;
  if (!studentSet.has(code)) return null;
  const cls = Number(code[1]);
  return cls >= 1 && cls <= CLASS_COUNT ? cls : null;
};
