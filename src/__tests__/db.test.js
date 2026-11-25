// Il salvataggio di schede/piani non deve MAI svuotare la tabella se l'upsert fallisce.
const calls = [];
let upsertError = null;

const builder = (table) => {
  const b = {
    upsert: rows => { calls.push(["upsert", table, rows]); return Promise.resolve({ error: upsertError }); },
    delete: () => { calls.push(["delete", table]); return b; },
    not: (col, op, val) => { calls.push(["not", col, op, val]); return Promise.resolve({ error: null }); },
  };
  return b;
};

jest.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: t => builder(t), auth: {}, rpc: () => Promise.resolve({ error: null }) }),
}));

const { syncList } = require("../db");

beforeEach(() => { calls.length = 0; upsertError = null; });

test("salva le righe attuali e cancella solo quelle tolte", async () => {
  await syncList("schede", [{ id: "a" }, { id: "b" }]);
  expect(calls[0]).toEqual(["upsert", "schede", [{ id: "a", data: { id: "a" } }, { id: "b", data: { id: "b" } }]]);
  expect(calls[1]).toEqual(["delete", "schede"]);
  expect(calls[2]).toEqual(["not", "id", "in", '("a","b")']);
});

test("se l'upsert fallisce non cancella niente e segnala l'errore", async () => {
  upsertError = { message: "rete assente" };
  await expect(syncList("schede", [{ id: "a" }])).rejects.toThrow("rete assente");
  expect(calls.some(c => c[0] === "delete")).toBe(false);
});

test("lista vuota = l'utente ha eliminato tutto: cancella le sue righe", async () => {
  await syncList("piani_alimentari", []);
  expect(calls[0]).toEqual(["delete", "piani_alimentari"]);
  expect(calls[1]).toEqual(["not", "id", "is", null]);
});

test("gli id con virgolette non rompono il filtro", async () => {
  await syncList("schede", [{ id: 'x"y' }]);
  expect(calls[2][3]).toBe('("x\\"y")');
});
