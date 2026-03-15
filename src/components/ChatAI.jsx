import React, { useState, useEffect, useRef, useMemo } from 'react';
import { IcClose, IcPlay } from './Icons';
import { epley, fmtShort } from '../utils';

const getStatsSummary = (settings, peso, logDieta, piani, sessioni) => {
  const ultimoPeso = peso[peso.length - 1];
  const primoPeso = peso[0];
  const deltaPeso = (ultimoPeso && primoPeso) ? (ultimoPeso.valore - primoPeso.valore).toFixed(1) : null;
  
  const pianoAttivo = piani.find(p => p.id === (logDieta[0]?.pianoId || (piani[0]?.id)));
  const oggiIso = new Date().toISOString().split('T')[0];
  const logOggi = logDieta.find(l => l.data === oggiIso);
  const ultimaSess = sessioni[0];

  // Calcolo frequenza ultimi 7 giorni
  const unaSettimanaFa = new Date();
  unaSettimanaFa.setDate(unaSettimanaFa.getDate() - 7);
  const sessUltimaSett = sessioni.filter(s => new Date(s.data) >= unaSettimanaFa).length;

  // Calcolo Top 3 Record
  const records = {};
  sessioni.forEach(s => s.esercizi.forEach(e => e.serie.filter(sr => sr.completata && +sr.kg > 0).forEach(sr => {
    if (!records[e.nome] || +sr.kg > records[e.nome]) records[e.nome] = +sr.kg;
  })));
  const topRecords = Object.entries(records)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([nome, kg]) => `${nome}: ${kg}kg`)
    .join(", ");

  return `--- CONTESTO UTENTE ---
Nome: ${settings.nome || 'Renato'}
Caratteristiche: ${settings.sesso || '?'}, ${settings.eta || '?'} anni, ${settings.altezza || '?'}cm
Peso Attuale: ${ultimoPeso ? ultimoPeso.valore + 'kg' : 'n/d'} (Variazione totale: ${deltaPeso ? (deltaPeso > 0 ? '+' : '') + deltaPeso + 'kg' : 'n/d'})
Allenamenti (ultimi 7gg): ${sessUltimaSett}
Top Record: ${topRecords || 'Nessuno'}
Ultimo Allenamento: ${ultimaSess ? ultimaSess.schedaNome + ' (' + new Date(ultimaSess.data).toLocaleDateString() + ')' : 'Nessuno'}
Piano Alimentare: ${pianoAttivo ? pianoAttivo.nome : 'Nessuno'}
Dieta Oggi (${oggiIso}): ${logOggi ? logOggi.totKcalConsumate + ' / ' + logOggi.totKcalPreviste + ' kcal' : 'Nessun log'}
----------------------`;
};

const SUGGESTIONS = [
  "Analizza i miei progressi",
  "Consigli dietetici per oggi",
  "Com'è andato l'ultimo allenamento?",
  "Cosa dovrei allenare domani?"
];

export default function ChatAI({ settings, peso, logDieta, piani, sessioni, onClose }) {
  const [msgs, setMsgs] = useState([
    { role: 'ai', content: `Ciao ${settings.nome || 'Renato'}! 👋 Sono il tuo coach virtuale. Come posso aiutarti oggi?` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, loading]);

  const send = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;
    
    if (!text) setInput("");
    
    const newMsgs = [...msgs, { role: 'user', content: userMsg }];
    setMsgs(newMsgs); 
    setLoading(true);

    try {
      const stats = getStatsSummary(settings, peso, logDieta, piani, sessioni);
      const groqKey = process.env.REACT_APP_GROQ_KEY || localStorage.getItem('groq_key');
      
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: `Sei il coach personale di Iron Log. Rispondi in modo professionale ed empatico. Parla in Italiano.\n${stats}` },
            ...newMsgs.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }))
          ],
          temperature: 0.7, max_tokens: 500
        })
      });
      
      const data = await res.json();
      const reply = data?.choices?.[0]?.message?.content || "Scusami, ho avuto un problema tecnico.";
      setMsgs(prev => [...prev, { role: 'ai', content: reply }]);
    } catch (e) {
      setMsgs(prev => [...prev, { role: 'ai', content: "Errore di connessione. Verifica la tua API Key nelle impostazioni della dieta." }]);
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="chat-win">
      <div className="chat-h">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--acc2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🤖</div>
          <div><div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 18, letterSpacing: ".05em" }}>IRON COACH</div></div>
        </div>
        <button className="bico" onClick={onClose}><IcClose /></button>
      </div>
      
      <div className="chat-msgs" ref={scrollRef}>
        {msgs.map((m, i) => (<div key={i} className={`msg ${m.role}`}>{m.content}</div>))}
        {loading && <div className="msg ai pls">...sto analizzando i dati...</div>}
      </div>

      <div className="chat-f" style={{ flexDirection: 'column', gap: 10 }}>
        {/* Suggerimenti Rapidi */}
        {!loading && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, width: '100%' }}>
            {SUGGESTIONS.map(s => (
              <button 
                key={s} 
                className="chip" 
                style={{ whiteSpace: 'nowrap', fontSize: 11, padding: '6px 12px' }}
                onClick={() => send(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          <input className="inp" placeholder="Chiedimi consigli..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} />
          <button className="btn btn-p" onClick={() => send()} disabled={loading} style={{ padding: "0 18px" }}><IcPlay /></button>
        </div>
      </div>
    </div>
  );
}
