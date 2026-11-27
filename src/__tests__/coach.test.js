import { aggiornaLogDieta, pastiPerCoach } from "../dieta";
import { normalizzaAzioni } from "../ai";

jest.mock("../db", () => ({ sb: {}, IS_DEMO: false }));

const ISO = "2026-11-27"; // venerdì → giorno 5
const piano = {
  id: "p1", nome: "Piano autunno", dataInizio: "2026-11-01",
  giorniPasti: {
    5: [
      { id: "a", nome: "Colazione", alimenti: [{ nome: "Yogurt", grammi: "170", kcal: "100" }] },
      { id: "b1", nome: "Pranzo A", altGroupId: "pr", alimenti: [{ nome: "Riso", grammi: "80", kcal: "285" }] },
      { id: "b2", nome: "Pranzo B", altGroupId: "pr", alimenti: [{ nome: "Pasta", grammi: "80", kcal: "280" }] },
    ],
  },
};

test("pastiPerCoach elenca i pasti di oggi con indice e alternative", () => {
  const t = pastiPerCoach([piano], [], ISO);
  expect(t).toContain("[0] Colazione");
  expect(t).toContain('[2] Pranzo B (alternativa del gruppo "pr")');
  expect(t).toContain("da mangiare");
});

test("il coach segna l'alternativa scelta e aggiunge gli extra al diario", () => {
  const r = aggiornaLogDieta([piano], [], ISO, { pasti: [2], extra: [{ nome: "Birra media", kcal: 200 }] });
  expect(r.log.selectedAlts.pr).toBe("b2");
  expect(r.log.pastiLog[2].alimenti[0].mangiato).toBe(true);
  expect(r.log.extra).toHaveLength(1);
  expect(r.log.totKcalConsumate).toBe(480); // 280 pasta + 200 birra
  expect(r.log.totKcalPreviste).toBe(100 + 280); // colazione + alternativa scelta
});

test("registrazioni successive mantengono quanto già segnato", () => {
  const primo = aggiornaLogDieta([piano], [], ISO, { pasti: [0] }).log;
  const r = aggiornaLogDieta([piano], [primo], ISO, { extra: [{ nome: "Mela", kcal: 80 }] });
  expect(r.oldId).toBe(primo.id);
  expect(r.log.pastiLog[0].alimenti[0].mangiato).toBe(true);
  expect(r.log.totKcalConsumate).toBe(180);
});

test("senza piano registra comunque gli extra", () => {
  const r = aggiornaLogDieta([], [], ISO, { extra: [{ nome: "Pizza", kcal: 800 }] });
  expect(r.log.totKcalConsumate).toBe(800);
  expect(aggiornaLogDieta([], [], ISO, { pasti: [0] })).toBeNull();
});

test("normalizzaAzioni scarta azioni non valide e limita i valori", () => {
  const a = normalizzaAzioni([
    { tipo: "pasto", idx: 1 }, { tipo: "pasto", idx: 1 }, { tipo: "pasto", idx: -3 },
    { tipo: "extra", nome: "Gelato", kcal: 250.4 }, { tipo: "extra", nome: "" },
    { tipo: "acqua", ml: 500 }, { tipo: "acqua", ml: 99999 }, { tipo: "cancella_tutto" },
  ]);
  expect(a.pasti).toEqual([1]);
  expect(a.extra).toEqual([{ nome: "Gelato", kcal: 250 }]);
  expect(a.acqua).toBe(3500);
});
