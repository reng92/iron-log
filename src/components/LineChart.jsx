import { useState, useEffect, useRef, useMemo } from "react";

export default function LineChart({ data, color = "#1E90FF", height = 110 }) {
  if (!data || data.length < 2) return (
    <div style={{ textAlign: "center", padding: "16px", color: "var(--mut)", fontSize: 12 }}>Almeno 2 rilevazioni per il grafico</div>
  );
  const W = 300, H = height, PL = 34, PR = 6, PT = 14, PB = 22;
  const iW = W - PL - PR, iH = H - PT - PB;
  const vals = data.map(d => +d.y);
  const mn = Math.min(...vals), mx = Math.max(...vals), rng = mx - mn || 1;
  const px = i => PL + i / (data.length - 1) * iW;
  const py = v => PT + (1 - (v - mn) / rng) * iH;
  const pts = data.map((d, i) => `${px(i)},${py(+d.y)}`).join(" ");
  const step = Math.max(1, Math.ceil(data.length / 6));
  const yTicks = [mn, mn + rng / 2, mx];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block", height }}>
      <polygon points={`${PL},${PT + iH} ${pts} ${px(data.length - 1)},${PT + iH}`} fill={color} opacity=".08" />
      {yTicks.map((v, i) => (
        <line key={i} x1={PL} x2={W - PR} y1={py(v)} y2={py(v)} stroke="var(--bdr)" strokeWidth=".5" />
      ))}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={px(i)} cy={py(+d.y)} r="3" fill={color} />
          {i % step === 0 && <text x={px(i)} y={H - 4} textAnchor="middle" fill="var(--mut)" fontSize="7.5" fontFamily="Barlow,sans-serif">{d.label}</text>}
        </g>
      ))}
      {yTicks.map((v, i) => (
        <text key={i} x={PL - 3} y={py(v) + 3} textAnchor="end" fill="var(--mut)" fontSize="7" fontFamily="Barlow,sans-serif">{Math.round(v * 10) / 10}</text>
      ))}
    </svg>
  );
}
