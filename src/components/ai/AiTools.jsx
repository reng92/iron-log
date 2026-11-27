// Componenti AI riutilizzabili (tutti passano da chiediAI → Edge Function "ai" → Groq)
import { useState, useEffect, useRef } from "react";
import { IcClose, IcCheck, IcTrash, IcUpload, IcFile } from "../Icons";
import { chiediAI, fotoPerAI, normalizzaAlimenti, leggiReferti } from "../../ai";
import { contestoUtente } from "../../aiContesto";
import { estraiTestoPdf, genId, fmtIso, fmtDate } from "../../utils";
import { CAMPI_VISITA, CHIAVI_VISITA, incoerenze } from "../../visita";

const Testata = ({ titolo, onClose }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
    <div className="wt">{titolo} <span className="ai-tag">AI</span></div>
    <button className="bico" onClick={onClose} aria-label="Chiudi"><IcClose /></button>
  </div>
);

const Attesa = ({ testo = "Analisi in corso…" }) => (
  <div style={{ textAlign: "center", padding: "28px 12px", color: "var(--dim)" }}>
    <div className="spin" style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
    <div className="pls" style={{ fontSize: 14 }}>{testo}</div>
  </div>
);

const Modale = ({ onClose, children }) => (
  <div className="mov" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="mod">{children}</div>
  </div>
);

// ─── Pulsante "carica foto e lascia compilare all'AI" ─────────────
export function AiFotoButton({ titolo, hint, busy, multiple, onFiles, icona = "📸", accept = "image/*" }) {
  const ref = useRef();
  return (
    <>
      <input ref={ref} type="file" accept={accept} multiple={multiple} style={{ display: "none" }}
        onChange={e => { const f = Array.from(e.target.files || []); e.target.value = ""; if (f.length) onFiles(f); }} />
      <button type="button" className="ai-btn" disabled={busy} onClick={() => ref.current?.click()}>
        <span style={{ fontSize: 20 }} className={busy ? "spin" : ""}>{busy ? "⏳" : icona}</span>
        <span><b>{busy ? "Analisi AI in corso…" : titolo}</b>{hint && !busy && <small>{hint}</small>}</span>
      </button>
    </>
  );
}

// ─── Pasto da foto o descrizione → lista alimenti con kcal ────────
export function PastoAIModal({ onAdd, onClose, modoIniziale = "foto" }) {
  const [modo, setModo] = useState(modoIniziale);
  const [testo, setTesto] = useState("");
  const [nota, setNota] = useState("");
  const [anteprima, setAnteprima] = useState(null);
  const [img, setImg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState("");
  const [alimenti, setAlimenti] = useState(null);
  const fileRef = useRef();

  const scegliFoto = async file => {
    if (!file) return;
    setErrore(""); setAlimenti(null);
    const data = await fotoPerAI(file);
    setImg(data); setAnteprima(data);
  };

  const analizza = async () => {
    setErrore(""); setLoading(true);
    try {
      const res = modo === "foto"
        ? await chiediAI("pasto_foto", { image: img, nota: nota.trim() || undefined })
        : await chiediAI("pasto_testo", { testo: testo.trim() });
      const lista = normalizzaAlimenti(res);
      if (!lista.length) throw new Error("Non ho riconosciuto alimenti, prova con un'altra foto o descrizione");
      setAlimenti(lista);
    } catch (e) { setErrore(e.message); }
    setLoading(false);
  };

  const tot = (alimenti || []).reduce((a, x) => ({ kcal: a.kcal + x.kcal, p: a.p + x.proteine, c: a.c + x.carboidrati, g: a.g + x.grassi }), { kcal: 0, p: 0, c: 0, g: 0 });
  const setKcal = (i, v) => setAlimenti(l => l.map((x, j) => j === i ? { ...x, kcal: Math.max(0, Math.round(+v || 0)) } : x));

  return (
    <Modale onClose={onClose}>
      <Testata titolo="Aggiungi pasto" onClose={onClose} />
      {!alimenti && !loading && (
        <>
          <div className="stab-row" style={{ marginBottom: 14 }}>
            <button className={`stab${modo === "foto" ? " on" : ""}`} onClick={() => setModo("foto")}>📸 Foto</button>
            <button className={`stab${modo === "testo" ? " on" : ""}`} onClick={() => setModo("testo")}>✍️ A parole</button>
          </div>
          {modo === "foto" ? (
            <>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
                onChange={e => { scegliFoto(e.target.files?.[0]); e.target.value = ""; }} />
              {anteprima
                ? <img src={anteprima} alt="Pasto" onClick={() => fileRef.current?.click()} style={{ width: "100%", maxHeight: 240, objectFit: "cover", borderRadius: 10, marginBottom: 10, cursor: "pointer" }} />
                : <AiFotoButton titolo="Scatta o scegli la foto del piatto" hint="L'AI riconosce gli alimenti e stima le kcal" onFiles={f => scegliFoto(f[0])} />}
              <div className="ig"><label className="lbl">Dettagli (opzionale)</label>
                <input className="inp" placeholder="es. pasta integrale, olio a parte, porzione grande" value={nota} maxLength={300} onChange={e => setNota(e.target.value)} /></div>
            </>
          ) : (
            <div className="ig"><label className="lbl">Cosa hai mangiato?</label>
              <textarea className="inp" placeholder="es. 100g di pasta al tonno, insalata con un cucchiaio d'olio e una mela" value={testo} maxLength={1000} onChange={e => setTesto(e.target.value)} /></div>
          )}
          {errore && <div className="ai-err">{errore}</div>}
          <button className="btn btn-p btn-full" onClick={analizza} disabled={modo === "foto" ? !img : !testo.trim()}>Calcola con AI</button>
        </>
      )}
      {loading && <Attesa testo={modo === "foto" ? "Riconosco gli alimenti…" : "Calcolo kcal e macro…"} />}
      {alimenti && (
        <>
          <div style={{ fontSize: 13, color: "var(--dim)", marginBottom: 10 }}>Controlla le stime: puoi correggere le kcal o togliere una voce.</div>
          {alimenti.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--bdr)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{a.nome}</div>
                <div style={{ fontSize: 12, color: "var(--dim)" }}>{a.grammi ? `${a.grammi} g · ` : ""}P {a.proteine} · C {a.carboidrati} · G {a.grassi}</div>
              </div>
              <input className="inp" type="number" min="0" value={a.kcal} onChange={e => setKcal(i, e.target.value)} style={{ width: 80, minHeight: 36, padding: "6px 8px" }} aria-label={`kcal ${a.nome}`} />
              <button className="bico d" onClick={() => setAlimenti(l => l.filter((_, j) => j !== i))} aria-label="Rimuovi"><IcTrash /></button>
            </div>
          ))}
          <div className="kcal-sum" style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
            <b>{tot.kcal} kcal</b><span style={{ color: "var(--dim)" }}>P {tot.p}g · C {tot.c}g · G {tot.g}g</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-s" style={{ flex: 1 }} onClick={() => setAlimenti(null)}>Indietro</button>
            <button className="btn btn-p" style={{ flex: 2 }} disabled={!alimenti.length} onClick={() => { onAdd(alimenti); onClose(); }}><IcCheck /> Aggiungi {alimenti.length}</button>
          </div>
        </>
      )}
    </Modale>
  );
}

// ─── Sostituzione esercizio durante l'allenamento ─────────────────
const MOTIVI = ["Attrezzo occupato", "Attrezzo non disponibile", "Fastidio o dolore", "Voglio variare"];

export function SostituisciModal({ esercizio, schema, onPick, onClose }) {
  const [motivo, setMotivo] = useState(MOTIVI[0]);
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState("");
  const [alt, setAlt] = useState(null);

  const cerca = async () => {
    setErrore(""); setLoading(true);
    try {
      const res = await chiediAI("sostituisci", { esercizio, schema, motivo });
      const lista = (res?.alternative || []).filter(a => a?.nome).slice(0, 4);
      if (!lista.length) throw new Error("Nessuna alternativa trovata, riprova");
      setAlt(lista);
    } catch (e) { setErrore(e.message); }
    setLoading(false);
  };

  return (
    <Modale onClose={onClose}>
      <Testata titolo="Sostituisci esercizio" onClose={onClose} />
      <div style={{ fontSize: 14, marginBottom: 12 }}>Al posto di <b>{esercizio}</b>{schema ? ` (${schema})` : ""}</div>
      {!alt && !loading && (
        <>
          <label className="lbl">Perché?</label>
          <div className="chip-row" style={{ marginBottom: 14 }}>
            {MOTIVI.map(m => <button key={m} className={`chip${motivo === m ? " on" : ""}`} onClick={() => setMotivo(m)}>{m}</button>)}
          </div>
          {motivo === "Fastidio o dolore" && <div style={{ fontSize: 12, color: "var(--warn)", marginBottom: 12 }}>Se il dolore è forte o persiste fermati e senti un medico.</div>}
          {errore && <div className="ai-err">{errore}</div>}
          <button className="btn btn-p btn-full" onClick={cerca}>Trova alternative</button>
        </>
      )}
      {loading && <Attesa testo="Cerco esercizi equivalenti…" />}
      {alt && alt.map((a, i) => (
        <div key={i} className="card" style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{a.nome}</div>
          {a.perche && <div style={{ fontSize: 13, color: "var(--dim)", margin: "4px 0 8px" }}>{a.perche}{a.ripetizioni ? ` · ${a.ripetizioni} rip.` : ""}</div>}
          <button className="btn btn-s btn-full" onClick={() => { onPick(String(a.nome).slice(0, 80)); onClose(); }}>Usa questo</button>
        </div>
      ))}
    </Modale>
  );
}

// ─── Idea ricetta per un pasto del piano ──────────────────────────
export function RicettaModal({ pasto, onClose }) {
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState("");
  const [ricetta, setRicetta] = useState(null);

  const genera = async () => {
    setErrore(""); setLoading(true);
    try {
      const ingredienti = (pasto.alimenti || []).map(a => `- ${a.nome}${a.grammi ? ` ${a.grammi} g` : ""}`).join("\n");
      const res = await chiediAI("ricetta", { pasto: pasto.nome, ingredienti });
      if (!res?.titolo) throw new Error("Nessuna ricetta generata, riprova");
      setRicetta(res);
    } catch (e) { setErrore(e.message); }
    setLoading(false);
  };
  useEffect(() => { genera(); }, []); // genera una sola volta all'apertura

  return (
    <Modale onClose={onClose}>
      <Testata titolo="Idea ricetta" onClose={onClose} />
      <div style={{ fontSize: 13, color: "var(--dim)", marginBottom: 12 }}>Con gli ingredienti di: <b>{pasto.nome}</b></div>
      {loading && <Attesa testo="Sto pensando a una ricetta…" />}
      {errore && !loading && <div className="ai-err">{errore}</div>}
      {ricetta && !loading && (
        <>
          <div className="wt" style={{ fontSize: 20, marginBottom: 4 }}>{ricetta.titolo}</div>
          {ricetta.tempo && <div style={{ fontSize: 13, color: "var(--dim)", marginBottom: 10 }}>⏱ {ricetta.tempo}</div>}
          <ol style={{ paddingLeft: 20, fontSize: 14, lineHeight: 1.5 }}>
            {(ricetta.passi || []).map((p, i) => <li key={i} style={{ marginBottom: 6 }}>{p}</li>)}
          </ol>
          {ricetta.consiglio && <div style={{ fontSize: 13, background: "var(--acc2)", borderRadius: 8, padding: 10, marginTop: 10 }}>💡 {ricetta.consiglio}</div>}
        </>
      )}
      {!loading && <button className="btn btn-s btn-full" style={{ marginTop: 14 }} onClick={genera}>Un'altra idea</button>}
    </Modale>
  );
}

// ─── Riepilogo settimanale (card) ─────────────────────────────────
const chiaveSettimana = () => {
  const d = new Date(); const lun = new Date(d); lun.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `ai_riepilogo_${fmtIso(lun)}`;
};

export function RiepilogoAI({ dati }) {
  const key = chiaveSettimana();
  const [r, setR] = useState(() => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } });
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState("");

  const genera = async () => {
    setErrore(""); setLoading(true);
    try {
      const res = await chiediAI("riepilogo", { contesto: contestoUtente(dati, 7) });
      if (!res?.titolo) throw new Error("Riepilogo non disponibile, riprova");
      setR(res);
      try { localStorage.setItem(key, JSON.stringify(res)); } catch { /* storage pieno */ }
    } catch (e) { setErrore(e.message); }
    setLoading(false);
  };

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 14 }}>La tua settimana <span className="ai-tag">AI</span></div>
        <button className="btn btn-s" style={{ minHeight: 34, padding: "6px 12px", fontSize: 13 }} onClick={genera} disabled={loading}>
          {loading ? <span className="spin">⏳</span> : r ? "Aggiorna" : "Genera"}
        </button>
      </div>
      {errore && <div className="ai-err" style={{ marginTop: 10, marginBottom: 0 }}>{errore}</div>}
      {!r && !errore && <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 8 }}>Un riassunto di allenamenti, peso e dieta degli ultimi 7 giorni, con un consiglio per la prossima settimana.</div>}
      {r && (
        <div style={{ marginTop: 10 }}>
          <div className="wt" style={{ fontSize: 18, marginBottom: 6 }}>{r.titolo}</div>
          <ul style={{ paddingLeft: 18, fontSize: 14, lineHeight: 1.5 }}>{(r.punti || []).map((p, i) => <li key={i}>{p}</li>)}</ul>
          {r.consiglio && <div style={{ fontSize: 13, background: "var(--acc2)", borderRadius: 8, padding: 10, marginTop: 8 }}>👉 {r.consiglio}</div>}
        </div>
      )}
    </div>
  );
}

// ─── Import visite dal nutrizionista (PDF dei referti e/o foto) ───
// Visite nuove → create; visite con la stessa data già presenti → completate con i valori mancanti o aggiornati.
export function BcsImport({ misure, onAdd, onUpd }) {
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState("");
  const [visite, setVisite] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const perData = Object.fromEntries(misure.map(m => [m.data, m]));

  const importa = async files => {
    setErrore(""); setBusy(true);
    try { setVisite(await leggiReferti(files)); } catch (e) { setErrore(e.message); }
    setBusy(false);
  };

  // per ogni visita: campi nuovi e campi che cambiano rispetto a quella già salvata
  const diff = v => {
    const old = perData[v.data];
    const campi = CHIAVI_VISITA.filter(k => v[k] != null);
    if (!old) return { tipo: "nuova", campi };
    const cambiati = campi.filter(k => old[k] !== v[k]);
    return { tipo: cambiati.length ? "aggiorna" : "uguale", campi: cambiati };
  };

  const conferma = async () => {
    setSalvando(true);
    for (const v of visite) {
      const d = diff(v);
      if (d.tipo === "nuova") await onAdd({ id: genId(), visita_label: "", note: "Importata dal referto con AI", ...v });
      else if (d.tipo === "aggiorna") await onUpd({ ...perData[v.data], ...v, visita_label: perData[v.data].visita_label || v.visita_label || "" });
    }
    setSalvando(false); setVisite(null);
  };
  const daFare = visite ? visite.filter(v => diff(v).tipo !== "uguale").length : 0;
  const etichetta = k => CAMPI_VISITA.find(c => c.k === k);

  return (
    <>
      <AiFotoButton titolo="Importa referti del nutrizionista" hint="PDF (Total Body, Antropometrico…) o foto: l'AI estrae tutti i valori con la data della visita" icona="📈" multiple accept="application/pdf,.pdf,image/*" busy={busy} onFiles={importa} />
      {errore && <div className="ai-err">{errore}</div>}
      {visite && (
        <Modale onClose={() => setVisite(null)}>
          <Testata titolo={`${visite.length} visite trovate`} onClose={() => setVisite(null)} />
          {[...visite].reverse().map(v => {
            const d = diff(v);
            const warn = incoerenze({ ...(perData[v.data] || {}), ...v });
            return (
              <details key={v.data} className="card" style={{ marginBottom: 8, opacity: d.tipo === "uguale" ? .55 : 1 }} open={visite.length === 1}>
                <summary style={{ cursor: "pointer" }}>
                  <b>{fmtDate(v.data)}</b>{" "}
                  <span className={`tag ${d.tipo === "nuova" ? "tag-a" : "tag-m"}`}>{d.tipo === "nuova" ? "nuova visita" : d.tipo === "aggiorna" ? `aggiorna ${d.campi.length} valori` : "già uguale"}</span>
                  <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{CHIAVI_VISITA.filter(k => v[k] != null).length} valori letti</div>
                </summary>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 12px", marginTop: 8, fontSize: 13 }}>
                  {CHIAVI_VISITA.filter(k => v[k] != null).map(k => {
                    const c = etichetta(k), old = perData[v.data]?.[k];
                    return (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 6, color: d.campi.includes(k) ? "var(--txt)" : "var(--dim)" }}>
                        <span>{c.label}{c.unit === "%" || c.unit === "% TBW" ? ` (${c.unit})` : ""}</span>
                        <b>{v[k]}{c.unit && !c.unit.startsWith("%") ? ` ${c.unit}` : ""}{old != null && old !== v[k] ? <span style={{ color: "var(--mut)", fontWeight: 400 }}> (era {old})</span> : ""}</b>
                      </div>
                    );
                  })}
                </div>
                {warn.map(w => <div key={w} style={{ fontSize: 12, color: "var(--warn)", marginTop: 6 }}>⚠️ {w}: controlla</div>)}
              </details>
            );
          })}
          <div style={{ fontSize: 12, color: "var(--dim)", margin: "10px 0" }}>Controlla i valori prima di confermare: l'AI può sbagliare. Potrai comunque modificarli dopo con ✏️ sulla visita.</div>
          <button className="btn btn-p btn-full" onClick={conferma} disabled={!daFare || salvando}><IcCheck /> {salvando ? "Salvataggio…" : `Salva ${daFare} visite`}</button>
        </Modale>
      )}
    </>
  );
}

// ─── Import scheda di allenamento da PDF o foto ───────────────────
export function SchedaImportModal({ onApply, onClose }) {
  const [file, setFile] = useState(null);
  const [foto, setFoto] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState("");
  const [parsed, setParsed] = useState(null);

  const analizza = async () => {
    setErrore(""); setLoading(true);
    try {
      let res;
      if (file) {
        const testo = await estraiTestoPdf(file);
        if (!testo || testo.length < 20) throw new Error("Il PDF sembra solo immagine: caricane una foto invece");
        res = await chiediAI("scheda_pdf", { testo });
      } else {
        res = await chiediAI("scheda_foto", { images: await Promise.all(foto.slice(0, 3).map(f => fotoPerAI(f, 1400))) });
      }
      const giorni = (res?.giorni || []).filter(g => g?.esercizi?.length);
      if (!giorni.length) throw new Error("Nessun esercizio trovato");
      setParsed({ nomeScheda: String(res.nomeScheda || "Scheda importata"), giorni });
    } catch (e) { setErrore(e.message); }
    setLoading(false);
  };

  const applica = () => {
    const multi = parsed.giorni.length > 1;
    const schede = parsed.giorni.map(g => ({
      id: genId(),
      nome: (multi ? String(g.nomeGiorno || parsed.nomeScheda) : parsed.nomeScheda).slice(0, 60),
      giorni: [],
      esercizi: (g.esercizi || []).filter(e => e?.nome).map(e => ({
        id: genId(), nome: String(e.nome).slice(0, 80), serie: +e.serie || 3,
        ripetizioni: String(e.ripetizioni || "10"), pausa: +e.pausa || 90, note: String(e.note || ""),
      })),
    }));
    onApply(schede); onClose();
  };

  return (
    <Modale onClose={onClose}>
      <Testata titolo="Importa scheda" onClose={onClose} />
      {!parsed && !loading && (
        <>
          <div style={{ fontSize: 13, color: "var(--dim)", marginBottom: 12 }}>Carica il PDF o le foto della scheda del tuo PT: ogni giorno (A/B/C, push/pull…) diventa una scheda separata.</div>
          <label className="ai-btn" style={{ cursor: "pointer" }}>
            <input type="file" accept=".pdf,application/pdf" style={{ display: "none" }} onChange={e => { setFile(e.target.files?.[0] || null); setFoto([]); e.target.value = ""; }} />
            <span style={{ fontSize: 20 }}>{file ? <IcFile /> : <IcUpload />}</span>
            <span><b>{file ? file.name : "Scegli PDF"}</b><small>{file ? `${Math.round(file.size / 1024)} KB` : "Scheda in formato PDF con testo"}</small></span>
          </label>
          <AiFotoButton titolo={foto.length ? `${foto.length} foto selezionate` : "Oppure scegli foto (max 3)"} hint="Foto o screenshot della scheda" multiple onFiles={f => { setFoto(f.slice(0, 3)); setFile(null); }} />
          {errore && <div className="ai-err">{errore}</div>}
          <button className="btn btn-p btn-full" onClick={analizza} disabled={!file && !foto.length}>Analizza</button>
        </>
      )}
      {loading && <Attesa testo="Leggo la scheda…" />}
      {parsed && (
        <>
          <div className="wt" style={{ fontSize: 18, marginBottom: 8 }}>{parsed.nomeScheda}</div>
          {parsed.giorni.map((g, i) => (
            <div key={i} className="card" style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>{g.nomeGiorno || `Giorno ${i + 1}`} · {g.esercizi.length} esercizi</div>
              {g.esercizi.map((e, j) => <div key={j} style={{ fontSize: 13, color: "var(--dim)" }}>{e.nome} — {e.serie}×{e.ripetizioni}</div>)}
            </div>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-s" style={{ flex: 1 }} onClick={() => setParsed(null)}>Indietro</button>
            <button className="btn btn-p" style={{ flex: 2 }} onClick={applica}><IcCheck /> Crea {parsed.giorni.length} schede</button>
          </div>
        </>
      )}
    </Modale>
  );
}
