import { rangeRip, suggerisciCarico, calcolaStreak, avvisiStallo, aderenza } from "../insights";

const OGGI = new Date("2026-11-27T10:00:00");
const iso = n => { const d = new Date(OGGI); d.setDate(d.getDate() - n); return d.toISOString(); };
const isoD = n => { const d = new Date(OGGI); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

test("rangeRip legge range e numeri singoli, ignora il resto", () => {
  expect(rangeRip("8-12")).toEqual({ min: 8, max: 12 });
  expect(rangeRip("10")).toEqual({ min: 10, max: 10 });
  expect(rangeRip("10 min")).toBeNull();
});

test("progressione: tutte le serie al massimo → aumenta il carico", () => {
  const s = suggerisciCarico([{ kg: 60, reps: 12, completata: true }, { kg: 60, reps: 12, completata: true }], "8-12");
  expect(s.azione).toBe("aumenta");
  expect(s.kg).toBe(62.5);
});

test("progressione: sotto il minimo → mantieni; in mezzo → ripetizioni", () => {
  expect(suggerisciCarico([{ kg: 60, reps: 6, completata: true }, { kg: 60, reps: 9, completata: true }], "8-12").azione).toBe("mantieni");
  expect(suggerisciCarico([{ kg: 60, reps: 10, completata: true }, { kg: 60, reps: 9, completata: true }], "8-12").azione).toBe("ripetizioni");
  expect(suggerisciCarico([], "8-12")).toBeNull();
  expect(suggerisciCarico([{ kg: 0, reps: 10, completata: true }], "8-12")).toBeNull();
});

test("streak: giorni consecutivi, oggi non ancora fatto non azzera", () => {
  const r = calcolaStreak({ sessioni: [{ data: iso(1) }, { data: iso(2) }], logDieta: [{ data: isoD(3) }, { data: isoD(6) }] }, OGGI);
  expect(r.corrente).toBe(3);
  expect(r.migliore).toBe(3);
  expect(r.oggiFatto).toBe(false);
});

test("stallo: peso fermo e carico fermo vengono segnalati", () => {
  const peso = [20, 13, 6, 1].map(n => ({ data: isoD(n), valore: 80 + (n % 2) * 0.2 }));
  const sessioni = [10, 8, 5, 2].map(n => ({ data: iso(n), esercizi: [{ nome: "Panca", serie: [{ kg: 80, reps: 8, completata: true }] }] }));
  const tipi = avvisiStallo({ peso, sessioni, logDieta: [] }, OGGI).map(a => a.tipo);
  expect(tipi).toContain("peso");
  expect(tipi).toContain("carico");
  expect(tipi).not.toContain("inattivo");
});

test("aderenza conta allenamenti e giorni nel piano", () => {
  const a = aderenza({
    sessioni: [{ data: iso(1) }, { data: iso(20) }],
    logDieta: [{ data: isoD(1), totKcalPreviste: 2000, totKcalConsumate: 2100 }, { data: isoD(2), totKcalPreviste: 2000, totKcalConsumate: 2600 }],
  }, 7, OGGI);
  expect(a.allenamenti).toBe(1);
  expect(a.giorniDieta).toBe(2);
  expect(a.giorniNelPiano).toBe(1);
});
