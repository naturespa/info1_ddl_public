"use client";

// 実験カードの中で使う共通部品。
// すべての実験は「自分で数値や文字を入力 → その場で結果が変わる」形にそろえる。

import type { ReactNode } from "react";
import { clamp } from "./calc";

/* ---------- 入力部品 ---------- */

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  hint
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {hint && <i className="field-hint">{hint}</i>}
      </span>
      <span className="field-input">
        <input
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : ""}
          step={step}
          min={min}
          max={max}
          onChange={(event) => {
            const next = Number(event.target.value);
            onChange(min !== undefined && max !== undefined ? clamp(next, min, max) : next);
          }}
        />
        {unit && <em>{unit}</em>}
      </span>
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  mono
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {hint && <i className="field-hint">{hint}</i>}
      </span>
      <span className="field-input">
        <input
          className={mono ? "mono" : undefined}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </label>
  );
}

export function AreaField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  rows = 3
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
}) {
  return (
    <label className="field field-wide">
      <span className="field-label">
        {label}
        {hint && <i className="field-hint">{hint}</i>}
      </span>
      <textarea rows={rows} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  hint
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {hint && <i className="field-hint">{hint}</i>}
      </span>
      <span className="field-input">
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

export function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  return (
    <label className="field field-wide">
      <span className="field-label">
        {label}
        <b className="field-value">
          {value.toLocaleString("ja-JP")}
          {unit}
        </b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

export function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button type="button" className={`toggle ${on ? "on" : ""}`} onClick={() => onChange(!on)}>
      <span>{label}</span>
      <b>{on ? 1 : 0}</b>
    </button>
  );
}

export function Tabs({
  value,
  onChange,
  options
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="tabs">
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          className={value === option.value ? "active" : ""}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- 表示部品 ---------- */

export function Row({ children }: { children: ReactNode }) {
  return <div className="input-row">{children}</div>;
}

export function Results({ items }: { items: { label: string; value: ReactNode; note?: string; warn?: boolean }[] }) {
  return (
    <div className="result-cards">
      {items.map((item, index) => (
        <div className={`result-card ${item.warn ? "warn" : ""}`} key={`${item.label}-${index}`}>
          <span>{item.label}</span>
          <b>{item.value}</b>
          {item.note && <small>{item.note}</small>}
        </div>
      ))}
    </div>
  );
}

export function Steps({ items }: { items: { label: string; value: ReactNode; note?: string }[] }) {
  return (
    <div className="calc-steps">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`}>
          <span>{item.label}</span>
          <b>{item.value}</b>
          {item.note && <em>{item.note}</em>}
        </div>
      ))}
    </div>
  );
}

export function Formula({ children }: { children: ReactNode }) {
  return <p className="formula">{children}</p>;
}

export function Verdict({ ok, children }: { ok: boolean; children: ReactNode }) {
  return <div className={`verdict ${ok ? "ok" : "ng"}`}>{children}</div>;
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="hint-line">{children}</p>;
}

export function DataTable({
  head,
  rows,
  highlight
}: {
  head: string[];
  rows: ReactNode[][];
  highlight?: (rowIndex: number) => boolean;
}) {
  return (
    <div className="table-scroll">
      <table className="lab-table">
        <thead>
          <tr>
            {head.map((cell, index) => (
              <th key={`${cell}-${index}`}>{cell}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className={highlight?.(rowIndex) ? "hit" : undefined}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** ビット列を桁の重み付きで並べる。クリックで0/1を反転できる */
export function BitStrip({
  bits,
  onToggle,
  weights = true,
  signed = false
}: {
  bits: string;
  onToggle?: (index: number) => void;
  weights?: boolean;
  signed?: boolean;
}) {
  const width = bits.length;
  return (
    <div className={`bit-strip ${onToggle ? "clickable" : ""}`}>
      {bits.split("").map((bit, index) => {
        const power = width - 1 - index;
        const weight = signed && index === 0 ? -(2 ** power) : 2 ** power;
        return (
          <button
            type="button"
            key={index}
            className={bit === "1" ? "on" : ""}
            disabled={!onToggle}
            onClick={() => onToggle?.(index)}
          >
            <b>{bit}</b>
            {weights && <small>{weight.toLocaleString("ja-JP")}</small>}
          </button>
        );
      })}
    </div>
  );
}

/** 折れ線・棒の簡易グラフ（SVG） */
export function BarChart({
  values,
  labels,
  overlay,
  height = 140,
  unit
}: {
  values: number[];
  labels?: string[];
  overlay?: (number | null)[];
  height?: number;
  unit?: string;
}) {
  if (!values.length) return null;
  const max = Math.max(...values, ...(overlay?.filter((v): v is number => v !== null) ?? []));
  const min = Math.min(0, ...values, ...(overlay?.filter((v): v is number => v !== null) ?? []));
  const span = max - min || 1;
  const width = Math.max(320, values.length * 34);
  const barWidth = width / values.length;
  const y = (value: number) => height - ((value - min) / span) * (height - 18) - 4;
  const points = overlay
    ?.map((value, index) => (value === null ? null : `${index * barWidth + barWidth / 2},${y(value)}`))
    .filter(Boolean)
    .join(" ");
  return (
    <div className="chart-scroll">
      <svg viewBox={`0 0 ${width} ${height + 20}`} className="chart" role="img" aria-label="グラフ">
        {values.map((value, index) => (
          <rect
            key={index}
            x={index * barWidth + barWidth * 0.15}
            y={y(value)}
            width={barWidth * 0.7}
            height={Math.max(1, height - 4 - y(value))}
            rx="3"
          />
        ))}
        {points && <polyline points={points} className="overlay" />}
        {labels?.map((label, index) => (
          <text key={index} x={index * barWidth + barWidth / 2} y={height + 15} textAnchor="middle" className="axis">
            {label}
          </text>
        ))}
      </svg>
      {unit && <small className="chart-unit">単位: {unit}</small>}
    </div>
  );
}

/** 散布図 */
export function Scatter({
  xs,
  ys,
  line
}: {
  xs: number[];
  ys: number[];
  line?: { a: number; b: number } | null;
}) {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;
  const xMin = Math.min(...xs.slice(0, n));
  const xMax = Math.max(...xs.slice(0, n));
  const yMin = Math.min(...ys.slice(0, n));
  const yMax = Math.max(...ys.slice(0, n));
  const px = (x: number) => 30 + ((x - xMin) / (xMax - xMin || 1)) * 250;
  const py = (y: number) => 150 - ((y - yMin) / (yMax - yMin || 1)) * 130;
  return (
    <svg viewBox="0 0 300 170" className="scatter" role="img" aria-label="散布図">
      <line x1="30" y1="20" x2="30" y2="150" className="axis-line" />
      <line x1="30" y1="150" x2="285" y2="150" className="axis-line" />
      {line && (
        <line x1={px(xMin)} y1={py(line.a * xMin + line.b)} x2={px(xMax)} y2={py(line.a * xMax + line.b)} className="fit" />
      )}
      {Array.from({ length: n }, (_, index) => (
        <circle key={index} cx={px(xs[index])} cy={py(ys[index])} r="3.5" />
      ))}
    </svg>
  );
}

/** 箱ひげ図 */
export function BoxPlot({ summary }: { summary: { min: number; q1: number; q2: number; q3: number; max: number; mean: number } }) {
  const { min, q1, q2, q3, max, mean } = summary;
  const span = max - min || 1;
  const pos = (value: number) => 5 + ((value - min) / span) * 90;
  return (
    <div className="boxplot-wrap">
      <svg viewBox="0 0 100 40" className="boxplot" preserveAspectRatio="none" role="img" aria-label="箱ひげ図">
        <line x1={pos(min)} y1="20" x2={pos(max)} y2="20" className="whisker" />
        <line x1={pos(min)} y1="10" x2={pos(min)} y2="30" className="cap" />
        <line x1={pos(max)} y1="10" x2={pos(max)} y2="30" className="cap" />
        <rect x={pos(q1)} y="8" width={Math.max(0.6, pos(q3) - pos(q1))} height="24" className="box" />
        <line x1={pos(q2)} y1="8" x2={pos(q2)} y2="32" className="median" />
        <line x1={pos(mean)} y1="14" x2={pos(mean)} y2="26" className="mean" />
      </svg>
      <div className="boxplot-legend">
        <span>最小 {min}</span>
        <span>Q1 {q1.toFixed(1)}</span>
        <span>中央 {q2.toFixed(1)}</span>
        <span>Q3 {q3.toFixed(1)}</span>
        <span>最大 {max}</span>
      </div>
    </div>
  );
}

/** 正規分布のカーブと、指定した位置の目印 */
export function NormalCurve({ mean, sd, marks }: { mean: number; sd: number; marks: { value: number; label: string }[] }) {
  const from = mean - 4 * sd;
  const to = mean + 4 * sd;
  const points: string[] = [];
  for (let i = 0; i <= 120; i++) {
    const x = from + ((to - from) * i) / 120;
    const density = Math.exp(-((x - mean) ** 2) / (2 * sd ** 2));
    points.push(`${(i / 120) * 300},${130 - density * 105}`);
  }
  const px = (value: number) => ((value - from) / (to - from)) * 300;
  return (
    <svg viewBox="0 0 300 150" className="normal-curve" role="img" aria-label="正規分布">
      <polyline points={points.join(" ")} />
      <line x1="0" y1="130" x2="300" y2="130" className="axis-line" />
      {[-2, -1, 0, 1, 2].map((k) => (
        <line key={k} x1={px(mean + k * sd)} y1="126" x2={px(mean + k * sd)} y2="134" className="axis-line" />
      ))}
      {marks.map((mark) => (
        <g key={mark.label}>
          <line x1={px(mark.value)} y1="20" x2={px(mark.value)} y2="130" className="mark" />
          <text x={Math.min(275, Math.max(20, px(mark.value)))} y="14" textAnchor="middle" className="axis">
            {mark.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
