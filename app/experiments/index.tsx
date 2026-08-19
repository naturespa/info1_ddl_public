"use client";

import type { ReactNode } from "react";
import { digitalLabs, type CardRenderer } from "./digital";
import { dataLabs } from "./data";

const labs: Record<string, (props: { card: CardRenderer }) => ReactNode> = {
  ...digitalLabs,
  ...dataLabs
};

export function Experiments({ lessonId, card }: { lessonId: string; card: CardRenderer }) {
  const Lab = labs[lessonId];
  if (!Lab) return <p className="hint-line">この単元の実験は準備中です。</p>;
  return <div className="experiments">{Lab({ card })}</div>;
}
