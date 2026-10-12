"use client";

import * as React from "react";
import { RATING_FIELDS, type ShishenScore } from "@/lib/types";
import { cn } from "@/lib/utils";

const VIEW = 150;
const CENTER = VIEW / 2;
const RADIUS = 36;
const LABEL_RADIUS = 52;
/** 单维满分（数据实际范围为 1~5） */
const MAX = 5;
const RINGS = [1, 2, 3, 4, 5];

function pointAt(index: number, total: number, radius: number): [number, number] {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return [CENTER + Math.cos(angle) * radius, CENTER + Math.sin(angle) * radius];
}

function anchorOf(x: number): "start" | "middle" | "end" {
  const dx = x - CENTER;
  if (dx > 4) return "start";
  if (dx < -4) return "end";
  return "middle";
}

/** 式神六维评分雷达图（纯 SVG，带轴标签，无第三方依赖） */
export function RatingRadar({
  rating,
  className,
}: {
  rating: ShishenScore;
  className?: string;
}) {
  const values = React.useMemo(
    () =>
      RATING_FIELDS.map((f) =>
        Math.min(
          MAX,
          Math.max(
            0,
            Number((rating[f.key as keyof ShishenScore] as number) ?? 0)
          )
        )
      ),
    [rating]
  );
  const n = values.length;

  const polygonOf = (radiusOf: (i: number) => number) =>
    values.map((_, i) => pointAt(i, n, radiusOf(i)).join(",")).join(" ");

  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className={cn("shrink-0", className)}
      role="img"
      aria-label={`六维雷达图：${RATING_FIELDS.map(
        (f, i) => `${f.label}${values[i]}`
      ).join("，")}`}
    >
      {RINGS.map((lv) => (
        <polygon
          key={lv}
          points={polygonOf(() => (RADIUS * lv) / MAX)}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="0.7"
        />
      ))}
      {values.map((_, i) => {
        const [x, y] = pointAt(i, n, RADIUS);
        return (
          <line
            key={i}
            x1={CENTER}
            y1={CENTER}
            x2={x}
            y2={y}
            stroke="hsl(var(--border))"
            strokeWidth="0.7"
          />
        );
      })}
      <polygon
        points={polygonOf((i) => RADIUS * (values[i] / MAX))}
        fill="hsl(var(--primary) / 0.22)"
        stroke="hsl(var(--primary))"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {values.map((v, i) => {
        const [x, y] = pointAt(i, n, RADIUS * (v / MAX));
        return (
          <circle key={i} cx={x} cy={y} r="1.8" fill="hsl(var(--primary))" />
        );
      })}
      {RATING_FIELDS.map((f, i) => {
        const [x, y] = pointAt(i, n, LABEL_RADIUS);
        return (
          <text
            key={String(f.key)}
            x={x}
            y={y}
            textAnchor={anchorOf(x)}
            dominantBaseline="middle"
            fontSize="9"
            fill="hsl(var(--muted-foreground))"
          >
            {f.label}
            <tspan dx="1.5" fontWeight="700" fill="hsl(var(--primary))">
              {values[i] > 0 ? values[i] : "–"}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
