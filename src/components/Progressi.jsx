// Card e schermate "progressi" senza AI: streak, avvisi di stallo, confronto foto, cambio password obbligatorio
import { useState, useMemo } from "react";
import { sb } from "../db";
import { calcolaStreak, avvisiStallo } from "../insights";
import { fmtDate } from "../utils";
import { IcClose } from "./Icons";

export function StreakCard({ sessioni, logDieta, obiettivo = 3 }) {
  const s = useMemo(() => calcolaStreak({ sessioni, logDieta }), [sessioni, logDieta]);
  if (!sessioni.length && !logDieta.length) return null;
  const pct = Math.min(100, Math.round((s.settimana / obiettivo) * 100));
  return (
    <div className="card" style={{ display: "flex", gap: 14, alignItems: "center" }}>
      <div style={{ textAlign: "center", minWidth: 64 }}>
        <div className="wt" style={{ fontSize: 34, lineHeight: 1, color: s.corrente ? "var(--warn)" : "var(--mut)" }}>🔥{s.corrente}</div>
        <div style={{ fontSize: 11, color: "var(--dim)", fontWeight: 700 }}>{s.corrente === 1 ? "giorno" : "giorni"} di fila</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
          Allenamenti questa settimana: {s.settimana}/{obiettivo}{s.settimana >= obiettivo ? " ✓" : ""}
        </div>
        <div style={{ height: 8, background: "var(--bdr)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: s.settimana >= obiettivo ? "var(--ok)" : "var(--acc)", transition: "width .4s" }} />
        </div>
        <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 6 }}>
          {s.oggiFatto ? "Oggi fatto! " : s.corrente ? "Allenati o compila il diario per non perdere la serie. " : ""}Record: {s.migliore} giorni
        </div>
      </div>
    </div>
  );
}

export function AvvisiCard({ peso, sessioni, logDieta }) {
  const avvisi = useMemo(() => avvisiStallo({ peso, sessioni, logDieta }), [peso, sessioni, logDieta]);
  const [chiusi, setChiusi] = useState(() => { try { return JSON.parse(sessionStorage.getItem("avvisi_chiusi") || "[]"); } catch { return []; } });
  const visibili = avvisi.filter(a => !chiusi.includes(a.testo));
  if (!visibili.length) return null;
  const chiudi = t => { const n = [...chiusi, t]; setChiusi(n); try { sessionStorage.setItem("avvisi_chiusi", JSON.stringify(n)); } catch { /* ok */ } };
  return (
    <div className="card">
      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>Da tenere d'occhio</div>
      {visibili.map(a => (
        <div key={a.testo} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderTop: "1px solid var(--bdr)" }}>
          <span style={{ fontSize: 16 }}>{a.livello === "warn" ? "⚠️" : "📉"}</span>
          <span style={{ flex: 1, fontSize: 13, lineHeight: 1.4 }}>{a.testo}</span>
          <button className="bico" style={{ width: 28, height: 28, minHeight: 28 }} onClick={() => chiudi(a.testo)} aria-label="Nascondi avviso"><IcClose size={14} /></button>
        </div>
      ))}
    </div>
  );
}

// Tutte le foto di progresso con la loro data: dalle pesate (fronte/retro) e dalle visite del nutrizionista (fronte/lato/retro)
export const scattiDa = (peso = [], misure = []) => [
  ...peso.filter(p => p.foto_fronte || p.foto_retro).map(p => ({
    id: `p_${p.id}`, data: p.data, origine: "Pesata", valore: p.valore != null ? +p.valore : null,
    foto_fronte: p.foto_fronte, foto_lato: null, foto_retro: p.foto_retro,
  })),
  ...misure.filter(m => m.foto_fronte || m.foto_lato || m.foto_retro).map(m => ({
    id: `m_${m.id}`, data: m.data, origine: m.visita_label || "Visita nutrizionista", valore: m.peso != null ? +m.peso : null,
    foto_fronte: m.foto_fronte, foto_lato: m.foto_lato, foto_retro: m.foto_retro,
  })),
].filter(s => s.data).sort((a, b) => a.data.localeCompare(b.data));

const dataBreve = d => new Date(d + (String(d).length === 10 ? "T12:00:00" : "")).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });

// Foto con la data stampata sopra (in basso a sinistra)
export function FotoConData({ src, data, etichetta, onClick, style }) {
  return (
    <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", background: "var(--sur)", cursor: onClick ? "pointer" : "default", ...style }} onClick={onClick}>
      <img src={src} alt={`${etichetta || "Foto"} del ${dataBreve(data)}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      <span style={{ position: "absolute", left: 6, bottom: 6, background: "rgba(0,0,0,.65)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>
        {dataBreve(data)}{etichetta ? ` · ${etichetta}` : ""}
      </span>
    </div>
  );
}

const LATI = [["foto_fronte", "Fronte"], ["foto_lato", "Lato"], ["foto_retro", "Retro"]];

// Confronto prima/dopo tra due date con foto (slider a tendina) + galleria cronologica
export function ConfrontoFoto({ scatti: tutti, onClose }) {
  const conFoto = tutti;
  const [aId, setAId] = useState(conFoto[0]?.id);
  const [bId, setBId] = useState(conFoto[conFoto.length - 1]?.id);
  const [lato, setLato] = useState("foto_fronte");
  const [pos, setPos] = useState(50);
  const a = conFoto.find(p => p.id === aId), b = conFoto.find(p => p.id === bId);
  const imgA = a?.[lato], imgB = b?.[lato];
  const delta = a?.valore != null && b?.valore != null ? +(b.valore - a.valore).toFixed(1) : null;
  const latiDisponibili = LATI.filter(([k]) => conFoto.some(s => s[k]));

  return (
    <div className="mov" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mod">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div className="wt">Prima e dopo</div>
          <button className="bico" onClick={onClose} aria-label="Chiudi"><IcClose /></button>
        </div>
        {conFoto.length < 2 ? (
          <div style={{ fontSize: 14, color: "var(--dim)" }}>Servono foto in almeno 2 date diverse. Aggiungile a una pesata o a una visita del nutrizionista.</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              {[["Prima", aId, setAId], ["Dopo", bId, setBId]].map(([l, v, set]) => (
                <div key={l}><label className="lbl">{l}</label>
                  <select className="inp" value={v} onChange={e => set(e.target.value)}>
                    {conFoto.map(p => <option key={p.id} value={p.id}>{fmtDate(p.data)}{p.valore != null ? ` · ${p.valore} kg` : ""} · {p.origine}</option>)}
                  </select></div>
              ))}
            </div>
            <div className="stab-row" style={{ marginBottom: 10 }}>
              {latiDisponibili.map(([k, l]) => <button key={k} className={`stab${lato === k ? " on" : ""}`} onClick={() => setLato(k)}>{l}</button>)}
            </div>
            {imgA && imgB ? (
              <div style={{ position: "relative", width: "100%", aspectRatio: "3/4", borderRadius: 10, overflow: "hidden", background: "var(--sur)" }}>
                <img src={imgB} alt="Dopo" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                <img src={imgA} alt="Prima" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
                <div style={{ position: "absolute", top: 0, bottom: 0, left: `${pos}%`, width: 2, background: "#fff", boxShadow: "0 0 6px rgba(0,0,0,.6)" }} />
                <span className="tag" style={{ position: "absolute", left: 8, top: 8, background: "rgba(0,0,0,.65)", color: "#fff" }}>Prima · {dataBreve(a.data)}</span>
                <span className="tag" style={{ position: "absolute", right: 8, top: 8, background: "rgba(0,0,0,.65)", color: "#fff" }}>Dopo · {dataBreve(b.data)}</span>
              </div>
            ) : <div style={{ fontSize: 13, color: "var(--dim)" }}>Una delle due date non ha la foto "{LATI.find(([k]) => k === lato)?.[1]}".</div>}
            <input type="range" min="0" max="100" value={pos} onChange={e => setPos(+e.target.value)} style={{ width: "100%", marginTop: 10 }} aria-label="Scorri prima/dopo" />
            {a && b && <div style={{ textAlign: "center", fontSize: 14, fontWeight: 700, marginTop: 4 }}>
              {delta != null ? `${delta > 0 ? "+" : ""}${delta} kg in ` : ""}{Math.round((new Date(b.data) - new Date(a.data)) / 864e5)} giorni
            </div>}
          </>
        )}
        {conFoto.length > 0 && (
          <>
            <div className="st">Tutte le foto ({conFoto.length} date)</div>
            {[...conFoto].reverse().map(s => (
              <div key={s.id} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{fmtDate(s.data)} · {s.origine}{s.valore != null ? ` · ${s.valore} kg` : ""}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                  {LATI.filter(([k]) => s[k]).map(([k, l]) => <FotoConData key={k} src={s[k]} data={s.data} etichetta={l} style={{ aspectRatio: "3/4" }} />)}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// Primo accesso di un account creato dal PT: scelta della password personale
export function CambioPassword({ onDone, onLogout }) {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const salva = async () => {
    setErr("");
    if (p1.length < 8 || !/[a-zA-Z]/.test(p1) || !/\d/.test(p1)) return setErr("Almeno 8 caratteri, con lettere e numeri");
    if (p1 !== p2) return setErr("Le due password non coincidono");
    setBusy(true);
    const { data, error } = await sb.auth.updateUser({ password: p1, data: { deve_cambiare_password: false } });
    setBusy(false);
    if (error) return setErr(error.message);
    onDone(data.user);
  };
  return (
    <div className="content fi" style={{ display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 380, margin: "0 auto", width: "100%" }}>
      <h1 className="pt">Benvenuto</h1>
      <p className="sub" style={{ marginBottom: 18 }}>Il tuo account è stato creato dal tuo personal trainer. Scegli una password personale per continuare.</p>
      <div className="ig"><label className="lbl">Nuova password</label><input className="inp" type="password" autoComplete="new-password" value={p1} onChange={e => setP1(e.target.value)} /></div>
      <div className="ig"><label className="lbl">Ripeti password</label><input className="inp" type="password" autoComplete="new-password" value={p2} onChange={e => setP2(e.target.value)} onKeyDown={e => e.key === "Enter" && salva()} /></div>
      {err && <div className="ai-err">{err}</div>}
      <button className="btn btn-p btn-full" onClick={salva} disabled={busy}>{busy ? "Salvataggio…" : "Salva e continua"}</button>
      <button className="btn btn-s btn-full" style={{ marginTop: 8 }} onClick={onLogout}>Esci</button>
    </div>
  );
}
