import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

export const db = {
  async getSchede() { const { data } = await sb.from("schede").select("*"); return data ? data.map(r => r.data) : []; },
  async setSchede(a) { await sb.from("schede").delete().neq("id", "__x__"); if (a.length) await sb.from("schede").insert(a.map(s => ({ id: s.id, data: s }))); },
  async getSessioni() { const { data } = await sb.from("sessioni").select("*").order("created_at", { ascending: false }); return data ? data.map(r => r.data) : []; },
  async addSessione(s) { await sb.from("sessioni").insert({ id: s.id, data: s }); },
  async delSessione(id) { await sb.from("sessioni").delete().eq("id", id); },
  async getPeso() { const { data } = await sb.from("peso").select("*").order("data", { ascending: true }); return data || []; },
  async addPeso(p) {
    const res = await sb.from("peso").insert(p);
    if (res.error && res.error.code === 'PGRST204') {
      const { proteine, proteine_status, metabolismo, metabolismo_status, massa_ossea, massa_ossea_status, ...rest } = p;
      const res2 = await sb.from("peso").insert(rest);
      if (res2.error) throw new Error(res2.error.message);
    } else if (res.error) {
      throw new Error(res.error.message);
    }
  },
  async delPeso(id) { await sb.from("peso").delete().eq("id", id); },
  async getSettings() { try { const { data } = await sb.from("impostazioni").select("*").eq("id", "settings").single(); return data?.data || {}; } catch { return {}; } },
  async saveSettings(s) { await sb.from("impostazioni").upsert({ id: "settings", data: s }); },
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
