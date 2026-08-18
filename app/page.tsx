"use client";

import { useEffect, useMemo, useState } from "react";

type Question = {
  id: string;
  q: string;
  choices: string[];
  answer: number;
  explanation: string;
};

type Lesson = {
  id: string;
  no: string;
  area: "デジタル" | "データ活用";
  title: string;
  subtitle: string;
  concepts: string[];
  questions: Question[];
};

type Submission = {
  answers: number[];
  correct: number;
  submittedAt: string;
};
type Done = Record<string, boolean>;
type Gate = "NOT" | "AND" | "OR" | "NAND" | "NOR" | "XOR" | "XNOR";

type StudentRecord = {
  version: 1;
  exportedAt?: string;
  studentCode: string;
  drafts: Record<string, number[]>;
  submissions: Record<string, Submission>;
  experiments: Record<string, boolean>;
  reflection: string;
  summary: {
    totalScore: number;
    quizCorrect: number;
    quizMax: number;
    completedLessons: number;
    lessonCount: number;
  };
};

const STORAGE_PREFIX = "joho-ddl-public-v1:";

const q = (id: string, text: string, choices: string[], answer: number, explanation: string): Question => ({
  id,
  q: text,
  choices,
  answer,
  explanation
});

const fmt = (value: number, digits = 1) =>
  Number.isFinite(value) ? value.toLocaleString("ja-JP", { maximumFractionDigits: digits }) : "-";

const stats = (raw: string) => {
  const values = raw.split(/[\s,、]+/).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!values.length) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const median = values.length % 2 ? values[(values.length - 1) / 2] : (values[values.length / 2 - 1] + values[values.length / 2]) / 2;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return { values, mean, median, sd: Math.sqrt(variance), min: values[0], max: values.at(-1)! };
};

const gateOutput = (gate: Gate, a: boolean, b: boolean) => {
  if (gate === "NOT") return !a;
  if (gate === "AND") return a && b;
  if (gate === "OR") return a || b;
  if (gate === "NAND") return !(a && b);
  if (gate === "NOR") return !(a || b);
  if (gate === "XOR") return a !== b;
  return a === b;
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const lessons: Lesson[] = [
  {
    id: "base",
    no: "D1",
    area: "デジタル",
    title: "基数と情報量",
    subtitle: "2進数・10進数・16進数と、1〜128ビットの表現範囲をつなげる。",
    concepts: ["ビット", "バイト", "基数変換", "2のn乗"],
    questions: [
      q("base-1", "10進数の13を2進数で表すと？", ["1011", "1101", "1110", "1111"], 1, "13=8+4+1なので1101です。"),
      q("base-2", "2進数101101を10進数で表すと？", ["35", "43", "45", "53"], 2, "32+8+4+1=45です。"),
      q("base-3", "16進数2Fを10進数で表すと？", ["31", "47", "52", "215"], 1, "2×16+15=47です。"),
      q("base-4", "全角20文字を1文字2バイトで記録すると何バイトか。", ["10", "20", "40", "160"], 2, "2バイト×20文字=40バイトです。"),
      q("base-5", "2進数4桁を16進数1桁で表せる理由は？", ["2の4乗が16通りだから", "4×2が8通りだから", "16÷2が8通りだから", "10進数の1桁も16通りだから"], 0, "4ビットは16通りで、16進数1桁と対応します。")
    ]
  },
  {
    id: "number",
    no: "D2",
    area: "デジタル",
    title: "整数・実数の表現",
    subtitle: "補数、オーバーフロー、浮動小数点数の誤差を実験する。",
    concepts: ["2の補数", "オーバーフロー", "浮動小数点"],
    questions: [
      q("number-1", "8ビット符号付き整数の範囲は？", ["-255〜255", "-128〜127", "-127〜128", "0〜255"], 1, "8ビットでは-2^7〜2^7-1です。"),
      q("number-2", "8ビットで-5を2の補数で表すと？", ["00000101", "11111010", "11111011", "10000101"], 2, "5を反転して1を加えます。"),
      q("number-3", "127に1を加えて表現範囲を超える現象は？", ["オーバーフロー", "文字化け", "標本化", "圧縮"], 0, "表現できる最大値を超えることです。"),
      q("number-4", "0.1+0.2がぴったり0.3にならない主な理由は？", ["丸め誤差", "文字コード", "主記憶不足", "通信速度"], 0, "2進数で有限桁にできない小数があります。"),
      q("number-5", "金額計算で誤差を避けやすい扱いは？", ["円単位の整数で扱う", "必ず小数で扱う", "文字列にして足す", "画像として保存する"], 0, "最小単位の整数にすると誤差を避けやすくなります。")
    ]
  },
  {
    id: "logic",
    no: "D3",
    area: "デジタル",
    title: "論理演算と論理回路",
    subtitle: "NOT・AND・OR・NAND・NOR・XOR・XNORを操作する。",
    concepts: ["真理値表", "論理演算", "論理回路"],
    questions: [
      q("logic-1", "A=1、B=0のときANDの出力は？", ["0", "1", "不定", "2"], 0, "ANDは両方が1のときだけ1です。"),
      q("logic-2", "A=1、B=0のときXORの出力は？", ["0", "1", "不定", "-1"], 1, "XORは入力が異なるとき1です。"),
      q("logic-3", "ANDの出力を反転するゲートは？", ["NOR", "NAND", "XNOR", "OR"], 1, "NANDはNOT ANDです。"),
      q("logic-4", "社員証があり、かつ暗証番号が一致したら扉を開ける演算は？", ["AND", "OR", "XOR", "NOT"], 0, "両方の条件が必要なのでANDです。"),
      q("logic-5", "会員または招待状ありなら入場可にする演算は？", ["AND", "OR", "XOR", "NAND"], 1, "少なくとも一方が真なら真なのでORです。")
    ]
  },
  {
    id: "computer",
    no: "D4",
    area: "デジタル",
    title: "コンピュータの構成",
    subtitle: "五大装置、CPU、主記憶、補助記憶の役割と性能を判断する。",
    concepts: ["五大装置", "CPU", "RAM", "SSD"],
    questions: [
      q("computer-1", "五大装置に含まれないものは？", ["入力装置", "演算装置", "通信装置", "記憶装置"], 2, "五大装置は入力・出力・記憶・演算・制御です。"),
      q("computer-2", "実行中のデータを一時的に置く装置は？", ["RAM", "SSD", "キーボード", "ディスプレイ"], 0, "RAMは主記憶装置です。"),
      q("computer-3", "電源を切ってもデータが残るものは？", ["CPUレジスタ", "RAM", "SSD", "キャッシュ"], 2, "SSDは補助記憶装置です。"),
      q("computer-4", "CPUと主記憶の速度差を埋める高速記憶は？", ["キャッシュメモリ", "磁気テープ", "光学ディスク", "USBケーブル"], 0, "キャッシュメモリはCPU近くにあります。"),
      q("computer-5", "複数プログラムを切り替えて同時に見せるOS機能は？", ["マルチタスク", "フォーマット", "圧縮", "暗号化"], 0, "CPU時間を分けて実行します。")
    ]
  },
  {
    id: "text",
    no: "D5",
    area: "デジタル",
    title: "文字のデジタル化",
    subtitle: "文字コード、Unicode、UTF-8と文字化けの原因を確かめる。",
    concepts: ["文字コード", "Unicode", "UTF-8", "文字化け"],
    questions: [
      q("text-1", "文字と数値の対応を定めたものは？", ["文字コード", "標本化", "画素", "論理回路"], 0, "文字コードは文字と数値の対応です。"),
      q("text-2", "世界中の文字を統一的に扱う文字集合は？", ["ASCIIだけ", "Unicode", "JPEG", "WAV"], 1, "Unicodeは多言語を扱えます。"),
      q("text-3", "文字化けの主な原因は？", ["保存時と読込時の文字コード不一致", "画面が小さい", "CPUが速い", "音声圧縮"], 0, "違う方式で読むと別の文字に見えます。"),
      q("text-4", "CSVの日本語だけが文字化けしたとき最初に確認するものは？", ["文字コード", "解像度", "CPU", "圧縮率"], 0, "UTF-8やShift_JISを確認します。"),
      q("text-5", "Webで基本にしやすい文字コードは？", ["UTF-8", "JPEG", "MP3", "SQL"], 0, "WebではUTF-8が広く使われます。")
    ]
  },
  {
    id: "audio",
    no: "D6",
    area: "デジタル",
    title: "音声のデジタル化",
    subtitle: "標本化・量子化・符号化と、音質・容量の関係を計算する。",
    concepts: ["標本化", "量子化", "符号化", "非圧縮容量"],
    questions: [
      q("audio-1", "連続した音を一定間隔で測定する処理は？", ["標本化", "量子化", "符号化", "暗号化"], 0, "一定間隔で値を取ります。"),
      q("audio-2", "振幅を段階的な数値へ割り当てる処理は？", ["標本化", "量子化", "復号", "圧縮"], 1, "値を有限段階へ丸めます。"),
      q("audio-3", "標本化周波数を高くすると一般にどうなる？", ["高い周波数まで表現しやすい", "必ず容量が減る", "色が増える", "文字化けする"], 0, "時間方向を細かく測定できます。"),
      q("audio-4", "PCM方式の処理順序は？", ["標本化→量子化→符号化", "量子化→標本化→復号", "符号化→暗号化→標本化", "圧縮→標本化→量子化"], 0, "音を測り、丸め、2進数にします。"),
      q("audio-5", "44.1kHz、16bit、ステレオ、1秒の概算は？", ["約176kB", "約88kB", "約44kB", "約1.4kB"], 0, "44100×16×2÷8=176400バイトです。")
    ]
  },
  {
    id: "image",
    no: "D7",
    area: "デジタル",
    title: "画像のデジタル化",
    subtitle: "画素、解像度、階調、RGB、可逆・非可逆圧縮を使い分ける。",
    concepts: ["画素", "解像度", "RGB", "PNG", "JPEG"],
    questions: [
      q("image-1", "デジタル画像の最小単位は？", ["画素", "標本", "文字", "フレーム率"], 0, "画像は画素の集まりです。"),
      q("image-2", "24ビットカラーで表せる色数は？", ["24色", "256色", "約6万色", "約1677万色"], 3, "2^24色です。"),
      q("image-3", "写真を小さくWeb掲載する用途に向く形式は？", ["JPEG", "WAV", "TXT", "CSV"], 0, "JPEGは写真の非可逆圧縮に向きます。"),
      q("image-4", "透過ロゴに向く形式は？", ["PNG", "JPEG", "MP3", "MPEG"], 0, "PNGは透過と可逆圧縮に対応します。"),
      q("image-5", "800×600画素、24bitの非圧縮容量は約何MBか。", ["0.48", "1.44", "11.52", "14.40"], 1, "800×600×24÷8=1,440,000バイトです。")
    ]
  },
  {
    id: "video",
    no: "D8",
    area: "デジタル",
    title: "動画・圧縮・通信",
    subtitle: "動画の容量を見積もり、通信速度から転送時間を求める。",
    concepts: ["fps", "解像度", "圧縮", "Mbps"],
    questions: [
      q("video-1", "30fpsの意味は？", ["1秒に30画面", "30秒に1画面", "1画面30ビット", "30MB/秒"], 0, "fpsは1秒あたりのフレーム数です。"),
      q("video-2", "動画圧縮で重複を省く目的は？", ["容量を減らす", "文字を増やす", "CPUを止める", "画素を必ず増やす"], 0, "同じ見た目を少ないデータで表します。"),
      q("video-3", "Mbpsの小文字bは？", ["byte", "bit", "binary file", "band"], 1, "小文字bはbitです。"),
      q("video-4", "実効80Mbpsで800Mbitを送る時間は？", ["8秒", "10秒", "12.5秒", "80秒"], 1, "800÷80=10秒です。"),
      q("video-5", "通信状況に応じて画質を変える配信技術の目的は？", ["再生停止を減らす", "全動画を非圧縮にする", "常に最大画質にする", "音声を消す"], 0, "帯域に合わせてビットレートを変えます。")
    ]
  },
  {
    id: "clean",
    no: "A1",
    area: "データ活用",
    title: "データの種類と整理",
    subtitle: "量的・質的データ、欠損値、外れ値、重複を正しく扱う。",
    concepts: ["尺度", "欠損値", "外れ値", "重複"],
    questions: [
      q("clean-1", "身長cmはどの種類のデータ？", ["量的データ", "質的データ", "文字コード", "論理値だけ"], 0, "数値の差や比に意味があります。"),
      q("clean-2", "血液型はどの尺度？", ["比率尺度", "名義尺度", "間隔尺度", "連続量"], 1, "順序のない分類です。"),
      q("clean-3", "欠損値処理で最初にすべきことは？", ["原因と件数を確認する", "すべて0にする", "無条件に削除する", "必ず平均に置換する"], 0, "理由や偏りを確認します。"),
      q("clean-4", "表記ゆれで二重登録された顧客データの処理は？", ["表記を統一して統合する", "全削除する", "売上を0にする", "列順だけ変える"], 0, "名寄せして重複を統合します。"),
      q("clean-5", "一意に行を識別する項目は？", ["主キー", "外部キー", "ビュー", "インデント"], 0, "主キーは各行を一意に識別します。")
    ]
  },
  {
    id: "center",
    no: "A2",
    area: "データ活用",
    title: "代表値と四分位数",
    subtitle: "平均値・中央値・最頻値・四分位数・箱ひげ図を使い分ける。",
    concepts: ["平均", "中央値", "最頻値", "箱ひげ図"],
    questions: [
      q("center-1", "2,3,3,4,8の平均値は？", ["3", "4", "5", "20"], 1, "合計20を5で割ります。"),
      q("center-2", "2,3,3,4,100の中央値は？", ["3", "4", "22.4", "100"], 0, "並べた中央の値です。"),
      q("center-3", "外れ値の影響を受けにくい代表値は？", ["平均値", "中央値", "合計", "範囲"], 1, "中央値は順位で決まります。"),
      q("center-4", "極端に高い年収が1人いるとき典型を示しやすい値は？", ["中央値", "平均値", "最大値", "範囲"], 0, "外れ値がある場合は中央値が有効です。"),
      q("center-5", "分布を比較しやすいグラフは？", ["箱ひげ図", "円グラフ", "レーダーチャート", "ガントチャート"], 0, "中央値や四分位数を比較できます。")
    ]
  },
  {
    id: "spread",
    no: "A3",
    area: "データ活用",
    title: "ばらつき・正規分布・偏差値",
    subtitle: "分散、標準偏差、正規分布、標準化を一つの流れで理解する。",
    concepts: ["分散", "標準偏差", "z得点", "偏差値"],
    questions: [
      q("spread-1", "標準偏差が大きいデータの特徴は？", ["ばらつきが大きい", "平均が必ず高い", "件数が多い", "外れ値がない"], 0, "平均からの散らばりが大きい状態です。"),
      q("spread-2", "標準偏差と分散の関係は？", ["標準偏差は分散の平方根", "分散は平均の2倍", "同じもの", "無関係"], 0, "分散の平方根が標準偏差です。"),
      q("spread-3", "z得点の式は？", ["(値-平均)÷標準偏差", "値÷平均", "平均÷値", "値+標準偏差"], 0, "平均との差を標準偏差で割ります。"),
      q("spread-4", "標準偏差が小さい工程は？", ["重量のばらつきが小さい", "製品数が必ず多い", "平均が大きい", "不良品がゼロ"], 0, "値が平均付近に集まりやすいです。"),
      q("spread-5", "平均60、標準偏差10で80点の偏差値は？", ["20", "50", "70", "80"], 2, "z=2、偏差値=50+10×2=70です。")
    ]
  },
  {
    id: "relation",
    no: "A4",
    area: "データ活用",
    title: "相関・回帰・因果関係",
    subtitle: "散布図と相関係数を読み、言い過ぎない分析を行う。",
    concepts: ["散布図", "相関係数", "回帰", "因果"],
    questions: [
      q("relation-1", "相関係数rの範囲は？", ["0〜1", "-1〜1", "-100〜100", "0以上のみ"], 1, "-1から1の範囲です。"),
      q("relation-2", "rが-0.9に近いときは？", ["強い負の相関", "強い正の相関", "相関なし", "因果確定"], 0, "一方が増えると他方が減る傾向が強いです。"),
      q("relation-3", "強い相関から必ず言えることは？", ["因果関係がある", "一方が原因", "関連する傾向がある", "第三の要因はない"], 2, "相関だけで原因は断定できません。"),
      q("relation-4", "広告費と売上に強い正の相関。直ちに断定できないものは？", ["広告費を増やせば必ず売上が増える", "同じ方向に動く傾向", "相関係数が正", "追加調査が必要"], 0, "相関は因果を直接証明しません。"),
      q("relation-5", "二つの量的変数の関係を見るグラフは？", ["散布図", "円グラフ", "パレート図", "ガントチャート"], 0, "横軸と縦軸に値を取り点を打ちます。")
    ]
  },
  {
    id: "simulation",
    no: "A5",
    area: "データ活用",
    title: "確率とシミュレーション",
    subtitle: "乱数実験を繰り返し、理論値と実験値の違いを確かめる。",
    concepts: ["乱数", "試行", "相対度数", "モデル"],
    questions: [
      q("simulation-1", "公平なコインで表が出る理論上の確率は？", ["0", "0.25", "0.5", "1"], 2, "表と裏が同様に確からしいため1/2です。"),
      q("simulation-2", "試行回数を増やすと相対度数は一般にどうなる？", ["理論値に近づく", "必ず0になる", "必ず1になる", "毎回同じ"], 0, "大数の法則によります。"),
      q("simulation-3", "シミュレーションの利点は？", ["困難な試行も仮想的に繰り返せる", "必ず未来を当てる", "仮定が不要", "データが不要"], 0, "条件を置いて多数回試せます。"),
      q("simulation-4", "乱数で多数回試行する方法は？", ["モンテカルロ法", "デジタル署名", "正規化", "ブレーンストーミング"], 0, "乱数を使った多数回試行です。"),
      q("simulation-5", "信頼性を高める対応は？", ["前提を明示し実データと照合する", "都合のよい1回だけ採用", "入力条件を記録しない", "必ず現実と一致とみなす"], 0, "モデルの妥当性を確認します。")
    ]
  },
  {
    id: "test",
    no: "A6",
    area: "データ活用",
    title: "仮説検定",
    subtitle: "Z検定・t検定・カイ二乗検定とp値の意味を判断する。",
    concepts: ["帰無仮説", "有意水準", "p値", "検定"],
    questions: [
      q("test-1", "検定で最初に置く『差がない』仮説は？", ["帰無仮説", "対立仮説", "因果仮説", "回帰仮説"], 0, "帰無仮説を置いて検討します。"),
      q("test-2", "有意水準5%、p=0.03の判断は？", ["帰無仮説を棄却", "必ず帰無仮説が正しい", "差は絶対に大きい", "分析不能"], 0, "p値が0.05未満です。"),
      q("test-3", "p値が小さい意味は？", ["帰無仮説の下では得にくい結果", "効果が必ず大きい", "結論が100%正しい", "データに誤りがない"], 0, "帰無仮説のもとで珍しい結果です。"),
      q("test-4", "A/Bテストで『購入率に差はない』は？", ["帰無仮説", "対立仮説", "作業仮説", "因果モデル"], 0, "差がないという仮説です。"),
      q("test-5", "p=0.02、有意水準5%の判断は？", ["帰無仮説を棄却する", "帰無仮説が証明された", "効果が必ず大きい", "誤りがないと証明"], 0, "0.02は0.05未満です。")
    ]
  },
  {
    id: "timeseries",
    no: "A7",
    area: "データ活用",
    title: "時系列データ",
    subtitle: "時間順の変化を読み、移動平均で短期的な揺れをならす。",
    concepts: ["時系列", "トレンド", "季節性", "移動平均"],
    questions: [
      q("timeseries-1", "時間の順に記録されたデータは？", ["時系列データ", "名義尺度", "文字コード", "真理値表"], 0, "時間順に並ぶデータです。"),
      q("timeseries-2", "長期的な増減傾向は？", ["トレンド", "欠損", "量子化", "論理和"], 0, "長期的な方向性です。"),
      q("timeseries-3", "一定周期で繰り返す変動は？", ["季節性", "外れ値だけ", "標準化", "符号化"], 0, "曜日や季節の影響です。"),
      q("timeseries-4", "細かな上下をならす方法は？", ["移動平均", "排他的論理和", "暗号化", "文字コード変換"], 0, "近接期間の平均を取ります。"),
      q("timeseries-5", "前年同月の売上を重視する理由は？", ["季節変動の影響を受けやすいから", "主キーが同じだから", "常に正規分布だから", "文字コードが一致するから"], 0, "季節性を考えるためです。")
    ]
  },
  {
    id: "ai",
    no: "A8",
    area: "データ活用",
    title: "AI分析の検証",
    subtitle: "AIを分析補助に使い、根拠・再現性・言い過ぎを人が確認する。",
    concepts: ["プロンプト", "検算", "根拠", "個人情報"],
    questions: [
      q("ai-1", "AIに分析を依頼するとき重要な指示は？", ["目的・列・条件を具体化", "短く分析してだけ", "結論を先に決める", "元データを確認しない"], 0, "目的や制約を具体化します。"),
      q("ai-2", "AIが出した平均値の扱いは？", ["表計算などで再計算", "そのまま確定", "根拠を削除", "データを公開"], 0, "別手段で検算します。"),
      q("ai-3", "相関からAIが原因と断定したら？", ["第三の要因や設計を確認", "必ず正しい", "相関係数を隠す", "データ件数を減らす"], 0, "因果を断定しない確認が必要です。"),
      q("ai-4", "事実と異なるもっともらしい回答を生成する現象は？", ["ハルシネーション", "オプトイン", "署名", "スワッピング"], 0, "生成AIの誤回答の一種です。"),
      q("ai-5", "AIへデータを入れる前の適切な対応は？", ["規程を確認し不要な個人情報を除く", "氏名住所を追加する", "検証を省く", "無条件に公開する"], 0, "データを最小化し、取扱条件を確認します。")
    ]
  }
];

const normalizeStudentCode = (value: string) =>
  value
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[^0-9]/g, "")
    .slice(0, 4);

const todayNumber = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
};

function Experiment({ lessonId, completed, mark }: { lessonId: string; completed: Done; mark: (experiment: 1 | 2 | 3) => void }) {
  const [decimal, setDecimal] = useState(45);
  const [bits, setBits] = useState(8);
  const [signedBits, setSignedBits] = useState(8);
  const [gate, setGate] = useState<Gate>("AND");
  const [switches, setSwitches] = useState({ a: true, b: false });
  const [cpu, setCpu] = useState(3);
  const [ram, setRam] = useState(8);
  const [encoding, setEncoding] = useState("UTF-8");
  const [sampleRate, setSampleRate] = useState(44100);
  const [audioBits, setAudioBits] = useState(16);
  const [seconds, setSeconds] = useState(60);
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [colorBits, setColorBits] = useState(24);
  const [fps, setFps] = useState(30);
  const [videoSeconds, setVideoSeconds] = useState(60);
  const [compression, setCompression] = useState(20);
  const [speed, setSpeed] = useState(20);
  const [dataRaw, setDataRaw] = useState("62,68,71,72,75,78,81,95");
  const [zValue, setZValue] = useState(70);
  const [zMean, setZMean] = useState(50);
  const [zSd, setZSd] = useState(10);
  const [relationSet, setRelationSet] = useState<"positive" | "negative" | "none">("positive");
  const [trials, setTrials] = useState(100);
  const [heads, setHeads] = useState(0);
  const [pValue, setPValue] = useState(0.03);
  const [alpha, setAlpha] = useState(0.05);
  const [windowSize, setWindowSize] = useState(3);
  const [aiClaim, setAiClaim] = useState("相関が0.82なので、スマホ利用が成績低下の原因である。");
  const [baseDevices, setBaseDevices] = useState(480);
  const [numberAmount, setNumberAmount] = useState("120.8,80.1,35.1");
  const [logicNeedPin, setLogicNeedPin] = useState(true);
  const [logicNeedCard, setLogicNeedCard] = useState(true);
  const [computerTask, setComputerTask] = useState("動画編集");
  const [computerBudget, setComputerBudget] = useState(12);
  const [textSample, setTextSample] = useState("情報AI,表計算");
  const [audioMinutes, setAudioMinutes] = useState(5);
  const [imageUseCase, setImageUseCase] = useState("photo");
  const [imageTargetKb, setImageTargetKb] = useState(500);
  const [videoUploadMb, setVideoUploadMb] = useState(800);
  const [cleanSleepData, setCleanSleepData] = useState("7,6.5,,8,70,6.5");
  const [centerCompareData, setCenterCompareData] = useState("58,62,65,67,70,95");
  const [spreadScore, setSpreadScore] = useState(82);
  const [relationText, setRelationText] = useState("スマホ時間と成績に負の相関があるので、スマホが原因である。");
  const [simulationArrival, setSimulationArrival] = useState(3);
  const [testSampleN, setTestSampleN] = useState(25);
  const [timeseriesNext, setTimeseriesNext] = useState(48);
  const [aiPrompt, setAiPrompt] = useState("この表を分析して結論を出して。");

  const calculated = useMemo(() => stats(dataRaw), [dataRaw]);
  const combinations = 1n << BigInt(bits);
  const bytesByEncoding: Record<string, number> = {
    "UTF-8": new TextEncoder().encode("情報AI").length,
    "UTF-16": "情報AI".length * 2,
    "Shift_JIS": 6
  };
  const audioMb = (sampleRate * audioBits * 2 * seconds) / 8 / 1_000_000;
  const imageMb = (width * height * colorBits) / 8 / 1_000_000;
  const videoMb = imageMb * fps * videoSeconds * (compression / 100);
  const transferSeconds = (videoMb * 8) / speed;
  const z = (zValue - zMean) / Math.max(1, zSd);
  const relationValues = {
    positive: [18, 26, 33, 41, 50, 59, 68],
    negative: [68, 58, 51, 42, 34, 27, 17],
    none: [42, 18, 63, 31, 55, 24, 48]
  }[relationSet];
  const timeSeries = [12, 18, 15, 25, 21, 31, 28, 38, 34, 44];
  const moving = timeSeries.map((_, index) =>
    index < windowSize - 1 ? null : timeSeries.slice(index - windowSize + 1, index + 1).reduce((a, b) => a + b, 0) / windowSize
  );
  const requiredBits = Math.ceil(Math.log2(Math.max(1, baseDevices)));
  const amountValues = numberAmount.split(/[\s,、]+/).map(Number).filter(Number.isFinite);
  const floatSum = amountValues.reduce((sum, value) => sum + value, 0);
  const integerYenSum = amountValues.reduce((sum, value) => sum + Math.round(value * 10), 0) / 10;
  const logicAccess = logicNeedPin && logicNeedCard;
  const computerChoice =
    computerTask === "動画編集"
      ? computerBudget >= 16 ? "RAM 16GB以上とGPUを優先" : "予算不足。画質や作業量を下げる"
      : computerTask === "AI推論"
        ? computerBudget >= 20 ? "GPU/NPU搭載機を優先" : "クラウド利用も検討"
        : computerBudget >= 8 ? "CPUとSSD重視で十分" : "中古・校内端末利用を検討";
  const textUtf8Bytes = new TextEncoder().encode(textSample).length;
  const textRows = Math.max(1, textSample.split(/\n|,/).filter(Boolean).length);
  const audioMissionMb = (44100 * 16 * 2 * audioMinutes * 60) / 8 / 1_000_000;
  const imageRecommended = imageUseCase === "photo" ? "JPEG/WebP" : imageUseCase === "logo" ? "PNG/SVG" : "PNG";
  const imageFits = imageTargetKb >= (imageUseCase === "photo" ? 350 : imageUseCase === "logo" ? 80 : 120);
  const uploadSeconds = (videoUploadMb * 8) / Math.max(1, speed);
  const cleanValues = cleanSleepData.split(/[\s,、]+/);
  const cleanIssues = cleanValues.filter((value, index, values) => value === "" || value === "-" || Number(value) > 24 || values.indexOf(value) !== index).length;
  const centerMission = stats(centerCompareData);
  const spreadMissionZ = (spreadScore - zMean) / Math.max(1, zSd);
  const relationWarning = relationText.includes("原因") || relationText.includes("必ず");
  const queueWait = Math.max(0, 5 - simulationArrival) * 4;
  const testPowerHint = testSampleN >= 30 ? "大標本としてZ検定も検討しやすい" : "母分散未知ならt検定を優先";
  const nextMoving = [...timeSeries.slice(-(windowSize - 1)), timeseriesNext].reduce((a, b) => a + b, 0) / windowSize;
  const promptScore = ["目的", "列", "手順", "根拠", "禁止"].filter((word) => aiPrompt.includes(word)).length;
  const missions: Record<string, [string, string, string[]]> = {
    base: ["128ビットIDを説明する", "学校の全端末へ重複しないIDを付けるなら、8ビットと128ビットのどちらが適切か。", ["必要数を見積もる", "2のn乗で比較", "将来の増加も考える"]],
    number: ["安全な金額計算を選ぶ", "購買部の会計で小数誤差を出さないため、金額を円単位の整数で扱う理由を説明しよう。", ["浮動小数点誤差", "最小単位へ変換", "範囲も確認"]],
    logic: ["照明回路を設計する", "2か所のスイッチの状態が異なるときだけ点灯する回路を選び、真理値表で確かめよう。", ["XORを選ぶ", "4通りを確認", "言葉で説明"]],
    computer: ["用途別PCを選定する", "文書作成用と動画編集用のPCを選び、CPU・RAM・SSDの優先順位と理由を示そう。", ["処理内容", "主記憶容量", "補助記憶"]],
    text: ["文字化けを復旧する", "CSVを開くと文字化けした。元ファイルを壊さず、正しい文字コードで読み直す手順を考えよう。", ["保存方式", "読込方式", "UTF-8で再保存"]],
    audio: ["校内放送の音質を決める", "5分の校内放送を保存する。音質と容量を考え、標本化・量子化・チャネルを選ぼう。", ["必要な音質", "容量計算", "用途との釣合い"]],
    image: ["学校Web用画像を書き出す", "行事写真と透過ロゴをWebへ掲載する。それぞれに合う形式と解像度を選ぼう。", ["写真の形式", "透過の形式", "元画像を保存"]],
    video: ["提出時間を見積もる", "授業動画を締切までに送る。MBをMbitへ直し、実効速度から時間と余裕を見積もろう。", ["byteからbit", "容量÷速度", "理論値との差"]],
    clean: ["アンケートを点検する", "空欄、同一ID、70時間という値がある睡眠調査を、根拠なく削除せず処理しよう。", ["原因確認", "原本照合", "処理を記録"]],
    center: ["2クラスを比較する", "平均が同じ2クラスを、中央値・四分位範囲・箱ひげ図も使って比較しよう。", ["中心", "ばらつき", "外れ値"]],
    spread: ["異なるテストを比べる", "平均と標準偏差が異なる2科目の得点を標準化し、相対的に高い方を判断しよう。", ["平均との差", "標準偏差", "同じ尺度"]],
    relation: ["相関から言える範囲を決める", "スマホ時間と成績に負の相関が出た。原因と断定せず、第三の要因と追加調査を提案しよう。", ["方向と強さ", "交絡要因", "因果を断定しない"]],
    simulation: ["待ち時間を予測する", "文化祭受付を乱数で再現し、到着間隔と処理時間の仮定を変えて結果を比較しよう。", ["仮定", "多数回試行", "現実との差"]],
    test: ["目的に合う検定を選ぶ", "2クラスの平均点比較と、学年別A/B選択の関連調査に適切な検定を選ぼう。", ["t検定", "カイ二乗検定", "p値の解釈"]],
    timeseries: ["翌月の売上を予測する", "月別売上から翌月を見積もり、移動平均の窓幅と季節行事の影響を説明しよう。", ["時間順", "窓幅", "季節性と限界"]],
    ai: ["AI分析を公開前に監査する", "AIのアンケート分析を共有する前に、再計算・匿名化・根拠・限界を確認しよう。", ["別手段で検算", "個人情報を除く", "根拠と限界"]]
  };
  const theory: Record<string, [string, string, string]> = {
    base: ["nビットは0/1の選択がn回続くので、組合せは2のn乗になります。2進数4桁は16通りなので16進数1桁に対応します。", "ビット数が1増えると、既存の全パターンに0を付けた群と1を付けた群ができるため、表現できる数は2倍になります。", "必要なID数より大きい最小の2のn乗を選ぶと、重複しない番号を作れます。"],
    number: ["符号付き整数は先頭ビットを符号の意味に使うため、正の最大値は2^(n-1)-1、負の最小値は-2^(n-1)になります。", "10進小数の一部は2進数で有限桁にならないため、コンピュータ内部では近似値として保存されます。", "金額など正確さが必要な値は、最小単位の整数に直すと小数の丸め誤差を避けやすくなります。"],
    logic: ["論理ゲートは入力0/1と出力0/1の対応表で決まります。ANDは両方1、ORはどちらか1、XORは異なるとき1です。", "真理値表はすべての入力パターンを列挙するため、回路の動作を漏れなく確認できます。", "条件を日常語からAND/OR/NOTに置き換えると、システムの判定ルールとして設計できます。"],
    computer: ["CPUは命令を取り出し、解読し、実行します。RAMは作業中のデータを一時保存し、SSDは電源を切っても残す保存場所です。", "命令実行は取出し、解読、実行のサイクルで進みます。処理速度はCPUだけでなくメモリや記憶装置にも左右されます。", "用途によって負荷の場所が違うため、文書作成、動画編集、AI処理では優先すべき部品が変わります。"],
    text: ["文字は文字コードにより数値へ対応付けられ、符号化方式により実際のバイト列へ変換されます。", "保存時と読込時の符号化方式がずれると、同じバイト列を別の文字として解釈して文字化けします。", "CSVのようなテキストデータでは、区切り文字、行数、文字コードをそろえると機械処理しやすくなります。"],
    audio: ["音は連続波なので、一定間隔で測る標本化、段階値に丸める量子化、2進数にする符号化でデジタル化します。", "非圧縮音声の容量は、標本化周波数×量子化ビット数×チャネル数×時間で決まります。", "時間が長いほど容量は比例して増えます。音質を上げる設定も、保存容量と通信量を増やします。"],
    image: ["画像は画素の集まりで、1画素あたりのビット数が増えるほど表現できる色数が増えます。", "写真は多少の損失が目立ちにくくJPEG/WebPに向き、ロゴや透過は可逆・透過対応のPNG/SVGに向きます。", "用途に対して解像度や容量を決めると、見やすさと読み込みやすさのバランスを取れます。"],
    video: ["動画は静止画像を時間方向に連続表示するため、画素数、fps、時間が増えると容量が大きくなります。", "通信時間はデータ量をbitへ直し、通信速度bpsで割ると見積もれます。", "提出時は理論速度どおりには出ないため、容量と回線速度から余裕時間を考える必要があります。"],
    clean: ["データには量的・質的、名義・順序・間隔・比例などの違いがあり、使える計算やグラフが変わります。", "欠損、重複、外れ値は即削除せず、原因と影響を確認してから処理を記録します。", "データ整理は分析結果を左右するため、計算前の点検が重要です。"],
    center: ["平均は全値を使うため外れ値の影響を受けます。中央値は順序の中央なので外れ値に比較的強いです。", "箱ひげ図は最小、四分位、中央値、最大を使い、中心とばらつきを同時に比較できます。", "同じ平均でも分布が違うことがあるため、中央値や範囲も合わせて判断します。"],
    spread: ["分散は平均からのずれの2乗平均、標準偏差はその平方根です。値の散らばりを元の単位に近い形で見られます。", "z得点は平均との差を標準偏差で割った値で、偏差値は平均50、標準偏差10に変換したものです。", "平均や標準偏差が違う集団を比べるときは、標準化すると位置関係を比較しやすくなります。"],
    relation: ["散布図は2つの量的変数の対応を点で示します。相関係数は直線的な関係の方向と強さを-1から1で表します。", "相関が強くても、第三の要因や偶然の可能性があるため、原因とは断定できません。", "分析文では、関係があることと原因であることを分けて表現する必要があります。"],
    simulation: ["乱数を使うと、現実で何度も試しにくい現象を仮想的に繰り返して傾向を見られます。", "シミュレーションは仮定に基づくモデルなので、入力条件を変えると結果も変わります。", "到着間隔が処理時間より短い状態が続くと、待ち行列は伸びやすくなります。"],
    test: ["仮説検定は、差がないという帰無仮説のもとで、観測結果がどれくらい珍しいかを調べます。", "p値が有意水準より小さいと、帰無仮説のもとでは起こりにくい結果として棄却します。", "標本数や母分散が分かるかどうかで、Z検定、t検定、カイ二乗検定などを選び分けます。"],
    timeseries: ["時系列データは時間順に並ぶため、長期的なトレンド、周期的な季節性、短期的な揺れを分けて読みます。", "移動平均は近い期間の平均を取り、短期的な上下をならして傾向を見やすくします。", "窓幅を変えると、なめらかさと変化への反応速度が変わります。"],
    ai: ["AIの出力は確率的に生成されるため、もっともらしくても誤りを含む場合があります。", "分析では、元データ、計算式、結論の言い過ぎ、個人情報の有無を人が確認する必要があります。", "依頼文に目的、列、手順、根拠、禁止事項を入れると、再現性と検証可能性が上がります。"]
  };

  const Card = ({ no, title, goal, children }: { no: 1 | 2 | 3; title: string; goal: string; children: React.ReactNode }) => (
    <>
      <article className="experiment-card">
        <div className="experiment-heading"><span>実験 {no}</span><div><h2>{title}</h2><p>{goal}</p></div></div>
        <div className="theory-box"><b>理論</b><p>{theory[lessonId][no - 1]}</p></div>
        {children}
        <button className={`record-experiment ${completed[`${lessonId}-${no}`] ? "recorded" : ""}`} onClick={() => mark(no)} disabled={!!completed[`${lessonId}-${no}`]}>
          {completed[`${lessonId}-${no}`] ? `実験${no} 記録済み` : `実験${no}を記録する`}
        </button>
      </article>
      {no === 2 && <MissionCard />}
    </>
  );

  const MissionCard = () => {
    const title = missions[lessonId][0];
    const mission = missions[lessonId][1];
    const checks = missions[lessonId][2];
    let body: React.ReactNode = null;

    if (lessonId === "base") body = <>
      <label className="control">学校で識別したい端末数<input type="number" min="1" max="1000000" value={baseDevices} onChange={(e) => setBaseDevices(clampNumber(+e.target.value, 1, 1000000))} /></label>
      <div className="number-grid"><div><span>必要な最小ビット数</span><b>{requiredBits}</b></div><div><span>8ビットで足りるか</span><b>{baseDevices <= 256 ? "足りる" : "不足"}</b></div><div><span>128ビット</span><b>十分</b></div></div>
    </>;
    else if (lessonId === "number") body = <>
      <label className="control">小数の金額を入力<input value={numberAmount} onChange={(e) => setNumberAmount(e.target.value)} /></label>
      <div className="number-grid"><div><span>そのまま合計</span><b>{floatSum}</b></div><div><span>10倍整数で計算</span><b>{integerYenSum}</b></div><div><span>差</span><b>{Math.abs(floatSum - integerYenSum).toExponential(1)}</b></div></div>
    </>;
    else if (lessonId === "logic") body = <>
      <div className="switches"><button className={logicNeedCard ? "active" : ""} onClick={() => setLogicNeedCard(!logicNeedCard)}>社員証 {logicNeedCard ? "あり" : "なし"}</button><button className={logicNeedPin ? "active" : ""} onClick={() => setLogicNeedPin(!logicNeedPin)}>暗証番号 {logicNeedPin ? "一致" : "不一致"}</button></div>
      <div className={`decision ${logicAccess ? "reject" : ""}`}>{logicAccess ? "AND条件を満たす: 入室可" : "どちらか不足: 入室不可"}</div>
    </>;
    else if (lessonId === "computer") body = <>
      <div className="three-controls"><label>用途<select value={computerTask} onChange={(e) => setComputerTask(e.target.value)}><option>文書作成</option><option>動画編集</option><option>AI推論</option></select></label><label>予算目安<input type="number" min="4" max="40" value={computerBudget} onChange={(e) => setComputerBudget(clampNumber(+e.target.value, 4, 40))} /></label></div>
      <div className="focus-result"><span>優先判断</span><b>{computerChoice}</b></div>
    </>;
    else if (lessonId === "text") body = <>
      <label className="control">CSV風の文字列<textarea value={textSample} onChange={(e) => setTextSample(e.target.value)} /></label>
      <div className="number-grid"><div><span>UTF-8バイト数</span><b>{textUtf8Bytes}</b></div><div><span>行・項目数の目安</span><b>{textRows}</b></div><div><span>文字化け対策</span><b>UTF-8指定</b></div></div>
    </>;
    else if (lessonId === "audio") body = <>
      <label className="control">録音時間<input type="range" min="1" max="30" value={audioMinutes} onChange={(e) => setAudioMinutes(+e.target.value)} /><b>{audioMinutes}分</b></label>
      <div className="focus-result"><span>CD相当ステレオの概算</span><b>{fmt(audioMissionMb)} MB</b><small>44.1kHz・16bit・2ch</small></div>
    </>;
    else if (lessonId === "image") body = <>
      <div className="three-controls"><label>用途<select value={imageUseCase} onChange={(e) => setImageUseCase(e.target.value)}><option value="photo">写真</option><option value="logo">透過ロゴ</option><option value="chart">図表</option></select></label><label>目標KB<input type="number" min="10" max="5000" value={imageTargetKb} onChange={(e) => setImageTargetKb(clampNumber(+e.target.value, 10, 5000))} /></label></div>
      <div className="number-grid"><div><span>推奨形式</span><b>{imageRecommended}</b></div><div><span>目標容量</span><b>{imageFits ? "現実的" : "厳しい"}</b></div></div>
    </>;
    else if (lessonId === "video") body = <>
      <label className="control">提出動画の容量<input type="number" min="1" max="10000" value={videoUploadMb} onChange={(e) => setVideoUploadMb(clampNumber(+e.target.value, 1, 10000))} /></label>
      <div className="focus-result"><span>{speed}Mbpsでの送信時間</span><b>{fmt(uploadSeconds)} 秒</b><small>MBをMbitへ直して速度で割る</small></div>
    </>;
    else if (lessonId === "clean") body = <>
      <label className="control">睡眠時間データ<textarea value={cleanSleepData} onChange={(e) => setCleanSleepData(e.target.value)} /></label>
      <div className="focus-result"><span>点検が必要な値</span><b>{cleanIssues} 個</b><small>空欄・24超・重複を検出</small></div>
    </>;
    else if (lessonId === "center") body = <>
      <label className="control">比較データ<textarea value={centerCompareData} onChange={(e) => setCenterCompareData(e.target.value)} /></label>
      {centerMission && <div className="number-grid"><div><span>平均</span><b>{fmt(centerMission.mean)}</b></div><div><span>中央値</span><b>{fmt(centerMission.median)}</b></div><div><span>最大値</span><b>{centerMission.max}</b></div></div>}
    </>;
    else if (lessonId === "spread") body = <>
      <div className="three-controls"><label>得点<input type="number" value={spreadScore} onChange={(e) => setSpreadScore(+e.target.value)} /></label><label>平均<input type="number" value={zMean} onChange={(e) => setZMean(+e.target.value)} /></label><label>標準偏差<input type="number" min="1" value={zSd} onChange={(e) => setZSd(+e.target.value)} /></label></div>
      <div className="number-grid"><div><span>z得点</span><b>{fmt(spreadMissionZ, 2)}</b></div><div><span>偏差値</span><b>{fmt(50 + 10 * spreadMissionZ)}</b></div></div>
    </>;
    else if (lessonId === "relation") body = <>
      <label className="control">分析文<textarea value={relationText} onChange={(e) => setRelationText(e.target.value)} /></label>
      <div className={`decision ${relationWarning ? "" : "reject"}`}>{relationWarning ? "因果の断定を疑う必要あり" : "相関の範囲で表現できています"}</div>
    </>;
    else if (lessonId === "simulation") body = <>
      <label className="control">平均到着間隔<input type="range" min="1" max="8" value={simulationArrival} onChange={(e) => setSimulationArrival(+e.target.value)} /><b>{simulationArrival}分ごと</b></label>
      <div className="focus-result"><span>待ち時間の増えやすさ</span><b>{queueWait} 分相当</b><small>処理5分より短い間隔だと行列が伸びる</small></div>
    </>;
    else if (lessonId === "test") body = <>
      <label className="control">標本数<input type="range" min="5" max="100" value={testSampleN} onChange={(e) => setTestSampleN(+e.target.value)} /><b>{testSampleN}</b></label>
      <div className="focus-result"><span>検定選択の目安</span><b>{testPowerHint}</b></div>
    </>;
    else if (lessonId === "timeseries") body = <>
      <label className="control">次月の実測候補<input type="number" value={timeseriesNext} onChange={(e) => setTimeseriesNext(+e.target.value)} /></label>
      <div className="focus-result"><span>次を含めた移動平均</span><b>{fmt(nextMoving)}</b><small>窓幅 {windowSize} 期間</small></div>
    </>;
    else body = <>
      <label className="control">AIへの依頼文<textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} /></label>
      <div className="number-grid"><div><span>具体化スコア</span><b>{promptScore}/5</b></div><div><span>不足しやすい指定</span><b>{promptScore >= 4 ? "少ない" : "あり"}</b></div></div>
    </>;

    return <article className="experiment-card application-card">
      <div className="experiment-heading"><span>実験 3・応用</span><div><h2>{title}</h2><p>入力を変えて、結果や判断がどう変わるかを確かめます。</p></div></div>
      <div className="theory-box"><b>理論</b><p>{theory[lessonId][2]}</p></div>
      <div className="mission-box"><b>応用ミッション</b><p>{mission}</p></div>
      {body}
      <div className="mission-checks">{checks.map((item, index) => <span key={item}><i>{index + 1}</i>{item}</span>)}</div>
      <button className={`record-experiment ${completed[`${lessonId}-3`] ? "recorded" : ""}`} onClick={() => mark(3)} disabled={!!completed[`${lessonId}-3`]}>
        {completed[`${lessonId}-3`] ? "実験3 記録済み" : "実験3を記録する"}
      </button>
    </article>;
  };

  if (lessonId === "base") return <div className="experiments">
    <Card no={1} title="同じ値を3つの基数で見る" goal="表記が変わっても値は同じであることを確かめます。">
      <label className="control">10進数: <b>{decimal}</b><input type="range" min="0" max="255" value={decimal} onChange={(e) => setDecimal(+e.target.value)} /></label>
      <div className="number-grid"><div><span>2進数</span><b>{decimal.toString(2).padStart(8, "0")}</b></div><div><span>10進数</span><b>{decimal}</b></div><div><span>16進数</span><b>{decimal.toString(16).toUpperCase().padStart(2, "0")}</b></div></div>
    </Card>
    <Card no={2} title="1から128ビットの世界" goal="ビットが1増えるたび、組合せが2倍になることを確認します。">
      <label className="control">ビット数: <b>{bits}</b><input type="range" min="1" max="128" value={bits} onChange={(e) => setBits(+e.target.value)} /></label>
      <div className="focus-result"><span>表せる組合せ</span><b>{combinations.toLocaleString("ja-JP")}</b><small>2の{bits}乗</small></div>
    </Card>
  </div>;

  if (lessonId === "number") return <div className="experiments">
    <Card no={1} title="符号付き整数の範囲" goal="2の補数では、正と負で範囲が非対称になります。">
      <label className="control">ビット数: <b>{signedBits}</b><input type="range" min="4" max="32" value={signedBits} onChange={(e) => setSignedBits(+e.target.value)} /></label>
      <div className="number-grid"><div><span>最小値</span><b>-{(2 ** (signedBits - 1)).toLocaleString()}</b></div><div><span>最大値</span><b>{(2 ** (signedBits - 1) - 1).toLocaleString()}</b></div></div>
    </Card>
    <Card no={2} title="0.1 + 0.2 の誤差" goal="10進小数を2進数で近似するために生じる誤差を確認します。">
      <div className="code-result"><code>0.1 + 0.2</code><strong>{0.1 + 0.2}</strong></div>
      <div className="compare-row"><span>そのまま比較</span><b>{String(0.1 + 0.2 === 0.3)}</b><span>丸めて比較</span><b>{String(Math.round((0.1 + 0.2) * 10) / 10 === 0.3)}</b></div>
    </Card>
  </div>;

  if (lessonId === "logic") return <div className="experiments">
    <Card no={1} title="7種類のゲートを操作" goal="入力を切り替え、各ゲートの出力を真理値表と照合します。">
      <div className="gate-tabs">{(["NOT", "AND", "OR", "NAND", "NOR", "XOR", "XNOR"] as Gate[]).map((item) => <button className={gate === item ? "active" : ""} onClick={() => setGate(item)} key={item}>{item}</button>)}</div>
      <div className="logic-stage"><div className="switches"><button onClick={() => setSwitches({ ...switches, a: !switches.a })}>入力A <b>{+switches.a}</b></button>{gate !== "NOT" && <button onClick={() => setSwitches({ ...switches, b: !switches.b })}>入力B <b>{+switches.b}</b></button>}</div><div className={gateOutput(gate, switches.a, switches.b) ? "lamp lit" : "lamp"}><span>出力</span><b>{+gateOutput(gate, switches.a, switches.b)}</b></div></div>
    </Card>
    <Card no={2} title="真理値表を完成させる" goal="4つの入力パターンを一度に比較します。">
      <div className="truth-table"><div>A</div><div>B</div><div>{gate}</div>{[[false, false], [false, true], [true, false], [true, true]].map(([a, b]) => <span key={`${a}${b}`} className="truth-row"><i>{+a}</i><i>{gate === "NOT" ? "-" : +b}</i><b>{+gateOutput(gate, a, b)}</b></span>)}</div>
    </Card>
  </div>;

  if (lessonId === "computer") return <div className="experiments">
    <Card no={1} title="用途に合うPC構成" goal="CPU性能とRAM容量を変え、作業との相性を考えます。">
      <label className="control">CPU性能: <b>{cpu}/5</b><input type="range" min="1" max="5" value={cpu} onChange={(e) => setCpu(+e.target.value)} /></label>
      <label className="control">RAM: <b>{ram}GB</b><input type="range" min="4" max="32" step="4" value={ram} onChange={(e) => setRam(+e.target.value)} /></label>
      <div className="recommend">{cpu >= 4 && ram >= 16 ? "動画編集・3D制作にも対応しやすい" : ram >= 8 ? "文書作成・Web・基礎プログラミング向け" : "同時に多数のアプリを開くと不足しやすい"}</div>
    </Card>
    <Card no={2} title="命令が実行される順序" goal="CPUが命令を取出し、解読し、実行する循環を確認します。">
      <div className="cycle"><span>1 主記憶から命令を取出す</span><i>→</i><span>2 命令を解読する</span><i>→</i><span>3 演算・制御して実行</span></div>
    </Card>
  </div>;

  if (lessonId === "text") return <div className="experiments">
    <Card no={1} title="符号化方式とバイト数" goal="同じ文字列でも、符号化方式でデータ量が変わることを確かめます。">
      <div className="gate-tabs">{Object.keys(bytesByEncoding).map((item) => <button className={encoding === item ? "active" : ""} onClick={() => setEncoding(item)} key={item}>{item}</button>)}</div>
      <div className="focus-result"><span>「情報AI」の概算</span><b>{bytesByEncoding[encoding]} bytes</b><small>{encoding}</small></div>
    </Card>
    <Card no={2} title="文字化けの原因を追う" goal="保存時と読込時の符号化方式の違いを理解します。">
      <div className="encoding-flow"><span>文字</span><i>UTF-8で保存</i><span>数値列</span><i>別方式で読込</i><strong>文字化け</strong></div>
    </Card>
  </div>;

  if (lessonId === "audio") return <div className="experiments">
    <Card no={1} title="標本化と量子化" goal="測定回数と数値の細かさが、波形の再現にどう影響するかを見ます。">
      <label className="control">標本化: <b>{Math.round(sampleRate / 1000)}kHz</b><input type="range" min="8000" max="96000" step="1000" value={sampleRate} onChange={(e) => setSampleRate(+e.target.value)} /></label>
      <div className="wave">{Array.from({ length: Math.max(8, Math.round(sampleRate / 4000)) }, (_, index) => <i key={index} style={{ height: `${25 + Math.abs(Math.sin(index / 2)) * 55}%` }} />)}</div>
    </Card>
    <Card no={2} title="非圧縮音声の容量" goal="標本化周波数×量子化ビット数×チャネル数×時間で計算します。">
      <label className="control">量子化: <b>{audioBits}bit</b><input type="range" min="8" max="32" step="8" value={audioBits} onChange={(e) => setAudioBits(+e.target.value)} /></label>
      <label className="control">時間: <b>{seconds}秒</b><input type="range" min="10" max="300" step="10" value={seconds} onChange={(e) => setSeconds(+e.target.value)} /></label>
      <div className="focus-result"><span>ステレオ音声</span><b>{fmt(audioMb)} MB</b><small>圧縮前の概算</small></div>
    </Card>
  </div>;

  if (lessonId === "image") return <div className="experiments">
    <Card no={1} title="画素数と色深度" goal="縦×横×1画素のビット数から、非圧縮容量を求めます。">
      <div className="preset-row">{[[800, 600], [1920, 1080], [3840, 2160]].map(([w, h]) => <button onClick={() => { setWidth(w); setHeight(h); }} key={w}>{w}x{h}</button>)}</div>
      <label className="control">色深度: <b>{colorBits}bit</b><input type="range" min="1" max="24" value={colorBits} onChange={(e) => setColorBits(+e.target.value)} /></label>
      <div className="focus-result"><span>非圧縮容量</span><b>{fmt(imageMb, 2)} MB</b><small>{width.toLocaleString()}x{height.toLocaleString()}画素</small></div>
    </Card>
    <Card no={2} title="用途から形式を選ぶ" goal="写真・ロゴ・透過の有無に応じて、圧縮形式を使い分けます。">
      <div className="format-grid"><div><b>JPEG</b><span>写真・小容量</span></div><div><b>PNG</b><span>ロゴ・透過</span></div><div><b>WebP</b><span>Web・写真/透過</span></div></div>
    </Card>
  </div>;

  if (lessonId === "video") return <div className="experiments">
    <Card no={1} title="動画のデータ量" goal="画像1枚の容量×fps×時間から、動画が巨大になる理由を理解します。">
      <label className="control">フレーム率: <b>{fps}fps</b><input type="range" min="15" max="60" step="15" value={fps} onChange={(e) => setFps(+e.target.value)} /></label>
      <label className="control">時間: <b>{videoSeconds}秒</b><input type="range" min="10" max="120" step="10" value={videoSeconds} onChange={(e) => setVideoSeconds(+e.target.value)} /></label>
      <label className="control">圧縮後の割合: <b>{compression}%</b><input type="range" min="1" max="100" value={compression} onChange={(e) => setCompression(+e.target.value)} /></label>
      <div className="focus-result"><span>1920x1080・24bit</span><b>{fmt(videoMb)} MB</b><small>設定後の概算</small></div>
    </Card>
    <Card no={2} title="データ量から転送時間へ" goal="単位変換を一段ずつ確認します。">
      <div className="step-calc"><span>{fmt(videoMb)} MB</span><i>x8</i><span>{fmt(videoMb * 8)} Mbit</span><i>÷{speed}Mbps</i><strong>{fmt(transferSeconds)}秒</strong></div>
      <label className="control">実効速度: <b>{speed}Mbps</b><input type="range" min="5" max="100" step="5" value={speed} onChange={(e) => setSpeed(+e.target.value)} /></label>
    </Card>
  </div>;

  if (lessonId === "clean") return <div className="experiments">
    <Card no={1} title="データの種類を見分ける" goal="数値に見えても、計算に意味があるとは限りません。">
      <div className="type-grid"><div><b>身長 168.5cm</b><span>量的・比例尺度</span></div><div><b>満足度 1から5</b><span>質的・順序尺度</span></div><div><b>出席番号 12</b><span>質的・名義尺度</span></div><div><b>気温 20度</b><span>量的・間隔尺度</span></div></div>
    </Card>
    <Card no={2} title="汚れたデータを点検" goal="欠損・重複・入力誤り・外れ値を、削除前に見つけます。">
      <table className="data-table"><thead><tr><th>ID</th><th>睡眠</th><th>集中度</th><th>判定</th></tr></thead><tbody><tr><td>01</td><td>7.0</td><td>4</td><td>正常</td></tr><tr><td>02</td><td>-</td><td>3</td><td className="warn">欠損</td></tr><tr><td>02</td><td>6.0</td><td>3</td><td className="warn">ID重複</td></tr><tr><td>04</td><td>70</td><td>5</td><td className="warn">入力誤り?</td></tr></tbody></table>
    </Card>
  </div>;

  if (lessonId === "center") return <div className="experiments">
    <Card no={1} title="平均・中央値・標準偏差" goal="外れ値を入れ替え、代表値への影響を比較します。">
      <textarea className="data-input" value={dataRaw} onChange={(e) => setDataRaw(e.target.value)} />
      {calculated && <div className="stats-grid"><div><span>平均</span><b>{fmt(calculated.mean)}</b></div><div><span>中央値</span><b>{fmt(calculated.median)}</b></div><div><span>標準偏差</span><b>{fmt(calculated.sd)}</b></div><div><span>範囲</span><b>{calculated.min}-{calculated.max}</b></div></div>}
    </Card>
    <Card no={2} title="箱ひげ図の読み取り" goal="中央値と広がりを視覚的に捉えます。">
      <div className="boxplot"><i style={{ left: "7%" }} /><span style={{ left: "7%", width: "86%" }} /><b style={{ left: "26%", width: "46%" }} /><em style={{ left: "49%" }} /></div>
      <p className="observe">平均だけでなく、中央値・範囲・ばらつきも比較します。</p>
    </Card>
  </div>;

  if (lessonId === "spread") return <div className="experiments">
    <Card no={1} title="同じ平均、違うばらつき" goal="平均だけでは分布の違いを説明できないことを確かめます。">
      <div className="distribution"><div><b>A</b>{[48, 49, 50, 51, 52].map((x) => <i key={x} style={{ left: `${(x - 40) * 4}%` }} />)}<span>平均50・標準偏差 約1.4</span></div><div><b>B</b>{[30, 40, 50, 60, 70].map((x) => <i key={x} style={{ left: `${(x - 25) * 1.8}%` }} />)}<span>平均50・標準偏差 約14.1</span></div></div>
    </Card>
    <Card no={2} title="z得点と偏差値" goal="異なる平均・標準偏差の集団でも、位置を共通尺度で比較します。">
      <div className="three-controls"><label>値<input type="number" value={zValue} onChange={(e) => setZValue(+e.target.value)} /></label><label>平均<input type="number" value={zMean} onChange={(e) => setZMean(+e.target.value)} /></label><label>標準偏差<input type="number" min="1" value={zSd} onChange={(e) => setZSd(+e.target.value)} /></label></div>
      <div className="number-grid"><div><span>z得点</span><b>{fmt(z, 2)}</b></div><div><span>偏差値</span><b>{fmt(50 + 10 * z, 1)}</b></div></div>
    </Card>
  </div>;

  if (lessonId === "relation") return <div className="experiments">
    <Card no={1} title="散布図の形を読む" goal="正・負・ほぼなしの相関を、点の並びから判断します。">
      <div className="gate-tabs">{(["positive", "negative", "none"] as const).map((item, index) => <button className={relationSet === item ? "active" : ""} onClick={() => setRelationSet(item)} key={item}>{["正の相関", "負の相関", "ほぼなし"][index]}</button>)}</div>
      <div className="scatter">{relationValues.map((y, index) => <i key={index} style={{ left: `${10 + index * 13}%`, bottom: `${y}%` }} />)}</div>
    </Card>
    <Card no={2} title="相関から原因へ飛ばない" goal="第三の要因と、調査設計の限界を確認します。">
      <div className="cause-map"><strong>気温</strong><i>↙</i><i>↘</i><span>アイス売上</span><span>熱中症患者</span></div>
    </Card>
  </div>;

  if (lessonId === "simulation") return <div className="experiments">
    <Card no={1} title="コイン投げを多数回実行" goal="試行回数と、実験値が理論値へ近づく様子を比べます。">
      <label className="control">試行回数: <b>{trials.toLocaleString()}回</b><input type="range" min="10" max="10000" step="10" value={trials} onChange={(e) => setTrials(+e.target.value)} /></label>
      <button className="run-button" onClick={() => { let count = 0; for (let i = 0; i < trials; i++) if (Math.random() < 0.5) count++; setHeads(count); mark(1); }}>シミュレーション実行</button>
      <div className="number-grid"><div><span>表</span><b>{heads}回</b></div><div><span>表の相対度数</span><b>{heads ? fmt(heads / trials, 3) : "-"}</b></div></div>
    </Card>
    <Card no={2} title="モデルの条件を点検" goal="結果は、置いた仮定の範囲でのみ意味を持ちます。">
      <div className="assumptions"><span>コインは公平か</span><span>各試行は独立か</span><span>乱数に偏りはないか</span><span>現実とモデルの差は何か</span></div>
    </Card>
  </div>;

  if (lessonId === "test") return <div className="experiments">
    <Card no={1} title="p値と有意水準" goal="帰無仮説を、どの基準で判断するか確かめます。">
      <label className="control">p値: <b>{pValue.toFixed(2)}</b><input type="range" min="0" max="0.2" step="0.01" value={pValue} onChange={(e) => setPValue(+e.target.value)} /></label>
      <label className="control">有意水準: <b>{alpha.toFixed(2)}</b><input type="range" min="0.01" max="0.1" step="0.01" value={alpha} onChange={(e) => setAlpha(+e.target.value)} /></label>
      <div className={`decision ${pValue < alpha ? "reject" : ""}`}>{pValue < alpha ? "p < 有意水準: 帰無仮説を棄却" : "p >= 有意水準: 帰無仮説を棄却できない"}</div>
    </Card>
    <Card no={2} title="問いから検定を選ぶ" goal="平均・割合・カテゴリのどれを比べるかで手法を選びます。">
      <div className="test-grid"><div><b>平均の差</b><span>t検定</span></div><div><b>カテゴリの関連</b><span>カイ二乗検定</span></div><div><b>大標本の比率・平均</b><span>Z検定</span></div></div>
    </Card>
  </div>;

  if (lessonId === "timeseries") return <div className="experiments">
    <Card no={1} title="時間順に変化を読む" goal="単発の増減ではなく、トレンドと周期性を区別します。">
      <div className="bar-series">{timeSeries.map((value, index) => <i key={index} style={{ height: `${value * 2}px` }}><small>{value}</small></i>)}</div>
    </Card>
    <Card no={2} title="移動平均でならす" goal="窓幅を変え、滑らかさと変化への反応の違いを見ます。">
      <label className="control">窓幅: <b>{windowSize}期間</b><input type="range" min="2" max="5" value={windowSize} onChange={(e) => setWindowSize(+e.target.value)} /></label>
      <div className="moving-values">{moving.map((value, index) => <span key={index}>{value === null ? "-" : fmt(value)}</span>)}</div>
    </Card>
  </div>;

  return <div className="experiments">
    <Card no={1} title="AIの分析文を監査" goal="計算が合っていても、解釈が正しいとは限りません。">
      <textarea className="data-input" value={aiClaim} onChange={(e) => setAiClaim(e.target.value)} />
      <div className="audit"><span>元データを確認</span><span>別手段で検算</span><span className={aiClaim.includes("原因") ? "warn-text" : ""}>相関を因果と断定していないか</span><span>標本数と限界を明記</span></div>
    </Card>
    <Card no={2} title="再現できる依頼へ改善" goal="目的、列、方法、出力、禁止事項を具体的に指定します。">
      <div className="prompt-box"><b>よい依頼の型</b><p>このCSVについて、列の意味を確認した後、欠損値を報告し、平均・中央値・標準偏差を計算してください。使用した式と根拠を表で示し、因果関係は断定しないでください。</p></div>
    </Card>
  </div>;
}

export default function Home() {
  const [studentCode, setStudentCode] = useState("");
  const [active, setActive] = useState("home");
  const [drafts, setDrafts] = useState<Record<string, number[]>>({});
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [experiments, setExperiments] = useState<Record<string, boolean>>({});
  const [reflection, setReflection] = useState("");
  const [loaded, setLoaded] = useState(false);

  const current = lessons.find((lesson) => lesson.id === active);

  const summary = useMemo(() => {
    const quizCorrect = Object.values(submissions).reduce((sum, submission) => sum + submission.correct, 0);
    const quizMax = lessons.length * 5;
    const completedLessons = lessons.filter(
      (lesson) =>
        submissions[lesson.id] &&
        experiments[`${lesson.id}-1`] &&
        experiments[`${lesson.id}-2`] &&
        experiments[`${lesson.id}-3`]
    ).length;
    const totalScore = Math.round((quizCorrect / quizMax) * 80 + (completedLessons / lessons.length) * 20);
    return { totalScore, quizCorrect, quizMax, completedLessons, lessonCount: lessons.length };
  }, [submissions, experiments]);

  useEffect(() => {
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded || studentCode.length !== 4) return;
    const record: StudentRecord = {
      version: 1,
      studentCode,
      drafts,
      submissions,
      experiments,
      reflection,
      summary
    };
    localStorage.setItem(`${STORAGE_PREFIX}${studentCode}`, JSON.stringify(record));
  }, [loaded, studentCode, drafts, submissions, experiments, reflection, summary]);

  const updateStudentCode = (value: string) => {
    const code = normalizeStudentCode(value);
    setStudentCode(code);
    if (code.length !== 4) {
      setDrafts({});
      setSubmissions({});
      setExperiments({});
      setReflection("");
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${code}`) ?? "{}") as Partial<StudentRecord>;
      setDrafts(saved.drafts ?? {});
      setSubmissions(saved.submissions ?? {});
      setExperiments(saved.experiments ?? {});
      setReflection(saved.reflection ?? "");
    } catch {
      setDrafts({});
      setSubmissions({});
      setExperiments({});
      setReflection("");
    }
  };

  const choose = (lesson: Lesson, questionIndex: number, choiceIndex: number) => {
    if (submissions[lesson.id]) return;
    setDrafts((prev) => {
      const next = [...(prev[lesson.id] ?? Array(5).fill(-1))];
      next[questionIndex] = choiceIndex;
      return { ...prev, [lesson.id]: next };
    });
  };

  const submitLesson = (lesson: Lesson) => {
    const answers = drafts[lesson.id] ?? [];
    if (answers.length !== 5 || answers.some((answer) => answer === -1 || answer === undefined)) return;
    const correct = lesson.questions.filter((question, index) => question.answer === answers[index]).length;
    setSubmissions((prev) => ({
      ...prev,
      [lesson.id]: { answers, correct, submittedAt: new Date().toISOString() }
    }));
  };

  const markExperiment = (lessonId: string, no: 1 | 2 | 3) => {
    setExperiments((prev) => ({ ...prev, [`${lessonId}-${no}`]: true }));
  };

  const endLearning = () => {
    setStudentCode("");
    setDrafts({});
    setSubmissions({});
    setExperiments({});
    setReflection("");
    setActive("home");
  };

  const buildRecord = (): StudentRecord => ({
    version: 1,
    exportedAt: new Date().toISOString(),
    studentCode,
    drafts,
    submissions,
    experiments,
    reflection,
    summary
  });

  const exportJson = () => {
    if (studentCode.length !== 4) return;
    const blob = new Blob([JSON.stringify(buildRecord(), null, 2)], { type: "application/json;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${studentCode}_ddl_${todayNumber()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const lessonProgress = (lesson: Lesson) =>
    Number(!!experiments[`${lesson.id}-1`]) +
    Number(!!experiments[`${lesson.id}-2`]) +
    Number(!!experiments[`${lesson.id}-3`]);

  return (
    <main>
      <header className="topbar">
        <button className="brand" onClick={() => setActive("home")}>情報I Digital & Data Lab</button>
        <nav className="nav">
          <button onClick={() => setActive("home")}>学習マップ</button>
          <button onClick={() => setActive("results")}>成績・JSON出力</button>
          {studentCode.length === 4 && <button onClick={endLearning}>学習を終了</button>}
        </nav>
      </header>

      <div className="shell">
        {active === "home" && (
          <>
            <section className="hero">
              <div>
                <h1>操作して、判断できる情報Iへ。</h1>
                <p>全16単元。各単元は実験3つと確認問題5問で進みます。結果はこのブラウザに保存され、最後にJSONで出力できます。</p>
                <div className="lookup">
                  <label>
                    4桁番号
                    <input inputMode="numeric" value={studentCode} onChange={(event) => updateStudentCode(event.target.value)} placeholder="例: 1205" />
                  </label>
                  <div className="status-pill">{studentCode.length === 4 ? `番号 ${studentCode}` : "半角数字4桁を入力"}</div>
                </div>
              </div>
              <div className="score-ring">
                <strong>{summary.totalScore}</strong>
                <span>/100</span>
              </div>
            </section>

            {(["デジタル", "データ活用"] as const).map((area) => (
              <section key={area}>
                <div className="section-heading">
                  <h2>{area}</h2>
                  <span className="muted">{lessons.filter((lesson) => lesson.area === area && submissions[lesson.id]).length} / 8 テスト送信済み</span>
                </div>
                <div className="lesson-grid">
                  {lessons.filter((lesson) => lesson.area === area).map((lesson) => (
                    <button className={`lesson-card ${submissions[lesson.id] ? "done" : ""}`} key={lesson.id} onClick={() => setActive(lesson.id)}>
                      <b>{lesson.no}</b>
                      <h3>{lesson.title}</h3>
                      <p>{lesson.subtitle}</p>
                      <div className="tags">{lesson.concepts.slice(0, 4).map((concept) => <span key={concept}>{concept}</span>)}</div>
                      <strong>{submissions[lesson.id] ? `${submissions[lesson.id].correct}/5点` : `${lessonProgress(lesson)}/3実験`}</strong>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}

        {current && (
          <section className="workspace">
            <button className="back" onClick={() => setActive("home")}>学習マップへ戻る</button>
            <div className="lesson-hero">
              <div>
                <h1>{current.no} {current.title}</h1>
                <p>{current.subtitle}</p>
                <div className="tags">{current.concepts.map((concept) => <span key={concept}>{concept}</span>)}</div>
              </div>
              <div className="lesson-status">
                <span>実験 {lessonProgress(current)}/3</span>
                <span>確認問題 {submissions[current.id] ? `${submissions[current.id].correct}/5` : "未送信"}</span>
              </div>
            </div>

            <Experiment lessonId={current.id} completed={experiments} mark={(no) => markExperiment(current.id, no)} />

            <section className="quiz">
              <h2>確認問題 5問</h2>
              {current.questions.map((question, index) => {
                const submitted = submissions[current.id];
                const selected = submitted ? submitted.answers[index] : drafts[current.id]?.[index] ?? -1;
                return (
                  <article className="question" key={question.id}>
                    <h3>Q{index + 1}. {question.q}</h3>
                    <div className="choices">
                      {question.choices.map((choice, choiceIndex) => (
                        <button
                          key={choice}
                          disabled={!!submitted}
                          className={`${selected === choiceIndex ? "selected" : ""} ${submitted && question.answer === choiceIndex ? "correct" : ""} ${submitted && selected === choiceIndex && question.answer !== choiceIndex ? "wrong" : ""}`}
                          onClick={() => choose(current, index, choiceIndex)}
                        >
                          {String.fromCharCode(65 + choiceIndex)}. {choice}
                        </button>
                      ))}
                    </div>
                    {submitted && <div className="feedback">{selected === question.answer ? "正解。" : "不正解。"} {question.explanation}</div>}
                  </article>
                );
              })}
              {!submissions[current.id] ? (
                <button className="primary" disabled={(drafts[current.id] ?? []).filter((answer) => answer >= 0).length !== 5} onClick={() => submitLesson(current)}>
                  5問の解答を送信して得点を確定
                </button>
              ) : (
                <div className="notice">送信済みです。得点はこのブラウザに保存されています。</div>
              )}
            </section>
          </section>
        )}

        {active === "results" && (
          <section className="workspace">
            <button className="back" onClick={() => setActive("home")}>学習マップへ戻る</button>
            <h1>成績・JSON出力</h1>
            <p className="muted">知識問題80点 + 全単元の実験完了20点で総合点を計算します。教員用の保存機能はありません。</p>
            <div className="result-grid">
              <div className="metric"><span>総合点</span><b>{summary.totalScore}</b><small>/100</small></div>
              <div className="metric"><span>確認問題</span><b>{summary.quizCorrect}</b><small>/{summary.quizMax}</small></div>
              <div className="metric"><span>完了単元</span><b>{summary.completedLessons}</b><small>/{summary.lessonCount}</small></div>
            </div>
            <div className="unit-results">
              {lessons.map((lesson) => (
                <div key={lesson.id}>
                  <span>{lesson.no}</span>
                  <b>{lesson.title}</b>
                  <em>{submissions[lesson.id] ? `${submissions[lesson.id].correct}/5` : "未送信"}</em>
                </div>
              ))}
            </div>
            <div className="field notice">
              <label>
                学習の振り返り
                <textarea value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="理解できたこと、まだ説明しにくいこと、次に試したいことを書きましょう。" />
              </label>
            </div>
            <div className="actions">
              <button className="primary" disabled={studentCode.length !== 4} onClick={exportJson}>
                JSONを保存
              </button>
              <span className="muted">{studentCode.length === 4 ? `保存ファイル名: ${studentCode}_ddl_${todayNumber()}.json` : "4桁番号を入力するとJSON出力できます。"}</span>
            </div>
          </section>
        )}
      </div>
      <footer>学習履歴と得点は使用中のブラウザに保存されます。氏名・名簿データは含みません。</footer>
    </main>
  );
}
