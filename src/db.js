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

export const db = {
  async getSchede() { const { data } = await sb.from("schede").select("*"); return data ? data.map(r => r.data) : []; },
  async setSchede(a) { await sb.from("schede").delete().neq("id", "__x__"); if (a.length) await sb.from("schede").insert(a.map(s => ({ id: s.id, data: s }))); },
  async getSessioni() { const { data } = await sb.from("sessioni").select("*").order("created_at", { ascending: false }); return data ? data.map(r => r.data) : []; },
  async addSessione(s) { await sb.from("sessioni").insert({ id: s.id, data: s }); },
  async delSessione(id) { await sb.from("sessioni").delete().eq("id", id); },
  async getPeso() { const { data } = await sb.from("peso").select("*").order("data", { ascending: true }); return data || []; },
  async addPeso(p) {
    const { error } = await sb.from("peso").insert(p);
    if (error) throw new Error(error.message);
  },
  async delPeso(id) { await sb.from("peso").delete().eq("id", id); },
  async getSettings() {
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return {};
      const { data } = await sb.from("impostazioni").select("*").eq("id", user.id).single();
      return data?.data || {};
    } catch { return {}; }
  },
  async saveSettings(s) {
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      await sb.from("impostazioni").upsert({ id: user.id, data: s });
    } catch {}
  },
  async getPiani() { const { data } = await sb.from("piani_alimentari").select("*"); return data ? data.map(r => r.data) : []; },
  async setPiani(a) { await sb.from("piani_alimentari").delete().neq("id", "__x__"); if (a.length) await sb.from("piani_alimentari").insert(a.map(s => ({ id: s.id, data: s }))); },
  async getLogDieta() {
    const { data } = await sb.from("log_dieta").select("*").order("created_at", { ascending: false });
    return data ? data.map(r => ({ ...r.data, _created_at: r.created_at })) : [];
  },
  async addLogDieta(s) { await sb.from("log_dieta").insert({ id: s.id, data: s }); },
  async delLogDieta(id) { await sb.from("log_dieta").delete().eq("id", id); },
  async getCorse() { const { data } = await sb.from("sessioni_corsa").select("*").order("created_at", { ascending: false }); return data ? data.map(r => r.data) : []; },
  async addCorsa(c) { await sb.from("sessioni_corsa").insert({ id: c.id, data: c }); },
  async delCorsa(id) { await sb.from("sessioni_corsa").delete().eq("id", id); }
};
