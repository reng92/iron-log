export const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export const fmtDur = s => { 
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sc = s % 60; 
  return h ? `${h}h ${m}m` : (m ? `${m}m ${sc}s` : `${sc}s`); 
};

export const fmtDate = d => new Date(d).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export const fmtShort = d => new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });

export const fmtIso = (d = new Date()) => { 
  const dt = d instanceof Date ? d : new Date(d); 
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`; 
};

export const epley = (kg, reps) => +reps === 1 ? +kg : Math.round(+kg * (1 + (+reps / 30)) * 10) / 10;

export const GG = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

export const GIORNI_LABEL = ["", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

export const GIORNI_SHORT = ["", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

const foodCache = {};
const pendingFoodRequests = {};

export async function fetchMealImg(rawName) {
  if (!rawName || typeof rawName !== 'string') return null;
  const nomePulito = rawName.replace(/\d+\s*g|\d+g|\d+\s*ml|\d+ml|[\d.,]+/gi, '').replace(/\s+/g, ' ').trim();
  if (!nomePulito) return null;
  if (foodCache[nomePulito]) return foodCache[nomePulito];
  if (pendingFoodRequests[nomePulito]) return pendingFoodRequests[nomePulito];

  const request = (async () => {
    try {
      const searchName = nomePulito;
      let finalUrl = null;
      try {
        const ingUrl = `https://www.themealdb.com/images/ingredients/${encodeURIComponent(searchName)}-Small.png`;
        const check = await fetch(ingUrl, { method: 'HEAD' });
        if (check.ok) finalUrl = ingUrl;
        else {
          const r = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(searchName)}`);
          const d = await r.json();
          if (d.meals?.[0]?.strMealThumb) finalUrl = d.meals[0].strMealThumb;
        }
      } catch (e) { console.error("Fetch error", e); }

      foodCache[nomePulito] = finalUrl;
      return finalUrl;
    } finally {
      delete pendingFoodRequests[nomePulito];
    }
  })();

  pendingFoodRequests[nomePulito] = request;
  return request;
}

export const loadPdfJs = () => new Promise((resolve, reject) => {
  if (window.pdfjsLib) return resolve(window.pdfjsLib);
  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  script.onload = () => {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    resolve(window.pdfjsLib);
  };
  script.onerror = () => reject(new Error("Impossibile caricare PDF.js"));
  document.head.appendChild(script);
});

export const estraiTestoPdf = async (file) => {
  const pdfjsLib = await loadPdfJs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let testo = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    testo += content.items.map(it => it.str).join(" ") + "\n";
  }
  return testo.trim();
};

export const compressImg = (file, maxPx = 800, quality = 0.72) => new Promise(res => {
  const img = new Image(), url = URL.createObjectURL(file);
  img.onload = () => {
    const r = Math.min(1, maxPx / Math.max(img.width, img.height));
    const w = Math.round(img.width * r), h = Math.round(img.height * r);
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    cv.getContext("2d").drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    res(cv.toDataURL("image/jpeg", quality));
  };
  img.src = url;
});

export const estimateKcalFromName = (name) => {
  const n = name.toLowerCase();
  if (n.includes("birra") || n.includes("gin") || n.includes("spritz")) return 200;
  if (n.includes("pizza")) return 800;
  if (n.includes("hamburger") || n.includes("panino")) return 600;
  if (n.includes("torta") || n.includes("dolce") || n.includes("tiramis")) return 400;
  if (n.includes("gelato")) return 250;
  if (n.includes("mela") || n.includes("frutta")) return 80;
  if (n.includes("caffè")) return 0;
  return 0;
};

// ─── Piani alimentari: piano attivo e tipo giorno (palestra/riposo) ───
// Piano attivo = quello con dataInizio/dataFine che coprono la data, altrimenti il più recente per dataInizio, altrimenti il primo
export const pianoAttivo = (piani, iso = fmtIso()) => {
  if (!piani?.length) return null;
  const inCorso = piani.filter(p => p.dataInizio && p.dataInizio <= iso && (!p.dataFine || p.dataFine >= iso));
  const pool = inCorso.length ? inCorso : piani.filter(p => p.dataInizio);
  if (!pool.length) return piani[0];
  return [...pool].sort((a, b) => b.dataInizio.localeCompare(a.dataInizio))[0];
};

export const TIPI_GIORNO = { palestra: "🏋️ Palestra", riposo: "😴 Riposo" };

// Pasti per giorno (1=Lun..7=Dom). Se il tipo richiesto è diverso da quello previsto per quel giorno
// (es. allenamento saltato), usa il primo giorno del piano con quel tipo come modello.
export const pastiPerGiorno = (piano, dow, tipo) => {
  if (!piano) return [];
  const own = piano.giorniPasti?.[dow] || piano.pasti || [];
  const tipoPrevisto = piano.giorniTipo?.[dow];
  if (!tipo || !tipoPrevisto || tipo === tipoPrevisto) return own;
  const modello = [1, 2, 3, 4, 5, 6, 7].find(d => piano.giorniTipo[d] === tipo && piano.giorniPasti?.[d]?.length);
  return modello ? piano.giorniPasti[modello] : own;
};

// Target kcal del giorno: centro del range del tipo giorno, se il piano lo definisce
export const targetKcalPiano = (piano, tipo) => {
  const k = piano?.target?.[tipo]?.kcal;
  return k ? Math.round((k.min + k.max) / 2) : null;
};

// ─── Lista della spesa ───
// Usa piano.spesa se presente (lista curata), altrimenti somma gli alimenti dei 7 giorni
// (per i pasti alternativi conta solo la prima opzione; salta le voci senza grammi né kcal).
export const listaSpesaDaPiano = (piano) => {
  if (!piano) return [];
  if (Array.isArray(piano.spesa) && piano.spesa.length) return piano.spesa;
  const acc = {};
  const giorni = piano.giorniPasti ? Object.values(piano.giorniPasti) : [piano.pasti || []];
  giorni.forEach(pasti => {
    const visti = new Set();
    (pasti || []).forEach(p => {
      if (p.altGroupId) { if (visti.has(p.altGroupId)) return; visti.add(p.altGroupId); }
      (p.alimenti || []).forEach(a => {
        const nome = (a.nome || "").trim();
        if (!nome || (!(+a.grammi > 0) && !(+a.kcal > 0))) return;
        const k = nome.toLowerCase();
        if (!acc[k]) acc[k] = { nome, grammi: 0, volte: 0 };
        acc[k].grammi += +a.grammi || 0;
        acc[k].volte += 1;
      });
    });
  });
  return Object.values(acc)
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .map(x => ({
      id: "auto_" + x.nome.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      cat: "Dal piano",
      nome: x.nome,
      qta: x.grammi > 0 ? (x.grammi >= 1000 ? (x.grammi / 1000).toLocaleString("it-IT", { maximumFractionDigits: 2 }) + " kg" : x.grammi + " g") : x.volte + "×",
      uso: x.volte > 1 ? `${x.volte} volte` : "",
    }));
};
