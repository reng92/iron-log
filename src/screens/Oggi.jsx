import { useMemo, useState } from "react";
import { fmtIso, GG } from "../utils";
import { cfg, obiettivoAcqua } from "../notifications";
import { statoDieta, prossimoPasto } from "../dieta";
import { IcPlay, IcDumbbell, IcMoonRest, IcUndo, IcChevR, IcCheck, IcClose, IcUser, IcPlus } from "../components/Icons";

const fmtN = n => Math.round(n).toLocaleString("it-IT");
const fmtL = ml => (ml / 1000).toLocaleString("it-IT", { maximumFractionDigits: 2 });
const shift = (iso, d) => { const x = new Date(iso + "T12:00"); x.setDate(x.getDate() + d); return fmtIso(x); };

function Battery({ value, target, kind = "ok", overIsBad = false }) {
  const pct = target > 0 ? value / target : 0;
  const over = overIsBad && pct > 1.05;
  const w = Math.max(0, Math.min(1, pct)) * 100;
  return (
    <div className="bat" role="meter" aria-valuemin={0} aria-valuemax={target} aria-valuenow={value}>
      <div className="bat-body">
        <div className={`bat-fill${kind === "wat" ? " wat" : ""}${over ? " over" : ""}${w === 0 ? " empty" : ""}`} style={{ transform: `scaleX(${w / 100})` }} />
      </div>
      <div className="bat-pct" style={over ? { color: "var(--dan)" } : undefined}>{Math.round(pct * 100)}%</div>
    </div>
  );
}

function saluto(d = new Date()) {
  const h = d.getHours();
  return h < 5 ? "Buonanotte" : h < 13 ? "Buongiorno" : h < 18 ? "Buon pomeriggio" : "Buonasera";
}

export default function Oggi({ settings, schede, sessioni, peso, piani, logDieta, acqua, onAddAcqua, onUndoAcqua, onStart, onMangiato, onOpenDiario, onGo }) {
  const [pick, setPick] = useState(false);
  const [busyIdx, setBusyIdx] = useState(null);
  const oggi = fmtIso();
  const now = new Date();
  const todayIdx = (now.getDay() + 6) % 7;

  const dieta = useMemo(() => statoDieta(piani, logDieta, oggi, settings?.targetKcal || 1420), [piani, logDieta, oggi, settings?.targetKcal]);
  const prossimo = prossimoPasto(dieta, now);

  const sessOggi = sessioni.find(s => s.data && fmtIso(s.data) === oggi);
  const schedaOggi = schede.find(s => s.giorni?.includes(todayIdx));
  const palestra = !!sessOggi || dieta.tipo === "palestra" || (!dieta.tipo && !!schedaOggi);

  const acquaRow = acqua.find(a => a.data === oggi);
  const ml = acquaRow?.ml || 0;
  const { ml: mlTarget, palestra: acquaExtra } = obiettivoAcqua(settings, oggi, { piani, sessioni, logDieta });
  const borr = +cfg(settings, "acqua_borraccia") || 750;

  // Settimana corrente Lun→Dom
  const lun = shift(oggi, -todayIdx);
  const giorni = Array.from({ length: 7 }, (_, i) => shift(lun, i));
  const sett = giorni.map(iso => {
    const fut = iso > oggi;
    const allenato = sessioni.some(s => s.data && fmtIso(s.data) === iso);
    const st = statoDieta(piani, logDieta, iso, settings?.targetKcal || 1420);
    const dietaOk = st.log && (st.pasti.length ? st.pasti.every(p => p.mangiato) : st.kcal >= st.kcalTarget * 0.9);
    const aq = acqua.find(a => a.data === iso)?.ml || 0;
    const aqT = obiettivoAcqua(settings, iso, { piani, sessioni, logDieta }).ml;
    return {
      iso, fut,
      allenato: allenato ? "on" : "",
      dieta: dietaOk ? "on" : st.log ? "part" : "",
      acqua: aq >= aqT ? "on" : aq > 0 ? "part" : "",
    };
  });

  // Peso: ultimo valore, variazione su 7 giorni, ultime 7 rilevazioni
  const pesi = [...peso].filter(p => p.valore).sort((a, b) => a.data.localeCompare(b.data));
  const ultimo = pesi[pesi.length - 1];
  const rif = [...pesi].reverse().find(p => p.data <= shift(oggi, -7));
  const delta = ultimo && rif ? +(ultimo.valore - rif.valore).toFixed(1) : null;
  const serie = pesi.slice(-7).map(p => +p.valore);

  const nome = (settings?.nome || "").split(" ")[0];
  const dataLabel = now.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

  const segna = async idx => { setBusyIdx(idx); try { await onMangiato(idx); } finally { setBusyIdx(null); } };

  return (
    <>
      {/* Confezione */}
      <header className="pack">
        <div className="pack-top">
          <div>
            <h1 className="pack-hi">{saluto(now)}{nome ? `,` : ""}<br />{nome}</h1>
            <div className="pack-date">{dataLabel.charAt(0).toUpperCase() + dataLabel.slice(1)}</div>
          </div>
          <button className="pack-av" onClick={() => onGo("io")} aria-label="Profilo">
            {settings?.foto_profilo ? <img src={settings.foto_profilo} alt="" /> : <IcUser />}
          </button>
        </div>
        <div className="pack-chip">
          {palestra ? <IcDumbbell size={16} /> : <IcMoonRest size={16} />}
          {palestra ? "Giorno palestra" : "Giorno di riposo"}
        </div>
      </header>

      {/* Etichetta: valori di oggi */}
      <section className="lab lift" aria-label="Valori di oggi">
        <div className="lab-h">
          <h2 className="lab-t">Valori di oggi</h2>
          <div className="lab-meta">{dieta.piano ? dieta.piano.nome : "Nessun piano"}</div>
        </div>
        <div className="r8" />
        <div className="lab-cols"><span>Per oggi</span><span>assunti / obiettivo</span></div>

        <div className="lab-row">
          <div className="lab-line">
            <span className="lab-k">Energia</span>
            <span className="lab-v">{fmtN(dieta.kcal)} <small>/ {fmtN(dieta.kcalTarget)} kcal</small></span>
          </div>
          <Battery value={dieta.kcal} target={dieta.kcalTarget} overIsBad />
          <div className="lab-src">
            {dieta.kcalDalPiano ? `Obiettivo dal piano · giorno ${dieta.tipo === "palestra" ? "palestra" : dieta.tipo === "riposo" ? "riposo" : "standard"}` : "Obiettivo dalle impostazioni"}
            {dieta.kcal > dieta.kcalTarget ? ` · ${fmtN(dieta.kcal - dieta.kcalTarget)} kcal oltre` : ` · restano ${fmtN(dieta.kcalTarget - dieta.kcal)} kcal`}
          </div>
        </div>

        {dieta.protTarget ? (
          <div className="lab-row">
            <div className="lab-line">
              <span className="lab-k">Proteine</span>
              <span className="lab-v">{dieta.protNoti ? fmtN(dieta.prot) : "—"} <small>/ {dieta.protTarget} g</small></span>
            </div>
            {dieta.protNoti
              ? <Battery value={dieta.prot} target={dieta.protTarget} />
              : <div className="lab-src">Aggiungi i grammi di proteine agli alimenti del piano per vederle qui.</div>}
            {dieta.protNoti && <div className="lab-src">Obiettivo dal piano · somma degli alimenti segnati</div>}
          </div>
        ) : null}

        <div className="lab-row">
          <div className="lab-line">
            <span className="lab-k">Acqua</span>
            <span className="lab-v">{fmtL(ml)} <small>/ {fmtL(mlTarget)} L</small></span>
          </div>
          <Battery value={ml} target={mlTarget} kind="wat" />
          <div className="lab-src">
            {acquaExtra ? `Base ${fmtL(+cfg(settings, "acqua_obiettivo"))} L + extra palestra` : "Obiettivo giornaliero"}
            {ml < mlTarget ? ` · mancano ${fmtN(mlTarget - ml)} ml (${(Math.ceil(((mlTarget - ml) / borr) * 10) / 10).toLocaleString("it-IT")} borracce)` : " · raggiunto"}
          </div>
          <div className="lab-act">
            <button className="btn btn-p" onClick={() => onAddAcqua(oggi, borr)}><IcPlus size={18} /> {borr} ml</button>
            <button className="btn btn-s" onClick={() => onAddAcqua(oggi, 250)}><IcPlus size={18} /> 250 ml</button>
            <button className="bico" style={{ flex: "0 0 44px" }} disabled={!acquaRow?.voci?.length} onClick={() => onUndoAcqua(oggi)} aria-label="Annulla ultima aggiunta"><IcUndo size={18} /></button>
          </div>
        </div>

        <div className="r4" />

        {/* Allenamento di oggi */}
        <div className="lab-row">
          {sessOggi ? (
            <div className="wk">
              <div className="wk-ic"><IcCheck /></div>
              <div style={{ flex: 1 }}>
                <div className="wk-name">{sessOggi.schedaNome || "Allenamento"} fatto</div>
                <div className="wk-sub">{sessOggi.durata || 0} min · {sessOggi.esercizi?.length || 0} esercizi</div>
              </div>
              <button className="bico" onClick={() => onGo("allena", "storico")} aria-label="Apri log"><IcChevR /></button>
            </div>
          ) : schedaOggi ? (
            <>
              <div className="wk">
                <div className="wk-ic"><IcDumbbell /></div>
                <div style={{ flex: 1 }}>
                  <div className="wk-name">{schedaOggi.nome}</div>
                  <div className="wk-sub">Scheda di {GG[todayIdx].toLowerCase()} · {schedaOggi.esercizi?.length || 0} esercizi</div>
                </div>
              </div>
              <button className="btn btn-p btn-full" style={{ marginTop: 12, minHeight: 52, fontSize: 16 }} onClick={() => onStart(schedaOggi)}>
                <IcPlay /> Inizia allenamento
              </button>
            </>
          ) : (
            <div className="wk">
              <div className="wk-ic rest"><IcMoonRest /></div>
              <div style={{ flex: 1 }}>
                <div className="wk-name">Nessuna scheda oggi</div>
                <div className="wk-sub">{schede.length ? "Recupera, o allenati comunque" : "Crea la tua prima scheda"}</div>
              </div>
              <button className="btn btn-s" onClick={() => (schede.length ? setPick(true) : onGo("allena", "schede"))}>{schede.length ? "Allenati" : "Crea"}</button>
            </div>
          )}
        </div>

        <div className="lab-foot">Percentuali calcolate sui tuoi obiettivi giornalieri.</div>
      </section>

      {/* Prossimo pasto */}
      {dieta.piano && (
        <section className="lab" aria-label="Prossimo pasto">
          {prossimo ? (
            <>
              <div className="lab-h">
                <h2 className="lab-t" style={{ fontSize: 24 }}>{prossimo.pasto.nome}</h2>
                <div className="lab-meta">{prossimo.pasto.orario ? `ore ${prossimo.pasto.orario}` : "prossimo pasto"}{prossimo.parziale ? " · iniziato" : ""}</div>
              </div>
              <div className="r4" style={{ marginTop: 8 }} />
              <div style={{ padding: "4px 0 2px" }}>
                {(prossimo.pasto.alimenti || []).map((a, i) => (
                  <div key={i} className="ing">
                    <span>{a.nome}</span>
                    <b>{+a.grammi > 0 ? `${a.grammi} g` : ""}{+a.kcal > 0 ? <span style={{ color: "var(--mut)", fontWeight: 500 }}>{+a.grammi > 0 ? " · " : ""}{a.kcal} kcal</span> : null}</b>
                  </div>
                ))}
              </div>
              <div className="lab-act">
                <button className="btn btn-p" disabled={busyIdx != null} onClick={() => segna(prossimo.idx)}><IcCheck /> {busyIdx === prossimo.idx ? "Salvo…" : "Segna mangiato"}</button>
                <button className="btn btn-s" onClick={onOpenDiario}>Diario</button>
              </div>
            </>
          ) : (
            <div className="wk" style={{ padding: "4px 0" }}>
              <div className="wk-ic"><IcCheck /></div>
              <div style={{ flex: 1 }}>
                <div className="wk-name">Pasti di oggi segnati</div>
                <div className="wk-sub">{dieta.pasti.length} su {dieta.pasti.length} · {fmtN(dieta.kcal)} kcal</div>
              </div>
              <button className="btn btn-s" onClick={onOpenDiario}>Diario</button>
            </div>
          )}
        </section>
      )}

      {/* Settimana */}
      <section className="lab" aria-label="Settimana">
        <div className="lab-h">
          <h2 className="lab-t" style={{ fontSize: 22 }}>Questa settimana</h2>
          <div className="lab-meta">{sett.filter(d => d.allenato).length} allenamenti</div>
        </div>
        <div className="r4" style={{ marginTop: 8, marginBottom: 6 }} />
        <table className="wtab">
          <thead>
            <tr><th />{giorni.map((iso, i) => <th key={iso} className={iso === oggi ? "today" : ""}>{GG[i].charAt(0)}</th>)}</tr>
          </thead>
          <tbody>
            {[["Allenamento", "allenato"], ["Dieta", "dieta"], ["Acqua", "acqua"]].map(([lab, k]) => (
              <tr key={k}>
                <td className="k">{lab}</td>
                {sett.map(d => (
                  <td key={d.iso} className={d.iso === oggi ? "today" : ""}>
                    <span className={`mk${d[k] === "on" ? " on" : d[k] === "part" ? " part" : ""}${d.fut ? " fut" : ""}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Peso */}
      <section className="lab" aria-label="Peso" onClick={() => onGo("corpo", "peso")} style={{ cursor: "pointer" }}>
        <div className="lab-line" style={{ alignItems: "center" }}>
          <div>
            <div className="lab-k">Peso</div>
            <div className="lab-src" style={{ marginTop: 2 }}>
              {ultimo ? `ultima pesata ${new Date(ultimo.data + "T12:00").toLocaleDateString("it-IT", { day: "numeric", month: "short" })}` : "nessuna pesata"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="lab-t" style={{ fontSize: 30 }}>{ultimo ? `${(+ultimo.valore).toLocaleString("it-IT")} kg` : "—"}</div>
            {delta != null && (
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dim)" }}>{delta > 0 ? "+" : delta < 0 ? "−" : "±"}{Math.abs(delta).toLocaleString("it-IT")} kg in 7 giorni</div>
            )}
          </div>
        </div>
        {serie.length >= 2 && (() => {
          const W = 300, H = 46, min = Math.min(...serie), max = Math.max(...serie), span = max - min || 1;
          const pts = serie.map((v, i) => [(i / (serie.length - 1)) * (W - 8) + 4, H - 6 - ((v - min) / span) * (H - 12)]);
          const last = pts[pts.length - 1];
          return (
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block", marginTop: 8 }} aria-hidden="true">
              <line x1="0" x2={W} y1={H - 1} y2={H - 1} stroke="var(--bdr)" strokeWidth="1" />
              <polyline points={pts.map(p => p.join(",")).join(" ")} fill="none" stroke="var(--txt)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={last[0]} cy={last[1]} r="4" fill="var(--txt)" />
            </svg>
          );
        })()}
      </section>

      {pick && (
        <div className="mov" onClick={() => setPick(false)}>
          <div className="mod" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 className="lab-t" style={{ fontSize: 24 }}>Scegli la scheda</h2>
              <button className="bico" onClick={() => setPick(false)} aria-label="Chiudi"><IcClose /></button>
            </div>
            {schede.map(sc => (
              <button key={sc.id} className="sc" style={{ width: "100%", textAlign: "left", color: "var(--txt)" }} onClick={() => { setPick(false); onStart(sc); }}>
                <div className="sd">{sc.nome}</div>
                <div className="sdn">{sc.giorni?.length ? sc.giorni.map(g => GG[g]).join(", ") + " · " : ""}{sc.esercizi?.length || 0} esercizi</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
