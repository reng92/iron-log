import { useState } from "react";
import { IcClose, IcCheck, IcFile, IcUpload } from "../Icons";
import { GROQ_PROMPT, GROQ_DAY_PROMPT } from "../../constants";
import { estraiTestoPdf, genId } from "../../utils";
import { GIORNI_LABEL } from "../../utils";

function splitTestoPerGiorno(testoRaw) {
  const testo = testoRaw.replace(/[  -​  　]/g, " ");
  const markerRe = /GIORNO\s+([1-7])(?!\d)/gi;
  const markers = [];
  let m;
  while ((m = markerRe.exec(testo)) !== null) {
    markers.push({ n: parseInt(m[1], 10), start: m.index });
  }
  const endRe = /(ELENCO\s+FONT|COTTURE\b|SALSE\s+AMMESSE)/i;
  const endMatch = testo.match(endRe);
  const endPos = endMatch ? endMatch.index : testo.length;
  const giorni = {};
  for (let i = 0; i < markers.length; i++) {
    const { n, start } = markers[i];
    if (n < 1 || n > 7 || giorni[n]) continue;
    const nextStart = (markers[i + 1] && markers[i + 1].start > start)
      ? markers[i + 1].start : endPos;
    giorni[n] = testo.substring(start, nextStart).trim();
  }
  console.log(`[PDF] Giorni trovati: ${Object.keys(giorni).join(", ")}`);
  Object.entries(giorni).forEach(([n, t]) => console.log(`[PDF] G${n}: ${t.length} chars`));
  return giorni;
}

function estraiNomePiano(testo) {
  const head = testo.slice(0, 400);
  const m = head.match(/PIANO\s+ALIMENTARE[^\n]{0,80}/i);
  return m ? m[0].trim().replace(/\s+/g, " ") : "";
}

// ─── Kcal lookup (longest match wins, list sorted longest-first) ──
const KCAL100 = [
  ["fette biscottate", 370], ["yogurt greco", 70], ["fiocchi di latte", 100],
  ["tonno naturale", 110], ["prosciutto crudo", 145], ["pesce spada", 130],
  ["hamburger di pollo", 165], ["cioccolato fondente", 550], ["salsa pomodoro", 60],
  ["frutta secca", 600], ["olio evo", 900], ["olio extravergine", 900],
  ["pasta", 350], ["riso", 350], ["avena", 380], ["farro", 340], ["orzo", 340],
  ["pane", 270], ["crackers", 420], ["biscotti", 470], ["grissini", 410],
  ["pollo", 110], ["tacchino", 110], ["manzo", 125], ["vitello", 110], ["coniglio", 115],
  ["hamburger", 165], ["arista", 160], ["lonza", 145], ["maiale", 145], ["salsiccia", 280],
  ["bresaola", 150], ["prosciutto", 145], ["speck", 200],
  ["salmone", 180], ["tonno", 110], ["orata", 100], ["branzino", 95], ["merluzzo", 80],
  ["sogliola", 85], ["vongole", 30], ["gamberi", 85], ["calamari", 70],
  ["uovo", 130], ["uova", 130], ["albume", 50],
  ["grana", 390], ["parmigiano", 390], ["mozzarella", 250], ["fiordilatte", 250],
  ["ricotta", 150], ["feta", 260], ["philadelphia", 230], ["formaggio", 280],
  ["yogurt", 60], ["latte", 65],
  ["mandorle", 580], ["noci", 650], ["nocciole", 630], ["anacardi", 550], ["pistacchi", 560],
  ["cioccolato", 540], ["miele", 300], ["marmellata", 260], ["nutella", 540],
  ["banana", 90], ["mela", 52], ["pera", 45], ["arancia", 47], ["kiwi", 60],
  ["fragole", 32], ["ananas", 50], ["uva", 70], ["pesche", 42], ["frutta", 52],
  ["insalata", 20], ["rucola", 25], ["spinaci", 23], ["broccoli", 35], ["zucchine", 20],
  ["melanzane", 25], ["peperoni", 30], ["carote", 42], ["pomodorini", 20], ["pomodori", 18],
  ["cetrioli", 15], ["fagiolini", 30], ["cavolfiore", 25], ["verdure", 25], ["funghi", 25],
  ["olio", 900], ["burro", 750],
  ["patate", 85], ["fagioli", 115], ["ceci", 120], ["lenticchie", 115], ["piselli", 80],
  ["mais", 85], ["legumi", 115], ["passata", 35], ["ragù", 150],
];

function stimaKcal(nome, grammi) {
  const n = nome.toLowerCase();
  const g = parseFloat(String(grammi).replace(",", ".")) || 0;
  if (!g) return 0;
  for (const [food, k] of KCAL100) {
    if (n.includes(food)) return Math.round(g * k / 100);
  }
  return Math.round(g * 1.2);
}

function estraiAlimenti(testo) {
  const alimenti = [];
  // Find all "NUMBER g" quantity markers
  const qtyRe = /\b(\d+(?:[.,]\d+)?)\s*g\b/gi;
  const qtys = [];
  let qm;
  while ((qm = qtyRe.exec(testo)) !== null) {
    qtys.push({ g: parseFloat(qm[1].replace(",", ".")), start: qm.index, end: qm.index + qm[0].length });
  }

  if (qtys.length === 0) {
    // Fallback: handle "N uov[ao]" without explicit grams
    const uM = testo.match(/\b(\d+)\s+uov[ao]\w*/i);
    if (uM) {
      const n = parseInt(uM[1]);
      alimenti.push({ nome: n === 1 ? "Uovo" : "Uova", grammi: String(n * 60), kcal: String(n * 80) });
    }
    return alimenti;
  }

  let prevEnd = 0;
  for (const { g, start, end } of qtys) {
    const raw = testo.slice(prevEnd, start).trim();
    prevEnd = end;
    if (!raw) continue;
    // Strip leading punctuation/dashes (could be option subtitle prefix)
    const nome = raw.replace(/^[\s\-–—.()\d:]+/, "").replace(/\s+/g, " ").trim();
    if (!nome || nome.length < 2 || /^\d+$/.test(nome)) continue;
    alimenti.push({ nome, grammi: String(g), kcal: String(stimaKcal(nome, g)) });
  }

  return alimenti;
}

function parsaGiornoDet(testoGiorno, giornoNum) {
  const SEZ = ["COLAZIONE", "PRANZO", "SPUNTINO", "MERENDA", "CENA"];
  const sezRe = new RegExp(`\\b(${SEZ.join("|")})\\b`, "gi");
  const ALT = { COLAZIONE: "cola", PRANZO: "pranzo", SPUNTINO: "spunt", MERENDA: "merenda", CENA: "cena" };

  const sezioni = [];
  let sm;
  while ((sm = sezRe.exec(testoGiorno)) !== null) {
    sezioni.push({ nome: sm[1].toUpperCase(), pos: sm.index, len: sm[0].length });
  }

  const pasti = [];

  for (let si = 0; si < sezioni.length; si++) {
    const { nome, pos, len } = sezioni[si];
    const sezEnd = si + 1 < sezioni.length ? sezioni[si + 1].pos : testoGiorno.length;
    const testoSez = testoGiorno.slice(pos + len, sezEnd).trim();
    const altGroupId = ALT[nome] || nome.toLowerCase();
    const label = nome[0] + nome.slice(1).toLowerCase();

    const opzRe = /\bOPZIONE\s+([A-I])\b/gi;
    const opzioni = [];
    let om;
    while ((om = opzRe.exec(testoSez)) !== null) {
      opzioni.push({ lettera: om[1].toUpperCase(), pos: om.index, end: om.index + om[0].length });
    }

    if (opzioni.length === 0) {
      const ali = estraiAlimenti(testoSez);
      if (ali.length > 0) pasti.push({ nome: label, altGroupId, alimenti: ali });
    } else {
      for (let i = 0; i < opzioni.length; i++) {
        const { lettera, end: bodyStart } = opzioni[i];
        const bodyEnd = i + 1 < opzioni.length ? opzioni[i + 1].pos : testoSez.length;
        const testoOpz = testoSez.slice(bodyStart, bodyEnd).trim();
        const ali = estraiAlimenti(testoOpz);
        if (ali.length > 0) {
          pasti.push({ nome: `${label} ${lettera}`, altGroupId, alimenti: ali });
        }
      }
    }
  }

  console.log(`[PDF Det] G${giornoNum}: ${pasti.length} pasti`);
  return pasti;
}

// ─── AI fallback (only for days where deterministic parser finds < 2 pasti) ──
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function estraiPastiGiornoAI(testoGiorno, giornoNum, apiKey, tentativo = 1) {
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
    if ((resp.status === 429 || resp.status === 503) && tentativo < 4) {
      await sleep(2000 * tentativo);
      return estraiPastiGiornoAI(testoGiorno, giornoNum, apiKey, tentativo + 1);
    }
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Errore Groq G${giornoNum}: ${resp.status}`);
  }
  const data = await resp.json();
  const testo = data?.choices?.[0]?.message?.content || "";
  const match = testo.match(/\{[\s\S]+\}/);
  if (!match) throw new Error(`G${giornoNum}: JSON non valido`);
  const obj = JSON.parse(match[0]);
  const pasti = obj.pasti || obj.meals || [];
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
    if (!file.name.toLowerCase().endsWith(".pdf")) return setErrore("Il file deve essere un PDF");
    const activeKey = groqKey || apiKey.trim();
    setErrore(""); setFase(2);
    try {
      setLoadingMsg("Lettura del PDF in corso...");
      const testoPdf = await estraiTestoPdf(file);
      if (!testoPdf || testoPdf.length < 50)
        throw new Error("Testo non estraibile — verifica che il PDF non sia solo-immagine.");

      const blocchiPerGiorno = splitTestoPerGiorno(testoPdf);
      const giorniTrovati = Object.keys(blocchiPerGiorno).map(Number).sort();
      const nomePiano = estraiNomePiano(testoPdf);
      const giorniPasti = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };

      if (giorniTrovati.length >= 1) {
        // ── Step 1: deterministic parser (no AI, no rate limits) ──
        const aiNeeded = [];
        for (const n of giorniTrovati) {
          setLoadingMsg(`Estrazione giorno ${n}/${giorniTrovati.length}...`);
          const pasti = parsaGiornoDet(blocchiPerGiorno[n], n);
          if (pasti.length >= 2) {
            giorniPasti[n] = pasti;
          } else {
            aiNeeded.push(n);
          }
        }

        // ── Step 2: AI fallback only for days with insufficient results ──
        if (aiNeeded.length > 0 && activeKey) {
          console.log(`[PDF] AI fallback per giorni: ${aiNeeded.join(", ")}`);
          for (let idx = 0; idx < aiNeeded.length; idx++) {
            const n = aiNeeded[idx];
            setLoadingMsg(`AI fallback ${GIORNI_LABEL[n]}...`);
            try {
              giorniPasti[n] = await estraiPastiGiornoAI(blocchiPerGiorno[n], n, activeKey);
            } catch (e) {
              console.warn(`[PDF] G${n} AI fallback fallito:`, e.message);
            }
            if (idx < aiNeeded.length - 1) await sleep(400);
          }
        } else if (aiNeeded.length > 0) {
          console.warn(`[PDF] Giorni con pochi pasti: ${aiNeeded.join(", ")} (nessuna key per AI fallback)`);
        }
      } else {
        // ── Fallback: tabular PDF format (single large AI call) ──
        if (!activeKey) throw new Error("Inserisci la Groq API key per questo tipo di PDF");
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

      if (activeKey) localStorage.setItem("groq_key", apiKey.trim());
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
              <div className="import-step"><span className="import-num">1</span><span style={{ fontSize: 13 }}>Carica il PDF con il piano alimentare (formato GIORNO 1-7 con OPZIONE A/B/C)</span></div>
              <div className="import-step"><span className="import-num">2</span><span style={{ fontSize: 13 }}>Il parser estrae pasti e alternative automaticamente — la Groq Key è opzionale</span></div>
            </div>
            {!groqKey && (
              <div className="ig">
                <label className="lbl">Groq API Key (opzionale — usata solo se il parser fallisce){apiKey && " ✓"}</label>
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
