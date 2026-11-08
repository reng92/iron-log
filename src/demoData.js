// Dati dimostrativi (sintetici) per vedere l'interfaccia in sviluppo con ?demo=1, senza login.
import { fmtIso } from "./utils";

const giorno = d => { const x = new Date(); x.setDate(x.getDate() + d); return fmtIso(x); };
const iso = d => { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(18, 30, 0, 0); return x.toISOString(); };

const pasti = [
  { id: "p1", nome: "Colazione", orario: "07:30", alimenti: [
    { nome: "Yogurt greco 0%", grammi: 170, kcal: 100, proteine: 17 },
    { nome: "Fiocchi d'avena", grammi: 40, kcal: 150, proteine: 5 },
    { nome: "Mirtilli", grammi: 80, kcal: 46, proteine: 1 },
  ] },
  { id: "p2", nome: "Spuntino", orario: "10:30", alimenti: [
    { nome: "Mela", grammi: 150, kcal: 78, proteine: 0 },
    { nome: "Mandorle", grammi: 15, kcal: 90, proteine: 3 },
  ] },
  { id: "p3", nome: "Pranzo", orario: "13:00", alimenti: [
    { nome: "Riso basmati", grammi: 80, kcal: 285, proteine: 6 },
    { nome: "Petto di pollo", grammi: 150, kcal: 165, proteine: 35 },
    { nome: "Zucchine grigliate", grammi: 200, kcal: 34, proteine: 2 },
    { nome: "Olio extravergine", grammi: 10, kcal: 90, proteine: 0 },
  ] },
  { id: "p4", nome: "Merenda", orario: "17:00", alimenti: [
    { nome: "Fesa di tacchino", grammi: 60, kcal: 65, proteine: 13 },
    { nome: "Gallette di riso", grammi: 20, kcal: 76, proteine: 2 },
  ] },
  { id: "p5", nome: "Cena", orario: "20:30", alimenti: [
    { nome: "Salmone", grammi: 150, kcal: 300, proteine: 30 },
    { nome: "Patate", grammi: 200, kcal: 154, proteine: 4 },
    { nome: "Insalata mista", grammi: 100, kcal: 20, proteine: 1 },
  ] },
];

const giorniPasti = {}; [1, 2, 3, 4, 5, 6, 7].forEach(d => { giorniPasti[d] = pasti; });

export const DEMO = {
  settings: { darkMode: true, nome: "Renato Demo", sesso: "M", acqua_obiettivo: 2000, acqua_extra_palestra: 500, acqua_borraccia: 750 },
  piani: [{
    id: "demo-piano", nome: "Piano autunno", dataInizio: giorno(-20), dataFine: giorno(36), durataGiorni: 56, pasti,
    giorniPasti,
    giorniTipo: { 1: "palestra", 2: "riposo", 3: "palestra", 4: "riposo", 5: "palestra", 6: "riposo", 7: "riposo" },
    target: {
      palestra: { kcal: { min: 1550, max: 1650 }, proteine_g: { min: 130, max: 140 } },
      riposo: { kcal: { min: 1350, max: 1450 }, proteine_g: { min: 120, max: 130 } },
    },
  }],
  schede: [
    { id: "s1", nome: "Push A", giorni: [0, 4], esercizi: new Array(6).fill(0).map((_, i) => ({ id: "e" + i, nome: "Esercizio " + (i + 1), serie: [] })) },
    { id: "s2", nome: "Pull B", giorni: [2], esercizi: new Array(5).fill(0).map((_, i) => ({ id: "f" + i, nome: "Esercizio " + (i + 1), serie: [] })) },
    { id: "s3", nome: "Gambe", giorni: [6, 1, 3, 5].slice(0, 0), esercizi: [] },
  ],
  sessioni: [-1, -3, -6].map((d, i) => ({ id: "ss" + i, data: iso(d), schedaNome: ["Push A", "Pull B", "Push A"][i], durata: 58 + i * 4, esercizi: [] })),
  peso: [-27, -20, -14, -10, -7, -3, -1].map((d, i) => ({ id: "w" + i, data: giorno(d), valore: [81.2, 80.6, 80.3, 79.9, 79.8, 79.4, 79.1][i] })),
  acqua: [
    { id: "a0", data: giorno(0), ml: 1500, voci: [{ ora: "08:10", ml: 750 }, { ora: "11:40", ml: 750 }] },
    ...[-1, -2, -3, -4, -5, -6].map((d, i) => ({ id: "a" + (i + 1), data: giorno(d), ml: [2250, 1800, 2500, 2000, 1250, 2300][i], voci: [] })),
  ],
  logDieta: (() => {
    const mk = (d, mangiati) => ({
      id: "l" + d, data: giorno(d), pianoId: "demo-piano", pianoNome: "Piano autunno",
      giornoNumero: ((new Date(giorno(d) + "T12:00").getDay() + 6) % 7) + 1, selectedAlts: {}, extra: [],
      pastiLog: pasti.map((p, pi) => ({ nome: p.nome, alimenti: p.alimenti.map(a => ({ ...a, mangiato: pi < mangiati })) })),
      totKcalConsumate: pasti.slice(0, mangiati).reduce((s, p) => s + p.alimenti.reduce((b, a) => b + a.kcal, 0), 0),
    });
    return [mk(0, 2), mk(-1, 5), mk(-2, 5), mk(-3, 3), mk(-4, 5)];
  })(),
};
