"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  asciiInfo,
  audioBytes,
  binaryAdd,
  byteSteps,
  charVariations,
  clamp,
  dpiToDots,
  effectiveAccess,
  fmt,
  fromBase,
  fullAdder,
  gateFormula,
  gateOutput,
  halfAdder,
  imageBytes,
  instructionTimeNs,
  normalizeBinary,
  nyquist,
  onesComplement,
  padBits,
  parseBits,
  parseNumbers,
  radixComplement,
  compressionRate,
  divisionLadder,
  huffman,
  nandOnly,
  nandRecipe,
  rippleAdder,
  runLength,
  seededRandom,
  shiftBits,
  signedValue,
  sjisBytes,
  toBase,
  toFloat32,
  toMips,
  toSignedBits,
  transferSeconds,
  twosComplement,
  utf16Bytes,
  utf8Bytes,
  videoBytes,
  type Gate
} from "../lib/calc";
import {
  AreaField,
  BitStrip,
  DataTable,
  Formula,
  Hint,
  NumberField,
  Results,
  Row,
  SelectField,
  SliderField,
  Steps,
  Tabs,
  TextField,
  Toggle,
  Verdict
} from "../lib/ui";

export type CardRenderer = (index: number, title: string, goal: string, body: ReactNode) => ReactNode;
export type LabProps = { card: CardRenderer };

/** 教科書（1KB＝1,024B）にそろえた段階表示。IPAの問題文が1,000進を指定する場合は下段を見る */
const bytesRow = (bytes: number) => {
  const s = byteSteps(bytes);
  return [
    { label: "バイト", value: `${fmt(s.bytes, 0)} B` },
    { label: "キロバイト", value: `${fmt(s.kib, 2)} KB`, note: "÷1,024" },
    { label: "メガバイト", value: `${fmt(s.mib, 3)} MB`, note: "÷1,024²" },
    { label: "ギガバイト", value: `${fmt(s.gib, 4)} GB`, note: "÷1,024³" }
  ];
};

/** 問題文で1MB＝1,000kBと指定されたときの値 */
const bytesRowSI = (bytes: number) => {
  const s = byteSteps(bytes);
  return [
    { label: "キロバイト", value: `${fmt(s.kb, 2)} kB`, note: "÷1,000" },
    { label: "メガバイト", value: `${fmt(s.mb, 3)} MB`, note: "÷1,000²" },
    { label: "ギガバイト", value: `${fmt(s.gb, 4)} GB`, note: "÷1,000³" }
  ];
};

/* ========================================================================
 * D0 デジタル情報の特徴
 * ====================================================================== */
export function FeatureLab({ card }: LabProps) {
  const [temp, setTemp] = useState(21.7);
  const [gradation, setGradation] = useState("1");
  const [copies, setCopies] = useState(6);
  const [wear, setWear] = useState("normal");
  const [bits, setBits] = useState(8);
  const [kinds, setKinds] = useState(15);
  const [stage, setStage] = useState("digitization");
  const [plan, setPlan] = useState("");

  /* --- 実験1: アナログ温度計とデジタル温度計 --- */
  const stepSize = Number(gradation);
  const digitalTemp = Math.round(temp / stepSize) * stepSize;
  const gap = Math.abs(temp - digitalTemp);
  const TEMP_MIN = -5;
  const TEMP_MAX = 40;
  const heightOf = (value: number) => ((value - TEMP_MIN) / (TEMP_MAX - TEMP_MIN)) * 100;

  /* --- 実験2: コピーを重ねる --- */
  const HEART = [
    "00000000",
    "01100110",
    "11111111",
    "11111111",
    "11111111",
    "01111110",
    "00111100",
    "00011000"
  ];
  const wearAmount = wear === "small" ? 0.04 : wear === "large" ? 0.2 : 0.1;
  const copied = useMemo(() => {
    const random = seededRandom(20260818);
    const rows = HEART.map((row) => row.split("").map(Number));
    const analog = rows.map((row) => row.map((v) => v));
    for (let c = 0; c < copies; c++) {
      for (let y = 0; y < analog.length; y++) {
        for (let x = 0; x < analog[y].length; x++) {
          analog[y][x] = clamp(analog[y][x] + (random() - 0.5) * 2 * wearAmount, 0, 1);
        }
      }
    }
    // デジタルは1回ごとに「0.5より上か下か」で判定し直すので、もとの値に戻る
    const digital = rows.map((row) => row.map((v) => v));
    const diffs = analog.flatMap((row, y) => row.map((v, x) => Math.abs(v - rows[y][x])));
    return {
      original: rows,
      analog,
      digital,
      analogGap: diffs.reduce((a, b) => a + b, 0) / diffs.length,
      worst: Math.max(...diffs)
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copies, wearAmount]);

  /* --- 実験3: ビット数と表せる組み合わせ --- */
  const combos = 2n ** BigInt(bits);
  const binaryRaw = combos.toString(2);
  const padded = binaryRaw.padStart(Math.ceil(binaryRaw.length / 8) * 8, "0");
  const byteGroups = padded.match(/.{8}/g) ?? [];
  const combosNumber = Number(combos);
  const unit = (value: number) => {
    if (value === 0) return "0";
    if (value >= 1e15 || value < 1e-4) return value.toExponential(3);
    return value.toLocaleString("ja-JP", { maximumFractionDigits: value < 1 ? 6 : 3 });
  };

  /* --- 実験4: 符号化に必要なビット数 --- */
  const safeKinds = Math.max(2, Math.round(kinds));
  const neededBits = Math.ceil(Math.log2(safeKinds));
  const capacity = 2 ** neededBits;
  const presets: [string, number][] = [
    ["天気 15種類", 15],
    ["色鉛筆 50色", 50],
    ["ひらがな 46字", 46],
    ["英字 大小52字", 52],
    ["常用漢字 2,136字", 2136],
    ["半角文字 256種", 256]
  ];

  /* --- 応用: デジタル化の3段階 --- */
  const stages: [string, string, string, string][] = [
    ["digitization", "デジタイゼーション", "形式を変える", "紙の出席簿を、そのままの形でアプリに入力する"],
    ["digitalization", "デジタライゼーション", "手順を変える", "入室時のICカードで出席が自動記録され、点呼をやめる"],
    ["dx", "DX", "仕組みを変える", "「授業に来たか」ではなく「どこでどれだけ学んだか」で学習を捉え直す"]
  ];

  return (
    <>
      {card(
        0,
        "アナログ温度計とデジタル温度計を見比べる",
        "同じ温度を、連続で表す場合と段階で表す場合で並べます。つまみを動かしてみましょう。",
        <>
          <SliderField label="いまの本当の温度" value={temp} onChange={setTemp} min={-5} max={40} step={0.1} unit=" ℃" />
          <SelectField
            label="デジタル温度計の細かさ"
            value={gradation}
            onChange={setGradation}
            options={[
              { value: "1", label: "1℃きざみ（整数だけ表示）" },
              { value: "0.5", label: "0.5℃きざみ" },
              { value: "0.1", label: "0.1℃きざみ" }
            ]}
          />
          <div className="thermo-pair">
            <div className="thermo">
              <span className="thermo-title">アナログ温度計</span>
              <div className="thermo-tube">
                <i style={{ height: `${heightOf(temp)}%` }} />
              </div>
              <b className="thermo-read analog">{temp.toFixed(1)} ℃</b>
              <small>液体の高さがなめらかに変わる</small>
            </div>
            <div className="thermo">
              <span className="thermo-title">デジタル温度計</span>
              <div className="thermo-tube stepped">
                <i style={{ height: `${heightOf(digitalTemp)}%` }} />
                {gap > 0.001 && (
                  <em
                    style={{
                      bottom: `${Math.min(heightOf(temp), heightOf(digitalTemp))}%`,
                      height: `${Math.abs(heightOf(temp) - heightOf(digitalTemp))}%`
                    }}
                  />
                )}
              </div>
              <b className="thermo-read digital">{digitalTemp.toFixed(gradation === "1" ? 0 : 1)} ℃</b>
              <small>段階が決まっていて、途中で止まらない</small>
            </div>
          </div>
          <Results
            items={[
              { label: "本当の温度", value: `${temp.toFixed(1)} ℃` },
              { label: "デジタルの表示", value: `${digitalTemp.toFixed(gradation === "1" ? 0 : 1)} ℃` },
              { label: "表せなかった分", value: `${gap.toFixed(2)} ℃`, warn: gap > stepSize / 4 },
              { label: "1℃あたりの段階数", value: `${fmt(1 / stepSize, 0)} 段階` }
            ]}
          />
          <Hint>
            つまみを少しずつ動かすと、左はなめらかに動き、右はカクカクと飛びます。この「段階に置きかえる」考え方が、このあと学ぶ
            音（D7）・画像（D8）・動画（D9）のデジタル化すべての土台になります。
          </Hint>
        </>
      )}

      {card(
        1,
        "コピーを重ねると、絵はどうなるか",
        "同じ絵をアナログとデジタルでコピーし続けます。回数を増やして見比べましょう。",
        <>
          <SliderField label="コピーした回数" value={copies} onChange={setCopies} min={0} max={20} unit=" 回" />
          <SelectField
            label="1回コピーするごとの劣化の大きさ"
            value={wear}
            onChange={setWear}
            options={[
              { value: "small", label: "小さい（きれいなコピー機）" },
              { value: "normal", label: "ふつう" },
              { value: "large", label: "大きい（古いコピー機）" }
            ]}
          />
          <div className="copy-lab">
            <div>
              <span>もとの絵</span>
              <div className="pixel-grid">
                {copied.original.map((row, y) => (
                  <div key={y}>
                    {row.map((v, x) => (
                      <i key={x} style={{ background: `rgb(${v * 220 + 20},${v * 60 + 20},${v * 70 + 30})` }} />
                    ))}
                  </div>
                ))}
              </div>
              <small>スタート</small>
            </div>
            <div className="arrow">→</div>
            <div>
              <span>アナログでコピー</span>
              <div className="pixel-grid">
                {copied.analog.map((row, y) => (
                  <div key={y}>
                    {row.map((v, x) => (
                      <i key={x} style={{ background: `rgb(${v * 220 + 20},${v * 60 + 20},${v * 70 + 30})` }} />
                    ))}
                  </div>
                ))}
              </div>
              <small className={copies > 0 ? "bad" : ""}>{copies}回コピー後</small>
            </div>
            <div>
              <span>デジタルでコピー</span>
              <div className="pixel-grid">
                {copied.digital.map((row, y) => (
                  <div key={y}>
                    {row.map((v, x) => (
                      <i key={x} style={{ background: `rgb(${v * 220 + 20},${v * 60 + 20},${v * 70 + 30})` }} />
                    ))}
                  </div>
                ))}
              </div>
              <small className="good">{copies}回コピー後</small>
            </div>
          </div>
          <Results
            items={[
              { label: "アナログのくずれ具合", value: `${(copied.analogGap * 100).toFixed(1)} %`, warn: copied.analogGap > 0.05 },
              { label: "いちばんくずれた点", value: `${(copied.worst * 100).toFixed(1)} %`, warn: copied.worst > 0.2 },
              { label: "デジタルのくずれ具合", value: "0.0 %" },
              { label: "あと5回コピーすると", value: copies >= 15 ? "アナログは判別が難しい" : "アナログはさらにくずれる" }
            ]}
          />
          <Hint>
            デジタルが崩れないのは、コピーのたびに「この点は明るいほうか、暗いほうか」を判定し直して、0か1に戻しているからです。
            少しくらい汚れても、どちら寄りかさえ分かれば元どおりにできます。
          </Hint>
        </>
      )}

      {card(
        2,
        "ビット数を変えて、表せる数を確かめる",
        "1ビットから128ビットまで動かします。上段が表せる数、下段がバイトに直した大きさです。",
        <>
          <Row>
            <NumberField label="ビット数を直接入力" value={bits} onChange={(v) => setBits(clamp(Math.round(v), 1, 128))} min={1} max={128} unit="bit" />
          </Row>
          <SliderField label="ビット数" value={bits} onChange={setBits} min={1} max={128} unit=" bit" />
          <Formula>
            表せる組み合わせ ＝ 2 の {bits} 乗　／　{bits} bit ＝ {fmt(bits / 8, 3)} バイト
          </Formula>

          <div className="tier">
            <span className="tier-label">上段　表せる組み合わせ</span>
            <div className="tier-body">
              <div className="tier-cell wide">
                <small>2進数（1バイト＝8ビットごとに区切って表示）</small>
                <div className="byte-groups">
                  {byteGroups.map((group, index) => (
                    <b key={index} className="mono">
                      {group}
                    </b>
                  ))}
                </div>
                <em>2進数で {binaryRaw.length} けた。8ビットずつ区切って表示（先頭は0で埋めています）</em>
              </div>
              <div className="tier-cell">
                <small>10進数</small>
                <b className="big-number">{combos.toLocaleString("ja-JP")}</b>
                <em>通り</em>
              </div>
              <div className="tier-cell">
                <small>16進数</small>
                <b className="mono big-number">{combos.toString(16).toUpperCase()}</b>
                <em>{combos.toString(16).length} けた</em>
              </div>
            </div>
          </div>

          <div className="tier">
            <span className="tier-label">下段　この数をバイトとみなした大きさ</span>
            <div className="tier-body four">
              <div className="tier-cell">
                <small>B（バイト）</small>
                <b>{unit(combosNumber)}</b>
              </div>
              <div className="tier-cell">
                <small>KB（÷1,024）</small>
                <b>{unit(combosNumber / 1024)}</b>
              </div>
              <div className="tier-cell">
                <small>MB（÷1,024²）</small>
                <b>{unit(combosNumber / 1024 ** 2)}</b>
              </div>
              <div className="tier-cell">
                <small>GB（÷1,024³）</small>
                <b>{unit(combosNumber / 1024 ** 3)}</b>
              </div>
            </div>
          </div>

          <div className="preset-row">
            {[8, 10, 16, 20, 30, 32, 64, 128].map((n) => (
              <button type="button" key={n} onClick={() => setBits(n)}>
                {n} bit
              </button>
            ))}
          </div>
          <Hint>
            10ビットにすると1KB、20ビットで1MB、30ビットで1GBちょうどになります。情報量の単位が2の10乗ごとに繰り上がるのは、このためです。
          </Hint>
        </>
      )}

      {card(
        3,
        "何ビットあれば区別できるかを求める",
        "区別したいものの数を入れると、必要なビット数が出ます。",
        <>
          <div className="preset-row">
            {presets.map(([label, value]) => (
              <button type="button" key={label} onClick={() => setKinds(value)}>
                {label}
              </button>
            ))}
          </div>
          <NumberField label="区別したいものの数" value={kinds} onChange={setKinds} min={2} max={100000} unit="種類" />
          <Formula>2 の（必要なビット数）乗 ≧ 区別したいものの数</Formula>
          <Results
            items={[
              { label: "必要な最小ビット数", value: `${neededBits} bit` },
              { label: `${neededBits}ビットで表せる数`, value: `${fmt(capacity, 0)} 通り` },
              { label: "余り", value: `${fmt(capacity - safeKinds, 0)} 通り` },
              { label: `${neededBits - 1}ビットだと`, value: `${fmt(2 ** (neededBits - 1), 0)} 通りで不足`, warn: true }
            ]}
          />
          <DataTable
            head={["ビット数", "表せる数", "判定"]}
            rows={[neededBits - 2, neededBits - 1, neededBits, neededBits + 1]
              .filter((n) => n >= 1)
              .map((n) => [`${n} bit`, fmt(2 ** n, 0), 2 ** n >= safeKinds ? "足りる" : "足りない"])}
            highlight={(index) =>
              [neededBits - 2, neededBits - 1, neededBits, neededBits + 1].filter((n) => n >= 1)[index] === neededBits
            }
          />
          <Hint>
            必要なビット数は「その数以上になる最小の2のn乗」を探すことで求まります。15種類なら4ビット（16通り）、50色なら6ビット（64通り）です。
          </Hint>
        </>
      )}

      {card(
        4,
        "デジタル化の3つの段階で身近な情報を分類する",
        "段階が上がるほど、変わる範囲が広がります。カードを押して確かめましょう。",
        <>
          <div className="stage-flow">
            {stages.map(([id, name, change, example], index) => (
              <div key={id} className={`stage-card ${stage === id ? "active" : ""}`} onClick={() => setStage(id)}>
                <span className="stage-step">STEP {index + 1}</span>
                <b>{name}</b>
                <i>{change}</i>
                <p>{example}</p>
              </div>
            ))}
          </div>
          <div className="stage-scale">
            <span>形式だけ</span>
            <div className="scale-bar">
              <i style={{ width: `${(stages.findIndex(([id]) => id === stage) + 1) * 33.3}%` }} />
            </div>
            <span>仕組みごと</span>
          </div>
          <AreaField
            label="選んだ事例と、次の段階に進めるなら何を変えるか"
            value={plan}
            onChange={setPlan}
            placeholder="例：出席確認は今アプリ入力なのでデジタイゼーション。入室時のICカードで自動記録すれば点呼の手順がなくなり、デジタライゼーションに進む。"
            rows={4}
          />
        </>
      )}
    </>
  );
}

/* ========================================================================
 * D1 基数変換・加算・シフト
 * ====================================================================== */
export function BaseLab({ card }: LabProps) {
  const [decimal, setDecimal] = useState(45);
  const [ladderValue, setLadderValue] = useState(36);
  const [bitInput, setBitInput] = useState("00101101");
  const [hexInput, setHexInput] = useState("2F");
  const [fraction, setFraction] = useState(0.1);
  const [addA, setAddA] = useState("11001011");
  const [addB, setAddB] = useState("11110110");
  const [shiftSource, setShiftSource] = useState("00001011");
  const [shiftCount, setShiftCount] = useState(3);
  const [shiftDir, setShiftDir] = useState("left");
  const [arithSource, setArithSource] = useState("10001001");
  const [arithCount, setArithCount] = useState(4);
  const [arithDir, setArithDir] = useState("right");
  const [devices, setDevices] = useState(480);
  const [growth, setGrowth] = useState(3);
  const [idPlan, setIdPlan] = useState("");

  const ladder = divisionLadder(ladderValue);
  const bits = padBits(parseBits(bitInput) || "0", 8);
  const bitValue = parseInt(bits, 2);
  const hexValue = fromBase(hexInput, 16);
  const fracBinary = toBase(fraction, 2, 20);
  const fracBack = fromBase(fracBinary, 2) ?? 0;
  const add = binaryAdd(addA, addB, 8);
  const logical = shiftBits(shiftSource, 8, shiftDir as "left" | "right", shiftCount, "logical");
  const arithmetic = shiftBits(arithSource, 8, arithDir as "left" | "right", arithCount, "arithmetic");
  const needed = devices * (1 + growth) ** 0;
  const future = Math.ceil(devices * (1 + growth / 10));
  const requiredBits = Math.ceil(Math.log2(Math.max(1, future)));

  const toggleBit = (index: number) => {
    const next = bits.split("");
    next[index] = next[index] === "1" ? "0" : "1";
    setBitInput(next.join(""));
  };

  return (
    <>
      {card(
        0,
        "同じ値を3つの基数で見る",
        "10進数を入力するか、ビットを直接押して、表記が変わっても値は同じことを確かめます。",
        <>
          <Row>
            <NumberField label="10進数(10)を入力" value={decimal} onChange={(v) => { setDecimal(clamp(v, 0, 255)); setBitInput(padBits(clamp(v, 0, 255).toString(2), 8)); }} min={0} max={255} />
            <TextField label="2進数(2)を直接入力" value={bitInput} onChange={(v) => { setBitInput(v); const parsed = parseInt(parseBits(v) || "0", 2); setDecimal(parsed); }} mono hint="0と1だけ・8けた" />
          </Row>
          <BitStrip bits={bits} onToggle={toggleBit} />
          <Results
            items={[
              { label: "2進数(2)", value: bits },
              { label: "10進数(10)", value: bitValue },
              { label: "16進数(16)", value: bitValue.toString(16).toUpperCase().padStart(2, "0") },
              { label: "8進数(8)", value: bitValue.toString(8) }
            ]}
          />
          <Hint>ビットのボタンを押すと0と1が入れかわります。1が立っているけたの重みを足すと10進数になります。</Hint>
        </>
      )}

      {card(
        1,
        "割り算をくり返して2進数にする",
        "10進数を2で割り続け、余りを逆から並べます。教科書と同じ手順です。",
        <>
          <NumberField label="10進数(10)を入力" value={ladderValue} onChange={(v) => setLadderValue(clamp(Math.round(v), 0, 100000))} min={0} max={100000} />
          <div className="preset-row">
            {[36, 88, 72, 44, 255].map((v) => (
              <button type="button" key={v} onClick={() => setLadderValue(v)}>
                {v}
              </button>
            ))}
          </div>
          <DataTable
            head={["割られる数", "÷2 の商", "余り"]}
            rows={ladder.rows.map((r, i) => [
              r.dividend,
              r.quotient,
              <b key={i} className="hot">{r.remainder}</b>
            ])}
          />
          <div className="ladder-result">
            <span>余りを下から上へ並べる → 2進数(2)</span>
            <b className="mono">{ladder.digits}</b>
          </div>
          <Results
            items={[
              { label: "10進数(10)", value: ladderValue },
              { label: "2進数(2)", value: <span className="mono">{ladder.digits}</span> },
              { label: "けた数", value: `${ladder.digits.length} けた` },
              { label: "検算（2進→10進）", value: parseInt(ladder.digits, 2) === ladderValue ? "一致" : "不一致", warn: parseInt(ladder.digits, 2) !== ladderValue }
            ]}
          />
          <Hint>
            商が0になるまで2で割り、出てきた余りを最後から最初へ逆順に並べると2進数になります。
            表の余りの列を、下から上へ読んでみましょう。
          </Hint>
        </>
      )}

      {card(
        2,
        "2進数4けたを16進数1けたにまとめる",
        "16進数を入力して、4けた区切りの対応を確かめます。",
        <>
          <TextField label="16進数(16)を入力" value={hexInput} onChange={setHexInput} mono hint="0〜9とA〜F" />
          {hexValue === null ? (
            <Verdict ok={false}>16進数として読めません。0〜9とA〜Fだけで入力してください。</Verdict>
          ) : (
            <>
              <Steps
                items={[
                  { label: "16進数(16)", value: hexInput.toUpperCase() },
                  { label: "1けたずつ2進4けたに", value: hexInput.toUpperCase().replace(/[^0-9A-Fa-f]/g, "").split("").map((c) => parseInt(c, 16).toString(2).padStart(4, "0")).join(" ") },
                  { label: "10進数(10)", value: fmt(hexValue, 4) }
                ]}
              />
              <Hint>2進数4けたは0000〜1111の16通り。16進数1けたとちょうど同じ数なので、機械的に置き換えられます。</Hint>
            </>
          )}
        </>
      )}

      {card(
        3,
        "小数を2進数にする",
        "10進の小数を2進数に直し、有限けたで表せるかを確かめます。",
        <>
          <NumberField label="10進数(10)の小数を入力" value={fraction} onChange={setFraction} step={0.05} min={0} max={100} hint="0.1 や 0.375 を試そう" />
          <Results
            items={[
              { label: "2進数(2)（20けたまで）", value: <span className="mono">{fracBinary}</span> },
              { label: "戻した値", value: fmt(fracBack, 12) },
              { label: "誤差", value: fmt(Math.abs(fraction - fracBack), 12), warn: Math.abs(fraction - fracBack) > 1e-9 },
              { label: "有限けたで表せるか", value: Math.abs(fraction - fracBack) < 1e-12 ? "表せる" : "表せない（循環する）" }
            ]}
          />
          <Hint>0.5、0.25、0.375 は表せますが、0.1 や 0.3 は循環して表しきれません。ここが誤差の出発点です。</Hint>
        </>
      )}

      {card(
        4,
        "2進数の筆算で足す",
        "8けたの2進数を2つ入力し、けたごとの繰り上がりを追います。",
        <>
          <Row>
            <TextField label="元の値" value={addA} onChange={setAddA} mono />
            <TextField label="加える値" value={addB} onChange={setAddB} mono />
          </Row>
          <div className="calc-sheet">
            <div><span>繰り上がり(2)</span><b className="mono">{add.carries}</b></div>
            <div><span>元の値(2)</span><b className="mono">{add.a}</b></div>
            <div><span>加える値(2)</span><b className="mono">{add.b}</b></div>
            <div className="sum"><span>結果(2)</span><b className="mono">{add.sum}</b></div>
          </div>
          <Results
            items={[
              { label: "10進での確認", value: `${add.decimalA} + ${add.decimalB} = ${add.decimalSum}` },
              { label: "8けたに収まるか", value: add.overflow ? "オーバーフロー" : "収まる", warn: add.overflow },
              { label: "けたあふれを含む結果", value: <span className="mono">{add.full}</span> }
            ]}
          />
          <Hint>1 + 1 は 10（イチゼロ）。決めたけた数からあふれた1は捨てられます。これがオーバーフローです。</Hint>
        </>
      )}

      {card(
        5,
        "論理シフト（符号なし）",
        "空いたビットに必ず0が入ることと、値が2倍・半分になることを確かめます。",
        <>
          <Row>
            <TextField label="元のビット列" value={shiftSource} onChange={setShiftSource} mono />
            <SelectField label="方向" value={shiftDir} onChange={setShiftDir} options={[{ value: "left", label: "左シフト（×2）" }, { value: "right", label: "右シフト（÷2）" }]} />
            <NumberField label="ずらすビット数" value={shiftCount} onChange={setShiftCount} min={0} max={8} />
          </Row>
          <BitStrip bits={logical.before} />
          <div className="shift-arrow">{shiftDir === "left" ? "← 左へ" : "右へ →"} {shiftCount} ビット</div>
          <BitStrip bits={logical.after} />
          <Results
            items={[
              { label: "シフト前（10進）", value: logical.beforeValue },
              { label: "シフト後（10進）", value: logical.afterValue },
              { label: "理論上の倍率", value: shiftDir === "left" ? `×${2 ** shiftCount}` : `÷${2 ** shiftCount}` },
              { label: "実際の倍率", value: logical.beforeValue ? fmt(logical.afterValue / logical.beforeValue, 3) : "-", warn: shiftDir === "left" && logical.afterValue < logical.beforeValue }
            ]}
          />
          <Hint>あふれ出たビットは捨てられるため、理論上の倍率と一致しないことがあります。</Hint>
        </>
      )}

      {card(
        6,
        "算術シフト（符号あり）",
        "右シフトのとき、空いたビットに符号ビットと同じ値が入ることを確かめます。",
        <>
          <Row>
            <TextField label="元のビット列" value={arithSource} onChange={setArithSource} mono hint="先頭が1なら負の数" />
            <SelectField label="方向" value={arithDir} onChange={setArithDir} options={[{ value: "left", label: "左シフト" }, { value: "right", label: "右シフト" }]} />
            <NumberField label="ずらすビット数" value={arithCount} onChange={setArithCount} min={0} max={8} />
          </Row>
          <BitStrip bits={arithmetic.before} signed />
          <div className="shift-arrow">{arithDir === "left" ? "← 左へ" : "右へ →"} {arithCount} ビット（空きには {arithDir === "right" ? arithmetic.before[0] : "0"} が入る）</div>
          <BitStrip bits={arithmetic.after} signed />
          <Results
            items={[
              { label: "シフト前（符号付き）", value: arithmetic.beforeValue },
              { label: "シフト後（符号付き）", value: arithmetic.afterValue },
              { label: "符号は保たれたか", value: arithmetic.before[0] === arithmetic.after[0] ? "保たれた" : "変わった", warn: arithmetic.before[0] !== arithmetic.after[0] },
              { label: "論理シフトなら", value: shiftBits(arithSource, 8, arithDir as "left" | "right", arithCount, "logical").after }
            ]}
          />
          <Hint>負の数を論理シフトすると符号が消えて正の数になってしまいます。だから符号ありには算術シフトを使います。</Hint>
        </>
      )}

      {card(
        7,
        "必要なビット数を見積もる",
        "重複しない番号を付けるのに、何ビット必要かを求めます。",
        <>
          <Row>
            <NumberField label="今の台数" value={devices} onChange={setDevices} min={1} max={1000000} unit="台" />
            <NumberField label="10年後の増加見込み" value={growth} onChange={setGrowth} min={0} max={100} unit="割" />
          </Row>
          <Results
            items={[
              { label: "将来の必要数", value: `${fmt(future, 0)} 台` },
              { label: "必要な最小ビット数", value: `${requiredBits} bit` },
              { label: `${requiredBits} bitで表せる数`, value: fmt(2 ** requiredBits, 0) },
              { label: "8ビットで足りるか", value: future <= 256 ? "足りる" : "不足", warn: future > 256 }
            ]}
          />
          <Hint>必要数以上になる最小の2のn乗を選びます。足りないと必ずどこかで番号がぶつかります。</Hint>
        </>
      )}

      {card(
        8,
        "校内の端末に重複しないIDを設計する",
        "見積もった数値をもとに、採用するビット数とその理由を書きます。",
        <>
          <Results items={[{ label: "現在の台数", value: fmt(needed, 0) }, { label: "推奨ビット数", value: `${requiredBits} bit` }, { label: "128ビットなら", value: "3.4×10³⁸ 通り", note: "IPv6と同じ規模" }]} />
          <AreaField
            label="採用するビット数と、その理由"
            value={idPlan}
            onChange={setIdPlan}
            placeholder="例：現在480台、10年後に720台と見積もると10ビット（1,024通り）で足りる。ただし他校と統合する可能性を考え16ビットを採用する。"
            rows={4}
          />
        </>
      )}
    </>
  );
}

/* ========================================================================
 * D2 負の数（補数）
 * ====================================================================== */
export function NegativeLab({ card }: LabProps) {
  const [minuend, setMinuend] = useState(56);
  const [subtrahend, setSubtrahend] = useState(17);
  const [source, setSource] = useState("00000101");
  const [target, setTarget] = useState(-50);
  const [width, setWidth] = useState(8);
  const [counterMax, setCounterMax] = useState(300);
  const [counterPlan, setCounterPlan] = useState("");

  const digits = String(Math.max(minuend, subtrahend)).length;
  const complement = radixComplement(subtrahend, 10, digits);
  const added = minuend + complement;
  const dropped = added - 10 ** digits;
  const bits = padBits(parseBits(source) || "0", 8);
  const ones = onesComplement(bits);
  const twos = twosComplement(bits, 8);
  const check = binaryAdd(bits, twos.result, 8);
  const signedBits = toSignedBits(target, width);
  const unsignedMax = 2 ** width - 1;
  const signedMin = -(2 ** (width - 1));
  const signedMax = 2 ** (width - 1) - 1;

  return (
    <>
      {card(
        0,
        "足し算しかできない機械で、引き算をする",
        "CPUの計算回路は足し算が基本です。引き算をどうやって足し算に変えるかを試します。",
        <>
          <div className="premise">
            <b>この機械にできること</b>
            <span className="ok">足し算</span>
            <span className="ng">引き算</span>
            <span className="ok">けたあふれを捨てる</span>
          </div>
          <Row>
            <NumberField label="引かれる数" value={minuend} onChange={setMinuend} min={0} max={99999} />
            <NumberField label="引く数" value={subtrahend} onChange={setSubtrahend} min={0} max={99999} />
          </Row>
          <Steps
            items={[
              { label: `引く数を補数にする`, value: fmt(complement, 0), note: `${10 ** digits} − ${subtrahend}` },
              { label: "足し算だけする", value: `${minuend} + ${complement} = ${fmt(added, 0)}` },
              { label: "あふれたけたを捨てる", value: fmt(dropped, 0), note: `${10 ** digits} のけたを消す` },
              { label: "ふつうに引くと", value: fmt(minuend - subtrahend, 0) }
            ]}
          />
          <div className="drop-digit">
            <span className="dropped">{String(added).slice(0, String(added).length - digits) || "0"}</span>
            <span className="kept">{String(added).slice(-digits).padStart(digits, "0")}</span>
            <i>← 左の色が薄い部分は、けたあふれとして捨てられる</i>
          </div>
          <Verdict ok={dropped === minuend - subtrahend}>
            {dropped === minuend - subtrahend
              ? `${minuend} − ${subtrahend} を、引き算をひとつも使わずに求められました。`
              : "けた数の指定を見直してください。"}
          </Verdict>
          <Hint>
            補数とは「その数に足したとき、けた上がりする最小の数」です。引き算を、足し算とけた捨てに置きかえられるので、
            機械は加算回路だけを持てばよくなります。次からは、これを2進数でやってみます。
          </Hint>
        </>
      )}

      {card(
        1,
        "1の補数をつくる",
        "0と1をすべて反転させます。機械にとって最も簡単な操作です。",
        <>
          <TextField label="元のビット列（8けた）" value={source} onChange={setSource} mono />
          <BitStrip bits={bits} />
          <div className="shift-arrow">すべて反転（NOT）</div>
          <BitStrip bits={ones} />
          <Results items={[{ label: "元の値（符号なし）", value: parseInt(bits, 2) }, { label: "1の補数", value: <span className="mono">{ones}</span> }]} />
        </>
      )}

      {card(
        2,
        "2の補数をつくって検算する",
        "1の補数に1を足し、元の数と足すと0になることを確かめます。",
        <>
          <Steps
            items={[
              { label: "元の値", value: <span className="mono">{bits}</span> },
              { label: "反転（1の補数）", value: <span className="mono">{twos.flipped}</span> },
              { label: "1を足す（2の補数）", value: <span className="mono">{twos.result}</span> },
              { label: "10進で読むと", value: signedValue(twos.result) }
            ]}
          />
          <Formula>
            {bits} + {twos.result} = {check.full}（8けたからあふれた1を捨てると {check.sum}）
          </Formula>
          <Verdict ok={check.sum === "00000000"}>
            {check.sum === "00000000"
              ? `${parseInt(bits, 2)} + (${signedValue(twos.result)}) = 0 が成り立ちました。`
              : "0になりません。元の値が0のときは補数も0になります。"}
          </Verdict>
        </>
      )}

      {card(
        3,
        "10進数を符号付きビット列にする",
        "負の数を入力して、表現できる範囲の外に出るとどうなるかを見ます。",
        <>
          <Row>
            <NumberField label="10進数(10)（負でも可）" value={target} onChange={setTarget} min={-100000} max={100000} />
            <SelectField label="ビット幅" value={String(width)} onChange={(v) => setWidth(Number(v))} options={[4, 8, 16, 32].map((n) => ({ value: String(n), label: `${n} bit` }))} />
          </Row>
          {signedBits ? (
            <>
              <BitStrip bits={signedBits.length > 16 ? signedBits.slice(-16) : signedBits} signed weights={width <= 16} />
              <Results
                items={[
                  { label: "2の補数表現", value: <span className="mono">{signedBits}</span> },
                  { label: "符号ビット", value: signedBits[0] === "1" ? "1（負）" : "0（正）" },
                  { label: "16進数(16)", value: parseInt(signedBits, 2).toString(16).toUpperCase() }
                ]}
              />
            </>
          ) : (
            <Verdict ok={false}>
              {width} ビットでは表せません。範囲は {signedMin} 〜 {signedMax} です。
            </Verdict>
          )}
        </>
      )}

      {card(
        4,
        "表現できる範囲を比べる",
        "符号なしと符号ありで、範囲がどう変わるかを確かめます。",
        <>
          <SliderField label="ビット幅" value={width} onChange={setWidth} min={4} max={32} unit=" bit" />
          <Results
            items={[
              { label: "符号なし", value: `0 〜 ${fmt(unsignedMax, 0)}`, note: `${fmt(2 ** width, 0)} 通り` },
              { label: "符号あり", value: `${fmt(signedMin, 0)} 〜 ${fmt(signedMax, 0)}`, note: `${fmt(2 ** width, 0)} 通り` },
              { label: "正の側", value: `${fmt(signedMax + 1, 0)} 個`, note: "0を含む" },
              { label: "負の側", value: `${fmt(-signedMin, 0)} 個`, note: "負が1つ多い" }
            ]}
          />
          <Hint>個数はどちらも同じ 2 の {width} 乗。0を正の側に入れるため、負のほうが1つ多い非対称な範囲になります。</Hint>
        </>
      )}

      {card(
        5,
        "購買部の在庫カウンタを設計する",
        "扱う値の最大・最小からビット幅と符号の有無を決めます。",
        <>
          <NumberField label="1日に扱う最大個数" value={counterMax} onChange={setCounterMax} min={1} max={100000} unit="個" />
          <Results
            items={[
              { label: "必要な最小ビット数（符号なし）", value: `${Math.ceil(Math.log2(counterMax + 1))} bit` },
              { label: "必要な最小ビット数（符号あり）", value: `${Math.ceil(Math.log2(counterMax + 1)) + 1} bit` },
              { label: "8ビット符号なしで足りるか", value: counterMax <= 255 ? "足りる" : "不足", warn: counterMax > 255 },
              { label: "8ビット符号ありで足りるか", value: counterMax <= 127 ? "足りる" : "不足", warn: counterMax > 127 }
            ]}
          />
          <AreaField
            label="採用する設計と、範囲外になったときの対応"
            value={counterPlan}
            onChange={setCounterPlan}
            placeholder="例：返品でマイナスが出るので符号あり。1日最大300個なら16ビット符号ありを採用し、範囲外はエラー表示にして記録を残す。"
            rows={4}
          />
        </>
      )}
    </>
  );
}

/* ========================================================================
 * D3 実数（浮動小数点）
 * ====================================================================== */
export function RealLab({ card }: LabProps) {
  const [times, setTimes] = useState(100);
  const [addend, setAddend] = useState(0.1);
  const [value, setValue] = useState(-10.25);
  const [amounts, setAmounts] = useState("120.8, 80.1, 35.1");
  const [decision, setDecision] = useState("");

  /* --- 実験1: 0.1 を何回も足す --- */
  const naiveTotal = useMemo(() => {
    let total = 0;
    for (let i = 0; i < times; i++) total += addend;
    return total;
  }, [times, addend]);
  const trueTotal = Math.round(addend * times * 1e10) / 1e10;
  const drift = naiveTotal - trueTotal;
  const trace = useMemo(() => {
    const marks: { at: number; sum: number }[] = [];
    let total = 0;
    for (let i = 1; i <= times; i++) {
      total += addend;
      if (i <= 4 || i === times || i === Math.round(times / 2)) marks.push({ at: i, sum: total });
    }
    return marks;
  }, [times, addend]);

  /* --- 実験2以降 --- */
  const normalized = normalizeBinary(value);
  const float32 = toFloat32(value);
  const values = parseNumbers(amounts);
  const naive = values.reduce((a, b) => a + b, 0);
  const integerSum = values.reduce((a, b) => a + Math.round(b * 10), 0) / 10;

  return (
    <>
      {card(
        0,
        "0.1 を100回足すと、10になるか",
        "電卓なら当たり前の計算を、コンピュータにやらせてみます。",
        <>
          <Row>
            <NumberField label="足す数" value={addend} onChange={setAddend} step={0.1} min={0.01} max={10} />
            <NumberField label="足す回数" value={times} onChange={(v) => setTimes(clamp(Math.round(v), 1, 10000))} min={1} max={10000} unit="回" />
          </Row>
          <div className="code-block">
            <code>
              {addend} を {times} 回たすと … {naiveTotal}
            </code>
          </div>
          <Results
            items={[
              { label: "正しい答え", value: trueTotal },
              { label: "コンピュータの答え", value: String(naiveTotal), warn: drift !== 0 },
              { label: "ずれ", value: drift === 0 ? "0（ぴったり）" : drift.toExponential(3), warn: drift !== 0 },
              { label: "ぴったり合ったか", value: naiveTotal === trueTotal ? "合った" : "合わなかった", warn: naiveTotal !== trueTotal }
            ]}
          />
          <DataTable
            head={["何回目", "そのときの合計"]}
            rows={trace.map((m) => [`${m.at} 回目`, <span key={m.at} className="mono">{m.sum}</span>])}
          />
          <Hint>
            0.5 や 0.25 を足すとぴったり合うのに、0.1 や 0.3 だとずれます。この違いはどこから来るのでしょうか。
            次の実験で、その正体をさぐります。
          </Hint>
        </>
      )}

      {card(
        1,
        "小数を2進数に直して、正体をさぐる",
        "さっきの数を2進数にすると、けたが終わらないことが分かります。",
        <>
          <NumberField label="10進数(10)（小数可・負も可）" value={value} onChange={setValue} step={0.25} />
          <div className="preset-row">
            {[0.5, 0.25, 0.375, 0.1, 0.3, -10.25].map((v) => (
              <button type="button" key={v} onClick={() => setValue(v)}>
                {v}
              </button>
            ))}
          </div>
          <Results
            items={[
              { label: "2進数(2)", value: <span className="mono">{toBase(value, 2, 20)}</span> },
              { label: "16進数(16)", value: <span className="mono">{toBase(value, 16, 8)}</span> },
              { label: "けたが終わるか", value: toBase(Math.abs(value), 2, 30).length < 24 ? "終わる" : "終わらない（循環する）", warn: toBase(Math.abs(value), 2, 30).length >= 24 },
              { label: "小数部の重み", value: "1/2, 1/4, 1/8, 1/16 …" }
            ]}
          />
          <Hint>
            0.5＝1/2、0.25＝1/4、0.375＝1/4+1/8 は、2の負のべき乗の足し算でぴったり表せます。
            ところが0.1は、いくらけたを増やしても表しきれません。どこかで打ち切るしかないので、必ず誤差が残ります。
          </Hint>
        </>
      )}

      {card(
        2,
        "正規化して 1.xxx × 2ⁿ の形にする",
        "小数点を動かして、仮数の先頭を1にそろえます。",
        <>
          <Steps
            items={[
              { label: "2進数(2)", value: <span className="mono">{normalized.binary}</span> },
              { label: "符号", value: normalized.negative ? "− (1)" : "＋ (0)" },
              { label: "仮数（正規化後）", value: <span className="mono">{normalized.mantissa}</span> },
              { label: "指数", value: `2 の ${normalized.exponent} 乗` }
            ]}
          />
          <Formula>
            {value} ＝ {normalized.negative ? "−" : "＋"} {normalized.mantissa} × 2<sup>{normalized.exponent}</sup>
          </Formula>
          <Hint>小数点が左に動けば指数は正、右に動けば負になります。指数は「小数点を何けた動かしたか」そのものです。</Hint>
        </>
      )}

      {card(
        3,
        "32ビットの浮動小数点に分解する",
        "符号部1・指数部8・仮数部23 に並べ、格納された値と元の値の差を見ます。",
        <>
          <div className="float-bits">
            <div className="sign">
              <small>符号部 1bit</small>
              <b className="mono">{float32.sign}</b>
            </div>
            <div className="exponent">
              <small>指数部 8bit</small>
              <b className="mono">{float32.exponent}</b>
            </div>
            <div className="mantissa">
              <small>仮数部 23bit</small>
              <b className="mono">{float32.mantissa}</b>
            </div>
          </div>
          <Results
            items={[
              { label: "指数部に入っている値", value: float32.exponentValue, note: "実際の指数＋127" },
              { label: "実際の指数", value: float32.realExponent },
              { label: "実際に保存された値", value: fmt(float32.stored, 10) },
              { label: "元の値とのずれ", value: fmt(float32.error, 12), warn: float32.error !== 0 }
            ]}
          />
          <Hint>指数部にはバイアス127を足した値が入ります。指数が3なら 3 + 127 = 130 を2進数で格納します。</Hint>
        </>
      )}

      {card(
        4,
        "整数に直して誤差を消す",
        "金額を小数のまま足す場合と、円単位の整数で足す場合を比べます。",
        <>
          <TextField label="金額を並べて入力" value={amounts} onChange={setAmounts} hint="カンマまたはスペースで区切る" />
          <Results
            items={[
              { label: "そのまま合計", value: String(naive) },
              { label: "10倍の整数にして合計", value: String(integerSum) },
              { label: "ずれ", value: naive === integerSum ? "0（ぴったり）" : Math.abs(naive - integerSum).toExponential(2), warn: naive !== integerSum },
              { label: "件数", value: `${values.length} 件` }
            ]}
          />
          <Hint>
            件数を増やすほど、ずれは積み上がります。金額は円単位の整数で持ち、表示するときだけ小数に戻すのが定石です。
          </Hint>
        </>
      )}

      {card(
        5,
        "購買部の会計プログラムを安全にする",
        "計算したずれを根拠に、どちらの方式を採用するかを決めます。",
        <AreaField
          label="採用する方式と、その根拠"
          value={decision}
          onChange={setDecision}
          placeholder="例：0.1を100回足すと 9.99999999999998 になり、正しい10にならなかった。3件の合計でも約1.4×10⁻¹⁴のずれが出る。1日1,000件では表示に影響しうるため、円単位の整数で保持する方式を採用する。"
          rows={4}
        />
      )}
    </>
  );
}

/* ========================================================================
 * D4 論理回路
 * ====================================================================== */
export function LogicLab({ card }: LabProps) {
  const [gate, setGate] = useState<Gate>("AND");
  const [a, setA] = useState(true);
  const [b, setB] = useState(false);
  const [card1, setCard1] = useState(true);
  const [pin, setPin] = useState(true);
  const [guest, setGuest] = useState(false);
  const [hx, setHx] = useState(true);
  const [hy, setHy] = useState(true);
  const [fx, setFx] = useState(true);
  const [fy, setFy] = useState(true);
  const [fc, setFc] = useState(true);
  const [ra, setRa] = useState("0111");
  const [rb, setRb] = useState("0101");
  const [stairPlan, setStairPlan] = useState("");

  const gates: Gate[] = ["NOT", "AND", "OR", "NAND", "NOR", "XOR", "XNOR"];
  const half = halfAdder(hx, hy);
  const full = fullAdder(fx, fy, fc);
  const ripple = rippleAdder(ra, rb, 4);
  const access = card1 && pin;
  const entry = card1 || guest;

  return (
    <>
      {card(
        0,
        "7種類のゲートを操作する",
        "入力を切り替えて、各ゲートの出力を確かめます。",
        <>
          <Tabs value={gate} onChange={(v) => setGate(v as Gate)} options={gates.map((g) => ({ value: g, label: g }))} />
          <div className="gate-stage">
            <div className="switches">
              <Toggle label="入力 X" on={a} onChange={setA} />
              {gate !== "NOT" && <Toggle label="入力 Y" on={b} onChange={setB} />}
            </div>
            <div className={`lamp ${gateOutput(gate, a, b) ? "on" : ""}`}>
              <span>出力 Z</span>
              <b>{Number(gateOutput(gate, a, b))}</b>
            </div>
          </div>
          <Formula>{gateFormula[gate]}</Formula>
        </>
      )}

      {card(
        1,
        "真理値表を読み比べる",
        "4通りの入力すべてで、7種類のゲートの出力を一度に見ます。",
        <>
          <DataTable
            head={["X", "Y", ...gates]}
            rows={[
              [false, false],
              [false, true],
              [true, false],
              [true, true]
            ].map(([x, y]) => [
              Number(x),
              Number(y),
              ...gates.map((g) => <b key={g} className={gateOutput(g, x, y) ? "hot" : ""}>{Number(gateOutput(g, x, y))}</b>)
            ])}
          />
          <Hint>出力の並びを見れば、どのゲートかを言い当てられます。ANDとNANDのように、上下が反転している組み合わせを探してみましょう。</Hint>
        </>
      )}

      {card(
        2,
        "直列回路と並列回路で確かめる",
        "ANDは直列つなぎ、ORは並列つなぎと同じ動きをします。",
        <>
          <div className="circuit-pair">
            <div className={`circuit ${a && b ? "on" : ""}`}>
              <span>直列（AND）</span>
              <div className="wire">
                <i className={a ? "closed" : ""} />
                <i className={b ? "closed" : ""} />
              </div>
              <b>{a && b ? "点灯" : "消灯"}</b>
            </div>
            <div className={`circuit ${a || b ? "on" : ""}`}>
              <span>並列（OR）</span>
              <div className="wire parallel">
                <i className={a ? "closed" : ""} />
                <i className={b ? "closed" : ""} />
              </div>
              <b>{a || b ? "点灯" : "消灯"}</b>
            </div>
          </div>
          <div className="switches">
            <Toggle label="スイッチ X" on={a} onChange={setA} />
            <Toggle label="スイッチ Y" on={b} onChange={setB} />
          </div>
        </>
      )}

      {card(
        3,
        "日常のルールを論理式に直す",
        "入退室のルールを、AND・OR・NOTの組み合わせで表します。",
        <>
          <div className="switches">
            <Toggle label="社員証" on={card1} onChange={setCard1} />
            <Toggle label="暗証番号一致" on={pin} onChange={setPin} />
            <Toggle label="招待状" on={guest} onChange={setGuest} />
          </div>
          <Results
            items={[
              { label: "入室（社員証 AND 暗証番号）", value: access ? "許可" : "拒否", warn: !access },
              { label: "入場（社員証 OR 招待状）", value: entry ? "許可" : "拒否", warn: !entry },
              { label: "警報（NOT 入室）", value: !access ? "鳴る" : "鳴らない" },
              { label: "式", value: <span className="mono">Z = (X AND Y) OR ...</span> }
            ]}
          />
          <Hint>「かつ」はAND、「または」はOR、「〜でない」はNOT。日常のルールは、この3つでほぼ書き表せます。</Hint>
        </>
      )}

      {card(
        4,
        "半加算器を組み立てる",
        "XORが和、ANDが桁上がりになることを確かめます。",
        <>
          <div className="switches">
            <Toggle label="入力 X" on={hx} onChange={setHx} />
            <Toggle label="入力 Y" on={hy} onChange={setHy} />
          </div>
          <div className="adder-view">
            <div><small>XOR → 和 S</small><b>{Number(half.s)}</b></div>
            <div><small>AND → 桁上がり C</small><b>{Number(half.c)}</b></div>
          </div>
          <Formula>
            {Number(hx)} + {Number(hy)} = {Number(half.c)}{Number(half.s)} （2進数）＝ {Number(hx) + Number(hy)}（10進数）
          </Formula>
          <DataTable
            head={["X", "Y", "S（和）", "C（桁上がり）"]}
            rows={[[0, 0], [0, 1], [1, 0], [1, 1]].map(([x, y]) => {
              const r = halfAdder(!!x, !!y);
              return [x, y, Number(r.s), Number(r.c)];
            })}
            highlight={(index) => index === Number(hx) * 2 + Number(hy)}
          />
        </>
      )}

      {card(
        5,
        "全加算器を組み立てる",
        "下のけたからの桁上がりも足せるように、半加算器を2つつなげます。",
        <>
          <div className="switches">
            <Toggle label="入力 X" on={fx} onChange={setFx} />
            <Toggle label="入力 Y" on={fy} onChange={setFy} />
            <Toggle label="下位からの桁上がり Ci" on={fc} onChange={setFc} />
          </div>
          <div className="adder-view">
            <div><small>1つ目の半加算器 S</small><b>{Number(full.inner.first.s)}</b></div>
            <div><small>2つ目の半加算器 S → 和</small><b>{Number(full.s)}</b></div>
            <div><small>2つのCをOR → Co</small><b>{Number(full.co)}</b></div>
          </div>
          <Formula>
            {Number(fx)} + {Number(fy)} + {Number(fc)} = {Number(full.co)}{Number(full.s)}（2進数）＝ {Number(fx) + Number(fy) + Number(fc)}
          </Formula>
        </>
      )}

      {card(
        6,
        "全加算器を並べて4ビットを足す",
        "桁上がりが右から左へ伝わっていく様子を追います。",
        <>
          <Row>
            <TextField label="4ビットの値 X" value={ra} onChange={setRa} mono />
            <TextField label="4ビットの値 Y" value={rb} onChange={setRb} mono />
          </Row>
          <DataTable
            head={["けた", "X", "Y", "Ci（下位から）", "S（和）", "Co（上位へ）"]}
            rows={ripple.stages.map((stage, index) => [4 - index, stage.x, stage.y, stage.ci, stage.s, stage.co])}
          />
          <Results
            items={[
              { label: "計算結果", value: <span className="mono">{ripple.sum}</span> },
              { label: "10進で確認", value: `${parseInt(ripple.x, 2)} + ${parseInt(ripple.y, 2)} = ${parseInt(ripple.x, 2) + parseInt(ripple.y, 2)}` },
              { label: "最上位の桁上がり", value: ripple.carryOut ? "あり（オーバーフロー）" : "なし", warn: ripple.carryOut }
            ]}
          />
          <Hint>桁上がりは右のけたから順に伝わります。けたが増えるほど伝わる時間が長くなるのが、この方式の弱点です。</Hint>
        </>
      )}

      {card(
        7,
        "NANDゲートだけで、ほかのゲートを作る",
        "NANDを組み合わせるだけで、すべてのゲートと同じ働きが作れることを確かめます。",
        <>
          <Tabs value={gate} onChange={(v) => setGate(v as Gate)} options={gates.map((g) => ({ value: g, label: g }))} />
          <div className="switches">
            <Toggle label="入力 A" on={a} onChange={setA} />
            {gate !== "NOT" && <Toggle label="入力 B" on={b} onChange={setB} />}
          </div>
          <div className="nand-recipe">
            {nandRecipe[gate].steps.map((line, i) => (
              <div key={line}>
                <i>{i + 1}</i>
                {line}
              </div>
            ))}
          </div>
          <Results
            items={[
              { label: `${gate} の出力`, value: Number(gateOutput(gate, a, b)) },
              { label: "NANDだけで作った回路の出力", value: Number(nandOnly(gate, a, b)) },
              { label: "一致しているか", value: gateOutput(gate, a, b) === nandOnly(gate, a, b) ? "一致" : "不一致", warn: gateOutput(gate, a, b) !== nandOnly(gate, a, b) },
              { label: "必要なNANDの数", value: `${nandRecipe[gate].count} 個` }
            ]}
          />
          <DataTable
            head={["A", "B", `${gate} の出力`, "NANDだけの回路"]}
            rows={[
              [false, false],
              [false, true],
              [true, false],
              [true, true]
            ].map(([x, y]) => [
              Number(x),
              Number(y),
              Number(gateOutput(gate, x, y)),
              <b key={`${x}${y}`} className={gateOutput(gate, x, y) === nandOnly(gate, x, y) ? "" : "hot"}>
                {Number(nandOnly(gate, x, y))}
              </b>
            ])}
          />
          <Hint>
            NANDだけですべてのゲートが作れるため、実際の電子部品ではNANDが多く使われます。
            1種類の部品だけで済むうえ、製作コストも安くなるからです。
          </Hint>
        </>
      )}

      {card(
        8,
        "階段の照明回路を設計する",
        "2か所のスイッチのどちらを操作しても切り替わる回路を選びます。",
        <>
          <div className="switches">
            <Toggle label="1階のスイッチ" on={a} onChange={setA} />
            <Toggle label="2階のスイッチ" on={b} onChange={setB} />
          </div>
          <Results
            items={[
              { label: "AND なら", value: a && b ? "点灯" : "消灯" },
              { label: "OR なら", value: a || b ? "点灯" : "消灯" },
              { label: "XOR なら", value: a !== b ? "点灯" : "消灯" },
              { label: "求める動作", value: "どちらか一方を操作したら切り替わる" }
            ]}
          />
          <AreaField
            label="選んだゲートと、その根拠"
            value={stairPlan}
            onChange={setStairPlan}
            placeholder="例：XORを選ぶ。4通りすべてで、どちらか一方だけを切り替えると出力が必ず反転するため、階段のどちらからでも操作できる。"
            rows={4}
          />
        </>
      )}
    </>
  );
}

/* ========================================================================
 * D5 コンピュータの構成
 * ====================================================================== */
export function ComputerLab({ card }: LabProps) {
  const [left, setLeft] = useState(5);
  const [right, setRight] = useState(3);
  const [op, setOp] = useState("+");
  const [flowStep, setFlowStep] = useState(0);
  const [device, setDevice] = useState("キーボード");
  const [step, setStep] = useState(0);
  const [clock, setClock] = useState(1.6);
  const [cycles, setCycles] = useState(4);
  const [hitRate, setHitRate] = useState(90);
  const [cacheNs, setCacheNs] = useState(2);
  const [mainNs, setMainNs] = useState(60);
  const [osTopic, setOsTopic] = useState("task");
  const [spec, setSpec] = useState("");

  /* --- 実験1: 「5+3」が「8」になるまで --- */
  const answer =
    op === "+" ? left + right : op === "−" ? left - right : op === "×" ? left * right : right === 0 ? NaN : left / right;
  const expr = `${left} ${op} ${right}`;
  const flow: { from: string; to: string; kind: "データ" | "制御"; what: string; detail: string }[] = [
    {
      from: "入力装置",
      to: "記憶装置",
      kind: "データ",
      what: `${expr}`,
      detail: `キーボードで打った「${expr}」が、そのまま主記憶に読み込まれます。まだ計算はしていません。`
    },
    {
      from: "制御装置",
      to: "演算装置",
      kind: "制御",
      what: `${op === "+" ? "加算せよ" : op === "−" ? "減算せよ" : op === "×" ? "乗算せよ" : "除算せよ"}`,
      detail: "制御装置が主記憶から命令を読み取り、演算装置に「何をするか」を指示します。数そのものは流れません。"
    },
    {
      from: "記憶装置",
      to: "演算装置",
      kind: "データ",
      what: `${left} と ${right}`,
      detail: "計算に使う2つの数が、主記憶から演算装置へ送られます。"
    },
    {
      from: "演算装置",
      to: "記憶装置",
      kind: "データ",
      what: `${Number.isFinite(answer) ? answer : "エラー"}`,
      detail: "演算装置が計算し、その結果を主記憶に書き戻します。"
    },
    {
      from: "記憶装置",
      to: "出力装置",
      kind: "データ",
      what: `${Number.isFinite(answer) ? answer : "エラー"}`,
      detail: "主記憶から結果が読み出され、ディスプレイに表示されます。ここでようやく人が答えを見られます。"
    }
  ];
  const now = flow[flowStep];
  const lit = (name: string) => (now.from === name || now.to === name ? (now.from === name ? "from" : "to") : "");

  /* --- 実験2: 五大装置 --- */
  const deviceMap: Record<string, [string, string]> = {
    キーボード: ["入力装置", "人の操作をデータに変えて、コンピュータへ送りこみます。"],
    ディスプレイ: ["出力装置", "処理した結果を、人が読める形で表示します。"],
    メインメモリ: ["記憶装置（主記憶）", "実行中の命令とデータを置きます。CPUと直接やり取りするので高速ですが、容量は小さめです。"],
    SSD: ["記憶装置（補助記憶）", "電源を切っても残る保存場所です。容量は大きいですが、主記憶より遅くなります。"],
    演算装置: ["演算装置", "計算や比較を行います。制御装置と合わせてCPUと呼びます。"],
    制御装置: ["制御装置", "他の4つの装置に制御信号を送り、全体の動きをそろえます。"],
    ルータ: ["五大装置ではありません", "通信装置は五大装置に入りません。入力・出力・記憶・演算・制御の5つです。"]
  };

  /* --- 実験3: 命令サイクル --- */
  const cycle: [string, string][] = [
    ["取出し（フェッチ）", "プログラムカウンタが指す番地から、命令を命令レジスタへ読み込みます。"],
    ["解読（デコード）", "デコーダが命令の種類と、必要なデータの場所を判断します。"],
    ["実行（エグゼキュート）", "演算装置が計算し、結果をレジスタや主記憶へ書き戻します。"],
    ["次へ進む", "プログラムカウンタが次の命令の番地を指し、また取出しに戻ります。"]
  ];

  /* --- 実験4: CPUの性能 --- */
  const perSecond = (clock * 1e9) / Math.max(1, cycles);
  const perInstructionNs = cycles / Math.max(0.001, clock);

  /* --- 実験5: 記憶の階層 --- */
  const effective = effectiveAccess(hitRate / 100, cacheNs, mainNs);

  /* --- 実験6: OSのはたらき --- */
  const osTopics: Record<string, [string, string, string]> = {
    task: ["タスク管理", "複数の処理を切り替えながら実行する", "ダウンロードしながら画像編集ができるのは、OSが処理を瞬間的に切り替えているからです。"],
    memory: ["メモリ管理", "主記憶の領域を各処理に割り当てる", "メモリには限りがあるため、どの処理にどれだけ渡すかをOSが決めています。"],
    file: ["ファイル管理", "補助記憶のデータを整理する", "フォルダという入れ物をつくって階層的に管理し、保存・削除・読み書きを担います。"],
    ui: ["ユーザインタフェースの提供", "GUIやCUIで操作できるようにする", "画面上のアイコンを指で触って操作できるのがGUI、文字入力だけで操作するのがCUIです。"],
    driver: ["ハードウェアとの仲介", "デバイスドライバで機器の違いを吸収する", "機種が違っても同じ操作でプリンタを使えるのは、OSとデバイスドライバが違いを吸収しているからです。"]
  };

  return (
    <>
      {card(
        0,
        "「5＋3」が「8」になるまでを追いかける",
        "キーボードを打ってから画面に答えが出るまで、5つの装置の間を何が流れるかを1歩ずつ見ます。",
        <>
          <Row>
            <NumberField label="左の数" value={left} onChange={setLeft} min={0} max={9999} />
            <SelectField label="計算" value={op} onChange={setOp} options={["+", "−", "×", "÷"].map((v) => ({ value: v, label: v }))} />
            <NumberField label="右の数" value={right} onChange={setRight} min={0} max={9999} />
          </Row>
          <Tabs
            value={String(flowStep)}
            onChange={(v) => setFlowStep(Number(v))}
            options={flow.map((_, i) => ({ value: String(i), label: `${i + 1}` }))}
          />
          <div className="machine">
            <div className={`unit control ${lit("制御装置")}`}>
              <small>制御装置</small>
              <b>指示を出す</b>
            </div>
            <div className={`unit input ${lit("入力装置")}`}>
              <small>入力装置</small>
              <b>キーボード</b>
            </div>
            <div className={`unit memory ${lit("記憶装置")}`}>
              <small>記憶装置（主記憶）</small>
              <b>データを置く</b>
            </div>
            <div className={`unit output ${lit("出力装置")}`}>
              <small>出力装置</small>
              <b>ディスプレイ</b>
            </div>
            <div className={`unit alu ${lit("演算装置")}`}>
              <small>演算装置</small>
              <b>計算する</b>
            </div>
          </div>
          <div className={`flow-line ${now.kind === "制御" ? "control" : ""}`}>
            <span>{now.from}</span>
            <i>{now.kind === "制御" ? "制御信号" : "データ"}</i>
            <strong>{now.what}</strong>
            <i>→</i>
            <span>{now.to}</span>
          </div>
          <Results
            items={[
              { label: `手順 ${flowStep + 1} / 5`, value: `${now.from} → ${now.to}` },
              { label: "流れるもの", value: now.kind },
              { label: "中身", value: now.what },
              { label: "最終的な答え", value: Number.isFinite(answer) ? answer : "計算できません", warn: !Number.isFinite(answer) }
            ]}
          />
          <Hint>{now.detail}</Hint>
        </>
      )}

      {card(
        1,
        "五大装置に分類する",
        "装置を選んで、入力・出力・記憶・演算・制御のどれにあたるかを確かめます。",
        <>
          <SelectField label="装置を選ぶ" value={device} onChange={setDevice} options={Object.keys(deviceMap).map((value) => ({ value, label: value }))} />
          <Results items={[{ label: deviceMap[device][0], value: deviceMap[device][1], warn: deviceMap[device][0].includes("ではありません") }]} />
          <div className="five-units">
            {["入力装置", "出力装置", "記憶装置", "演算装置", "制御装置"].map((name) => (
              <span key={name} className={deviceMap[device][0].startsWith(name.slice(0, 2)) ? "active" : ""}>
                {name}
              </span>
            ))}
          </div>
          <Hint>演算装置と制御装置をまとめてCPU（中央処理装置）と呼びます。通信装置は五大装置には含まれません。</Hint>
        </>
      )}

      {card(
        2,
        "CPUの中で命令が回る順番",
        "取出し→解読→実行の1周を、順に確かめます。",
        <>
          <Tabs value={String(step)} onChange={(v) => setStep(Number(v))} options={cycle.map((s, i) => ({ value: String(i), label: `${i + 1} ${s[0]}` }))} />
          <Results items={[{ label: cycle[step][0], value: cycle[step][1] }]} />
          <div className="registers">
            <span className={step === 0 ? "active" : ""}>プログラムカウンタ</span>
            <span className={step === 0 ? "active" : ""}>命令レジスタ</span>
            <span className={step === 1 ? "active" : ""}>デコーダ</span>
            <span className={step === 2 ? "active" : ""}>演算装置</span>
          </div>
          <Hint>この1周を1秒間に何億回も繰り返しています。次の実験で、その回数を計算します。</Hint>
        </>
      )}

      {card(
        3,
        "1秒間に何回の命令を実行できるか",
        "クロック周波数と、1命令に必要なクロック数から計算します。",
        <>
          <Row>
            <NumberField label="クロック周波数" value={clock} onChange={setClock} step={0.1} min={0.1} max={6} unit="GHz" />
            <NumberField label="1命令あたりのクロック数" value={cycles} onChange={setCycles} min={1} max={20} unit="周期" />
          </Row>
          <Formula>1秒間の命令数 ＝ クロック周波数 ÷ 1命令あたりのクロック数</Formula>
          <Steps
            items={[
              { label: "1秒間のクロック数", value: `${fmt(clock, 2)} × 10⁹ 回`, note: `${fmt(clock * 1e9, 0)} 回` },
              { label: `÷ ${cycles} 周期`, value: `${(perSecond / 1e8).toFixed(2)} × 10⁸ 回` },
              { label: "1秒間に実行できる命令数", value: `約 ${fmt(perSecond / 1e8, 1)} 億回` }
            ]}
          />
          <Results
            items={[
              { label: "1命令にかかる時間", value: `${fmt(perInstructionNs, 3)} ns` },
              { label: "クロックを2倍にすると", value: `約 ${fmt((clock * 2 * 1e9) / cycles / 1e8, 1)} 億回` },
              { label: "クロック数を半分にすると", value: `約 ${fmt((clock * 1e9) / Math.max(1, cycles / 2) / 1e8, 1)} 億回` }
            ]}
          />
          <Hint>
            1.6GHzで4周期なら 1.6×10⁹ ÷ 4 ＝ 4.0×10⁸ で、1秒間に4億回。クロックを上げるか、1命令あたりの周期を減らすかの
            2通りで速くできます。
          </Hint>
        </>
      )}

      {card(
        4,
        "記憶装置の速さと容量を比べる",
        "よく使うデータを手元に置くと、待ち時間がどれだけ縮むかを確かめます。",
        <>
          <DataTable
            head={["記憶装置", "速さ", "容量", "電源を切ると"]}
            rows={[
              ["レジスタ（CPU内）", "最速", "数十バイト", "消える"],
              ["キャッシュメモリ", "非常に速い", "数MB", "消える"],
              ["主記憶（メインメモリ）", "速い", "数GB〜数十GB", "消える"],
              ["補助記憶（SSD・HDD）", "遅い", "数百GB〜数TB", "残る"]
            ]}
          />
          <SliderField label="キャッシュに目当てのデータがあった割合" value={hitRate} onChange={setHitRate} min={0} max={100} unit=" %" />
          <Row>
            <NumberField label="キャッシュの待ち時間" value={cacheNs} onChange={setCacheNs} step={0.5} min={0.5} max={20} unit="ns" />
            <NumberField label="主記憶の待ち時間" value={mainNs} onChange={setMainNs} step={5} min={10} max={300} unit="ns" />
          </Row>
          <Formula>平均の待ち時間 ＝ 見つかった割合 × キャッシュ ＋ 見つからなかった割合 × 主記憶</Formula>
          <Results
            items={[
              { label: "平均の待ち時間", value: `${fmt(effective, 2)} ns` },
              { label: "キャッシュなしと比べて", value: `${fmt(mainNs / effective, 2)} 倍速い` },
              { label: "割合をあと5%上げると", value: `${fmt(effectiveAccess(Math.min(1, hitRate / 100 + 0.05), cacheNs, mainNs), 2)} ns` }
            ]}
          />
        </>
      )}

      {card(
        5,
        "OSは何をしているのか",
        "基本ソフトウェアであるOSの役割を、1つずつ確かめます。",
        <>
          <Tabs value={osTopic} onChange={setOsTopic} options={Object.entries(osTopics).map(([value, [label]]) => ({ value, label }))} />
          <Results
            items={[
              { label: osTopics[osTopic][0], value: osTopics[osTopic][1] },
              { label: "身近な例", value: osTopics[osTopic][2] }
            ]}
          />
          <DataTable
            head={["区分", "何をするソフトウェアか", "例"]}
            rows={[
              ["基本ソフトウェア（OS）", "ハードウェアを制御し、アプリが動く環境を整える", "Windows、macOS、Android"],
              ["応用ソフトウェア", "目的ごとの作業を行う", "文書作成、表計算、ブラウザ"],
              ["デバイスドライバ", "周辺機器をOSから使えるようにする", "プリンタ用、カメラ用"]
            ]}
          />
          <Hint>
            周辺機器はインタフェース（USB・HDMIなど）でつながります。OSを入れ直すとデバイスドライバも消えるため、入れ直しが必要になります。
          </Hint>
        </>
      )}

      {card(
        6,
        "用途別にPCを選定する",
        "文書作成用と動画編集用のPCを、根拠つきで提案します。",
        <AreaField
          label="2台の構成と、優先順位の理由"
          value={spec}
          onChange={setSpec}
          placeholder="例：文書作成用はCPUを中位に抑えSSDを512GBに。動画編集用はメインメモリ32GBとGPUを優先。書き出しはGPU依存が大きく、メモリ不足だと4K素材で補助記憶への退避が起きて極端に遅くなるため。"
          rows={5}
        />
      )}
    </>
  );
}

/* ========================================================================
 * D6 文字
 * ====================================================================== */
export function TextLab({ card }: LabProps) {
  const [char, setChar] = useState("A");
  const [sample, setSample] = useState("情報AI 2026");
  const [saveEnc, setSaveEnc] = useState("UTF-8");
  const [readEnc, setReadEnc] = useState("UTF-8");
  const [bits, setBits] = useState(8);
  const [chars, setChars] = useState(40);
  const [lines, setLines] = useState(40);
  const [bytesPerChar, setBytesPerChar] = useState(2);
  const [recovery, setRecovery] = useState("");

  const info = asciiInfo(char.slice(0, 1) || "A");
  const table = useMemo(
    () =>
      Array.from({ length: 16 }, (_, row) =>
        Array.from({ length: 6 }, (_, col) => {
          const code = (col + 2) * 16 + row;
          return { code, char: code === 32 ? "␣" : String.fromCharCode(code) };
        })
      ),
    []
  );
  const totalBytes = chars * lines * bytesPerChar;
  const mojibake = saveEnc === readEnc ? sample : "諠・ｱAI 2026";

  return (
    <>
      {card(
        0,
        "1文字を数値に直す",
        "文字を入力して、10進数・16進数・2進数の対応を確かめます。",
        <>
          <TextField label="1文字を入力" value={char} onChange={setChar} hint="半角英数字で試そう" />
          <Results
            items={[
              { label: "文字", value: info.char },
              { label: "10進数(10)", value: info.dec },
              { label: "16進数(16)", value: info.hex },
              { label: "2進数(2)", value: <span className="mono">{info.bin}</span> }
            ]}
          />
          <Hint>A は65、a は97。大文字と小文字は32（2進数で1けた分）だけ離れています。</Hint>
        </>
      )}

      {card(
        1,
        "ASCIIコード表を引く",
        "上位4ビットと下位4ビットの交点に、文字が並んでいることを確かめます。",
        <>
          <DataTable
            head={["下位＼上位", "2", "3", "4", "5", "6", "7"]}
            rows={table.map((row, index) => [
              <span key="h" className="mono">{index.toString(2).padStart(4, "0")}（{index.toString(16).toUpperCase()}）</span>,
              ...row.map((cell) => (
                <span key={cell.code} className={cell.char === info.char ? "hot" : ""}>
                  {cell.char}
                </span>
              ))
            ])}
          />
          <Hint>上の実験で入力した文字が、表の中で強調されます。16進数の上位けたが列、下位けたが行にあたります。</Hint>
        </>
      )}

      {card(
        2,
        "符号化方式でバイト数を比べる",
        "同じ文字列でも、方式によってデータ量が変わることを確かめます。",
        <>
          <TextField label="文字列を入力" value={sample} onChange={setSample} />
          <Results
            items={[
              { label: "UTF-8", value: `${utf8Bytes(sample)} B`, note: "英数字1B・日本語3B" },
              { label: "UTF-16", value: `${utf16Bytes(sample)} B`, note: "おおむね一律2B" },
              { label: "Shift_JIS（概算）", value: `${sjisBytes(sample)} B`, note: "英数字1B・日本語2B" },
              { label: "文字数", value: `${Array.from(sample).length} 文字` }
            ]}
          />
          <Hint>英語中心の文書はUTF-8が小さく、日本語だけの文書はShift_JISやUTF-16が小さくなることもあります。</Hint>
        </>
      )}

      {card(
        3,
        "文字化けを再現する",
        "保存したときの方式と読み込むときの方式を食い違わせます。",
        <>
          <Row>
            <SelectField label="保存するときの方式" value={saveEnc} onChange={setSaveEnc} options={["UTF-8", "Shift_JIS"].map((value) => ({ value, label: value }))} />
            <SelectField label="読み込むときの方式" value={readEnc} onChange={setReadEnc} options={["UTF-8", "Shift_JIS"].map((value) => ({ value, label: value }))} />
          </Row>
          <div className="encoding-flow">
            <span>{sample}</span>
            <i>{saveEnc} で保存</i>
            <span className="mono">{Array.from(new TextEncoder().encode(sample)).slice(0, 8).map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ")}…</span>
            <i>{readEnc} で読込</i>
            <strong className={saveEnc === readEnc ? "" : "broken"}>{mojibake}</strong>
          </div>
          <Verdict ok={saveEnc === readEnc}>
            {saveEnc === readEnc ? "方式が一致しているので正しく読めます。" : "方式が食い違うと文字化けします。バイト列自体は壊れていません。"}
          </Verdict>
        </>
      )}

      {card(
        4,
        "ビット数と表せる文字の種類",
        "何ビットあれば何種類の文字を表せるかを確かめます。",
        <>
          <SliderField label="1文字あたりのビット数" value={bits} onChange={setBits} min={5} max={21} unit=" bit" />
          <Results
            items={[
              { label: "表せる文字数", value: fmt(charVariations(bits), 0) },
              { label: "バイト換算", value: `${fmt(bits / 8, 3)} B` },
              { label: "代表例", value: bits <= 7 ? "ASCII（128文字）" : bits <= 8 ? "Shift_JIS 半角（256文字）" : bits <= 16 ? "Unicode 基本多言語面（65,536文字）" : "Unicode 全体" }
            ]}
          />
        </>
      )}

      {card(
        5,
        "文字データ量を計算する",
        "1ページ分の文字データが何キロバイトになるかを求めます。",
        <>
          <Row>
            <NumberField label="1行の文字数" value={chars} onChange={setChars} min={1} max={200} unit="字" />
            <NumberField label="行数" value={lines} onChange={setLines} min={1} max={200} unit="行" />
            <NumberField label="1文字あたり" value={bytesPerChar} onChange={setBytesPerChar} min={1} max={4} unit="B" />
          </Row>
          <Steps
            items={[
              { label: "総文字数", value: `${fmt(chars * lines, 0)} 字` },
              { label: "バイト数", value: `${fmt(totalBytes, 0)} B` },
              { label: "1KB＝1,024B なら", value: `${fmt(totalBytes / 1024, 3)} KB`, note: "教科書の表1" },
              { label: "1kB＝1,000B なら", value: `${fmt(totalBytes / 1000, 3)} kB`, note: "SI・問題文が指定する場合" }
            ]}
          />
          <Hint>1kBを1,000とするか1,024とするかで答えが変わります。問題文の指定を必ず確認しましょう。</Hint>
        </>
      )}

      {card(
        6,
        "文字化けしたCSVを復旧する",
        "元ファイルを壊さずに読み直す手順を書き出します。",
        <AreaField
          label="復旧の手順"
          value={recovery}
          onChange={setRecovery}
          placeholder="例：1) 元ファイルのコピーを取る 2) テキストエディタで文字コードを指定して開き直す 3) Shift_JISで読めれば正解 4) UTF-8（BOM付き）で保存し直す 5) 以後はUTF-8で統一する"
          rows={5}
        />
      )}
    </>
  );
}

/* ========================================================================
 * D7 音声
 * ====================================================================== */
export function AudioLab({ card }: LabProps) {
  const [freq, setFreq] = useState(440);
  const [sampleRate, setSampleRate] = useState(44100);
  const [maxFreq, setMaxFreq] = useState(20000);
  const [quantBits, setQuantBits] = useState(16);
  const [seconds, setSeconds] = useState(300);
  const [channels, setChannels] = useState(2);
  const [preset, setPreset] = useState("CD");
  const [broadcast, setBroadcast] = useState("");

  const wave = Array.from({ length: 60 }, (_, i) => Math.sin((i / 60) * Math.PI * 2 * (freq / 220)));
  const sampleCount = clamp(Math.round(sampleRate / 2000), 4, 60);
  const levels = 2 ** quantBits;
  const bytes = audioBytes(sampleRate, quantBits, channels, seconds);
  const presets: Record<string, [number, number, number, string]> = {
    "電話(ISDN)": [8000, 8, 1, "声が聞き取れれば十分な用途"],
    CD: [44100, 16, 2, "音楽の標準的な品質"],
    "DVD / YouTube": [48000, 16, 2, "映像作品でよく使われる"],
    ハイレゾ: [96000, 24, 2, "CDを超える情報量"]
  };
  const [pRate, pBits, pCh, pNote] = presets[preset] ?? presets.CD;

  return (
    <>
      {card(
        0,
        "周波数と音の高さ",
        "1秒間の波の数を変えて、波の形がどう変わるかを見ます。",
        <>
          <SliderField label="周波数" value={freq} onChange={setFreq} min={110} max={1760} step={10} unit=" Hz" />
          <div className="wave">
            {wave.map((v, i) => (
              <i key={i} style={{ height: `${20 + (v + 1) * 35}%` }} />
            ))}
          </div>
          <Results
            items={[
              { label: "周波数", value: `${freq} Hz` },
              { label: "1周期の長さ", value: `${fmt(1000 / freq, 3)} ms` },
              { label: "音の高さ", value: freq < 262 ? "低い" : freq < 880 ? "中くらい" : "高い" },
              { label: "基準音との比較", value: freq === 440 ? "ラ（A4）ちょうど" : `A4(440Hz)の ${fmt(freq / 440, 2)} 倍` }
            ]}
          />
        </>
      )}

      {card(
        1,
        "標本化：一定間隔で波を測る",
        "1秒間に測る回数を変えて、点の細かさを確かめます。",
        <>
          <SliderField label="標本化周波数" value={sampleRate} onChange={setSampleRate} min={4000} max={96000} step={1000} unit=" Hz" />
          <div className="wave sampled">
            {Array.from({ length: sampleCount }, (_, i) => (
              <i key={i} style={{ height: `${25 + Math.abs(Math.sin((i / sampleCount) * Math.PI * 3)) * 60}%` }} />
            ))}
          </div>
          <Results
            items={[
              { label: "1秒間の測定回数", value: `${fmt(sampleRate, 0)} 回` },
              { label: "測定の間隔", value: `${fmt(1e6 / sampleRate, 2)} µs` },
              { label: "1分間の標本数", value: fmt(sampleRate * 60, 0) }
            ]}
          />
        </>
      )}

      {card(
        2,
        "標本化定理を確かめる",
        "測る速さが足りないと、元の波を再現できないことを確かめます。",
        <>
          <Row>
            <NumberField label="元の音に含まれる最高周波数" value={maxFreq} onChange={setMaxFreq} min={100} max={48000} step={100} unit="Hz" />
            <NumberField label="標本化周波数" value={sampleRate} onChange={setSampleRate} min={4000} max={96000} step={1000} unit="Hz" />
          </Row>
          <Formula>標本化周波数 ≧ 最高周波数 × 2 が必要</Formula>
          <Results
            items={[
              { label: "必要な最小標本化周波数", value: `${fmt(maxFreq * 2, 0)} Hz` },
              { label: "再現できる最高周波数", value: `${fmt(nyquist(sampleRate), 0)} Hz` },
              { label: "判定", value: sampleRate >= maxFreq * 2 ? "再現できる" : "折り返し雑音が発生", warn: sampleRate < maxFreq * 2 }
            ]}
          />
          <Verdict ok={sampleRate >= maxFreq * 2}>
            {sampleRate >= maxFreq * 2
              ? "標本化定理を満たしています。"
              : "測る速さが足りません。本来なかった低い音（折り返し雑音）が現れます。"}
          </Verdict>
        </>
      )}

      {card(
        3,
        "量子化：波の高さを段階に丸める",
        "量子化ビット数を変えて、段階の細かさと誤差を確かめます。",
        <>
          <SliderField label="量子化ビット数" value={quantBits} onChange={setQuantBits} min={2} max={24} unit=" bit" />
          <Results
            items={[
              { label: "表せる段階数", value: fmt(levels, 0) },
              { label: "1段階の幅（振幅を1とすると）", value: fmt(1 / levels, 8) },
              { label: "1ビット減らすと", value: `${fmt(levels / 2, 0)} 段階`, note: "段階は半分" },
              { label: "ダイナミックレンジの目安", value: `約 ${fmt(quantBits * 6, 0)} dB` }
            ]}
          />
          <Hint>1ビット増やすごとに段階は2倍、表現できる音の強弱の幅はおよそ6dB広がります。</Hint>
        </>
      )}

      {card(
        4,
        "非圧縮音声のデータ量を求める",
        "4つの数値を入力して、段階を追って容量を計算します。",
        <>
          <Row>
            <NumberField label="標本化周波数" value={sampleRate} onChange={setSampleRate} min={1000} max={192000} step={100} unit="Hz" />
            <NumberField label="量子化ビット数" value={quantBits} onChange={setQuantBits} min={1} max={32} unit="bit" />
          </Row>
          <Row>
            <NumberField label="チャネル数" value={channels} onChange={setChannels} min={1} max={6} unit="ch" hint="モノラル1・ステレオ2" />
            <NumberField label="時間" value={seconds} onChange={setSeconds} min={1} max={7200} unit="秒" />
          </Row>
          <Formula>データ量 ＝ 標本化周波数 × 量子化ビット数 ÷ 8 × チャネル数 × 秒数</Formula>
          <Steps
            items={[
              { label: "1秒あたりのビット数", value: `${fmt(sampleRate * quantBits * channels, 0)} bit` },
              { label: "1秒あたりのバイト数", value: `${fmt((sampleRate * quantBits * channels) / 8, 0)} B` },
              { label: `${seconds}秒分`, value: `${fmt(bytes, 0)} B` }
            ]}
          />
          <Results items={bytesRow(bytes)} />
          <details className="unit-note">
            <summary>問題文で「1MB＝1,000kB」と指定されたとき</summary>
            <Results items={bytesRowSI(bytes)} />
          </details>
          <Hint>教科書は 1KB＝1,024B で計算します。IPAの問題では 1MB＝1,000kB と指定されることがあるので、問題文を必ず確認しましょう。</Hint>
        </>
      )}

      {card(
        5,
        "音質のプリセットを比べる",
        "用途ごとの標準的な設定と、そのデータ量を比べます。",
        <>
          <Tabs value={preset} onChange={setPreset} options={Object.keys(presets).map((value) => ({ value, label: value }))} />
          <Results
            items={[
              { label: "標本化周波数", value: `${fmt(pRate, 0)} Hz` },
              { label: "量子化ビット数", value: `${pBits} bit` },
              { label: "チャネル数", value: `${pCh} ch` },
              { label: "1分あたり", value: `${fmt(audioBytes(pRate, pBits, pCh, 60) / 1024 ** 2, 2)} MB`, note: pNote }
            ]}
          />
          <button type="button" className="apply-preset" onClick={() => { setSampleRate(pRate); setQuantBits(pBits); setChannels(pCh); }}>
            この設定を上の計算に反映する
          </button>
        </>
      )}

      {card(
        6,
        "校内放送の音質を決める",
        "計算した容量を根拠に、設定を決めます。",
        <AreaField
          label="決めた設定と、その根拠"
          value={broadcast}
          onChange={setBroadcast}
          placeholder="例：言葉が聞き取れればよいので 16kHz・16bit・モノラルを採用。5分で約9.6MBに収まり、校内サーバの容量にも余裕がある。音楽を流す回は44.1kHz・ステレオに切り替える。"
          rows={4}
        />
      )}
    </>
  );
}

/* ========================================================================
 * D8 画像
 * ====================================================================== */
export function ImageLab({ card }: LabProps) {
  const [r, setR] = useState(255);
  const [g, setG] = useState(120);
  const [b, setB] = useState(0);
  const [c, setC] = useState(0);
  const [m, setM] = useState(80);
  const [y, setY] = useState(100);
  const [k, setK] = useState(0);
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [colorBits, setColorBits] = useState(24);
  const [cmWidth, setCmWidth] = useState(25.4);
  const [cmHeight, setCmHeight] = useState(38.1);
  const [dpi, setDpi] = useState(600);
  const [monoArt, setMonoArt] = useState("00000\n01010\n10001\n01010\n01110\n00000\n00110\n00000\n11111\n00100");
  const [colorArt, setColorArt] = useState("0002000000\n0222220012\n0020020034\n0020020056\n0020020070\n0200002000\n0000220000\n0020000000\n0020000000\n0020020000\n0020200000\n0022002222\n0020000000\n0000000000\n0000000000");
  const [useCase, setUseCase] = useState("photo");
  const [webPlan, setWebPlan] = useState("");

  const hex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).toUpperCase().padStart(2, "0");
  const rgbHex = `#${hex(r)}${hex(g)}${hex(b)}`;
  const cmyToRgb = {
    r: Math.round(255 * (1 - c / 100) * (1 - k / 100)),
    g: Math.round(255 * (1 - m / 100) * (1 - k / 100)),
    b: Math.round(255 * (1 - y / 100) * (1 - k / 100))
  };
  const bytes = imageBytes(width, height, colorBits);
  const dotW = dpiToDots(cmWidth, dpi);
  const dotH = dpiToDots(cmHeight, dpi);
  const scanBytes = imageBytes(dotW, dotH, 24);
  const palette = ["#111111", "#e5484d", "#f5d90a", "#d6409f", "#30a46c", "#00b8d9", "#3b82f6", "#ffffff"];
  const monoRows = monoArt.split("\n").map((row) => row.replace(/[^01]/g, ""));
  const colorRows = colorArt.split("\n").map((row) => row.replace(/[^0-7]/g, ""));
  const monoPixels = monoRows.reduce((sum, row) => sum + row.length, 0);
  const colorPixels = colorRows.reduce((sum, row) => sum + row.length, 0);
  const recommend = useCase === "photo" ? "JPEG / WebP（非可逆）" : useCase === "logo" ? "PNG / SVG（可逆・透過）" : "PNG（可逆）";

  return (
    <>
      {card(
        0,
        "光の三原色を混ぜる（加法混色）",
        "RGBの値を変えて、混ぜるほど明るくなることを確かめます。",
        <>
          <Row>
            <NumberField label="R（赤）" value={r} onChange={setR} min={0} max={255} />
            <NumberField label="G（緑）" value={g} onChange={setG} min={0} max={255} />
            <NumberField label="B（青）" value={b} onChange={setB} min={0} max={255} />
          </Row>
          <div className="color-preview" style={{ background: rgbHex }}>
            <span style={{ color: r * 0.299 + g * 0.587 + b * 0.114 > 140 ? "#111" : "#fff" }}>{rgbHex}</span>
          </div>
          <Results
            items={[
              { label: "10進カラーコード", value: `${r}, ${g}, ${b}` },
              { label: "16進カラーコード", value: rgbHex },
              { label: "2進数(2)（Rのみ）", value: <span className="mono">{r.toString(2).padStart(8, "0")}</span> },
              { label: "表せる色数", value: "16,777,216 色", note: "各8bit＝24bit" }
            ]}
          />
          <Hint>3つとも0なら黒（光を出していない）、3つとも255なら白。混ぜるほど明るくなるのが加法混色です。</Hint>
        </>
      )}

      {card(
        1,
        "色の三原色を混ぜる（減法混色）",
        "CMYKの値を変えて、混ぜるほど暗くなることを確かめます。",
        <>
          <Row>
            <NumberField label="C（シアン）" value={c} onChange={setC} min={0} max={100} unit="%" />
            <NumberField label="M（マゼンタ）" value={m} onChange={setM} min={0} max={100} unit="%" />
            <NumberField label="Y（イエロー）" value={y} onChange={setY} min={0} max={100} unit="%" />
            <NumberField label="K（黒）" value={k} onChange={setK} min={0} max={100} unit="%" />
          </Row>
          <div className="color-preview" style={{ background: `rgb(${cmyToRgb.r},${cmyToRgb.g},${cmyToRgb.b})` }}>
            <span style={{ color: cmyToRgb.r * 0.299 + cmyToRgb.g * 0.587 + cmyToRgb.b * 0.114 > 140 ? "#111" : "#fff" }}>
              C{c} M{m} Y{y} K{k}
            </span>
          </div>
          <Results
            items={[
              { label: "画面での見え方（RGB換算）", value: `${cmyToRgb.r}, ${cmyToRgb.g}, ${cmyToRgb.b}` },
              { label: "CMYすべて100%", value: "理論上は黒", note: "実際は濁るのでKを足す" },
              { label: "CMYすべて0%", value: "紙の白" }
            ]}
          />
        </>
      )}

      {card(
        2,
        "画素数と色深度から容量を求める",
        "解像度と1画素あたりのビット数を変えて、非圧縮容量を計算します。",
        <>
          <Row>
            <NumberField label="横の画素数" value={width} onChange={setWidth} min={1} max={8000} unit="px" />
            <NumberField label="縦の画素数" value={height} onChange={setHeight} min={1} max={8000} unit="px" />
            <NumberField label="1画素あたり" value={colorBits} onChange={setColorBits} min={1} max={48} unit="bit" />
          </Row>
          <div className="preset-row">
            {[[1280, 720, "HD"], [1920, 1080, "フルHD"], [3840, 2160, "4K"], [7680, 4320, "8K"]].map(([w, h, name]) => (
              <button type="button" key={String(name)} onClick={() => { setWidth(Number(w)); setHeight(Number(h)); }}>
                {name} {w}×{h}
              </button>
            ))}
          </div>
          <Formula>データ量 ＝ 横 × 縦 × 1画素のビット数 ÷ 8</Formula>
          <Steps
            items={[
              { label: "総画素数", value: `${fmt(width * height, 0)} 画素` },
              { label: "表せる色数", value: `${fmt(2 ** Math.min(colorBits, 32), 0)} 色` },
              { label: "ビット数", value: `${fmt(width * height * colorBits, 0)} bit` }
            ]}
          />
          <Results items={bytesRow(bytes)} />
          <details className="unit-note">
            <summary>問題文で「1MB＝1,000kB」と指定されたとき</summary>
            <Results items={bytesRowSI(bytes)} />
          </details>
          <Hint>縦横をそれぞれ2倍にすると、画素数は4倍。データ量も4倍になります。教科書は 1KB＝1,024B で計算します。</Hint>
        </>
      )}

      {card(
        3,
        "dpiから画素数を求める",
        "長さと解像度を入力して、スキャナで読み取ったときの容量を計算します。",
        <>
          <Row>
            <NumberField label="横の長さ" value={cmWidth} onChange={setCmWidth} step={0.1} min={1} max={200} unit="cm" />
            <NumberField label="縦の長さ" value={cmHeight} onChange={setCmHeight} step={0.1} min={1} max={200} unit="cm" />
            <NumberField label="解像度" value={dpi} onChange={setDpi} min={72} max={2400} unit="dpi" />
          </Row>
          <Formula>ドット数 ＝ 長さ(cm) ÷ 2.54 × dpi</Formula>
          <Steps
            items={[
              { label: "横（インチ）", value: `${fmt(cmWidth / 2.54, 2)} inch` },
              { label: "横（ドット）", value: `${fmt(dotW, 0)} dot` },
              { label: "縦（ドット）", value: `${fmt(dotH, 0)} dot` },
              { label: "総画素数", value: `${fmt(dotW * dotH, 0)} 画素` }
            ]}
          />
          <Results items={bytesRow(scanBytes)} />
          <details className="unit-note">
            <summary>問題文で「1MB＝1,000kB」と指定されたとき</summary>
            <Results items={bytesRowSI(scanBytes)} />
          </details>
          <Hint>cmのままdpiを掛けてはいけません。必ず1インチ＝2.54cmで単位をそろえてから計算します。</Hint>
        </>
      )}

      {card(
        4,
        "2値画像のドット絵を作る",
        "0と1を打ち込むと、白黒の絵になります。",
        <>
          <AreaField label="0と1で描く（改行で行を分ける）" value={monoArt} onChange={setMonoArt} rows={8} hint="0＝黒 / 1＝白" />
          <div className="dot-art">
            {monoRows.map((row, ri) => (
              <div key={ri}>
                {row.split("").map((cell, ci) => (
                  <i key={ci} style={{ background: cell === "1" ? "#ffffff" : "#111111" }} />
                ))}
              </div>
            ))}
          </div>
          <Results
            items={[
              { label: "総画素数", value: `${monoPixels} 画素` },
              { label: "色情報", value: "1 bit", note: "白か黒の2値" },
              { label: "データ量", value: `${fmt(monoPixels / 8, 3)} B` }
            ]}
          />
        </>
      )}

      {card(
        5,
        "8色のドット絵を作る",
        "0〜7の数字を打ち込むと、色つきの絵になります。",
        <>
          <AreaField label="0〜7で描く（改行で行を分ける）" value={colorArt} onChange={setColorArt} rows={10} hint="0黒 1赤 2黄 3マゼンタ 4緑 5シアン 6青 7白" />
          <div className="dot-art">
            {colorRows.map((row, ri) => (
              <div key={ri}>
                {row.split("").map((cell, ci) => (
                  <i key={ci} style={{ background: palette[Number(cell)] }} />
                ))}
              </div>
            ))}
          </div>
          <Results
            items={[
              { label: "総画素数", value: `${colorPixels} 画素` },
              { label: "色情報", value: "3 bit", note: "8色＝2の3乗" },
              { label: "データ量", value: `${fmt((colorPixels * 3) / 8, 2)} B` },
              { label: "フルカラーなら", value: `${fmt(colorPixels * 3, 0)} B`, note: "24bit＝3B" }
            ]}
          />
        </>
      )}

      {card(
        6,
        "用途から画像形式を選ぶ",
        "写真・ロゴ・図表で、向いている形式が変わることを確かめます。",
        <>
          <Tabs
            value={useCase}
            onChange={setUseCase}
            options={[
              { value: "photo", label: "行事写真" },
              { value: "logo", label: "透過ロゴ" },
              { value: "chart", label: "図表・文字" }
            ]}
          />
          <Results
            items={[
              { label: "推奨する形式", value: recommend },
              { label: "圧縮の種類", value: useCase === "photo" ? "非可逆（戻せない）" : "可逆（完全に戻せる）" },
              { label: "拡大したとき", value: useCase === "logo" ? "SVGなら荒れない" : "ジャギーが出る" },
              { label: "透過", value: useCase === "logo" ? "対応が必要" : "不要" }
            ]}
          />
        </>
      )}

      {card(
        7,
        "学校Web用に画像を書き出す",
        "形式と解像度を決めて、目標サイズに収まるかを説明します。",
        <AreaField
          label="決めた形式・解像度と、その根拠"
          value={webPlan}
          onChange={setWebPlan}
          placeholder="例：行事写真は表示幅1200pxに合わせてJPEG品質80で書き出し、約350kBに収める。ロゴはSVGで配置し、非対応環境用にPNGも用意する。元データは無圧縮で別に保存する。"
          rows={5}
        />
      )}
    </>
  );
}

/* ========================================================================
 * D9 動画
 * ====================================================================== */
export function VideoLab({ card }: LabProps) {
  const [fps, setFps] = useState(30);
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [colorBits, setColorBits] = useState(24);
  const [minutes, setMinutes] = useState(10);
  const [ratio, setRatio] = useState(2);
  const [speed, setSpeed] = useState(50);
  const [deadline, setDeadline] = useState(30);
  const [plan, setPlan] = useState("");

  const seconds = minutes * 60;
  const raw = videoBytes(width, height, colorBits, fps, seconds);
  const compressed = raw * (ratio / 100);
  const sendSeconds = transferSeconds(compressed, speed);
  const bandwidth = imageBytes(width, height, colorBits) * fps * 8;
  const fpsExamples: Record<number, string> = { 24: "映画", 30: "地デジ・ビデオカメラ", 60: "YouTube高フレームレート" };

  return (
    <>
      {card(
        0,
        "fpsを変えて動きの滑らかさを見る",
        "1秒あたりのコマ数と、1コマの表示時間の関係を確かめます。",
        <>
          <SliderField label="フレームレート" value={fps} onChange={setFps} min={5} max={120} unit=" fps" />
          <div className="frame-strip">
            {Array.from({ length: Math.min(24, fps) }, (_, i) => (
              <i key={i} />
            ))}
          </div>
          <Results
            items={[
              { label: "1秒間のコマ数", value: `${fps} 枚` },
              { label: "1コマの表示時間", value: `${fmt(1000 / fps, 2)} ms` },
              { label: "10分間の総コマ数", value: fmt(fps * 600, 0) },
              { label: "代表例", value: fpsExamples[fps] ?? (fps < 24 ? "カクつきを感じる" : "滑らかに見える") }
            ]}
          />
        </>
      )}

      {card(
        1,
        "非圧縮動画のデータ量を求める",
        "1枚の画像の容量から、動画全体の容量を組み立てます。",
        <>
          <Row>
            <NumberField label="横" value={width} onChange={setWidth} min={1} max={8000} unit="px" />
            <NumberField label="縦" value={height} onChange={setHeight} min={1} max={8000} unit="px" />
            <NumberField label="色情報" value={colorBits} onChange={setColorBits} min={1} max={48} unit="bit" />
          </Row>
          <Row>
            <NumberField label="フレームレート" value={fps} onChange={setFps} min={1} max={120} unit="fps" />
            <NumberField label="長さ" value={minutes} onChange={setMinutes} min={1} max={180} unit="分" />
          </Row>
          <Formula>データ量 ＝ 横 × 縦 × 色情報 ÷ 8 × fps × 秒数</Formula>
          <Steps
            items={[
              { label: "1フレーム", value: `${fmt(imageBytes(width, height, colorBits) / 1024 ** 2, 2)} MB` },
              { label: "1秒間", value: `${fmt((imageBytes(width, height, colorBits) * fps) / 1024 ** 2, 1)} MB` },
              { label: `${minutes}分間`, value: `${fmt(raw / 1024 ** 3, 2)} GB` }
            ]}
          />
          <Results items={bytesRow(raw)} />
          <details className="unit-note">
            <summary>問題文で「1MB＝1,000kB」と指定されたとき</summary>
            <Results items={bytesRowSI(raw)} />
          </details>
        </>
      )}

      {card(
        2,
        "圧縮率を変えて現実的な容量にする",
        "圧縮後の割合を変えて、配信できる大きさにします。",
        <>
          <SliderField label="圧縮後の割合（元の何%か）" value={ratio} onChange={setRatio} min={1} max={100} unit=" %" />
          <Results
            items={[
              { label: "非圧縮", value: `${fmt(raw / 1024 ** 3, 2)} GB` },
              { label: "圧縮後", value: `${fmt(compressed / 1024 ** 3, 3)} GB` },
              { label: "圧縮率", value: `${fmt(100 / ratio, 1)} 分の1` },
              { label: "1分あたり", value: `${fmt(compressed / minutes / 1024 ** 2, 1)} MB` }
            ]}
          />
          <Hint>H.264などのコーデックは、前のコマとの差分だけを記録することで容量を大きく減らします（キーフレーム圧縮）。</Hint>
        </>
      )}

      {card(
        3,
        "転送にかかる時間を求める",
        "容量をビットに直し、通信速度で割ります。",
        <>
          <SliderField label="実効速度" value={speed} onChange={setSpeed} min={1} max={1000} unit=" Mbps" />
          <Formula>時間(秒) ＝ 容量(byte) × 8 ÷ 速度(bps)</Formula>
          <Steps
            items={[
              { label: "圧縮後の容量", value: `${fmt(compressed / 1024 ** 2, 1)} MB` },
              { label: "ビットに直す（×8）", value: `${fmt((compressed * 8) / 1e6, 1)} Mbit` },
              { label: `÷ ${speed} Mbps`, value: `${fmt(sendSeconds, 1)} 秒` },
              { label: "分に直すと", value: `${fmt(sendSeconds / 60, 2)} 分` }
            ]}
          />
          <Row>
            <NumberField label="締切までの残り時間" value={deadline} onChange={setDeadline} min={1} max={600} unit="分" />
          </Row>
          <Verdict ok={sendSeconds / 60 <= deadline}>
            {sendSeconds / 60 <= deadline
              ? `締切まで ${fmt(deadline - sendSeconds / 60, 1)} 分の余裕があります。`
              : `${fmt(sendSeconds / 60 - deadline, 1)} 分足りません。容量を減らすか、回線を変える必要があります。`}
          </Verdict>
        </>
      )}

      {card(
        4,
        "配信に必要な帯域幅を求める",
        "1秒あたりのデータ量から、必要な回線速度を計算します。",
        <>
          <Formula>帯域幅(bps) ＝ 1秒あたりのデータ量(byte) × 8</Formula>
          <Results
            items={[
              { label: "非圧縮での必要帯域", value: `${fmt(bandwidth / 1e6, 1)} Mbps` },
              { label: `圧縮後（${ratio}%）`, value: `${fmt((bandwidth * ratio) / 100 / 1e6, 2)} Mbps` },
              { label: "現在の回線で足りるか", value: (bandwidth * ratio) / 100 / 1e6 <= speed ? "足りる" : "不足", warn: (bandwidth * ratio) / 100 / 1e6 > speed },
              { label: "画質を1段下げると", value: `${fmt((imageBytes(Math.round(width / 1.5), Math.round(height / 1.5), colorBits) * fps * 8 * ratio) / 100 / 1e6, 2)} Mbps` }
            ]}
          />
          <Hint>通信状況に応じて画質を切り替える配信方式は、帯域が細いときにビットレートを下げて再生の停止を防いでいます。</Hint>
        </>
      )}

      {card(
        5,
        "授業動画の提出時間を見積もる",
        "計算結果をもとに、締切に間に合う手順を書きます。",
        <AreaField
          label="提出計画（容量・回線・所要時間・余裕）"
          value={plan}
          onChange={setPlan}
          placeholder="例：1080p・30fps・10分をH.264（元の2%）で書き出すと約1.1GB。校内Wi-Fiの実効50Mbpsで約3分。締切30分前に開始すれば余裕がある。失敗に備え720pの控えも用意する。"
          rows={5}
        />
      )}
    </>
  );
}

/* ========================================================================
 * D10 データの圧縮
 * ====================================================================== */
export function CompressLab({ card }: LabProps) {
  const [kind, setKind] = useState("lossless");
  const [before, setBefore] = useState(64);
  const [after, setAfter] = useState(52);
  const [runText, setRunText] = useState("AAAABBBBBAAA");
  const [art, setArt] = useState("00000000\n01111110\n01000000\n01000000\n01111100\n01000000\n01000000\n00000000");
  const [huffText, setHuffText] = useState("AAAAAAAAAABBBBCCCDDEEF");
  const [plan, setPlan] = useState("");

  const kinds: Record<string, [string, string, string, string]> = {
    lossless: ["可逆圧縮", "もとに戻せる", "ZIP・PNG・GIF・FLAC", "文書やプログラムのように、1ビットも変えてはいけないデータに使います。"],
    lossy: ["非可逆圧縮", "もとに戻せない", "JPEG・MP3・AAC", "写真や音楽のように、人が気づきにくい部分を捨ててよいデータに使います。そのぶん大きく減らせます。"]
  };

  const run = useMemo(() => runLength(runText.replace(/\s/g, "")), [runText]);
  const artRows = art.split("\n").map((row) => row.replace(/[^01]/g, "")).filter((row) => row.length > 0);
  const artFlat = artRows.join("");
  const artRun = useMemo(() => runLength(artFlat), [artFlat]);
  const huff = useMemo(() => huffman(huffText), [huffText]);

  return (
    <>
      {card(
        0,
        "戻せる圧縮と、戻せない圧縮",
        "2つの圧縮を切り替えて、使いどころの違いを確かめます。",
        <>
          <Tabs
            value={kind}
            onChange={setKind}
            options={[
              { value: "lossless", label: "可逆圧縮" },
              { value: "lossy", label: "非可逆圧縮" }
            ]}
          />
          <div className="compress-flow">
            <div className="stage">
              <small>もとのデータ</small>
              <div className="bar full" />
              <b>100%</b>
            </div>
            <i>圧縮</i>
            <div className="stage">
              <small>圧縮後</small>
              <div className="bar" style={{ width: kind === "lossless" ? "60%" : "20%" }} />
              <b>{kind === "lossless" ? "60%" : "20%"}</b>
            </div>
            <i>展開</i>
            <div className="stage">
              <small>戻したデータ</small>
              <div className={`bar full ${kind === "lossy" ? "lossy" : ""}`} />
              <b>{kind === "lossless" ? "もとどおり" : "戻りきらない"}</b>
            </div>
          </div>
          <Results
            items={[
              { label: kinds[kind][0], value: kinds[kind][1], warn: kind === "lossy" },
              { label: "代表的な形式", value: kinds[kind][2] },
              { label: "圧縮率", value: kind === "lossless" ? "高め（あまり縮まない）" : "低め（よく縮む）" }
            ]}
          />
          <Hint>{kinds[kind][3]}</Hint>
        </>
      )}

      {card(
        1,
        "圧縮率を計算する",
        "圧縮前と圧縮後のデータ量を入れて、どれだけ縮んだかを求めます。",
        <>
          <Row>
            <NumberField label="圧縮前のデータ量" value={before} onChange={setBefore} min={1} max={1000000} unit="bit" />
            <NumberField label="圧縮後のデータ量" value={after} onChange={setAfter} min={1} max={1000000} unit="bit" />
          </Row>
          <Formula>圧縮率(%) ＝ 圧縮後のデータ量 ÷ 圧縮前のデータ量 × 100</Formula>
          <Results
            items={[
              { label: "圧縮率", value: `${fmt(compressionRate(after, before), 1)} %`, warn: after > before },
              { label: "減った量", value: `${fmt(before - after, 0)} bit` },
              { label: "何分の1になったか", value: `${fmt(before / Math.max(1, after), 2)} 分の1` },
              { label: "判定", value: after > before ? "かえって増えている" : after === before ? "変わらない" : "縮んでいる", warn: after >= before }
            ]}
          />
          <Hint>圧縮率の数値は、小さいほどよく縮んでいます。100%を超えたら、圧縮したのに増えてしまったということです。</Hint>
        </>
      )}

      {card(
        2,
        "ランレングス法で文字列を圧縮する",
        "同じ文字の連続を、その個数に置き換えます。文字を変えて試しましょう。",
        <>
          <TextField label="文字列を入力" value={runText} onChange={setRunText} hint="AとBだけにすると教科書の例になります" mono />
          <div className="run-view">
            {run.runs.map((r, i) => (
              <span key={i}>
                <b>{r.char}</b>
                <i>{r.count}</i>
              </span>
            ))}
          </div>
          <Steps
            items={[
              { label: "文字の種類", value: `${run.kinds} 種類`, note: `1文字 ${run.symbolBits} bit` },
              { label: "圧縮前", value: `${run.before} bit`, note: `${run.symbolBits} × ${run.chars}文字` },
              { label: "連続のかたまり", value: `${run.runs.length} 個`, note: `最大 ${run.maxCount} 連続 → ${run.countBits} bit` },
              { label: "圧縮後（個数だけ）", value: `${run.afterCountOnly} bit`, note: `${run.countBits} × ${run.runs.length}` }
            ]}
          />
          <Results
            items={[
              { label: "圧縮率（個数だけ記録）", value: `${fmt(run.rateCountOnly, 1)} %`, warn: run.rateCountOnly >= 100, note: run.alternating ? "2種類が交互なので記号を省ける" : "この方式が使えるのは2種類が交互のときだけ" },
              { label: "圧縮率（記号も記録）", value: `${fmt(run.rateWithSymbol, 1)} %`, warn: run.rateWithSymbol >= 100, note: "3種類以上ならこちら" },
              { label: "符号化した結果", value: <span className="mono">{run.runs.map((r) => `${r.char}${r.count}`).join("")}</span> }
            ]}
          />
          <Hint>
            「ABABABAB」のように1文字ずつ変わる文字列を入れると、圧縮率が100%を超えます。ランレングス法が効くのは、
            同じ値が長く続くデータだけです。
          </Hint>
        </>
      )}

      {card(
        3,
        "白黒の絵をランレングス法で圧縮する",
        "0と1で絵を描くと、圧縮率がその場で変わります。",
        <>
          <AreaField label="0と1で絵を描く（0＝白 / 1＝黒）" value={art} onChange={setArt} rows={8} hint="改行で行を分ける" />
          <div className="dot-art">
            {artRows.map((row, y) => (
              <div key={y}>
                {row.split("").map((cell, x) => (
                  <i key={x} style={{ background: cell === "1" ? "#111111" : "#ffffff" }} />
                ))}
              </div>
            ))}
          </div>
          <Steps
            items={[
              { label: "総画素数", value: `${artFlat.length} 画素`, note: "1画素 1bit" },
              { label: "圧縮前", value: `${artFlat.length} bit` },
              { label: "連続のかたまり", value: `${artRun.runs.length} 個`, note: `最大 ${artRun.maxCount} 連続 → ${artRun.countBits} bit` },
              { label: "圧縮後", value: `${artRun.afterCountOnly} bit` }
            ]}
          />
          <Results
            items={[
              { label: "圧縮率", value: `${fmt(compressionRate(artRun.afterCountOnly, artFlat.length), 1)} %`, warn: artRun.afterCountOnly >= artFlat.length },
              { label: "個数の並び", value: <span className="mono">{artRun.runs.map((r) => r.count).join(", ")}</span> },
              { label: "縮んだか", value: artRun.afterCountOnly < artFlat.length ? "縮んだ" : "増えてしまった", warn: artRun.afterCountOnly >= artFlat.length }
            ]}
          />
          <Hint>
            大きなかたまりのある絵ほどよく縮みます。市松模様のように1マスおきに色が変わる絵を描くと、逆にデータ量が増えます。
          </Hint>
        </>
      )}

      {card(
        4,
        "ハフマン符号化で文字列を圧縮する",
        "よく出る文字ほど短い符号になります。文字の偏りを変えて試しましょう。",
        <>
          <TextField label="文字列を入力" value={huffText} onChange={setHuffText} mono hint="同じ文字を増やすと、より縮みます" />
          {huff ? (
            <>
              <DataTable
                head={["文字", "出現回数", "割り当てられた符号", "ビット数", "合計"]}
                rows={huff.table.map((r) => [
                  r.char,
                  `${r.count} 回`,
                  <span key={r.char} className="mono">{r.code}</span>,
                  `${r.bits} bit`,
                  `${r.total} bit`
                ])}
              />
              <Steps
                items={[
                  { label: "文字の種類", value: `${huff.kinds} 種類`, note: `同じ長さなら1文字 ${huff.fixedBits} bit` },
                  { label: "圧縮前", value: `${huff.before} bit` },
                  { label: "圧縮後", value: `${huff.after} bit` }
                ]}
              />
              <Results
                items={[
                  { label: "圧縮率", value: `${fmt(huff.rate, 1)} %`, warn: huff.rate >= 100 },
                  { label: "いちばん短い符号", value: `${Math.min(...huff.table.map((r) => r.bits))} bit`, note: "最も多く出る文字" },
                  { label: "いちばん長い符号", value: `${Math.max(...huff.table.map((r) => r.bits))} bit`, note: "最も少ない文字" }
                ]}
              />
              <Hint>
                すべての文字が同じ回数なら、ハフマン符号化してもほとんど縮みません。出現回数のかたよりが大きいほど効果が出ます。
                JPEGやZIPの内部でも、この考え方が使われています。
              </Hint>
            </>
          ) : (
            <Verdict ok={false}>文字を入力してください。</Verdict>
          )}
        </>
      )}

      {card(
        5,
        "配布する教材データの圧縮方法を決める",
        "資料の種類ごとに、どの圧縮を使うかを決めます。",
        <AreaField
          label="決めた方法と、その根拠"
          value={plan}
          onChange={setPlan}
          placeholder="例：文章のPDFは1文字も変えられないのでZIP（可逆）。行事の写真はJPEG（非可逆・品質80）で約1/10に。説明音声はAAC（非可逆）。いずれも元データは無圧縮で別に保存しておく。"
          rows={5}
        />
      )}
    </>
  );
}

export const digitalLabs: Record<string, (props: LabProps) => ReactNode> = {
  feature: FeatureLab,
  base: BaseLab,
  negative: NegativeLab,
  real: RealLab,
  logic: LogicLab,
  computer: ComputerLab,
  text: TextLab,
  audio: AudioLab,
  image: ImageLab,
  video: VideoLab,
  compress: CompressLab
};
