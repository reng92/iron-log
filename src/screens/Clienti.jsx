// Pannello Personal Trainer: lista clienti + dettaglio (progressi, allenamenti, dieta, schede/piani assegnati).
// Telefono: lista → dettaglio a schermo intero. Desktop (≥ 900px): lista a sinistra, dettaglio a destra.
import { useState, useEffect, useMemo, useCallback } from "react";
import { pt } from "../pt";
import { aderenza, avvisiStallo } from "../insights";
import { esportaReportPdf } from "../exportPdf";
import { fmtDate, fmtShort, genId } from "../utils";
import LineChart from "../components/LineChart";
import ConfirmModal from "../components/modals/ConfirmModal";
import { SchedaImportModal } from "../components/ai/AiTools";
import { IcPlus, IcEdit, IcTrash, IcChevL, IcChevR, IcClose, IcCheck, IcDownload, IcUpload } from "../components/Icons";

const statoCliente = r => {
  if (!r) return { colore: "var(--mut)", testo: "—" };
  const a = aderenza(r, 7);
  if (a.giorniInattivo == null) return { colore: "var(--mut)", testo: "Nessuna attività negli ultimi 30 giorni" };
  if (a.giorniInattivo >= 7) return { colore: "var(--dan)", testo: `Inattivo da ${a.giorniInattivo} giorni` };
  if (a.allenamenti === 0 && a.giorniDieta < 3) return { colore: "var(--warn)", testo: "Poco attivo questa settimana" };
  return { colore: "var(--ok)", testo: `${a.allenamenti} allenamenti · ${a.giorniDieta} gg dieta (7 gg)` };
};

// ─── Credenziali da consegnare al cliente ─────────────────────────
function Credenziali({ cliente, password, onClose }) {
  const testo = `Ciao ${cliente.nome}! Ti ho creato l'account su Iron-Log.\nApri ${window.location.origin}\nEmail: ${cliente.email}\nPassword temporanea: ${password}\nAl primo accesso ti chiederà di sceglierne una tua.`;
  const [copiato, setCopiato] = useState(false);
  const copia = async () => { try { await navigator.clipboard.writeText(testo); setCopiato(true); } catch { setCopiato(false); } };
  return (
    <div className="mov" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mod">
        <div className="wt" style={{ marginBottom: 10 }}>Credenziali di {cliente.nome}</div>
        <div style={{ fontSize: 13, color: "var(--dim)", marginBottom: 10 }}>La password viene mostrata solo ora. Inviala al cliente: al primo accesso dovrà cambiarla.</div>
        <pre style={{ whiteSpace: "pre-wrap", background: "var(--sur)", border: "1px solid var(--bdr)", borderRadius: 10, padding: 12, fontSize: 13, fontFamily: "inherit" }}>{testo}</pre>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn btn-s" style={{ flex: 1 }} onClick={copia}>{copiato ? "Copiato ✓" : "Copia"}</button>
          <a className="btn btn-s" style={{ flex: 1, textDecoration: "none" }} href={`https://wa.me/?text=${encodeURIComponent(testo)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <button className="btn btn-p" style={{ flex: 1 }} onClick={onClose}>Fatto</button>
        </div>
      </div>
    </div>
  );
}

function NuovoCliente({ onCreato, onClose }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const crea = async () => {
    setErr(""); setBusy(true);
    try { const r = await pt.creaCliente(email.trim(), nome.trim()); onCreato(r.cliente, r.password); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };
  return (
    <div className="mov" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mod">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div className="wt">Nuovo cliente</div>
          <button className="bico" onClick={onClose} aria-label="Chiudi"><IcClose /></button>
        </div>
        <div className="ig"><label className="lbl">Nome e cognome</label><input className="inp" value={nome} maxLength={80} onChange={e => setNome(e.target.value)} /></div>
        <div className="ig"><label className="lbl">Email del cliente</label><input className="inp" type="email" autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 12 }}>Creo l'account con una password temporanea da consegnare al cliente. Vedrai i suoi progressi e potrai assegnargli schede e piani alimentari.</div>
        {err && <div className="ai-err">{err}</div>}
        <button className="btn btn-p btn-full" onClick={crea} disabled={busy || !nome.trim() || !email.trim()}>{busy ? "Creazione…" : "Crea account"}</button>
      </div>
    </div>
  );
}

// ─── Dettaglio cliente ───────────────────────────────────────────
function DettaglioCliente({ cliente, onBack, onAggiornato, onRimosso, SchedaEdit, PianoEdit }) {
  const [dati, setDati] = useState(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("panoramica");
  const [edit, setEdit] = useState(null); // {tipo:"scheda"|"piano", data}
  const [importa, setImporta] = useState(false);
  const [conferma, setConferma] = useState(null);
  const [credenziali, setCredenziali] = useState(null);
  const [note, setNote] = useState(cliente.note || "");
  const [msg, setMsg] = useState("");
  const id = cliente.cliente_id;

  const carica = useCallback(async () => {
    setErr("");
    try { setDati(await pt.datiCliente(id)); } catch (e) { setErr(e.message); }
  }, [id]);
  useEffect(() => { setDati(null); setTab("panoramica"); setMsg(""); carica(); }, [id, carica]);
  useEffect(() => { setNote(cliente.note || ""); }, [cliente.note]);

  const azione = async (fn, ok) => { setMsg(""); try { await fn(); if (ok) setMsg(ok); await carica(); } catch (e) { setMsg(`Errore: ${e.message}`); } };

  if (edit?.tipo === "scheda") return (
    <SchedaEdit scheda={edit.data} onBack={() => setEdit(null)}
      onSave={sc => { setEdit(null); azione(() => pt.salvaScheda(id, { ...sc, id: sc.id || genId() }), "Scheda salvata: il cliente la trova nella sua app"); }} />
  );
  if (edit?.tipo === "piano") return (
    <PianoEdit piano={edit.data} onBack={() => setEdit(null)}
      onSave={p => { setEdit(null); azione(() => pt.salvaPiano(id, { ...p, id: p.id || genId() }), "Piano salvato: il cliente lo trova nella sua app"); }} />
  );

  const st = dati?.settings || {};
  const pesi = dati ? [...dati.peso].sort((a, b) => a.data.localeCompare(b.data)) : [];
  const ultimo = pesi[pesi.length - 1];
  const a7 = dati ? aderenza(dati, 7) : null, a30 = dati ? aderenza(dati, 30) : null;
  const avvisi = dati ? avvisiStallo(dati) : [];
  const da30 = new Date(); da30.setDate(da30.getDate() - 30);
  const p30 = pesi.filter(p => new Date(p.data) >= da30);
  const d30 = p30.length >= 2 ? +(p30[p30.length - 1].valore - p30[0].valore).toFixed(1) : null;

  return (
    <div className="fi">
      <button className="bb pt-back" onClick={onBack}><IcChevL /> Clienti</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, margin: "6px 0 12px" }}>
        <div style={{ minWidth: 0 }}>
          <h1 className="pt" style={{ fontSize: 28 }}>{cliente.nome}</h1>
          <p className="sub" style={{ wordBreak: "break-all" }}>{cliente.email}{st.eta ? ` · ${st.eta} anni` : ""}{st.altezza ? ` · ${st.altezza} cm` : ""}</p>
        </div>
        <button className="btn btn-s" onClick={() => dati && esportaReportPdf({ ...dati, settings: { ...st, nome: cliente.nome } })} disabled={!dati}><IcDownload /> Report</button>
      </div>

      <div className="stab-row" role="tablist" style={{ marginBottom: 12, overflowX: "auto" }}>
        {[["panoramica", "Panoramica"], ["allenamenti", "Allenamenti"], ["dieta", "Dieta"], ["schede", "Schede"], ["piani", "Piani"], ["account", "Account"]].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`stab${tab === k ? " on" : ""}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {msg && <div style={{ fontSize: 13, padding: 10, borderRadius: 8, marginBottom: 10, background: msg.startsWith("Errore") ? "var(--dan2)" : "var(--acc2)" }}>{msg}</div>}
      {err && <div className="ai-err">{err} <button className="btn btn-s" onClick={carica}>Riprova</button></div>}
      {!dati && !err && <div className="pls" style={{ color: "var(--dim)", padding: 20 }}>Caricamento dati del cliente…</div>}

      {dati && tab === "panoramica" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8, marginBottom: 12 }}>
            {[
              ["Peso attuale", ultimo ? `${ultimo.valore} kg` : "—", ultimo ? fmtShort(ultimo.data) : ""],
              ["Ultimi 30 giorni", d30 != null ? `${d30 > 0 ? "+" : ""}${d30} kg` : "—", `${p30.length} pesate`],
              ["Allenamenti", `${a7.allenamenti} / ${a30.allenamenti}`, "7 gg / 30 gg"],
              ["Dieta nel piano", a30.giorniDieta ? `${Math.round(a30.giorniNelPiano / a30.giorniDieta * 100)}%` : "—", `${a30.giorniDieta} giorni compilati (30 gg)`],
            ].map(([l, v, s]) => (
              <div key={l} className="card" style={{ marginBottom: 0, padding: 12 }}>
                <div style={{ fontSize: 12, color: "var(--dim)", fontWeight: 700 }}>{l}</div>
                <div className="wt" style={{ fontSize: 22 }}>{v}</div>
                <div style={{ fontSize: 11, color: "var(--mut)" }}>{s}</div>
              </div>
            ))}
          </div>
          {avvisi.length > 0 && (
            <div className="card">
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>Da tenere d'occhio</div>
              {avvisi.map(a => <div key={a.testo} style={{ fontSize: 13, padding: "4px 0" }}>{a.livello === "warn" ? "⚠️" : "📉"} {a.testo}</div>)}
            </div>
          )}
          <div className="card">
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>Andamento peso</div>
            <div className="chart-wrap"><LineChart data={pesi.slice(-20).map(p => ({ y: +p.valore, label: fmtShort(p.data) }))} height={120} /></div>
          </div>
          {dati.misure.length > 0 && (() => {
            const m = [...dati.misure].sort((a, b) => a.data.localeCompare(b.data)).pop();
            return (
              <div className="card">
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>Ultima visita · {fmtDate(m.data)}</div>
                <div style={{ fontSize: 13, color: "var(--dim)" }}>
                  {[m.peso != null && `Peso ${m.peso} kg`, m.fm != null && `FM ${m.fm} kg`, m.ffm != null && `FFM ${m.ffm} kg`, m.vita != null && `Vita ${m.vita} cm`, m.addome != null && `Addome ${m.addome} cm`, m.fianchi != null && `Fianchi ${m.fianchi} cm`].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
            );
          })()}
          <div className="card">
            <label className="lbl">Note private sul cliente (le vedi solo tu)</label>
            <textarea className="inp" value={note} maxLength={4000} onChange={e => setNote(e.target.value)} placeholder="Obiettivi, infortuni, preferenze…" />
            <button className="btn btn-s" style={{ marginTop: 8 }} disabled={note === (cliente.note || "")}
              onClick={() => azione(async () => { await pt.aggiornaCliente(id, { note }); onAggiornato({ ...cliente, note }); }, "Note salvate")}><IcCheck /> Salva note</button>
          </div>
        </>
      )}

      {dati && tab === "allenamenti" && (
        dati.sessioni.length === 0 ? <div className="emp"><div className="emp-t">Nessun allenamento</div></div> :
          dati.sessioni.slice(0, 40).map(s => (
            <details key={s.id} className="card">
              <summary style={{ cursor: "pointer" }}>
                <b>{s.schedaNome || "Allenamento"}</b> <span style={{ color: "var(--dim)", fontSize: 13 }}>· {fmtDate(s.data)}{s.durata ? ` · ${s.durata} min` : ""}</span>
              </summary>
              <div style={{ marginTop: 8 }}>
                {(s.esercizi || []).map((e, i) => {
                  const fatte = (e.serie || []).filter(x => x.completata);
                  return <div key={i} style={{ fontSize: 13, padding: "3px 0" }}><b>{e.nome}</b> <span style={{ color: "var(--dim)" }}>{fatte.map(x => `${x.kg || 0}×${x.reps || 0}`).join("  ") || "nessuna serie completata"}</span></div>;
                })}
                {s.note && <div style={{ fontSize: 12, fontStyle: "italic", color: "var(--dim)", marginTop: 6 }}>"{s.note}"</div>}
              </div>
            </details>
          ))
      )}

      {dati && tab === "dieta" && (
        dati.logDieta.length === 0 ? <div className="emp"><div className="emp-t">Nessun diario compilato</div></div> :
          dati.logDieta.slice(0, 40).map(l => {
            const d = (+l.totKcalConsumate || 0) - (+l.totKcalPreviste || 0);
            const fuori = +l.totKcalPreviste > 0 && Math.abs(d) > l.totKcalPreviste * 0.1;
            return (
              <div key={l.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12 }}>
                <div><div style={{ fontWeight: 700, fontSize: 14 }}>{fmtDate(l.data)}</div><div style={{ fontSize: 12, color: "var(--dim)" }}>{l.pianoNome || ""}{l.extra?.length ? ` · ${l.extra.length} extra` : ""}</div></div>
                <div style={{ textAlign: "right" }}>
                  <div className="wt" style={{ fontSize: 18, color: fuori ? "var(--warn)" : "var(--ok)" }}>{l.totKcalConsumate} kcal</div>
                  <div style={{ fontSize: 12, color: "var(--dim)" }}>su {l.totKcalPreviste} ({d > 0 ? "+" : ""}{d})</div>
                </div>
              </div>
            );
          })
      )}

      {dati && tab === "schede" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <button className="btn btn-p" onClick={() => setEdit({ tipo: "scheda", data: { nome: "", giorni: [], esercizi: [] } })}><IcPlus /> Nuova scheda</button>
            <button className="btn btn-s" onClick={() => setImporta(true)}><IcUpload /> Da PDF o foto</button>
          </div>
          {dati.schede.length === 0 && <div className="emp"><div className="emp-t">Nessuna scheda</div></div>}
          {dati.schede.map(sc => (
            <div key={sc.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div><div style={{ fontWeight: 800, fontSize: 16 }}>{sc.nome} {sc.daTrainer && <span className="tag tag-a">assegnata da te</span>}</div>
                  <div style={{ fontSize: 12, color: "var(--dim)" }}>{sc.esercizi?.length || 0} esercizi</div></div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="bico" onClick={() => setEdit({ tipo: "scheda", data: sc })} aria-label="Modifica"><IcEdit /></button>
                  <button className="bico d" onClick={() => setConferma({ msg: `Eliminare "${sc.nome}" dall'app del cliente?`, fn: () => azione(() => pt.eliminaScheda(sc.id), "Scheda eliminata") })} aria-label="Elimina"><IcTrash /></button>
                </div>
              </div>
            </div>
          ))}
          {importa && <SchedaImportModal onClose={() => setImporta(false)}
            onApply={nuove => azione(async () => { for (const sc of nuove) await pt.salvaScheda(id, sc); }, `${nuove.length} schede assegnate`)} />}
        </>
      )}

      {dati && tab === "piani" && (
        <>
          <button className="btn btn-p" style={{ marginBottom: 12 }} onClick={() => setEdit({ tipo: "piano", data: { nome: "", durataGiorni: 56, pasti: [] } })}><IcPlus /> Nuovo piano alimentare</button>
          {dati.piani.length === 0 && <div className="emp"><div className="emp-t">Nessun piano alimentare</div></div>}
          {dati.piani.map(p => (
            <div key={p.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div><div style={{ fontWeight: 800, fontSize: 16 }}>{p.nome || "Piano"} {p.daTrainer && <span className="tag tag-a">assegnato da te</span>}</div>
                  <div style={{ fontSize: 12, color: "var(--dim)" }}>{p.dataInizio ? `dal ${fmtShort(p.dataInizio)}` : ""}{p.dataFine ? ` al ${fmtShort(p.dataFine)}` : ""}</div></div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="bico" onClick={() => setEdit({ tipo: "piano", data: p })} aria-label="Modifica"><IcEdit /></button>
                  <button className="bico d" onClick={() => setConferma({ msg: `Eliminare il piano "${p.nome}" dall'app del cliente?`, fn: () => azione(() => pt.eliminaPiano(p.id), "Piano eliminato") })} aria-label="Elimina"><IcTrash /></button>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {tab === "account" && (
        <div className="card">
          <div style={{ fontSize: 14, marginBottom: 12 }}>Account: <b>{cliente.email}</b>{cliente.created_at && <><br /><span style={{ fontSize: 12, color: "var(--dim)" }}>Cliente dal {fmtDate(cliente.created_at)}</span></>}</div>
          <button className="btn btn-s btn-full" style={{ marginBottom: 8 }}
            onClick={() => setConferma({ msg: `Generare una nuova password temporanea per ${cliente.nome}? Quella attuale smetterà di funzionare.`, fn: async () => { try { const r = await pt.resetPassword(id); setCredenziali(r.password); } catch (e) { setMsg(`Errore: ${e.message}`); } } })}>
            Nuova password temporanea
          </button>
          <button className="btn btn-s btn-full" style={{ color: "var(--dan)" }}
            onClick={() => setConferma({ msg: `Scollegare ${cliente.nome}? Non vedrai più i suoi dati; il suo account e i suoi dati restano a lui.`, fn: async () => { try { await pt.rimuoviCliente(id); onRimosso(id); } catch (e) { setMsg(`Errore: ${e.message}`); } } })}>
            Scollega cliente
          </button>
        </div>
      )}

      {credenziali && <Credenziali cliente={cliente} password={credenziali} onClose={() => setCredenziali(null)} />}
      {conferma && <ConfirmModal message={conferma.msg} onConfirm={() => { conferma.fn(); setConferma(null); }} onCancel={() => setConferma(null)} />}
    </div>
  );
}

// ─── Schermata principale ────────────────────────────────────────
export default function Clienti({ trainer, SchedaEdit, PianoEdit }) {
  const [clienti, setClienti] = useState(null);
  const [riep, setRiep] = useState({});
  const [err, setErr] = useState("");
  const [selId, setSelId] = useState(null);
  const [nuovo, setNuovo] = useState(false);
  const [credenziali, setCredenziali] = useState(null);
  const [cerca, setCerca] = useState("");

  const carica = useCallback(async () => {
    setErr("");
    try {
      const lista = await pt.clienti();
      setClienti(lista);
      setRiep(await pt.riepilogo(lista.map(c => c.cliente_id)));
    } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { carica(); }, [carica]);

  const filtrati = useMemo(() => (clienti || []).filter(c => `${c.nome} ${c.email}`.toLowerCase().includes(cerca.toLowerCase())), [clienti, cerca]);
  const sel = clienti?.find(c => c.cliente_id === selId);

  return (
    <div className={`pt-grid${sel ? " has-sel" : ""}`}>
      <div className="pt-list">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingTop: 20, paddingBottom: 12 }}>
          <div><h1 className="pt">Clienti</h1><p className="sub">{trainer.nome ? `${trainer.nome} · ` : ""}{clienti ? `${clienti.length} clienti` : "…"}</p></div>
          <button className="btn btn-p" onClick={() => setNuovo(true)}><IcPlus /> Nuovo</button>
        </div>
        {clienti?.length > 5 && <input className="inp" placeholder="Cerca cliente…" value={cerca} onChange={e => setCerca(e.target.value)} style={{ marginBottom: 10 }} />}
        {err && <div className="ai-err">{err} <button className="btn btn-s" onClick={carica}>Riprova</button></div>}
        {!clienti && !err && <div className="pls" style={{ color: "var(--dim)", padding: 12 }}>Caricamento…</div>}
        {clienti && clienti.length === 0 && (
          <div className="emp"><div className="emp-t">Nessun cliente</div>
            <div style={{ fontSize: 13, color: "var(--dim)", maxWidth: 280, margin: "0 auto" }}>Crea l'account del tuo primo cliente: riceverai una password temporanea da inviargli.</div>
            <button className="btn btn-p" style={{ marginTop: 16 }} onClick={() => setNuovo(true)}><IcPlus /> Nuovo cliente</button></div>
        )}
        {filtrati.map(c => {
          const s = statoCliente(riep[c.cliente_id]);
          return (
            <button key={c.cliente_id} className={`card pt-row${c.cliente_id === selId ? " on" : ""}`} onClick={() => setSelId(c.cliente_id)}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.colore, flexShrink: 0 }} aria-hidden="true" />
              <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <span style={{ display: "block", fontWeight: 800, fontSize: 15 }}>{c.nome}</span>
                <span style={{ display: "block", fontSize: 12, color: "var(--dim)" }}>{s.testo}</span>
              </span>
              <IcChevR />
            </button>
          );
        })}
      </div>
      <div className="pt-detail">
        {sel ? (
          <DettaglioCliente cliente={sel} SchedaEdit={SchedaEdit} PianoEdit={PianoEdit} onBack={() => setSelId(null)}
            onAggiornato={c => setClienti(l => l.map(x => x.cliente_id === c.cliente_id ? c : x))}
            onRimosso={rid => { setSelId(null); setClienti(l => l.filter(x => x.cliente_id !== rid)); }} />
        ) : <div className="pt-vuoto">Seleziona un cliente per vedere progressi, allenamenti e dieta.</div>}
      </div>
      {nuovo && <NuovoCliente onClose={() => setNuovo(false)} onCreato={(c, pw) => { setNuovo(false); setClienti(l => [...(l || []), c].sort((a, b) => a.nome.localeCompare(b.nome))); setCredenziali({ cliente: c, password: pw }); }} />}
      {credenziali && <Credenziali cliente={credenziali.cliente} password={credenziali.password} onClose={() => setCredenziali(null)} />}
    </div>
  );
}
