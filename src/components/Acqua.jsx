import { useState } from "react";
import { fmtIso } from "../utils";
import { cfg, obiettivoAcqua } from "../notifications";

const ACQUA_COL = "#32ADE6";

// Borraccia stilizzata riempita in percentuale (0..1)
function Bottle({ fill = 0, size = 30 }) {
  const id = "b" + Math.random().toString(36).slice(2, 8);
  const h = 44, top = 10, liquid = Math.max(0, Math.min(1, fill)) * (h - top);
  return (
    <svg width={size * 0.6} height={size} viewBox="0 0 26 44" aria-hidden="true">
      <defs><clipPath id={id}><path d="M9 2h8v5l4 4v29a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V11l4-4z" /></clipPath></defs>
      <g clipPath={`url(#${id})`}>
        <rect x="0" y="0" width="26" height="44" fill="var(--bdr)" />
        <rect x="0" y={h - liquid} width="26" height={liquid} fill={ACQUA_COL} />
      </g>
      <path d="M9 2h8v5l4 4v29a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V11l4-4z" fill="none" stroke="var(--dim)" strokeWidth="1.5" />
    </svg>
  );
}

const shiftIso = (iso, d) => { const x = new Date(iso + "T12:00"); x.setDate(x.getDate() + d); return fmtIso(x); };
const fmtL = ml => (ml / 1000).toLocaleString("it-IT", { maximumFractionDigits: 2 }) + " L";

export default function Acqua({ acqua = [], settings, onSaveSettings, onAdd, onUndo, onSetTotal, ctx = {}, pesoKg, compact, onOpenFull }) {
  const oggi = fmtIso();
  const [iso, setIso] = useState(oggi);
  const [showCfg, setShowCfg] = useState(false);
  const [totInput, setTotInput] = useState("");

  const borr = +cfg(settings, "acqua_borraccia") || 750;
  const giorno = acqua.find(a => a.data === iso);
  const bevuti = giorno?.ml || 0;
  const { ml: obiettivo, palestra } = obiettivoAcqua(settings, iso, ctx);
  const perc = Math.min(100, Math.round((bevuti / obiettivo) * 100));
  const nBottiglie = Math.max(1, Math.ceil(obiettivo / borr));
  const raggiunto = bevuti >= obiettivo;

  const quick = [[borr, `+${borr}`, "borraccia"], [Math.round(borr / 2), `+${Math.round(borr / 2)}`, "½ borraccia"], [250, "+250", "bicchiere"]];

  const Buttons = (
    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
      {quick.map(([ml, l, sub]) => (
        <button key={sub} className="btn btn-s" style={{ flex: 1, padding: "8px 4px", flexDirection: "column", gap: 0, lineHeight: 1.1 }} onClick={() => onAdd(iso, ml)}>
          <span style={{ fontSize: 14, fontWeight: 700, color: ACQUA_COL }}>{l}</span>
          <span style={{ fontSize: 10, color: "var(--dim)", fontWeight: 400 }}>{sub}</span>
        </button>
      ))}
      <button className="btn btn-s" style={{ padding: "8px 10px" }} disabled={!giorno?.voci?.length} onClick={() => onUndo(iso)} title="Annulla ultima">↶</button>
    </div>
  );

  const Progress = (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".08em" }}>
          💧 ACQUA {iso === oggi ? "OGGI" : new Date(iso + "T12:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })}{palestra ? " · 🏋️ +extra" : ""}
        </div>
        <div style={{ fontFamily: "var(--fd)", fontSize: 22, color: raggiunto ? "var(--ok)" : ACQUA_COL, letterSpacing: ".05em" }}>
          {bevuti} <span style={{ fontSize: 12, color: "var(--dim)", fontFamily: "inherit", fontWeight: 400 }}>/ {obiettivo} ml</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 6 }}>
        {Array.from({ length: nBottiglie }, (_, i) => <Bottle key={i} fill={(bevuti - i * borr) / borr} />)}
        <div style={{ fontSize: 11, color: "var(--dim)", marginLeft: 4, paddingBottom: 2 }}>
          {raggiunto ? "Obiettivo raggiunto ✓" : `mancano ${obiettivo - bevuti} ml · ${perc}%`}
        </div>
      </div>
    </>
  );

  if (compact) return (
    <div className="card" style={{ marginBottom: 12, padding: "12px 16px" }}>
      <div onClick={onOpenFull} style={{ cursor: onOpenFull ? "pointer" : undefined }}>{Progress}</div>
      {Buttons}
    </div>
  );

  // Storico ultimi 7 giorni
  const giorni = Array.from({ length: 7 }, (_, i) => shiftIso(oggi, i - 6));
  const maxMl = Math.max(obiettivo, ...giorni.map(g => acqua.find(a => a.data === g)?.ml || 0));
  const consigliato = pesoKg ? Math.round((pesoKg * 35) / 50) * 50 : null;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <button className="bico" style={{ lineHeight: 1, fontSize: 18, padding: "4px 12px" }} onClick={() => setIso(shiftIso(iso, -1))}>‹</button>
        <div style={{ fontWeight: 600, fontSize: 14 }}>
          {iso === oggi ? "Oggi" : new Date(iso + "T12:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <button className="bico" style={{ lineHeight: 1, fontSize: 18, padding: "4px 12px", opacity: iso >= oggi ? .3 : 1 }} disabled={iso >= oggi} onClick={() => setIso(shiftIso(iso, 1))}>›</button>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        {Progress}
        {Buttons}
        <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label className="lbl">Imposta totale del giorno (ml)</label>
            <input className="inp" type="number" inputMode="numeric" min="0" step="50" placeholder={String(bevuti || obiettivo)} value={totInput} onChange={e => setTotInput(e.target.value)} />
          </div>
          <button className="btn btn-p" disabled={totInput === ""} onClick={() => { onSetTotal(iso, Math.max(0, Math.round(+totInput))); setTotInput(""); }}>SALVA</button>
        </div>
        {giorno?.voci?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {giorno.voci.map((v, i) => <span key={i} className="tag tag-m">{v.ora} · {v.tot ? "=" : "+"}{v.ml}</span>)}
          </div>
        )}
      </div>

      <div className="st">📊 ULTIMI 7 GIORNI</div>
      <div className="card" style={{ marginBottom: 12, display: "flex", alignItems: "flex-end", gap: 6, height: 130 }}>
        {giorni.map(g => {
          const ml = acqua.find(a => a.data === g)?.ml || 0;
          const ob = obiettivoAcqua(settings, g, ctx).ml;
          return (
            <button key={g} onClick={() => setIso(g)} style={{ flex: 1, background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end", color: "var(--txt)" }}>
              <span style={{ fontSize: 9, color: "var(--dim)" }}>{ml ? fmtL(ml) : ""}</span>
              <div style={{ width: "100%", maxWidth: 28, height: `${Math.max(3, (ml / maxMl) * 80)}px`, background: ml >= ob ? "var(--ok)" : ACQUA_COL, opacity: ml ? 1 : 0.25, borderRadius: 4, outline: g === iso ? "2px solid var(--acc)" : "none", outlineOffset: 2 }} />
              <span style={{ fontSize: 10, color: g === iso ? "var(--acc)" : "var(--dim)", fontWeight: g === iso ? 700 : 400 }}>{new Date(g + "T12:00").toLocaleDateString("it-IT", { weekday: "narrow" })}</span>
            </button>
          );
        })}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="st" style={{ margin: 0 }}>⚙️ OBIETTIVO</div>
          <button className="btn btn-s" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setShowCfg(s => !s)}>{showCfg ? "CHIUDI" : "MODIFICA"}</button>
        </div>
        <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 8 }}>
          {fmtL(+cfg(settings, "acqua_obiettivo"))} al giorno{+cfg(settings, "acqua_extra_palestra") ? ` · +${cfg(settings, "acqua_extra_palestra")} ml nei giorni di palestra` : ""} · borraccia {borr} ml
        </div>
        {showCfg && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[["acqua_obiettivo", "Obiettivo ml"], ["acqua_extra_palestra", "Extra palestra"], ["acqua_borraccia", "Borraccia ml"]].map(([k, l]) => (
                <div key={k}>
                  <label className="lbl">{l}</label>
                  <input className="inp" type="number" inputMode="numeric" min="0" step="50" defaultValue={cfg(settings, k)}
                    onBlur={e => { const v = Math.max(0, Math.round(+e.target.value || 0)); if (v !== +cfg(settings, k)) onSaveSettings({ ...settings, [k]: v }); }} />
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "var(--dim)", marginTop: 10, lineHeight: 1.5 }}>
              Riferimento: ~2 L/giorno da bevande per un adulto (EFSA: 2,5 L totali per l'uomo, di cui ~20% dal cibo).
              {consigliato ? ` Col tuo peso (${pesoKg} kg) la regola dei 35 ml/kg dà ~${consigliato} ml.` : ""} Nei giorni di allenamento aggiungi 0,5–1 L.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
