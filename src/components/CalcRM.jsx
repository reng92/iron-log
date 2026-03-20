import { useState } from "react";
import { epley } from "../utils";

export default function CalcRM() {
  const [kg, setKg] = useState("");
  const [reps, setReps] = useState("");
  const rm = kg && reps && +reps >= 1 ? epley(+kg, +reps) : null;
  const pcts = [100, 95, 90, 85, 80, 75, 70, 65, 60];
  return (
    <>
      <div className="st">CALCOLATORE 1RM (Formula Epley)</div>
      <div className="card">
        <p style={{ fontSize: 13, color: "var(--dim)", marginBottom: 14 }}>Inserisci il peso sollevato e le ripetizioni eseguite per stimare il tuo massimale teorico.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div><label className="lbl">Kg sollevati</label><input className="inp" type="number" min="0" step="0.5" placeholder="80" value={kg} onChange={e => setKg(e.target.value)} /></div>
          <div><label className="lbl">Ripetizioni</label><input className="inp" type="number" min="1" max="30" placeholder="8" value={reps} onChange={e => setReps(e.target.value)} /></div>
        </div>
        {rm && (
          <>
            <div style={{ textAlign: "center", padding: "18px 0", background: "var(--acc2)", borderRadius: 10, marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "var(--acc)", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" }}>Massimale stimato</div>
              <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 58, color: "var(--acc)", letterSpacing: ".05em", lineHeight: 1 }}>{rm} kg</div>
            </div>
            <div className="st">PERCENTUALI DI CARICO</div>
            {pcts.map(p => (
              <div key={p} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--bdr)" }}>
                <div style={{ fontSize: 13, color: "var(--dim)", fontWeight: 600 }}>{p}%</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, color: p === 100 ? "var(--acc)" : "var(--txt)", letterSpacing: ".05em" }}>{Math.round(rm * p / 100 * 2) / 2}</div>
                  <div style={{ fontSize: 11, color: "var(--dim)" }}>kg</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
