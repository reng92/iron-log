import { epley, fmtIso, fmtDur, pianoAttivo, pastiPerGiorno, targetKcalPiano, listaSpesaDaPiano, genId } from "../utils";
import { segnaPastoMangiato } from "../dieta";

test("epley: 1 ripetizione = carico, altrimenti stima 1RM", () => {
  expect(epley(100, 1)).toBe(100);
  expect(epley(100, 10)).toBe(133.3);
});

test("fmtIso usa la data locale in formato YYYY-MM-DD", () => {
  expect(fmtIso(new Date(2026, 0, 5))).toBe("2026-01-05");
});

test("fmtDur", () => {
  expect(fmtDur(45)).toBe("45s");
  expect(fmtDur(125)).toBe("2m 5s");
  expect(fmtDur(3725)).toBe("1h 2m");
});

test("genId produce id diversi", () => {
  const ids = new Set(Array.from({ length: 1000 }, genId));
  expect(ids.size).toBe(1000);
});

const piano = {
  id: "p1", nome: "Test", dataInizio: "2026-11-01", dataFine: "2026-11-30",
  giorniTipo: { 1: "palestra", 2: "riposo", 3: "riposo", 4: "riposo", 5: "riposo", 6: "riposo", 7: "riposo" },
  giorniPasti: {
    1: [{ id: "m1", nome: "Pranzo palestra", alimenti: [{ nome: "Riso", grammi: "100", kcal: "350" }] }],
    2: [{ id: "m2", nome: "Pranzo riposo", alimenti: [{ nome: "Pollo", grammi: "200", kcal: "220" }, { nome: "Olio", grammi: "10", kcal: "90" }] }],
  },
  target: { palestra: { kcal: { min: 1800, max: 2000 } } },
};

test("pianoAttivo sceglie il piano che copre la data", () => {
  const vecchio = { id: "old", dataInizio: "2026-10-01", dataFine: "2026-10-31" };
  expect(pianoAttivo([vecchio, piano], "2026-11-10").id).toBe("p1");
  expect(pianoAttivo([], "2026-11-10")).toBeNull();
});

test("pastiPerGiorno usa il modello del tipo giorno richiesto", () => {
  expect(pastiPerGiorno(piano, 2)[0].id).toBe("m2");
  expect(pastiPerGiorno(piano, 2, "palestra")[0].id).toBe("m1");
});

test("targetKcalPiano = centro del range", () => {
  expect(targetKcalPiano(piano, "palestra")).toBe(1900);
  expect(targetKcalPiano(piano, "riposo")).toBeNull();
});

test("listaSpesaDaPiano somma i grammi degli alimenti", () => {
  const lista = listaSpesaDaPiano(piano);
  expect(lista.map(x => x.nome)).toEqual(["Olio", "Pollo", "Riso"]);
  expect(lista.find(x => x.nome === "Pollo").qta).toBe("200 g");
});

test("segnaPastoMangiato calcola le kcal consumate", () => {
  // 2026-11-10 è martedì (riposo)
  const r = segnaPastoMangiato([piano], [], "2026-11-10", 0);
  expect(r.oldId).toBeNull();
  expect(r.log.totKcalConsumate).toBe(310);
  expect(r.log.pastiLog[0].alimenti.every(a => a.mangiato)).toBe(true);
});
