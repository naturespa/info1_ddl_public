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
  rippleAdder,
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

const bytesRow = (bytes: number) => {
  const s = byteSteps(bytes);
  return [
    { label: "バイト", value: `${fmt(s.bytes, 0)} B` },
    { label: "キロバイト", value: `${fmt(s.kb, 2)} kB`, note: "÷1,000" },
    { label: "メガバイト", value: `${fmt(s.mb, 3)} MB`, note: "÷1,000²" },
    { label: "ギガバイト", value: `${fmt(s.gb, 4)} GB`, note: "÷1,000³" }
  ];
};

/* ========================================================================
 * D0 デジタル情報の特徴
 * ====================================================================== */
export function FeatureLab({ card }: LabProps) {
  const [analog, setAnalog] = useState(6.37);
  const [levels, setLevels] = useState(8);
  const [generations, setGenerations] = useState(5);
  const [noise, setNoise] = useState(3);
  const [bits, setBits] = useState(8);
  const [size, setSize] = useState(2.5);
  const [unit, setUnit] = useState("GB");
  const [stage, setStage] = useState("digitization");
  const [plan, setPlan] = useState("");

  const step = 10 / (levels - 1);
  const quantized = Math.round(analog / step) * step;
  const analogAfter = analog + (noise / 100) * generations * analog;
  const unitFactor: Record<string, number> = { B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12 };
  const totalBytes = size * unitFactor[unit];
  const stageInfo: Record<string, [string, string]> = {
    digitization: ["デジタイゼーション", "情報の形式をデータに変えるだけ。紙をPDFにする、名簿をExcelにする。"],
    digitalization: ["デジタライゼーション", "手順そのものを作り変える。申請をオンライン化して押印をなくす。"],
    dx: ["DX", "仕組みごと変える。そもそも申請という手続きを不要にする。"]
  };

  return (
    <>
      {card(
        0,
        "アナログの値をデジタルに丸める",
        "連続した値を段階の値に置き換えると、どれだけずれるかを確かめます。",
        <>
          <Row>
            <NumberField label="測定した値（アナログ）" value={analog} onChange={setAnalog} step={0.01} min={0} max={10} unit="V" />
            <NumberField label="量子化の段階数" value={levels} onChange={setLevels} min={2} max={256} hint="2のn乗にすると扱いやすい" />
          </Row>
          <Formula>1段階の幅 ＝ 測定範囲 10 ÷ (段階数 − 1)</Formula>
          <Results
            items={[
              { label: "1段階の幅", value: `${fmt(step, 4)} V` },
              { label: "デジタル化した値", value: `${fmt(quantized, 4)} V` },
              { label: "量子化誤差", value: `${fmt(Math.abs(analog - quantized), 4)} V`, warn: Math.abs(analog - quantized) > step / 4 },
              { label: "必要なビット数", value: `${Math.ceil(Math.log2(levels))} bit` }
            ]}
          />
          <Hint>段階数を増やすほど誤差は小さくなりますが、1つの値を記録するのに必要なビット数が増えます。</Hint>
        </>
      )}

      {card(
        1,
        "コピーを重ねたときの劣化",
        "アナログは複製のたびに劣化し、デジタルは劣化しないことを比べます。",
        <>
          <Row>
            <NumberField label="複製の世代数" value={generations} onChange={setGenerations} min={0} max={50} unit="回" />
            <NumberField label="1回あたりのノイズ" value={noise} onChange={setNoise} min={0} max={30} unit="%" />
          </Row>
          <Results
            items={[
              { label: "アナログ（元の値）", value: fmt(analog, 3) },
              { label: `アナログ（${generations}世代後）`, value: fmt(analogAfter, 3), warn: generations > 0 },
              { label: "デジタル（元の値）", value: fmt(quantized, 3) },
              { label: `デジタル（${generations}世代後）`, value: fmt(quantized, 3), note: "0/1の判定さえ誤らなければ不変" }
            ]}
          />
          <Hint>デジタルは「どちらの段階に近いか」だけを判定するので、小さなノイズは復元の途中で消えます。</Hint>
        </>
      )}

      {card(
        2,
        "ビットが1つ増えると何倍になるか",
        "ビット数と、表せる組合せの数の関係を確かめます。",
        <>
          <SliderField label="ビット数" value={bits} onChange={setBits} min={1} max={64} unit=" bit" />
          <Formula>組合せの数 ＝ 2 の {bits} 乗</Formula>
          <Results
            items={[
              { label: "表せる組合せ", value: (2n ** BigInt(bits)).toLocaleString("ja-JP") },
              { label: "1ビット減らすと", value: (2n ** BigInt(Math.max(1, bits - 1))).toLocaleString("ja-JP"), note: "ちょうど半分" },
              { label: "バイト換算", value: `${fmt(bits / 8, 2)} B` },
              { label: "16進数のけた数", value: `${Math.ceil(bits / 4)} けた`, note: "2進4けた＝16進1けた" }
            ]}
          />
        </>
      )}

      {card(
        3,
        "情報量の単位を換算する",
        "1,000倍で数える単位と、1,024倍で数える単位の違いを確かめます。",
        <>
          <Row>
            <NumberField label="容量" value={size} onChange={setSize} step={0.1} min={0} />
            <SelectField
              label="単位"
              value={unit}
              onChange={setUnit}
              options={["B", "KB", "MB", "GB", "TB"].map((value) => ({ value, label: value }))}
            />
          </Row>
          <Results
            items={[
              { label: "バイト", value: fmt(totalBytes, 0) },
              { label: "1,000進（GB）", value: fmt(totalBytes / 1e9, 3) },
              { label: "1,024進（GiB）", value: fmt(totalBytes / 1024 ** 3, 3), note: "本来の2進の単位" },
              { label: "差", value: `${fmt((1 - 1e9 / 1024 ** 3) * 100, 1)} %`, note: "カタログ容量が小さく見える理由" }
            ]}
          />
          <Hint>1KB＝1,000B と 1KiB＝1,024B は別のものです。問題文でどちらを使うか必ず確認します。</Hint>
        </>
      )}

      {card(
        4,
        "デジタル化の3段階に分類する",
        "身近な事例が、形式だけの変換か、手順の変更か、仕組みの作り変えかを判断します。",
        <>
          <SelectField
            label="どの段階か"
            value={stage}
            onChange={setStage}
            options={[
              { value: "digitization", label: "デジタイゼーション（形式の変換）" },
              { value: "digitalization", label: "デジタライゼーション（手順の変更）" },
              { value: "dx", label: "DX（仕組みの作り変え）" }
            ]}
          />
          <Results items={[{ label: stageInfo[stage][0], value: stageInfo[stage][1] }]} />
          <AreaField
            label="選んだ事例と、次の段階に進めるなら何を変えるか"
            value={plan}
            onChange={setPlan}
            placeholder="例：出席確認は今アプリ入力（デジタイゼーション）。入力の代わりに入室時のICカードで自動記録すれば手順が変わる。"
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
            <NumberField label="10進数を入力" value={decimal} onChange={(v) => { setDecimal(clamp(v, 0, 255)); setBitInput(padBits(clamp(v, 0, 255).toString(2), 8)); }} min={0} max={255} />
            <TextField label="2進数を直接入力" value={bitInput} onChange={(v) => { setBitInput(v); const parsed = parseInt(parseBits(v) || "0", 2); setDecimal(parsed); }} mono hint="0と1だけ・8けた" />
          </Row>
          <BitStrip bits={bits} onToggle={toggleBit} />
          <Results
            items={[
              { label: "2進数", value: bits },
              { label: "10進数", value: bitValue },
              { label: "16進数", value: bitValue.toString(16).toUpperCase().padStart(2, "0") },
              { label: "8進数", value: bitValue.toString(8) }
            ]}
          />
          <Hint>ビットのボタンを押すと0と1が入れかわります。1が立っているけたの重みを足すと10進数になります。</Hint>
        </>
      )}

      {card(
        1,
        "2進数4けたを16進数1けたにまとめる",
        "16進数を入力して、4けた区切りの対応を確かめます。",
        <>
          <TextField label="16進数を入力" value={hexInput} onChange={setHexInput} mono hint="0〜9とA〜F" />
          {hexValue === null ? (
            <Verdict ok={false}>16進数として読めません。0〜9とA〜Fだけで入力してください。</Verdict>
          ) : (
            <>
              <Steps
                items={[
                  { label: "16進数", value: hexInput.toUpperCase() },
                  { label: "1けたずつ2進4けたに", value: hexInput.toUpperCase().replace(/[^0-9A-Fa-f]/g, "").split("").map((c) => parseInt(c, 16).toString(2).padStart(4, "0")).join(" ") },
                  { label: "10進数", value: fmt(hexValue, 4) }
                ]}
              />
              <Hint>2進数4けたは0000〜1111の16通り。16進数1けたとちょうど同じ数なので、機械的に置き換えられます。</Hint>
            </>
          )}
        </>
      )}

      {card(
        2,
        "小数を2進数にする",
        "10進の小数を2進数に直し、有限けたで表せるかを確かめます。",
        <>
          <NumberField label="10進の小数を入力" value={fraction} onChange={setFraction} step={0.05} min={0} max={100} hint="0.1 や 0.375 を試そう" />
          <Results
            items={[
              { label: "2進数（20けたまで）", value: <span className="mono">{fracBinary}</span> },
              { label: "戻した値", value: fmt(fracBack, 12) },
              { label: "誤差", value: fmt(Math.abs(fraction - fracBack), 12), warn: Math.abs(fraction - fracBack) > 1e-9 },
              { label: "有限けたで表せるか", value: Math.abs(fraction - fracBack) < 1e-12 ? "表せる" : "表せない（循環する）" }
            ]}
          />
          <Hint>0.5、0.25、0.375 は表せますが、0.1 や 0.3 は循環して表しきれません。ここが誤差の出発点です。</Hint>
        </>
      )}

      {card(
        3,
        "2進数の筆算で足す",
        "8けたの2進数を2つ入力し、けたごとの繰り上がりを追います。",
        <>
          <Row>
            <TextField label="元の値" value={addA} onChange={setAddA} mono />
            <TextField label="加える値" value={addB} onChange={setAddB} mono />
          </Row>
          <div className="calc-sheet">
            <div><span>繰り上がり</span><b className="mono">{add.carries}</b></div>
            <div><span>元の値</span><b className="mono">{add.a}</b></div>
            <div><span>加える値</span><b className="mono">{add.b}</b></div>
            <div className="sum"><span>結果</span><b className="mono">{add.sum}</b></div>
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
        4,
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
        5,
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
        6,
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
        7,
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
  const [minuend, setMinuend] = useState(433);
  const [subtrahend, setSubtrahend] = useState(114);
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
        "10進数の補数で引き算する",
        "引く数を補数に置きかえて、足し算とけた捨てで答えが出ることを確かめます。",
        <>
          <Row>
            <NumberField label="引かれる数" value={minuend} onChange={setMinuend} min={0} max={99999} />
            <NumberField label="引く数" value={subtrahend} onChange={setSubtrahend} min={0} max={99999} />
          </Row>
          <Steps
            items={[
              { label: `${subtrahend} の ${10 ** digits} の補数`, value: fmt(complement, 0) },
              { label: "足し算する", value: `${minuend} + ${complement} = ${fmt(added, 0)}` },
              { label: `${10 ** digits} のけたを捨てる`, value: fmt(dropped, 0) },
              { label: "ふつうに引くと", value: fmt(minuend - subtrahend, 0) }
            ]}
          />
          <Verdict ok={dropped === minuend - subtrahend}>
            {dropped === minuend - subtrahend ? "一致しました。引き算が足し算に置きかわっています。" : "けた数の指定を見直してください。"}
          </Verdict>
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
            <NumberField label="10進数（負でも可）" value={target} onChange={setTarget} min={-100000} max={100000} />
            <SelectField label="ビット幅" value={String(width)} onChange={(v) => setWidth(Number(v))} options={[4, 8, 16, 32].map((n) => ({ value: String(n), label: `${n} bit` }))} />
          </Row>
          {signedBits ? (
            <>
              <BitStrip bits={signedBits.length > 16 ? signedBits.slice(-16) : signedBits} signed weights={width <= 16} />
              <Results
                items={[
                  { label: "2の補数表現", value: <span className="mono">{signedBits}</span> },
                  { label: "符号ビット", value: signedBits[0] === "1" ? "1（負）" : "0（正）" },
                  { label: "16進数", value: parseInt(signedBits, 2).toString(16).toUpperCase() }
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
  const [value, setValue] = useState(-10.25);
  const [floatA, setFloatA] = useState(0.1);
  const [floatB, setFloatB] = useState(0.2);
  const [amounts, setAmounts] = useState("120.8, 80.1, 35.1");
  const [decision, setDecision] = useState("");

  const normalized = normalizeBinary(value);
  const float32 = toFloat32(value);
  const sum = floatA + floatB;
  const expected = Math.round(sum * 1e10) / 1e10;
  const values = parseNumbers(amounts);
  const naive = values.reduce((a, b) => a + b, 0);
  const integerSum = values.reduce((a, b) => a + Math.round(b * 10), 0) / 10;

  return (
    <>
      {card(
        0,
        "10進数を2進数に直す",
        "小数点より右のけたが 1/2, 1/4, 1/8 …になることを確かめます。",
        <>
          <NumberField label="10進数（小数可・負も可）" value={value} onChange={setValue} step={0.25} />
          <Results
            items={[
              { label: "2進数", value: <span className="mono">{toBase(value, 2, 16)}</span> },
              { label: "16進数", value: <span className="mono">{toBase(value, 16, 8)}</span> },
              { label: "整数部", value: Math.trunc(Math.abs(value)) },
              { label: "小数部", value: fmt(Math.abs(value) - Math.trunc(Math.abs(value)), 6) }
            ]}
          />
        </>
      )}

      {card(
        1,
        "正規化して 1.xxx × 2ⁿ の形にする",
        "小数点を動かして、仮数の先頭を1にそろえます。",
        <>
          <Steps
            items={[
              { label: "2進数", value: <span className="mono">{normalized.binary}</span> },
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
        2,
        "32ビットの浮動小数点に分解する",
        "符号部1・指数部8・仮数部23 に並べ、格納された値と元の値の差を見ます。",
        <>
          <div className="float-bits">
            <div className="sign"><small>符号部 1bit</small><b className="mono">{float32.sign}</b></div>
            <div className="exponent"><small>指数部 8bit</small><b className="mono">{float32.exponent}</b></div>
            <div className="mantissa"><small>仮数部 23bit</small><b className="mono">{float32.mantissa}</b></div>
          </div>
          <Results
            items={[
              { label: "指数部の格納値", value: float32.exponentValue, note: "実際の指数＋127" },
              { label: "実際の指数", value: float32.realExponent },
              { label: "格納された値", value: fmt(float32.stored, 10) },
              { label: "元の値との差", value: fmt(float32.error, 12), warn: float32.error !== 0 }
            ]}
          />
          <Hint>指数部にはバイアス127を足した値が入ります。指数3なら 3 + 127 = 130 を2進数で格納します。</Hint>
        </>
      )}

      {card(
        3,
        "0.1 + 0.2 の誤差を見る",
        "2つの小数を入力して、期待した値とずれるかを確かめます。",
        <>
          <Row>
            <NumberField label="小数A" value={floatA} onChange={setFloatA} step={0.05} />
            <NumberField label="小数B" value={floatB} onChange={setFloatB} step={0.05} />
          </Row>
          <div className="code-block">
            <code>
              {floatA} + {floatB} = {sum}
            </code>
          </div>
          <Results
            items={[
              { label: "期待した値", value: expected },
              { label: "実際の値", value: String(sum) },
              { label: "ぴったり一致するか", value: sum === expected ? "一致" : "一致しない", warn: sum !== expected },
              { label: "100倍して整数化", value: (Math.round(floatA * 100) + Math.round(floatB * 100)) / 100 }
            ]}
          />
        </>
      )}

      {card(
        4,
        "整数化して誤差を避ける",
        "金額を小数のまま足す場合と、最小単位の整数で足す場合を比べます。",
        <>
          <TextField label="金額を並べて入力" value={amounts} onChange={setAmounts} hint="カンマまたはスペース区切り" />
          <Results
            items={[
              { label: "そのまま合計", value: String(naive) },
              { label: "10倍の整数で合計", value: String(integerSum) },
              { label: "差", value: Math.abs(naive - integerSum).toExponential(2), warn: naive !== integerSum },
              { label: "件数", value: `${values.length} 件` }
            ]}
          />
          <Hint>件数を増やすほど誤差は積み上がります。金額は円単位の整数で保持し、表示のときだけ小数に戻すのが定石です。</Hint>
        </>
      )}

      {card(
        5,
        "購買部の会計プログラムを安全にする",
        "計算した誤差を根拠に、どちらの方式を採用するかを決めます。",
        <AreaField
          label="採用する方式と、その根拠"
          value={decision}
          onChange={setDecision}
          placeholder="例：小数のまま合計すると3件で約1.4×10⁻¹⁴の誤差が出た。1日1,000件では表示に影響しうるため、円単位の整数で保持する方式を採用する。"
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
  const [device, setDevice] = useState("キーボード");
  const [step, setStep] = useState(0);
  const [clock, setClock] = useState(3);
  const [cpi, setCpi] = useState(4);
  const [hitRate, setHitRate] = useState(90);
  const [cacheNs, setCacheNs] = useState(2);
  const [mainNs, setMainNs] = useState(60);
  const [task, setTask] = useState("動画編集");
  const [budget, setBudget] = useState(15);
  const [spec, setSpec] = useState("");

  const deviceMap: Record<string, [string, string]> = {
    キーボード: ["入力装置", "人の操作をデータとしてコンピュータへ渡します。"],
    ディスプレイ: ["出力装置", "処理した結果を人が読める形で表示します。"],
    メモリ: ["記憶装置（主記憶）", "実行中の命令とデータを一時的に置きます。電源を切ると消えます。"],
    SSD: ["記憶装置（補助記憶）", "電源を切っても残る保存場所です。"],
    ALU: ["演算装置", "四則演算や比較などの計算を行います。"],
    制御装置: ["制御装置", "他の4つの装置に指示を出し、全体の動きを調整します。"],
    ルータ: ["五大装置ではない", "通信装置は五大装置に含まれません。入力・出力・記憶・演算・制御の5つです。"]
  };
  const cycle = [
    ["取出し（フェッチ）", "プログラムカウンタが指す番地から、命令を命令レジスタへ読み込みます。"],
    ["解読（デコード）", "デコーダが命令の種類と、必要なデータの場所を判断します。"],
    ["実行（エグゼキュート）", "演算装置が計算し、結果をレジスタや主記憶へ書き戻します。"],
    ["次へ", "プログラムカウンタが次の命令の番地を指し、また取出しに戻ります。"]
  ];
  const mips = toMips(clock, cpi);
  const effective = effectiveAccess(hitRate / 100, cacheNs, mainNs);
  const advice =
    task === "動画編集"
      ? budget >= 16
        ? "RAM 32GB以上とGPUを優先。書き出し時間が最も短縮されます。"
        : "予算不足。解像度を下げるか、書き出し時間を許容する必要があります。"
      : task === "AI推論"
        ? budget >= 20
          ? "GPU/NPU搭載機を優先。並列計算が効きます。"
          : "クラウドのGPUを時間貸しで使うほうが安く済みます。"
        : budget >= 8
          ? "CPUとSSDを重視すれば十分です。RAMは16GBあれば快適です。"
          : "中古機や校内端末の利用も検討しましょう。";

  return (
    <>
      {card(
        0,
        "五大装置に分類する",
        "装置を選んで、入力・出力・記憶・演算・制御のどれかを確かめます。",
        <>
          <SelectField label="装置を選ぶ" value={device} onChange={setDevice} options={Object.keys(deviceMap).map((value) => ({ value, label: value }))} />
          <Results items={[{ label: deviceMap[device][0], value: deviceMap[device][1], warn: deviceMap[device][0] === "五大装置ではない" }]} />
          <div className="five-units">
            {["入力装置", "出力装置", "記憶装置", "演算装置", "制御装置"].map((name) => (
              <span key={name} className={deviceMap[device][0].startsWith(name.slice(0, 2)) ? "active" : ""}>
                {name}
              </span>
            ))}
          </div>
        </>
      )}

      {card(
        1,
        "命令サイクルをたどる",
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
        </>
      )}

      {card(
        2,
        "クロック周波数から性能を計算する",
        "1秒間に何百万回の命令を実行できるかを求めます。",
        <>
          <Row>
            <NumberField label="クロック周波数" value={clock} onChange={setClock} step={0.1} min={0.1} max={6} unit="GHz" />
            <NumberField label="CPI（1命令あたりのクロック数）" value={cpi} onChange={setCpi} step={0.1} min={0.5} max={20} />
          </Row>
          <Formula>MIPS ＝ クロック周波数(MHz) ÷ CPI</Formula>
          <Results
            items={[
              { label: "性能", value: `${fmt(mips, 0)} MIPS` },
              { label: "1命令の実行時間", value: `${fmt(instructionTimeNs(clock, cpi), 3)} ns` },
              { label: "1秒間の命令数", value: `${fmt(mips * 1e6, 0)} 回` },
              { label: "クロックを2倍にすると", value: `${fmt(toMips(clock * 2, cpi), 0)} MIPS` }
            ]}
          />
        </>
      )}

      {card(
        3,
        "キャッシュのヒット率と実効速度",
        "ヒット率を変えて、平均のアクセス時間がどう変わるかを見ます。",
        <>
          <SliderField label="キャッシュのヒット率" value={hitRate} onChange={setHitRate} min={0} max={100} unit=" %" />
          <Row>
            <NumberField label="キャッシュのアクセス時間" value={cacheNs} onChange={setCacheNs} step={0.5} min={0.5} max={20} unit="ns" />
            <NumberField label="主記憶のアクセス時間" value={mainNs} onChange={setMainNs} step={5} min={10} max={300} unit="ns" />
          </Row>
          <Formula>実効アクセス時間 ＝ ヒット率 × キャッシュ + (1 − ヒット率) × 主記憶</Formula>
          <Results
            items={[
              { label: "実効アクセス時間", value: `${fmt(effective, 2)} ns` },
              { label: "キャッシュなしと比べて", value: `${fmt(mainNs / effective, 2)} 倍速い` },
              { label: "ヒット率を+5%すると", value: `${fmt(effectiveAccess(Math.min(1, hitRate / 100 + 0.05), cacheNs, mainNs), 2)} ns` }
            ]}
          />
          <Hint>ヒット率が90%から95%に上がるだけで、実効時間は大きく縮みます。だからCPUはキャッシュに大きな面積を割いています。</Hint>
        </>
      )}

      {card(
        4,
        "用途と予算から構成を決める",
        "作業内容によって、優先すべき部品が変わることを確かめます。",
        <>
          <Row>
            <SelectField label="主な用途" value={task} onChange={setTask} options={["文書作成", "動画編集", "AI推論"].map((value) => ({ value, label: value }))} />
            <NumberField label="予算の目安" value={budget} onChange={setBudget} min={4} max={60} unit="万円" />
          </Row>
          <Results items={[{ label: "推奨する構成", value: advice }]} />
        </>
      )}

      {card(
        5,
        "用途別にPCを選定する",
        "文書作成用と動画編集用のPCを、根拠つきで提案します。",
        <AreaField
          label="2台の構成と、優先順位の理由"
          value={spec}
          onChange={setSpec}
          placeholder="例：文書作成用はCPUを中位に抑えSSDを512GBに。動画編集用はRAM32GBとGPUを優先。書き出しはGPU依存が大きく、RAM不足だと4K素材でスワップが発生するため。"
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
              { label: "10進数", value: info.dec },
              { label: "16進数", value: info.hex },
              { label: "2進数", value: <span className="mono">{info.bin}</span> }
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
              { label: "1kB＝1,000B なら", value: `${fmt(totalBytes / 1000, 3)} kB` },
              { label: "1KiB＝1,024B なら", value: `${fmt(totalBytes / 1024, 3)} KiB` }
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
              { label: "1分あたり", value: `${fmt(audioBytes(pRate, pBits, pCh, 60) / 1e6, 2)} MB`, note: pNote }
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
              { label: "2進数（Rのみ）", value: <span className="mono">{r.toString(2).padStart(8, "0")}</span> },
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
          <Hint>縦横をそれぞれ2倍にすると、画素数は4倍。データ量も4倍になります。</Hint>
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
              { label: "1フレーム", value: `${fmt(imageBytes(width, height, colorBits) / 1e6, 2)} MB` },
              { label: "1秒間", value: `${fmt((imageBytes(width, height, colorBits) * fps) / 1e6, 1)} MB` },
              { label: `${minutes}分間`, value: `${fmt(raw / 1e9, 2)} GB` }
            ]}
          />
          <Results items={bytesRow(raw)} />
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
              { label: "非圧縮", value: `${fmt(raw / 1e9, 2)} GB` },
              { label: "圧縮後", value: `${fmt(compressed / 1e9, 3)} GB` },
              { label: "圧縮率", value: `${fmt(100 / ratio, 1)} 分の1` },
              { label: "1分あたり", value: `${fmt(compressed / minutes / 1e6, 1)} MB` }
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
              { label: "圧縮後の容量", value: `${fmt(compressed / 1e6, 1)} MB` },
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
  video: VideoLab
};
