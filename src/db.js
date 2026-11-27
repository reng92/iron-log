import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

export const auth = {
  async signIn(email, password) { return sb.auth.signInWithPassword({ email, password }); },
  async signUp(email, password) { return sb.auth.signUp({ email, password }); },
  async signOut() { return sb.auth.signOut(); },
  onAuthChange(cb) {
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => cb(session?.user || null));
    return () => subscription.unsubscribe();
  }
};

// Ogni chiamata a Supabase passa da qui: se c'è un errore viene lanciato,
// così l'interfaccia può avvisare l'utente invece di perdere il dato in silenzio.
const ok = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

// id dell'utente loggato (dalla sessione locale, senza chiamate di rete)
export const mioId = async () => (await sb.auth.getSession())?.data?.session?.user?.id || null;

// Le policy permettono a un personal trainer di leggere anche i dati dei suoi clienti:
// per questo ogni lettura "mia" filtra esplicitamente per user_id.
const soloMiei = async q => { const uid = await mioId(); return uid ? q.eq("user_id", uid) : q; };

const getJson = async (table, order) => {
  let q = await soloMiei(sb.from(table).select("*"));
  if (order) q = q.order(order.col, { ascending: order.asc });
  return (ok(await q) || []).map(r => r.data);
};

// Sincronizza una lista completa (schede, piani) senza mai svuotare la tabella:
// prima salva/aggiorna tutte le righe attuali, poi elimina solo quelle tolte.
// Se il salvataggio fallisce, non viene cancellato niente.
// Con `prev` (la lista prima della modifica) cancella SOLO gli id tolti dall'utente:
// così una scheda assegnata dal PT mentre l'app era aperta non viene mai cancellata.
export async function syncList(table, items, prev) {
  if (items.length) ok(await sb.from(table).upsert(items.map(s => ({ id: s.id, data: s }))));
  if (Array.isArray(prev)) {
    const ora = new Set(items.map(s => s.id));
    const tolti = prev.map(s => s.id).filter(id => !ora.has(id));
    if (tolti.length) ok(await sb.from(table).delete().in("id", tolti));
    return;
  }
  const keep = items.map(s => s.id);
  let del = sb.from(table).delete();
  del = keep.length ? del.not("id", "in", `(${keep.map(id => `"${String(id).replace(/"/g, '\\"')}"`).join(",")})`) : del.not("id", "is", null);
  ok(await del);
}

export const db = {
  getSchede: () => getJson("schede"),
  setSchede: (a, prev) => syncList("schede", a, prev),
  getSessioni: () => getJson("sessioni", { col: "created_at", asc: false }),
  async addSessione(s) { ok(await sb.from("sessioni").insert({ id: s.id, data: s })); },
  async delSessione(id) { ok(await sb.from("sessioni").delete().eq("id", id)); },
  async getPeso() { return ok(await (await soloMiei(sb.from("peso").select("*"))).order("data", { ascending: true })) || []; },
  async addPeso(p) { ok(await sb.from("peso").insert(p)); },
  async delPeso(id) { ok(await sb.from("peso").delete().eq("id", id)); },
  async getSettings() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return {};
    const data = ok(await sb.from("impostazioni").select("*").eq("id", user.id).maybeSingle());
    return data?.data || {};
  },
  async saveSettings(s) {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    ok(await sb.from("impostazioni").upsert({ id: user.id, data: s }));
  },
  getPiani: () => getJson("piani_alimentari"),
  setPiani: (a, prev) => syncList("piani_alimentari", a, prev),
  async getLogDieta() {
    const data = ok(await (await soloMiei(sb.from("log_dieta").select("*"))).order("created_at", { ascending: false })) || [];
    return data.map(r => ({ ...r.data, _created_at: r.created_at }));
  },
  async addLogDieta(s) { ok(await sb.from("log_dieta").insert({ id: s.id, data: s })); },
  async delLogDieta(id) { ok(await sb.from("log_dieta").delete().eq("id", id)); },
  getMisure: () => getJson("misure_corporee", { col: "created_at", asc: true }),
  async addMisura(m) { ok(await sb.from("misure_corporee").insert({ id: m.id, data: m })); },
  async updMisura(m) { ok(await sb.from("misure_corporee").update({ data: m }).eq("id", m.id)); },
  async delMisura(id) { ok(await sb.from("misure_corporee").delete().eq("id", id)); },
  getSpese: () => getJson("spesa", { col: "created_at", asc: false }),
  async saveSpesa(s) { ok(await sb.from("spesa").upsert({ id: s.id, data: s })); },
  async delSpesa(id) { ok(await sb.from("spesa").delete().eq("id", id)); },
  getAcqua: () => getJson("acqua"),
  async saveAcqua(a) { ok(await sb.from("acqua").upsert({ id: a.id, data: a })); },
  // GDPR: cancella tutti i dati dell'utente e il suo account (funzione SQL delete_my_account)
  async deleteAccount() { ok(await sb.rpc("delete_my_account")); },
};

// Modalità demo (solo sviluppo, ?demo=1): nessuna lettura/scrittura su Supabase
export const IS_DEMO = process.env.NODE_ENV === "development" && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo");
if (IS_DEMO) Object.keys(db).forEach(k => { db[k] = async () => (k.startsWith("get") ? [] : undefined); });
