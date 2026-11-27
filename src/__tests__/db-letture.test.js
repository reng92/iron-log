// Regressione: le query di Supabase sono "thenable". Se una funzione async le restituisce,
// l'await le esegue subito e poi .order() non esiste più ("n.order is not a function").
const calls = [];
const builder = () => {
  const b = {
    select: () => { calls.push("select"); return b; },
    eq: (c, v) => { calls.push(`eq:${c}=${v}`); return b; },
    order: c => { calls.push(`order:${c}`); return b; },
    // come la vera PostgrestBuilder: si può fare await direttamente sulla query
    then: (res, rej) => Promise.resolve({ data: [{ data: { id: "x" } }], error: null }).then(res, rej),
  };
  return b;
};

jest.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => builder(),
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: "u1" } } } }) },
  }),
}));

const { db } = require("../db");

beforeEach(() => { calls.length = 0; });

test("le letture filtrano per utente e poi ordinano, senza eseguire la query in anticipo", async () => {
  await expect(db.getSessioni()).resolves.toEqual([{ id: "x" }]);
  expect(calls).toEqual(["select", "eq:user_id=u1", "order:created_at"]);
});

test("getPeso e getLogDieta funzionano con query thenable", async () => {
  await expect(db.getPeso()).resolves.toHaveLength(1);
  await expect(db.getLogDieta()).resolves.toHaveLength(1);
  expect(calls.filter(c => c.startsWith("order")).length).toBe(2);
});
