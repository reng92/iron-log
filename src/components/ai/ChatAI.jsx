import { useState, useEffect, useRef } from "react";
import { IcClose, IcPlay } from "../Icons";
import { chiediAI } from "../../ai";
import { contestoUtente } from "../../aiContesto";

const SUGGERIMENTI = [
  "Analizza i miei progressi",
  "Come sto andando con la dieta?",
  "Cosa alleno domani?",
  "Perché il peso è fermo?",
];

export default function ChatAI({ dati, onClose }) {
  const [msgs, setMsgs] = useState([{ role: "assistant", content: "Ciao! Sono Iron Coach. Conosco i tuoi allenamenti, il peso e la dieta: chiedimi pure." }]);
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
      const risposta = await chiediAI("chat", { messages: nuovi.slice(1), contesto: contestoUtente(dati) });
      setMsgs(p => [...p, { role: "assistant", content: risposta || "Non ho una risposta, riprova." }]);
    } catch (e) {
      setMsgs(p => [...p, { role: "assistant", content: `⚠️ ${e.message}` }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="chat-win" role="dialog" aria-label="Iron Coach">
      <div className="chat-h">
        <div>
          <div className="wt" style={{ fontSize: 20 }}>Iron Coach <span className="ai-tag">AI</span></div>
          <div style={{ fontSize: 12, color: "var(--dim)" }}>Consigli generici, non sostituisce medico o nutrizionista</div>
        </div>
        <button className="bico" onClick={onClose} aria-label="Chiudi"><IcClose /></button>
      </div>
      <div className="chat-msgs" ref={scrollRef}>
        {msgs.map((m, i) => <div key={i} className={`msg ${m.role === "user" ? "user" : "ai"}`}>{m.content}</div>)}
        {loading && <div className="msg ai pls">Sto guardando i tuoi dati…</div>}
      </div>
      <div className="chat-f">
        {!loading && msgs.length < 3 && (
          <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
            {SUGGERIMENTI.map(s => <button key={s} className="chip" style={{ whiteSpace: "nowrap" }} onClick={() => send(s)}>{s}</button>)}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <input className="inp" placeholder="Scrivi una domanda…" value={input} maxLength={1000}
            onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} />
          <button className="btn btn-p" onClick={() => send()} disabled={loading || !input.trim()} aria-label="Invia"><IcPlay /></button>
        </div>
      </div>
    </div>
  );
}
