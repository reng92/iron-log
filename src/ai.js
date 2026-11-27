import { sb, IS_DEMO } from "./db";
import { compressImg } from "./utils";
import { testoRefertoAnonimo, unisciPerData } from "./visita";

// Chiama la Edge Function "ai" (Supabase → Groq). La chiave Groq non passa mai dal browser.
export async function chiediAI(task, payload = {}) {
  if (IS_DEMO) throw new Error("AI non disponibile in modalità demo");
  const { data, error } = await sb.functions.invoke("ai", { body: { task, ...payload } });
  if (error) {
    let msg = "Servizio AI non raggiungibile, riprova";
    try {
      const body = await error.context?.json();
      if (body?.error) msg = body.error;
    } catch { /* risposta non JSON */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data?.result;
}

// Foto → dataURL JPEG compresso, pronto per i modelli vision
export const fotoPerAI = (file, maxPx = 1280) => compressImg(file, maxPx, 0.82);

// Referti del nutrizionista (PDF e/o foto) → visite normalizzate, una per data.
// Dai PDF si estrae il testo in locale e si tolgono i dati anagrafici prima di inviarlo.
export async function leggiReferti(files) {
  const pdf = files.filter(f => f.type === "application/pdf" || /\.pdf$/i.test(f.name || ""));
  const img = files.filter(f => (f.type || "").startsWith("image/"));
  if (!pdf.length && !img.length) throw new Error("Carica PDF o immagini del referto");
  const visite = [];
  if (pdf.length) {
    const testi = await Promise.all(pdf.slice(0, 4).map(testoRefertoAnonimo));
    if (testi.every(t => t.length < 30)) throw new Error("Il PDF non contiene testo leggibile: caricane una foto o uno screenshot");
    const res = await chiediAI("referto", { testo: testi.map((t, i) => `--- DOCUMENTO ${i + 1} ---\n${t}`).join("\n\n") });
    visite.push(...(res?.visite || []));
  }
  if (img.length) {
    const res = await chiediAI("scan_bcs", { images: await Promise.all(img.slice(0, 3).map(f => fotoPerAI(f, 1400))) });
    visite.push(...(res?.visite || []));
  }
  const unite = unisciPerData(visite);
  if (!unite.length) throw new Error("Non ho trovato visite con una data leggibile");
  return unite;
}

const num = v => (v === null || v === undefined || v === "" || isNaN(+v) ? null : +v);
export const numStr = v => (num(v) == null ? "" : String(num(v)));

// Azioni del coach → solo valori validi e plausibili (l'AI può sbagliare: limiti prudenti)
export function normalizzaAzioni(azioni) {
  const out = { pasti: [], extra: [], acqua: 0 };
  (Array.isArray(azioni) ? azioni : []).slice(0, 12).forEach(a => {
    if (a?.tipo === "pasto" && Number.isInteger(+a.idx) && +a.idx >= 0 && !out.pasti.includes(+a.idx)) out.pasti.push(+a.idx);
    else if (a?.tipo === "extra" && String(a.nome || "").trim()) out.extra.push({ nome: String(a.nome).trim().slice(0, 80), kcal: Math.min(4000, Math.max(0, Math.round(+a.kcal || 0))) });
    else if (a?.tipo === "acqua" && +a.ml > 0) out.acqua += Math.min(3000, Math.round(+a.ml));
  });
  out.acqua = Math.min(out.acqua, 4000);
  return out;
}

// Normalizza la lista alimenti restituita da pasto_foto / pasto_testo
export const normalizzaAlimenti = res => (Array.isArray(res?.alimenti) ? res.alimenti : [])
  .map(a => ({
    nome: String(a?.nome || "").trim(),
    grammi: Math.round(num(a?.grammi) || 0),
    kcal: Math.round(num(a?.kcal) || 0),
    proteine: Math.round(num(a?.proteine) || 0),
    carboidrati: Math.round(num(a?.carboidrati) || 0),
    grassi: Math.round(num(a?.grassi) || 0),
  }))
  .filter(a => a.nome);
