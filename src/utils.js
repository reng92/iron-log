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

export async function fetchMealImg(rawName, GROQ_KEY) {
  if (!rawName || typeof rawName !== 'string') return null;
  const nomePulito = rawName.replace(/\d+\s*g|\d+g|\d+\s*ml|\d+ml|[\d.,]+/gi, '').replace(/\s+/g, ' ').trim();
  if (!nomePulito) return null;
  if (foodCache[nomePulito]) return foodCache[nomePulito];
  if (pendingFoodRequests[nomePulito]) return pendingFoodRequests[nomePulito];

  const request = (async () => {
    try {
      let searchName = nomePulito;
      if (GROQ_KEY) {
        try {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'llama-3.1-8b-instant',
              messages: [{ role: 'user', content: `Translate this food item to English. Return ONLY the single English ingredient name, no quantity, no punctuation: "${nomePulito}"` }],
              temperature: 0, max_tokens: 10
            })
          });
          const data = await res.json();
          const translated = data?.choices?.[0]?.message?.content?.trim();
          if (translated) searchName = translated;
        } catch (e) { console.error("Translation error", e); }
      }

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
