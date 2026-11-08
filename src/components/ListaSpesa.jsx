import { useEffect, useMemo, useState } from "react";
import { genId, fmtIso, fmtShort, pianoAttivo, listaSpesaDaPiano } from "../utils";
import { Ico, IcPlus, IcTrash } from "./Icons";
import ConfirmModal from "./modals/ConfirmModal";

const ORDINE_CAT = ["Frutta e verdura", "Carne e pesce", "Salumi", "Latticini e uova", "Pane e cereali", "Surgelati", "Dispensa", "Dal piano"];
const eur = n => (+n || 0).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const parseEur = s => { const n = parseFloat(String(s).replace(",", ".")); return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null; };

export default function ListaSpesa({ piani, spese, onSave, onDelete }) {
  const [pianoId, setPianoId] = useState(() => pianoAttivo(piani)?.id || piani[0]?.id || "");
  const [importoTxt, setImportoTxt] = useState("");
  const [extraNome, setExtraNome] = useState("");
  const [apriStorico, setApriStorico] = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  const piano = piani.find(p => p.id === pianoId);
  const lista = useMemo(() => listaSpesaDaPiano(piano), [piano]);
  const sessione = spese.find(s => s.pianoId === pianoId && !s.chiusa) || null;
  const chiuse = spese.filter(s => s.chiusa).sort((a, b) => (b.data || "").localeCompare(a.data || ""));

  // Ultima volta che una voce è stata presa in una spesa chiusa dello stesso piano
  const presoPrima = useMemo(() => {
    const m = {};
    spese.filter(s => s.chiusa && s.pianoId === pianoId).forEach(s => {
      Object.keys(s.presi || {}).forEach(k => { if (s.presi[k] && (!m[k] || s.data > m[k])) m[k] = s.data; });
    });
    return m;
  }, [spese, pianoId]);

  useEffect(() => { setImportoTxt(sessione?.importo != null ? String(sessione.importo).replace(".", ",") : ""); }, [sessione?.id, sessione?.importo]);

  const nuovaSessione = () => ({ id: genId(), pianoId, pianoNome: piano?.nome || "", data: fmtIso(), presi: {}, importo: null, extra: [], chiusa: false });
  const aggiorna = patch => onSave({ ...(sessione || nuovaSessione()), ...patch });

  const togglePreso = id => {
    const presi = { ...(sessione?.presi || {}) };
    if (presi[id]) delete presi[id]; else presi[id] = true;
    aggiorna({ presi });
  };

  const salvaImporto = () => {
    const v = importoTxt.trim() === "" ? null : parseEur(importoTxt);
    if (importoTxt.trim() !== "" && v === null) return;
    if (v === (sessione?.importo ?? null)) return;
    aggiorna({ importo: v });
  };

  const addExtra = () => {
    const nome = extraNome.trim();
    if (!nome) return;
    aggiorna({ extra: [...(sessione?.extra || []), { id: "x_" + genId(), nome }] });
    setExtraNome("");
  };
  const delExtra = id => {
    const presi = { ...(sessione?.presi || {}) }; delete presi[id];
    aggiorna({ extra: (sessione?.extra || []).filter(x => x.id !== id), presi });
  };

  const voci = [...lista, ...(sessione?.extra || []).map(x => ({ ...x, cat: "Extra", qta: "", uso: "" }))];
  const g = {};
  voci.forEach(v => { const c = v.cat || "Altro"; (g[c] = g[c] || []).push(v); });
  const ord = c => { const i = ORDINE_CAT.indexOf(c); return i < 0 ? (c === "Extra" ? 99 : 50) : i; };
  const gruppi = Object.entries(g).sort((a, b) => ord(a[0]) - ord(b[0]));

  const nPresi = voci.filter(v => sessione?.presi?.[v.id]).length;
  const totaleSpeso = chiuse.reduce((a, s) => a + (+s.importo || 0), 0);

  if (!piani.length) {
    return <div className="emp"><div className="emp-ic"></div><div className="emp-t">Nessun piano</div><p style={{ fontSize: 13 }}>Crea un piano alimentare per generare la lista della spesa</p></div>;
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 12 }}>
        <label className="lbl">Piano</label>
        <select className="inp" value={pianoId} onChange={e => setPianoId(e.target.value)}>
          {piani.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12, alignItems: "end" }}>
          <div>
            <div className="st" style={{ margin: 0 }}>Presi</div>
            <div style={{ fontFamily: "var(--fd)", fontSize: 28, color: nPresi && nPresi === voci.length ? "var(--ok)" : "var(--txt)" }}>
              {nPresi} / {voci.length}
            </div>
          </div>
          <div>
            <label className="lbl">Speso (€)</label>
            <input className="inp" inputMode="decimal" placeholder="0,00" value={importoTxt}
              onChange={e => setImportoTxt(e.target.value)} onBlur={salvaImporto}
              onKeyDown={e => e.key === "Enter" && e.currentTarget.blur()} />
          </div>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: "var(--bdr)", marginTop: 12, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${voci.length ? (nPresi / voci.length) * 100 : 0}%`, background: "var(--ok)", transition: "width .2s" }} />
        </div>
        <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 8 }}>
          {sessione ? `Spesa in corso dal ${fmtShort(sessione.data + "T12:00:00")}` : "Spunta un articolo per iniziare una nuova spesa"}
        </div>
      </div>

      {gruppi.map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: 14 }}>
          <div className="st" style={{ marginBottom: 6 }}>{cat}</div>
          <div className="card" style={{ padding: "4px 12px" }}>
            {items.map(v => {
              const preso = !!sessione?.presi?.[v.id];
              return (
                <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--bdr)" }}>
                  <button className={`fck${preso ? " ok" : ""}`} onClick={() => togglePreso(v.id)} aria-label={preso ? "Segna come non preso" : "Segna come preso"}>
                    {preso && <Ico d="M20 6L9 17l-5-5" size={12} stroke="#fff" sw={2.5} />}
                  </button>
                  <div style={{ flex: 1, minWidth: 0, opacity: preso ? .45 : 1, cursor: "pointer" }} onClick={() => togglePreso(v.id)}>
                    <div style={{ fontWeight: 600, fontSize: 13, textDecoration: preso ? "line-through" : "none" }}>{v.nome}</div>
                    {(v.uso || presoPrima[v.id]) && (
                      <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 1 }}>
                        {v.uso}{v.uso && presoPrima[v.id] ? " · " : ""}
                        {presoPrima[v.id] && <span style={{ color: "var(--ok)" }}>preso il {fmtShort(presoPrima[v.id] + "T12:00:00")}</span>}
                      </div>
                    )}
                  </div>
                  {v.qta && <div style={{ fontFamily: "var(--fd)", fontSize: 15, color: preso ? "var(--dim)" : "var(--acc)", flexShrink: 0, textAlign: "right", maxWidth: 110 }}>{v.qta}</div>}
                  {v.cat === "Extra" && <button className="bico d" onClick={() => delExtra(v.id)}><IcTrash /></button>}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input className="inp" placeholder="Aggiungi articolo extra (es. detersivo)" value={extraNome}
          onChange={e => setExtraNome(e.target.value)} onKeyDown={e => e.key === "Enter" && addExtra()} />
        <button className="btn btn-s" onClick={addExtra}><IcPlus /></button>
      </div>

      {sessione && (
        <button className="btn btn-p btn-full" style={{ marginBottom: 20 }} onClick={() => setConfirmState({
          msg: `Chiudere questa spesa (${nPresi} articoli${sessione.importo != null ? `, ${eur(sessione.importo)}` : ""})? Finirà nello storico e la prossima spesa ripartirà da zero.`,
          onConfirm: () => onSave({ ...sessione, importo: parseEur(importoTxt) ?? sessione.importo ?? null, chiusa: true, chiusaIl: fmtIso() }),
        })}>
          ✓ CHIUDI SPESA
        </button>
      )}

      <div className="st" style={{ display: "flex", justifyContent: "space-between" }}>
        <span>Storico spese</span>
        {chiuse.length > 0 && <span style={{ color: "var(--acc)" }}>Totale {eur(totaleSpeso)}</span>}
      </div>
      {chiuse.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--mut)", marginBottom: 20 }}>Nessuna spesa chiusa</div>
      ) : chiuse.map(s => {
        const n = Object.values(s.presi || {}).filter(Boolean).length;
        const aperta = apriStorico === s.id;
        const pianoS = piani.find(p => p.id === s.pianoId);
        const nomi = aperta ? [...listaSpesaDaPiano(pianoS), ...(s.extra || [])].filter(v => s.presi?.[v.id]).map(v => v.nome) : [];
        return (
          <div key={s.id} className="card" style={{ marginBottom: 8, cursor: "pointer" }} onClick={() => setApriStorico(aperta ? null : s.id)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{fmtShort(s.data + "T12:00:00")}</div>
                <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {n} articoli · {s.pianoNome || pianoS?.nome || "piano eliminato"}
                </div>
              </div>
              <div style={{ fontFamily: "var(--fd)", fontSize: 20, color: "var(--acc)" }}>{s.importo != null ? eur(s.importo) : "—"}</div>
              <button className="bico d" onClick={e => { e.stopPropagation(); setConfirmState({ msg: `Eliminare la spesa del ${fmtShort(s.data + "T12:00:00")}?`, onConfirm: () => onDelete(s.id) }); }}><IcTrash /></button>
            </div>
            {aperta && (
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--dim)", lineHeight: 1.5 }}>
                {nomi.length ? nomi.join(" · ") : "Dettaglio non disponibile"}
              </div>
            )}
          </div>
        );
      })}

      {confirmState && <ConfirmModal message={confirmState.msg} onConfirm={() => { confirmState.onConfirm(); setConfirmState(null); }} onCancel={() => setConfirmState(null)} />}
    </>
  );
}
