import { sb, mioId, IS_DEMO } from "./db";

// ─── Modalità Personal Trainer ───────────────────────────────────
// Letture/scritture sui dati dei clienti: le policy RLS (is_my_client) garantiscono
// che un PT veda e modifichi solo i propri clienti.
const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

async function chiamaPt(azione, payload = {}) {
  const { data, error } = await sb.functions.invoke("pt", { body: { azione, ...payload } });
  if (error) {
    let msg = "Servizio non raggiungibile, riprova";
    try { const b = await error.context?.json(); if (b?.error) msg = b.error; } catch { /* non JSON */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export const pt = {
  // { trainer: {user_id,nome} | null, mioTrainer: {nome} | null }
  async ruolo() {
    if (IS_DEMO) return { trainer: null, mioTrainer: null };
    const uid = await mioId();
    if (!uid) return { trainer: null, mioTrainer: null };
    const [t, link] = await Promise.all([
      sb.from("trainer").select("user_id,nome").eq("user_id", uid).maybeSingle(),
      sb.from("trainer_clienti").select("trainer_id").eq("cliente_id", uid).maybeSingle(),
    ]);
    let mioTrainer = null;
    if (link.data?.trainer_id) {
      const { data } = await sb.from("trainer").select("nome").eq("user_id", link.data.trainer_id).maybeSingle();
      mioTrainer = { nome: data?.nome || "il tuo personal trainer" };
    }
    return { trainer: t.data || null, mioTrainer };
  },

  async clienti() {
    const uid = await mioId();
    return ok(await sb.from("trainer_clienti").select("*").eq("trainer_id", uid).order("nome")) || [];
  },

  // Dati leggeri degli ultimi 30 giorni di tutti i clienti (per la lista: niente foto)
  async riepilogo(ids) {
    if (!ids.length) return {};
    const da = new Date(); da.setDate(da.getDate() - 30);
    const daIso = da.toISOString().slice(0, 10);
    const [s, l, p] = await Promise.all([
      sb.from("sessioni").select("user_id,data").in("user_id", ids).gte("created_at", da.toISOString()),
      sb.from("log_dieta").select("user_id,data").in("user_id", ids).gte("created_at", da.toISOString()),
      sb.from("peso").select("user_id,data,valore").in("user_id", ids).gte("data", daIso).order("data"),
    ]);
    const out = Object.fromEntries(ids.map(id => [id, { sessioni: [], logDieta: [], peso: [] }]));
    (ok(s) || []).forEach(r => out[r.user_id]?.sessioni.push(r.data));
    (ok(l) || []).forEach(r => out[r.user_id]?.logDieta.push(r.data));
    (ok(p) || []).forEach(r => out[r.user_id]?.peso.push({ data: r.data, valore: +r.valore }));
    return out;
  },

  // Tutti i dati di un cliente, nella stessa forma usata dall'app del cliente
  async datiCliente(id) {
    const q = (t, order) => { let x = sb.from(t).select("*").eq("user_id", id); if (order) x = x.order(order, { ascending: false }); return x; };
    const [schede, sessioni, peso, misure, logDieta, piani, imp, acqua] = await Promise.all([
      q("schede"), q("sessioni", "created_at"), sb.from("peso").select("*").eq("user_id", id).order("data", { ascending: true }),
      q("misure_corporee"), q("log_dieta", "created_at"), q("piani_alimentari"),
      sb.from("impostazioni").select("*").eq("user_id", id).maybeSingle(), q("acqua"),
    ]);
    const json = r => (ok(r) || []).map(x => x.data);
    return {
      schede: json(schede), sessioni: json(sessioni), peso: ok(peso) || [], misure: json(misure),
      logDieta: json(logDieta), piani: json(piani), settings: ok(imp)?.data || {}, acqua: json(acqua),
    };
  },

  // Schede e piani assegnati: la riga appartiene al cliente (user_id = cliente)
  async salvaScheda(clienteId, scheda) { ok(await sb.from("schede").upsert({ id: scheda.id, user_id: clienteId, data: { ...scheda, daTrainer: true } })); },
  async eliminaScheda(id) { ok(await sb.from("schede").delete().eq("id", id)); },
  async salvaPiano(clienteId, piano) { ok(await sb.from("piani_alimentari").upsert({ id: piano.id, user_id: clienteId, data: { ...piano, daTrainer: true } })); },
  async eliminaPiano(id) { ok(await sb.from("piani_alimentari").delete().eq("id", id)); },

  async aggiornaCliente(clienteId, campi) { ok(await sb.from("trainer_clienti").update(campi).eq("cliente_id", clienteId)); },

  creaCliente: (email, nome) => chiamaPt("crea_cliente", { email, nome }),
  resetPassword: clienteId => chiamaPt("reset_password", { cliente_id: clienteId }),
  rimuoviCliente: clienteId => chiamaPt("rimuovi_cliente", { cliente_id: clienteId }),

  // Lato cliente: revoca l'accesso del PT ai propri dati
  async scollega() { ok(await sb.rpc("scollega_trainer")); },
};
