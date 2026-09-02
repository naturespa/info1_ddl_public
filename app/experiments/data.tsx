"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  binomialPmf,
  chiSquareTest,
  clamp,
  confidenceInterval,
  correlation,
  correlationLabel,
  covariance,
  fmt,
  geometricMean,
  harmonicMean,
  histogram,
  monteCarloPi,
  movingAverage,
  normalCdf,
  normalPdf,
  parseNumbers,
  regression,
  rollDice,
  summarize,
  tCritical,
  tScore,
  tTest1,
  tTestPaired,
  tTestWelch,
  trendLine,
  weightedMean,
  zCritical,
  zScore,
  zTest
} from "../lib/calc";
import {
  AreaField,
  BarChart,
  BoxPlot,
  DataTable,
  Formula,
  Hint,
  HintButton,
  NormalCurve,
  NumberField,
  RejectionCurve,
  Results,
  Row,
  Scatter,
  SelectField,
  SliderField,
  Steps,
  Tabs,
  TextField,
  Verdict
} from "../lib/ui";
import type { LabProps } from "./digital";

const HEIGHTS = "177,186,163,150,164,161,163,169,177,159,177,186,165,183,154,156,155,188,176,166";
const BREAD = "60,60.01,59.85,60,58.99,59.95,60.02,60.01,59.35,60.36";
const EGGS = "116,117,117,118,117,117,118,116,118,116,118,118,119,120,120";
const EXAM_A = "85,55,47,29,67,47,95,63,59,88";
const EXAM_B = "88,3,22,77,52,96,63,57,44,50";
const TEMPS =
  "10.9,10.6,11.4,11.1,10.6,11.3,10.7,11.3,10.9,12.1,12.7,11.8,11.6,11.1,12.1,11.8,11.2,11.9,12.3,12.4,12.2,11.6,11.8,11.8,12.5,11.7,11.9,12.4,12.3,12,12.3,11.8,12.1,11.9,12,12.7,12.5,11.9,13.2";

const pJudge = (p: number, alpha: number) =>
  p < alpha ? "「たまたま」では説明しにくい（差があるといえる）" : "「たまたま」でも説明できる（差があるとはいえない）";

/** n個からk個を選ぶ組み合わせの数（二項係数）。途中の計算過程を画面に出すために使う */
const combination = (n: number, k: number) => {
  if (k < 0 || k > n) return 0;
  const m = Math.min(k, n - k);
  let c = 1;
  for (let i = 1; i <= m; i++) c = (c * (n - m + i)) / i;
  return c;
};

/** けた数が大きくなっても読める形にそろえる */
const bigFmt = (value: number) =>
  !Number.isFinite(value) ? "-" : value >= 1e12 ? value.toExponential(3) : Math.round(value).toLocaleString("ja-JP");

/** 途中の式を1行に並べる（長すぎるときは省略する） */
const joinList = (parts: (string | number)[], limit = 12, sep = ", ") =>
  parts.length <= limit ? parts.join(sep) : `${parts.slice(0, limit).join(sep)} …`;

/* ========================================================================
 * A1 データの種類と度数分布
 * ====================================================================== */
export function OrganizeLab({ card, missionNote, onMissionNote }: LabProps) {
  const [stage, setStage] = useState("raw");
  const [scale, setScale] = useState("身長 168.5cm");
  const [raw, setRaw] = useState(HEIGHTS);
  const [binWidth, setBinWidth] = useState(10);
  const [start, setStart] = useState(150);
  const [binView, setBinView] = useState("table");
  const [shape, setShape] = useState("bell");
  const [dirty, setDirty] = useState("7, 6.5, , 8, 70, 6.5, -1, 7.5");

  const scales: Record<string, [string, string]> = {
    "身長 168.5cm": ["量的・比例尺度", "差にも比にも意味があるので、平均も標準偏差も計算できます。"],
    "気温 20度": ["量的・間隔尺度", "差には意味がありますが、0度は量のゼロではないので比は使えません。"],
    "満足度 1〜5": ["質的・順序尺度", "順序はありますが、1と2の差が4と5の差と同じとは限りません。"],
    "出席番号 12": ["質的・名義尺度", "識別のための番号なので、足し算や平均に意味はありません。"],
    "血液型 A型": ["質的・名義尺度", "順序のない分類です。最頻値は求められますが平均は求められません。"]
  };
  const values = parseNumbers(raw);
  const bins = histogram(values, binWidth, start);
  const shapes: Record<string, [string, string, number[]]> = {
    bell: ["左右対称型（つり鐘型）", "中心付近が高く、左右対称。安定したデータ。", [1, 3, 7, 12, 15, 12, 7, 3, 1]],
    comb: ["ガタガタ型", "棒の高さが1本おきに大きく変わる形。階級の幅の決め方か、測り方のかたよりを疑います。", [2, 9, 2, 12, 3, 14, 2, 8, 1]],
    skew: ["右すそ引き型", "左が急で右がなだらか。ある値以下を取らないデータ。", [14, 12, 8, 6, 4, 3, 2, 1, 1]],
    cliff: ["左が崖型", "左端だけ飛び抜けて高い形。合格者だけ、など、あらかじめ選ばれた人のデータかもしれません。", [20, 9, 5, 3, 2, 1, 1, 0, 0]],
    twin: ["二山型", "平均の異なる2つの分布が混じっている。元データを分けて確認。", [3, 10, 6, 2, 1, 2, 7, 11, 3]],
    island: ["ぽつんと山型", "端に小さな山がある形。性質のちがうグループのデータが混ざっています。", [2, 8, 14, 10, 4, 1, 0, 3, 2]]
  };
  const dirtyTokens = dirty.split(/[,、\n]/).map((t) => t.trim());
  const checked = dirtyTokens.map((token) => {
    if (token === "" || token === "-") return { token, status: "欠損", action: "原因を確認して記録する" };
    const num = Number(token);
    if (!Number.isFinite(num)) return { token, status: "数値でない", action: "入力形式を確認する" };
    if (num < 0 || num > 24) return { token, status: "範囲外", action: "もとの記録用紙と見くらべる（分と時間を取りちがえていないか）" };
    return { token, status: "正常", action: "分析に使用する" };
  });
  const issues = checked.filter((c) => c.status !== "正常").length;
  const sortedValues = [...values].sort((a, b) => a - b);
  const introBins = histogram(values, 10, 150);
  const lowest = sortedValues[0] ?? 0;
  const highest = sortedValues.at(-1) ?? 0;
  // 「その数字を足していいか」の判定に使う。量的なら平均に意味がある。
  const quantitative = scales[scale][0].startsWith("量的");
  // 相対度数と累積を1例分たどるために、いちばん人数の多い階級を選ぶ
  const exampleIndex = bins.length ? bins.reduce((best, bin, i) => (bin.count > bins[best].count ? i : best), 0) : -1;
  const exampleBin = exampleIndex >= 0 ? bins[exampleIndex] : null;
  const exampleCumulative = exampleBin ? bins.slice(0, exampleIndex + 1).reduce((a, b) => a + b.relative, 0) : 0;
  const stageNote: Record<string, string> = {
    raw: "並んでいるだけでは、多いのか少ないのか、真ん中がどこかも分かりません。",
    sorted: "小さい順に並べただけで、いちばん低い人・高い人・真ん中あたりが見えました。",
    table: "同じ範囲の人を数えてまとめると、どのあたりに人が集まっているかが数で分かります。",
    chart: "グラフにすると、集まっている場所と広がり方が一目で分かります。ここまでが「データの整理」です。"
  };

  return (
    <>
      {card(
        0,
        "バラバラの数字を、意味のある形に変える",
        "同じ20人の身長を、並べ方を変えるだけで何が見えてくるかを確かめます。",
        <>
          <AreaField label="20人の身長(cm)　数字を書きかえてもOK" value={raw} onChange={setRaw} rows={3} />
          <Tabs
            value={stage}
            onChange={setStage}
            options={[
              { value: "raw", label: "① そのまま" },
              { value: "sorted", label: "② 並べる" },
              { value: "table", label: "③ 数える" },
              { value: "chart", label: "④ 図にする" }
            ]}
          />
          {stage === "raw" && (
            <div className="sorted-values">
              {values.map((v, i) => (
                <span key={i}>{v}</span>
              ))}
            </div>
          )}
          {stage === "sorted" && (
            <div className="sorted-values">
              {sortedValues.map((v, i) => (
                <span key={i} className={i === Math.floor(sortedValues.length / 2) ? "hot" : ""}>
                  {v}
                </span>
              ))}
            </div>
          )}
          {stage === "table" && (
            <DataTable
              head={["身長の範囲", "人数"]}
              rows={introBins.map((bin) => [`${bin.from}cm 以上 ${bin.to}cm 未満`, `${bin.count} 人`])}
            />
          )}
          {stage === "chart" && (
            <BarChart values={introBins.map((b) => b.count)} labels={introBins.map((b) => String(b.from))} unit="人" />
          )}
          <Verdict ok>{stageNote[stage]}</Verdict>
          {sortedValues.length > 0 && (
            <>
              <Formula>範囲 ＝ いちばん高い人の身長 − いちばん低い人の身長</Formula>
              <Steps
                items={[
                  {
                    label: "① 小さい順に並べる",
                    value: joinList(sortedValues, 8, ", "),
                    note: `全部で ${sortedValues.length} 人ぶん`
                  },
                  { label: "② 両端を読む", value: `${lowest} cm と ${highest} cm`, note: "並べた列の左端と右端" },
                  { label: "③ 大きいほうから小さいほうを引く", value: `${highest} − ${lowest}` },
                  { label: "④ 範囲", value: `${fmt(highest - lowest, 1)} cm` }
                ]}
              />
            </>
          )}
          <Results
            items={[
              { label: "人数", value: `${values.length} 人`, note: "集めたデータの個数" },
              {
                label: "いちばん低い人",
                value: sortedValues.length ? `${lowest} cm` : "-",
                note: "小さい順に並べた列の左端"
              },
              {
                label: "いちばん高い人",
                value: sortedValues.length ? `${highest} cm` : "-",
                note: "小さい順に並べた列の右端"
              },
              {
                label: "差（範囲）",
                value: sortedValues.length ? `${fmt(highest - lowest, 1)} cm` : "-",
                note: sortedValues.length ? `${highest} − ${lowest}。散らばりのいちばん簡単な表し方` : "データを入れると計算します"
              }
            ]}
          />
          <Hint>
            データは、集めただけでは何も語りません。「並べる → 数える → 図にする」の3手で読めるようになります。この単元では、この3手を自分の手でやります。
          </Hint>
        </>
      )}

      {card(
        1,
        "その数字、足し算していいの？",
        "出席番号を足しても意味がないように、数字でも平均を出していいものと、いけないものがあります。",
        <>
          <SelectField label="データの例" value={scale} onChange={setScale} options={Object.keys(scales).map((value) => ({ value, label: value }))} />
          <Results items={[{ label: scales[scale][0], value: scales[scale][1], note: `「${scale}」はこの尺度です` }]} />
          <Verdict ok={quantitative}>
            {quantitative
              ? `「${scale}」は${scales[scale][0]}です。数の差に意味があるので、足し算をして平均を出してかまいません。`
              : `「${scale}」は${scales[scale][0]}です。足しても平均しても意味がないので、いちばん多い区分（最頻値）を数えて読みます。`}
          </Verdict>
          <DataTable
            head={["尺度", "できること", "例"]}
            rows={[
              ["名義尺度", "分類・最頻値", "血液型、出席番号"],
              ["順序尺度", "＋順序・中央値", "満足度、成績段階"],
              ["間隔尺度", "＋差・平均", "気温(℃)、西暦"],
              ["比例尺度", "＋「何倍か」が言える", "身長、金額、時間"]
            ]}
          />
          <HintButton id="organize-1-1">
            数字が書いてあっても、足したり平均したりしていいとは限りません。背番号10番の選手と20番の選手を足して「平均15番」と言っても何の意味もないのと同じです。例を切りかえながら、「その数字で平均を出したら意味があるか？」を自分に問いかけてみてください。
          </HintButton>
        </>
      )}

      {card(
        2,
        "階級の幅を決めて、表と図をつくる",
        "階級の幅を変えながら、度数分布表とヒストグラムが同時にどう変わるかを確かめます。",
        <>
          <AreaField label="20人の身長(cm)　実験1と同じデータです" value={raw} onChange={setRaw} rows={3} />
          <Row>
            <NumberField label="階級の幅" value={binWidth} onChange={setBinWidth} min={1} max={50} />
            <NumberField label="最初の階級の下限" value={start} onChange={setStart} min={0} max={1000} />
          </Row>
          <Tabs
            value={binView}
            onChange={setBinView}
            options={[
              { value: "table", label: "表で見る" },
              { value: "chart", label: "図で見る" }
            ]}
          />
          {binView === "table" ? (
            <>
              <Formula>
                相対度数 ＝ その階級の人数 ÷ 全体の人数　／　ここまでの割合の合計 ＝ いちばん上の階級からその階級までの相対度数を足す
              </Formula>
              {exampleBin && (
                <Steps
                  items={[
                    {
                      label: "① どの階級を例にするか決める",
                      value: `${exampleBin.from} 以上 ${exampleBin.to} 未満`,
                      note: "いちばん人数の多い階級で試します"
                    },
                    { label: "② その階級に入る人を数える", value: `${exampleBin.count} 人`, note: "これが度数" },
                    { label: "③ 全体の人数で割る", value: `${exampleBin.count} ÷ ${values.length}` },
                    { label: "④ 相対度数", value: fmt(exampleBin.relative, 3), note: "全体の中で何割か" },
                    {
                      label: "⑤ いちばん上の階級からここまでを足す",
                      value: joinList(
                        bins.slice(0, exampleIndex + 1).map((bin) => fmt(bin.relative, 3)),
                        8,
                        " ＋ "
                      )
                    },
                    { label: "⑥ ここまでの割合の合計", value: fmt(exampleCumulative, 3), note: "最後の階級では必ず1になります" }
                  ]}
                />
              )}
              <DataTable
                head={["階級", "階級値", "度数", "相対度数", "ここまでの割合の合計"]}
                rows={bins.map((bin, index) => [
                  `${bin.from} 以上 ${bin.to} 未満`,
                  bin.mid,
                  bin.count,
                  fmt(bin.relative, 3),
                  fmt(bins.slice(0, index + 1).reduce((a, b) => a + b.relative, 0), 3)
                ])}
              />
              <Results
                items={[
                  { label: "データ数", value: values.length, note: "入力した人数。相対度数で割る数" },
                  { label: "階級数", value: bins.length, note: `幅 ${binWidth} で区切ると、柱がこの本数になります` },
                  {
                    label: "度数の合計",
                    value: bins.reduce((a, b) => a + b.count, 0),
                    note: "各階級の人数を足した数。データ数と合えば数え落としなし"
                  },
                  {
                    label: "相対度数の合計",
                    value: fmt(bins.reduce((a, b) => a + b.relative, 0), 3),
                    note: "各階級の割合を足した数。1にならなければ数え落としがあります"
                  }
                ]}
              />
            </>
          ) : (
            <>
              <BarChart values={bins.map((b) => b.count)} labels={bins.map((b) => String(b.from))} unit="人" />
              <Hint>階級の幅を変えると形が変わります。幅が狭すぎるとギザギザに、広すぎると特徴が消えます。</Hint>
            </>
          )}
          <HintButton id="organize-2-1">
            相対度数は「全体の中で何割か」。ここまでの割合の合計は、上の行からそこまでを足し算した「ここまでで何割たまったか」です。階段を1段ずつ上がって、最後は必ず1（＝全員）になります。1にならないときは数え落としがあります。
          </HintButton>
        </>
      )}

      {card(
        3,
        "ヒストグラムの6つの典型",
        "形ごとに、次に疑うべきことが決まっています。",
        <>
          <Tabs value={shape} onChange={setShape} options={Object.entries(shapes).map(([value, [label]]) => ({ value, label }))} />
          <BarChart values={shapes[shape][2]} />
          <Results items={[{ label: shapes[shape][0], value: shapes[shape][1], note: "この形を見たとき、次に疑うこと" }]} />
          <Verdict ok>
            ここは計算をするカードではありません。柱の高さの並び方だけを見て形の名前を決め、その形に結びついた「次に疑うこと」を確かめます。
          </Verdict>
        </>
      )}

      {card(
        4,
        "欠損値・外れ値を点検する",
        "空欄や範囲外の値を、削除せずにまず洗い出します。",
        <>
          <AreaField label="睡眠時間のデータ（1日24時間を超えたら異常）" value={dirty} onChange={setDirty} rows={3} />
          <DataTable
            head={["値", "判定", "処理方針"]}
            rows={checked.map((c) => [c.token || "（空欄）", c.status, c.action])}
            highlight={(index) => checked[index].status !== "正常"}
          />
          <Hint>
            1つずつ値を見て、空欄なら「欠損」、数字として読めなければ「数値でない」、0未満か24より大きければ「範囲外」と判定します。ここで計算はしません。消す前に「なぜその値になったのか」を確かめる場所を決めるのが目的です。
          </Hint>
          <Results
            items={[
              {
                label: "点検が必要な値",
                value: `${issues} 件`,
                note: "欠損・数値でない・範囲外を合わせた件数。原因を確かめる対象",
                warn: issues > 0
              },
              { label: "正常な値", value: `${checked.length - issues} 件`, note: "そのまま分析に使える件数" }
            ]}
          />
        </>
      )}

      {card(
        5,
        "睡眠調査のデータを点検する",
        "見つけた問題を、どう処理するかまで書きます。",
        <AreaField
          label="処理の手順と、その根拠"
          value={missionNote}
          onChange={onMissionNote}
          placeholder="例：70時間は単位の誤り（分で入力した可能性）が疑われるため、原票を確認する。確認できない場合は欠損として扱い、除外した件数と理由を報告に明記する。"
          rows={5}
        />
      )}
    </>
  );
}

/* ========================================================================
 * A2 代表値と四分位数
 * ====================================================================== */
export function CenterLab({ card, missionNote, onMissionNote }: LabProps) {
  const [raw, setRaw] = useState("2,3,3,4,8");
  const [outlier, setOutlier] = useState(8);
  const [classA, setClassA] = useState("58,62,65,67,70,72,74,76,78,95");
  const [classB, setClassB] = useState("40,52,60,68,71,73,79,86,92,96");
  const [prices, setPrices] = useState("550,650,700,800,800");
  const [counts, setCounts] = useState("60,40,25,40,35");
  const [rates, setRates] = useState("1.4,1.357,1.053,1.2,1.25");
  const [speeds, setSpeeds] = useState("10,4");
  const [quartileView, setQuartileView] = useState("number");

  const base = parseNumbers(raw);
  const replaced = [...base.slice(0, -1), outlier];
  const s1 = summarize(base);
  const s2 = summarize(replaced);
  const a = summarize(classA);
  const b = summarize(classB);
  // 2つの箱ひげ図は同じ目盛りで並べないと比べられない
  const boxDomain: [number, number] | undefined =
    a && b ? [Math.min(a.min, b.min), Math.max(a.max, b.max)] : undefined;
  const priceValues = parseNumbers(prices);
  const countValues = parseNumbers(counts);
  const rateValues = parseNumbers(rates);
  const speedValues = parseNumbers(speeds);

  // 中央値が「並べたときの何番目か」を、画面でたどれるようにする
  const medianPos = s1 ? (s1.n % 2 === 1 ? `${(s1.n + 1) / 2}番目` : `${s1.n / 2}番目と${s1.n / 2 + 1}番目`) : "-";
  const medianCalc = s1
    ? s1.n % 2 === 1
      ? `${s1.values[(s1.n - 1) / 2]}`
      : `(${s1.values[s1.n / 2 - 1]} ＋ ${s1.values[s1.n / 2]}) ÷ 2`
    : "-";
  const modeCount = s1 && s1.modes.length ? s1.values.filter((v) => v === s1.modes[0]).length : 0;

  // 最後の値を入れ替えたとき、平均が動く分は「差 ÷ 個数」で説明できる
  const originalLast = base.length ? base[base.length - 1] : 0;
  const meanShift = base.length ? (outlier - originalLast) / base.length : 0;

  // 幾何平均・調和平均の途中経過
  const rateProduct = rateValues.reduce((x, y) => x * y, 1);
  const rateArithmetic = rateValues.length ? rateValues.reduce((x, y) => x + y, 0) / rateValues.length : NaN;
  const speedArithmetic = speedValues.length ? speedValues.reduce((x, y) => x + y, 0) / speedValues.length : NaN;
  const speedReciprocalSum = speedValues.reduce((a, v) => a + (v === 0 ? 0 : 1 / v), 0);
  const speedReciprocalMean = speedValues.length ? speedReciprocalSum / speedValues.length : NaN;

  return (
    <>
      {card(
        0,
        "平均・中央値・最頻値を求める",
        "データを入力して、3つの代表値を同時に比べます。",
        <>
          <AreaField label="データを入力" value={raw} onChange={setRaw} rows={2} />
          {s1 && (
            <>
              <Formula>
                平均値 ＝ 全部の合計 ÷ 個数　／　中央値 ＝ 小さい順に並べたときのまん中の値　／　最頻値 ＝ いちばん多く出てくる値
              </Formula>
              <Steps
                items={[
                  { label: "① 全部を足す", value: fmt(s1.sum, 2), note: joinList(s1.values, 10, " ＋ ") },
                  { label: "② 個数で割る", value: `${fmt(s1.sum, 2)} ÷ ${s1.n}` },
                  { label: "③ 平均値", value: fmt(s1.mean, 3) },
                  { label: "④ 小さい順に並べる", value: joinList(s1.values, 10, ", ") },
                  { label: "⑤ まん中の位置を数える", value: medianPos, note: s1.n % 2 === 0 ? "個数が偶数なので2つある" : "個数が奇数なので1つに決まる" },
                  { label: "⑥ その値（2つあるときは平均する）", value: medianCalc },
                  { label: "⑦ 中央値", value: fmt(s1.median, 3) },
                  {
                    label: "⑧ 同じ値がいくつあるか数える",
                    value: s1.modes.length ? `${s1.modes.join(", ")} が ${modeCount} 回` : "どの値も1回ずつ"
                  },
                  { label: "⑨ 最頻値", value: s1.modes.length ? s1.modes.join(", ") : "なし" }
                ]}
              />
              <Results
                items={[
                  { label: "平均値", value: fmt(s1.mean, 3), note: `合計 ${fmt(s1.sum, 2)} ÷ 個数 ${s1.n}。全部の値を使った中心` },
                  { label: "中央値", value: fmt(s1.median, 3), note: `小さい順に並べて ${medianPos} の値。順位だけで決まる中心` },
                  {
                    label: "最頻値",
                    value: s1.modes.length ? s1.modes.join(", ") : "なし",
                    note: s1.modes.length ? `${modeCount} 回出てきた、いちばん多い値` : "同じ値が2つ以上ないときは決まりません"
                  },
                  { label: "範囲", value: `${s1.min} 〜 ${s1.max}`, note: `${s1.max} − ${s1.min} ＝ ${fmt(s1.range, 2)}（レンジ）` }
                ]}
              />
              <div className="sorted-values">
                {s1.values.map((v, i) => (
                  <span key={i} className={v === s1.median ? "hot" : ""}>{v}</span>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {card(
        1,
        "外れ値を入れ替えて影響を見る",
        "いちばん大きい値だけを変えて、平均と中央値の動きを比べます。",
        <>
          <SliderField label="最大値を変える" value={outlier} onChange={setOutlier} min={0} max={200} />
          {s1 && s2 && (
            <>
              <Formula>
                平均値の動く分 ＝ (入れ替えたあとの値 − もとの値) ÷ 個数　／　中央値は順位で決まるので、まん中の順位が入れかわらなければ動かない
              </Formula>
              <Steps
                items={[
                  { label: "① もとの値", value: originalLast, note: "いちばん最後（この例では最大）の値" },
                  { label: "② 入れ替えたあとの値", value: outlier },
                  { label: "③ どれだけ増えた（減った）か", value: `${outlier} − ${originalLast} ＝ ${fmt(outlier - originalLast, 2)}` },
                  { label: "④ 個数で割る", value: `÷ ${base.length}`, note: "増えた分は全員で山分けされる" },
                  { label: "⑤ 平均値の動く分", value: fmt(meanShift, 3) },
                  {
                    label: "⑥ 変更後の平均値",
                    value: `${fmt(s1.mean, 3)} ${meanShift >= 0 ? "＋" : "−"} ${fmt(Math.abs(meanShift), 3)} ＝ ${fmt(s2.mean, 3)}`
                  },
                  {
                    label: "⑦ まん中の順位はどうなったか",
                    value: s1.median === s2.median ? "変わらない" : "入れかわった",
                    note: s1.median === s2.median ? "だから中央値は動きません" : "だから中央値も動きました"
                  }
                ]}
              />
              <Results
                items={[
                  { label: "平均値（元）", value: fmt(s1.mean, 3), note: "入れ替える前の平均値" },
                  {
                    label: "平均値（変更後）",
                    value: fmt(s2.mean, 3),
                    note: `動いた分 ${fmt(meanShift, 3)}（差 ${fmt(outlier - originalLast, 2)} ÷ 個数 ${base.length}）`,
                    warn: Math.abs(s2.mean - s1.mean) > 1
                  },
                  { label: "中央値（元）", value: fmt(s1.median, 3), note: "並べたときのまん中の値" },
                  {
                    label: "中央値（変更後）",
                    value: fmt(s2.median, 3),
                    note: s1.median === s2.median ? "まん中の順位が変わらないので動きません" : "まん中の順位が入れかわったので動きました"
                  }
                ]}
              />
              <Hint>平均はすべての値を使うので大きく動きます。中央値は順位で決まるので、ほとんど動きません。</Hint>
            </>
          )}
        </>
      )}

      {card(
        2,
        "四分位数を求めて、箱ひげ図で2クラスを比べる",
        "小さい順に並べて、4分の1・半分・4分の3のところに立っている人の値を求めます。",
        <>
          <Row>
            <AreaField label="1組の得点" value={classA} onChange={setClassA} rows={2} />
            <AreaField label="2組の得点" value={classB} onChange={setClassB} rows={2} />
          </Row>
          <Tabs
            value={quartileView}
            onChange={setQuartileView}
            options={[
              { value: "number", label: "数で見る（五数要約・IQR・外れ値の目安）" },
              { value: "figure", label: "図で見る（箱ひげ図＋比較表）" }
            ]}
          />
          {quartileView === "number"
            ? a && (
                <>
                  <Formula>Excelの QUARTILE.INC と同じ計算です（数学Ⅰで習う求め方とは、値が少しちがうことがあります）</Formula>
                  <Steps
                    items={[
                      { label: "最小値", value: fmt(a.min, 2), note: "小さい順に並べた列の左端の値" },
                      { label: "第1四分位数 Q1", value: fmt(a.q1, 2), note: "キューワン。下から4分の1の位置に立つ人の値" },
                      { label: "中央値 Q2", value: fmt(a.q2, 2), note: "キューツー。ちょうどまん中に立つ人の値" },
                      { label: "第3四分位数 Q3", value: fmt(a.q3, 2), note: "キューサン。下から4分の3の位置に立つ人の値" },
                      { label: "最大値", value: fmt(a.max, 2), note: "小さい順に並べた列の右端の値" }
                    ]}
                  />
                  <Results
                    items={[
                      { label: "四分位範囲 IQR", value: fmt(a.iqr, 3), note: "アイキューアール。Q3 − Q1。まん中50%が入る幅" },
                      { label: "四分位偏差", value: fmt(a.qd, 3), note: "IQR ÷ 2。まん中50%の幅の半分にあたる" },
                      {
                        label: "この値より小さいと外れ値かも",
                        value: fmt(a.lowerFence, 2),
                        note: "Q1 − 1.5×IQR。これより下は原因を確かめる"
                      },
                      {
                        label: "この値より大きいと外れ値かも",
                        value: fmt(a.upperFence, 2),
                        note: "Q3 ＋ 1.5×IQR。これより上は原因を確かめる"
                      }
                    ]}
                  />
                  {a.outliers.length > 0 && (
                    <Verdict ok={false}>外れ値の候補: {a.outliers.join(", ")} — 削除する前に原因を確認しましょう。</Verdict>
                  )}
                </>
              )
            : (
                <>
                  {a && <div className="box-row"><span>1組</span><BoxPlot summary={a} domain={boxDomain} /></div>}
                  {b && <div className="box-row"><span>2組</span><BoxPlot summary={b} domain={boxDomain} /></div>}
                  {a && b && (
                    <DataTable
                      head={["", "平均値", "中央値", "Q1", "Q3", "IQR", "範囲"]}
                      rows={[
                        ["1組", fmt(a.mean, 2), fmt(a.q2, 2), fmt(a.q1, 2), fmt(a.q3, 2), fmt(a.iqr, 2), fmt(a.range, 2)],
                        ["2組", fmt(b.mean, 2), fmt(b.q2, 2), fmt(b.q1, 2), fmt(b.q3, 2), fmt(b.iqr, 2), fmt(b.range, 2)]
                      ]}
                    />
                  )}
                </>
              )}
          <HintButton id="center-2-1">
            Q1・Q2・Q3 は、全員を背の順に並べたときの「4分の1の人」「まん中の人」「4分の3の人」の値です。Q1からQ3までの間に、ちょうど全体の半分が入っています。箱の左端がQ1、中の線が中央値、右端がQ3で、この箱が細いクラスは「みんな似ている」、太いクラスは「差が大きい」と読めます。
          </HintButton>
        </>
      )}

      {card(
        3,
        "加重平均を求める",
        "よく売れた商品とあまり売れなかった商品を同じ扱いにすると、平均の値段はずれます。",
        <>
          <Row>
            <TextField label="価格（円）" value={prices} onChange={setPrices} />
            <TextField label="販売数" value={counts} onChange={setCounts} />
          </Row>
          <Formula>
            加重平均 ＝ Σ(価格 × 販売数) ÷ Σ販売数　　Σ（シグマ）は「ぜんぶ足す」という意味の記号です
          </Formula>
          <Steps
            items={[
              {
                label: "① 1行ずつ 価格 × 販売数 を計算する",
                value: joinList(
                  priceValues.map((p, i) => fmt(p * (countValues[i] ?? 0), 0)),
                  8,
                  " ＋ "
                )
              },
              {
                label: "② ぜんぶ足す（総売上）",
                value: fmt(priceValues.reduce((sum, p, i) => sum + p * (countValues[i] ?? 0), 0), 0)
              },
              { label: "③ 販売数もぜんぶ足す", value: fmt(countValues.reduce((x, y) => x + y, 0), 0) },
              {
                label: "④ 売上を販売数で割る",
                value: `${fmt(priceValues.reduce((sum, p, i) => sum + p * (countValues[i] ?? 0), 0), 0)} ÷ ${fmt(countValues.reduce((x, y) => x + y, 0), 0)}`
              },
              { label: "⑤ 加重平均", value: fmt(weightedMean(priceValues, countValues), 2) }
            ]}
          />
          <DataTable
            head={["価格", "販売数", "価格×販売数"]}
            rows={priceValues.map((p, i) => [p, countValues[i] ?? 0, fmt(p * (countValues[i] ?? 0), 0)])}
          />
          <Results
            items={[
              {
                label: "単純平均（誤り）",
                value: fmt(priceValues.reduce((x, y) => x + y, 0) / (priceValues.length || 1), 2),
                note: "価格だけを足して個数で割った値。売れ行きを無視している"
              },
              {
                label: "加重平均（正しい）",
                value: fmt(weightedMean(priceValues, countValues), 2),
                note: "実際に売れた1食あたりの平均単価"
              },
              {
                label: "総売上",
                value: fmt(priceValues.reduce((sum, p, i) => sum + p * (countValues[i] ?? 0), 0), 0),
                note: "Σ(価格 × 販売数)。割り算の上にくる数"
              },
              {
                label: "総販売数",
                value: fmt(countValues.reduce((x, y) => x + y, 0), 0),
                note: "Σ販売数。割り算の下にくる数"
              }
            ]}
          />
          <HintButton id="center-3-1">
            550円が60食、700円が25食売れたなら、安いほうが2倍以上多く出ています。3つの値段をただ足して割ると、ほとんど売れていない700円を「よく売れた550円と同じ重さ」で数えることになります。人気投票で、1人しかいない部活と40人いる部活を1票ずつにするようなものです。
          </HintButton>
        </>
      )}

      {card(
        4,
        "幾何平均と調和平均を使い分ける",
        "「毎年何倍にふえたか」の平均と、「時速」の平均は、ふつうの平均では出せません。",
        <>
          <TextField label="毎年の売上倍率（1.4なら40%増）" value={rates} onChange={setRates} />
          <Formula>幾何平均 ＝ すべての倍率をかけて、個数ぶんの乗根（n乗根）をとる</Formula>
          <Steps
            items={[
              { label: "① 倍率をぜんぶかける", value: fmt(rateProduct, 4), note: joinList(rateValues, 8, " × ") },
              { label: "② 何個ぶんかを数える", value: `${rateValues.length} 個` },
              { label: "③ その個数ぶんの乗根をとる", value: `${fmt(rateProduct, 4)} の ${rateValues.length} 乗根` },
              { label: "④ 幾何平均", value: fmt(geometricMean(rateValues), 4) },
              {
                label: "⑤ 単純平均と見くらべる",
                value: `${fmt(rateArithmetic, 4)} − ${fmt(geometricMean(rateValues), 4)} ＝ ${fmt(rateArithmetic - geometricMean(rateValues), 4)}`,
                note: "単純平均のほうが大きく出ます"
              }
            ]}
          />
          <Results
            items={[
              {
                label: "算術平均（誤り）",
                value: fmt(rateArithmetic, 4),
                note: "倍率を足して割った値。この倍率を毎年かけても実際の売上には戻りません"
              },
              {
                label: "幾何平均（正しい）",
                value: fmt(geometricMean(rateValues), 4),
                note: "この倍率を毎年かけると、実際と同じところに着きます"
              },
              {
                label: "平均伸び率",
                value: `${fmt((geometricMean(rateValues) - 1) * 100, 2)} %`,
                note: "幾何平均から1を引いて100倍した値。1年あたり何%伸びたか"
              },
              {
                label: `${rateValues.length}年後の倍率`,
                value: fmt(rateProduct, 4),
                note: "①でかけ合わせた値そのもの。最初の売上の何倍になったか"
              }
            ]}
          />
          <TextField label="往路と復路の時速（km/h）" value={speeds} onChange={setSpeeds} />
          <Formula>調和平均 ＝ 個数 ÷ (それぞれの逆数の合計)　＝「逆数の平均」をとって、その逆数に戻した値</Formula>
          <Steps
            items={[
              {
                label: "① それぞれを逆数にする",
                value: joinList(
                  speedValues.map((v) => fmt(1 / v, 4)),
                  6,
                  " , "
                ),
                note: joinList(
                  speedValues.map((v) => `1 ÷ ${v}`),
                  6,
                  " , "
                )
              },
              { label: "② 逆数をぜんぶ足す", value: fmt(speedReciprocalSum, 4) },
              { label: "③ 個数で割る（逆数の平均）", value: `${fmt(speedReciprocalSum, 4)} ÷ ${speedValues.length} ＝ ${fmt(speedReciprocalMean, 4)}` },
              { label: "④ その逆数に戻す", value: `1 ÷ ${fmt(speedReciprocalMean, 4)}` },
              { label: "⑤ 調和平均", value: `${fmt(harmonicMean(speedValues), 3)} km/h` },
              {
                label: "⑥ 単純平均と見くらべる",
                value: `${fmt(speedArithmetic, 3)} − ${fmt(harmonicMean(speedValues), 3)} ＝ ${fmt(speedArithmetic - harmonicMean(speedValues), 3)} km/h`
              }
            ]}
          />
          <Results
            items={[
              {
                label: "算術平均（誤り）",
                value: `${fmt(speedArithmetic, 3)} km/h`,
                note: "時速を足して割った値。かかった時間の違いを数えていない"
              },
              {
                label: "調和平均（正しい）",
                value: `${fmt(harmonicMean(speedValues), 3)} km/h`,
                note: "往復にかかった時間から出した、本当の平均時速"
              }
            ]}
          />
          <Hint>同じ距離を往復するとき、遅いほうに時間が多くかかるため、平均時速は単純平均より小さくなります。</Hint>
        </>
      )}

      {card(
        5,
        "平均が同じ2クラスを比較する",
        "中心とばらつきの両方を使って説明します。",
        <AreaField
          label="2クラスの違いと、その根拠"
          value={missionNote}
          onChange={onMissionNote}
          placeholder="例：平均はほぼ同じだが、1組のIQRは11、2組は26で2組のばらつきが大きい。1組は中位層に集中し、2組は上下に分かれている。指導は、1組は全体に、2組は層別に行うのが有効。"
          rows={5}
        />
      )}
    </>
  );
}

/* ========================================================================
 * A3 分散・標準偏差・偏差値
 * ====================================================================== */
export function SpreadLab({ card, missionNote, onMissionNote }: LabProps) {
  const [raw, setRaw] = useState("62,68,71,72,75,78,81,95");
  const [groupA, setGroupA] = useState("48,49,50,51,52");
  const [groupB, setGroupB] = useState("30,40,50,60,70");
  const [groupC, setGroupC] = useState("50,50,50,50,50");
  /** 2クラスで比べるか、3クラスで比べるか */
  const [classCount, setClassCount] = useState("2");
  const [score, setScore] = useState(80);
  const [mean, setMean] = useState(60);
  const [sd, setSd] = useState(10);
  const [jScore, setJScore] = useState(70);
  const [jMean, setJMean] = useState(65);
  const [jSd, setJSd] = useState(8);
  const [mScore, setMScore] = useState(60);
  const [mMean, setMMean] = useState(50);
  const [mSd, setMSd] = useState(15);
  const [spreadView, setSpreadView] = useState("deviation");

  const s = summarize(raw);
  const a = summarize(groupA);
  const b = summarize(groupB);
  const c = summarize(groupC);
  const three = classCount === "3";
  const z = zScore(score, mean, sd);
  const jz = zScore(jScore, jMean, jSd);
  const mz = zScore(mScore, mMean, mSd);

  return (
    <>
      {card(
        0,
        "同じ平均なのに、まるで様子が違う2クラス",
        "平均点が同じクラス同士を比べます。タブで2クラス・3クラスを切り替え、数字を書きかえて、平均では見えない違いを探します。",
        <>
          <Tabs
            value={classCount}
            onChange={setClassCount}
            options={[
              { value: "2", label: "2クラスで比べる" },
              { value: "3", label: "3クラスで比べる" }
            ]}
          />
          <Row>
            <TextField label="1組の得点" value={groupA} onChange={setGroupA} />
            <TextField label="2組の得点" value={groupB} onChange={setGroupB} />
            {three && <TextField label="3組の得点" value={groupC} onChange={setGroupC} />}
          </Row>
          {a && b && (!three || c) && (
            <>
              <BarChart
                values={three && c ? [...a.values, ...b.values, ...c.values] : [...a.values, ...b.values]}
                labels={
                  three && c
                    ? [...a.values.map(() => "1組"), ...b.values.map(() => "2組"), ...c.values.map(() => "3組")]
                    : [...a.values.map(() => "1組"), ...b.values.map(() => "2組")]
                }
                highlight={(index) => index >= a.values.length}
                series={
                  three && c
                    ? (index) => (index < a.values.length ? 0 : index < a.values.length + b.values.length ? 1 : 2)
                    : undefined
                }
                tone="compare"
                unit={three ? "点（左から1組・2組・3組。同じものさしで並べています）" : "点（左が1組・右が2組。同じものさしで並べています）"}
              />
              <DataTable
                head={["", "平均", "いちばん低い〜高い", "分散", "標準偏差"]}
                rows={[
                  ["1組", fmt(a.mean, 2), `${a.min}〜${a.max}`, fmt(a.variance, 2), fmt(a.sd, 3)],
                  ["2組", fmt(b.mean, 2), `${b.min}〜${b.max}`, fmt(b.variance, 2), fmt(b.sd, 3)],
                  ...(three && c ? [["3組", fmt(c.mean, 2), `${c.min}〜${c.max}`, fmt(c.variance, 2), fmt(c.sd, 3)]] : [])
                ]}
              />
              <Verdict ok={Math.abs(a.mean - b.mean) < 0.001 && (!three || !c || Math.abs(a.mean - c.mean) < 0.001)}>
                {Math.abs(a.mean - b.mean) < 0.001 && (!three || !c || Math.abs(a.mean - c.mean) < 0.001)
                  ? three && c
                    ? `平均は3クラスとも ${fmt(a.mean, 2)} 点。それでも1組は ${a.min}〜${a.max} 点、2組は ${b.min}〜${b.max} 点、3組は ${c.min}〜${c.max} 点で、開き方がまるでちがいます。標準偏差はそれぞれ ${fmt(a.sd, 2)} ／ ${fmt(b.sd, 2)} ／ ${fmt(c.sd, 2)} です。3組のように全員が同じ点なら、標準偏差は0になります。`
                    : `平均はどちらも ${fmt(a.mean, 2)} 点。それでも1組は ${a.min}〜${a.max} 点に収まり、2組は ${b.min}〜${b.max} 点まで開いています。この「散らばり具合」を1つの数で表したのが標準偏差で、${fmt(a.sd, 2)} と ${fmt(b.sd, 2)} で ${fmt(b.sd / (a.sd || 1), 1)} 倍の差があります。`
                  : "まず平均をそろえてみましょう。平均が同じでも中身が違うことが、この単元の出発点です。"}
              </Verdict>
              <Hint>
                平均だけを見て「同じくらいのクラス」と判断すると、実態を取りちがえます。この単元では、その「散らばり」を数で表す方法を組み立てていきます。
              </Hint>
            </>
          )}
        </>
      )}

      {card(
        1,
        "偏差から分散・標準偏差を組み立てる",
        "平均からのずれを出し、それを2乗して平均すると、ばらつきが1つの数になります。",
        <>
          <AreaField label="データを入力" value={raw} onChange={setRaw} rows={2} />
          <Tabs
            value={spreadView}
            onChange={setSpreadView}
            options={[
              { value: "deviation", label: "偏差を出す" },
              { value: "variance", label: "2乗して平均する（分散・標準偏差）" }
            ]}
          />
          {s &&
            (spreadView === "deviation" ? (
              <>
                <DataTable
                  head={["値", "偏差（値 − 平均）", "偏差の2乗"]}
                  rows={s.values.map((v) => [v, fmt(v - s.mean, 3), fmt((v - s.mean) ** 2, 3)])}
                />
                <Results
                  items={[
                    { label: "平均", value: fmt(s.mean, 4), note: "この値を基準にして、各データのずれ（偏差）をはかる" },
                    { label: "偏差の合計", value: fmt(s.values.reduce((acc, v) => acc + (v - s.mean), 0), 10), note: "必ず0になる。だからこのままでは使えない" },
                    {
                      label: "偏差の2乗の合計",
                      value: fmt(s.values.reduce((acc, v) => acc + (v - s.mean) ** 2, 0), 3),
                      note: "上の表のいちばん右の列を足した値。これをnで割ると分散"
                    }
                  ]}
                />
                <HintButton id="spread-1-2">偏差をそのまま足すと必ず0。だから2乗してから平均をとります。</HintButton>
              </>
            ) : (
              <>
                <Formula>
                  分散 ＝ Σ(値 − 平均)² ÷ n　／　標準偏差 ＝ √分散　　Σ（シグマ）は「ぜんぶ足す」、n はデータの個数です
                </Formula>
                <Steps
                  items={[
                    { label: "① 偏差を2乗して、ぜんぶ足す", value: fmt(s.variance * s.n, 4) },
                    { label: "② データ数で割る", value: `÷ ${s.n}` },
                    { label: "③ 分散（いま手元にある全員を対象とした場合）", value: fmt(s.variance, 4), note: "単位は「点の2乗」になっている" },
                    { label: "④ 平方根をとって単位を戻す", value: `√${fmt(s.variance, 4)}` },
                    { label: "⑤ 標準偏差", value: fmt(s.sd, 4), note: "元のデータと同じ単位に戻った" }
                  ]}
                />
                <Results
                  items={[
                    { label: "分散 VAR.P", value: fmt(s.variance, 4), note: "手順③の値。単位が「点の2乗」のままの散らばり" },
                    { label: "標準偏差 STDEV.P", value: fmt(s.sd, 4), note: "手順⑤の値。平均からこれくらい離れているのがふつう" },
                    {
                      label: "不偏分散（n−1で割る／一部から全体を推定するとき用）",
                      value: fmt(s.uVariance, 4),
                      note: "nではなくn−1で割った値。全体を少し広めに見積もる"
                    },
                    {
                      label: "不偏標準偏差 STDEV.S（標本用）",
                      value: fmt(s.uSd, 4),
                      note: "記号は s（エス）。標本から全体のばらつきを見積もった値"
                    }
                  ]}
                />
              </>
            ))}
          <HintButton id="spread-1-1">
            画面に4つ数字が出ますが、まず見るのは上の2つ（分散・標準偏差）だけで十分です。下の「不偏」がつくほうは、全員ではなく一部の人しか測れなかったときに、全体を推測するための値です。学校の身体測定は全員ぶんあるので上の2つ、街頭アンケート100人ぶんなら下の2つ、と覚えてください。
          </HintButton>
        </>
      )}

      {card(
        2,
        "z得点を求める",
        "平均から標準偏差いくつ分離れているかを計算します。",
        <>
          <Row>
            <NumberField label="得点" value={score} onChange={setScore} />
            <NumberField label="平均" value={mean} onChange={setMean} />
            <NumberField label="標準偏差" value={sd} onChange={setSd} min={0.1} step={0.1} />
          </Row>
          <Formula>z ＝ (値 − 平均) ÷ 標準偏差　　平均から標準偏差いくつ分はなれているか</Formula>
          <Steps
            items={[
              { label: "① 得点から平均を引く", value: `${score} − ${mean} ＝ ${fmt(score - mean, 3)}` },
              { label: "② 標準偏差で割る", value: `÷ ${sd}`, note: "ものさしの目盛りを標準偏差1個ぶんに取りかえる" },
              { label: "③ z得点", value: fmt(z, 4) }
            ]}
          />
          <NormalCurve mean={0} sd={1} marks={[{ value: clamp(z, -3.8, 3.8), label: `z=${fmt(z, 2)}` }]} />
          <HintButton id="spread-2-1">
            z得点は「平均から、標準偏差何個ぶん離れているか」を表す数です。ものさしの目盛りを cm から「標準偏差1個ぶん」に取りかえるイメージです。z＝0なら平均ちょうど、z＝2なら平均より標準偏差2個ぶん上、ということです。
          </HintButton>
        </>
      )}

      {card(
        3,
        "偏差値に直す",
        "z得点を平均50・標準偏差10に変換します。",
        <>
          <Formula>偏差値 ＝ 50 ＋ 10 × z　　平均を50、標準偏差1個ぶんを10点として置きなおす</Formula>
          <Steps
            items={[
              { label: "① 前の実験で求めたz得点", value: fmt(z, 4) },
              { label: "② 10倍する", value: `10 × ${fmt(z, 4)} ＝ ${fmt(10 * z, 3)}` },
              { label: "③ 50を足す", value: `50 ＋ ${fmt(10 * z, 3)}` },
              { label: "④ 偏差値", value: fmt(tScore(score, mean, sd), 2) }
            ]}
          />
          <Results
            items={[
              { label: "z得点", value: fmt(z, 4), note: "平均から標準偏差いくつ分はなれているか" },
              { label: "偏差値", value: fmt(tScore(score, mean, sd), 2), note: "50 ＋ 10 × z に置きなおした値" },
              {
                label: "上位から",
                value: `${fmt((1 - normalCdf(z)) * 100, 2)} %`,
                note: "正規分布とみなしたとき、カーブのこの位置より右側にある面積"
              },
              {
                label: "同じ位置の人数（300人中）",
                value: `${fmt((1 - normalCdf(z)) * 300, 1)} 人`,
                note: "上位の割合 × 300人。だいたい何位かの目安"
              }
            ]}
          />
          <HintButton id="spread-3-1">偏差値60はz=1、上位約15.9%。偏差値70はz=2、上位約2.3%です。</HintButton>
        </>
      )}

      {card(
        4,
        "2教科の得点を公平に比べる",
        "平均も標準偏差も違う2教科を、同じ基準で比べ直します。",
        <>
          <div className="two-column">
            <div>
              <h4>国語</h4>
              <NumberField label="得点" value={jScore} onChange={setJScore} />
              <NumberField label="平均" value={jMean} onChange={setJMean} />
              <NumberField label="標準偏差" value={jSd} onChange={setJSd} min={0.1} step={0.1} />
            </div>
            <div>
              <h4>数学</h4>
              <NumberField label="得点" value={mScore} onChange={setMScore} />
              <NumberField label="平均" value={mMean} onChange={setMMean} />
              <NumberField label="標準偏差" value={mSd} onChange={setMSd} min={0.1} step={0.1} />
            </div>
          </div>
          <DataTable
            head={["教科", "得点", "平均", "標準偏差", "z得点", "偏差値"]}
            rows={[
              ["国語", jScore, jMean, jSd, fmt(jz, 3), fmt(50 + 10 * jz, 2)],
              ["数学", mScore, mMean, mSd, fmt(mz, 3), fmt(50 + 10 * mz, 2)]
            ]}
          />
          <Verdict ok={jz !== mz}>
            {jz > mz
              ? `クラスの中での位置は、国語のほうが上です（偏差値 ${fmt(50 + 10 * jz, 1)} 対 ${fmt(50 + 10 * mz, 1)}）。`
              : jz < mz
                ? `クラスの中での位置は、数学のほうが上です（偏差値 ${fmt(50 + 10 * mz, 1)} 対 ${fmt(50 + 10 * jz, 1)}）。`
                : "どちらも同じ位置です。"}
          </Verdict>
          <Hint>テストの点そのものは国語70・数学60でも、平均とばらつきをそろえて比べ直すと、数学のほうが上になることがあります。</Hint>
        </>
      )}

      {card(
        5,
        "2教科の得点を公平に比べる（まとめ）",
        "計算結果をもとに、どちらが良かったかを説明します。",
        <AreaField
          label="判断と、その根拠"
          value={missionNote}
          onChange={onMissionNote}
          placeholder="例：素点は国語70・数学60だが、標準偏差が国語8・数学15と違うため、z得点は国語0.63・数学0.67。集団内の位置では数学のほうがわずかに上といえる。"
          rows={4}
        />
      )}
    </>
  );
}

/* ========================================================================
 * A4 確率分布と正規分布
 * ====================================================================== */
export function NormalLab({ card, missionNote, onMissionNote }: LabProps) {
  const [n, setN] = useState(10);
  const [p, setP] = useState(0.5);
  const [mean, setMean] = useState(50);
  const [sd, setSd] = useState(10);
  const [target, setTarget] = useState(70);
  const [population, setPopulation] = useState(300);

  const pmf = Array.from({ length: n + 1 }, (_, k) => binomialPmf(n, k, p));
  const z = zScore(target, mean, sd);
  const upper = 1 - normalCdf(z);
  // 二項分布の1点の確率を、1例だけ手計算どおりにたどる
  const kExample = pmf.indexOf(Math.max(...pmf));
  const combExample = combination(n, kExample);
  const hitPart = p ** kExample;
  const missPart = (1 - p) ** (n - kExample);

  return (
    <>
      {card(
        0,
        "回数を増やすと、なぜ釣り鐘型になるのか",
        "くじを引く回数と当たる確率を自分で変えて、形の変わり方を追いかけます。",
        <>
          <Row>
            <NumberField label="くじを引く回数 n" value={n} onChange={(v) => setN(clamp(Math.round(v), 1, 60))} min={1} max={60} unit="回" hint="5 → 20 → 60 と増やしてみる" />
            <NumberField label="1回で当たる確率 p" value={p} onChange={(v) => setP(clamp(v, 0.01, 0.99))} min={0.01} max={0.99} step={0.01} hint="0.5なら五分五分" />
          </Row>
          <BarChart values={pmf} labels={pmf.map((_, k) => (n <= 20 || k % 5 === 0 ? String(k) : ""))} />
          <Formula>
            k回当たる確率 ＝ (n回のうちk回を選ぶ組み合わせの数) × p の k乗 × (1−p) の (n−k)乗
          </Formula>
          <Steps
            items={[
              { label: "① どの回数の棒を計算するか決める", value: `${n}回中 ${kExample}回 当たる場合`, note: "いちばん高い棒で試します" },
              {
                label: "② どの回が当たりかの選び方を数える",
                value: `${bigFmt(combExample)} 通り`,
                note: `${n}回のうち${kExample}回を選ぶ組み合わせ`
              },
              { label: "③ 当たる側の確率をかけ合わせる", value: fmt(hitPart, 6), note: `${p} を ${kExample} 回かける` },
              { label: "④ 外れる側の確率もかけ合わせる", value: fmt(missPart, 6), note: `${fmt(1 - p, 2)} を ${n - kExample} 回かける` },
              {
                label: "⑤ ②③④をかける",
                value: `${fmt(binomialPmf(n, kExample, p) * 100, 2)} %`,
                note: "この1本の棒の高さになります"
              }
            ]}
          />
          <Results
            items={[
              { label: "期待値 n×p", value: fmt(n * p, 2), note: `${n}回 × ${p}。平均して何回当たるか` },
              {
                label: "ばらつき（標準偏差）",
                value: fmt(Math.sqrt(n * p * (1 - p)), 3),
                note: "√(n×p×(1−p))。当たる回数が期待値からどれだけ散らばるか"
              },
              { label: "最も確率が高い回数", value: kExample, note: "棒がいちばん高いところ" },
              { label: "その確率", value: `${fmt(Math.max(...pmf) * 100, 2)} %`, note: "上の①〜⑤で計算した、その1本ぶんの高さ" }
            ]}
          />
          <Hint>
            nを5・20・60と増やしてみてください。棒はどんどん細かくなり、左右対称の釣り鐘型に近づきます。世の中の身長やテストの点が釣り鐘型になりやすいのは、たくさんの小さな要因が積み重なった結果だからです。この形の理想形が、次に出てくる正規分布です。
          </Hint>
        </>
      )}

      {card(
        1,
        "μとσで山を動かし、その山の上で自分の位置を求める",
        "平均μと標準偏差σを動かすと、山の位置と太さが変わります。同じ山の上で、自分の得点が上位何%かまで一気に求めます。",
        <>
          <Row>
            <NumberField label="平均 μ" value={mean} onChange={(v) => setMean(clamp(Math.round(v), 10, 90))} min={10} max={90} hint="山の位置" />
            <NumberField label="標準偏差 σ" value={sd} onChange={(v) => setSd(clamp(v, 2, 25))} min={2} max={25} step={0.5} hint="山の広がり" />
            <NumberField label="自分の得点" value={target} onChange={(v) => setTarget(clamp(Math.round(v), 0, 100))} min={0} max={100} unit="点" />
            <NumberField label="学年の人数" value={population} onChange={setPopulation} min={1} max={5000} unit="人" />
          </Row>
          <div className="preset-row">
            {[
              ["ふつう μ50 σ10", 50, 10],
              ["山が右へ μ70 σ10", 70, 10],
              ["ばらつきが小さい μ50 σ4", 50, 4],
              ["ばらつきが大きい μ50 σ20", 50, 20]
            ].map(([label, m, d]) => (
              <button type="button" key={label as string} onClick={() => { setMean(m as number); setSd(d as number); }}>
                {label as string}
              </button>
            ))}
          </div>
          <NormalCurve
            mean={mean}
            sd={sd}
            domain={[0, 100]}
            bands
            marks={[{ value: clamp(target, 2, 98), label: `${target}点` }]}
          />
          <Formula>
            μは山の位置、σは山の広がり　／　z ＝ (自分の得点 − μ) ÷ σ　／　上位の割合 ＝ zより右側の面積　／　順位の目安 ＝ 上位の割合 × 人数
          </Formula>
          <Steps
            items={[
              { label: "① 山の位置と広がりを読む", value: `μ＝${mean} ／ σ＝${sd}`, note: "この2つだけで、山の形は完全に決まる" },
              { label: "② 標準偏差1個ぶんの幅", value: `${fmt(mean - sd, 1)} 〜 ${fmt(mean + sd, 1)}`, note: `μ ± ${sd}。ここに約68%が入る` },
              { label: "③ 得点から平均を引く", value: `${target} − ${mean} ＝ ${fmt(target - mean, 2)}`, note: "平均から何点はなれているか" },
              { label: "④ 標準偏差で割る（z得点）", value: `${fmt(target - mean, 2)} ÷ ${sd} ＝ ${fmt(z, 3)}`, note: "「標準偏差いくつ分」に言いかえた値" },
              { label: "⑤ カーブのzより右側の面積を読む", value: `${fmt(upper * 100, 2)} %`, note: "これが上位の割合" },
              { label: "⑥ 学年の人数をかける", value: `${fmt(upper * 100, 2)} % × ${population} 人 ＝ ${fmt(Math.max(1, upper * population), 1)} 位`, note: "だいたい何番目か" }
            ]}
          />
          <Results
            items={[
              { label: "μ ± 1σ", value: `${fmt(mean - sd, 1)} 〜 ${fmt(mean + sd, 1)}`, note: `${mean} ± ${sd}。この間に約68%が入る` },
              { label: "μ ± 2σ", value: `${fmt(mean - 2 * sd, 1)} 〜 ${fmt(mean + 2 * sd, 1)}`, note: `${mean} ± ${fmt(2 * sd, 1)}。この間に約95%が入る` },
              { label: "μ ± 3σ", value: `${fmt(mean - 3 * sd, 1)} 〜 ${fmt(mean + 3 * sd, 1)}`, note: `${mean} ± ${fmt(3 * sd, 1)}。この間に約99.7%が入る` },
              { label: "z得点", value: fmt(z, 3), note: "手順④。平均から標準偏差いくつ分はなれているか" },
              { label: "偏差値", value: fmt(50 + 10 * z, 2), note: "50 ＋ 10 × z に置きなおした値" },
              { label: "上位", value: `${fmt(upper * 100, 2)} %`, note: "手順⑤。カーブの、自分より右側の面積の割合" },
              { label: "順位の目安", value: `${fmt(Math.max(1, upper * population), 1)} 位`, note: `手順⑥。上位 ${fmt(upper * 100, 2)} % × ${population} 人` }
            ]}
          />
          <DataTable
            head={["範囲", "この得点の間に入る", "含まれる割合", "外側の割合", "偏差値でいえば"]}
            rows={[1, 2, 3].map((k) => [
              `μ ± ${k}σ`,
              `${fmt(mean - k * sd, 1)} 〜 ${fmt(mean + k * sd, 1)}`,
              `${fmt((normalCdf(k) - normalCdf(-k)) * 100, 2)} %`,
              `${fmt((1 - (normalCdf(k) - normalCdf(-k))) * 100, 2)} %`,
              `${50 - 10 * k} 〜 ${50 + 10 * k}`
            ])}
            highlight={(index) => Math.abs(z) <= index + 1 && Math.abs(z) > index}
          />
          <HintButton id="normal-1-1">
            横軸は0〜100点で固定してあります。色の濃い帯が μ±1σ、その外側が ±2σ、いちばん薄いところが ±3σ です。
            μ（ミュー）を変えると山が左右に動き、σ（シグマ）を変えると山の太さが変わります。テントの位置を移すのがμ、テントを広げたり狭めたりするのがσです。
            山の下の面積は、どんな形でも必ず1（＝全員）なので、σを大きくして横に広げると、そのぶん山は低くなります。
            自分の位置は「点数」ではなく「μから σ 何個ぶん離れているか」で測ります。それがz得点で、10倍して50を足すと、いつもの偏差値になります。
            上位◯%というのは、カーブの右側の面積の割合のこと。学年300人のうち上位2.3%なら、だいたい7位ということになります。
          </HintButton>
        </>
      )}

      {card(
        2,
        "カーブの「高さ」と「面積」のちがい",
        "確率になるのは「高さ」ではなく「面積」のほうだ、ということを確かめます。",
        <>
          <Row>
            <NumberField label="平均 μ（実験2と共通）" value={mean} onChange={(v) => setMean(clamp(Math.round(v), 10, 90))} min={10} max={90} />
            <NumberField label="標準偏差 σ（実験2と共通）" value={sd} onChange={(v) => setSd(clamp(v, 2, 25))} min={2} max={25} step={0.5} />
          </Row>
          <DataTable
            head={["値", "カーブの高さ（NORM.DIST の最後を FALSE にした値）", "そこまでの面積（NORM.DIST の最後を TRUE にした値）"]}
            rows={[-2, -1, 0, 1, 2].map((k) => [
              fmt(mean + k * sd, 1),
              fmt(normalPdf(mean + k * sd, mean, sd), 6),
              fmt(normalCdf(mean + k * sd, mean, sd), 6)
            ])}
          />
          <Hint>確率密度はカーブの高さそのもの。確率として意味を持つのは、区間で囲んだ面積（累積確率の差）です。</Hint>
        </>
      )}

      {card(
        3,
        "校内テストの位置づけを説明する",
        "計算結果を使って、自分の位置を言葉で説明します。",
        <AreaField
          label="説明文"
          value={missionNote}
          onChange={onMissionNote}
          placeholder="例：平均50・標準偏差10のテストで70点。z=2.0、偏差値70で、正規分布に従うとすれば上位約2.3%。300人なら約7位に相当する。ただし実際の分布が正規分布から外れていれば、この推定はずれる。"
          rows={4}
        />
      )}
    </>
  );
}

/* ========================================================================
 * A5 相関と回帰
 * ====================================================================== */
export function RelationLab({ card, missionNote, onMissionNote }: LabProps) {
  const [xs, setXs] = useState("1,2,3,4,5,6,7,8,9,10");
  const [ys, setYs] = useState("18,26,33,41,50,59,68,72,79,88");
  const [predictX, setPredictX] = useState(12);
  const [cause, setCause] = useState("気温");
  const [statement, setStatement] = useState("スマホ時間と成績に負の相関があるので、スマホが成績低下の原因である。");

  const xValues = parseNumbers(xs);
  const yValues = parseNumbers(ys);
  const n = Math.min(xValues.length, yValues.length);
  const sx = summarize(xValues.slice(0, n));
  const sy = summarize(yValues.slice(0, n));
  const cov = covariance(xValues, yValues);
  const r = correlation(xValues, yValues);
  const fit = regression(xValues, yValues);
  const causes: Record<string, [string, string, string]> = {
    気温: ["アイスの売上", "熱中症の患者数", "気温が上がると両方が増えます。アイスが熱中症を起こすわけではありません。"],
    体格: ["靴のサイズ", "漢字テストの得点", "小学生全体で調べると相関が出ますが、背後にあるのは学年（＝発達段階）です。"],
    家庭学習時間: ["スマホ利用時間", "定期テストの得点", "学習時間が減れば得点も下がり、その分スマホ時間が増えているだけかもしれません。"]
  };
  // 「原因とは必ずしもいえない」のような否定形は、正しい書き方なので警告しない。
  const hedged = /ない|とはいえ|限らない|かもしれ/.test(statement);
  const risky = /原因|必ず/.test(statement) && !hedged;

  return (
    <>
      {card(
        0,
        "散布図を描く",
        "2つの量を入力して、点の並び方を目で確かめます。",
        <>
          <Row>
            <AreaField label="x のデータ" value={xs} onChange={setXs} rows={2} />
            <AreaField label="y のデータ" value={ys} onChange={setYs} rows={2} />
          </Row>
          <Scatter xs={xValues} ys={yValues} />
          <Results
            items={[
              { label: "データの組数", value: n, note: "xとyが両方そろっている組の数。点の個数と同じ" },
              { label: "x の平均", value: sx ? fmt(sx.mean, 3) : "-", note: "この値を境に、点が左右に分かれます" },
              { label: "y の平均", value: sy ? fmt(sy.mean, 3) : "-", note: "この値を境に、点が上下に分かれます" },
              { label: "見た目の傾向", value: correlationLabel(r), note: "点の並びから読んだ向きと強さ。数値化は次の実験で行います" }
            ]}
          />
          <Verdict ok>
            ここは計算をするカードではありません。点が右上がりに並べば「片方が増えるともう片方も増える」、右下がりなら「片方が増えるともう片方は減る」、ばらばらなら「関係は見えない」と読みます。いまの図は{correlationLabel(r)}に見えます。
          </Verdict>
          <HintButton id="relation-0-1">
            数字の表をにらんでも関係は見えませんが、点を打つと一目で分かります。右上がりに並べば「片方が増えるともう片方も増える」、右下がりなら「片方が増えるともう片方は減る」。星座を見つけるのと同じで、まず並びの形をつかんでから数値にします。計算より先に図、が分析の鉄則です。
          </HintButton>
        </>
      )}

      {card(
        1,
        "共分散を計算する",
        "xの偏差とyの偏差をかけて平均します。",
        <>
          <Row>
            <AreaField label="x のデータ（実験1と共通）" value={xs} onChange={setXs} rows={2} />
            <AreaField label="y のデータ（実験1と共通）" value={ys} onChange={setYs} rows={2} />
          </Row>
          <Formula>共分散 ＝ (xの偏差 × yの偏差) をぜんぶ足して、データの個数で割る　　偏差とは「値 − 平均」のことです</Formula>
          {sx && sy && (
            <Steps
              items={[
                { label: "① x と y それぞれの平均を出す", value: `${fmt(sx.mean, 3)} と ${fmt(sy.mean, 3)}` },
                { label: "② 1組ずつ、平均との差（偏差）を出す", value: "下の表の3列目・4列目" },
                { label: "③ 2つの偏差をかける", value: "下の表のいちばん右の列" },
                { label: "④ かけ算の結果をぜんぶ足す", value: fmt(cov * n, 3) },
                { label: "⑤ 組数で割る", value: `${fmt(cov * n, 3)} ÷ ${n}` },
                { label: "⑥ 共分散", value: fmt(cov, 4) }
              ]}
            />
          )}
          {sx && sy && (
            <DataTable
              head={["x", "y", "x の偏差", "y の偏差", "2つの偏差のかけ算"]}
              rows={Array.from({ length: Math.min(n, 12) }, (_, i) => [
                xValues[i],
                yValues[i],
                fmt(xValues[i] - sx.mean, 2),
                fmt(yValues[i] - sy.mean, 2),
                fmt((xValues[i] - sx.mean) * (yValues[i] - sy.mean), 2)
              ])}
            />
          )}
          <Results
            items={[
              { label: "共分散", value: fmt(cov, 4), note: "偏差のかけ算をぜんぶ足して、組数で割った値" },
              {
                label: "符号の意味",
                value: cov > 0 ? "同じ方向に動く傾向" : cov < 0 ? "逆方向に動く傾向" : "傾向なし",
                note: "プラスなら右上がり、マイナスなら右下がり。大きさは単位しだいなので比べられない"
              }
            ]}
          />
          <Hint>身長をcmで測るかmで測るかだけで、共分散の数字は大きく変わってしまいます。だから数の大きさだけを他のデータと比べても意味がありません。</Hint>
        </>
      )}

      {card(
        2,
        "どんなデータでも −1〜1 で比べられるようにする",
        "共分散を標準偏差の積で割ると、−1〜1に収まります。",
        <>
          <Row>
            <AreaField label="x のデータ（実験1と共通）" value={xs} onChange={setXs} rows={2} />
            <AreaField label="y のデータ（実験1と共通）" value={ys} onChange={setYs} rows={2} />
          </Row>
          <Formula>
            r ＝ 共分散 ÷ (x の標準偏差 × y の標準偏差)　　r（アール）は相関係数、R²（アールじじょう）は決定係数と読みます
          </Formula>
          {sx && sy && (
            <Steps
              items={[
                { label: "① 前の実験で求めた共分散", value: fmt(cov, 4) },
                { label: "② x の標準偏差を求める", value: fmt(sx.sd, 4) },
                { label: "③ y の標準偏差を求める", value: fmt(sy.sd, 4) },
                { label: "④ 2つの標準偏差をかける", value: `${fmt(sx.sd, 4)} × ${fmt(sy.sd, 4)} ＝ ${fmt(sx.sd * sy.sd, 4)}` },
                { label: "⑤ 共分散をそれで割る", value: `${fmt(cov, 4)} ÷ ${fmt(sx.sd * sy.sd, 4)}`, note: "ここで単位が消えます" },
                { label: "⑥ 相関係数 r", value: fmt(r, 5) },
                { label: "⑦ rを2乗する（決定係数 R²）", value: fmt(r * r, 5) }
              ]}
            />
          )}
          <Results
            items={[
              { label: "相関係数 r", value: fmt(r, 4), note: "必ず −1 〜 1 に収まる、単位のない値" },
              { label: "判定", value: correlationLabel(r), note: "|r| が 0.7以上なら強い、0.4程度でやや強い、0.2未満はほとんどない" },
              { label: "決定係数 R²", value: fmt(r * r, 4), note: "r を2乗した値。yのばらつきのうち、この直線で言い当てられた割合" }
            ]}
          />
          <HintButton id="relation-2-1">
            rは −1 から 1 の間に必ず収まります。1に近いほど右上がりにきれいに並び、0に近いほどバラバラ、−1に近いほど右下がりです。R²はそのrを2乗した値で、「この直線でどれくらい言い当てられたか」の割合。10本中8本が的に入れば0.8、というイメージです。
          </HintButton>
        </>
      )}

      {card(
        3,
        "回帰直線を引いて予測する",
        "点のまん中を通る直線を引いて、xからyを予想します。",
        <>
          <Row>
            <AreaField label="x のデータ（実験1と共通）" value={xs} onChange={setXs} rows={2} />
            <AreaField label="y のデータ（実験1と共通）" value={ys} onChange={setYs} rows={2} />
          </Row>
          <Scatter xs={xValues} ys={yValues} line={fit} />
          {fit && (
            <>
              <Formula>
                y ＝ {fmt(fit.a, 4)} x {fit.b >= 0 ? "+" : "−"} {fmt(Math.abs(fit.b), 4)}
              </Formula>
              <Row>
                <NumberField label="x の値を入力" value={predictX} onChange={setPredictX} step={0.5} />
              </Row>
              {sx && sy && (
                <Steps
                  items={[
                    { label: "① 共分散を x の分散で割る（傾き a）", value: `${fmt(cov, 4)} ÷ ${fmt(sx.variance, 4)} ＝ ${fmt(fit.a, 4)}` },
                    {
                      label: "② y の平均から a × x の平均を引く（切片 b）",
                      value: `${fmt(sy.mean, 3)} − ${fmt(fit.a, 4)} × ${fmt(sx.mean, 3)} ＝ ${fmt(fit.b, 4)}`
                    },
                    { label: "③ 直線の式が決まる", value: `y ＝ ${fmt(fit.a, 4)} x ${fit.b >= 0 ? "＋" : "−"} ${fmt(Math.abs(fit.b), 4)}` },
                    { label: "④ 予測したい x を代入する", value: `x ＝ ${predictX}` },
                    { label: "⑤ 予測値", value: fmt(fit.a * predictX + fit.b, 3) }
                  ]}
                />
              )}
              <Results
                items={[
                  { label: "傾き a", value: fmt(fit.a, 4), note: "xが1増えるとyがこれだけ変わる" },
                  { label: "切片 b", value: fmt(fit.b, 4), note: "xが0のときのyの値" },
                  {
                    label: `x = ${predictX} のときの予測値`,
                    value: fmt(fit.a * predictX + fit.b, 3),
                    note: `${fmt(fit.a, 4)} × ${predictX} ${fit.b >= 0 ? "＋" : "−"} ${fmt(Math.abs(fit.b), 4)}`
                  },
                  { label: "決定係数 R²", value: fmt(fit.r2, 4), note: "1に近いほど、この直線でよく言い当てられている", warn: fit.r2 < 0.5 }
                ]}
              />
              <Hint>
                データの範囲は x = {sx?.min} 〜 {sx?.max} です。この外を予測すると、直線が当てはまる保証はありません。
              </Hint>
            </>
          )}
        </>
      )}

      {card(
        4,
        "かげにひそむ本当の原因を探す",
        "2つの数の両方に効いている、別の原因を探します。",
        <>
          <Tabs value={cause} onChange={setCause} options={Object.keys(causes).map((value) => ({ value, label: value }))} />
          <div className="cause-map">
            <strong>{cause}</strong>
            <div className="branches">
              <span>{causes[cause][0]}</span>
              <span>{causes[cause][1]}</span>
            </div>
          </div>
          <Results items={[{ label: "読み取り", value: causes[cause][2], note: `「${cause}」が、上の2つの両方に効いています` }]} />
          <Hint>
            ここは計算をするカードではありません。2つの数の両方に矢印が向かっている第三の要因（交絡要因）を探します。見つかったら、その2つの間で言えるのは「関連がある」までで、「原因である」とは書けません。
          </Hint>
          <AreaField label="分析文を書いてみる" value={statement} onChange={setStatement} rows={3} />
          <Verdict ok={!risky}>
            {risky
              ? "「原因」「必ず」などの断定表現があります。相関からは因果を証明できません。"
              : "相関の範囲で表現できています。"}
          </Verdict>
          <HintButton id="relation-4-1">
            アイスがよく売れる日は、熱中症の人も増えます。でもアイスが熱中症を起こしているわけではなく、両方の裏に「暑さ」がいるだけです。相関から言えるのは「いっしょに動いている」までで、「こっちが原因だ」とは言えません。分析文では「原因である」ではなく「関連がある」と書きましょう。
          </HintButton>
        </>
      )}

      {card(
        5,
        "相関から言える範囲を決める",
        "交絡要因と追加調査まで含めて提案します。",
        <AreaField
          label="言えることの範囲と、次に行う調査"
          value={missionNote}
          onChange={onMissionNote}
          placeholder="例：スマホ時間と得点にr=−0.62の負の相関がある。ただし家庭学習時間という交絡要因が考えられるため、学習時間を記録して層別に比較する追加調査を行う。因果を主張するには介入実験が必要。"
          rows={5}
        />
      )}
    </>
  );
}

/* ========================================================================
 * A6 乱数とシミュレーション
 * ====================================================================== */
export function SimulationLab({ card, missionNote, onMissionNote }: LabProps) {
  const [times, setTimes] = useState(1000);
  const [seed, setSeed] = useState(1);
  const [points, setPoints] = useState(2000);
  const [arrival, setArrival] = useState(3);
  const [service, setService] = useState(4);
  const [staff, setStaff] = useState(1);

  const dice = useMemo(() => rollDice(times, seed), [times, seed]);
  const series = useMemo(() => [50, 100, 1000, 10000].map((t) => ({ t, data: rollDice(t, seed) })), [seed]);
  const pi = useMemo(() => monteCarloPi(points, seed), [points, seed]);
  const rho = arrival > 0 ? service / (arrival * staff) : Infinity;
  const waitMinutes = rho >= 1 ? Infinity : (rho * service) / (1 - rho);
  // ρ < 1 を満たす最小の受付人数。service/arrival がちょうど整数のときは
  // その人数だと ρ = 1.0 になってしまうので、1人足す。
  const needed = (() => {
    const load = service / arrival;
    const base = Number.isInteger(load) ? load + 1 : Math.ceil(load);
    // 念のため ρ < 1 になるまで増やして確認する
    let k = Math.max(1, base);
    while (service / (arrival * k) >= 1) k += 1;
    return k;
  })();

  return (
    <>
      {card(
        0,
        "サイコロを繰り返し振る",
        "回数と種を変えて、出目の相対度数を確かめます。",
        <>
          <Row>
            <NumberField label="振る回数" value={times} onChange={(v) => setTimes(clamp(Math.round(v), 10, 100000))} min={10} max={100000} unit="回" />
            <NumberField label="乱数の種（シード）" value={seed} onChange={(v) => setSeed(Math.max(1, Math.round(v)))} min={1} max={9999} hint="同じ種なら同じ結果" />
          </Row>
          <BarChart values={dice.map((d) => d.relative)} labels={dice.map((d) => String(d.face))} overlay={dice.map(() => 1 / 6)} />
          <DataTable
            head={["出目", "回数", "相対度数", "理論値", "差"]}
            rows={dice.map((d) => [d.face, d.count, fmt(d.relative, 4), fmt(d.theory, 4), fmt(d.relative - d.theory, 4)])}
          />
          <Hint>折れ線が理論値1/6です。回数が少ないほど棒がばらつきます。</Hint>
        </>
      )}

      {card(
        1,
        "大数の法則を確かめる",
        "50回・100回・1,000回・10,000回で、理論値からのずれを比べます。",
        <>
          <DataTable
            head={["回数", ...dice.map((d) => `${d.face}の相対度数`), "最大のずれ"]}
            rows={series.map(({ t, data }) => [
              `${fmt(t, 0)}回`,
              ...data.map((d) => fmt(d.relative, 4)),
              fmt(Math.max(...data.map((d) => Math.abs(d.relative - 1 / 6))), 4)
            ])}
          />
          <BarChart
            values={series.map(({ data }) => Math.max(...data.map((d) => Math.abs(d.relative - 1 / 6))))}
            labels={series.map(({ t }) => `${t}回`)}
          />
          <HintButton id="simulation-1-1">回数が10倍になると、ずれはおよそ1/√10（約0.32倍）に縮みます。</HintButton>
        </>
      )}

      {card(
        2,
        "モンテカルロ法で円周率を求める",
        "正方形の中に点を打ち、円の中に入った割合から求めます。",
        <>
          <SliderField label="打つ点の数" value={points} onChange={setPoints} min={100} max={50000} step={100} unit=" 点" />
          <div className="monte-canvas">
            <svg viewBox="0 0 100 100" role="img" aria-label="モンテカルロ法">
              <path d="M0 100 A100 100 0 0 0 100 0 L0 0 Z" className="quarter" />
              {pi.samples.map((s, i) => (
                <circle key={i} cx={s.x * 100} cy={100 - s.y * 100} r="0.8" className={s.inside ? "in" : "out"} />
              ))}
            </svg>
          </div>
          <Formula>π ≒ 4 × (円の中に入った点の数 ÷ 全体の点の数)</Formula>
          <Results
            items={[
              { label: "円の中に入った点", value: fmt(pi.inside, 0), note: "原点からの距離が1以下だった点の数。図の色が濃い点" },
              { label: "全体の点", value: fmt(pi.points, 0), note: "正方形にばらまいた点の数。割り算の下にくる数" },
              { label: "求まったπ", value: fmt(pi.pi, 5), note: "円の中の割合を4倍した値。3.14159に近づくはず" },
              {
                label: "真の値との差",
                value: fmt(Math.abs(pi.pi - Math.PI), 5),
                note: "点を4倍に増やすと、この差はおよそ半分になります"
              }
            ]}
          />
          <HintButton id="simulation-2-1">
            正方形の中にでたらめに点をばらまくと、四分円の中に入る点の割合は面積の比とほぼ同じになります。四分円の面積は正方形の π/4 なので、割合を4倍すれば π が出てきます。雨つぶが降った跡を数えて傘の面積を当てるようなものです。点を増やすほど当たりますが、精度を10倍にするには点を100倍にしないといけません。
          </HintButton>
        </>
      )}

      {card(
        3,
        "文化祭の受付を、計算できる形にしてみる",
        "お客さんが来るペースと、1人にかかる時間から、行列が伸びるかどうかを判断します。",
        <>
          <Row>
            <NumberField label="平均到着間隔" value={arrival} onChange={setArrival} min={0.5} max={20} step={0.5} unit="分" />
            <NumberField label="1人あたりの処理時間" value={service} onChange={setService} min={0.5} max={20} step={0.5} unit="分" />
            <NumberField label="受付の人数" value={staff} onChange={setStaff} min={1} max={10} unit="人" />
          </Row>
          <Formula>こみぐあい ρ ＝ 処理時間 ÷ (到着間隔 × 受付人数)　　ρ（ロー）は「来るペースに対して、さばくペースが足りているか」を表す数です</Formula>
          <Steps
            items={[
              { label: "① 1人あたりの処理時間", value: `${service} 分` },
              { label: "② 到着間隔 × 受付人数", value: `${arrival} × ${staff} ＝ ${fmt(arrival * staff, 2)} 分` },
              { label: "③ ①を②で割る", value: `${service} ÷ ${fmt(arrival * staff, 2)}` },
              { label: "④ こみぐあい ρ", value: fmt(rho, 3), note: "1未満なら落ち着く、1以上なら伸び続ける" }
            ]}
          />
          <Results
            items={[
              { label: "こみぐあい ρ", value: fmt(rho, 3), note: "1を超えると行列が伸び続ける", warn: rho >= 1 },
              {
                label: "判定",
                value: rho >= 1 ? "行列はどこまでも伸びていく" : "行列は落ち着く",
                note: "手順④のρが1未満か1以上か、それだけで決まります",
                warn: rho >= 1
              },
              {
                label: "だいたいの待ち時間（受付1人のときの目安）",
                value: Number.isFinite(waitMinutes) ? `${fmt(waitMinutes, 2)} 分` : "無限大",
                note: "手順④のρから出した目安。ρが1に近いほど急に伸びる",
                warn: !Number.isFinite(waitMinutes)
              },
              { label: "1時間あたりの到着", value: `${fmt(60 / arrival, 1)} 人`, note: `60分 ÷ 到着間隔 ${arrival}分。何人来るかの見当` }
            ]}
          />
          <Verdict ok={rho < 1}>
            {rho < 1
              ? `受付${staff}人で対応できます。待ち時間の目安は、受付1人として計算すると約${fmt(waitMinutes, 1)}分です。`
              : `受付${staff}人では足りません。${needed}人以上が必要です（${needed}人ならρ＝${fmt(service / (arrival * needed), 3)}で1を下回ります）。`}
          </Verdict>
          <Hint>
            受付を増やしたときの正確な待ち時間はもっと複雑な計算になります。ここでは「行列が伸びるかどうか」の判断に使ってください。
          </Hint>
          <HintButton id="simulation-3-1">
            ρ（こみぐあい）は「来るペースに対して、さばくペースが足りているか」を表す1つの数です。1より小さければ行列はいずれ落ち着き、1以上だと閉場まで伸び続けます。水を入れる蛇口と排水口の太さの関係と同じで、入るほうが多ければあふれ続けるだけです。だから待ち時間が「無限大」と出たときは、計算ミスではなく「この体制では無理」という答えなのです。
          </HintButton>
        </>
      )}

      {card(
        4,
        "仮定を変えて結果を比べる",
        "同じモデルでも、置いた仮定で結論が変わることを確かめます。",
        <>
          <Row>
            <NumberField label="平均到着間隔（実験4と共通）" value={arrival} onChange={setArrival} min={0.5} max={20} step={0.5} unit="分" />
            <NumberField label="1人あたりの処理時間（実験4と共通）" value={service} onChange={setService} min={0.5} max={20} step={0.5} unit="分" />
          </Row>
          <DataTable
            head={["受付人数", "こみぐあい ρ", "判定", "だいたいの待ち時間（受付1人のときの目安）"]}
            rows={[1, 2, 3, 4].map((k) => {
              const r = service / (arrival * k);
              const w = r >= 1 ? Infinity : (r * service) / (1 - r);
              return [`${k}人`, fmt(r, 3), r >= 1 ? "伸び続ける" : "落ち着く", Number.isFinite(w) ? `${fmt(w, 2)} 分` : "無限大"];
            })}
          />
          <Hint>このモデルは「到着がランダムで一定の平均」という仮定に立っています。開場直後に集中する現実とは違うため、結果は目安です。</Hint>
        </>
      )}

      {card(
        5,
        "文化祭の受付を設計する",
        "仮定・試行結果・現実との差をまとめて提案します。",
        <AreaField
          label="提案と、置いた仮定"
          value={missionNote}
          onChange={onMissionNote}
          placeholder="例：到着間隔3分・処理4分と仮定するとρ=1.33で1人体制では破綻する。2人体制ならρ=0.67、待ち時間は約8分。ただし開場直後の集中は再現できていないため、開始30分は3人配置する。"
          rows={5}
        />
      )}
    </>
  );
}

/* ========================================================================
 * A7 仮説検定と区間推定
 * ====================================================================== */
export function TestLab({ card, missionNote, onMissionNote }: LabProps) {
  const [tosses, setTosses] = useState(10);
  const [heads, setHeads] = useState(8);
  const [pValue, setPValue] = useState(0.03);
  const [alpha, setAlpha] = useState(0.05);
  const [figStat, setFigStat] = useState(2.3);
  const [figTwo, setFigTwo] = useState("two");
  const [alphaView, setAlphaView] = useState("figure");
  const [oneMeanView, setOneMeanView] = useState("z");
  const [twoMeanView, setTwoMeanView] = useState("paired");
  const [classX, setClassX] = useState("58,62,65,67,70,72,74,76,78,95");
  const [classY, setClassY] = useState("60,63,64,66,68,69,71,73,75,77");
  const [bread, setBread] = useState(BREAD);
  const [mu0, setMu0] = useState(60.272);
  const [sigma, setSigma] = useState(0.8188);
  const [eggs, setEggs] = useState(EGGS);
  const [eggMu, setEggMu] = useState(117);
  const [examA, setExamA] = useState(EXAM_A);
  const [examB, setExamB] = useState(EXAM_B);
  const [maleYes, setMaleYes] = useState(73);
  const [maleNo, setMaleNo] = useState(57);
  const [femaleYes, setFemaleYes] = useState(36);
  const [femaleNo, setFemaleNo] = useState(74);
  const [question, setQuestion] = useState("mean-known");

  const coinPmf = Array.from({ length: tosses + 1 }, (_, k) => binomialPmf(tosses, k, 0.5));
  const coinHeads = clamp(Math.round(heads), 0, tosses);
  const coinUpper = coinPmf.slice(coinHeads).reduce((a, b) => a + b, 0);
  const coinTwo = Math.min(1, 2 * Math.min(coinUpper, coinPmf.slice(0, coinHeads + 1).reduce((a, b) => a + b, 0)));
  // 「表がちょうどk回」の確率を、組み合わせ ÷ 全部の出方 でたどれるようにする
  const coinCombination = combination(tosses, coinHeads);
  const coinTotalPatterns = 2 ** tosses;
  const breadValues = parseNumbers(bread);
  const welch = tTestWelch(parseNumbers(classX), parseNumbers(classY));
  const zResult = zTest(breadValues, mu0, sigma);
  const eggValues = parseNumbers(eggs);
  const tResult = tTest1(eggValues, eggMu);
  const ci = confidenceInterval(eggValues, 0.95);
  const paired = tTestPaired(parseNumbers(examA), parseNumbers(examB));
  const chi = chiSquareTest([
    [maleYes, maleNo],
    [femaleYes, femaleNo]
  ]);
  const choices: Record<string, [string, string]> = {
    "mean-known": ["Z検定", "本来の平均とばらつきがわかっている場合の平均の検定。"],
    "mean-unknown": ["1標本 t検定", "母分散が未知で、標本から不偏分散を推定する場合。"],
    paired: ["対応のある t検定", "同じ対象の前後や2条件を比べる場合。個人差の影響を除ける。"],
    unpaired: ["対応のない t検定", "別々の集団の平均を比べる場合。"],
    ratio: ["カイ二乗検定", "質的変数どうしの関連（クロス集計表の独立性）を調べる場合。"]
  };

  return (
    <>
      {card(
        0,
        "「たまたま」かどうかを、コインで確かめる",
        "回数と表の出た数を自分で入れて、その結果が偶然でも起こるのかを見ます。",
        <>
          <Row>
            <NumberField label="コインを投げる回数" value={tosses} onChange={(v) => setTosses(clamp(Math.round(v), 4, 60))} min={4} max={60} unit="回" />
            <NumberField label="表が出た回数" value={heads} onChange={(v) => setHeads(clamp(Math.round(v), 0, 60))} min={0} max={60} unit="回" />
          </Row>
          <BarChart
            values={coinPmf}
            labels={coinPmf.map((_, k) => (tosses <= 20 || k % 5 === 0 ? String(k) : ""))}
            highlight={(index) => index >= coinHeads}
          />
          <Formula>
            表がちょうどk回出る確率 ＝ (n回のうちk回を選ぶ組み合わせの数) ÷ (表裏の出方 2のn乗 通り)　／　k回以上出る確率 ＝ k回・k+1回・…・n回の確率をぜんぶ足す
          </Formula>
          <Steps
            items={[
              { label: "① 何回中何回かを決める", value: `${tosses}回中 ${coinHeads}回` },
              {
                label: "② どの回が表かの選び方を数える",
                value: `${bigFmt(coinCombination)} 通り`,
                note: `${tosses}回のうち${coinHeads}回を選ぶ組み合わせ`
              },
              { label: "③ 表裏の出方は全部で何通りか", value: `${bigFmt(coinTotalPatterns)} 通り`, note: `2 を ${tosses} 回かけた数` },
              {
                label: "④ ②を③で割る（ちょうど）",
                value: `${fmt(coinPmf[coinHeads] * 100, 2)} %`,
                note: `${bigFmt(coinCombination)} ÷ ${bigFmt(coinTotalPatterns)}`
              },
              {
                label: `⑤ ${coinHeads}回・${coinHeads + 1}回・…・${tosses}回 をぜんぶ足す`,
                value: `${fmt(coinUpper * 100, 2)} %`,
                note: "グラフで色のついた棒の合計"
              },
              {
                label: "⑥ 反対側への偏りも同じだけ数える（両側）",
                value: `${fmt(coinTwo * 100, 2)} %`,
                note: "これが p値。「これくらい以上に偏る確率」"
              }
            ]}
          />
          <Results
            items={[
              {
                label: "いちばん起こりやすい回数",
                value: `${coinPmf.indexOf(Math.max(...coinPmf))} 回`,
                note: "ゆがみのないコインなら回数の半分"
              },
              {
                label: `表が ${coinHeads} 回以上出る確率`,
                value: `${fmt(coinUpper * 100, 2)} %`,
                note: `${coinHeads}回から${tosses}回までの棒を足した値（上の⑤）`
              },
              {
                label: "同じくらい偏る確率（両側）",
                value: `${fmt(coinTwo * 100, 2)} %`,
                note: "裏側への偏りも同じだけ数えた値。これが p値",
                warn: coinTwo < 0.05
              }
            ]}
          />
          <Verdict ok={coinTwo >= 0.05}>
            {coinTwo < 0.05
              ? `ゆがみのないコインでも、これだけ偏ることは ${fmt(coinTwo * 100, 2)}% しか起こりません。「たまたま」で片づけるには苦しい結果です。`
              : `ゆがみのないコインでも、これだけ偏ることは ${fmt(coinTwo * 100, 2)}% の確率で起こります。「たまたま」でも説明できます。`}
          </Verdict>
          <Hint>
            いま計算した「色のついた棒の合計」が p値です。仮説検定は、この考え方を平均や割合にあてはめただけのものです。回数を50回に増やして、同じ8割が出たときの確率も見てみましょう。
          </Hint>
        </>
      )}

      {card(
        1,
        "有意水準を動かして、判定が切り替わる境目を見る",
        "有意水準αを動かすと、棄却域の広さと判定が同時に変わります。",
        <>
          <Row>
            <SliderField label="有意水準 α" value={alpha} onChange={setAlpha} min={0.01} max={0.2} step={0.01} />
            <SelectField
              label="調べ方"
              value={figTwo}
              onChange={setFigTwo}
              options={[
                { value: "two", label: "両側検定（違うかどうか）" },
                { value: "one", label: "片側検定（大きいかどうか）" }
              ]}
            />
          </Row>
          <Tabs
            value={alphaView}
            onChange={setAlphaView}
            options={[
              { value: "figure", label: "図で見る（棄却域＋統計量スライダー）" },
              { value: "number", label: "数で見る（p値とαを見くらべる）" }
            ]}
          />
          {alphaView === "figure" ? (
            <>
              <SliderField label="もし、この値が出たとしたら（Z値）" value={figStat} onChange={setFigStat} min={-3.5} max={3.5} step={0.1} />
              <RejectionCurve
                stat={figStat}
                critical={zCritical(alpha, figTwo === "two")}
                alpha={alpha}
                two={figTwo === "two"}
                statLabel="統計量"
              />
              <Formula>
                臨界値 ＝ そこから外側の面積が、ちょうど有意水準αになる境目の値
              </Formula>
              <Steps
                items={[
                  {
                    label: "① 有意水準 α を決める",
                    value: `${fmt(alpha * 100, 0)} %`,
                    note: "α（アルファ）は棄却域の面積。結果を見る前に決めておく"
                  },
                  { label: "② 両側か片側かを決める", value: figTwo === "two" ? "両側（左右に分ける）" : "片側（右だけ）" },
                  {
                    label: "③ 片側にわりあてる面積",
                    value: `${fmt((figTwo === "two" ? alpha / 2 : alpha) * 100, 1)} %`,
                    note: figTwo === "two" ? `${fmt(alpha * 100, 0)} % ÷ 2` : `${fmt(alpha * 100, 0)} % をそのまま右側へ`
                  },
                  { label: "④ その面積になる境目を読む", value: fmt(zCritical(alpha, figTwo === "two"), 4), note: "これが臨界値" },
                  {
                    label: "⑤ いまの統計量とくらべる",
                    value: `${fmt(figStat, 2)} と ${fmt(zCritical(alpha, figTwo === "two"), 3)}`,
                    note: (figTwo === "two" ? Math.abs(figStat) : figStat) >= zCritical(alpha, figTwo === "two") ? "外側なので棄却域に入る" : "内側なので棄却域に入らない"
                  }
                ]}
              />
              <Results
                items={[
                  {
                    label: "臨界値",
                    value: fmt(zCritical(alpha, figTwo === "two"), 4),
                    note: figTwo === "two" ? "この外側が棄却域。外側の面積を合わせるとαになる" : "この右側が棄却域。右側の面積がαになる"
                  },
                  {
                    label: "棄却域の面積",
                    value: `${fmt(alpha * 100, 0)} %`,
                    note: figTwo === "two" ? "左右に半分ずつ。αを大きくすると境目が内側へ動く" : "右側だけ。αを大きくすると境目が内側へ動く"
                  }
                ]}
              />
            </>
          ) : (
            <>
              <SliderField label="p値" value={pValue} onChange={setPValue} min={0} max={0.2} step={0.001} />
              <Formula>判定 ＝ p値 と 有意水準α を見くらべる（p が α より小さければ、帰無仮説を棄却する）</Formula>
              <Verdict ok={pValue < alpha}>
                p = {fmt(pValue, 3)} {pValue < alpha ? "<" : "≧"} α = {fmt(alpha, 2)} → {pJudge(pValue, alpha)}
              </Verdict>
              <Hint>
                棄却できたとしても「差がある」と言えるだけで、「差が大きい」とは言えません。逆に棄却できなくても「差がない」ことの証明にはなりません。
              </Hint>
            </>
          )}
          <Hint>
            αを大きくすると棄却域が広がり、「差がある」と言いやすくなります。そのぶん、本当は差がないのに差があると言ってしまう危険（第一種の誤り）も増えます。だからαは結果を見る前に決めます。
          </Hint>
        </>
      )}

      {card(
        2,
        "1つの平均が、ある値とちがうかを確かめる",
        "本来のばらつきが分かっているか分からないかで、使う道具が変わります。",
        <>
          <Tabs
            value={oneMeanView}
            onChange={setOneMeanView}
            options={[
              { value: "z", label: "① 本来のばらつきが分かる場合（Z検定）" },
              { value: "t", label: "② 分からない場合（t検定）" },
              { value: "ci", label: "③ 幅で答える（95%信頼区間）" }
            ]}
          />
          {oneMeanView === "z" && (
            <>
              <AreaField label="追加生産10個の重量(g)" value={bread} onChange={setBread} rows={2} />
              <Row>
                <NumberField label="母平均 μ₀" value={mu0} onChange={setMu0} step={0.01} unit="g" hint="工場の基準値（これまでの製造記録から分かっている値）" />
                <NumberField label="母標準偏差 σ" value={sigma} onChange={setSigma} step={0.0001} min={0.0001} unit="g" hint="工場の基準値（これまでの製造記録から分かっている値）" />
              </Row>
              <Hint>工場の基準値のように、本来の平均とばらつきが分かっている場合の検定です。</Hint>
              {zResult && (
                <>
                  <Formula>
                    Z ＝ (標本平均 x̄ − 母平均 μ₀) ÷ (σ ÷ √n)　　x̄（エックスバー）は集めたデータの平均、μ₀（ミューゼロ）は基準にする母平均、σ（シグマ）は母標準偏差、n はデータの個数です
                  </Formula>
                  <Steps
                    items={[
                      { label: "① 集めた個数を数える", value: zResult.n },
                      { label: "② 集めたデータの平均を出す", value: fmt(zResult.mean, 4) },
                      { label: "③ σ を √n で割る（標準誤差）", value: fmt(zResult.se, 5), note: "平均そのもののブレの大きさ" },
                      { label: "④ 平均の差を標準誤差で割る", value: `(${fmt(zResult.mean, 4)} − ${mu0}) ÷ ${fmt(zResult.se, 5)}` },
                      { label: "⑤ Z値", value: fmt(zResult.z, 4), note: "基準からのズレが、ふつうのブレ何個ぶんか" }
                    ]}
                  />
                  <Results
                    items={[
                      { label: "片側 p値", value: fmt(zResult.pOne, 5), note: "大きいほう（または小さいほう）だけを見たときの確率" },
                      { label: "両側 p値", value: fmt(zResult.pTwo, 5), note: "どちら向きのズレも数えたときの確率。片側の2倍" },
                      {
                        label: "判定（両側 α=0.05）",
                        value: pJudge(zResult.pTwo, 0.05),
                        note: `両側 p値 ${fmt(zResult.pTwo, 5)} と 0.05 を見くらべた結果`,
                        warn: zResult.pTwo < 0.05
                      }
                    ]}
                  />
                  <RejectionCurve stat={zResult.z} critical={zCritical(0.05, true)} alpha={0.05} two statLabel="Z値" />
                  <Verdict ok={zResult.pTwo >= 0.05}>
                    {zResult.pTwo >= 0.05
                      ? "誤差の範囲内といえます（帰無仮説を棄却できません）。"
                      : "母平均と異なるといえます（帰無仮説を棄却）。品質を点検しましょう。"}
                  </Verdict>
                </>
              )}
            </>
          )}
          {oneMeanView !== "z" && (
            <>
              <AreaField label="15店舗の価格(円)" value={eggs} onChange={setEggs} rows={2} />
              <NumberField label="比べたい母平均 μ₀" value={eggMu} onChange={setEggMu} unit="円" />
            </>
          )}
          {oneMeanView === "t" && (
            <>
              <Hint>本来のばらつきが分からないので、集めた15店舗のデータから見積もります。</Hint>
              {tResult && (
                <>
                  <Formula>
                    t ＝ (標本平均 − 母平均 μ₀) ÷ (不偏標準偏差 s ÷ √n)　　s（エス）は集めたデータから見積もったばらつきです
                  </Formula>
                  <Steps
                    items={[
                      { label: "① 集めた個数を数える", value: tResult.n },
                      { label: "② 集めたデータの平均を出す", value: fmt(tResult.mean, 4) },
                      { label: "③ ばらつきを見積もる（不偏標準偏差 s）", value: fmt(tResult.uSd, 4), note: "n−1 で割って求めた値" },
                      { label: "④ s を √n で割る（標準誤差）", value: fmt(tResult.se, 5), note: "平均そのもののブレの大きさ" },
                      { label: "⑤ 自由度 df を出す", value: tResult.df, note: "df（自由度）＝ データ数 − 1。t分布のすその厚さを決める" },
                      { label: "⑥ 平均の差を標準誤差で割る", value: `(${fmt(tResult.mean, 4)} − ${eggMu}) ÷ ${fmt(tResult.se, 5)}` },
                      { label: "⑦ t値", value: fmt(tResult.t, 4) }
                    ]}
                  />
                  <Results
                    items={[
                      { label: "両側 p値", value: fmt(tResult.pTwo, 5), note: "どちら向きのズレも数えたときの確率" },
                      { label: "片側 p値", value: fmt(tResult.pOne, 5), note: "片方向きのズレだけを数えたときの確率" },
                      {
                        label: "判定（両側 α=0.05）",
                        value: pJudge(tResult.pTwo, 0.05),
                        note: `両側 p値 ${fmt(tResult.pTwo, 5)} と 0.05 を見くらべた結果`,
                        warn: tResult.pTwo < 0.05
                      }
                    ]}
                  />
                  <RejectionCurve
                    stat={tResult.t}
                    critical={tCritical(tResult.df, 0.05, true)}
                    alpha={0.05}
                    two
                    df={tResult.df}
                    statLabel="t値"
                  />
                </>
              )}
            </>
          )}
          {oneMeanView === "ci" && ci && (
            <>
              <Formula>信頼区間 ＝ 標本平均 ± (t臨界値 × 標準誤差)　　「点で答える」かわりに「幅で答える」やり方です</Formula>
              <Steps
                items={[
                  { label: "① 集めたデータの平均を出す", value: fmt(ci.mean, 4) },
                  { label: "② 標準誤差を求める", value: fmt(ci.se, 5), note: "不偏標準偏差 ÷ √n。平均そのもののブレの大きさ" },
                  { label: "③ 自由度を出す", value: ci.df, note: "データ数 − 1" },
                  { label: "④ t臨界値（両側5%）を読む", value: fmt(ci.tCritical, 4), note: "外側の面積が合わせて5%になる境目" },
                  { label: "⑤ 誤差の幅を計算する", value: `${fmt(ci.tCritical, 4)} × ${fmt(ci.se, 5)} ＝ ${fmt(ci.margin, 4)}` },
                  {
                    label: "⑥ 平均の左右に振り分ける",
                    value: `${fmt(ci.mean, 3)} ± ${fmt(ci.margin, 4)}`,
                    note: `${fmt(ci.lower, 3)} 〜 ${fmt(ci.upper, 3)}`
                  }
                ]}
              />
              <Results
                items={[
                  {
                    label: "95%信頼区間",
                    value: `${fmt(ci.lower, 3)} 〜 ${fmt(ci.upper, 3)}`,
                    note: "同じ調べ方を100回くり返せば、そのうち約95回はこの作り方の区間が母平均を含みます"
                  },
                  {
                    label: `${eggMu}円は区間に入るか`,
                    value: eggMu >= ci.lower && eggMu <= ci.upper ? "入る" : "入らない",
                    note:
                      eggMu >= ci.lower && eggMu <= ci.upper
                        ? "幅の中なので、両側検定でも「ちがう」とはいえません"
                        : "幅の外なので、両側検定で「ちがう」と判定されるのと同じことです",
                    warn: !(eggMu >= ci.lower && eggMu <= ci.upper)
                  }
                ]}
              />
              <Hint>
                比べたい値が、この幅の外にはみ出していたら、検定で「ちがう」と判定されるのと同じことです。検定と信頼区間は、同じことを別の言い方で表しているだけです。
              </Hint>
            </>
          )}
          <HintButton id="test-2-1">
            Z値やt値は「基準からのズレが、ふつうのブレ何個ぶんか」を表す数です。割っている標準誤差は、1個ずつのばらつきではなく「平均そのもののブレ」。10人でジャンケンした勝率より100人でやった勝率のほうが安定するのと同じで、個数が多いほどこの値は小さくなり、同じズレでもZ値・t値は大きくなります。Zとtのちがいはただひとつ、本来のばらつきを知っているかどうかです。
          </HintButton>
        </>
      )}

      {card(
        3,
        "2つの平均を比べる ― 同じ人か、ちがう人か",
        "同じ人の2つの得点か、別々の集団かで、使う検定が変わります。",
        <>
          <Tabs
            value={twoMeanView}
            onChange={setTwoMeanView}
            options={[
              { value: "paired", label: "同じ人の2つの点（対応あり）" },
              { value: "unpaired", label: "ちがう人どうし（対応なし）" }
            ]}
          />
          {twoMeanView === "paired" ? (
            <>
              <Row>
                <AreaField label="学科の得点" value={examA} onChange={setExamA} rows={2} />
                <AreaField label="実技の得点" value={examB} onChange={setExamB} rows={2} />
              </Row>
              {paired && (
                <>
                  <DataTable
                    head={["No", "学科", "実技", "差（学科−実技）"]}
                    rows={paired.diff.map((d, i) => [i + 1, parseNumbers(examA)[i], parseNumbers(examB)[i], fmt(d, 1)])}
                  />
                  <Formula>t ＝ 差の平均 ÷ (差の不偏標準偏差 ÷ √n)　　1人ごとの差だけを見るので、個人差が消えます</Formula>
                  <Steps
                    items={[
                      { label: "① 1人ごとに 学科 − 実技 を計算する", value: joinList(paired.diff.map((d) => fmt(d, 1)), 10, ", ") },
                      { label: "② その差を平均する", value: fmt(paired.mean, 3), note: "0からどれだけ離れているかを見る" },
                      { label: "③ 自由度を出す", value: paired.df, note: "データ数 − 1" },
                      { label: "④ 差の平均を標準誤差で割る", value: fmt(paired.t, 4), note: "これが t値" },
                      { label: "⑤ その t値より外側の面積を読む", value: fmt(paired.pTwo, 5), note: "これが両側 p値" }
                    ]}
                  />
                  <Results
                    items={[
                      { label: "差の平均", value: fmt(paired.mean, 3), note: "1人ごとの差（学科 − 実技）を平均した値" },
                      { label: "t値", value: fmt(paired.t, 4), note: "差の平均が、ふつうのブレ何個ぶん0から離れているか" },
                      { label: "自由度", value: paired.df, note: "データ数 − 1" },
                      { label: "両側 p値", value: fmt(paired.pTwo, 5), note: "差がないとしたとき、これくらい以上に離れる確率" }
                    ]}
                  />
                  <RejectionCurve
                    stat={paired.t}
                    critical={tCritical(paired.df, 0.05, true)}
                    alpha={0.05}
                    two
                    df={paired.df}
                    statLabel="t値"
                  />
                  <Verdict ok={paired.pTwo >= 0.05}>
                    {paired.pTwo < 0.05
                      ? "平均値に差があるといえます（帰無仮説を棄却）。"
                      : "平均値に差があるとはいえません（帰無仮説を棄却できません）。"}
                  </Verdict>
                </>
              )}
            </>
          ) : (
            <>
              <Row>
                <AreaField label="1組の得点" value={classX} onChange={setClassX} rows={2} />
                <AreaField label="2組の得点" value={classY} onChange={setClassY} rows={2} />
              </Row>
              {welch && (
                <>
                  <Formula>t ＝ (1組の平均 − 2組の平均) ÷ √(1組の不偏分散÷n1 ＋ 2組の不偏分散÷n2)</Formula>
                  <Steps
                    items={[
                      { label: "① 1組の平均を出す", value: fmt(welch.meanA, 3) },
                      { label: "② 2組の平均を出す", value: fmt(welch.meanB, 3) },
                      { label: "③ 平均の差を計算する", value: `${fmt(welch.meanA, 3)} − ${fmt(welch.meanB, 3)} ＝ ${fmt(welch.meanA - welch.meanB, 3)}` },
                      { label: "④ 2組ぶんのブレを合わせる（標準誤差）", value: fmt(welch.se, 4), note: "平均そのもののブレの大きさ" },
                      { label: "⑤ 自由度を出す", value: fmt(welch.df, 3), note: "ウェルチの計算法。整数にならないのが普通です" },
                      { label: "⑥ 平均の差を標準誤差で割る", value: fmt(welch.t, 4), note: "これが t値" }
                    ]}
                  />
                  <Results
                    items={[
                      { label: "両側 p値", value: fmt(welch.pTwo, 5), note: "差がないとしたとき、これくらい以上に離れる確率" },
                      {
                        label: "判定（両側 α=0.05）",
                        value: pJudge(welch.pTwo, 0.05),
                        note: `両側 p値 ${fmt(welch.pTwo, 5)} と 0.05 を見くらべた結果`,
                        warn: welch.pTwo < 0.05
                      }
                    ]}
                  />
                  <RejectionCurve
                    stat={welch.t}
                    critical={tCritical(welch.df, 0.05, true)}
                    alpha={0.05}
                    two
                    df={welch.df}
                    statLabel="t値"
                  />
                  <Hint>
                    対応のある検定との違いは、データが「同じ人の2つの得点」かどうかだけです。別々の集団ならこちらを使います。自由度が整数にならないのは、2つの集団のばらつきの違いを自由度に織り込んでいるからです。
                  </Hint>
                </>
              )}
            </>
          )}
          <HintButton id="test-3-1">
            同じ人が受けた2つのテストなら、1人ごとに「学科 − 実技」の差を出して、その差の平均が0からずれているかだけを見ます。もともと得意な人・苦手な人の個人差が引き算で消えるので、小さな差でも見つけやすくなります。全員が同じ厚さの靴をはいていても身長の差には影響しないのと同じ理屈です。ちがう人どうしを比べるときは、この引き算ができないので別の方法を使います。
          </HintButton>
        </>
      )}

      {card(
        4,
        "カイ二乗検定：割合の差を確かめる",
        "男女で、月にカレーを食べる回数に差があるかを調べます。「差がないとしたら何人になるはず」を計算し、実際とのずれを測ります。",
        <>
          <div className="two-column">
            <div>
              <h4>男性</h4>
              <NumberField label="月にカレーを5回以上食べる" value={maleYes} onChange={setMaleYes} min={0} max={9999} unit="人" />
              <NumberField label="月に4回以下" value={maleNo} onChange={setMaleNo} min={0} max={9999} unit="人" />
            </div>
            <div>
              <h4>女性</h4>
              <NumberField label="月にカレーを5回以上食べる" value={femaleYes} onChange={setFemaleYes} min={0} max={9999} unit="人" />
              <NumberField label="月に4回以下" value={femaleNo} onChange={setFemaleNo} min={0} max={9999} unit="人" />
            </div>
          </div>
          {chi && (
            <>
              <DataTable
                head={["", "月に5回以上（実測）", "月に4回以下（実測）", "月に5回以上（期待）", "月に4回以下（期待）"]}
                rows={[
                  ["男性", maleYes, maleNo, fmt(chi.expected[0][0], 2), fmt(chi.expected[0][1], 2)],
                  ["女性", femaleYes, femaleNo, fmt(chi.expected[1][0], 2), fmt(chi.expected[1][1], 2)]
                ]}
              />
              <Formula>
                χ² ＝ Σ (実測度数 − 期待度数)² ÷ 期待度数　　Σ（シグマ）は「ぜんぶ足す」、χ²（カイじじょう）は「実際と期待とのずれ」を合計した値です
              </Formula>
              <Steps
                items={[
                  {
                    label: "① 差がないとしたら何人になるはずかを出す（期待度数）",
                    value: `${fmt(chi.expected[0][0], 2)} / ${fmt(chi.expected[0][1], 2)} / ${fmt(chi.expected[1][0], 2)} / ${fmt(chi.expected[1][1], 2)}`,
                    note: "行の合計 × 列の合計 ÷ 全体"
                  },
                  {
                    label: "② マスごとに (実測 − 期待) を計算する",
                    value: `${fmt(maleYes - chi.expected[0][0], 2)} / ${fmt(maleNo - chi.expected[0][1], 2)} / ${fmt(femaleYes - chi.expected[1][0], 2)} / ${fmt(femaleNo - chi.expected[1][1], 2)}`
                  },
                  { label: "③ 2乗して、期待度数で割る", value: "マスごとに計算する", note: "プラスとマイナスを打ち消さないため2乗する" },
                  { label: "④ 4つのマスをぜんぶ足す", value: fmt(chi.chi2, 4), note: "これが χ² 統計量" },
                  { label: "⑤ その χ² より外側の面積を読む", value: fmt(chi.p, 6), note: "これが p値" }
                ]}
              />
              <Results
                items={[
                  { label: "χ² 統計量", value: fmt(chi.chi2, 4), note: "実測と期待のずれの合計。大きいほど偶然では説明しにくい" },
                  { label: "自由度", value: chi.df, note: "(行の数 − 1) × (列の数 − 1)" },
                  { label: "p値", value: fmt(chi.p, 6), note: "関連がないとしたとき、これくらい以上にずれる確率" },
                  { label: "判定（α=0.05）", value: pJudge(chi.p, 0.05), note: `p値 ${fmt(chi.p, 6)} と 0.05 を見くらべた結果`, warn: chi.p < 0.05 }
                ]}
              />
              <DataTable
                head={["", "月に5回以上の調整済み標準化残差", "月に4回以下の調整済み標準化残差"]}
                rows={[
                  ["男性", fmt(chi.residuals[0][0], 3), fmt(chi.residuals[0][1], 3)],
                  ["女性", fmt(chi.residuals[1][0], 3), fmt(chi.residuals[1][1], 3)]
                ]}
              />
              <HintButton id="test-4-1">表の数字が ＋2 より大きい、または −2 より小さいマスが、差を生んでいる場所です。＋は期待より多い、−は少ないことを表します。</HintButton>
            </>
          )}
        </>
      )}

      {card(
        5,
        "目的に合う検定を選ぶ（まとめ）",
        "仮説・有意水準・判定・限界まで含めて書きます。",
        <>
          <SelectField
            label="調べたいこと"
            value={question}
            onChange={setQuestion}
            options={[
              { value: "mean-known", label: "本来のばらつきが分かっている平均を比べる" },
              { value: "mean-unknown", label: "母分散が未知の平均を比べる" },
              { value: "paired", label: "同じ人の2つの得点を比べる" },
              { value: "unpaired", label: "別のクラスの平均を比べる" },
              { value: "ratio", label: "男女で選択の割合を比べる" }
            ]}
          />
          <Results items={[{ label: choices[question][0], value: choices[question][1], note: "選んだ目的に対して使う手法" }]} />
          <Hint>
            ここは計算をするカードではありません。早見表は、①平均を比べるのか割合を比べるのか ②母分散が分かっているか ③同じ人どうしか別の集団か、の順に見て、行が1つに決まったところの手法を使います。
          </Hint>
          <DataTable
            head={["調べたいこと", "母分散", "手法"]}
            rows={[
              ["1つの平均", "既知", "Z検定"],
              ["1つの平均", "未知", "1標本 t検定"],
              ["2つの平均（同一対象）", "未知", "対応のある t検定"],
              ["2つの平均（別集団）", "未知", "対応のない t検定"],
              ["カテゴリの関連", "—", "カイ二乗検定"]
            ]}
            highlight={(index) => ["mean-known", "mean-unknown", "paired", "unpaired", "ratio"][index] === question}
          />
          <AreaField
            label="2つの調査それぞれの設計と結論"
            value={missionNote}
            onChange={onMissionNote}
            placeholder="例：(1) 2クラスの平均点は母分散未知なので対応のないt検定。H0:差がない、α=0.05、両側。(2) 学年別のA/B選択はカイ二乗検定。H0:学年と選択は独立。いずれもp値とαで判定し、95%信頼区間または残差を添える。"
            rows={6}
          />
        </>
      )}
    </>
  );
}

/* ========================================================================
 * A8 時系列とAI活用
 * ====================================================================== */
export function TimeseriesLab({ card, missionNote, onMissionNote }: LabProps) {
  const [raw, setRaw] = useState(TEMPS);
  const [startYear, setStartYear] = useState(1980);
  const [windowSize, setWindowSize] = useState(5);
  const [maView, setMaView] = useState("raw");
  const [thisYear, setThisYear] = useState(1200);
  const [lastYear, setLastYear] = useState(1000);
  const [lastMonth, setLastMonth] = useState(1500);
  const [prompt, setPrompt] = useState("この表を分析して結論を出して。");

  const values = parseNumbers(raw);
  const ma = movingAverage(values, windowSize);
  const trend = trendLine(values);
  const labels = values.map((_, i) => (i % 5 === 0 ? String(startYear + i) : ""));
  const keywords = ["目的", "列", "手順", "根拠", "禁止", "出力"];
  const hit = keywords.filter((word) => prompt.includes(word));

  return (
    <>
      {card(
        0,
        "時系列データを、並べる→ならす→直線にする",
        "1つのデータを、3つの見方で順に扱います。タブを左から順に押すと、生の値・移動平均・トレンド直線がつながって理解できます。",
        <>
          <AreaField label="時系列データ（古い順）" value={raw} onChange={setRaw} rows={3} />
          <Row>
            <NumberField label="最初の年" value={startYear} onChange={setStartYear} min={1900} max={2100} unit="年" />
            <SliderField label="何年ぶんを平均するか" value={windowSize} onChange={setWindowSize} min={3} max={11} step={2} unit=" 期間" />
          </Row>
          <Tabs
            value={maView}
            onChange={setMaView}
            options={[
              { value: "raw", label: "① そのまま並べる" },
              { value: "slider", label: "② 移動平均でならす" },
              { value: "table", label: "③ 平均する年数を比べる" },
              { value: "trend", label: "④ トレンドを直線にする" }
            ]}
          />

          {maView === "raw" && (
            <>
              <BarChart values={values} labels={labels} />
              <Formula>全体の変化 ＝ 最後の値 − 最初の値　　並べた順番を崩さずに、両端を見くらべます</Formula>
              <Steps
                items={[
                  { label: "① 時間順に並べる", value: `${startYear}年 から ${startYear + Math.max(0, values.length - 1)}年`, note: `${values.length} 期間ぶん` },
                  { label: "② いちばん古い値を読む", value: fmt(values[0] ?? 0, 2) },
                  { label: "③ いちばん新しい値を読む", value: fmt(values.at(-1) ?? 0, 2) },
                  { label: "④ 新しいほうから古いほうを引く", value: `${fmt(values.at(-1) ?? 0, 2)} − ${fmt(values[0] ?? 0, 2)}` },
                  { label: "⑤ 全体の変化", value: fmt((values.at(-1) ?? 0) - (values[0] ?? 0), 2) }
                ]}
              />
              <Results
                items={[
                  { label: "期間の数", value: `${values.length} 期間`, note: "並んでいるデータの個数" },
                  { label: "最初の値", value: fmt(values[0] ?? 0, 2), note: `${startYear}年の値` },
                  { label: "最後の値", value: fmt(values.at(-1) ?? 0, 2), note: `${startYear + Math.max(0, values.length - 1)}年の値` },
                  {
                    label: "全体の変化",
                    value: fmt((values.at(-1) ?? 0) - (values[0] ?? 0), 2),
                    note: "最後の値 − 最初の値。途中の上下は見ていない、両端だけの差"
                  }
                ]}
              />
              <Hint>
                まずは生の値のまま並べます。ここでは「上がっているのか下がっているのか」が、年ごとの上下にじゃまされて読みにくいはずです。
                そこで次のタブで、その上下をならします。
              </Hint>
            </>
          )}

          {maView === "slider" && (
            <>
              <BarChart values={values} labels={labels} overlay={ma} />
              <Formula>
                移動平均 ＝ その年をふくむ {windowSize} 期間ぶんの値を足して、{windowSize} で割った値
              </Formula>
              <DataTable
                head={["年", "実測値", `${windowSize}期間移動平均`, "差"]}
                rows={values
                  .map((v, i) => [startYear + i, fmt(v, 2), ma[i] === null ? "-" : fmt(ma[i]!, 3), ma[i] === null ? "-" : fmt(v - ma[i]!, 3)])
                  .filter((_, i) => i % 3 === 0)}
              />
              <Results
                items={[
                  { label: "平均する期間", value: `${windowSize} 期間`, note: "つまみで決めた値。この本数ぶんを足して割る" },
                  { label: "計算できた期間", value: `${ma.filter((v) => v !== null).length} 期間`, note: `両端の ${windowSize - 1} 期間は、前後がそろわないので計算できない` },
                  {
                    label: "ならした後のばらつき",
                    value: (() => {
                      const stat = summarize(ma.filter((v): v is number => v !== null));
                      return stat ? fmt(stat.sd, 4) : "-";
                    })(),
                    note: "移動平均だけを取り出して標準偏差を求めた値。生の値より小さくなる"
                  }
                ]}
              />
              <Hint>折れ線が移動平均です。年ごとの上下がならされ、長期の傾向が見えやすくなります。</Hint>
            </>
          )}

          {maView === "table" && (
            <>
              <DataTable
                head={["何年ぶんを平均するか", "計算できる期間数", "値の標準偏差", "特徴"]}
                rows={[3, 5, 7, 11].map((w) => {
                  const series = movingAverage(values, w).filter((v): v is number => v !== null);
                  const stat = summarize(series);
                  return [
                    `${w}期間`,
                    series.length,
                    stat ? fmt(stat.sd, 4) : "-",
                    w <= 3 ? "急な変化にすぐ反応する" : w <= 7 ? "バランスがよい" : "長い目で流れを見たいとき向き"
                  ];
                })}
                highlight={(index) => [3, 5, 7, 11][index] === windowSize}
              />
              <Hint>平均する年数を広げるほど標準偏差は小さくなります（＝なめらか）。そのぶん、端の期間で計算できなくなります。</Hint>
            </>
          )}

          {maView === "trend" && trend && (
            <>
              <Formula>
                値 ＝ {fmt(trend.a, 5)} × 経過年数 {trend.b >= 0 ? "+" : "−"} {fmt(Math.abs(trend.b), 3)}
              </Formula>
              <Scatter xs={values.map((_, i) => startYear + i)} ys={values} line={{ a: trend.a, b: trend.b - trend.a * startYear }} />
              <Results
                items={[
                  { label: "1年あたりの変化", value: fmt(trend.a, 5), note: "直線の傾き。1年たつと値がこれだけ変わる" },
                  { label: "10年あたりの変化", value: fmt(trend.a * 10, 4), note: "傾き × 10。読みやすい単位に言い直した値" },
                  {
                    label: `${values.length}年間の変化`,
                    value: fmt(trend.a * (values.length - 1), 3),
                    note: `傾き × ${values.length - 1}年。直線で見たときの全体の変化`
                  },
                  {
                    label: "決定係数 R²",
                    value: fmt(trend.r2, 4),
                    note: "R²（アールじじょう）。1に近いほど、この直線で説明できている",
                    warn: trend.r2 < 0.3
                  }
                ]}
              />
              <Hint>
                移動平均が「見やすくする」だけなのに対し、トレンド直線は「1年あたり何ずつ変わるか」を1つの数にします。
                R²が小さいときは、直線では説明しきれない変動（季節性や不規則変動）が大きいということです。
              </Hint>
            </>
          )}

          <HintButton id="timeseries-0-1">
            時系列データは、並んでいる順番そのものが情報です。読むときは、長期的なトレンド・周期的な季節性・短期的な不規則変動の3つに分けて考えます。
            テストの点なら並べ替えても中身は変わりませんが、気温の記録を並べ替えたら「上がってきている」という一番大事な事実が消えてしまいます。
            ①そのまま並べると全部が混ざって見え、②移動平均をとると短期の不規則変動が消え、④直線にすると長期のトレンドだけが1つの数（傾き）になります。
            見えなくするのではなく、見たいものだけを残していく作業だと考えてください。
          </HintButton>
        </>
      )}

      {card(
        1,
        "前月比と前年同月比を比べる",
        "季節性のあるデータでは、比べる相手を選ぶ必要があります。",
        <>
          <Row>
            <NumberField label="今年7月の売上" value={thisYear} onChange={setThisYear} min={0} unit="千円" />
            <NumberField label="今年6月の売上" value={lastMonth} onChange={setLastMonth} min={0} unit="千円" />
            <NumberField label="昨年7月の売上" value={lastYear} onChange={setLastYear} min={0} unit="千円" />
          </Row>
          <Formula>
            比 ＝ 今回の売上 ÷ 比べる相手の売上　／　%で表す ＝ (比 − 1) × 100　　1より大きければ増えた、小さければ減った
          </Formula>
          <Steps
            items={[
              {
                label: "① 今年7月を今年6月で割る",
                value: `${thisYear} ÷ ${lastMonth} ＝ ${fmt(thisYear / (lastMonth || 1), 4)}`,
                note: "これが前月比の「比」"
              },
              { label: "② 1を引く", value: fmt(thisYear / (lastMonth || 1) - 1, 4), note: "増えた分だけが残る" },
              { label: "③ 100をかける（前月比）", value: `${fmt((thisYear / (lastMonth || 1) - 1) * 100, 1)} %` },
              {
                label: "④ 今年7月を昨年7月で割る",
                value: `${thisYear} ÷ ${lastYear} ＝ ${fmt(thisYear / (lastYear || 1), 4)}`,
                note: "これが前年同月比の「比」"
              },
              {
                label: "⑤ 同じように1を引いて100をかける（前年同月比）",
                value: `${fmt((thisYear / (lastYear || 1) - 1) * 100, 1)} %`
              }
            ]}
          />
          <Results
            items={[
              {
                label: "前月比",
                value: `${fmt((thisYear / (lastMonth || 1) - 1) * 100, 1)} %`,
                note: "今年6月とくらべた伸び。季節がちがう相手とくらべている"
              },
              {
                label: "前年同月比",
                value: `${fmt((thisYear / (lastYear || 1) - 1) * 100, 1)} %`,
                note: "昨年7月とくらべた伸び。同じ季節どうしのくらべ方"
              },
              { label: "どちらで判断すべきか", value: "前年同月比", note: "季節の条件をそろえられるから" }
            ]}
          />
          <Hint>アイスの売上が7月に伸びるのは当たり前。6月と比べても意味がなく、昨年7月と比べて初めて本当の伸びがわかります。</Hint>
        </>
      )}

      {card(
        2,
        "AIへの依頼文を具体化する",
        "指示に何を書くと、出力を検証できるようになるかを確かめます。",
        <>
          <AreaField label="AIへの依頼文" value={prompt} onChange={setPrompt} rows={4} />
          <Verdict ok={hit.length >= 4}>
            採点のしかた：依頼文の中に「目的」「列」「手順」「根拠」「禁止」「出力」の6つの言葉がそのまま書かれているかを数えています。いまは {hit.length} / {keywords.length}
            。4つ以上あれば、あとから出力を確かめられる依頼文といえます。
          </Verdict>
          <Results
            items={[
              {
                label: "書けている指定の数",
                value: `${hit.length} / ${keywords.length}`,
                note: "目的・列・手順・根拠・禁止・出力 の6つが文中にあるかを数えています",
                warn: hit.length < 4
              },
              { label: "書けていること", value: hit.length ? hit.join("・") : "なし", note: "依頼文の中に見つかった言葉" },
              {
                label: "まだ書けていないこと",
                value: keywords.filter((w) => !hit.includes(w)).join("・") || "なし",
                note: "これを書き足すと、出力を確かめやすくなります"
              },
              {
                label: "あとで確かめられるか",
                value: hit.length >= 4 ? "高い" : "低い",
                note: "6つのうち4つ以上書けていれば「高い」と表示します",
                warn: hit.length < 4
              }
            ]}
          />
          <Hint>
            「目的／対象の列／手順／根拠の示し方／禁止事項／出力形式」を書くと再現性が上がります。個人情報は入力前に取り除きます。
          </Hint>
          <HintButton id="timeseries-2-1">
            このスコアは、依頼文の中に「目的」「列」「手順」「根拠」「禁止」「出力」という6つの言葉が実際に書かれているかを数えています。料理を頼むときに「何かおいしいもの」ではなく「4人ぶん、辛くなく、20分で、皿に盛って」と伝えるのと同じで、条件を言葉にして書くほど、返ってきたものが注文どおりか確かめられます。
          </HintButton>
        </>
      )}

      {card(
        3,
        "AIの分析を公開前に監査する",
        "再計算・匿名化・根拠・限界の4点を確認する手順書を作ります。",
        <AreaField
          label="監査の手順書"
          value={missionNote}
          onChange={onMissionNote}
          placeholder="例：1) AIが出した平均とp値を表計算で再計算し一致を確認 2) 氏名・クラスを削除し4けた番号に置換 3) 使ったデータの範囲と件数を明記 4) 相関を因果と書いていないか読み合わせ 5) 標本数が少ない項目には限界を注記"
          rows={6}
        />
      )}
    </>
  );
}

export const dataLabs: Record<string, (props: LabProps) => ReactNode> = {
  organize: OrganizeLab,
  center: CenterLab,
  spread: SpreadLab,
  normal: NormalLab,
  relation: RelationLab,
  simulation: SimulationLab,
  test: TestLab,
  timeseries: TimeseriesLab
};
