import { normalizzaVisita, unisciPerData, anonimizzaReferto, incoerenze, pesoDaVisita } from "../visita";

test("pesoDaVisita crea la pesata con la data della visita e i valori BIA corrispondenti", () => {
  const r = pesoDaVisita({ data: "2026-11-17", peso: 93.4, bmi: 33.1, fm_pct: 35.7, tbw_pct: 44.7, bmr: 1786.4, bonemc: 3 }, null, true, () => "id1");
  expect(r).toEqual({ tipo: "add", riga: { id: "id1", data: "2026-11-17", nota: "Visita nutrizionista", valore: 93.4, imc: 33.1, massa_grassa: 35.7, acqua: 44.7, metabolismo: 1786, massa_ossea: 3 } });
});

test("pesoDaVisita aggiorna la pesata dello stesso giorno solo se cambia qualcosa", () => {
  const esistente = { id: "p1", data: "2026-11-17", valore: 94, nota: "bilancia di casa", foto_fronte: "x" };
  const r = pesoDaVisita({ data: "2026-11-17", peso: 93.4 }, esistente);
  expect(r).toEqual({ tipo: "upd", riga: { ...esistente, valore: 93.4 } });
  expect(pesoDaVisita({ data: "2026-11-17", peso: 94 }, esistente)).toBeNull();
  expect(pesoDaVisita({ data: "2026-11-17", peso: 93.4 }, esistente, false)).toBeNull(); // avvio: non sovrascrive
  expect(pesoDaVisita({ data: "2026-11-17", vita: 100 }, null)).toBeNull(); // visita senza peso
});

test("anonimizzaReferto toglie anagrafica, medico e glossario", () => {
  const t = "DOTT. MARIO ROSSI via Roma 1 INFORMAZIONI ASSISTITO Nome Mario Cognome Bianchi Data di nascita 01/01/1990 ESAME Esame Total Body del 17/11/2026 PESO 93.4 kg IL PROFESSIONISTA Dott. MARIO ROSSI\nGLOSSARIO Altezza misurata in cm";
  const a = anonimizzaReferto(t);
  expect(a.startsWith("ESAME")).toBe(true);
  expect(a).toContain("93.4");
  expect(a).not.toMatch(/Bianchi|1990|ROSSI|GLOSSARIO/);
});

test("normalizzaVisita: 0 = non misurato, virgole decimali, campi sconosciuti ignorati", () => {
  const v = normalizzaVisita({ data: "2026-11-17", peso: "93,4", testa: 0, pha: 8.1, pl_tricipitale: null, hack: 5 });
  expect(v).toEqual({ data: "2026-11-17", peso: 93.4, pha: 8.1 });
});

test("unisciPerData unisce Antropometrico e Total Body dello stesso giorno", () => {
  const r = unisciPerData([
    { data: "2026-11-17", vita: 103 }, { data: "2026-06-23", vita: 94.5 },
    { data: "2026-11-17", peso: 93.4, fm: 33.3 }, { data: "data rotta", peso: 1 },
  ]);
  expect(r.map(v => v.data)).toEqual(["2026-06-23", "2026-11-17"]);
  expect(r[1]).toEqual({ data: "2026-11-17", vita: 103, peso: 93.4, fm: 33.3 });
});

test("incoerenze segnala FM + FFM diverso dal peso", () => {
  expect(incoerenze({ peso: 93.4, fm: 33.3, ffm: 60.1 })).toEqual([]);
  expect(incoerenze({ peso: 93.4, fm: 7.3, ffm: 60.1 }).length).toBe(1);
});
