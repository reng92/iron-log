import { useState } from "react";
import { IcClose, IcCheck, IcFile, IcUpload } from "../Icons";
import { GROQ_PROMPT, GROQ_DAY_PROMPT } from "../../constants";
import { estraiTestoPdf, genId } from "../../utils";
import { GIORNI_LABEL } from "../../utils";

// Split del testo del PDF per giorno. Strategia: trova tutte le posizioni dei marker "GIORNO N",
// poi per ogni giorno prende il testo da quella posizione fino al prossimo marker (o fine sezione).
function splitTestoPerGiorno(testoRaw) {
  // Normalizza spazi unicode e collassa whitespace per rendere robusto il match
  const testo = testoRaw.replace(/[    ]/g, " ");

  // Trova tutte le occorrenze di "GIORNO N" (N 1-7), case-insensitive
  const markerRe = /GIORNO\s+([1-7])(?!\d)/gi;
  const markers = [];
  let m;
  while ((m = markerRe.exec(testo)) !== null) {
    markers.push({ n: parseInt(m[1], 10), start: m.index });
  }

  // Trova fine sezione giorni (sezioni informative dopo i 7 giorni)
  const endRe = /(ELENCO\s+FONT|COTTURE\b|SALSE\s+AMMESSE)/i;
  const endMatch = testo.match(endRe);
  const endPos = endMatch ? endMatch.index : testo.length;

  const giorni = {};
  for (let i = 0; i < markers.length; i++) {
    const { n, start } = markers[i];
    if (n < 1 || n > 7 || giorni[n]) continue;
    const nextStart = (markers[i + 1] && markers[i + 1].start > start)
      ? markers[i + 1].start
      : endPos;
    giorni[n] = testo.substring(start, nextStart).trim();
  }

  console.log(`[PDF Import] Markers trovati: ${markers.length}, giorni unici: ${Object.keys(giorni).length}`);
  Object.entries(giorni).forEach(([n, t]) => console.log(`[PDF Import] G${n}: ${t.length} caratteri`));

  return giorni;
}

// Estrae il nome del piano dalla testata del PDF
function estraiNomePiano(testo) {
  const head = testo.slice(0, 400);
  const lineMatch = head.match(/PIANO\s+ALIMENTARE[^\n]{0,80}/i);
  if (lineMatch) return lineMatch[0].trim().replace(/\s+/g, " ");
  return "";
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Chiama Groq per UN solo giorno e ritorna l'array pasti.
// Modello "llama-3.1-8b-instant": rate limit più alti del 70b, sufficiente per task strutturato con response_format json.
async function estraiPastiGiorno(testoGiorno, giornoNum, apiKey, tentativo = 1) {
  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: GROQ_DAY_PROMPT },
        { role: "user", content: `Testo del Giorno ${giornoNum}:\n\n${testoGiorno}` }
      ],
      temperature: 0.05, max_tokens: 4000,
      response_format: { type: "json_object" }
    })
  });
  if (!resp.ok) {
    // Backoff su 429 (rate limit) e 503 (sovraccarico)
    if ((resp.status === 429 || resp.status === 503) && tentativo < 4) {
      const wait = 2000 * tentativo;
      console.warn(`[PDF Import] G${giornoNum}: ${resp.status}, retry in ${wait}ms (tentativo ${tentativo})`);
      await sleep(wait);
      return estraiPastiGiorno(testoGiorno, giornoNum, apiKey, tentativo + 1);
    }
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Errore Groq G${giornoNum}: ${resp.status}`);
  }
  const data = await resp.json();
  const testo = data?.choices?.[0]?.message?.content || "";
  const match = testo.match(/\{[\s\S]+\}/);
  if (!match) throw new Error(`G${giornoNum}: il modello non ha restituito JSON valido`);
  const obj = JSON.parse(match[0]);
  const pasti = obj.pasti || obj.meals || [];
  // namespace altGroupId per evitare collisioni fra giorni
  return pasti.map(p => ({
    ...p,
    altGroupId: p.altGroupId ? `g${giornoNum}-${p.altGroupId}` : null
  }));
}

export default function PdfImportModal({ groqKey, onApply, onClose }) {
  const [fase, setFase] = useState(1);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("groq_key") || "");
  const [file, setFile] = useState(null);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [errore, setErrore] = useState("");
  const [parsed, setParsed] = useState(null);

  const analizza = async () => {
    if (!file) return setErrore("Seleziona un file PDF");
    const activeKey = groqKey || apiKey.trim();
    if (!activeKey) return setErrore("Inserisci la tua Groq API key");
    if (!file.name.toLowerCase().endsWith(".pdf")) return setErrore("Il file deve essere un PDF");
    setErrore(""); setFase(2);
    try {
      setLoadingMsg("Lettura del PDF in corso...");
      const testoPdf = await estraiTestoPdf(file);
      if (!testoPdf || testoPdf.length < 50) throw new Error("Testo non estraibile — verifica che il PDF non sia solo-immagine.");

      const blocchiPerGiorno = splitTestoPerGiorno(testoPdf);
      const giorniTrovati = Object.keys(blocchiPerGiorno).map(Number).sort();
      const nomePiano = estraiNomePiano(testoPdf);

      let giorniPasti = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };

      if (giorniTrovati.length >= 1) {
        // ── Modalità multi-giorno: chiamate SEQUENZIALI (evita rate limit Groq free tier) ──
        const erroriFinali = [];
        let idx = 0;
        for (const n of giorniTrovati) {
          idx++;
          setLoadingMsg(`Analisi giorno ${idx}/${giorniTrovati.length}: ${GIORNI_LABEL[n]}...`);
          try {
            const pasti = await estraiPastiGiorno(blocchiPerGiorno[n], n, activeKey);
            giorniPasti[n] = pasti;
          } catch (e) {
            console.warn(`[PDF Import] G${n} fallito:`, e.message);
            erroriFinali.push(`G${n}: ${e.message || "errore"}`);
          }
          // piccolo delay tra chiamate per stare comodi sotto il rate limit
          if (idx < giorniTrovati.length) await sleep(400);
        }
        if (erroriFinali.length === giorniTrovati.length) throw new Error(erroriFinali.join(" | "));
        if (erroriFinali.length > 0) {
          console.warn("Alcuni giorni non estratti:", erroriFinali);
        }
      } else {
        // ── Fallback: PDF tabellare classico, 1 sola chiamata col vecchio prompt ──
        setLoadingMsg("Analisi con Groq AI (formato tabella)...");
        const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${activeKey}` },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: GROQ_PROMPT },
              { role: "user", content: `Testo del piano alimentare:\n\n${testoPdf.slice(0, 24000)}` }
            ],
            temperature: 0.1, max_tokens: 16000,
            response_format: { type: "json_object" }
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
        if (!obj.giorniPasti) throw new Error("Struttura JSON non riconosciuta.");
        for (let d = 1; d <= 7; d++) {
          giorniPasti[d] = obj.giorniPasti[d] || obj.giorniPasti[String(d)] || [];
        }
      }

      localStorage.setItem("groq_key", apiKey.trim());
      setParsed({ nomePiano, giorniPasti });
      setFase(3);
    } catch (e) { setErrore(e.message || "Errore sconosciuto"); setFase(1); }
  };

  const applica = () => {
    if (!parsed) return;
    const gp = {};
    for (let d = 1; d <= 7; d++) {
      gp[d] = (parsed.giorniPasti[d] || parsed.giorniPasti[String(d)] || []).map(p => ({
        ...p, id: genId(),
        altGroupId: p.altGroupId || null,
        alimenti: (p.alimenti || []).map(a => {
          const name = a.nome || a.alimento || a.food || a.name || "";
          const qty = a.grammi || a.peso || a.weight || a.qta || a.amount || "";
          const cal = a.kcal || a.calorie || a.calories || a.cal || "";
          return { ...a, id: genId(), nome: String(name), grammi: String(qty), kcal: String(cal) };
        })
      }));
    }
    onApply({ nomePiano: parsed.nomePiano || "", giorniPasti: gp });
    onClose();
  };

  return (
    <div className="mov" onClick={onClose}>
      <div className="mod" onClick={e => e.stopPropagation()} style={{ maxHeight: "90vh" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <span style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, letterSpacing: ".05em" }}>IMPORTA DA PDF</span>
          <button className="bico" onClick={onClose}><IcClose /></button>
        </div>
        {fase === 1 && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div className="import-step"><span className="import-num">1</span><span style={{ fontSize: 13 }}>Key gratuita su <b>console.groq.com</b> → API Keys</span></div>
              <div className="import-step"><span className="import-num">2</span><span style={{ fontSize: 13 }}>Carica il PDF — l'AI estrae pasti, alternative e kcal automaticamente</span></div>
            </div>
            {!groqKey && (
              <div className="ig">
                <label className="lbl">Groq API Key{apiKey && " ✓ salvata"}</label>
                <input className="inp" type="password" placeholder="gsk_..." value={apiKey} onChange={e => setApiKey(e.target.value)} />
              </div>
            )}
            <div className="ig">
              <label className="lbl">File PDF</label>
              <div
                style={{ border: "2px dashed var(--bdr)", borderRadius: 10, padding: "18px", textAlign: "center", cursor: "pointer", background: file ? "var(--acc2)" : "none", borderColor: file ? "var(--acc)" : "var(--bdr)" }}
                onClick={() => document.getElementById("pdf-input").click()}
              >
                {file
                  ? <><IcFile /><div style={{ fontSize: 13, fontWeight: 600, marginTop: 6, color: "var(--acc)" }}>{file.name}</div><div style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>{(file.size / 1024).toFixed(0)} KB</div></>
                  : <><IcUpload /><div style={{ fontSize: 13, color: "var(--dim)", marginTop: 6 }}>Tocca per selezionare il PDF</div></>
                }
                <input id="pdf-input" type="file" accept=".pdf,application/pdf" style={{ display: "none" }} onChange={e => { setFile(e.target.files[0] || null); setErrore(""); }} />
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
          </div>
        )}
        {fase === 3 && parsed && (
          <>
            <div style={{ background: "rgba(48,209,88,.1)", border: "1px solid #30D158", borderRadius: 10, padding: 12, marginBottom: 16 }}>
              <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 16, color: "#30D158", marginBottom: 4 }}>✓ ESTRATTO CON SUCCESSO</div>
              {parsed.nomePiano && <div style={{ fontSize: 13, fontWeight: 600 }}>{parsed.nomePiano}</div>}
            </div>
            <div className="st" style={{ marginBottom: 8 }}>ANTEPRIMA</div>
            {[1, 2, 3, 4, 5, 6, 7].map(d => {
              const pasti = parsed.giorniPasti[d] || parsed.giorniPasti[String(d)] || [];
              const seen = new Set();
              const kcal = pasti.reduce((a, p) => {
                if (p.altGroupId && seen.has(p.altGroupId)) return a;
                if (p.altGroupId) seen.add(p.altGroupId);
                return a + p.alimenti.reduce((b, al) => b + (+al.kcal || 0), 0);
              }, 0);
              const hasAlts = pasti.some(p => p.altGroupId);
              return (
                <div key={d} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--bdr)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{GIORNI_LABEL[d]}</div>
                    {hasAlts && <span style={{ fontSize: 9, fontWeight: 700, background: "rgba(255,149,0,.15)", color: "#FF9500", padding: "2px 6px", borderRadius: 20 }}>⇄ ALT</span>}
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--dim)" }}>{pasti.length} pasti</span>
                    <span style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 16, color: "#30D158" }}>{kcal > 0 ? `${kcal} kcal` : "—"}</span>
                  </div>
                </div>
              );
            })}
            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <button className="btn btn-s" style={{ flex: 1 }} onClick={() => { setParsed(null); setFase(1); }}>RIPROVA</button>
              <button className="btn btn-p" style={{ flex: 2, background: "#30D158" }} onClick={applica}><IcCheck /> APPLICA AL PIANO</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
