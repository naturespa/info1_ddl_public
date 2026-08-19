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
  tScore,
  tTest1,
  tTestPaired,
  trendLine,
  weightedMean,
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
  NormalCurve,
  NumberField,
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

const pJudge = (p: number, alpha: number) => (p < alpha ? "帰無仮説を棄却する" : "帰無仮説を棄却できない");

/* ========================================================================
 * A1 データの種類と度数分布
 * ====================================================================== */
export function OrganizeLab({ card }: LabProps) {
  const [scale, setScale] = useState("身長 168.5cm");
  const [raw, setRaw] = useState(HEIGHTS);
  const [binWidth, setBinWidth] = useState(10);
  const [start, setStart] = useState(150);
  const [shape, setShape] = useState("bell");
  const [dirty, setDirty] = useState("7, 6.5, , 8, 70, 6.5, -1, 7.5");
  const [report, setReport] = useState("");

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
    comb: ["歯抜け型", "度数が階級ごとに大きく変わる。階級幅の取り方や測定のクセを疑う。", [2, 9, 2, 12, 3, 14, 2, 8, 1]],
    skew: ["右すそ引き型", "左が急で右がなだらか。ある値以下を取らないデータ。", [14, 12, 8, 6, 4, 3, 2, 1, 1]],
    cliff: ["左絶壁型", "左端が極端に高い。データが選別されている可能性。", [20, 9, 5, 3, 2, 1, 1, 0, 0]],
    twin: ["二山型", "平均の異なる2つの分布が混じっている。元データを分けて確認。", [3, 10, 6, 2, 1, 2, 7, 11, 3]],
    island: ["離れ小島型", "端に小さな山がある。別の分布のデータが混じっている。", [2, 8, 14, 10, 4, 1, 0, 3, 2]]
  };
  const dirtyTokens = dirty.split(/[,、\n]/).map((t) => t.trim());
  const seen = new Set<string>();
  const checked = dirtyTokens.map((token) => {
    if (token === "" || token === "-") return { token, status: "欠損", action: "原因を確認して記録する" };
    const num = Number(token);
    if (!Number.isFinite(num)) return { token, status: "数値でない", action: "入力形式を確認する" };
    if (num < 0 || num > 24) return { token, status: "範囲外", action: "原本と照合する（単位の誤りを疑う）" };
    if (seen.has(token)) { return { token, status: "重複", action: "同一回答か確認する" }; }
    seen.add(token);
    return { token, status: "正常", action: "分析に使用する" };
  });
  const issues = checked.filter((c) => c.status !== "正常").length;

  return (
    <>
      {card(
        0,
        "データの尺度を見分ける",
        "数値に見えても、計算に意味があるとは限りません。",
        <>
          <SelectField label="データの例" value={scale} onChange={setScale} options={Object.keys(scales).map((value) => ({ value, label: value }))} />
          <Results items={[{ label: scales[scale][0], value: scales[scale][1] }]} />
          <DataTable
            head={["尺度", "できること", "例"]}
            rows={[
              ["名義尺度", "分類・最頻値", "血液型、出席番号"],
              ["順序尺度", "＋順序・中央値", "満足度、成績段階"],
              ["間隔尺度", "＋差・平均", "気温(℃)、西暦"],
              ["比例尺度", "＋比・変動係数", "身長、金額、時間"]
            ]}
          />
        </>
      )}

      {card(
        1,
        "度数分布表を自分で作る",
        "データを入力し、階級の幅を変えて表を組み立てます。",
        <>
          <AreaField label="データを入力（カンマ区切り）" value={raw} onChange={setRaw} rows={3} />
          <Row>
            <NumberField label="階級の幅" value={binWidth} onChange={setBinWidth} min={1} max={50} />
            <NumberField label="最初の階級の下限" value={start} onChange={setStart} min={0} max={1000} />
          </Row>
          <DataTable
            head={["階級", "階級値", "度数", "相対度数", "累積相対度数"]}
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
              { label: "データ数", value: values.length },
              { label: "階級数", value: bins.length },
              { label: "度数の合計", value: bins.reduce((a, b) => a + b.count, 0) },
              { label: "相対度数の合計", value: fmt(bins.reduce((a, b) => a + b.relative, 0), 3), note: "1になるか確認" }
            ]}
          />
        </>
      )}

      {card(
        2,
        "ヒストグラムの形を読む",
        "データを柱状グラフにして、形から分布の性質を読み取ります。",
        <>
          <BarChart values={bins.map((b) => b.count)} labels={bins.map((b) => String(b.from))} unit="人" />
          <Hint>階級の幅を変えると形が変わります。幅が狭すぎるとギザギザに、広すぎると特徴が消えます。</Hint>
        </>
      )}

      {card(
        3,
        "ヒストグラムの6つの典型",
        "形ごとに、次に疑うべきことが決まっています。",
        <>
          <Tabs value={shape} onChange={setShape} options={Object.entries(shapes).map(([value, [label]]) => ({ value, label }))} />
          <BarChart values={shapes[shape][2]} />
          <Results items={[{ label: shapes[shape][0], value: shapes[shape][1] }]} />
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
          <Results
            items={[
              { label: "点検が必要な値", value: `${issues} 件`, warn: issues > 0 },
              { label: "正常な値", value: `${checked.length - issues} 件` }
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
          value={report}
          onChange={setReport}
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
export function CenterLab({ card }: LabProps) {
  const [raw, setRaw] = useState("2,3,3,4,8");
  const [outlier, setOutlier] = useState(8);
  const [classA, setClassA] = useState("58,62,65,67,70,72,74,76,78,95");
  const [classB, setClassB] = useState("40,52,60,68,71,73,79,86,92,96");
  const [prices, setPrices] = useState("550,650,700,800,800");
  const [counts, setCounts] = useState("60,40,25,40,35");
  const [rates, setRates] = useState("1.4,1.357,1.053,1.2,1.25");
  const [speeds, setSpeeds] = useState("10,4");
  const [compare, setCompare] = useState("");

  const base = parseNumbers(raw);
  const replaced = [...base.slice(0, -1), outlier];
  const s1 = summarize(base);
  const s2 = summarize(replaced);
  const a = summarize(classA);
  const b = summarize(classB);
  const priceValues = parseNumbers(prices);
  const countValues = parseNumbers(counts);
  const rateValues = parseNumbers(rates);
  const speedValues = parseNumbers(speeds);

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
              <Results
                items={[
                  { label: "平均値", value: fmt(s1.mean, 3), note: `合計 ${fmt(s1.sum, 2)} ÷ ${s1.n}` },
                  { label: "中央値", value: fmt(s1.median, 3) },
                  { label: "最頻値", value: s1.modes.length ? s1.modes.join(", ") : "なし" },
                  { label: "範囲", value: `${s1.min} 〜 ${s1.max}`, note: `レンジ ${fmt(s1.range, 2)}` }
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
              <Results
                items={[
                  { label: "平均値（元）", value: fmt(s1.mean, 3) },
                  { label: "平均値（変更後）", value: fmt(s2.mean, 3), warn: Math.abs(s2.mean - s1.mean) > 1 },
                  { label: "中央値（元）", value: fmt(s1.median, 3) },
                  { label: "中央値（変更後）", value: fmt(s2.median, 3) }
                ]}
              />
              <Hint>平均はすべての値を使うので大きく動きます。中央値は順位で決まるので、ほとんど動きません。</Hint>
            </>
          )}
        </>
      )}

      {card(
        2,
        "四分位数と五数要約を求める",
        "データを4等分する位置の値を求めます。",
        <>
          {a && (
            <>
              <AreaField label="データを入力" value={classA} onChange={setClassA} rows={2} />
              <Formula>QUARTILE.INC と同じ、線形補間で求めています</Formula>
              <Steps
                items={[
                  { label: "最小値", value: fmt(a.min, 2) },
                  { label: "第1四分位数 Q1", value: fmt(a.q1, 2) },
                  { label: "中央値 Q2", value: fmt(a.q2, 2) },
                  { label: "第3四分位数 Q3", value: fmt(a.q3, 2) },
                  { label: "最大値", value: fmt(a.max, 2) }
                ]}
              />
              <Results
                items={[
                  { label: "四分位範囲 IQR", value: fmt(a.iqr, 3), note: "Q3 − Q1" },
                  { label: "四分位偏差", value: fmt(a.qd, 3), note: "IQR ÷ 2" },
                  { label: "外れ値の目安（下）", value: fmt(a.lowerFence, 2) },
                  { label: "外れ値の目安（上）", value: fmt(a.upperFence, 2) }
                ]}
              />
              {a.outliers.length > 0 && (
                <Verdict ok={false}>外れ値の候補: {a.outliers.join(", ")} — 削除する前に原因を確認しましょう。</Verdict>
              )}
            </>
          )}
        </>
      )}

      {card(
        3,
        "箱ひげ図で2クラスを比べる",
        "平均が近くても、ばらつきが違うことを図で確かめます。",
        <>
          <Row>
            <AreaField label="Aクラス" value={classA} onChange={setClassA} rows={2} />
            <AreaField label="Bクラス" value={classB} onChange={setClassB} rows={2} />
          </Row>
          {a && <div className="box-row"><span>A</span><BoxPlot summary={a} /></div>}
          {b && <div className="box-row"><span>B</span><BoxPlot summary={b} /></div>}
          {a && b && (
            <DataTable
              head={["", "平均", "中央値", "Q1", "Q3", "IQR", "範囲"]}
              rows={[
                ["A", fmt(a.mean, 2), fmt(a.q2, 2), fmt(a.q1, 2), fmt(a.q3, 2), fmt(a.iqr, 2), fmt(a.range, 2)],
                ["B", fmt(b.mean, 2), fmt(b.q2, 2), fmt(b.q1, 2), fmt(b.q3, 2), fmt(b.iqr, 2), fmt(b.range, 2)]
              ]}
            />
          )}
        </>
      )}

      {card(
        4,
        "加重平均を求める",
        "重みが違うときは、単純平均では答えが合いません。",
        <>
          <Row>
            <TextField label="価格（円）" value={prices} onChange={setPrices} />
            <TextField label="販売数" value={counts} onChange={setCounts} />
          </Row>
          <Formula>加重平均 ＝ Σ(価格 × 販売数) ÷ Σ販売数</Formula>
          <DataTable
            head={["価格", "販売数", "価格×販売数"]}
            rows={priceValues.map((p, i) => [p, countValues[i] ?? 0, fmt(p * (countValues[i] ?? 0), 0)])}
          />
          <Results
            items={[
              { label: "単純平均（誤り）", value: fmt(priceValues.reduce((x, y) => x + y, 0) / (priceValues.length || 1), 2) },
              { label: "加重平均（正しい）", value: fmt(weightedMean(priceValues, countValues), 2) },
              { label: "総売上", value: fmt(priceValues.reduce((sum, p, i) => sum + p * (countValues[i] ?? 0), 0), 0) },
              { label: "総販売数", value: fmt(countValues.reduce((x, y) => x + y, 0), 0) }
            ]}
          />
        </>
      )}

      {card(
        5,
        "幾何平均と調和平均を使い分ける",
        "変化率の平均と、単位あたりの量の平均は式が違います。",
        <>
          <TextField label="毎年の売上倍率（1.4なら40%増）" value={rates} onChange={setRates} />
          <Results
            items={[
              { label: "算術平均（誤り）", value: fmt(rateValues.reduce((x, y) => x + y, 0) / (rateValues.length || 1), 4) },
              { label: "幾何平均（正しい）", value: fmt(geometricMean(rateValues), 4) },
              { label: "平均伸び率", value: `${fmt((geometricMean(rateValues) - 1) * 100, 2)} %` },
              { label: `${rateValues.length}年後の倍率`, value: fmt(rateValues.reduce((x, y) => x * y, 1), 4) }
            ]}
          />
          <TextField label="往路と復路の時速（km/h）" value={speeds} onChange={setSpeeds} />
          <Results
            items={[
              { label: "算術平均（誤り）", value: `${fmt(speedValues.reduce((x, y) => x + y, 0) / (speedValues.length || 1), 3)} km/h` },
              { label: "調和平均（正しい）", value: `${fmt(harmonicMean(speedValues), 3)} km/h` }
            ]}
          />
          <Hint>同じ距離を往復するとき、遅いほうに時間が多くかかるため、平均時速は単純平均より小さくなります。</Hint>
        </>
      )}

      {card(
        6,
        "平均が同じ2クラスを比較する",
        "中心とばらつきの両方を使って説明します。",
        <AreaField
          label="2クラスの違いと、その根拠"
          value={compare}
          onChange={setCompare}
          placeholder="例：平均はほぼ同じだが、AのIQRは11、Bは26でBのばらつきが大きい。Aは中位層に集中し、Bは上下に分かれている。指導は、Aは全体に、Bは層別に行うのが有効。"
          rows={5}
        />
      )}
    </>
  );
}

/* ========================================================================
 * A3 分散・標準偏差・偏差値
 * ====================================================================== */
export function SpreadLab({ card }: LabProps) {
  const [raw, setRaw] = useState("62,68,71,72,75,78,81,95");
  const [groupA, setGroupA] = useState("48,49,50,51,52");
  const [groupB, setGroupB] = useState("30,40,50,60,70");
  const [score, setScore] = useState(80);
  const [mean, setMean] = useState(60);
  const [sd, setSd] = useState(10);
  const [jScore, setJScore] = useState(70);
  const [jMean, setJMean] = useState(65);
  const [jSd, setJSd] = useState(8);
  const [mScore, setMScore] = useState(60);
  const [mMean, setMMean] = useState(50);
  const [mSd, setMSd] = useState(15);
  const [conclusion, setConclusion] = useState("");

  const s = summarize(raw);
  const a = summarize(groupA);
  const b = summarize(groupB);
  const z = zScore(score, mean, sd);
  const jz = zScore(jScore, jMean, jSd);
  const mz = zScore(mScore, mMean, mSd);

  return (
    <>
      {card(
        0,
        "偏差を求めて、合計が0になることを確かめる",
        "各データが平均からどれだけ離れているかを見ます。",
        <>
          <AreaField label="データを入力" value={raw} onChange={setRaw} rows={2} />
          {s && (
            <>
              <DataTable
                head={["値", "偏差（値 − 平均）", "偏差の2乗"]}
                rows={s.values.map((v) => [v, fmt(v - s.mean, 3), fmt((v - s.mean) ** 2, 3)])}
              />
              <Results
                items={[
                  { label: "平均", value: fmt(s.mean, 4) },
                  { label: "偏差の合計", value: fmt(s.values.reduce((acc, v) => acc + (v - s.mean), 0), 10), note: "必ず0になる" },
                  { label: "偏差の2乗の合計", value: fmt(s.values.reduce((acc, v) => acc + (v - s.mean) ** 2, 0), 3) }
                ]}
              />
              <Hint>偏差をそのまま足すと必ず0。だから2乗してから平均をとります。</Hint>
            </>
          )}
        </>
      )}

      {card(
        1,
        "分散と標準偏差を組み立てる",
        "偏差の2乗の平均が分散、その平方根が標準偏差です。",
        <>
          {s && (
            <>
              <Formula>分散 ＝ Σ(値 − 平均)² ÷ n　／　標準偏差 ＝ √分散</Formula>
              <Steps
                items={[
                  { label: "偏差2乗の合計", value: fmt(s.variance * s.n, 4) },
                  { label: "÷ データ数", value: `÷ ${s.n}` },
                  { label: "分散（母集団）", value: fmt(s.variance, 4) },
                  { label: "標準偏差", value: fmt(s.sd, 4) }
                ]}
              />
              <Results
                items={[
                  { label: "分散 VAR.P", value: fmt(s.variance, 4) },
                  { label: "標準偏差 STDEV.P", value: fmt(s.sd, 4) },
                  { label: "不偏分散（n−1で割る）", value: fmt(s.uVariance, 4) },
                  { label: "不偏標準偏差 STDEV.S", value: fmt(s.uSd, 4) }
                ]}
              />
            </>
          )}
        </>
      )}

      {card(
        2,
        "同じ平均、違うばらつき",
        "平均だけでは分布の違いを説明できないことを確かめます。",
        <>
          <Row>
            <TextField label="集団A" value={groupA} onChange={setGroupA} />
            <TextField label="集団B" value={groupB} onChange={setGroupB} />
          </Row>
          {a && b && (
            <>
              <DataTable
                head={["", "平均", "分散", "標準偏差", "範囲"]}
                rows={[
                  ["A", fmt(a.mean, 2), fmt(a.variance, 2), fmt(a.sd, 3), `${a.min}〜${a.max}`],
                  ["B", fmt(b.mean, 2), fmt(b.variance, 2), fmt(b.sd, 3), `${b.min}〜${b.max}`]
                ]}
              />
              <Verdict ok={Math.abs(a.mean - b.mean) < 0.001}>
                {Math.abs(a.mean - b.mean) < 0.001
                  ? `平均はどちらも ${fmt(a.mean, 2)} ですが、標準偏差は ${fmt(a.sd, 2)} と ${fmt(b.sd, 2)} で ${fmt(b.sd / (a.sd || 1), 1)} 倍違います。`
                  : "平均をそろえると、ばらつきの違いがはっきり見えます。"}
              </Verdict>
            </>
          )}
        </>
      )}

      {card(
        3,
        "z得点を求める",
        "平均から標準偏差いくつ分離れているかを計算します。",
        <>
          <Row>
            <NumberField label="得点" value={score} onChange={setScore} />
            <NumberField label="平均" value={mean} onChange={setMean} />
            <NumberField label="標準偏差" value={sd} onChange={setSd} min={0.1} step={0.1} />
          </Row>
          <Formula>z ＝ (値 − 平均) ÷ 標準偏差</Formula>
          <Steps
            items={[
              { label: "平均との差", value: fmt(score - mean, 3) },
              { label: "÷ 標準偏差", value: `÷ ${sd}` },
              { label: "z得点", value: fmt(z, 4) }
            ]}
          />
          <NormalCurve mean={0} sd={1} marks={[{ value: clamp(z, -3.8, 3.8), label: `z=${fmt(z, 2)}` }]} />
        </>
      )}

      {card(
        4,
        "偏差値に直す",
        "z得点を平均50・標準偏差10に変換します。",
        <>
          <Formula>偏差値 ＝ 50 + 10 × z</Formula>
          <Results
            items={[
              { label: "z得点", value: fmt(z, 4) },
              { label: "偏差値", value: fmt(tScore(score, mean, sd), 2) },
              { label: "上位から", value: `${fmt((1 - normalCdf(z)) * 100, 2)} %`, note: "正規分布とみなした場合" },
              { label: "同じ位置の人数（300人中）", value: `${fmt((1 - normalCdf(z)) * 300, 1)} 人` }
            ]}
          />
          <Hint>偏差値60はz=1、上位約15.9%。偏差値70はz=2、上位約2.3%です。</Hint>
        </>
      )}

      {card(
        5,
        "2教科の得点を公平に比べる",
        "平均も標準偏差も違う2教科を、同じものさしに乗せます。",
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
              ? `国語のほうが集団の中で相対的に上です（偏差値 ${fmt(50 + 10 * jz, 1)} 対 ${fmt(50 + 10 * mz, 1)}）。`
              : jz < mz
                ? `数学のほうが集団の中で相対的に上です（偏差値 ${fmt(50 + 10 * mz, 1)} 対 ${fmt(50 + 10 * jz, 1)}）。`
                : "どちらも同じ位置です。"}
          </Verdict>
          <Hint>素点では国語70・数学60でも、標準化すると順位が入れかわることがあります。</Hint>
        </>
      )}

      {card(
        6,
        "2教科の得点を公平に比べる（まとめ）",
        "計算結果をもとに、どちらが良かったかを説明します。",
        <AreaField
          label="判断と、その根拠"
          value={conclusion}
          onChange={setConclusion}
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
export function NormalLab({ card }: LabProps) {
  const [n, setN] = useState(10);
  const [p, setP] = useState(0.5);
  const [mean, setMean] = useState(50);
  const [sd, setSd] = useState(10);
  const [target, setTarget] = useState(70);
  const [population, setPopulation] = useState(300);
  const [report, setReport] = useState("");

  const pmf = Array.from({ length: n + 1 }, (_, k) => binomialPmf(n, k, p));
  const z = zScore(target, mean, sd);
  const upper = 1 - normalCdf(z);

  return (
    <>
      {card(
        0,
        "二項分布を作る",
        "試行回数と成功確率を変えて、分布の形を見ます。",
        <>
          <Row>
            <NumberField label="試行回数 n" value={n} onChange={(v) => setN(clamp(Math.round(v), 1, 60))} min={1} max={60} unit="回" />
            <NumberField label="1回の成功確率 p" value={p} onChange={(v) => setP(clamp(v, 0.01, 0.99))} min={0.01} max={0.99} step={0.01} />
          </Row>
          <BarChart values={pmf} labels={pmf.map((_, k) => (n <= 20 || k % 5 === 0 ? String(k) : ""))} />
          <Results
            items={[
              { label: "期待値 n×p", value: fmt(n * p, 2) },
              { label: "標準偏差 √(np(1−p))", value: fmt(Math.sqrt(n * p * (1 - p)), 3) },
              { label: "最も確率が高い回数", value: pmf.indexOf(Math.max(...pmf)) },
              { label: "その確率", value: `${fmt(Math.max(...pmf) * 100, 2)} %` }
            ]}
          />
          <Hint>試行回数を増やすほど、棒グラフは滑らかな釣り鐘型（正規分布）に近づきます。</Hint>
        </>
      )}

      {card(
        1,
        "正規分布の位置と広がりを変える",
        "平均と標準偏差だけで、分布が完全に決まることを確かめます。",
        <>
          <Row>
            <NumberField label="平均 μ" value={mean} onChange={setMean} />
            <NumberField label="標準偏差 σ" value={sd} onChange={setSd} min={0.5} step={0.5} />
          </Row>
          <NormalCurve mean={mean} sd={sd} marks={[{ value: mean, label: `μ=${mean}` }]} />
          <Results
            items={[
              { label: "最も高い点（確率密度）", value: fmt(normalPdf(mean, mean, sd), 5) },
              { label: "μ ± 1σ", value: `${fmt(mean - sd, 1)} 〜 ${fmt(mean + sd, 1)}` },
              { label: "μ ± 2σ", value: `${fmt(mean - 2 * sd, 1)} 〜 ${fmt(mean + 2 * sd, 1)}` },
              { label: "μ ± 3σ", value: `${fmt(mean - 3 * sd, 1)} 〜 ${fmt(mean + 3 * sd, 1)}` }
            ]}
          />
        </>
      )}

      {card(
        2,
        "68-95-99.7の法則を確かめる",
        "平均から標準偏差いくつ分の範囲に、どれだけ入るかを計算します。",
        <>
          <DataTable
            head={["範囲", "含まれる割合", "外側の割合", "偏差値でいうと"]}
            rows={[1, 2, 3].map((k) => [
              `μ ± ${k}σ`,
              `${fmt((normalCdf(k) - normalCdf(-k)) * 100, 2)} %`,
              `${fmt((1 - (normalCdf(k) - normalCdf(-k))) * 100, 2)} %`,
              `${50 - 10 * k} 〜 ${50 + 10 * k}`
            ])}
          />
          <Hint>偏差値40〜60に約68%、30〜70に約95%が入ります。偏差値70以上は上位約2.3%です。</Hint>
        </>
      )}

      {card(
        3,
        "自分の位置を確率で求める",
        "得点を入力して、上位何%にあたるかを計算します。",
        <>
          <Row>
            <NumberField label="自分の得点" value={target} onChange={setTarget} />
            <NumberField label="学年の人数" value={population} onChange={setPopulation} min={1} max={5000} unit="人" />
          </Row>
          <NormalCurve mean={mean} sd={sd} marks={[{ value: clamp(target, mean - 3.8 * sd, mean + 3.8 * sd), label: `${target}点` }]} />
          <Results
            items={[
              { label: "z得点", value: fmt(z, 3) },
              { label: "偏差値", value: fmt(50 + 10 * z, 2) },
              { label: "上位", value: `${fmt(upper * 100, 2)} %` },
              { label: "順位の目安", value: `${fmt(Math.max(1, upper * population), 1)} 位` }
            ]}
          />
        </>
      )}

      {card(
        4,
        "確率密度と累積確率の違い",
        "カーブの高さと、面積の違いを確かめます。",
        <>
          <DataTable
            head={["値", "確率密度 NORM.DIST(...,FALSE)", "累積確率 NORM.DIST(...,TRUE)"]}
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
        5,
        "校内テストの位置づけを説明する",
        "計算結果を使って、自分の位置を言葉で説明します。",
        <AreaField
          label="説明文"
          value={report}
          onChange={setReport}
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
export function RelationLab({ card }: LabProps) {
  const [xs, setXs] = useState("1,2,3,4,5,6,7,8,9,10");
  const [ys, setYs] = useState("18,26,33,41,50,59,68,72,79,88");
  const [predictX, setPredictX] = useState(12);
  const [cause, setCause] = useState("気温");
  const [statement, setStatement] = useState("スマホ時間と成績に負の相関があるので、スマホが成績低下の原因である。");
  const [proposal, setProposal] = useState("");

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
  const risky = /原因|必ず|せい|impact|causes/.test(statement);

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
              { label: "データの組数", value: n },
              { label: "x の平均", value: sx ? fmt(sx.mean, 3) : "-" },
              { label: "y の平均", value: sy ? fmt(sy.mean, 3) : "-" },
              { label: "見た目の傾向", value: correlationLabel(r) }
            ]}
          />
        </>
      )}

      {card(
        1,
        "共分散を計算する",
        "xの偏差とyの偏差を掛けて平均します。",
        <>
          <Formula>共分散 ＝ Σ(x − x̄)(y − ȳ) ÷ n</Formula>
          {sx && sy && (
            <DataTable
              head={["x", "y", "x の偏差", "y の偏差", "偏差積"]}
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
              { label: "共分散", value: fmt(cov, 4) },
              { label: "符号の意味", value: cov > 0 ? "同じ方向に動く傾向" : cov < 0 ? "逆方向に動く傾向" : "傾向なし" }
            ]}
          />
          <Hint>共分散は単位に左右されるため、大きさそのものを他のデータと比べることはできません。</Hint>
        </>
      )}

      {card(
        2,
        "相関係数にそろえる",
        "共分散を標準偏差の積で割ると、−1〜1に収まります。",
        <>
          <Formula>r ＝ 共分散 ÷ (x の標準偏差 × y の標準偏差)</Formula>
          {sx && sy && (
            <Steps
              items={[
                { label: "共分散", value: fmt(cov, 4) },
                { label: "x の標準偏差", value: fmt(sx.sd, 4) },
                { label: "y の標準偏差", value: fmt(sy.sd, 4) },
                { label: "相関係数 r", value: fmt(r, 5) }
              ]}
            />
          )}
          <Results
            items={[
              { label: "相関係数 r", value: fmt(r, 4) },
              { label: "判定", value: correlationLabel(r) },
              { label: "決定係数 R²", value: fmt(r * r, 4), note: "回帰で説明できる割合" }
            ]}
          />
        </>
      )}

      {card(
        3,
        "回帰直線を引いて予測する",
        "最小二乗法で直線を求め、xからyを予測します。",
        <>
          <Scatter xs={xValues} ys={yValues} line={fit} />
          {fit && (
            <>
              <Formula>
                y ＝ {fmt(fit.a, 4)} x {fit.b >= 0 ? "+" : "−"} {fmt(Math.abs(fit.b), 4)}
              </Formula>
              <Row>
                <NumberField label="x の値を入力" value={predictX} onChange={setPredictX} step={0.5} />
              </Row>
              <Results
                items={[
                  { label: "傾き a", value: fmt(fit.a, 4), note: "xが1増えるとyがこれだけ変わる" },
                  { label: "切片 b", value: fmt(fit.b, 4) },
                  { label: `x = ${predictX} のときの予測値`, value: fmt(fit.a * predictX + fit.b, 3) },
                  { label: "決定係数 R²", value: fmt(fit.r2, 4), warn: fit.r2 < 0.5 }
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
        "交絡要因を探す",
        "相関の背後にある第三の要因を確かめます。",
        <>
          <Tabs value={cause} onChange={setCause} options={Object.keys(causes).map((value) => ({ value, label: value }))} />
          <div className="cause-map">
            <strong>{cause}</strong>
            <div className="branches">
              <span>{causes[cause][0]}</span>
              <span>{causes[cause][1]}</span>
            </div>
          </div>
          <Results items={[{ label: "読み取り", value: causes[cause][2] }]} />
          <AreaField label="分析文を書いてみる" value={statement} onChange={setStatement} rows={3} />
          <Verdict ok={!risky}>
            {risky
              ? "「原因」「必ず」などの断定表現があります。相関からは因果を証明できません。"
              : "相関の範囲で表現できています。"}
          </Verdict>
        </>
      )}

      {card(
        5,
        "相関から言える範囲を決める",
        "交絡要因と追加調査まで含めて提案します。",
        <AreaField
          label="言えることの範囲と、次に行う調査"
          value={proposal}
          onChange={setProposal}
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
export function SimulationLab({ card }: LabProps) {
  const [times, setTimes] = useState(1000);
  const [seed, setSeed] = useState(1);
  const [points, setPoints] = useState(2000);
  const [arrival, setArrival] = useState(3);
  const [service, setService] = useState(4);
  const [staff, setStaff] = useState(1);
  const [assumption, setAssumption] = useState("");

  const dice = useMemo(() => rollDice(times, seed), [times, seed]);
  const series = useMemo(() => [50, 100, 1000, 10000].map((t) => ({ t, data: rollDice(t, seed) })), [seed]);
  const pi = useMemo(() => monteCarloPi(points, seed), [points, seed]);
  const rho = arrival > 0 ? service / (arrival * staff) : Infinity;
  const waitMinutes = rho >= 1 ? Infinity : (rho * service) / (1 - rho);

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
          <Hint>回数が10倍になると、ずれはおよそ1/√10（約0.32倍）に縮みます。</Hint>
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
              { label: "円の中に入った点", value: fmt(pi.inside, 0) },
              { label: "全体の点", value: fmt(pi.points, 0) },
              { label: "求まったπ", value: fmt(pi.pi, 5) },
              { label: "真の値との差", value: fmt(Math.abs(pi.pi - Math.PI), 5) }
            ]}
          />
        </>
      )}

      {card(
        3,
        "文化祭の受付をモデル化する",
        "到着間隔と処理時間から、行列が伸びるかを判断します。",
        <>
          <Row>
            <NumberField label="平均到着間隔" value={arrival} onChange={setArrival} min={0.5} max={20} step={0.5} unit="分" />
            <NumberField label="1人あたりの処理時間" value={service} onChange={setService} min={0.5} max={20} step={0.5} unit="分" />
            <NumberField label="受付の人数" value={staff} onChange={setStaff} min={1} max={10} unit="人" />
          </Row>
          <Formula>利用率 ρ ＝ 処理時間 ÷ (到着間隔 × 受付人数)</Formula>
          <Results
            items={[
              { label: "利用率 ρ", value: fmt(rho, 3), warn: rho >= 1 },
              { label: "判定", value: rho >= 1 ? "行列は際限なく伸びる" : "行列は落ち着く", warn: rho >= 1 },
              { label: "平均待ち時間の目安", value: Number.isFinite(waitMinutes) ? `${fmt(waitMinutes, 2)} 分` : "無限大", warn: !Number.isFinite(waitMinutes) },
              { label: "1時間あたりの到着", value: `${fmt(60 / arrival, 1)} 人` }
            ]}
          />
          <Verdict ok={rho < 1}>
            {rho < 1
              ? `受付${staff}人で対応できます。待ち時間の目安は約${fmt(waitMinutes, 1)}分です。`
              : `受付${staff}人では足りません。${Math.ceil(service / arrival)}人以上が必要です。`}
          </Verdict>
        </>
      )}

      {card(
        4,
        "仮定を変えて結果を比べる",
        "同じモデルでも、置いた仮定で結論が変わることを確かめます。",
        <>
          <DataTable
            head={["受付人数", "利用率 ρ", "判定", "平均待ち時間"]}
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
          value={assumption}
          onChange={setAssumption}
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
export function TestLab({ card }: LabProps) {
  const [pValue, setPValue] = useState(0.03);
  const [alpha, setAlpha] = useState(0.05);
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
  const [conclusion, setConclusion] = useState("");

  const breadValues = parseNumbers(bread);
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
    "mean-known": ["Z検定", "母平均と母標準偏差がわかっている場合の平均の検定。"],
    "mean-unknown": ["1標本 t検定", "母分散が未知で、標本から不偏分散を推定する場合。"],
    paired: ["対応のある t検定", "同じ対象の前後や2条件を比べる場合。個人差の影響を除ける。"],
    unpaired: ["対応のない t検定", "別々の集団の平均を比べる場合。"],
    ratio: ["カイ二乗検定", "質的変数どうしの関連（クロス集計表の独立性）を調べる場合。"]
  };

  return (
    <>
      {card(
        0,
        "p値と有意水準で判定する",
        "2つの値を動かして、判定がどこで切り替わるかを確かめます。",
        <>
          <SliderField label="p値" value={pValue} onChange={setPValue} min={0} max={0.2} step={0.001} />
          <SliderField label="有意水準 α" value={alpha} onChange={setAlpha} min={0.01} max={0.1} step={0.01} />
          <Verdict ok={pValue < alpha}>
            p = {fmt(pValue, 3)} {pValue < alpha ? "<" : "≧"} α = {fmt(alpha, 2)} → {pJudge(pValue, alpha)}
          </Verdict>
          <Hint>
            棄却できたとしても「差がある」と言えるだけで、「差が大きい」とは言えません。逆に棄却できなくても「差がない」ことの証明にはなりません。
          </Hint>
        </>
      )}

      {card(
        1,
        "Z検定：パンの重量を確かめる",
        "母平均と母標準偏差がわかっている場合の検定です。",
        <>
          <AreaField label="追加生産10個の重量(g)" value={bread} onChange={setBread} rows={2} />
          <Row>
            <NumberField label="母平均 μ₀" value={mu0} onChange={setMu0} step={0.01} unit="g" />
            <NumberField label="母標準偏差 σ" value={sigma} onChange={setSigma} step={0.0001} min={0.0001} unit="g" />
          </Row>
          {zResult && (
            <>
              <Formula>Z ＝ (標本平均 − 母平均) ÷ (σ ÷ √n)</Formula>
              <Steps
                items={[
                  { label: "標本数 n", value: zResult.n },
                  { label: "標本平均", value: fmt(zResult.mean, 4) },
                  { label: "標準誤差 σ/√n", value: fmt(zResult.se, 5) },
                  { label: "Z値", value: fmt(zResult.z, 4) }
                ]}
              />
              <Results
                items={[
                  { label: "片側 p値", value: fmt(zResult.pOne, 5) },
                  { label: "両側 p値", value: fmt(zResult.pTwo, 5) },
                  { label: "判定（両側 α=0.05）", value: pJudge(zResult.pTwo, 0.05), warn: zResult.pTwo < 0.05 }
                ]}
              />
              <Verdict ok={zResult.pTwo >= 0.05}>
                {zResult.pTwo >= 0.05
                  ? "誤差の範囲内といえます（帰無仮説を棄却できません）。"
                  : "母平均と異なるといえます（帰無仮説を棄却）。品質を点検しましょう。"}
              </Verdict>
            </>
          )}
        </>
      )}

      {card(
        2,
        "t検定：卵の平均価格を確かめる",
        "母分散が未知なので、標本から不偏分散を推定します。",
        <>
          <AreaField label="15店舗の価格(円)" value={eggs} onChange={setEggs} rows={2} />
          <NumberField label="比べたい母平均 μ₀" value={eggMu} onChange={setEggMu} unit="円" />
          {tResult && (
            <>
              <Formula>t ＝ (標本平均 − 母平均) ÷ (不偏標準偏差 ÷ √n)</Formula>
              <Steps
                items={[
                  { label: "標本数 n", value: tResult.n },
                  { label: "標本平均", value: fmt(tResult.mean, 4) },
                  { label: "不偏標準偏差", value: fmt(tResult.uSd, 4) },
                  { label: "標準誤差", value: fmt(tResult.se, 5) },
                  { label: "自由度 df", value: tResult.df },
                  { label: "t値", value: fmt(tResult.t, 4) }
                ]}
              />
              <Results
                items={[
                  { label: "両側 p値", value: fmt(tResult.pTwo, 5) },
                  { label: "片側 p値", value: fmt(tResult.pOne, 5) },
                  { label: "判定（両側 α=0.05）", value: pJudge(tResult.pTwo, 0.05), warn: tResult.pTwo < 0.05 }
                ]}
              />
            </>
          )}
        </>
      )}

      {card(
        3,
        "95%信頼区間を求める",
        "「差があるか」ではなく「どのあたりか」を幅で示します。",
        <>
          {ci && (
            <>
              <Formula>信頼区間 ＝ 標本平均 ± t臨界値 × 標準誤差</Formula>
              <Steps
                items={[
                  { label: "標本平均", value: fmt(ci.mean, 4) },
                  { label: "標準誤差", value: fmt(ci.se, 5) },
                  { label: "自由度", value: ci.df },
                  { label: "t臨界値（両側5%）", value: fmt(ci.tCritical, 4) },
                  { label: "誤差の幅", value: fmt(ci.margin, 4) }
                ]}
              />
              <Results
                items={[
                  { label: "95%信頼区間", value: `${fmt(ci.lower, 3)} 〜 ${fmt(ci.upper, 3)}` },
                  { label: `${eggMu}円は区間に入るか`, value: eggMu >= ci.lower && eggMu <= ci.upper ? "入る" : "入らない", warn: !(eggMu >= ci.lower && eggMu <= ci.upper) }
                ]}
              />
              <Hint>
                区間に比較対象の値が入らないことと、両側検定で棄却されることは同じ意味になります。検定と区間推定は表裏一体です。
              </Hint>
            </>
          )}
        </>
      )}

      {card(
        4,
        "対応のあるt検定：学科と実技を比べる",
        "同じ人の2つの得点なので、差そのものを検定します。",
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
              <Results
                items={[
                  { label: "差の平均", value: fmt(paired.mean, 3) },
                  { label: "t値", value: fmt(paired.t, 4) },
                  { label: "自由度", value: paired.df },
                  { label: "両側 p値", value: fmt(paired.pTwo, 5) }
                ]}
              />
              <Verdict ok={paired.pTwo >= 0.05}>
                {paired.pTwo < 0.05
                  ? "平均値に差があるといえます（帰無仮説を棄却）。"
                  : "平均値に差があるとはいえません（帰無仮説を棄却できません）。"}
              </Verdict>
            </>
          )}
        </>
      )}

      {card(
        5,
        "カイ二乗検定：割合の差を確かめる",
        "クロス集計表から期待度数を求め、ずれの大きさを測ります。",
        <>
          <div className="two-column">
            <div>
              <h4>男性</h4>
              <NumberField label="5回以上" value={maleYes} onChange={setMaleYes} min={0} max={9999} unit="人" />
              <NumberField label="4回以下" value={maleNo} onChange={setMaleNo} min={0} max={9999} unit="人" />
            </div>
            <div>
              <h4>女性</h4>
              <NumberField label="5回以上" value={femaleYes} onChange={setFemaleYes} min={0} max={9999} unit="人" />
              <NumberField label="4回以下" value={femaleNo} onChange={setFemaleNo} min={0} max={9999} unit="人" />
            </div>
          </div>
          {chi && (
            <>
              <DataTable
                head={["", "5回以上（実測）", "4回以下（実測）", "5回以上（期待）", "4回以下（期待）"]}
                rows={[
                  ["男性", maleYes, maleNo, fmt(chi.expected[0][0], 2), fmt(chi.expected[0][1], 2)],
                  ["女性", femaleYes, femaleNo, fmt(chi.expected[1][0], 2), fmt(chi.expected[1][1], 2)]
                ]}
              />
              <Formula>χ² ＝ Σ (実測度数 − 期待度数)² ÷ 期待度数</Formula>
              <Results
                items={[
                  { label: "χ² 統計量", value: fmt(chi.chi2, 4) },
                  { label: "自由度", value: chi.df },
                  { label: "p値", value: fmt(chi.p, 6) },
                  { label: "判定（α=0.05）", value: pJudge(chi.p, 0.05), warn: chi.p < 0.05 }
                ]}
              />
              <DataTable
                head={["", "5回以上の調整済み残差", "4回以下の調整済み残差"]}
                rows={[
                  ["男性", fmt(chi.residuals[0][0], 3), fmt(chi.residuals[0][1], 3)],
                  ["女性", fmt(chi.residuals[1][0], 3), fmt(chi.residuals[1][1], 3)]
                ]}
              />
              <Hint>調整済み標準化残差の絶対値が約2を超えるセルが、差を生んでいる場所です。＋は期待より多い、−は少ないことを表します。</Hint>
            </>
          )}
        </>
      )}

      {card(
        6,
        "目的から検定を選ぶ",
        "何を比べるかで、使う手法が決まります。",
        <>
          <SelectField
            label="調べたいこと"
            value={question}
            onChange={setQuestion}
            options={[
              { value: "mean-known", label: "母分散が既知の平均を比べる" },
              { value: "mean-unknown", label: "母分散が未知の平均を比べる" },
              { value: "paired", label: "同じ人の2つの得点を比べる" },
              { value: "unpaired", label: "別のクラスの平均を比べる" },
              { value: "ratio", label: "男女で選択の割合を比べる" }
            ]}
          />
          <Results items={[{ label: choices[question][0], value: choices[question][1] }]} />
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
        </>
      )}

      {card(
        7,
        "目的に合う検定を選ぶ（まとめ）",
        "仮説・有意水準・判定・限界まで含めて書きます。",
        <AreaField
          label="2つの調査それぞれの設計と結論"
          value={conclusion}
          onChange={setConclusion}
          placeholder="例：(1) 2クラスの平均点は母分散未知なので対応のないt検定。H0:差がない、α=0.05、両側。(2) 学年別のA/B選択はカイ二乗検定。H0:学年と選択は独立。いずれもp値とαで判定し、95%信頼区間または残差を添える。"
          rows={6}
        />
      )}
    </>
  );
}

/* ========================================================================
 * A8 時系列とAI活用
 * ====================================================================== */
export function TimeseriesLab({ card }: LabProps) {
  const [raw, setRaw] = useState(TEMPS);
  const [startYear, setStartYear] = useState(1980);
  const [windowSize, setWindowSize] = useState(5);
  const [thisYear, setThisYear] = useState(1200);
  const [lastYear, setLastYear] = useState(1000);
  const [lastMonth, setLastMonth] = useState(1500);
  const [prompt, setPrompt] = useState("この表を分析して結論を出して。");
  const [audit, setAudit] = useState("");

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
        "時系列データを並べて見る",
        "時間順のデータを入力して、変化の様子を確かめます。",
        <>
          <AreaField label="時系列データ（古い順）" value={raw} onChange={setRaw} rows={3} />
          <NumberField label="最初の年" value={startYear} onChange={setStartYear} min={1900} max={2100} unit="年" />
          <BarChart values={values} labels={labels} unit="℃" />
          <Results
            items={[
              { label: "データ数", value: `${values.length} 期間` },
              { label: "最初の値", value: fmt(values[0] ?? 0, 2) },
              { label: "最後の値", value: fmt(values.at(-1) ?? 0, 2) },
              { label: "全体の変化", value: fmt((values.at(-1) ?? 0) - (values[0] ?? 0), 2) }
            ]}
          />
        </>
      )}

      {card(
        1,
        "移動平均で短期の揺れをならす",
        "窓幅を変えて、なめらかさと反応の速さを比べます。",
        <>
          <SliderField label="窓幅" value={windowSize} onChange={setWindowSize} min={2} max={11} unit=" 期間" />
          <BarChart values={values} labels={labels} overlay={ma} unit="℃" />
          <DataTable
            head={["年", "実測値", `${windowSize}期間移動平均`, "差"]}
            rows={values
              .map((v, i) => [startYear + i, fmt(v, 2), ma[i] === null ? "-" : fmt(ma[i]!, 3), ma[i] === null ? "-" : fmt(v - ma[i]!, 3)])
              .filter((_, i) => i % 3 === 0)}
          />
          <Hint>折れ線が移動平均です。年ごとの上下がならされ、長期の傾向が見えやすくなります。</Hint>
        </>
      )}

      {card(
        2,
        "窓幅を変えて比べる",
        "広い窓と狭い窓で、どこが違うかを数値で確かめます。",
        <>
          <DataTable
            head={["窓幅", "計算できる期間数", "値の標準偏差", "特徴"]}
            rows={[3, 5, 7, 11].map((w) => {
              const series = movingAverage(values, w).filter((v): v is number => v !== null);
              const stat = summarize(series);
              return [
                `${w}期間`,
                series.length,
                stat ? fmt(stat.sd, 4) : "-",
                w <= 3 ? "変化に敏感" : w <= 7 ? "バランスがよい" : "長期傾向向き"
              ];
            })}
          />
          <Hint>窓幅を広げるほど標準偏差は小さくなります（＝なめらか）。そのぶん、端の期間で計算できなくなります。</Hint>
        </>
      )}

      {card(
        3,
        "トレンドを直線で表す",
        "回帰直線を引いて、長期的な変化の大きさを数値にします。",
        <>
          {trend && (
            <>
              <Formula>
                値 ＝ {fmt(trend.a, 5)} × 経過年数 {trend.b >= 0 ? "+" : "−"} {fmt(Math.abs(trend.b), 3)}
              </Formula>
              <Results
                items={[
                  { label: "1年あたりの変化", value: fmt(trend.a, 5) },
                  { label: "10年あたりの変化", value: fmt(trend.a * 10, 4) },
                  { label: `${values.length}年間の変化`, value: fmt(trend.a * (values.length - 1), 3) },
                  { label: "決定係数 R²", value: fmt(trend.r2, 4), warn: trend.r2 < 0.3 }
                ]}
              />
              <Scatter xs={values.map((_, i) => startYear + i)} ys={values} line={trend ? { a: trend.a, b: trend.b - trend.a * startYear } : null} />
              <Hint>R²が小さいときは、直線では説明しきれない変動（季節性や不規則変動）が大きいということです。</Hint>
            </>
          )}
        </>
      )}

      {card(
        4,
        "前月比と前年同月比を比べる",
        "季節性のあるデータでは、比べる相手を選ぶ必要があります。",
        <>
          <Row>
            <NumberField label="今年7月の売上" value={thisYear} onChange={setThisYear} min={0} unit="千円" />
            <NumberField label="今年6月の売上" value={lastMonth} onChange={setLastMonth} min={0} unit="千円" />
            <NumberField label="昨年7月の売上" value={lastYear} onChange={setLastYear} min={0} unit="千円" />
          </Row>
          <Results
            items={[
              { label: "前月比", value: `${fmt((thisYear / (lastMonth || 1) - 1) * 100, 1)} %` },
              { label: "前年同月比", value: `${fmt((thisYear / (lastYear || 1) - 1) * 100, 1)} %` },
              { label: "どちらで判断すべきか", value: "前年同月比", note: "季節の条件をそろえられる" }
            ]}
          />
          <Hint>アイスの売上が7月に伸びるのは当たり前。6月と比べても意味がなく、昨年7月と比べて初めて本当の伸びがわかります。</Hint>
        </>
      )}

      {card(
        5,
        "AIへの依頼文を具体化する",
        "指示に何を書くと、出力を検証できるようになるかを確かめます。",
        <>
          <AreaField label="AIへの依頼文" value={prompt} onChange={setPrompt} rows={4} />
          <Results
            items={[
              { label: "具体化スコア", value: `${hit.length} / ${keywords.length}`, warn: hit.length < 4 },
              { label: "含まれている指定", value: hit.length ? hit.join("・") : "なし" },
              { label: "不足している指定", value: keywords.filter((w) => !hit.includes(w)).join("・") || "なし" },
              { label: "検証しやすさ", value: hit.length >= 4 ? "高い" : "低い", warn: hit.length < 4 }
            ]}
          />
          <Hint>
            「目的／対象の列／手順／根拠の示し方／禁止事項／出力形式」を書くと再現性が上がります。個人情報は入力前に取り除きます。
          </Hint>
        </>
      )}

      {card(
        6,
        "AIの分析を公開前に監査する",
        "再計算・匿名化・根拠・限界の4点を確認する手順書を作ります。",
        <AreaField
          label="監査の手順書"
          value={audit}
          onChange={setAudit}
          placeholder="例：1) AIが出した平均とp値を表計算で再計算し一致を確認 2) 氏名・クラスを削除し4桁番号に置換 3) 使ったデータの範囲と件数を明記 4) 相関を因果と書いていないか読み合わせ 5) 標本数が少ない項目には限界を注記"
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
