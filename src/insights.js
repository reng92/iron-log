// Logica pura (senza AI) per: progressione carichi, streak, avvisi di stallo, aderenza.
// Usata dall'app del cliente, dal pannello PT e dal report PDF.
import { fmtIso } from "./utils";

const giorno = d => fmtIso(new Date(d));
const giorniFa = (n, da = new Date()) => { const d = new Date(da); d.setDate(d.getDate() - n); return d; };

// "8-12" → {min:8,max:12}; "10" → {min:10,max:10}; "10 min"/"AMRAP" → null
export const rangeRip = s => {
  const m = String(s || "").match(/^\s*(\d+)\s*(?:[-–/]\s*(\d+))?\s*$/);
  if (!m) return null;
  const min = +m[1], max = m[2] ? +m[2] : +m[1];
  return { min: Math.min(min, max), max: Math.max(min, max) };
};

// ─── Progressione dei carichi (doppia progressione) ──────────────
// Se nell'ultima seduta tutte le serie hanno raggiunto il massimo delle ripetizioni → aumenta il carico;
// se qualche serie è sotto il minimo → mantieni; altrimenti → stesso carico, una ripetizione in più.
export function suggerisciCarico(serieUltima = [], ripetizioniTarget) {
  const fatte = serieUltima.filter(s => s.completata && +s.kg > 0 && +s.reps > 0);
  const range = rangeRip(ripetizioniTarget);
  if (!fatte.length || !range) return null;
  const kg = Math.max(...fatte.map(s => +s.kg));
  const alCarico = fatte.filter(s => +s.kg === kg);
  const passo = kg >= 40 ? 2.5 : kg >= 10 ? 2 : 1;
  if (alCarico.every(s => +s.reps >= range.max) && alCarico.length >= Math.min(fatte.length, 2)) {
    return { kg: Math.round((kg + passo) * 10) / 10, azione: "aumenta", testo: `Prova ${kg + passo} kg: l'ultima volta hai chiuso tutte le serie a ${range.max}+ ripetizioni` };
  }
  if (alCarico.some(s => +s.reps < range.min)) {
    return { kg, azione: "mantieni", testo: `Resta a ${kg} kg finché non arrivi a ${range.min} ripetizioni in ogni serie` };
  }
  return { kg, azione: "ripetizioni", testo: `Stessi ${kg} kg, cerca una ripetizione in più per serie (obiettivo ${range.max})` };
}

// ─── Streak ──────────────────────────────────────────────────────
// Un giorno "conta" se c'è un allenamento o un diario dieta compilato.
export function calcolaStreak({ sessioni = [], logDieta = [] }, oggi = new Date()) {
  const attivi = new Set([...sessioni.map(s => giorno(s.data)), ...logDieta.filter(l => l.data).map(l => l.data)]);
  let corrente = 0;
  // se oggi non hai ancora fatto nulla la serie non è persa: si parte da ieri
  let d = attivi.has(fmtIso(oggi)) ? new Date(oggi) : giorniFa(1, oggi);
  while (attivi.has(fmtIso(d))) { corrente++; d = giorniFa(1, d); }

  const ordinati = [...attivi].sort();
  let migliore = 0, run = 0, prec = null;
  ordinati.forEach(g => {
    run = prec && fmtIso(giorniFa(-1, new Date(prec + "T12:00:00"))) === g ? run + 1 : 1;
    migliore = Math.max(migliore, run); prec = g;
  });

  // allenamenti della settimana corrente (lun-dom)
  const lun = new Date(oggi); lun.setHours(0, 0, 0, 0); lun.setDate(lun.getDate() - ((lun.getDay() + 6) % 7));
  const settimana = sessioni.filter(s => new Date(s.data) >= lun).length;
  return { corrente, migliore: Math.max(migliore, corrente), settimana, oggiFatto: attivi.has(fmtIso(oggi)) };
}

// ─── Avvisi di stallo ────────────────────────────────────────────
export function avvisiStallo({ peso = [], sessioni = [], logDieta = [] }, oggi = new Date()) {
  const avvisi = [];

  // Peso fermo: almeno 3 pesate negli ultimi 21 giorni, distribuite su ≥ 14 giorni, oscillazione < 0,4 kg
  const daIso = fmtIso(giorniFa(21, oggi));
  const recenti = peso.filter(p => p.data >= daIso && p.valore != null).sort((a, b) => a.data.localeCompare(b.data));
  if (recenti.length >= 3) {
    const span = (new Date(recenti[recenti.length - 1].data) - new Date(recenti[0].data)) / 864e5;
    const vals = recenti.map(p => +p.valore);
    const oscill = Math.max(...vals) - Math.min(...vals);
    if (span >= 14 && oscill < 0.4) avvisi.push({ tipo: "peso", livello: "info", testo: `Peso stabile da ${Math.round(span)} giorni (${Math.min(...vals)}–${Math.max(...vals)} kg). Se l'obiettivo è dimagrire, rivedi kcal o attività.` });
  }

  // Carico fermo: stesso esercizio nelle ultime 4 sedute senza superare il carico di 4 sedute fa
  const perEs = {};
  [...sessioni].sort((a, b) => new Date(a.data) - new Date(b.data)).forEach(s => (s.esercizi || []).forEach(e => {
    const kg = Math.max(0, ...(e.serie || []).filter(x => x.completata).map(x => +x.kg || 0));
    if (kg > 0) (perEs[e.nome] = perEs[e.nome] || []).push({ kg, data: s.data });
  }));
  Object.entries(perEs).forEach(([nome, storia]) => {
    if (storia.length < 4) return;
    const ultime = storia.slice(-4);
    if (new Date(ultime[3].data) < giorniFa(30, oggi)) return; // esercizio non più fatto
    if (Math.max(...ultime.map(x => x.kg)) <= ultime[0].kg) avvisi.push({ tipo: "carico", livello: "info", testo: `${nome}: fermo a ${ultime[0].kg} kg nelle ultime 4 sedute. Prova a cambiare ripetizioni o una variante.` });
  });

  // Inattività
  const ultimaSess = sessioni.reduce((m, s) => Math.max(m, new Date(s.data).getTime()), 0);
  if (ultimaSess && ultimaSess < giorniFa(7, oggi).getTime()) {
    avvisi.push({ tipo: "inattivo", livello: "warn", testo: `Nessun allenamento da ${Math.floor((oggi - ultimaSess) / 864e5)} giorni.` });
  }

  // Dieta sopra il piano
  const sett = logDieta.filter(l => l.data >= fmtIso(giorniFa(7, oggi)));
  const sopra = sett.filter(l => +l.totKcalPreviste > 0 && +l.totKcalConsumate > +l.totKcalPreviste * 1.1).length;
  if (sopra >= 3) avvisi.push({ tipo: "dieta", livello: "warn", testo: `${sopra} giorni su ${sett.length} sopra il piano di oltre il 10% questa settimana.` });

  return avvisi;
}

// ─── Aderenza (per il PT) ────────────────────────────────────────
export function aderenza({ sessioni = [], logDieta = [], peso = [] }, giorni = 7, oggi = new Date()) {
  const da = giorniFa(giorni, oggi);
  const daIso = fmtIso(da);
  const sess = sessioni.filter(s => new Date(s.data) >= da).length;
  const logs = logDieta.filter(l => l.data >= daIso);
  const nelPiano = logs.filter(l => +l.totKcalPreviste > 0 && Math.abs(+l.totKcalConsumate - +l.totKcalPreviste) <= +l.totKcalPreviste * 0.1).length;
  const ultime = [
    ...sessioni.map(s => new Date(s.data).getTime()),
    ...logDieta.filter(l => l.data).map(l => new Date(l.data + "T12:00:00").getTime()),
    ...peso.filter(p => p.data).map(p => new Date(p.data + "T12:00:00").getTime()),
  ];
  const ultimaAttivita = ultime.length ? new Date(Math.max(...ultime)) : null;
  return {
    allenamenti: sess,
    giorniDieta: logs.length,
    giorniNelPiano: nelPiano,
    ultimaAttivita,
    giorniInattivo: ultimaAttivita ? Math.floor((oggi - ultimaAttivita) / 864e5) : null,
  };
}
