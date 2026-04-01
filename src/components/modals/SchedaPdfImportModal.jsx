import { useState } from "react";
import { IcClose, IcCheck, IcFile, IcUpload } from "../Icons";
import { GROQ_SCHEDA_PROMPT } from "../../constants";
import { estraiTestoPdf, genId } from "../../utils";

export default function SchedaPdfImportModal({ groqKey, onApply, onClose }) {
  const [fase, setFase] = useState(1);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("groq_key") || "");
  const [file, setFile] = useState(null);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [errore, setErrore] = useState("");
  const [parsed, setParsed] = useState(null);

  const analizza = async () => {
    if (!file) return setErrore("Seleziona un file PDF");
    const activeKey = groqKey || apiKey.trim();
    if (!activeKey) return setErrore("Inserisci la tua Groq API key (console.groq.com)");
    if (!file.name.toLowerCase().endsWith(".pdf")) return setErrore("Il file deve essere un PDF");
    setErrore(""); setFase(2);
    try {
      setLoadingMsg("Lettura del PDF...");
      const testoPdf = await estraiTestoPdf(file);
      if (!testoPdf || testoPdf.length < 20) throw new Error("Testo non estraibile dal PDF. Verifica che non sia solo-immagine.");
      setLoadingMsg("Analisi con Groq AI...");
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${activeKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: GROQ_SCHEDA_PROMPT },
            { role: "user", content: `Testo della scheda di allenamento:\n\n${testoPdf.slice(0, 6500)}` }
          ],
          temperature: 0.1, max_tokens: 4096
        })
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Errore Groq: ${resp.status}`);
      }
      const data = await resp.json();
      const testo = data?.choices?.[0]?.message?.content || "";
      const match = testo.match(/\{[\s\S]+\}/);
      if (!match) throw new Error("Il modello non ha restituito JSON valido. Riprova.");
      const obj = JSON.parse(match[0]);
      if (!Array.isArray(obj.esercizi) || obj.esercizi.length === 0) throw new Error("Nessun esercizio trovato nel PDF.");
      localStorage.setItem("groq_key", apiKey.trim());
      setParsed(obj); setFase(3);
    } catch (e) { setErrore(e.message || "Errore sconosciuto"); setFase(1); }
  };

  const applica = () => {
    if (!parsed) return;
    const ex = parsed.esercizi.map(e => ({
      id: genId(),
      nome: String(e.nome || ""),
      serie: +e.serie || 3,
      ripetizioni: String(e.ripetizioni || "10"),
      pausa: +e.pausa || 90,
      note: String(e.note || "")
    }));
    onApply({ nomeScheda: parsed.nomeScheda || "", esercizi: ex });
    onClose();
  };

  return (
    <div className="mov" onClick={onClose}>
      <div className="mod" onClick={e => e.stopPropagation()} style={{ maxHeight: "90vh" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <span style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, letterSpacing: ".05em" }}>IMPORTA SCHEDA DA PDF</span>
          <button className="bico" onClick={onClose}><IcClose /></button>
        </div>
        {fase === 1 && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div className="import-step"><span className="import-num">1</span><span style={{ fontSize: 13 }}>Key gratuita su <b>console.groq.com</b> → API Keys</span></div>
              <div className="import-step"><span className="import-num">2</span><span style={{ fontSize: 13 }}>Carica il PDF della tua scheda di allenamento</span></div>
              <div className="import-step"><span className="import-num">3</span><span style={{ fontSize: 13 }}>LLaMA 3.3 estrae automaticamente esercizi, serie e reps</span></div>
            </div>
            {!groqKey && (
              <div className="ig">
                <label className="lbl">Groq API Key{apiKey && " ✓ salvata"}</label>
                <input className="inp" type="password" placeholder="gsk_..." value={apiKey} onChange={e => setApiKey(e.target.value)} />
                <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 4 }}>Salvata solo nel tuo browser · Free tier: 14.400 req/giorno</div>
              </div>
            )}
            <div className="ig">
              <label className="lbl">PDF scheda allenamento</label>
              <div
                style={{ border: "2px dashed var(--bdr)", borderRadius: 10, padding: "18px", textAlign: "center", cursor: "pointer", transition: "all .15s", background: file ? "var(--acc2)" : "none", borderColor: file ? "var(--acc)" : "var(--bdr)" }}
                onClick={() => document.getElementById("pdf-scheda-input").click()}
              >
                {file
                  ? <><IcFile /><div style={{ fontSize: 13, fontWeight: 600, marginTop: 6, color: "var(--acc)" }}>{file.name}</div><div style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>{(file.size / 1024).toFixed(0)} KB</div></>
                  : <><IcUpload /><div style={{ fontSize: 13, color: "var(--dim)", marginTop: 6 }}>Tocca per selezionare il PDF</div></>
                }
                <input id="pdf-scheda-input" type="file" accept=".pdf,application/pdf" style={{ display: "none" }} onChange={e => { setFile(e.target.files[0] || null); setErrore(""); }} />
              </div>
            </div>
            {errore && <div style={{ color: "var(--dan)", fontSize: 13, marginBottom: 12, padding: "10px", background: "var(--dan2)", borderRadius: 8 }}>{errore}</div>}
            <button className="btn btn-p btn-full" onClick={analizza}><IcUpload /> ANALIZZA PDF</button>
          </>
        )}
        {fase === 2 && (
          <div style={{ textAlign: "center", padding: "32px 16px" }}>
            <div className="spin" style={{ fontSize: 36, marginBottom: 16 }}>⚙️</div>
            <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, letterSpacing: ".05em", marginBottom: 8 }}>ANALISI IN CORSO</div>
            <div style={{ fontSize: 13, color: "var(--dim)", marginBottom: 4 }}>{loadingMsg}</div>
            <div style={{ fontSize: 11, color: "var(--mut)" }}>10-20 secondi</div>
          </div>
        )}
        {fase === 3 && parsed && (
          <>
            <div style={{ background: "var(--acc2)", border: "1px solid var(--acc)", borderRadius: 10, padding: 12, marginBottom: 16 }}>
              <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 16, color: "var(--acc)", marginBottom: 4 }}>✓ {parsed.esercizi.length} ESERCIZI ESTRATTI</div>
              {parsed.nomeScheda && <div style={{ fontSize: 13, fontWeight: 600 }}>{parsed.nomeScheda}</div>}
            </div>
            <div className="st" style={{ marginBottom: 8 }}>ANTEPRIMA ESERCIZI</div>
            <div style={{ maxHeight: 260, overflowY: "auto" }}>
              {parsed.esercizi.map((e, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--bdr)" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{e.nome}</div>
                  <div style={{ fontSize: 11, color: "var(--dim)", flexShrink: 0, marginLeft: 8 }}>{e.serie}×{e.ripetizioni} · {e.pausa}s</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <button className="btn btn-s" style={{ flex: 1 }} onClick={() => { setParsed(null); setFase(1); }}>RIPROVA</button>
              <button className="btn btn-p" style={{ flex: 2 }} onClick={applica}><IcCheck /> APPLICA ALLA SCHEDA</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
