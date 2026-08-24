// 重要語句テスト95語。各単元5語。
//
// ・問題文（clue）は、各単元の用語集の「意味」と同じ文です。
// ・alt は「打ち方がちがっても正解にする表記」。全角半角・英字の大小・長音・スペースは
//   照合の前に自動でそろえるので、ここには書きません。

import type { Area } from "./types";

export type WordItem = {
  /** 単元ID */
  lessonId: string;
  /** 正解（この文字列を打てば必ず正解）*/
  answer: string;
  /** 問題文。この意味を読んで語句を入力させる */
  clue: string;
  /** 正解あつかいにする別表記 */
  alt: string[];
};

export const WORDS_PER_LESSON = 5;

export const words: WordItem[] = [
  /* ---------- D0 アナログとデジタル ---------- */
  { lessonId: "feature", answer: "量子化", clue: "標本化で得られた信号の大きさを、離散的な値で近似的に表すこと。", alt: [] },
  { lessonId: "feature", answer: "ビット", clue: "情報量の最小単位。2進法の1けた分にあたり、2種類の情報を表せる。", alt: ["bit"] },
  { lessonId: "feature", answer: "DX", clue: "デジタル技術で、社会やビジネスの仕組みを根本から作り変えること。", alt: ["デジタルトランスフォーメーション"] },
  { lessonId: "feature", answer: "教師なし学習", clue: "正解を与えず、データ自身の構造や分類を見つけさせる方法。", alt: ["教師無し学習"] },
  { lessonId: "feature", answer: "人間中心のAI原則", clue: "人間の尊厳と多様性を尊重しながら、AIの便益を社会全体で受け取るための基本原則。", alt: ["人間中心のAI社会原則"] },
  /* ---------- D1 基数変換・2進加算・シフト演算 ---------- */
  { lessonId: "base", answer: "基数変換", clue: "ある基数で書かれた数を、別の基数の表記に書き換えること。値そのものは変わらない。", alt: ["基数の変換"] },
  { lessonId: "base", answer: "シフト演算", clue: "ビット列を左（けたを増やす）または右（けたを減らす）へずらす操作。", alt: ["シフト"] },
  { lessonId: "base", answer: "右シフト", clue: "1けた右へずらすと値は1/2になる。あふれ出たビットは捨てられる。", alt: ["右シフト演算"] },
  { lessonId: "base", answer: "論理シフト", clue: "符号なしのデータを扱う。空いたビットには必ず0が入る。", alt: ["論理シフト演算"] },
  { lessonId: "base", answer: "オーバーフロー", clue: "決められたけた数で表せる範囲を超えてしまうこと。", alt: ["けたあふれ", "桁あふれ", "overflow"] },
  /* ---------- D2 負の数の表現（補数） ---------- */
  { lessonId: "negative", answer: "補数", clue: "ある数に足すと、けたが1つ上がる（きりのよい数になる）値。コンピュータ内部で負の数を表すのに使う。", alt: [] },
  { lessonId: "negative", answer: "2の補数", clue: "1の補数に1を足した値。これが2進数での負数の表現になる。", alt: ["二の補数", "2の補数表現"] },
  { lessonId: "negative", answer: "符号ビット", clue: "符号ありのデータで、いちばん左のビット。0なら正、1なら負を表す。", alt: ["サインビット"] },
  { lessonId: "negative", answer: "符号付き整数", clue: "8ビットなら -128〜+127 の256個を表せる。正より負が1つ多い。", alt: ["符号付整数", "符号つき整数", "符号あり整数"] },
  { lessonId: "negative", answer: "アンダーフロー", clue: "表せる範囲の下限を下回ってしまうこと。オーバーフローの反対。", alt: ["underflow"] },
  /* ---------- D3 実数の表現（固定小数点・浮動小数点） ---------- */
  { lessonId: "real", answer: "実数", clue: "整数だけでなく、小数を含む数のこと。コンピュータでは固定小数点や浮動小数点の方式で表す。", alt: ["実数型"] },
  { lessonId: "real", answer: "浮動小数点", clue: "小数点の位置を動かして、大きい数から小さい数まで扱えるようにした方式。", alt: ["浮動小数点数", "浮動小数点方式"] },
  { lessonId: "real", answer: "符号部", clue: "32ビット形式のいちばん左1ビット。正なら0、負なら1。", alt: ["符号部分"] },
  { lessonId: "real", answer: "仮数部", clue: "残りの23ビット。正規化した 1.xxxx の小数点以下をそのまま入れる。", alt: ["仮数部分"] },
  { lessonId: "real", answer: "正規化", clue: "仮数部の最上位けたが0以外になるように、小数点の位置をそろえる操作。", alt: [] },
  /* ---------- D4 論理回路と加算器 ---------- */
  { lessonId: "logic", answer: "論理和回路", clue: "2つの入力のどちらかが1なら出力が1になる。並列スイッチと同じ動き。", alt: ["OR", "OR回路", "論理和"] },
  { lessonId: "logic", answer: "否定論理積回路", clue: "ANDの出力を反転したもの。2つとも1のときだけ0。", alt: ["NAND", "NAND回路", "否定論理積"] },
  { lessonId: "logic", answer: "真理値表", clue: "入力のすべての組み合わせと、そのときの出力を並べた表。", alt: [] },
  { lessonId: "logic", answer: "半加算器", clue: "1けたの2進数2つを足し、和Sとくり上がりCを出す。XORとANDで作れる。", alt: ["半加算回路"] },
  { lessonId: "logic", answer: "全加算器", clue: "下のけたからのくり上がりCiも含めて3つを足す。半加算器2つとORで作れる。", alt: ["全加算回路"] },
  /* ---------- D5 コンピュータの構成と動作 ---------- */
  { lessonId: "computer", answer: "ハードウェア", clue: "機械そのもの。入力・出力・記憶・演算・制御を行う装置の集合体。", alt: ["ハードウエア", "ハード"] },
  { lessonId: "computer", answer: "演算装置", clue: "計算や判断の処理に特化した装置。ALUともいう。", alt: ["演算部", "ALU"] },
  { lessonId: "computer", answer: "OS", clue: "基本ソフトウェア。機械を動かすためのプログラム集団。", alt: ["オペレーティングシステム", "基本ソフトウェア", "基本ソフト", "オーエス"] },
  { lessonId: "computer", answer: "キャッシュメモリ", clue: "CPUと主記憶の間にある、小容量・超高速の記憶場所。", alt: ["キャッシュ"] },
  { lessonId: "computer", answer: "プログラムカウンタ", clue: "次に取り出す命令が主記憶のどの番地にあるかを指定するレジスタ。", alt: ["プログラムカウンター", "プログラムレジスタ"] },
  /* ---------- D6 文字の表現と圧縮 ---------- */
  { lessonId: "text", answer: "ASCIIコード", clue: "アメリカで作られ、7ビット（最大128文字）で英数字と記号を表す。", alt: ["ASCII", "アスキーコード", "アスキー"] },
  { lessonId: "text", answer: "Unicode", clue: "世界中の文字を1つ（Uni）のコード体系にまとめた文字集合。", alt: ["ユニコード"] },
  { lessonId: "text", answer: "文字化け", clue: "保存時と読込時の文字コードが違うために、別の文字として解釈されてしまう現象。", alt: [] },
  { lessonId: "text", answer: "非可逆圧縮", clue: "多少の情報を捨てる代わりに圧縮効率を高めた方式。JPEG、MP3など。", alt: ["不可逆圧縮", "非可逆"] },
  { lessonId: "text", answer: "プロポーショナルフォント", clue: "文字ごとに文字幅が異なるフォント。読みやすさを優先する。", alt: ["プロポーショナル"] },
  /* ---------- D7 音声の表現（デジタル化） ---------- */
  { lessonId: "audio", answer: "周波数", clue: "1秒間に含まれる波の数。単位はHz。多いほど高い音になる。", alt: [] },
  { lessonId: "audio", answer: "標本化定理", clue: "元の波に含まれる最も高い周波数の2倍以上で測れば、元の波を再現できるという定理。", alt: ["サンプリング定理", "ナイキストの定理"] },
  { lessonId: "audio", answer: "標本化", clue: "一定の時間間隔で波の高さを測ること。単位はHz。", alt: ["サンプリング", "sampling"] },
  { lessonId: "audio", answer: "符号化", clue: "量子化した値を0と1の2進数に変換すること。", alt: ["コーディング", "エンコード", "coding"] },
  { lessonId: "audio", answer: "PCM", clue: "パルス符号変調。標本化→量子化→符号化の一連の方式。", alt: ["パルス符号変調"] },
  /* ---------- D8 画像の表現（デジタル化） ---------- */
  { lessonId: "image", answer: "色の三原色", clue: "プリンタで使う シアン(C)・マゼンタ(M)・イエロー(Y)。混ぜるほど暗くなる（減法混色）。", alt: ["色の3原色", "CMY"] },
  { lessonId: "image", answer: "総画素数", clue: "縦の画素数 × 横の画素数。", alt: ["画素数"] },
  { lessonId: "image", answer: "ラスタ形式", clue: "画素の集まりで表す形式（ペイント系）。拡大するとジャギーが目立つ。", alt: ["ラスター形式", "ラスタ", "ビットマップ形式", "ラスタ画像"] },
  { lessonId: "image", answer: "ジャギー", clue: "ラスタ画像を拡大したときに見えるギザギザ。", alt: [] },
  { lessonId: "image", answer: "補色", clue: "色相環でキーカラーから180度反対に位置する色。", alt: [] },
  /* ---------- D9 動画の表現と通信 ---------- */
  { lessonId: "video", answer: "fps", clue: "frames per second。1秒間に表示されるコマ数。映画24、地デジ29.97、YouTube30〜60。", alt: ["フレームレート", "フレーム毎秒"] },
  { lessonId: "video", answer: "残像現象", clue: "目に残る像の性質。連続した静止画が動いて見えるのはこの働きによる。", alt: ["残像"] },
  { lessonId: "video", answer: "コーデック", clue: "一定の規則に従って符号化・復号を行うソフトウェア。H.264、MPEG-4、AACなど。", alt: ["codec"] },
  { lessonId: "video", answer: "ストリーミング", clue: "すべてをダウンロードし終える前に、一部を読み込んだ段階から再生を始める方式。", alt: ["ストリーミング配信"] },
  { lessonId: "video", answer: "帯域幅", clue: "1秒間に送れるデータ量。bps（bit per second）で表す。", alt: ["バンド幅", "帯域"] },
  /* ---------- D10 データの圧縮 ---------- */
  { lessonId: "compress", answer: "展開", clue: "可逆圧縮されたデータをもとのデータに戻すこと。伸張・解凍とも呼ぶ。", alt: ["伸張", "伸長", "解凍", "復元"] },
  { lessonId: "compress", answer: "可逆圧縮", clue: "もとのデータと完全に同じデータへ戻せる圧縮。圧縮率は非可逆より低い。ZIP、PNG、GIF、FLACなど。", alt: ["可逆"] },
  { lessonId: "compress", answer: "圧縮率", clue: "圧縮後のデータ量 ÷ 圧縮前のデータ量 × 100。小さいほどよく縮んでいる。", alt: [] },
  { lessonId: "compress", answer: "ハフマン符号化", clue: "出現頻度の高いデータを短いビット列に、低いデータを長いビット列に割り当てる可逆圧縮の方法。", alt: ["ハフマン法", "ハフマン符号", "ハフマン"] },
  { lessonId: "compress", answer: "ZIP", clue: "複数のファイルを1つにまとめ、圧縮して格納するファイル形式。", alt: ["ジップ"] },
  /* ---------- A1 データの種類と度数分布 ---------- */
  { lessonId: "organize", answer: "推測統計", clue: "一部（標本）から全体（母集団）を推定する方法。推定・検定・回帰分析など。", alt: ["推計統計", "推測統計学"] },
  { lessonId: "organize", answer: "質的データ", clue: "血液型や好き嫌いのように、数字で測れない分類のデータ。", alt: ["定性データ", "カテゴリデータ"] },
  { lessonId: "organize", answer: "間隔尺度", clue: "差に意味があるが、0が量のゼロではない。気温（℃）など。", alt: [] },
  { lessonId: "organize", answer: "ヒストグラム", clue: "度数分布表を柱状グラフで表したもの。長方形の面積が度数に比例する。", alt: ["柱状グラフ", "度数分布図"] },
  { lessonId: "organize", answer: "データクレンジング", clue: "欠損値や外れ値を確認し、品質を高める処理。", alt: ["クレンジング", "データクリーニング"] },
  /* ---------- A2 代表値と四分位数 ---------- */
  { lessonId: "center", answer: "中央値", clue: "小さい順に並べたときの中央の値。順位で決まるため外れ値に強い。", alt: ["メジアン", "メディアン"] },
  { lessonId: "center", answer: "幾何平均", clue: "変化率の平均。すべての比をかけて、個数乗根をとる。売上の平均伸び率など。", alt: ["相乗平均"] },
  { lessonId: "center", answer: "四分位数", clue: "小さい順に並べたデータを4等分する位置の値。Q1・Q2・Q3。", alt: [] },
  { lessonId: "center", answer: "四分位範囲", clue: "Q3 − Q1。中央の50%がどれだけ広がっているかを表す。", alt: ["IQR"] },
  { lessonId: "center", answer: "箱ひげ図", clue: "五数要約を1つの図に表したもの。複数のデータを同時に比べられる。", alt: ["箱ヒゲ図", "ボックスプロット"] },
  /* ---------- A3 分散・標準偏差と偏差値 ---------- */
  { lessonId: "spread", answer: "偏差", clue: "各データの値と平均値の差。プラスとマイナスがあり、合計すると必ず0になる。", alt: [] },
  { lessonId: "spread", answer: "分散", clue: "偏差を2乗した値の平均。ばらつきの大きさを表す。VAR.P関数。", alt: [] },
  { lessonId: "spread", answer: "標準偏差", clue: "分散の正の平方根。元のデータと同じ単位でばらつきを表せる。STDEV.P関数。", alt: ["SD"] },
  { lessonId: "spread", answer: "母集団", clue: "統計の対象となるすべての集合。", alt: [] },
  { lessonId: "spread", answer: "標本", clue: "母集団から抽出された一部の集団。", alt: ["サンプル"] },
  /* ---------- A4 確率分布と正規分布 ---------- */
  { lessonId: "normal", answer: "期待値", clue: "多数回繰り返したときに得られる平均値。E(X)=μ。", alt: [] },
  { lessonId: "normal", answer: "正規分布", clue: "試行回数を増やすと現れる、左右対称の釣り鐘型の分布。", alt: [] },
  { lessonId: "normal", answer: "母平均", clue: "母集団分布の中心位置を示す母数。ミューと読む。", alt: ["μ", "ミュー"] },
  { lessonId: "normal", answer: "母標準偏差", clue: "母集団のばらつき具合を示す母数。シグマと読む。", alt: ["σ", "シグマ"] },
  { lessonId: "normal", answer: "確率密度関数", clue: "正規分布のカーブそのもの。面積が確率を表す。Excelでは NORM.DIST(..., FALSE)。", alt: ["確率密度"] },
  /* ---------- A5 相関・回帰と因果関係 ---------- */
  { lessonId: "relation", answer: "散布図", clue: "縦軸と横軸に2つの量的変数をとり、データを点で打った図。", alt: [] },
  { lessonId: "relation", answer: "共分散", clue: "xの偏差とyの偏差をかけた値（偏差積）の平均。2つの量が同じ方向に動くかを表す。", alt: [] },
  { lessonId: "relation", answer: "回帰分析", clue: "複数の系列のデータの間に成り立つ関係を、関数を使って表現する手法。", alt: ["回帰"] },
  { lessonId: "relation", answer: "因果関係", clue: "一方が原因となって他方が結果として生じる関係。相関があるだけでは証明できない。", alt: [] },
  { lessonId: "relation", answer: "交絡要因", clue: "2つの変数の背後にあって、両方に影響を与えている第三の要因。", alt: ["交絡因子", "第三の変数"] },
  /* ---------- A6 乱数とシミュレーション ---------- */
  { lessonId: "simulation", answer: "乱数", clue: "0から9までの数字が不規則かつ等確率に現れるように並べたもの。", alt: [] },
  { lessonId: "simulation", answer: "RAND関数", clue: "Excelで0以上1未満の実数をランダムに発生させる関数。", alt: ["RAND"] },
  { lessonId: "simulation", answer: "相対度数", clue: "ある結果が出た回数 ÷ 試行回数。試行を増やすと理論上の確率に近づく。", alt: [] },
  { lessonId: "simulation", answer: "モンテカルロ法", clue: "乱数を使って多数回の試行を行い、問題を近似的に解く方法。", alt: ["モンテカルロ"] },
  { lessonId: "simulation", answer: "モデル", clue: "シミュレーションを行うために、現実を単純化して、計算できる形にしたもの。置いた仮定の範囲でのみ意味を持つ。", alt: [] },
  /* ---------- A7 仮説検定と区間推定 ---------- */
  { lessonId: "test", answer: "検定", clue: "母集団に立てた仮説が正しいかどうかを、標本から判定する手段。", alt: ["仮説検定", "統計的仮説検定"] },
  { lessonId: "test", answer: "帰無仮説", clue: "「差がない」「偶然である」とみなす、現状維持の側の仮説。", alt: ["H0"] },
  { lessonId: "test", answer: "p値", clue: "帰無仮説が正しいとしたときに、観測された結果以上に極端な結果が出る確率。", alt: ["P値", "ピー値"] },
  { lessonId: "test", answer: "棄却限界値", clue: "有意水準に対応して、検定統計量の分布から定まる臨界値。", alt: ["棄却限界", "臨界値"] },
  { lessonId: "test", answer: "信頼区間", clue: "母平均を含んでいるであろう範囲。95%信頼区間が一般的。", alt: [] },
  /* ---------- A8 時系列データとAIによる分析 ---------- */
  { lessonId: "timeseries", answer: "トレンド", clue: "長期的な増減の傾向。", alt: ["傾向", "趨勢"] },
  { lessonId: "timeseries", answer: "不規則変動", clue: "トレンドでも季節性でも説明できない、短期的な揺れ。", alt: ["不規則な変動"] },
  { lessonId: "timeseries", answer: "移動平均", clue: "近い期間の平均をとって、短期的な上下をならす方法。", alt: [] },
  { lessonId: "timeseries", answer: "ハルシネーション", clue: "生成AIが事実と異なる、もっともらしい回答を作ってしまう現象。", alt: ["幻覚", "hallucination"] },
  { lessonId: "timeseries", answer: "エビデンス", clue: "結論の根拠として残す記録。使ったデータ、手順、判定基準を含む。", alt: ["根拠"] },
];

/** その単元の5語 */
export const wordsOf = (lessonId: string) => words.filter((w) => w.lessonId === lessonId);

/** 分野ごとの語数 */
export const wordCountOf = (area: Area, lessonArea: (id: string) => Area | undefined) =>
  words.filter((w) => lessonArea(w.lessonId) === area).length;
