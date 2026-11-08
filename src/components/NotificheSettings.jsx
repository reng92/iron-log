import { useState, useEffect, useCallback } from "react";
import { cfg, isNative, platform, syncNotifiche, testNotifica, diagnostica, apriImpostazioniAllarmiEsatti, cancellaTutte, pastoDaPreparare } from "../notifications";
import { fmtIso } from "../utils";

function Toggle({ on, onClick }) {
  return (
    <button className="btn btn-s" onClick={onClick}
      style={{ padding: "6px 14px", fontSize: 12, background: on ? "var(--acc2)" : undefined, color: on ? "var(--acc)" : undefined, borderColor: on ? "var(--acc)" : undefined }}>
      {on ? "ATTIVE" : "DISATTIVE"}
    </button>
  );
}

function Riga({ titolo, sub, on, onToggle, children }) {
  return (
    <div style={{ padding: "12px 0", borderTop: "1px solid var(--bdr)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{titolo}</div>
          {sub && <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>{sub}</div>}
        </div>
        <Toggle on={on} onClick={onToggle} />
      </div>
      {on && <div style={{ marginTop: 10 }}>{children}</div>}
    </div>
  );
}

const fmtQuando = n => {
  if (n.on) return `ogni giorno ${String(n.on.hour).padStart(2, "0")}:${String(n.on.minute ?? 0).padStart(2, "0")}`;
  if (!n.at) return "—";
  const oggi = fmtIso(), d = fmtIso(n.at);
  const ora = n.at.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  return d === oggi ? `oggi ${ora}` : `${n.at.toLocaleDateString("it-IT", { weekday: "short", day: "numeric" })} ${ora}`;
};

export default function NotificheSettings({ settings, onSave, ctx }) {
  const set = (k, v) => onSave({ ...settings, [k]: v });
  const [diag, setDiag] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [showPending, setShowPending] = useState(false);

  const refresh = useCallback(async () => setDiag(await diagnostica()), []);
  useEffect(() => { if (showTest) refresh(); }, [showTest, refresh]);

  const esegui = async (label, fn) => {
    setBusy(true); setMsg("");
    try { setMsg(await fn()); } catch (e) { setMsg("Errore: " + (e.message || e)); }
    setBusy(false);
    setTimeout(refresh, 600);
  };

  const test = tipo => esegui(tipo, async () => {
    const r = await testNotifica(tipo, settings, ctx, 5);
    return r.ok ? `✓ Notifica "${tipo}" in arrivo tra 5 secondi${isNative ? " — chiudi o metti in background l'app per vederla come vera notifica" : " (tieni aperta questa scheda)"}` : `✗ ${r.error}`;
  });

  const domani = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return fmtIso(d); })();
  const anteprimaPasto = pastoDaPreparare(ctx?.piani || [], domani, cfg(settings, "pasti_pasto"));

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="st" style={{ marginBottom: 4 }}>🔔 NOTIFICHE</div>
      {!isNative && (
        <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 8, lineHeight: 1.5 }}>
          Sul web le notifiche arrivano solo con l'app aperta in una scheda. Per i promemoria veri usa l'app Android.
        </div>
      )}

      <Riga titolo="Promemoria giornaliero" sub="Logga allenamento e dieta" on={!!settings.notifiche_attive} onToggle={() => set("notifiche_attive", !settings.notifiche_attive)}>
        <label className="lbl">Orario</label>
        <input className="inp" type="time" value={settings.notifiche_orario || "08:00"} onChange={e => set("notifiche_orario", e.target.value)} />
      </Riga>

      <Riga titolo="💧 Bevi acqua" sub="Si fermano quando raggiungi l'obiettivo del giorno" on={!!cfg(settings, "acqua_notif")} onToggle={() => set("acqua_notif", !cfg(settings, "acqua_notif"))}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <div><label className="lbl">Dalle</label><input className="inp" type="time" value={cfg(settings, "acqua_dalle")} onChange={e => set("acqua_dalle", e.target.value)} /></div>
          <div><label className="lbl">Alle</label><input className="inp" type="time" value={cfg(settings, "acqua_alle")} onChange={e => set("acqua_alle", e.target.value)} /></div>
          <div>
            <label className="lbl">Ogni</label>
            <select className="inp" value={cfg(settings, "acqua_ogni")} onChange={e => set("acqua_ogni", +e.target.value)}>
              {[60, 90, 120, 150, 180].map(m => <option key={m} value={m}>{m >= 60 && m % 60 === 0 ? `${m / 60} h` : `${Math.floor(m / 60)}h${m % 60}`}</option>)}
            </select>
          </div>
        </div>
        <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 6 }}>Dalla notifica puoi premere “+{cfg(settings, "acqua_borraccia")} ml” o “+250 ml” per segnare subito.</div>
      </Riga>

      <Riga titolo="🍱 Preparazione pasti" sub="La sera, cosa preparare per domani" on={!!cfg(settings, "pasti_notif")} onToggle={() => set("pasti_notif", !cfg(settings, "pasti_notif"))}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div><label className="lbl">Orario</label><input className="inp" type="time" value={cfg(settings, "pasti_orario")} onChange={e => set("pasti_orario", e.target.value)} /></div>
          <div><label className="lbl">Pasto</label><input className="inp" placeholder="pranzo" defaultValue={cfg(settings, "pasti_pasto")} onBlur={e => { const v = e.target.value.trim().toLowerCase() || "pranzo"; if (v !== cfg(settings, "pasti_pasto")) set("pasti_pasto", v); }} /></div>
        </div>
        <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 6, lineHeight: 1.5 }}>
          {anteprimaPasto
            ? <>Domani: <b style={{ color: "var(--txt)" }}>{anteprimaPasto.nome}</b> — {anteprimaPasto.alimenti.join(", ") || "nessun alimento"}</>
            : "Nessun pasto con questo nome nel piano attivo per domani: arriverà un promemoria generico."}
        </div>
      </Riga>

      {/* ── PANNELLO TEST ── */}
      <div style={{ borderTop: "1px solid var(--bdr)", paddingTop: 12 }}>
        <button className="btn btn-s btn-full" style={{ fontSize: 12 }} onClick={() => setShowTest(s => !s)}>
          🧪 {showTest ? "CHIUDI TEST NOTIFICHE" : "TEST NOTIFICHE"}
        </button>
        {showTest && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12, marginBottom: 10 }}>
              <div style={{ color: "var(--dim)" }}>Piattaforma</div><div style={{ fontWeight: 600 }}>{platform}</div>
              <div style={{ color: "var(--dim)" }}>Permesso</div>
              <div style={{ fontWeight: 600, color: diag?.permesso === "granted" ? "var(--ok)" : "var(--dan)" }}>{diag ? diag.permesso : "…"}</div>
              {platform === "android" && <>
                <div style={{ color: "var(--dim)" }}>Allarmi esatti</div>
                <div style={{ fontWeight: 600, color: diag?.esatti === "granted" ? "var(--ok)" : "#FF9500" }}>{diag?.esatti ?? "…"}</div>
              </>}
              <div style={{ color: "var(--dim)" }}>In coda</div><div style={{ fontWeight: 600 }}>{diag ? diag.pending.length : "…"}</div>
            </div>
            {platform === "android" && diag?.esatti && diag.esatti !== "granted" && (
              <div style={{ fontSize: 11, color: "#FF9500", marginBottom: 10, lineHeight: 1.5 }}>
                Senza "allarmi esatti" Android può ritardare le notifiche anche di parecchi minuti.
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              <button className="btn btn-s" style={{ fontSize: 11, padding: "10px 4px" }} disabled={busy} onClick={() => test("generica")}>🔔 BASE</button>
              <button className="btn btn-s" style={{ fontSize: 11, padding: "10px 4px" }} disabled={busy} onClick={() => test("acqua")}>💧 ACQUA</button>
              <button className="btn btn-s" style={{ fontSize: 11, padding: "10px 4px" }} disabled={busy} onClick={() => test("pasti")}>🍱 PASTI</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
              <button className="btn btn-s" style={{ fontSize: 11 }} disabled={busy} onClick={() => esegui("sync", async () => {
                const r = await syncNotifiche(settings, ctx);
                return r?.denied ? "✗ Permesso negato" : `✓ Rischedulate ${r?.scheduled ?? 0} notifiche`;
              })}>🔄 RISCHEDULA</button>
              <button className="btn btn-s" style={{ fontSize: 11 }} disabled={busy} onClick={refresh}>↻ AGGIORNA STATO</button>
              {platform === "android" && (
                <button className="btn btn-s" style={{ fontSize: 11 }} disabled={busy} onClick={() => esegui("exact", async () => `Allarmi esatti: ${await apriImpostazioniAllarmiEsatti() ?? "?"}`)}>⏰ ALLARMI ESATTI</button>
              )}
              <button className="btn btn-s" style={{ fontSize: 11, color: "var(--dan)" }} disabled={busy} onClick={() => esegui("clear", async () => { await cancellaTutte(); return "Coda svuotata (si riempie al prossimo sync)"; })}>🗑 SVUOTA CODA</button>
            </div>

            {msg && <div style={{ fontSize: 12, marginTop: 10, padding: "8px 10px", borderRadius: 8, background: "var(--sur)", lineHeight: 1.4 }}>{msg}</div>}

            {diag?.pending.length > 0 && (
              <>
                <button style={{ background: "none", border: "none", color: "var(--acc)", fontSize: 12, padding: "10px 0 4px", cursor: "pointer" }} onClick={() => setShowPending(s => !s)}>
                  {showPending ? "▾" : "▸"} Notifiche programmate ({diag.pending.length})
                </button>
                {showPending && diag.pending.slice(0, 30).map(n => (
                  <div key={n.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11, padding: "5px 0", borderBottom: "1px solid var(--bdr)" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title}</span>
                    <span style={{ color: "var(--dim)", flexShrink: 0 }}>{fmtQuando(n)}</span>
                  </div>
                ))}
              </>
            )}

            {isNative && (
              <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 10, lineHeight: 1.5 }}>
                Se le notifiche non arrivano a app chiusa: Impostazioni Android → App → Iron Log → Batteria → “Senza restrizioni”.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
