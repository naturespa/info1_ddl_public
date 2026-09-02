// 有料ヒントの一覧（34個）。
// 中身は出しません。「どの単元のどの実験にヒントがあるか」だけを持ちます。

export type HintEntry = {
  /** ヒント1つ1つを見分ける名前 */
  id: string;
  lessonId: string;
  /** 実験の番号（0始まり。最後は応用ミッション） */
  index: number;
  /** その実験の見出し */
  title: string;
  /** 実験のヒント／応用の表計算の「式を見る」／重要語句テストの「最初の1文字」 */
  kind: "実験" | "式" | "語句";
};

const experimentHints: HintEntry[] = [
  // v31: もともと常時表示だったヒントのうち、解き方を先に言っているものを有料にした12個
  { id: "feature-3-1", lessonId: "feature", index: 3, title: "情報量の単位と、必要なビット数", kind: "実験" },
  { id: "base-1-1", lessonId: "base", index: 1, title: "割り算をくり返して2進数にする", kind: "実験" },
  { id: "real-2-2", lessonId: "real", index: 2, title: "小数点をそろえてから、32ビットの浮動小数点に分解する", kind: "実験" },
  { id: "computer-2-1", lessonId: "computer", index: 2, title: "クロック周波数から命令の実行回数を求める", kind: "実験" },
  { id: "text-3-1", lessonId: "text", index: 3, title: "文字データ量を計算する", kind: "実験" },
  { id: "audio-2-1", lessonId: "audio", index: 2, title: "量子化：波の高さを段階に丸める", kind: "実験" },
  { id: "image-1-1", lessonId: "image", index: 1, title: "画素数と1画素のビット数から容量を求める", kind: "実験" },
  { id: "image-2-1", lessonId: "image", index: 2, title: "dpiから画素数を求める", kind: "実験" },
  { id: "spread-1-2", lessonId: "spread", index: 1, title: "偏差から分散・標準偏差を組み立てる", kind: "実験" },
  { id: "spread-2-2", lessonId: "spread", index: 2, title: "z得点と偏差値に直す", kind: "実験" },
  { id: "simulation-1-1", lessonId: "simulation", index: 1, title: "大数の法則を確かめる", kind: "実験" },
  { id: "test-4-1", lessonId: "test", index: 4, title: "カイ二乗検定で、割合の差を調べる", kind: "実験" },
  { id: "base-4-1", lessonId: "base", index: 4, title: "けたをずらす：0で埋めるシフトと、符号を残すシフト", kind: "実験" },
  { id: "negative-1-1", lessonId: "negative", index: 1, title: "1の補数から2の補数までを、ひと続きで作る", kind: "実験" },
  { id: "negative-2-1", lessonId: "negative", index: 2, title: "10進数を、マイナスも表せるビットの並びにする", kind: "実験" },
  { id: "real-2-1", lessonId: "real", index: 2, title: "小数点をそろえてから、32ビットの浮動小数点に分解する", kind: "実験" },
  { id: "logic-0-1", lessonId: "logic", index: 0, title: "7種類のゲートを、スイッチ・真理値表・電気回路の3つの見方で確かめる", kind: "実験" },
  { id: "logic-2-1", lessonId: "logic", index: 2, title: "半加算器と全加算器を組み立てて、ちがいを見る", kind: "実験" },
  { id: "computer-3-1", lessonId: "computer", index: 3, title: "記憶装置の速さと容量を比べる", kind: "実験" },
  { id: "text-1-1", lessonId: "text", index: 1, title: "符号化方式でバイト数を比べる", kind: "実験" },
  { id: "text-2-1", lessonId: "text", index: 2, title: "文字化けを再現する", kind: "実験" },
  { id: "audio-1-1", lessonId: "audio", index: 1, title: "標本化：一定間隔で波を測り、足りているかを確かめる", kind: "実験" },
  { id: "audio-4-1", lessonId: "audio", index: 4, title: "音質のプリセットを比べる", kind: "実験" },
  { id: "image-0-1", lessonId: "image", index: 0, title: "光の三原色と色の三原色を混ぜ比べる", kind: "実験" },
  { id: "image-3-1", lessonId: "image", index: 3, title: "ドット絵を描いて、色数・データ量・縮み方を見る", kind: "実験" },
  { id: "image-4-1", lessonId: "image", index: 4, title: "用途から画像形式を選ぶ", kind: "実験" },
  { id: "video-0-1", lessonId: "video", index: 0, title: "fpsを変えて動きの滑らかさを見る", kind: "実験" },
  { id: "video-1-1", lessonId: "video", index: 1, title: "非圧縮動画のデータ量を求める", kind: "実験" },
  { id: "video-3-1", lessonId: "video", index: 3, title: "転送にかかる時間を求める", kind: "実験" },
  { id: "compress-2-1", lessonId: "compress", index: 2, title: "ランレングス法で文字列を圧縮する", kind: "実験" },
  { id: "organize-1-1", lessonId: "organize", index: 1, title: "その数字、足し算していいの？", kind: "実験" },
  { id: "organize-2-1", lessonId: "organize", index: 2, title: "階級の幅を決めて、表と図をつくる", kind: "実験" },
  { id: "center-2-1", lessonId: "center", index: 2, title: "四分位数を求めて、箱ひげ図で2クラスを比べる", kind: "実験" },
  { id: "center-3-1", lessonId: "center", index: 3, title: "加重平均を求める", kind: "実験" },
  { id: "spread-1-1", lessonId: "spread", index: 1, title: "偏差から分散・標準偏差を組み立てる", kind: "実験" },
  { id: "spread-2-1", lessonId: "spread", index: 2, title: "z得点と偏差値に直す", kind: "実験" },
  { id: "normal-1-1", lessonId: "normal", index: 1, title: "μとσで山を動かし、その山の上で自分の位置を求める", kind: "実験" },
  { id: "relation-0-1", lessonId: "relation", index: 0, title: "散布図を描く", kind: "実験" },
  { id: "relation-2-1", lessonId: "relation", index: 2, title: "どんなデータでも −1〜1 で比べられるようにする", kind: "実験" },
  { id: "relation-4-1", lessonId: "relation", index: 4, title: "かげにひそむ本当の原因を探す", kind: "実験" },
  { id: "simulation-2-1", lessonId: "simulation", index: 2, title: "モンテカルロ法で円周率を求める", kind: "実験" },
  { id: "simulation-3-1", lessonId: "simulation", index: 3, title: "文化祭の受付を、計算できる形にしてみる", kind: "実験" },
  { id: "test-2-1", lessonId: "test", index: 2, title: "1つの平均が、ある値とちがうかを確かめる", kind: "実験" },
  { id: "test-3-1", lessonId: "test", index: 3, title: "2つの平均を比べる ― 同じ人か、ちがう人か", kind: "実験" },
  { id: "timeseries-0-1", lessonId: "timeseries", index: 0, title: "時系列データを、並べる→ならす→直線にする", kind: "実験" },
  { id: "timeseries-2-1", lessonId: "timeseries", index: 2, title: "AIへの依頼文を具体化する", kind: "実験" },
];

/** 応用ミッションの表計算で、見本の式を出すぶん（データ活用の8単元） */
const sheetHints: HintEntry[] = [
  { id: "sheet-organize-0", lessonId: "organize", index: -1, title: "表計算 1問目の式", kind: "式" },
  { id: "sheet-organize-1", lessonId: "organize", index: -1, title: "表計算 2問目の式", kind: "式" },
  { id: "sheet-organize-2", lessonId: "organize", index: -1, title: "表計算 3問目の式", kind: "式" },
  { id: "sheet-center-0", lessonId: "center", index: -1, title: "表計算 1問目の式", kind: "式" },
  { id: "sheet-center-1", lessonId: "center", index: -1, title: "表計算 2問目の式", kind: "式" },
  { id: "sheet-center-2", lessonId: "center", index: -1, title: "表計算 3問目の式", kind: "式" },
  { id: "sheet-center-3", lessonId: "center", index: -1, title: "表計算 4問目の式", kind: "式" },
  { id: "sheet-center-4", lessonId: "center", index: -1, title: "表計算 5問目の式", kind: "式" },
  { id: "sheet-spread-0", lessonId: "spread", index: -1, title: "表計算 1問目の式", kind: "式" },
  { id: "sheet-spread-1", lessonId: "spread", index: -1, title: "表計算 2問目の式", kind: "式" },
  { id: "sheet-spread-2", lessonId: "spread", index: -1, title: "表計算 3問目の式", kind: "式" },
  { id: "sheet-spread-3", lessonId: "spread", index: -1, title: "表計算 4問目の式", kind: "式" },
  { id: "sheet-normal-0", lessonId: "normal", index: -1, title: "表計算 1問目の式", kind: "式" },
  { id: "sheet-normal-1", lessonId: "normal", index: -1, title: "表計算 2問目の式", kind: "式" },
  { id: "sheet-normal-2", lessonId: "normal", index: -1, title: "表計算 3問目の式", kind: "式" },
  { id: "sheet-normal-3", lessonId: "normal", index: -1, title: "表計算 4問目の式", kind: "式" },
  { id: "sheet-relation-0", lessonId: "relation", index: -1, title: "表計算 1問目の式", kind: "式" },
  { id: "sheet-relation-1", lessonId: "relation", index: -1, title: "表計算 2問目の式", kind: "式" },
  { id: "sheet-relation-2", lessonId: "relation", index: -1, title: "表計算 3問目の式", kind: "式" },
  { id: "sheet-simulation-0", lessonId: "simulation", index: -1, title: "表計算 1問目の式", kind: "式" },
  { id: "sheet-simulation-1", lessonId: "simulation", index: -1, title: "表計算 2問目の式", kind: "式" },
  { id: "sheet-simulation-2", lessonId: "simulation", index: -1, title: "表計算 3問目の式", kind: "式" },
  { id: "sheet-test-0", lessonId: "test", index: -1, title: "表計算 1問目の式", kind: "式" },
  { id: "sheet-test-1", lessonId: "test", index: -1, title: "表計算 2問目の式", kind: "式" },
  { id: "sheet-test-2", lessonId: "test", index: -1, title: "表計算 3問目の式", kind: "式" },
  { id: "sheet-test-3", lessonId: "test", index: -1, title: "表計算 4問目の式", kind: "式" },
  { id: "sheet-timeseries-0", lessonId: "timeseries", index: -1, title: "表計算 1問目の式", kind: "式" },
  { id: "sheet-timeseries-1", lessonId: "timeseries", index: -1, title: "表計算 2問目の式", kind: "式" },
  { id: "sheet-timeseries-2", lessonId: "timeseries", index: -1, title: "表計算 3問目の式", kind: "式" },
  { id: "sheet-timeseries-3", lessonId: "timeseries", index: -1, title: "表計算 4問目の式", kind: "式" },
];

/** 重要語句テストの「最初の1文字」。単元ごとに1つ買うと、その単元の5語ぶん出る */
const wordHints: HintEntry[] = [
  { id: "word-feature", lessonId: "feature", index: -2, title: "重要語句の最初の1文字（5語ぶん）", kind: "語句" },
  { id: "word-base", lessonId: "base", index: -2, title: "重要語句の最初の1文字（5語ぶん）", kind: "語句" },
  { id: "word-negative", lessonId: "negative", index: -2, title: "重要語句の最初の1文字（5語ぶん）", kind: "語句" },
  { id: "word-real", lessonId: "real", index: -2, title: "重要語句の最初の1文字（5語ぶん）", kind: "語句" },
  { id: "word-logic", lessonId: "logic", index: -2, title: "重要語句の最初の1文字（5語ぶん）", kind: "語句" },
  { id: "word-computer", lessonId: "computer", index: -2, title: "重要語句の最初の1文字（5語ぶん）", kind: "語句" },
  { id: "word-text", lessonId: "text", index: -2, title: "重要語句の最初の1文字（5語ぶん）", kind: "語句" },
  { id: "word-audio", lessonId: "audio", index: -2, title: "重要語句の最初の1文字（5語ぶん）", kind: "語句" },
  { id: "word-image", lessonId: "image", index: -2, title: "重要語句の最初の1文字（5語ぶん）", kind: "語句" },
  { id: "word-video", lessonId: "video", index: -2, title: "重要語句の最初の1文字（5語ぶん）", kind: "語句" },
  { id: "word-compress", lessonId: "compress", index: -2, title: "重要語句の最初の1文字（5語ぶん）", kind: "語句" },
  { id: "word-organize", lessonId: "organize", index: -2, title: "重要語句の最初の1文字（5語ぶん）", kind: "語句" },
  { id: "word-center", lessonId: "center", index: -2, title: "重要語句の最初の1文字（5語ぶん）", kind: "語句" },
  { id: "word-spread", lessonId: "spread", index: -2, title: "重要語句の最初の1文字（5語ぶん）", kind: "語句" },
  { id: "word-normal", lessonId: "normal", index: -2, title: "重要語句の最初の1文字（5語ぶん）", kind: "語句" },
  { id: "word-relation", lessonId: "relation", index: -2, title: "重要語句の最初の1文字（5語ぶん）", kind: "語句" },
  { id: "word-simulation", lessonId: "simulation", index: -2, title: "重要語句の最初の1文字（5語ぶん）", kind: "語句" },
  { id: "word-test", lessonId: "test", index: -2, title: "重要語句の最初の1文字（5語ぶん）", kind: "語句" },
  { id: "word-timeseries", lessonId: "timeseries", index: -2, title: "重要語句の最初の1文字（5語ぶん）", kind: "語句" }
];

export const hintList: HintEntry[] = [...experimentHints, ...sheetHints, ...wordHints];

/** 表計算の式のぶんだけ取り出す */
export const sheetHintId = (lessonId: string, taskIndex: number) => `sheet-${lessonId}-${taskIndex}`;

/** 重要語句の「最初の1文字」のID */
export const wordHintId = (lessonId: string) => `word-${lessonId}`;
