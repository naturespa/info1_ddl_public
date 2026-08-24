// 有料ヒントの一覧（34個）。
// 中身は出しません。「どの単元のどの実験にヒントがあるか」だけを持ちます。

export type HintEntry = {
  /** 実験カードの中の HintButton につけた id */
  id: string;
  lessonId: string;
  /** 実験の番号（0始まり。最後は応用ミッション） */
  index: number;
  /** その実験の見出し */
  title: string;
};

export const hintList: HintEntry[] = [
  { id: "base-4-1", lessonId: "base", index: 4, title: "けたをずらす：0で埋めるシフトと、符号を残すシフト" },
  { id: "negative-1-1", lessonId: "negative", index: 1, title: "1の補数から2の補数までを、ひと続きで作る" },
  { id: "negative-2-1", lessonId: "negative", index: 2, title: "10進数を、マイナスも表せるビットの並びにする" },
  { id: "real-3-1", lessonId: "real", index: 3, title: "32ビットの浮動小数点に分解する" },
  { id: "logic-0-1", lessonId: "logic", index: 0, title: "7種類のゲートを、スイッチ・真理値表・電気回路の3つの見方で確かめる" },
  { id: "logic-2-1", lessonId: "logic", index: 2, title: "半加算器と全加算器を組み立てて、ちがいを見る" },
  { id: "computer-3-1", lessonId: "computer", index: 3, title: "記憶装置の速さと容量を比べる" },
  { id: "text-2-1", lessonId: "text", index: 2, title: "文字化けを再現する" },
  { id: "text-3-1", lessonId: "text", index: 3, title: "ビット数と表せる文字の種類" },
  { id: "audio-1-1", lessonId: "audio", index: 1, title: "標本化：一定間隔で波を測り、足りているかを確かめる" },
  { id: "audio-4-1", lessonId: "audio", index: 4, title: "音質のプリセットを比べる" },
  { id: "image-0-1", lessonId: "image", index: 0, title: "光の三原色と色の三原色を混ぜ比べる" },
  { id: "image-3-1", lessonId: "image", index: 3, title: "ドット絵を描いて、色数とデータ量の関係を見る" },
  { id: "image-4-1", lessonId: "image", index: 4, title: "用途から画像形式を選ぶ" },
  { id: "video-0-1", lessonId: "video", index: 0, title: "fpsを変えて動きの滑らかさを見る" },
  { id: "video-1-1", lessonId: "video", index: 1, title: "非圧縮動画のデータ量を求める" },
  { id: "video-3-1", lessonId: "video", index: 3, title: "転送にかかる時間を求める" },
  { id: "compress-2-1", lessonId: "compress", index: 2, title: "ランレングス法で文字列を圧縮する" },
  { id: "organize-1-1", lessonId: "organize", index: 1, title: "その数字、足し算していいの？" },
  { id: "organize-2-1", lessonId: "organize", index: 2, title: "階級の幅を決めて、表と図をつくる" },
  { id: "center-2-1", lessonId: "center", index: 2, title: "四分位数を求めて、箱ひげ図で2クラスを比べる" },
  { id: "center-3-1", lessonId: "center", index: 3, title: "加重平均を求める" },
  { id: "spread-1-1", lessonId: "spread", index: 1, title: "偏差から分散・標準偏差を組み立てる" },
  { id: "spread-2-1", lessonId: "spread", index: 2, title: "z得点を求める" },
  { id: "normal-1-1", lessonId: "normal", index: 1, title: "μとσで山を動かし、その山の上で自分の位置を求める" },
  { id: "relation-0-1", lessonId: "relation", index: 0, title: "散布図を描く" },
  { id: "relation-2-1", lessonId: "relation", index: 2, title: "どんなデータでも −1〜1 で比べられるようにする" },
  { id: "relation-4-1", lessonId: "relation", index: 4, title: "かげにひそむ本当の原因を探す" },
  { id: "simulation-2-1", lessonId: "simulation", index: 2, title: "モンテカルロ法で円周率を求める" },
  { id: "simulation-3-1", lessonId: "simulation", index: 3, title: "文化祭の受付を、計算できる形にしてみる" },
  { id: "test-2-1", lessonId: "test", index: 2, title: "1つの平均が、ある値とちがうかを確かめる" },
  { id: "test-3-1", lessonId: "test", index: 3, title: "2つの平均を比べる ― 同じ人か、ちがう人か" },
  { id: "timeseries-0-1", lessonId: "timeseries", index: 0, title: "時系列データを、並べる→ならす→直線にする" },
  { id: "timeseries-2-1", lessonId: "timeseries", index: 2, title: "AIへの依頼文を具体化する" },
];
