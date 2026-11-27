import { useState, useEffect, useRef } from "react";
import { IcClose, IcPlay } from "../Icons";
import { chiediAI, normalizzaAzioni } from "../../ai";
import { contestoUtente } from "../../aiContesto";
import { pastiPerCoach } from "../../dieta";
import { fmtIso } from "../../utils";
import Markdown from "./Markdown";

const SUGGERIMENTI = [
  "Ho mangiato il pranzo del piano",
  "Ho bevuto mezzo litro d'acqua",
  "Cosa mangio a cena?",
  "Come sto andando con la dieta?",
];

// Iron Coach: risponde alle domande e REGISTRA quello che gli scrivi di aver mangiato o bevuto.
// onRegistra(azioni) applica le azioni a diario e acqua e restituisce { testo, annulla }.
export default function ChatAI({ dati, onRegistra, onClose }) {
  const [msgs, setMsgs] = useState([{ role: "assistant", content: "Ciao! Sono **Iron Coach**. Scrivimi cosa hai mangiato o bevuto e lo segno io nel diario, oppure chiedimi un consiglio." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef();

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [msgs, loading]);

  const send = async (text) => {
    const domanda = (text || input).trim();
    if (!domanda || loading) return;
    setInput("");
    const nuovi = [...msgs, { role: "user", content: domanda }];
    setMsgs(nuovi);
    setLoading(true);
    try {
      const res = await chiediAI("coach", {
        messages: nuovi.slice(1).map(m => ({ role: m.role, content: m.content })),
        contesto: contestoUtente(dati),
        pasti: pastiPerCoach(dati.piani || [], dati.logDieta || [], fmtIso()),
      });
      const risposta = typeof res === "string" ? res : (res?.risposta || "Non ho una risposta, riprova.");
      const azioni = normalizzaAzioni(res?.azioni);
      let registrato = null;
      if ((azioni.pasti.length || azioni.extra.length || azioni.acqua) && onRegistra) {
        try { registrato = await onRegistra(azioni); }
        catch (e) { registrato = { testo: `Non sono riuscito a salvare: ${e.message}`, errore: true }; }
      }
      setMsgs(p => [...p, { role: "assistant", content: risposta, registrato }]);
    } catch (e) {
      setMsgs(p => [...p, { role: "assistant", content: `⚠️ ${e.message}` }]);
    } finally { setLoading(false); }
  };

  const annulla = async i => {
    const m = msgs[i];
    if (!m?.registrato?.annulla) return;
    await m.registrato.annulla();
    setMsgs(p => p.map((x, j) => j === i ? { ...x, registrato: { testo: "Registrazione annullata", annullato: true } } : x));
  };

  return (
    <div className="chat-win" role="dialog" aria-label="Iron Coach">
      <div className="chat-h">
        <div>
          <div className="wt" style={{ fontSize: 20 }}>Iron Coach <span className="ai-tag">AI</span></div>
          <div style={{ fontSize: 12, color: "var(--dim)" }}>Dimmi cosa hai mangiato: aggiorno io diario e acqua</div>
        </div>
        <button className="bico" onClick={onClose} aria-label="Chiudi"><IcClose /></button>
      </div>
      <div className="chat-msgs" ref={scrollRef}>
        {msgs.map((m, i) => m.role === "user"
          ? <div key={i} className="msg user">{m.content}</div>
          : (
            <div key={i} className="msg ai">
              <Markdown testo={m.content} />
              {m.registrato && (
                <div className={`chat-reg${m.registrato.errore ? " err" : ""}${m.registrato.annullato ? " off" : ""}`}>
                  <span>{m.registrato.errore || m.registrato.annullato ? "" : "✓ Registrato: "}{m.registrato.testo}</span>
                  {m.registrato.annulla && <button onClick={() => annulla(i)}>Annulla</button>}
                </div>
              )}
            </div>
          ))}
        {loading && <div className="msg ai pls">Sto pensando…</div>}
      </div>
      <div className="chat-f">
        {!loading && msgs.length < 3 && (
          <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
            {SUGGERIMENTI.map(s => <button key={s} className="chip" style={{ whiteSpace: "nowrap" }} onClick={() => send(s)}>{s}</button>)}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <input className="inp" id="coach-input" aria-label="Messaggio per il coach" placeholder="Es. a pranzo ho mangiato tutto più una birra" value={input} maxLength={1000}
            onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} />
          <button className="btn btn-p" onClick={() => send()} disabled={loading || !input.trim()} aria-label="Invia"><IcPlay /></button>
        </div>
      </div>
    </div>
  );
}
