// Campi di una visita dal nutrizionista (BIA Total Body + antropometria + pliche).
// Unica fonte per form, visualizzazione, import AI e normalizzazione.
import { estraiTestoPdf } from "./utils";

export const GRUPPI_VISITA = [
  { id: "corpo", titolo: "Composizione", campi: [
    ["peso", "Peso", "kg"], ["fm", "FM massa grassa", "kg"], ["fm_pct", "FM", "%"], ["ffm", "FFM massa magra", "kg"], ["ffm_pct", "FFM", "%"],
    ["bcm", "BCM massa cellulare", "kg"], ["bcm_pct", "BCM", "%"], ["smm", "SMM muscolo scheletrico", "kg"], ["smm_pct", "SMM", "%"],
  ] },
  { id: "acqua", titolo: "Acqua e tessuti", campi: [
    ["tbw", "TBW acqua totale", "lt"], ["tbw_pct", "TBW", "%"], ["icw", "ICW intracellulare", "lt"], ["icw_pct", "ICW", "% TBW"],
    ["ecw", "ECW extracellulare", "lt"], ["ecw_pct", "ECW", "% TBW"], ["ldm", "LDM massa magra secca", "kg"], ["lst", "LST tessuto molle magro", "kg"], ["bonemc", "BoneMC minerale osseo", "kg"],
  ] },
  { id: "bia", titolo: "Parametri BIA e indici", campi: [
    ["altezza", "Altezza", "cm"], ["bmi", "BMI", ""], ["fmi", "FMI", ""], ["ffmi", "FFMI", ""],
    ["pha", "PhA angolo di fase", "°"], ["rz", "Rz resistenza", "Ω"], ["xc", "Xc reattanza", "Ω"], ["z", "Z impedenza", "Ω"],
    ["bmr", "BMR metabolismo basale", "kcal"], ["dee", "DEE dispendio giornaliero", "kcal"],
  ] },
  { id: "circ", titolo: "Circonferenze", campi: [
    ["braccio_rilassato", "Braccio rilassato", "cm"], ["braccio_flesso", "Braccio flesso", "cm"], ["avambraccio", "Avambraccio", "cm"], ["polso", "Polso", "cm"],
    ["torace", "Torace", "cm"], ["vita", "Vita", "cm"], ["addome", "Addome", "cm"], ["fianchi", "Fianchi", "cm"],
    ["coscia_max", "Coscia max", "cm"], ["coscia_med", "Coscia media", "cm"], ["polpaccio", "Polpaccio", "cm"], ["testa", "Testa", "cm"],
  ] },
  { id: "pliche", titolo: "Pliche", campi: [
    ["pl_bicipitale", "Bicipitale", "mm"], ["pl_tricipitale", "Tricipitale", "mm"], ["pl_sottoscapolare", "Sottoscapolare", "mm"], ["pl_sovraspinale", "Sovraspinale", "mm"],
    ["pl_addominale", "Addominale", "mm"], ["pl_iliaca", "Iliaca", "mm"], ["pl_coscia", "Mediana coscia", "mm"], ["pl_polpaccio", "Mediana polpaccio", "mm"],
  ] },
];

export const CAMPI_VISITA = GRUPPI_VISITA.flatMap(g => g.campi.map(([k, label, unit]) => ({ k, label, unit, gruppo: g.id })));
export const CHIAVI_VISITA = CAMPI_VISITA.map(c => c.k);

// Valore numerico valido o null (lo 0 nei referti significa "non misurato")
const n = v => {
  if (v === null || v === undefined || v === "") return null;
  const x = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return isFinite(x) && x > 0 ? Math.round(x * 100) / 100 : null;
};

export function normalizzaVisita(v) {
  const out = {};
  if (/^\d{4}-\d{2}-\d{2}$/.test(v?.data || "")) out.data = v.data;
  if (v?.visita_label) out.visita_label = String(v.visita_label).slice(0, 40);
  CHIAVI_VISITA.forEach(k => { const x = n(v?.[k]); if (x != null) out[k] = x; });
  return out;
}

// Più visite estratte da documenti diversi (es. Antropometrico + Total Body dello stesso giorno) → una per data
export function unisciPerData(visite) {
  const perData = {};
  visite.map(normalizzaVisita).filter(v => v.data).forEach(v => { perData[v.data] = { ...(perData[v.data] || {}), ...v }; });
  return Object.values(perData).sort((a, b) => a.data.localeCompare(b.data));
}

// Toglie dal testo del referto i dati anagrafici (nome, nascita, medico) e il glossario: a Groq arrivano solo le misure
export function anonimizzaReferto(t) {
  return String(t || "")
    .replace(/^[\s\S]*?\bESAME\b/, "ESAME")
    .split(/GLOSSARIO/i)[0]
    .replace(/IL PROFESSIONISTA[^\n]*/gi, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}
export const testoRefertoAnonimo = async file => anonimizzaReferto(await estraiTestoPdf(file));

// Pesata della sezione Peso ricavata da una visita del nutrizionista (stessa data).
// esistente = pesata già presente in quella data. aggiorna=false → crea solo se manca (allineamento all'avvio).
// Ritorna null se non serve fare nulla, altrimenti { tipo: "add" | "upd", riga }.
const DA_VISITA = { imc: "bmi", massa_grassa: "fm_pct", acqua: "tbw_pct", metabolismo: "bmr", massa_ossea: "bonemc" };
export function pesoDaVisita(m, esistente, aggiorna = true, nuovoId = () => `nutr_${Date.now().toString(36)}`) {
  if (!m?.data || !(+m.peso > 0)) return null;
  const valori = { valore: +m.peso };
  Object.entries(DA_VISITA).forEach(([kPeso, kVisita]) => {
    if (m[kVisita] != null) valori[kPeso] = kPeso === "metabolismo" ? Math.round(m[kVisita]) : m[kVisita];
  });
  if (!esistente) return { tipo: "add", riga: { id: nuovoId(), data: m.data, nota: "Visita nutrizionista", ...valori } };
  if (!aggiorna) return null;
  const cambia = Object.entries(valori).some(([k, v]) => esistente[k] == null || +esistente[k] !== +v);
  return cambia ? { tipo: "upd", riga: { ...esistente, ...valori } } : null;
}

// Controllo di coerenza: FM + FFM ≈ peso (tolleranza 1,5 kg)
export const incoerenze = v => {
  const out = [];
  if (v.peso && v.fm && v.ffm && Math.abs(v.fm + v.ffm - v.peso) > 1.5) out.push(`FM + FFM (${(v.fm + v.ffm).toFixed(1)} kg) non torna con il peso (${v.peso} kg)`);
  if (v.tbw && v.icw && v.ecw && Math.abs(v.icw + v.ecw - v.tbw) > 1) out.push("ICW + ECW non torna con TBW");
  return out;
};
