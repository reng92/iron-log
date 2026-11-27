// Edge Function "pt": operazioni del Personal Trainer che richiedono privilegi admin
// (creare l'account di un cliente, reimpostargli la password, scollegarlo).
// Solo per utenti presenti nella tabella public.trainer.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// Password temporanea leggibile (niente caratteri ambigui), con lettere e numeri
const passwordTemporanea = () => {
  const L = "abcdefghjkmnpqrstuvwxyz", N = "23456789";
  const r = (s: string) => s[crypto.getRandomValues(new Uint32Array(1))[0] % s.length];
  const blocco = () => r(L) + r(L) + r(N) + r(L);
  return `${blocco()}-${blocco()}-${blocco()}`.replace(/^./, (c) => c.toUpperCase());
};

const MAX_CLIENTI = Number(Deno.env.get("PT_MAX_CLIENTI") || 200);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Metodo non consentito" }, 405);
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""));
    if (!user) return json({ error: "Devi essere loggato" }, 401);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: trainer } = await admin.from("trainer").select("user_id").eq("user_id", user.id).maybeSingle();
    if (!trainer) return json({ error: "Questo account non è abilitato come personal trainer" }, 403);

    const body = await req.json().catch(() => ({}));
    const azione = body?.azione;

    // Il cliente deve essere davvero di questo PT
    const mioCliente = async (id: unknown) => {
      if (typeof id !== "string") return null;
      const { data } = await admin.from("trainer_clienti").select("cliente_id,email").eq("cliente_id", id).eq("trainer_id", user.id).maybeSingle();
      return data;
    };

    if (azione === "crea_cliente") {
      const email = String(body.email || "").trim().toLowerCase();
      const nome = String(body.nome || "").trim().slice(0, 80);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Email non valida" }, 400);
      if (!nome) return json({ error: "Inserisci il nome del cliente" }, 400);
      const { count } = await admin.from("trainer_clienti").select("cliente_id", { count: "exact", head: true }).eq("trainer_id", user.id);
      if ((count || 0) >= MAX_CLIENTI) return json({ error: `Hai raggiunto il massimo di ${MAX_CLIENTI} clienti` }, 400);

      const password = passwordTemporanea();
      const { data: creato, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { deve_cambiare_password: true, creato_da_trainer: true },
      });
      if (error || !creato?.user) {
        const gia = /already|registered|exists/i.test(error?.message || "");
        return json({ error: gia ? "Esiste già un account con questa email. Per collegarlo scrivi all'amministratore dell'app." : "Impossibile creare l'account, riprova" }, gia ? 409 : 500);
      }
      const id = creato.user.id;
      const { error: linkErr } = await admin.from("trainer_clienti").insert({ cliente_id: id, trainer_id: user.id, nome, email });
      if (linkErr) {
        await admin.auth.admin.deleteUser(id); // niente account orfani
        return json({ error: "Impossibile collegare il cliente, riprova" }, 500);
      }
      await admin.from("impostazioni").upsert({ id, user_id: id, data: { nome, darkMode: true } });
      return json({ cliente: { cliente_id: id, nome, email, note: "" }, password });
    }

    if (azione === "reset_password") {
      const c = await mioCliente(body.cliente_id);
      if (!c) return json({ error: "Cliente non trovato" }, 404);
      const password = passwordTemporanea();
      const { error } = await admin.auth.admin.updateUserById(c.cliente_id, { password, user_metadata: { deve_cambiare_password: true } });
      if (error) return json({ error: "Impossibile reimpostare la password" }, 500);
      return json({ password });
    }

    if (azione === "rimuovi_cliente") {
      const c = await mioCliente(body.cliente_id);
      if (!c) return json({ error: "Cliente non trovato" }, 404);
      // scollega soltanto: l'account e i dati restano del cliente
      await admin.from("trainer_clienti").delete().eq("cliente_id", c.cliente_id).eq("trainer_id", user.id);
      return json({ ok: true });
    }

    return json({ error: "Azione non valida" }, 400);
  } catch (e) {
    console.error("[pt]", e);
    return json({ error: "Errore interno" }, 500);
  }
});
