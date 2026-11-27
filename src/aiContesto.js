import { fmtIso, pianoAttivo, pastiPerGiorno, targetKcalPiano, GIORNI_LABEL } from "./utils";

// Piano alimentare attivo: nome, periodo, target e i pasti di oggi (con alternative), in forma compatta
function contestoDieta(piani = [], logDieta = []) {
  const piano = pianoAttivo(piani);
  if (!piano) return "Piano alimentare: nessuno.";
  const dow = ((new Date().getDay() + 6) % 7) + 1; // 1 = lunedì
  const tipo = piano.giorniTipo?.[dow];
  const target = targetKcalPiano(piano, tipo);
  const pasti = pastiPerGiorno(piano, dow, tipo) || [];
  const kcal = p => (p.alimenti || []).reduce((a, x) => a + (+x.kcal || 0), 0);
  const righe = [`Piano alimentare attivo: "${piano.nome || "senza nome"}"${piano.dataInizio ? ` dal ${piano.dataInizio}` : ""}${piano.dataFine ? ` al ${piano.dataFine}` : ""}${target ? `, target oggi ${target} kcal` : ""}${tipo ? ` (giorno ${tipo})` : ""}.`];
  if (piano.nota) righe.push(`Note del nutrizionista: ${String(piano.nota).slice(0, 300)}`);
  righe.push(`Pasti previsti oggi (${GIORNI_LABEL[dow]}):`);
  const visti = new Set();
  pasti.forEach(p => {
    const alt = p.altGroupId ? pasti.filter(x => x.altGroupId === p.altGroupId) : [p];
    if (p.altGroupId) { if (visti.has(p.altGroupId)) return; visti.add(p.altGroupId); }
    alt.slice(0, 4).forEach((a, i) => righe.push(`- ${alt.length > 1 ? `[alternativa ${i + 1}] ` : ""}${a.nome}: ${(a.alimenti || []).map(x => `${x.nome}${+x.grammi ? ` ${x.grammi}g` : ""}`).join(", ")} (${kcal(a)} kcal)`));
  });
  const oggi = logDieta.find(l => l.data === fmtIso());
  if (oggi?.extra?.length) righe.push(`Extra fuori piano oggi: ${oggi.extra.filter(e => e.mangiato).map(e => `${e.nome} (${e.kcal} kcal)`).join(", ")}.`);
  const ultimi = [...logDieta].filter(l => l.data).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 7);
  if (ultimi.length) righe.push(`Diario ultimi giorni: ${ultimi.map(l => `${l.data} ${l.totKcalConsumate}/${l.totKcalPreviste} kcal`).join("; ")}.`);
  return righe.join("\n").slice(0, 2500);
}

// Riassunto testuale dei dati dell'utente da passare al coach AI.
// Volutamente senza nome, email o foto: a Groq arrivano solo numeri aggregati.
const giorniFa = n => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

export function contestoUtente({ settings = {}, peso = [], logDieta = [], sessioni = [], misure = [], piani = [] }, giorni = 30) {
  const da = giorniFa(giorni);
  const daIso = fmtIso(da);
  const righe = [];

  righe.push(`Profilo: sesso ${settings.sesso || "n/d"}, età ${settings.eta || "n/d"}, altezza ${settings.altezza || "n/d"} cm, obiettivo kcal ${settings.targetKcal || "n/d"}.`);

  const pesi = [...peso].sort((a, b) => String(a.data).localeCompare(String(b.data)));
  const ultimo = pesi[pesi.length - 1];
  const inizioPeriodo = pesi.find(p => String(p.data) >= daIso);
  if (ultimo) {
    righe.push(`Peso attuale: ${ultimo.valore} kg (${ultimo.data})${ultimo.massa_grassa != null ? `, massa grassa ${ultimo.massa_grassa}%` : ""}.`);
    if (inizioPeriodo && inizioPeriodo !== ultimo) righe.push(`Variazione peso ultimi ${giorni} giorni: ${(ultimo.valore - inizioPeriodo.valore).toFixed(1)} kg (da ${inizioPeriodo.valore} kg).`);
    if (pesi[0] !== ultimo) righe.push(`Variazione dal primo peso registrato (${pesi[0].data}): ${(ultimo.valore - pesi[0].valore).toFixed(1)} kg.`);
  } else righe.push("Peso: nessun dato.");

  const sess = sessioni.filter(s => new Date(s.data) >= da);
  righe.push(`Allenamenti ultimi ${giorni} giorni: ${sess.length}${sess.length ? ` (ultimo: ${sess[0].schedaNome || "allenamento"} il ${fmtIso(new Date(sess[0].data))}, durata ${sess[0].durata || "?"} min)` : ""}.`);
  const best = {};
  sessioni.forEach(s => (s.esercizi || []).forEach(e => (e.serie || []).forEach(sr => {
    if (!sr.completata || !(+sr.kg > 0)) return;
    const recente = new Date(s.data) >= da;
    const b = best[e.nome] || (best[e.nome] = { max: 0, maxRecente: 0 });
    b.max = Math.max(b.max, +sr.kg);
    if (recente) b.maxRecente = Math.max(b.maxRecente, +sr.kg);
  })));
  const top = Object.entries(best).sort((a, b) => b[1].max - a[1].max).slice(0, 6);
  if (top.length) righe.push(`Carichi massimi (record / ultimo periodo): ${top.map(([n, b]) => `${n} ${b.max}kg/${b.maxRecente || "-"}kg`).join("; ")}.`);

  const logs = logDieta.filter(l => l.data >= daIso);
  if (logs.length) {
    const media = Math.round(logs.reduce((a, l) => a + (+l.totKcalConsumate || 0), 0) / logs.length);
    const prev = Math.round(logs.reduce((a, l) => a + (+l.totKcalPreviste || 0), 0) / logs.length);
    const oltre = logs.filter(l => +l.totKcalConsumate > +l.totKcalPreviste * 1.1).length;
    righe.push(`Dieta: ${logs.length} giorni registrati, media ${media} kcal consumate su ${prev} previste, ${oltre} giorni oltre il 110% del piano.`);
  } else righe.push(`Dieta: nessun giorno registrato negli ultimi ${giorni} giorni.`);
  const oggi = logDieta.find(l => l.data === fmtIso());
  if (oggi) righe.push(`Oggi: ${oggi.totKcalConsumate} / ${oggi.totKcalPreviste} kcal.`);

  const ms = [...misure].sort((a, b) => String(a.data).localeCompare(String(b.data)));
  if (ms.length) {
    const l = ms[ms.length - 1], f = ms[0];
    const pezzi = ["vita", "addome", "fianchi"].filter(k => l[k] != null).map(k => `${k} ${l[k]} cm${f[k] != null && f !== l ? ` (${(l[k] - f[k]).toFixed(1)} dal primo)` : ""}`);
    righe.push(`Ultima visita nutrizionista ${l.data}: ${[l.fm != null && `massa grassa ${l.fm} kg`, l.ffm != null && `massa magra ${l.ffm} kg`, ...pezzi].filter(Boolean).join(", ") || "n/d"}.`);
  }
  righe.push(contestoDieta(piani, logDieta));
  return `--- DATI UTENTE (oggi ${fmtIso()}) ---\n${righe.join("\n")}`;
}
