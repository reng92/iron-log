// Edge Function "ai": unico punto in cui l'app parla con Groq.
// - la chiave GROQ_API_KEY resta un secret di Supabase (mai nel browser)
// - solo utenti loggati, con un limite di richieste al giorno (AI_DAILY_LIMIT)
// - i prompt stanno qui: il client sceglie solo il "task" e passa i dati
import { createClient } from "jsr:@supabase/supabase-js@2";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const lista = (env: string, fallback: string[]) => {
  const v = (Deno.env.get(env) || "").split(",").map((s) => s.trim()).filter(Boolean);
  return [...new Set([...v, ...fallback])];
};
// Groq ritira spesso i modelli: proviamo in ordine e passiamo al successivo se uno non esiste più.
// Per forzarne uno nuovo basta impostare il secret GROQ_TEXT_MODEL / GROQ_VISION_MODEL.
const TEXT_MODELS = lista("GROQ_TEXT_MODEL", ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "llama-3.3-70b-versatile"]);
const VISION_MODELS = lista("GROQ_VISION_MODEL", ["meta-llama/llama-4-scout-17b-16e-instruct", "meta-llama/llama-4-maverick-17b-128e-instruct"]);
const DAILY_LIMIT = Number(Deno.env.get("AI_DAILY_LIMIT") || 80);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

class Errore extends Error {
  constructor(msg: string, public status = 400) { super(msg); }
}

// ─── Validazione input ───────────────────────────────────────────
const testo = (v: unknown, max: number, nome = "testo") => {
  if (typeof v !== "string" || !v.trim()) throw new Errore(`Campo "${nome}" mancante`);
  return v.slice(0, max);
};
const immagine = (v: unknown) => {
  if (typeof v !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(v)) throw new Errore("Immagine non valida");
  if (v.length > 3_000_000) throw new Errore("Immagine troppo grande");
  return v;
};
const immagini = (v: unknown, max: number) => {
  if (!Array.isArray(v) || !v.length) throw new Errore("Nessuna immagine");
  return v.slice(0, max).map(immagine);
};
const conImmagini = (imgs: string[], prompt: string) => [{
  role: "user",
  content: [...imgs.map((url) => ({ type: "image_url", image_url: { url } })), { type: "text", text: prompt }],
}];

// ─── Prompt ──────────────────────────────────────────────────────
const KCAL_RIF = `Riferimenti kcal: 100g pasta/riso/avena crudi=350 | 100g pane=270 | 10g olio EVO=90 | 100g pollo/tacchino/manzo magro crudi=110 | 100g pesce magro=100 | 100g salmone=180 | 100g tonno al naturale=110 | 1 uovo=80 | 100g mozzarella=250 | 100g grana=390 | 150g yogurt greco=90 | 20g frutta secca=120 | 100g patate cotte=85 | 100g legumi cotti=110 | 100g verdure=25 | 180g frutta=90.`;

const ALIMENTI_FORMATO = `Rispondi SOLO con JSON valido: {"descrizione":"breve descrizione del pasto","alimenti":[{"nome":"Pasta al pomodoro","grammi":120,"kcal":430,"proteine":14,"carboidrati":80,"grassi":6}]}. grammi, kcal e macro (in grammi) sono numeri interi stimati sulla porzione indicata o visibile. Se un numero di porzioni è indicato (es. "2 birre") moltiplica.`;

const ZEPP_PROMPT = `Analizza questo screenshot dell'app Zepp Life (o di un'altra bilancia smart) e restituisci SOLO JSON valido con TUTTI i valori numerici e le etichette di stato presenti. Usa null per i campi non trovati. Formato: {"peso":86.8,"punteggio":46,"tipologia":"Robusto","imc":30.3,"imc_status":"Molto alto","massa_grassa":31.3,"massa_grassa_status":"Alto","acqua":49.1,"acqua_status":"Insufficiente","grasso_viscerale":13,"grasso_viscerale_status":"Alto","muscoli":56.62,"muscoli_status":"Buono","proteine":16.2,"proteine_status":"Normale","metabolismo":1753,"metabolismo_status":"Obiettivo raggiunto","massa_ossea":3.04,"massa_ossea_status":"Normale"}. Gli stati possibili sono: "Molto alto","Alto","Normale","Basso","Molto basso","Insufficiente","Buono","Obiettivo raggiunto".`;

const CIRC_PROMPT = `Analizza questa immagine di misure antropometriche/circonferenze corporee e restituisci SOLO JSON valido. Usa null per i campi non visibili o con valore 0. Campi (cm): testa, torace, braccio_rilassato, avambraccio, braccio_flesso, polso, vita, addome, fianchi, coscia_max, coscia_med, polpaccio. Aggiungi "data" in formato YYYY-MM-DD se nell'immagine c'è una data, altrimenti null. Formato: {"testa":null,"torace":null,"braccio_rilassato":35.0,"avambraccio":null,"braccio_flesso":35.5,"polso":null,"vita":96.5,"addome":104.4,"fianchi":96.3,"coscia_max":null,"coscia_med":57.3,"polpaccio":null,"data":"2026-03-10"}`;

const BCS_PROMPT = `Analizza questa immagine del report "Storico TotalBody" BCS del nutrizionista. Restituisci SOLO JSON valido con un array "visite" con TUTTE le visite visibili. Per ogni visita: data (YYYY-MM-DD), visita_label (es "Visita 1", "Basale"), peso (kg), ffm (Fat Free Mass kg), fm (Fat Mass kg), bcm (Body Cell Mass kg, null se assente). Valori illeggibili = null. Formato: {"visite":[{"data":"2025-12-11","visita_label":"Visita 1","peso":92.3,"ffm":60.1,"fm":32.2,"bcm":null}]}`;

const BCS_MULTI_PROMPT = `Hai più immagini BCS del nutrizionista. Analizzale tutte e unisci i dati per data.
- Grafico "Storico TotalBody": per ogni punto estrai data (YYYY-MM-DD), visita_label, peso (kg), ffm (kg), fm (kg), bcm (null se assente).
- Scheda "Anthropometric": per ogni colonna data estrai in cm (null se trattino o assente): braccio_rilassato, braccio_flesso (riga "BRACCIO FLESSO-EST"), vita, addome, fianchi, coscia_max, coscia_med, polpaccio, testa, torace, avambraccio, polso.
Abbina per data e restituisci SOLO JSON valido: {"visite":[{"data":"2025-12-11","visita_label":"Visita 1","peso":92.3,"ffm":60.1,"fm":32.2,"bcm":null,"braccio_rilassato":37.0,"braccio_flesso":37.8,"vita":97.0,"addome":108.0,"fianchi":100.0,"coscia_max":null,"coscia_med":60.4,"polpaccio":null,"testa":null,"torace":null,"avambraccio":null,"polso":null}]}`;

// Campi di una visita dal nutrizionista (stessi nomi di src/visita.js)
const CAMPI_VISITA = `peso (kg), fm (Fat Mass kg), fm_pct (FM % del peso), ffm (Fat Free Mass kg), ffm_pct (FFM % del peso), bcm (Body Cell Mass kg), bcm_pct (BCM %), smm (Skeletal Muscle Mass kg), smm_pct (SMM % del peso), tbw (Total Body Water litri), tbw_pct (TBW % del peso), icw (Intra-Cellular Water litri), icw_pct (ICW % di TBW), ecw (Extra-Cellular Water litri), ecw_pct (ECW % di TBW), ldm (Lean Dry Mass kg), lst (Lean Soft Tissue kg), bonemc (Bone Mineral Content kg), altezza (cm), bmi, fmi (Fat Mass Index), ffmi (Fat Free Mass Index), pha (Phase Angle gradi), rz (resistenza ohm), xc (reattanza ohm), z (impedenza ohm), bmr (kcal), dee (kcal), braccio_rilassato, braccio_flesso ("Braccio flesso-EST"), avambraccio, polso, torace, vita, addome, fianchi, coscia_max, coscia_med, polpaccio, testa (circonferenze in cm), pl_bicipitale, pl_tricipitale, pl_sottoscapolare, pl_sovraspinale, pl_addominale, pl_iliaca, pl_coscia ("Mediana coscia"), pl_polpaccio ("Mediana polpaccio") (pliche in mm)`;

const REFERTO_PROMPT = `Sei un assistente che estrae dati da referti di nutrizionisti (BIA "Total Body", esame "Antropometrico", circonferenze, pliche). Ricevi il testo estratto da uno o più PDF.
REGOLE:
1. Crea una visita per OGNI data d'esame trovata. Le tabelle con più colonne di date (es. circonferenze 17/11/2026, 23/06/2026, ...) contengono lo storico: una visita per colonna, con i valori di quella colonna nello stesso ordine delle date.
2. Date in formato YYYY-MM-DD (17/11/2026 → 2026-11-17). Ignora l'ora.
3. Il valore 0 significa "non misurato": usa null. Non inventare valori assenti.
4. Nelle tabelle "Stime / Diff. su Riferimento / % di PESO / % di FFM / % di TBW": il PRIMO numero dopo il nome è la stima (es. "FM (Fat Mass) 33.3 kg 7.3 kg 35.7 [15.2 - 21.9]" → fm 33.3, fm_pct 35.7; 7.3 è la differenza: IGNORALA). I numeri tra parentesi quadre sono intervalli di riferimento: IGNORALI. Per ICW ed ECW la percentuale è "% di TBW" (icw_pct, ecw_pct). Per TBW tbw_pct è la "% di PESO". Per SMM smm_pct è la "% di PESO".
5. "PARAMETRI ESAME": Altezza, Peso, BMI seguiti dai valori nello stesso ordine; RZ, XC, PhA, Z seguiti dai valori nello stesso ordine.
6. Se lo stesso giorno compare in più documenti, unisci i dati nella stessa visita.
Campi possibili: ${CAMPI_VISITA}.
Rispondi SOLO con JSON valido: {"visite":[{"data":"2026-11-17","visita_label":"Visita","peso":93.4,"fm":33.3,"fm_pct":35.7,"vita":103}]} includendo solo i campi con un valore.`;

const SCHEDA_PROMPT =`Sei un assistente fitness. Ricevi il testo estratto da un PDF (o la foto) di una scheda di allenamento.
Se la scheda ha più giorni o split (Giorno A/B, Day 1/2, Push/Pull/Legs, Upper/Lower...) crea un elemento per OGNI giorno nell'array "giorni"; altrimenti un solo elemento.
Includi tutti gli esercizi nell'ordine (riscaldamento, cardio, pesi, stretching). Per ogni esercizio: nome, serie (intero, 1 per cardio), ripetizioni come stringa ("8-12", "10", "10 min"), pausa in secondi (default 90 pesi, 60 cardio), note.
Rispondi SOLO con JSON valido: {"nomeScheda":"nome","giorni":[{"nomeGiorno":"Giorno A - Push","esercizi":[{"nome":"Panca piana","serie":4,"ripetizioni":"8-10","pausa":120,"note":""}]}]}`;

const DIETA_GIORNO_PROMPT = `Sei un assistente nutrizionale. Ricevi il testo di UN SOLO giorno di un piano alimentare con sezioni di pasto (COLAZIONE, PRANZO, SPUNTINO, MERENDA, CENA); ogni pasto può avere opzioni alternative (OPZIONE A, B, C...).
REGOLE:
1. Ogni opzione è un pasto separato; non saltarne nessuna e non unirle.
2. Tutte le opzioni dello stesso pasto hanno lo stesso "altGroupId" (es. "cola", "pranzo", "spunt", "cena").
3. Nome: se l'opzione ha un titolo usa "Pranzo — <titolo>", altrimenti "Colazione A", "Colazione B"...
4. kcal sempre stimate, mai 0. ${KCAL_RIF}
5. Grammi come stringa numerica ("150-200 g" → "175"; "1 cucchiaio (10 g)" → "10").
6. "Pasto libero" → un solo pasto {"nome":"Pasto libero","altGroupId":"libero","alimenti":[{"nome":"Pasto libero","grammi":"","kcal":"800"}]}.
7. Ordine Colazione → Pranzo → Spuntino → Merenda → Cena.
Rispondi SOLO con JSON valido: {"pasti":[{"nome":"Colazione A","altGroupId":"cola","alimenti":[{"nome":"Fette biscottate","grammi":"32","kcal":"128"}]}]}`;

const DIETA_TABELLA_PROMPT = `Sei un assistente nutrizionale. Estrai un piano alimentare settimanale dal testo di un PDF in formato tabella (colonne giorni × righe pasti, con eventuali colonne "ALT." come alternative) o a schede giornaliere.
REGOLE: 1=Lun ... 7=Dom, includi sempre tutte e 7 le chiavi. Le alternative dello stesso pasto hanno lo stesso "altGroupId" (es. "g1-pranzo"). kcal sempre stimate, mai 0. ${KCAL_RIF} Grammi come stringa numerica.
Rispondi SOLO con JSON valido: {"nomePiano":"Nome","giorniPasti":{"1":[{"nome":"Colazione","altGroupId":"g1-cola","alimenti":[{"nome":"Yogurt greco","grammi":"150","kcal":"90"}]}],"2":[],"3":[],"4":[],"5":[],"6":[],"7":[]}}`;

const COACH = `Sei "Iron Coach", il coach dell'app Iron-Log. Parli in italiano, in modo diretto, pratico ed empatico. Risposte brevi (massimo 150 parole), con elenchi quando servono. Non fai diagnosi mediche: per dolori, patologie o farmaci consigli di sentire un medico. Basati sui dati dell'utente qui sotto e non inventare numeri che non ci sono.`;

type Task = { vision?: boolean; json?: boolean; max: number; temp: number; build: (p: Record<string, unknown>) => unknown[] };

const TASKS: Record<string, Task> = {
  pasto_foto: {
    vision: true, json: true, max: 1024, temp: 0.2,
    build: (p) => conImmagini([immagine(p.image)], `Sei un nutrizionista. Riconosci gli alimenti nella foto del pasto e stima porzioni e valori. ${p.nota ? `Nota dell'utente: "${String(p.nota).slice(0, 300)}". ` : ""}${KCAL_RIF}\n${ALIMENTI_FORMATO}`),
  },
  pasto_testo: {
    json: true, max: 1024, temp: 0.2,
    build: (p) => [
      { role: "system", content: `Sei un nutrizionista. L'utente descrive a parole cosa ha mangiato: dividi in alimenti e stima porzioni e valori. Se mancano i grammi usa una porzione standard italiana. ${KCAL_RIF}\n${ALIMENTI_FORMATO}` },
      { role: "user", content: testo(p.testo, 1000) },
    ],
  },
  kcal_extra: {
    json: true, max: 200, temp: 0,
    build: (p) => [
      { role: "system", content: `Sei un nutrizionista. Calcola le kcal TOTALI della quantità descritta (se c'è un numero di porzioni moltiplica: "3 gin tonic" = 600). Rispondi SOLO con JSON {"kcal": numero intero}.` },
      { role: "user", content: testo(p.nome, 200, "nome") },
    ],
  },
  scan_zepp: { vision: true, json: true, max: 600, temp: 0, build: (p) => conImmagini([immagine(p.image)], ZEPP_PROMPT) },
  scan_circ: { vision: true, json: true, max: 600, temp: 0, build: (p) => conImmagini([immagine(p.image)], CIRC_PROMPT) },
  scan_bcs: {
    vision: true, json: true, max: 4096, temp: 0,
    build: (p) => {
      const imgs = immagini(p.images, 3);
      return conImmagini(imgs, `${imgs.length > 1 ? BCS_MULTI_PROMPT : BCS_PROMPT}\nSe nelle immagini ci sono anche altri valori (BIA, acqua, indici, pliche, circonferenze) aggiungili con questi nomi: ${CAMPI_VISITA}. Il valore 0 significa non misurato: null.`);
    },
  },
  referto: {
    json: true, max: 6000, temp: 0,
    build: (p) => [{ role: "system", content: REFERTO_PROMPT }, { role: "user", content: testo(p.testo, 16000) }],
  },
  scheda_pdf: {
    json: true, max: 4096, temp: 0.1,
    build: (p) => [{ role: "system", content: SCHEDA_PROMPT }, { role: "user", content: `Testo della scheda:\n\n${testo(p.testo, 12000)}` }],
  },
  scheda_foto: { vision: true, json: true, max: 4096, temp: 0.1, build: (p) => conImmagini(immagini(p.images, 3), SCHEDA_PROMPT) },
  dieta_giorno: {
    json: true, max: 4096, temp: 0.1,
    build: (p) => [{ role: "system", content: DIETA_GIORNO_PROMPT }, { role: "user", content: testo(p.testo, 8000) }],
  },
  dieta_tabella: {
    json: true, max: 8000, temp: 0.1,
    build: (p) => [{ role: "system", content: DIETA_TABELLA_PROMPT }, { role: "user", content: testo(p.testo, 14000) }],
  },
  chat: {
    max: 700, temp: 0.6,
    build: (p) => {
      const msgs = Array.isArray(p.messages) ? p.messages.slice(-12) : [];
      if (!msgs.length) throw new Errore("Nessun messaggio");
      return [
        { role: "system", content: `${COACH}\n\n${String(p.contesto || "").slice(0, 5000)}` },
        ...msgs.map((m: { role?: string; content?: unknown }) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content || "").slice(0, 2000),
        })),
      ];
    },
  },
  riepilogo: {
    json: true, max: 700, temp: 0.5,
    build: (p) => [
      { role: "system", content: `${COACH}\nScrivi il riepilogo della settimana dell'utente. Rispondi SOLO con JSON: {"titolo":"frase breve (max 8 parole)","punti":["3-4 osservazioni concrete con i numeri"],"consiglio":"un consiglio pratico per la prossima settimana"}` },
      { role: "user", content: testo(p.contesto, 5000, "contesto") },
    ],
  },
  sostituisci: {
    json: true, max: 700, temp: 0.4,
    build: (p) => [
      { role: "system", content: `Sei un personal trainer. Proponi 3 esercizi alternativi che allenano gli stessi muscoli con un movimento simile, tenendo conto del motivo indicato (attrezzo occupato, assente, fastidio...). Se il motivo è un dolore, scegli varianti a basso impatto e consiglia di fermarsi se il dolore persiste. Rispondi SOLO con JSON: {"alternative":[{"nome":"Distensioni con manubri","perche":"stesso schema di spinta, meno carico sulla spalla","ripetizioni":"8-12"}]}` },
      { role: "user", content: `Esercizio: ${testo(p.esercizio, 120, "esercizio")}\nSerie x ripetizioni previste: ${String(p.schema || "").slice(0, 60)}\nMotivo: ${String(p.motivo || "attrezzo occupato").slice(0, 200)}` },
    ],
  },
  ricetta: {
    json: true, max: 900, temp: 0.7,
    build: (p) => [
      { role: "system", content: `Sei uno chef che rispetta i piani alimentari. Proponi una ricetta che usa ESATTAMENTE gli ingredienti e le grammature indicati (puoi aggiungere solo spezie, erbe, aceto, limone, sale). Rispondi SOLO con JSON: {"titolo":"nome del piatto","tempo":"20 min","passi":["passo 1","passo 2"],"consiglio":"variante o trucco"}` },
      { role: "user", content: `Pasto: ${String(p.pasto || "").slice(0, 80)}\nIngredienti:\n${testo(p.ingredienti, 1500, "ingredienti")}` },
    ],
  },
};

// ─── Chiamata a Groq con fallback sui modelli ────────────────────
async function groq(task: Task, messages: unknown[]) {
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) throw new Errore("AI non configurata: manca il secret GROQ_API_KEY", 503);
  const modelli = task.vision ? VISION_MODELS : TEXT_MODELS;
  let ultimo = "";
  for (const model of modelli) {
    const body: Record<string, unknown> = { model, messages, temperature: task.temp, max_completion_tokens: task.max };
    if (task.json) body.response_format = { type: "json_object" };
    if (model.startsWith("openai/gpt-oss")) body.reasoning_effort = "low";
    const send = () => fetch(GROQ_URL, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    let r = await send();
    // alcuni modelli non accettano json_object (es. con immagini): riprova senza, il JSON lo estraiamo noi
    if (r.status === 400 && body.response_format) {
      const t = await r.clone().text();
      if (/response_format|json_object|json mode/i.test(t)) { delete body.response_format; r = await send(); }
    }
    if (r.ok) {
      const d = await r.json();
      const content: string = d?.choices?.[0]?.message?.content || "";
      if (!task.json) return content.trim();
      const m = content.match(/\{[\s\S]*\}/);
      if (!m) throw new Errore("L'AI non ha restituito dati leggibili, riprova", 502);
      try { return JSON.parse(m[0]); } catch { throw new Errore("L'AI ha restituito dati non validi, riprova", 502); }
    }
    const errText = await r.text();
    ultimo = `${r.status} ${errText.slice(0, 300)}`;
    console.error(`[ai] ${model}: ${ultimo}`);
    if (r.status === 429) throw new Errore("Troppe richieste all'AI in questo momento, riprova tra un minuto", 429);
    if (r.status === 401) throw new Errore("Chiave Groq non valida", 503);
    // modello inesistente/ritirato/non abilitato o non adatto → prova il prossimo
    if (r.status === 403 || r.status === 404 || /model|decommission|not.?found|does not support/i.test(errText)) continue;
    throw new Errore("Errore del servizio AI, riprova", 502);
  }
  throw new Errore(`Nessun modello ${task.vision ? "vision" : "testo"} disponibile su Groq. Imposta il secret ${task.vision ? "GROQ_VISION_MODEL" : "GROQ_TEXT_MODEL"}.`, 503);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Metodo non consentito" }, 405);
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""));
    if (!user) return json({ error: "Devi essere loggato" }, 401);

    const payload = await req.json().catch(() => null);
    const task = payload && TASKS[payload.task as string];
    if (!task) return json({ error: "Richiesta AI non valida" }, 400);
    const messages = task.build(payload);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: q, error: qErr } = await admin.rpc("ai_take_quota", { p_user: user.id, p_limit: DAILY_LIMIT });
    if (qErr) throw new Errore("Errore interno (quota)", 500);
    const quota = Array.isArray(q) ? q[0] : q;
    if (!quota?.consentito) return json({ error: `Hai raggiunto il limite di ${DAILY_LIMIT} richieste AI per oggi. Riprova domani.` }, 429);

    const result = await groq(task, messages);
    return json({ result, usate: quota.usate, limite: DAILY_LIMIT });
  } catch (e) {
    const status = e instanceof Errore ? e.status : 500;
    if (status >= 500) console.error("[ai]", e);
    return json({ error: e instanceof Errore ? e.message : "Errore interno" }, status);
  }
});
