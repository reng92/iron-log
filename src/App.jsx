import { useState, useEffect, useRef, useMemo } from "react";
import ConfirmModal from "./components/modals/ConfirmModal";
import { genId, fmtDur, fmtDate, fmtShort, fmtIso, epley, GG, GIORNI_LABEL, GIORNI_SHORT, fetchMealImg, estraiTestoPdf, compressImg, estimateKcalFromName, estimateKcalFromAI } from "./utils";
import { IcHome, IcBook, IcHistory, IcChart, IcWeight, IcPlus, IcTrash, IcEdit, IcCheck, IcChevL, IcClose, IcPlay, IcTimer, IcCamera, IcImg, IcSun, IcMoon, IcDownload, IcCalc, IcArrowUp, IcArrowDown, IcApple, IcUser, IcFile, IcUpload, Ico } from "./components/Icons";
import ChatAI from "./components/ChatAI";
import CorsaTracker from "./components/CorsaTracker";
import { db, auth } from "./db";
import { CSS, ZEPP_PROMPT, GROQ_SCHEDA_PROMPT, GROQ_PROMPT, STATUS_OPTS, CIRC_PROMPT } from "./constants";
import LineChart from "./components/LineChart";
import FoodThumb from "./components/FoodThumb";
import StatusBadge from "./components/StatusBadge";
import CalcRM from "./components/CalcRM";
import EsercizioModal from "./components/modals/EsercizioModal";
import AlimentoModal from "./components/modals/AlimentoModal";
import SchedaPdfImportModal from "./components/modals/SchedaPdfImportModal";
import PdfImportModal from "./components/modals/PdfImportModal";

const GROQ_KEY = process.env.REACT_APP_GROQ_KEY || localStorage.getItem('groq_key') || '';

// ─── NORME CIRCONFERENZE CORPOREE ────────────────────────
const CIRC_NORMS = {
  vita: {
    M: { ottimo: [0, 80], buono: [80, 94], attenzione: [94, 102], rischio: [102, 999], target: "< 80 cm", desc: "Rischio cardiovascolare" },
    F: { ottimo: [0, 68], buono: [68, 80], attenzione: [80, 88], rischio: [88, 999], target: "< 68 cm", desc: "Rischio cardiovascolare" },
  },
  addome: {
    M: { ottimo: [0, 85], buono: [85, 98], attenzione: [98, 106], rischio: [106, 999], target: "< 85 cm", desc: "Grasso viscerale" },
    F: { ottimo: [0, 75], buono: [75, 88], attenzione: [88, 96], rischio: [96, 999], target: "< 75 cm", desc: "Grasso viscerale" },
  },
  fianchi: {
    M: { ottimo: [88, 100], buono: [100, 106], attenzione: [106, 112], rischio: [112, 999], target: "88–100 cm", desc: "Proporzione corporea" },
    F: { ottimo: [90, 102], buono: [102, 110], attenzione: [110, 118], rischio: [118, 999], target: "90–102 cm", desc: "Proporzione corporea" },
  },
  braccio_rilassato: {
    M: { rischio: [0, 28], attenzione: [28, 33], buono: [33, 38], ottimo: [38, 999], target: "> 38 cm", desc: "Massa muscolare" },
    F: { rischio: [0, 24], attenzione: [24, 28], buono: [28, 33], ottimo: [33, 999], target: "> 33 cm", desc: "Massa muscolare" },
  },
  braccio_flesso: {
    M: { rischio: [0, 30], attenzione: [30, 35], buono: [35, 40], ottimo: [40, 999], target: "> 40 cm", desc: "Forza e ipertrofia" },
    F: { rischio: [0, 26], attenzione: [26, 30], buono: [30, 35], ottimo: [35, 999], target: "> 35 cm", desc: "Forza e ipertrofia" },
  },
  avambraccio: {
    M: { rischio: [0, 24], attenzione: [24, 27], buono: [27, 30], ottimo: [30, 999], target: "> 30 cm", desc: "Forza funzionale" },
    F: { rischio: [0, 20], attenzione: [20, 23], buono: [23, 26], ottimo: [26, 999], target: "> 26 cm", desc: "Forza funzionale" },
  },
  coscia_max: {
    M: { rischio: [0, 46], attenzione: [46, 52], buono: [52, 58], ottimo: [58, 999], target: "> 58 cm", desc: "Massa muscolare gambe" },
    F: { rischio: [0, 48], attenzione: [48, 54], buono: [54, 60], ottimo: [60, 999], target: "> 60 cm", desc: "Massa muscolare gambe" },
  },
  coscia_med: {
    M: { rischio: [0, 42], attenzione: [42, 48], buono: [48, 55], ottimo: [55, 999], target: "> 55 cm", desc: "Massa muscolare gambe" },
    F: { rischio: [0, 44], attenzione: [44, 50], buono: [50, 57], ottimo: [57, 999], target: "> 57 cm", desc: "Massa muscolare gambe" },
  },
  polpaccio: {
    M: { rischio: [0, 30], attenzione: [30, 34], buono: [34, 38], ottimo: [38, 999], target: "> 38 cm", desc: "Massa muscolare" },
    F: { rischio: [0, 28], attenzione: [28, 32], buono: [32, 36], ottimo: [36, 999], target: "> 36 cm", desc: "Massa muscolare" },
  },
  torace: {
    M: { rischio: [0, 86], attenzione: [86, 92], buono: [92, 104], ottimo: [104, 999], target: "> 100 cm", desc: "Sviluppo toracico" },
    F: { rischio: [0, 78], attenzione: [78, 84], buono: [84, 96], ottimo: [96, 999], target: "> 92 cm", desc: "Sviluppo toracico" },
  },
  polso: {
    M: { piccolo: [0, 16.5], medio: [16.5, 17.5], grande: [17.5, 999], target: "16.5–17.5 cm", desc: "Struttura ossea (frame)" },
    F: { piccolo: [0, 14.5], medio: [14.5, 15.5], grande: [15.5, 999], target: "14.5–15.5 cm", desc: "Struttura ossea (frame)" },
  },
};

// Campi "più è alto meglio è" (muscoli) vs "più è basso meglio è" (grasso)
const CIRC_LOWER_IS_BETTER = ["vita", "addome", "fianchi"];

function getCircStatus(key, value, sesso = "M") {
  const norm = CIRC_NORMS[key]?.[sesso];
  if (!norm || value == null) return null;

  // Caso speciale polso: restituisce tipo di frame
  if (key === "polso") {
    if (value < norm.piccolo[1]) return { label: "Frame piccolo", color: "var(--dim)", bg: "var(--bdr)", target: norm.target, desc: norm.desc };
    if (value < norm.medio[1]) return { label: "Frame medio", color: "var(--ok)", bg: "rgba(48,209,88,.12)", target: norm.target, desc: norm.desc };
    return { label: "Frame grande", color: "var(--acc)", bg: "var(--acc2)", target: norm.target, desc: norm.desc };
  }

  const lowerBetter = CIRC_LOWER_IS_BETTER.includes(key);

  let label, color, bg;
  if (norm.ottimo && value >= norm.ottimo[0] && value < norm.ottimo[1]) {
    label = "Ottimo"; color = "var(--ok)"; bg = "rgba(48,209,88,.12)";
  } else if (norm.buono && value >= norm.buono[0] && value < norm.buono[1]) {
    label = "Buono"; color = "#30D158"; bg = "rgba(48,209,88,.08)";
  } else if (norm.attenzione && value >= norm.attenzione[0] && value < norm.attenzione[1]) {
    label = "Attenzione"; color = "#FF9500"; bg = "rgba(255,149,0,.12)";
  } else if (norm.rischio) {
    label = lowerBetter ? "Rischio" : "Da migliorare"; color = "var(--dan)"; bg = "rgba(255,59,48,.12)";
  } else {
    return null;
  }

  return { label, color, bg, target: norm.target, desc: norm.desc };
}


// ─── LINE CHART ───────────────────────────────────────────

// ─── APP ──────────────────────────────────────────────────
export default function App() {
  // Auth
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  const [tab, setTab] = useState("profilo");
  const [schede, setSchede] = useState([]);
  const [sessioni, setSessioni] = useState([]);
  const [peso, setPeso] = useState([]);
  const [settings, setSettings] = useState({ darkMode: true });

  // -- Nuovi stati per la dieta --
  const [piani, setPiani] = useState([]);
  const [logDieta, setLogDieta] = useState([]);
  const [corse, setCorse] = useState([]);

  const [subview, setSubview] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [showChat, setShowChat] = useState(false);


  useEffect(() => {
    const unsub = auth.onAuthChange(async (u) => {
      setUser(u);
      setAuthReady(true);
      if (u) {
        const [sc, ss, ps, st, pa, ld, co] = await Promise.all([
          db.getSchede().catch(() => []),
          db.getSessioni().catch(() => []),
          db.getPeso().catch(() => []),
          db.getSettings().catch(() => ({})),
          db.getPiani().catch(() => []),
          db.getLogDieta().catch(() => []),
          db.getCorse().catch(() => [])
        ]);
        setSchede(sc || []); setSessioni(ss || []); setPeso(ps || []);
        setSettings({ darkMode: true, ...st });
        setPiani(pa || []); setLogDieta(ld || []);
        setCorse(co || []);
        setLoaded(true);
      } else {
        setSchede([]); setSessioni([]); setPeso([]);
        setSettings({ darkMode: true });
        setPiani([]); setLogDieta([]); setCorse([]);
        setLoaded(false);
      }
    });
    return unsub;
  }, []);

  const saveSchede = async s => { setSchede(s); await db.setSchede(s); };
  const addSessione = async s => { setSessioni(p => [s, ...p]); await db.addSessione(s); };
  const delSessione = async id => { setSessioni(p => p.filter(s => s.id !== id)); await db.delSessione(id); };
  const addPeso = async p => {
    setPeso(prev => [...prev, p].sort((a, b) => a.data.localeCompare(b.data)));
    try { await db.addPeso(p); } catch (e) { alert("Errore salvataggio: " + e.message); setPeso(prev => prev.filter(x => x.id !== p.id)); }
  };
  const delPeso = async id => { setPeso(p => p.filter(x => x.id !== id)); await db.delPeso(id); };
  const toggleDark = async () => { const n = { ...settings, darkMode: !settings.darkMode }; setSettings(n); await db.saveSettings(n); };
  const saveSettings = async n => { setSettings(n); await db.saveSettings(n); };

  // -- Nuove funzioni salvataggio Dieta --
  const savePiani = async p => { setPiani(p); await db.setPiani(p); };
  const handleAddLogDieta = async l => { setLogDieta(prev => [l, ...prev]); await db.addLogDieta(l); };
  const handleDelLogDieta = async id => { setLogDieta(p => p.filter(x => x.id !== id)); await db.delLogDieta(id); };
  const onOpenDietaLog = () => setSubview({ type: "dieta-log", data: null });

  const handleAddCorsa = async c => { setCorse(p => [c, ...p]); await db.addCorsa(c); };
  const handleDelCorsa = async id => { setCorse(p => p.filter(x => x.id !== id)); await db.delCorsa(id); };

  const dark = settings.darkMode !== false;
  const cls = `app${dark ? "" : " light"}`;

  // SCHERMATA AUTH (login / registrazione)
  if (!authReady) return (
    <div className={cls}>
      <style>{CSS}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>
        <div className="pls" style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 28, color: "#1E90FF", letterSpacing: ".1em" }}>CARICAMENTO...</div>
      </div>
    </div>
  );

  if (!user) {
    const handleAuth = async () => {
      setAuthError("");
      setAuthBusy(true);
      try {
        if (authMode === "login") {
          const { error } = await auth.signIn(authEmail.trim(), authPassword);
          if (error) setAuthError(error.message);
        } else {
          const { error } = await auth.signUp(authEmail.trim(), authPassword);
          if (error) setAuthError(error.message);
          else setAuthError("__ok__");
        }
      } catch (e) {
        setAuthError(e.message || "Errore sconosciuto");
      }
      setAuthBusy(false);
    };

    return (
      <div className={cls}>
        <style>{CSS}</style>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, padding: 24 }}>
          <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 48, letterSpacing: ".1em", marginBottom: 4, color: "var(--acc)" }}>IRON LOG</div>
          <p className="sub" style={{ marginBottom: 32, textAlign: "center" }}>
            {authMode === "login" ? "Accedi al tuo account" : "Crea il tuo account"}
          </p>

          {authError === "__ok__" ? (
            <div style={{ background: "rgba(48,209,88,.12)", border: "1px solid #30D158", borderRadius: 10, padding: "16px 20px", marginBottom: 20, fontSize: 14, color: "#30D158", textAlign: "center", maxWidth: 300 }}>
              Account creato! Controlla la tua email per confermare, poi accedi.
            </div>
          ) : (
            <>
              <div className="ig" style={{ width: "100%", maxWidth: 300 }}>
                <label className="lbl">Email</label>
                <input
                  className="inp"
                  type="email"
                  placeholder="nome@email.com"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAuth()}
                />
              </div>
              <div className="ig" style={{ width: "100%", maxWidth: 300 }}>
                <label className="lbl">Password</label>
                <input
                  className="inp"
                  type="password"
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAuth()}
                />
              </div>
              {authError && authError !== "__ok__" && (
                <div style={{ color: "var(--dan)", fontSize: 13, marginBottom: 12, padding: "10px 14px", background: "var(--dan2)", borderRadius: 8, maxWidth: 300, width: "100%" }}>
                  {authError}
                </div>
              )}
              <button
                className="btn btn-p"
                style={{ width: "100%", maxWidth: 300, padding: 14 }}
                disabled={authBusy || !authEmail || !authPassword}
                onClick={handleAuth}
              >
                {authBusy ? "..." : authMode === "login" ? "ACCEDI" : "CREA ACCOUNT"}
              </button>
            </>
          )}

          <button
            style={{ marginTop: 20, background: "none", border: "none", color: "var(--acc)", fontSize: 13, cursor: "pointer", fontFamily: "'Barlow',sans-serif" }}
            onClick={() => { setAuthMode(m => m === "login" ? "register" : "login"); setAuthError(""); }}
          >
            {authMode === "login" ? "Non hai un account? Registrati" : "Hai già un account? Accedi"}
          </button>
        </div>
      </div>
    );
  }

  // CARICAMENTO NORMALE APP
  if (!loaded) return (
    <div className={cls}>
      <style>{CSS}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>
        <div className="pls" style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 28, color: "#1E90FF", letterSpacing: ".1em" }}>CARICAMENTO...</div>
      </div>
    </div>
  );

  if (subview?.type === "scheda-edit") return (
    <div className={cls}><style>{CSS}</style>
      <SchedaEdit
          scheda={subview.data}
          onSave={sc => { const n = sc.id ? schede.map(s => s.id === sc.id ? sc : s) : [...schede, { ...sc, id: genId() }]; saveSchede(n); setSubview(null); }}
          onBack={() => setSubview(null)}
          onSaveMultiple={nuove => { saveSchede([...schede, ...nuove.map(s => ({ ...s, id: genId() }))]); setSubview(null); }}
        />
    </div>
  );
  if (subview?.type === "allenamento") return (
    <div className={cls}><style>{CSS}</style>
      <Allenamento scheda={subview.data} sessioni={sessioni} onComplete={s => { addSessione(s); setSubview(null); setTab("storico"); }} onBack={() => setSubview(null)} />
    </div>
  );
  if (subview?.type === "sessione") return (
    <div className={cls}><style>{CSS}</style>
      <SessioneDetail sessione={subview.data} sessioni={sessioni} onBack={() => setSubview(null)} />
    </div>
  );

  if (subview?.type === "piano-edit") return (
    <div className={cls}><style>{CSS}</style>
      <PianoEdit
        piano={subview.data}
        onSave={p => {
          const n = p.id ? piani.map(x => x.id === p.id ? p : x) : [...piani, { ...p, id: genId() }];
          savePiani(n);
          setSubview(null);
        }}
        onBack={() => setSubview(null)}
      />
    </div>
  );
  if (subview?.type === "corsa") return (
    <div className={cls}><style>{CSS}</style>
      <CorsaTracker
        dark={dark}
        onBack={() => setSubview(null)}
        onSave={handleAddCorsa}
      />
    </div>
  );
  if (subview?.type === "dieta-log") return (
    <div className={cls}><style>{CSS}</style>
      <DietaLog
        piani={piani}
        logDieta={logDieta}
        onAdd={handleAddLogDieta}
        onDelete={handleDelLogDieta}
        onBack={() => setSubview(null)}
        initialDate={subview.data?.date}
        initialPianoId={subview.data?.pianoId}
      />
    </div>
  );

  return (
    <div className={cls}>
      <style>{CSS}</style>
      <div className="content fi">
        {tab === "home" && <Home schede={schede} sessioni={sessioni} peso={peso} piani={piani} corse={corse} dark={dark} onToggleDark={toggleDark} onStart={sc => setSubview({ type: "allenamento", data: sc })} onGoSchede={() => setTab("schede")} onCorsa={() => setSubview({ type: "corsa" })} logDieta={logDieta} settings={settings} />}
        {tab === "schede" && <Schede schede={schede} onNew={() => setSubview({ type: "scheda-edit", data: { nome: "", giorni: [], esercizi: [] } })} onEdit={sc => setSubview({ type: "scheda-edit", data: sc })} onDelete={id => saveSchede(schede.filter(s => s.id !== id))} onStart={sc => setSubview({ type: "allenamento", data: sc })} />}

        {/* -- Nuova Tab Dieta -- */}
        {tab === "dieta" && (
          <PianiAlimentari
            piani={piani}
            logDieta={logDieta}
            onNew={() => setSubview({ type: "piano-edit", data: { nome: "", durataGiorni: 56, pasti: [] } })}
            onEdit={p => setSubview({ type: "piano-edit", data: p })}
            onDelete={id => savePiani(piani.filter(p => p.id !== id))}
            onLog={(opts) => setSubview({ type: "dieta-log", data: opts || null })}
            settings={settings}
          />
        )}

        {tab === "storico" && <Storico sessioni={sessioni} corse={corse} onDetail={s => setSubview({ type: "sessione", data: s })} onDelete={delSessione} onDeleteCorsa={handleDelCorsa} />}
        {tab === "stats" && <Stats sessioni={sessioni} />}
        {tab === "peso" && <Peso peso={peso} onAdd={addPeso} onDelete={delPeso} />}
        {tab === "profilo" && <Profilo settings={settings} peso={peso} piani={piani} logDieta={logDieta} onSave={saveSettings} onOpenDietaLog={onOpenDietaLog} onLogout={() => auth.signOut()} />}
      </div>
      <nav className="nav">
        {[["home", "HOME", <IcHome />], ["schede", "SCHEDE", <IcBook />], ["dieta", "DIETA", <IcApple />], ["storico", "LOG", <IcHistory />], ["stats", "STATS", <IcChart />], ["peso", "PESO", <IcWeight />], ["profilo", "IO", <IcUser />]].map(([t, l, ic]) => (
          <button key={t} className={`nb${tab === t ? " on" : ""}`} onClick={() => setTab(t)}>{ic}<span>{l}</span></button>
        ))}
      </nav>
      {!subview && <button className="chat-fab" onClick={() => setShowChat(true)}><Ico d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" fill="currentColor" sw={0} /></button>}
      {showChat && <ChatAI settings={settings} peso={peso} logDieta={logDieta} piani={piani} sessioni={sessioni} onClose={() => setShowChat(false)} />}

    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────
function Home({ schede, sessioni, peso, piani, corse, dark, onToggleDark, onStart, onGoSchede, onCorsa, logDieta, settings }) {
  const [pick, setPick] = useState(false);
  const totKg = sessioni.reduce((a, s) => a + s.esercizi.reduce((b, e) => b + e.serie.reduce((c, sr) => c + (sr.completata ? (+sr.kg || 0) * (+sr.reps || 0) : 0), 0), 0), 0);
  const avgMin = sessioni.length ? Math.round(sessioni.reduce((a, s) => a + (s.durata || 0), 0) / sessioni.length) : 0;
  const last = sessioni[0];
  const todayIdx = (new Date().getDay() + 6) % 7;
  const suggested = schede.find(s => s.giorni?.includes(todayIdx));

  const records = useMemo(() => {
    const rec = {};
    sessioni.forEach(s => s.esercizi.forEach(e => e.serie.filter(sr => sr.completata && +sr.kg > 0).forEach(sr => {
      if (!rec[e.nome] || +sr.kg > rec[e.nome].kg) rec[e.nome] = { kg: +sr.kg, reps: sr.reps, data: s.data };
    })));
    return Object.entries(rec).sort((a, b) => b[1].kg - a[1].kg).slice(0, 5);
  }, [sessioni]);

  const latestPeso = [...peso].sort((a, b) => a.data.localeCompare(b.data)).pop() || null;
  const nextDays = [1, 3, 5]; // Lun/Mer/Ven

  const getPasti = (day) => {
    if (!piani?.length) return [];
    const plan = piani[0];
    return (plan.giorniPasti?.[day] || plan.pasti || []);
  };
  const getWorkouts = (day) => schede.filter(s => Array.isArray(s.giorni) && s.giorni.includes(day));

  return (
    <>
      <div style={{ paddingTop: 20, paddingBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div><h1 className="pt">RENATO'S<br />WORKOUT</h1><p className="sub">{new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
        <button className="bico" onClick={onToggleDark} title="Cambia tema">{dark ? <IcSun /> : <IcMoon />}</button>
      </div>

      <div className="hg" style={{ marginTop: 14 }}>
        {[[sessioni.length, "Sessioni"], [schede.length, "Schede"], [Math.round(totKg / 1000) || 0, "Ton. totali"], [avgMin, "Min avg"]].map(([v, l]) => (
          <div key={l} className="hsc"><div className="hsv">{v}</div><div className="hsl">{l}</div></div>
        ))}
      </div>

      {piani.length > 0 && (() => {
        const todayIso = new Date().toISOString().slice(0, 10);
        const todayLog = logDieta.find(l => (l.data || "").slice(0, 10) === todayIso);
        const kcalOggi = todayLog ? (todayLog.totKcalConsumate || todayLog.kcalTotale || todayLog.kcal || 0) : 0;
        const target = settings?.targetKcal || 1420;
        const perc = Math.min(Math.round((kcalOggi / target) * 100), 120);
        const barColor = perc > 110 ? "var(--dan)" : perc > 100 ? "#FF9500" : "var(--ok)";
        return (
          <div className="card" style={{ marginBottom: 12, padding: "12px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".08em" }}>🍽 KCAL OGGI</div>
              <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, color: barColor, letterSpacing: ".05em" }}>
                {kcalOggi} <span style={{ fontSize: 12, color: "var(--dim)", fontFamily: "'Barlow',sans-serif", fontWeight: 400 }}>/ {target}</span>
              </div>
            </div>
            <div style={{ height: 6, background: "var(--bdr)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(perc, 100)}%`, background: barColor, borderRadius: 3, transition: "width .4s" }} />
            </div>
            <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 5 }}>
              {perc >= 100 ? `Target raggiunto ✓` : `${target - kcalOggi} kcal rimanenti`}
            </div>
          </div>
        );
      })()}

      {suggested && (
        <div className="card" style={{ background: "var(--acc2)", borderColor: "var(--acc)", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "var(--acc)", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 4 }}>📅 Oggi — {GG[todayIdx]}</div>
          <div className="sd">{suggested.nome}</div>
          <button className="btn btn-p btn-full" style={{ marginTop: 10 }} onClick={() => onStart(suggested)}><IcPlay /> ALLENA ORA</button>
        </div>
      )}

      {schede.length > 0
        ? <button className="btn btn-p btn-full" style={{ fontSize: 15, padding: "14px", marginBottom: 10 }} onClick={() => setPick(true)}><IcPlay /> INIZIA ALLENAMENTO</button>
        : <button className="btn btn-s btn-full" style={{ marginBottom: 10 }} onClick={onGoSchede}><IcPlus /> CREA LA TUA PRIMA SCHEDA</button>
      }
      <button className="btn btn-s btn-full" style={{ marginBottom: 14, borderColor: "var(--ok)", color: "var(--ok)" }} onClick={onCorsa}>
        🏃 AVVIA CORSA / CAMMINATA GPS
      </button>

      {records.length > 0 && (
        <>
          <div className="st">🏆 RECORD PERSONALI</div>
          <div className="card" style={{ padding: "8px 16px", marginBottom: 14 }}>
            {records.map(([nome, r]) => (
              <div key={nome} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--bdr)" }}>
                <div><div style={{ fontWeight: 600, fontSize: 14 }}>{nome}</div><div style={{ fontSize: 11, color: "var(--dim)" }}>{fmtShort(r.data)}</div></div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, color: "var(--acc)", letterSpacing: ".05em" }}>{r.kg} kg</div>
                  <div style={{ fontSize: 11, color: "var(--dim)" }}>1RM ~{epley(r.kg, r.reps)} kg</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {last && (
        <>
          <div className="st">ULTIMO ALLENAMENTO</div>
          <div className="card" style={{ borderLeft: "3px solid var(--acc)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div><div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 20, letterSpacing: ".05em" }}>{last.schedaNome}</div><div style={{ fontSize: 12, color: "var(--dim)" }}>{fmtDate(last.data)}</div></div>
              <div className="tag tag-a">{last.durata || 0}min</div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
              {last.esercizi.slice(0, 4).map(e => <span key={e.esercizioId || e.nome} style={{ fontSize: 12, color: "var(--dim)" }}><b style={{ color: "var(--txt)" }}>{e.nome}</b> {e.serie.filter(s => s.completata).length}/{e.serie.length}</span>)}
            </div>
          </div>
        </>
      )}

      {pick && (
        <div className="mov" onClick={() => setPick(false)}>
          <div className="mod" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, letterSpacing: ".05em" }}>SCEGLI SCHEDA</span>
              <button className="bico" onClick={() => setPick(false)}><IcClose /></button>
            </div>
            {schede.map(sc => (
              <div key={sc.id} className="sc" onClick={() => { setPick(false); onStart(sc); }}>
                <div className="sd">{sc.nome}</div>
                <div className="sdn">{sc.giorni?.length > 0 ? sc.giorni.map(g => GG[g]).join(", ") + " · " : ""}{sc.esercizi?.length || 0} esercizi</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ─── SCHEDE ───────────────────────────────────────────────
function Schede({ schede, onNew, onEdit, onDelete, onStart }) {
  const [confirmState, setConfirmState] = useState(null);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingTop: 20, paddingBottom: 16 }}>
        <div><h1 className="pt">LE MIE<br />SCHEDE</h1><p className="sub">{schede.length} schede</p></div>
        <button className="btn btn-p" onClick={onNew}><IcPlus /> NUOVA</button>
      </div>
      {schede.length === 0 ? (
        <div className="emp"><div className="emp-ic">🏋️</div><div className="emp-t">Nessuna scheda</div>
          <button className="btn btn-p" style={{ marginTop: 16 }} onClick={onNew}><IcPlus /> CREA SCHEDA</button></div>
      ) : schede.map(sc => (
        <div key={sc.id} className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 24, letterSpacing: ".05em" }}>{sc.nome}</div>
              {sc.giorni?.length > 0 && <div style={{ display: "flex", gap: 5, marginTop: 5 }}>{sc.giorni.sort((a, b) => a - b).map(g => <span key={g} className="tag tag-a">{GG[g]}</span>)}</div>}
              <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 5 }}>{sc.esercizi?.length || 0} esercizi</div>
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              <button className="bico" onClick={() => onEdit(sc)}><IcEdit /></button>
              <button className="bico d" onClick={() => {
                setConfirmState({ msg: `Eliminare "${sc.nome}"?`, onConfirm: () => { onDelete(sc.id); } });
              }}><IcTrash /></button>
            </div>
          </div>
          {sc.esercizi?.length > 0 && <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>{sc.esercizi.map(e => <span key={e.id} className="tag tag-m">{e.nome}</span>)}</div>}
          <button className="btn btn-s btn-full" style={{ marginTop: 12 }} onClick={() => onStart(sc)}><IcPlay /> ALLENA ORA</button>
        </div>
      ))}
      {confirmState && <ConfirmModal message={confirmState.msg} onConfirm={() => { confirmState.onConfirm(); setConfirmState(null); }} onCancel={() => setConfirmState(null)} />}
    </>
  );
}




// ─── SCHEDA EDIT ──────────────────────────────────────────
function SchedaEdit({ scheda: init, onSave, onBack, onSaveMultiple }) {
  const [nome, setNome] = useState(init.nome || "");
  const [giorni, setGiorni] = useState(init.giorni || []);
  const [esercizi, setEsercizi] = useState(init.esercizi || []);
  const [modal, setModal] = useState(null);
  const [pdfModal, setPdfModal] = useState(false);

  const toggleG = g => setGiorni(p => p.includes(g) ? p.filter(x => x !== g) : [...p, g]);
  const applyModal = e => {
    if (!e.nome.trim()) return alert("Inserisci il nome");
    if (modal.mode === "new") setEsercizi(p => [...p, { ...e, id: genId() }]);
    else setEsercizi(p => p.map((x, i) => i === modal.idx ? { ...e } : x));
    setModal(null);
  };
  const moveEx = (i, dir) => { const a = [...esercizi], j = i + dir; if (j < 0 || j >= a.length) return;[a[i], a[j]] = [a[j], a[i]]; setEsercizi(a); };

  return (
    <>
      <div className="content fi">
        <button className="bb" onClick={onBack}><IcChevL /> Schede</button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <h1 className="pt">{init.id ? "MODIFICA" : "NUOVA"}<br />SCHEDA</h1>
          <button className="btn btn-s" style={{ marginTop: 6, fontSize: 11, gap: 5 }} onClick={() => setPdfModal(true)}><IcFile size={14} /> PDF</button>
        </div>
        <div className="ig">
          <label className="lbl">Nome scheda</label>
          <input className="inp" placeholder="es. Full Body, Push Day…" value={nome} onChange={e => setNome(e.target.value)} />
        </div>
        <div className="ig">
          <label className="lbl">Giorni della settimana</label>
          <div className="chip-row">{GG.map((g, i) => <button key={i} className={`chip${giorni.includes(i) ? " on" : ""}`} onClick={() => toggleG(i)}>{g}</button>)}</div>
        </div>
        <div className="div" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="st" style={{ margin: 0 }}>ESERCIZI ({esercizi.length})</div>
          <button className="btn btn-s" onClick={() => setModal({ mode: "new", data: { nome: "", serie: 3, ripetizioni: "10", pausa: 90, note: "" } })}><IcPlus /> AGGIUNGI</button>
        </div>
        {esercizi.length === 0
          ? <div className="emp" style={{ padding: "20px 0" }}>
            <div style={{ fontSize: 13, color: "var(--dim)" }}>Nessun esercizio ancora</div>
          </div>
          : esercizi.map((e, i) => (
            <div key={e.id} style={{ background: "var(--sur)", border: "1px solid var(--bdr)", borderRadius: 10, padding: 14, marginBottom: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div className="exn">{e.nome}</div>
                  <div className="exs">
                    <div className="ep"><b>{e.serie}</b> serie</div>
                    <div className="ep"><b>{e.ripetizioni}</b> reps</div>
                    <div className="ep"><IcTimer /><b>{e.pausa}s</b></div>

                  </div>
                  {e.note && <div style={{ fontSize: 11, color: "var(--dim)", fontStyle: "italic", marginTop: 4 }}>{e.note}</div>}
                </div>
                <div style={{ display: "flex", gap: 5, marginLeft: 8 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <button className="bico" style={{ padding: 4 }} onClick={() => moveEx(i, -1)} disabled={i === 0}><IcArrowUp size={13} /></button>
                    <button className="bico" style={{ padding: 4 }} onClick={() => moveEx(i, 1)} disabled={i === esercizi.length - 1}><IcArrowDown size={13} /></button>
                  </div>
                  <button className="bico" onClick={() => setModal({ mode: "edit", data: { ...e }, idx: i })}><IcEdit /></button>
                  <button className="bico d" onClick={() => setEsercizi(p => p.filter((_, j) => j !== i))}><IcTrash /></button>
                </div>
              </div>
            </div>
          ))}
        <button className="btn btn-p btn-full" onClick={() => { if (!nome.trim()) return alert("Inserisci un nome"); onSave({ ...init, nome: nome.trim(), giorni, esercizi }); }}><IcCheck /> SALVA SCHEDA</button>
      </div>
      {modal && <EsercizioModal init={modal.data} mode={modal.mode} onSave={applyModal} onClose={() => setModal(null)} />}
      {pdfModal && <SchedaPdfImportModal
        groqKey={GROQ_KEY}
        onApply={({ nomeScheda, giorni: gd }) => {
          if (!gd || gd.length === 0) return;
          if (gd.length === 1) {
            if (nomeScheda) setNome(gd[0].nomeGiorno || nomeScheda);
            setEsercizi(gd[0].esercizi || []);
          } else if (onSaveMultiple) {
            onSaveMultiple(gd.map(g => ({
              nome: [nomeScheda, g.nomeGiorno].filter(Boolean).join(" - "),
              giorni: [],
              esercizi: g.esercizi || []
            })));
          }
        }}
        onClose={() => setPdfModal(false)}
      />}
    </>
  );
}

// ─── ALLENAMENTO ──────────────────────────────────────────
function Allenamento({ scheda, sessioni, onComplete, onBack }) {
  const lastSess = sessioni.find(s => s.schedaId === scheda.id);
  const lastData = {};
  if (lastSess) lastSess.esercizi.forEach(e => { lastData[e.esercizioId || e.nome] = e.serie; });

  const [sets, setSets] = useState(scheda.esercizi.map(e => {
    const prev = lastData[e.id] || [];
    return {
      esercizioId: e.id, nome: e.nome, pausa: e.pausa, note: e.note,
      serie: Array.from({ length: e.serie }, (_, i) => ({
        idx: i,
        kg: prev[i]?.kg || "",
        reps: prev[i]?.reps || e.ripetizioni || "",
        rpe: "", completata: false
      }))
    };
  }));

  const [elapsed, setElapsed] = useState(0);
  const [rest, setRest] = useState(null);
  const [noteSess, setNoteSess] = useState("");
  const [rpeOpen, setRpeOpen] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const tiRef = useRef(); const reRef = useRef();

  useEffect(() => { tiRef.current = setInterval(() => setElapsed(p => p + 1), 1000); return () => clearInterval(tiRef.current); }, []);
  useEffect(() => {
    if (rest?.rem > 0) { reRef.current = setTimeout(() => setRest(p => p ? { ...p, rem: p.rem - 1 } : null), 1000); }
    else if (rest?.rem === 0) { setRest(null); if (navigator.vibrate) navigator.vibrate([300, 100, 300]); }
    return () => clearTimeout(reRef.current);
  }, [rest]);

  const updSet = (ei, si, k, v) => setSets(p => p.map((e, i) => i !== ei ? e : { ...e, serie: e.serie.map((s, j) => j !== si ? s : { ...s, [k]: v }) }));
  const completeSet = (ei, si) => {
    const e = sets[ei], s = e.serie[si], ok = !s.completata;
    updSet(ei, si, "completata", ok);
    if (ok && e.pausa > 0) setRest({ rem: e.pausa, total: e.pausa, nome: e.nome });
  };

  const done = sets.reduce((a, e) => a + e.serie.filter(s => s.completata).length, 0);
  const total = sets.reduce((a, e) => a + e.serie.length, 0);

  const finisci = () => {
    clearInterval(tiRef.current);
    onComplete({
      id: genId(), data: new Date().toISOString(),
      schedaId: scheda.id, schedaNome: scheda.nome,
      durata: Math.round(elapsed / 60), note: noteSess,
      esercizi: sets.map(e => ({
        esercizioId: e.esercizioId, nome: e.nome,
        serie: e.serie.map(s => ({ reps: s.reps, kg: s.kg, rpe: s.rpe, completata: s.completata }))
      }))
    });
  };

  return (
    <>
      <div className="content fi">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16, marginBottom: 16 }}>
          <button className="bb" style={{ margin: 0 }} onClick={() => {
            setConfirmState({ msg: "Interrompere l'allenamento?", onConfirm: () => { onBack(); } });
          }}><IcClose /> ESCI</button>
          <div className="pls" style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 13, color: "var(--acc)", letterSpacing: ".1em" }}>● LIVE</div>
        </div>
        <div className="wh">
          <div className="wt">{scheda.nome}</div>
          <div className="wlv">{fmtDur(elapsed)}</div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 4 }}>{done}/{total} serie · {total ? Math.round(done / total * 100) : 0}%</div>
          <div className="pbar"><div className="pfil" style={{ width: `${total ? Math.round(done / total * 100) : 0}%` }} /></div>
        </div>

        {sets.map((ex, ei) => (
          <div key={ex.esercizioId} className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div className="exn">{ex.nome}</div>
                {ex.note && <div style={{ fontSize: 11, color: "var(--dim)", fontStyle: "italic", marginTop: 2 }}>{ex.note}</div>}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {ex.pausa > 0 && <div className="tag tag-m"><IcTimer />{ex.pausa}s</div>}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "22px 1fr 1fr 38px 28px", gap: 6, fontSize: 10, color: "var(--dim)", fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 6, padding: "0 0 4px", borderBottom: "1px solid var(--bdr)" }}>
              <div>#</div><div style={{ textAlign: "center" }}>KG</div><div style={{ textAlign: "center" }}>REPS</div><div style={{ textAlign: "center" }}>RPE</div><div />
            </div>

            {ex.serie.map((s, si) => (
              <div key={si}>
                <div className="set-r">
                  <div className={`set-n${s.completata ? " ok" : ""}`}>{si + 1}</div>
                  <div><input className="sinp" type="number" min="0" step="0.5" placeholder="—" value={s.kg} onChange={e => updSet(ei, si, "kg", e.target.value)} /></div>
                  <div><input className="sinp" type="text" placeholder={s.reps} value={s.reps} onChange={e => updSet(ei, si, "reps", e.target.value)} /></div>
                  <div style={{ textAlign: "center" }}>
                    <button onClick={() => setRpeOpen(rpeOpen?.ei === ei && rpeOpen?.si === si ? null : { ei, si })} style={{ background: s.rpe ? "var(--acc2)" : "var(--card)", border: `1px solid ${s.rpe ? "var(--acc)" : "var(--bdr)"}`, borderRadius: 6, color: s.rpe ? "var(--acc)" : "var(--mut)", fontSize: 12, fontWeight: 700, width: "100%", height: 32, cursor: "pointer", fontFamily: "'Barlow',sans-serif" }}>{s.rpe || "—"}</button>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <button className={`sck${s.completata ? " ok" : ""}`} onClick={() => completeSet(ei, si)}>{s.completata && <IcCheck />}</button>
                  </div>
                </div>
                {rpeOpen?.ei === ei && rpeOpen?.si === si && (
                  <div style={{ background: "var(--sur)", borderRadius: 8, padding: "10px 12px", marginTop: 4, border: "1px solid var(--bdr)" }}>
                    <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 8, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase" }}>Difficoltà percepita (RPE)</div>
                    <div className="rpe-row">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
                        <button key={v} className={`rpe-btn${s.rpe === v ? " on" : ""}`} onClick={() => { updSet(ei, si, "rpe", v); setRpeOpen(null); }}>{v}</button>
                      ))}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--mut)", marginTop: 6 }}>1 = facilissimo · 10 = massimo sforzo</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        <div className="ig" style={{ marginTop: 4 }}>
          <label className="lbl">Note sessione</label>
          <textarea className="inp" rows={3} placeholder="Come ti sei sentito? Osservazioni…" value={noteSess} onChange={e => setNoteSess(e.target.value)} />
        </div>
        <button className="btn btn-p btn-full" style={{ fontSize: 15, padding: 16 }} onClick={finisci}><IcCheck /> TERMINA ALLENAMENTO</button>
      </div>

      {rest && (
        <div className="rest-ov" onClick={() => setRest(null)}>
          <div className="rest-l">RECUPERO — {rest.nome}</div>
          <div className="rest-t">{rest.rem}</div>
          <div style={{ width: 200, height: 4, background: "rgba(255,255,255,.1)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", background: "var(--acc)", transition: "width 1s linear", width: `${(rest.rem / rest.total) * 100}%` }} />
          </div>
          <div className="rest-l">📳 tocca per saltare</div>
        </div>
      )}
      {confirmState && <ConfirmModal message={confirmState.msg} onConfirm={() => { confirmState.onConfirm(); setConfirmState(null); }} onCancel={() => setConfirmState(null)} />}
    </>
  );
}

// ─── STORICO ──────────────────────────────────────────────
function Storico({ sessioni, corse, onDetail, onDelete, onDeleteCorsa }) {
  const [stab, setStab] = useState("palestra");
  const [confirmState, setConfirmState] = useState(null);

  return (
    <>
      <div style={{ paddingTop: 20, paddingBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 className="pt">STORICO<br />LOG</h1>
            <p className="sub">
              {stab === "palestra" ? `${sessioni.length} sessioni palestra` : `${(corse || []).length} uscite`}
            </p>
          </div>
          {stab === "palestra" && sessioni.length > 0 && (
            <button className="bico" onClick={() => exportCSV(sessioni)} title="Esporta CSV">
              <IcDownload />
            </button>
          )}
        </div>
      </div>

      <div className="stab-row">
        <button className={`stab${stab === "palestra" ? " on" : ""}`} onClick={() => setStab("palestra")}>🏋️ PALESTRA</button>
        <button className={`stab${stab === "corsa" ? " on" : ""}`} onClick={() => setStab("corsa")}>🏃 CORSA / CAMMINATA</button>
      </div>

      {stab === "palestra" && (
        sessioni.length === 0 ? (
          <div className="emp">
            <div className="emp-ic">📊</div>
            <div className="emp-t">Nessuna sessione</div>
            <p style={{ fontSize: 13 }}>Completa un allenamento</p>
          </div>
        ) : sessioni.map(s => {
          const tot = s.esercizi.reduce((a, e) => a + e.serie.filter(sr => sr.completata).length, 0);
          const vol = s.esercizi.reduce((a, e) => a + e.serie.reduce((b, sr) => b + (sr.completata ? (+sr.kg || 0) * (+sr.reps || 0) : 0), 0), 0);
          return (
            <div key={s.id} className="sc" onClick={() => onDetail(s)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div className="sd">{s.schedaNome}</div>
                  <div className="sdn">{fmtDate(s.data)}</div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <div className="tag tag-a">{s.durata || 0}min</div>
                  <button className="bico d" onClick={e => {
                    e.stopPropagation();
                    setConfirmState({ msg: "Eliminare?", onConfirm: () => { onDelete(s.id); } });
                  }}><IcTrash /></button>
                </div>
              </div>
              <div className="ss">
                <div className="ssv"><b>{s.esercizi.length}</b>Eserc.</div>
                <div className="ssv"><b>{tot}</b>Serie OK</div>
                <div className="ssv"><b>{Math.round(vol)}</b>Vol kg×r</div>
              </div>
              {s.note && <div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 8, fontStyle: "italic", borderTop: "1px solid var(--bdr)", paddingTop: 8 }}>{s.note}</div>}
            </div>
          );
        })
      )}

      {stab === "corsa" && (
        <StoricoCorsa corse={corse || []} onDelete={onDeleteCorsa} />
      )}

      {confirmState && <ConfirmModal message={confirmState.msg} onConfirm={() => { confirmState.onConfirm(); setConfirmState(null); }} onCancel={() => setConfirmState(null)} />}
    </>
  );
}

function StoricoCorsa({ corse, onDelete }) {
  const [sel, setSel] = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  function fmtPaceDisplay(distKm, durSec) {
    if (!distKm || distKm < 0.01 || !durSec) return "--:--";
    const secPerKm = durSec / distKm;
    const m = Math.floor(secPerKm / 60);
    const s = Math.floor(secPerKm % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function fmtDurSec(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${m}′`;
    return `${m}′ ${String(s).padStart(2, "0")}″`;
  }

  const totDist = corse.reduce((a, c) => a + (c.distanza || 0), 0);
  const totKcal = corse.reduce((a, c) => a + (c.calorie || 0), 0);
  const bestDist = corse.length ? Math.max(...corse.map(c => c.distanza || 0)) : 0;

  const chartData = useMemo(() => {
    const days = {};
    corse.forEach(c => {
      const d = c.data ? c.data.slice(0, 10) : "";
      if (d) days[d] = (days[d] || 0) + (c.distanza || 0);
    });
    return Array.from({ length: 10 }, (_, i) => {
      const dt = new Date();
      dt.setDate(dt.getDate() - (9 - i));
      const key = dt.toISOString().slice(0, 10);
      return { y: Math.round((days[key] || 0) * 100) / 100, label: dt.toLocaleDateString("it-IT", { day: "numeric", month: "numeric" }) };
    });
  }, [corse]);

  if (corse.length === 0) {
    return (
      <div className="emp">
        <div className="emp-ic">🏃</div>
        <div className="emp-t">Nessuna uscita</div>
        <p style={{ fontSize: 13 }}>Avvia una corsa o camminata dalla Home</p>
      </div>
    );
  }

  return (
    <>
      <div className="hg" style={{ marginBottom: 14 }}>
        {[
          [`${totDist.toFixed(1)}km`, "Distanza tot."],
          [corse.length, "Uscite"],
          [`${bestDist.toFixed(2)}km`, "Miglior uscita"],
          [`${totKcal}kcal`, "Calorie tot."],
        ].map(([v, l]) => (
          <div key={l} className="hsc">
            <div className="hsv" style={{ fontSize: 24 }}>{v}</div>
            <div className="hsl">{l}</div>
          </div>
        ))}
      </div>

      {corse.length >= 2 && (
        <>
          <div className="st">DISTANZA ULTIME 10 SESSIONI (km)</div>
          <div className="chart-wrap" style={{ marginBottom: 16 }}>
            <LineChart data={chartData} color="var(--ok)" height={100} />
          </div>
        </>
      )}

      <div className="st">USCITE</div>
      {[...corse].sort((a, b) => (b.data || "").localeCompare(a.data || "")).map(c => {
        const isOpen = sel === c.id;
        const distKm = c.distanza || 0;
        const tipoIcon = c.tipo === "corsa" ? "🏃" : "🚶";
        return (
          <div key={c.id} className="card" style={{ marginBottom: 10, padding: 0, overflow: "hidden" }}>
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", cursor: "pointer" }}
              onClick={() => setSel(isOpen ? null : c.id)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 10,
                  background: c.tipo === "corsa" ? "var(--acc2)" : "rgba(48,209,88,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0
                }}>
                  {tipoIcon}
                </div>
                <div>
                  <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 18, letterSpacing: ".05em" }}>
                    {c.tipo === "corsa" ? "CORSA" : "CAMMINATA"} — {distKm >= 1 ? `${distKm.toFixed(2)}km` : `${Math.round(distKm * 1000)}m`}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--dim)" }}>{c.data ? fmtDate(c.data) : ""}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div className="tag tag-a">{fmtDurSec(c.durata || 0)}</div>
                <span style={{ color: "var(--mut)", fontSize: 16 }}>{isOpen ? "▲" : "▼"}</span>
              </div>
            </div>

            {isOpen && (
              <div style={{ borderTop: "1px solid var(--bdr)", padding: "14px 16px", background: "var(--sur)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                  {[
                    ["DISTANZA", distKm >= 1 ? `${distKm.toFixed(2)}km` : `${Math.round(distKm * 1000)}m`],
                    ["DURATA", fmtDurSec(c.durata || 0)],
                    ["PASSO MEDIO", fmtPaceDisplay(distKm, c.durata)],
                    ["VELOCITÀ", distKm && c.durata ? `${(distKm / (c.durata / 3600)).toFixed(1)}km/h` : "—"],
                    ["CALORIE", `${c.calorie || 0}kcal`],
                    ["DISLIVELLO", `${c.dislivello || 0}m`],
                  ].map(([label, val]) => (
                    <div key={label} style={{ textAlign: "center", background: "var(--card)", borderRadius: 8, padding: "8px 4px", border: "1px solid var(--bdr)" }}>
                      <div style={{ fontSize: 8, color: "var(--mut)", fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
                      <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 17, color: "var(--acc)", letterSpacing: ".04em", lineHeight: 1 }}>{val}</div>
                    </div>
                  ))}
                </div>

                {c.nota && (
                  <div style={{ fontSize: 12, color: "var(--dim)", fontStyle: "italic", marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid var(--bdr)" }}>
                    {c.nota}
                  </div>
                )}

                <button
                  className="btn btn-full"
                  style={{ background: "var(--dan2)", color: "var(--dan)", border: "1px solid var(--dan)", fontSize: 12 }}
                  onClick={() => {
                    setConfirmState({ msg: "Eliminare questa uscita?", onConfirm: () => { onDelete(c.id); setSel(null); } });
                  }}
                >
                  <IcTrash /> ELIMINA USCITA
                </button>
              </div>
            )}
          </div>
        );
      })}

      {confirmState && <ConfirmModal message={confirmState.msg} onConfirm={() => { confirmState.onConfirm(); setConfirmState(null); }} onCancel={() => setConfirmState(null)} />}
    </>
  );
}

// ─── SESSIONE DETAIL ──────────────────────────────────────
function SessioneDetail({ sessione: s, sessioni, onBack }) {
  const prevSess = sessioni.find(x => x.schedaId === s.schedaId && x.id !== s.id && new Date(x.data) < new Date(s.data));
  return (
    <div className="content fi">
      <button className="bb" onClick={onBack}><IcChevL /> Storico</button>
      <div style={{ marginBottom: 16 }}><h1 className="pt">{s.schedaNome}</h1><p className="sub">{fmtDate(s.data)} · {s.durata || 0} min</p></div>
      <div className="hg" style={{ marginBottom: 14 }}>
        {[[s.esercizi.length, "Esercizi"], [s.esercizi.reduce((a, e) => a + e.serie.filter(sr => sr.completata).length, 0), "Serie OK"], [Math.round(s.esercizi.reduce((a, e) => a + e.serie.reduce((b, sr) => b + (sr.completata ? (+sr.kg || 0) * (+sr.reps || 0) : 0), 0), 0)), "Volume"], [s.durata || 0, "Minuti"]].map(([v, l]) => (
          <div key={l} className="hsc"><div className="hsv">{v}</div><div className="hsl">{l}</div></div>
        ))}
      </div>
      {s.note && <div className="card" style={{ marginBottom: 12, borderLeft: "3px solid var(--acc)" }}><div className="st" style={{ marginBottom: 4 }}>NOTE</div><p style={{ fontSize: 14, color: "var(--dim)", fontStyle: "italic" }}>{s.note}</p></div>}

      {prevSess && (
        <>
          <div className="st">CONFRONTO CON SESSIONE PRECEDENTE</div>
          <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 10 }}>{fmtDate(prevSess.data)}</div>
          {s.esercizi.map(ex => {
            const prev = prevSess.esercizi.find(e => e.nome === ex.nome || e.esercizioId === ex.esercizioId);
            if (!prev) return null;
            const curVol = ex.serie.filter(sr => sr.completata).reduce((a, sr) => a + (+sr.kg || 0) * (+sr.reps || 0), 0);
            const prevVol = prev.serie.filter(sr => sr.completata).reduce((a, sr) => a + (+sr.kg || 0) * (+sr.reps || 0), 0);
            const delta = curVol - prevVol;
            const curMax = Math.max(...ex.serie.filter(sr => sr.completata && sr.kg).map(sr => +sr.kg), 0);
            const prevMax = Math.max(...prev.serie.filter(sr => sr.completata && sr.kg).map(sr => +sr.kg), 0);
            return (
              <div key={ex.nome} className="card" style={{ marginBottom: 8, padding: 12 }}>
                <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 18, letterSpacing: ".05em", marginBottom: 8 }}>{ex.nome}</div>
                <div className="cmp-grid">
                  <div className="cmp-card">
                    <div className="cmp-h">QUESTA SESSIONE</div>
                    <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 26, color: "var(--acc)" }}>{curMax}kg</div>
                    <div style={{ fontSize: 11, color: "var(--dim)" }}>{ex.serie.filter(sr => sr.completata).length} serie · vol {Math.round(curVol)}</div>
                  </div>
                  <div className="cmp-card">
                    <div className="cmp-h">PRECEDENTE</div>
                    <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 26, color: "var(--mut)" }}>{prevMax}kg</div>
                    <div style={{ fontSize: 11, color: "var(--dim)" }}>{prev.serie.filter(sr => sr.completata).length} serie · vol {Math.round(prevVol)}</div>
                  </div>
                </div>
                {delta !== 0 && <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: delta > 0 ? "var(--ok)" : "var(--dan)" }}>{delta > 0 ? "↑ +" : "↓ "}{Math.round(Math.abs(delta))} volume ({delta > 0 ? "+" : "-"}{prevVol ? Math.round(Math.abs(delta / prevVol) * 100) : 0}%)</div>}
              </div>
            );
          })}
          <div className="div" />
        </>
      )}

      <div className="st">ESERCIZI</div>
      {s.esercizi.map((ex, i) => {
        const best = Math.max(...ex.serie.filter(sr => sr.completata && sr.kg).map(sr => +sr.kg), 0);
        const bestSr = ex.serie.find(sr => sr.completata && +sr.kg === best);
        return (
          <div key={i} className="card" style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div className="exn">{ex.nome}</div>
              <div style={{ textAlign: "right" }}>
                {best > 0 && <div className="tag tag-a">max {best}kg</div>}
                {best > 0 && bestSr && <div style={{ fontSize: 10, color: "var(--dim)", marginTop: 2 }}>1RM ~{epley(best, bestSr.reps)}kg</div>}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "22px 1fr 1fr 1fr 1fr", gap: 4, padding: "5px 0", borderTop: "1px solid var(--bdr)", alignItems: "center" }}>
              <div>#</div><div>KG</div><div>REPS</div><div>RPE</div><div>OK</div>
            </div>
            {ex.serie.map((sr, j) => (
              <div key={j} style={{ display: "grid", gridTemplateColumns: "22px 1fr 1fr 1fr 1fr", gap: 4, padding: "5px 0", borderTop: "1px solid var(--bdr)", alignItems: "center" }}>
                <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 18, color: sr.completata ? "var(--acc)" : "var(--mut)" }}>{j + 1}</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{sr.kg || "—"}</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{sr.reps || "—"}</div>
                <div style={{ fontSize: 12, color: sr.rpe >= 8 ? "var(--dan)" : sr.rpe >= 6 ? "#FF9F0A" : "var(--dim)" }}>{sr.rpe || "—"}</div>
                <div style={{ fontSize: 11, color: sr.completata ? "var(--ok)" : "var(--mut)" }}>{sr.completata ? "✓" : "—"}</div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── STATS ────────────────────────────────────────────────
function Stats({ sessioni }) {
  const [stab, setStab] = useState("progressi");
  return (
    <>
      <div style={{ paddingTop: 20, paddingBottom: 16 }}><h1 className="pt">STATS &<br />ANALISI</h1></div>
      <div className="stab-row">
        {[["progressi", "📈 Progressi"], ["record", "🏆 Record"], ["freq", "📅 Freq."], ["1rm", "🧮 1RM Calc"]].map(([t, l]) => (
          <button key={t} className={`stab${stab === t ? " on" : ""}`} onClick={() => setStab(t)}>{l}</button>
        ))}
      </div>
      {stab === "progressi" && <Progressi sessioni={sessioni} />}
      {stab === "record" && <RecordTab sessioni={sessioni} />}
      {stab === "freq" && <FreqTab sessioni={sessioni} />}
      {stab === "1rm" && <CalcRM />}
    </>
  );
}

function Progressi({ sessioni }) {
  const exNames = useMemo(() => { const s = new Set(); sessioni.forEach(ss => ss.esercizi.forEach(e => s.add(e.nome))); return [...s].sort(); }, [sessioni]);
  const [selEx, setSelEx] = useState(() => exNames[0] || "");

  const chartKg = useMemo(() => {
    if (!selEx) return [];
    return sessioni.filter(s => s.esercizi.some(e => e.nome === selEx)).map(s => {
      const ex = s.esercizi.find(e => e.nome === selEx);
      const maxKg = Math.max(...ex.serie.filter(sr => sr.completata && +sr.kg > 0).map(sr => +sr.kg), 0);
      return { y: maxKg, label: fmtShort(s.data), data: s.data };
    }).filter(d => d.y > 0).sort((a, b) => a.data.localeCompare(b.data));
  }, [sessioni, selEx]);

  const chartVol = useMemo(() => {
    if (!selEx) return [];
    return sessioni.filter(s => s.esercizi.some(e => e.nome === selEx)).map(s => {
      const ex = s.esercizi.find(e => e.nome === selEx);
      const vol = ex.serie.filter(sr => sr.completata).reduce((a, sr) => a + (+sr.kg || 0) * (+sr.reps || 0), 0);
      return { y: Math.round(vol), label: fmtShort(s.data), data: s.data };
    }).filter(d => d.y > 0).sort((a, b) => a.data.localeCompare(b.data));
  }, [sessioni, selEx]);

  if (exNames.length === 0) return <div className="emp"><div className="emp-ic">📈</div><div className="emp-t">Nessun dato</div><p style={{ fontSize: 13 }}>Completa almeno un allenamento</p></div>;

  const progresso = chartKg.length >= 2 ? Math.round((chartKg[chartKg.length - 1].y - chartKg[0].y) * 10) / 10 : 0;

  return (
    <>
      <div className="ig">
        <label className="lbl">Seleziona esercizio</label>
        <select className="inp" value={selEx} onChange={e => setSelEx(e.target.value)}>
          {exNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      {chartKg.length >= 2 ? (
        <>
          <div className="st">CARICO MASSIMO (kg)</div>
          <div className="chart-wrap"><LineChart data={chartKg} color="var(--acc)" height={110} /></div>
          <div className="st" style={{ marginTop: 14 }}>VOLUME TOTALE (kg × reps)</div>
          <div className="chart-wrap"><LineChart data={chartVol} color="#30D158" height={100} /></div>
          <div className="hg" style={{ marginTop: 14 }}>
            {[[`${Math.max(...chartKg.map(d => d.y))}kg`, "Record"], [chartKg.length, "Sessioni"], [`${progresso > 0 ? "+" : ""}${progresso}kg`, "Progresso"], [Math.round(chartVol.reduce((a, d) => a + d.y, 0) / (chartVol.length || 1)), "Vol medio"]].map(([v, l]) => (
              <div key={l} className="hsc"><div className="hsv" style={{ fontSize: 26 }}>{v}</div><div className="hsl">{l}</div></div>
            ))}
          </div>
        </>
      ) : <div className="emp" style={{ padding: "20px 0" }}><div style={{ fontSize: 13, color: "var(--dim)" }}>Almeno 2 sessioni con questo esercizio per i grafici</div></div>}
    </>
  );
}

function RecordTab({ sessioni }) {
  const records = useMemo(() => {
    const rec = {};
    sessioni.forEach(s => s.esercizi.forEach(e => e.serie.filter(sr => sr.completata && +sr.kg > 0).forEach(sr => {
      if (!rec[e.nome] || +sr.kg > rec[e.nome].kg) rec[e.nome] = { kg: +sr.kg, reps: sr.reps, data: s.data, schedaNome: s.schedaNome };
    })));
    return Object.entries(rec).sort((a, b) => b[1].kg - a[1].kg);
  }, [sessioni]);
  if (records.length === 0) return <div className="emp"><div className="emp-ic">🏆</div><div className="emp-t">Nessun record</div></div>;
  return (
    <>
      <div className="st">RECORD PERSONALI</div>
      {records.map(([nome, r], i) => (
        <div key={nome} className="card" style={{ padding: "12px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {i < 3 && <span style={{ fontSize: 18 }}>{["🥇", "🥈", "🥉"][i]}</span>}
              <div style={{ fontWeight: 700, fontSize: 15 }}>{nome}</div>
            </div>
            <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>{fmtDate(r.data)} · {r.schedaNome}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 28, color: "var(--acc)", letterSpacing: ".05em", lineHeight: 1 }}>{r.kg}kg</div>
            <div style={{ fontSize: 11, color: "var(--dim)" }}>1RM ~{epley(r.kg, r.reps)}kg</div>
          </div>
        </div>
      ))}
    </>
  );
}

function FreqTab({ sessioni }) {
  const weekData = useMemo(() => {
    const weeks = {};
    sessioni.forEach(s => {
      const d = new Date(s.data), mon = new Date(d);
      mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const key = fmtIso(mon); weeks[key] = (weeks[key] || 0) + 1;
    });
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - (11 - i) * 7);
      const key = fmtIso(d);
      return { label: fmtShort(key), y: weeks[key] || 0, key };
    });
  }, [sessioni]);

  const maxF = Math.max(...weekData.map(w => w.y), 1);
  const totAtt = weekData.filter(w => w.y > 0).length;

  return (
    <>
      <div className="st">FREQUENZA SETTIMANALE (ultim. 12 sett.)</div>
      <div className="chart-wrap"><LineChart data={weekData} color="#FF9F0A" height={100} /></div>
      <div className="hg" style={{ marginTop: 14 }}>
        {[[sessioni.length, "Totale"], [sessioni.length ? Math.round(sessioni.length / 12 * 10) / 10 : 0, "Sett. media"], [maxF, "Miglior sett."], [totAtt, "Sett. attive"]].map(([v, l]) => (
          <div key={l} className="hsc"><div className="hsv" style={{ fontSize: 26 }}>{v}</div><div className="hsl">{l}</div></div>
        ))}
      </div>
      <div className="st" style={{ marginTop: 4 }}>BARRE</div>
      <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 80, padding: "8px 6px", background: "var(--sur)", borderRadius: 8, border: "1px solid var(--bdr)" }}>
        {weekData.map((w, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{ width: "100%", background: w.y > 0 ? "var(--acc)" : "var(--bdr)", borderRadius: 3, height: `${Math.max((w.y / maxF) * 50, w.y > 0 ? 4 : 0)}px`, transition: "height .3s" }} />
            <div style={{ fontSize: 6.5, color: "var(--mut)", transform: "rotate(-45deg)", transformOrigin: "top center", whiteSpace: "nowrap", height: 16 }}>{w.label}</div>
          </div>
        ))}
      </div>
    </>
  );
}


// ─── PESO CORPOREO ────────────────────────────────────────
function Peso({ peso, onAdd, onDelete }) {
  const blank = () => ({
    valore: "", data: fmtIso(), nota: "",
    punteggio: "", tipologia: "",
    imc: "", imc_status: "",
    massa_grassa: "", massa_grassa_status: "",
    acqua: "", acqua_status: "",
    grasso_viscerale: "", grasso_viscerale_status: "",
    muscoli: "", muscoli_status: "",
    proteine: "", proteine_status: "",
    metabolismo: "", metabolismo_status: "",
    massa_ossea: "", massa_ossea_status: "",
    foto_fronte: null, foto_retro: null
  });
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [scanning, setScanning] = useState(false);
  const apiKey = localStorage.getItem("groq_key") || "";

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handlePhoto = async (key, file) => { if (!file) return; set(key, await compressImg(file)); };

  const scanZepp = async (file) => {
    const activeKey = GROQ_KEY || apiKey;
    if (!activeKey) { alert("Configura prima la Groq API key (sezione Import Scheda PDF)"); return; }
    setScanning(true);
    try {
      const b64 = await compressImg(file, 1200, 0.85);
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${activeKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [{
            role: "user", content: [
              { type: "image_url", image_url: { url: b64 } },
              { type: "text", text: ZEPP_PROMPT }
            ]
          }],
          temperature: 0, max_tokens: 512
        })
      });
      const json = await resp.json();
      const testo = json.choices?.[0]?.message?.content || "";
      const match = testo.match(/\{[\s\S]*\}/);
      if (match) {
        const d = JSON.parse(match[0]);
        setForm(f => ({
          ...f,
          valore: d.peso != null ? String(d.peso) : f.valore,
          punteggio: d.punteggio != null ? String(d.punteggio) : f.punteggio,
          tipologia: d.tipologia || f.tipologia,
          imc: d.imc != null ? String(d.imc) : f.imc, imc_status: d.imc_status || f.imc_status,
          massa_grassa: d.massa_grassa != null ? String(d.massa_grassa) : f.massa_grassa, massa_grassa_status: d.massa_grassa_status || f.massa_grassa_status,
          acqua: d.acqua != null ? String(d.acqua) : f.acqua, acqua_status: d.acqua_status || f.acqua_status,
          grasso_viscerale: d.grasso_viscerale != null ? String(d.grasso_viscerale) : f.grasso_viscerale, grasso_viscerale_status: d.grasso_viscerale_status || f.grasso_viscerale_status,
          muscoli: d.muscoli != null ? String(d.muscoli) : f.muscoli, muscoli_status: d.muscoli_status || f.muscoli_status,
          proteine: d.proteine != null ? String(d.proteine) : f.proteine, proteine_status: d.proteine_status || f.proteine_status,
          metabolismo: d.metabolismo != null ? String(d.metabolismo) : f.metabolismo, metabolismo_status: d.metabolismo_status || f.metabolismo_status,
          massa_ossea: d.massa_ossea != null ? String(d.massa_ossea) : f.massa_ossea, massa_ossea_status: d.massa_ossea_status || f.massa_ossea_status,
        }));
      } else { alert("Nessun dato trovato nello screenshot."); }
    } catch (e) { alert("Errore scan: " + e.message); }
    setScanning(false);
  };

  const handleAdd = async () => {
    if (!form.valore) return;
    setSaving(true);
    const n = v => v !== "" && v != null ? +v : null;
    await onAdd({
      id: genId(), valore: +form.valore, data: form.data, nota: form.nota,
      punteggio: n(form.punteggio), tipologia: form.tipologia || null,
      imc: n(form.imc), imc_status: form.imc_status || null,
      massa_grassa: n(form.massa_grassa), massa_grassa_status: form.massa_grassa_status || null,
      acqua: n(form.acqua), acqua_status: form.acqua_status || null,
      grasso_viscerale: n(form.grasso_viscerale), grasso_viscerale_status: form.grasso_viscerale_status || null,
      muscoli: n(form.muscoli), muscoli_status: form.muscoli_status || null,
      proteine: n(form.proteine), proteine_status: form.proteine_status || null,
      metabolismo: n(form.metabolismo), metabolismo_status: form.metabolismo_status || null,
      massa_ossea: n(form.massa_ossea), massa_ossea_status: form.massa_ossea_status || null,
      foto_fronte: form.foto_fronte || null, foto_retro: form.foto_retro || null,
    });
    setForm(blank()); setSaving(false); setShowModal(false);
  };

  const vals = peso.map(p => +p.valore);
  const mn = vals.length ? Math.min(...vals) : 0;
  const mx = vals.length ? Math.max(...vals) : 0;
  const primo = vals[0] || 0;
  const ultimo = vals[vals.length - 1] || 0;
  const delta = primo ? Math.round((ultimo - primo) * 10) / 10 : 0;
  const chartData = peso.map(p => ({ y: +p.valore, label: fmtShort(p.data) }));
  const hasBody = p => p.imc != null || p.massa_grassa != null || p.acqua != null || p.muscoli != null || p.grasso_viscerale != null || p.proteine != null || p.metabolismo != null || p.massa_ossea != null;

  const MR = ({ icon, label, value, unit, badge }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--bdr)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 10, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 700 }}>{label}</div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{value}<span style={{ fontSize: 11, color: "var(--dim)", marginLeft: 3 }}>{unit}</span></div>
        </div>
      </div>
      <StatusBadge label={badge} />
    </div>
  );

  const MI = ({ label, fk, sk, ph, step = "0.1" }) => (
    <div style={{ marginBottom: 10 }}>
      <label className="lbl">{label}</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 130px", gap: 6 }}>
        <input className="inp" type="number" step={step} placeholder={ph} value={form[fk]} onChange={e => set(fk, e.target.value)} />
        <select className="inp" style={{ fontSize: 11, padding: "10px 6px" }} value={form[sk]} onChange={e => set(sk, e.target.value)}>
          {STATUS_OPTS.map(o => <option key={o} value={o}>{o || "— stato"}</option>)}
        </select>
      </div>
    </div>
  );

  return (
    <>
      <div style={{ paddingTop: 20, paddingBottom: 16 }}>
        <h1 className="pt">PESO<br />CORPOREO</h1>
        <p className="sub">Traccia peso e composizione corporea</p>
      </div>

      {peso.length >= 2 && (
        <>
          <div className="hg">
            {[[`${ultimo}kg`, "Attuale"], [`${mn}kg`, "Min"], [`${mx}kg`, "Max"], [`${delta > 0 ? "+" : ""}${delta}kg`, "Delta"]].map(([v, l]) => (
              <div key={l} className="hsc">
                <div className="hsv" style={{ fontSize: 26, color: l === "Delta" ? (delta < 0 ? "var(--ok)" : delta > 0 ? "var(--dan)" : "var(--acc)") : "var(--acc)" }}>{v}</div>
                <div className="hsl">{l}</div>
              </div>
            ))}
          </div>
          <div className="st">ANDAMENTO</div>
          <div className="chart-wrap" style={{ marginBottom: 16 }}><LineChart data={chartData} color="var(--acc)" height={120} /></div>
        </>
      )}

      <button className="btn btn-p btn-full" style={{ marginBottom: 16 }} onClick={() => setShowModal(true)}><IcPlus /> NUOVA RILEVAZIONE</button>

      {peso.length > 0 && (
        <>
          <div className="st">STORICO ({peso.length} rilevazioni)</div>
          {[...peso].reverse().map(p => {
            const isExp = expanded === p.id;
            return (
              <div key={p.id} className="card" style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setExpanded(isExp ? null : p.id)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                    <div>
                      <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 28, color: "var(--acc)", lineHeight: 1 }}>{p.valore} <span style={{ fontSize: 13, color: "var(--dim)", fontFamily: "'Barlow',sans-serif", fontWeight: 400 }}>kg</span></div>
                      <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 1 }}>{fmtDate(p.data)}</div>
                    </div>
                    {p.punteggio != null && <div style={{ background: "var(--acc2)", borderRadius: 10, padding: "4px 10px", textAlign: "center", flexShrink: 0 }}>
                      <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, color: "var(--acc)", lineHeight: 1 }}>{p.punteggio}</div>
                      <div style={{ fontSize: 9, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".06em" }}>score</div>
                    </div>}
                    {p.tipologia && <span style={{ fontSize: 11, fontWeight: 700, background: "var(--bdr)", padding: "3px 9px", borderRadius: 20, flexShrink: 0 }}>{p.tipologia}</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    {(p.foto_fronte || p.foto_retro) && <span style={{ fontSize: 12 }}>📷</span>}
                    {hasBody(p) && <span style={{ fontSize: 12 }}>📊</span>}
                  </div>
                </div>

                {isExp && (
                  <div style={{ marginTop: 12, borderTop: "1px solid var(--bdr)", paddingTop: 12 }}>
                    {p.nota && <div style={{ fontSize: 13, color: "var(--dim)", marginBottom: 10, fontStyle: "italic" }}>"{p.nota}"</div>}

                    {(p.foto_fronte || p.foto_retro) && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                        {p.foto_fronte && <div>
                          <div className="st" style={{ fontSize: 9, marginBottom: 4 }}>FRONTE</div>
                          <img src={p.foto_fronte} alt="Fronte" style={{ width: "100%", borderRadius: 8, cursor: "pointer", objectFit: "cover", maxHeight: 200 }} onClick={() => setLightbox(p.foto_fronte)} />
                        </div>}
                        {p.foto_retro && <div>
                          <div className="st" style={{ fontSize: 9, marginBottom: 4 }}>RETRO</div>
                          <img src={p.foto_retro} alt="Retro" style={{ width: "100%", borderRadius: 8, cursor: "pointer", objectFit: "cover", maxHeight: 200 }} onClick={() => setLightbox(p.foto_retro)} />
                        </div>}
                      </div>
                    )}

                    {hasBody(p) && (
                      <div style={{ marginBottom: 8 }}>
                        <div className="st" style={{ marginBottom: 4 }}>COMPOSIZIONE CORPOREA</div>
                        {p.imc != null && <MR icon="⚖️" label="IMC" value={p.imc} badge={p.imc_status} />}
                        {p.massa_grassa != null && <MR icon="🔸" label="Massa grassa" value={p.massa_grassa} unit="%" badge={p.massa_grassa_status} />}
                        {p.acqua != null && <MR icon="💧" label="Acqua" value={p.acqua} unit="%" badge={p.acqua_status} />}
                        {p.grasso_viscerale != null && <MR icon="🔶" label="Grasso viscerale" value={p.grasso_viscerale} badge={p.grasso_viscerale_status} />}
                        {p.muscoli != null && <MR icon="💪" label="Muscoli" value={p.muscoli} unit="kg" badge={p.muscoli_status} />}
                        {p.proteine != null && <MR icon="🥩" label="Proteine" value={p.proteine} unit="%" badge={p.proteine_status} />}
                        {p.metabolismo != null && <MR icon="🔥" label="Metabolismo basale" value={p.metabolismo} unit="kcal" badge={p.metabolismo_status} />}
                        {p.massa_ossea != null && <MR icon="🦴" label="Massa ossea" value={p.massa_ossea} unit="kg" badge={p.massa_ossea_status} />}
                      </div>
                    )}

                    <button className="btn" style={{ marginTop: 6, fontSize: 12, padding: "7px 14px", color: "var(--dan)", border: "1px solid rgba(255,59,48,.25)", background: "rgba(255,59,48,.07)" }} onClick={() => {
                      setConfirmState({ msg: "Eliminare?", onConfirm: () => { onDelete(p.id); } });
                    }}>
                      <IcTrash /> Elimina
                    </button>
                  </div>
                )}

                {!isExp && <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                  <button className="bico d" onClick={e => {
                    e.stopPropagation();
                    setConfirmState({ msg: "Eliminare questa rilevazione?", onConfirm: () => { onDelete(p.id); } });
                  }}><IcTrash /></button>
                </div>}
              </div>
            );
          })}
        </>
      )}

      {lightbox && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.96)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="foto" style={{ maxWidth: "95%", maxHeight: "95vh", objectFit: "contain", borderRadius: 8 }} />
          <button style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,.15)", border: "none", color: "#fff", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", fontSize: 18 }} onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}

      {showModal && (
        <div className="mov" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="mod">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div className="wt">NUOVA RILEVAZIONE</div>
              <button className="bico" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {/* Zepp Life scan */}
            <div style={{ marginBottom: 16 }}>
              <label className="lbl" style={{ marginBottom: 6 }}>SCAN ZEPP LIFE — AI COMPILA TUTTO AUTOMATICAMENTE</label>
              <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", border: "1px dashed var(--bdr)", borderRadius: 10, cursor: "pointer", color: scanning ? "var(--acc)" : "var(--dim)", fontSize: 13, transition: "all .15s", background: scanning ? "var(--acc2)" : "transparent" }}>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files[0] && scanZepp(e.target.files[0])} />
                <span style={{ fontSize: 20 }}>{scanning ? "⏳" : "📊"}</span>
                <div>
                  <div style={{ fontWeight: 700 }}>{scanning ? "Analisi in corso…" : "Carica screenshot Zepp Life"}</div>
                  <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 1 }}>Il modello AI legge tutti i valori e li compila</div>
                </div>
              </label>
            </div>

            <div className="st" style={{ marginBottom: 8 }}>PESO E DATA</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div><label className="lbl">Peso (kg)</label><input className="inp" type="number" step="0.1" min="30" placeholder="86.5" value={form.valore} onChange={e => set("valore", e.target.value)} /></div>
              <div><label className="lbl">Data</label><input className="inp" type="date" value={form.data} onChange={e => set("data", e.target.value)} /></div>
            </div>

            <div className="st" style={{ marginBottom: 8 }}>COMPOSIZIONE CORPOREA <span style={{ fontSize: 10, color: "var(--mut)" }}>(OPZIONALE)</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div><label className="lbl">Punteggio corpo</label><input className="inp" type="number" placeholder="46" value={form.punteggio} onChange={e => set("punteggio", e.target.value)} /></div>
              <div><label className="lbl">Tipologia corporea</label>
                <select className="inp" value={form.tipologia} onChange={e => set("tipologia", e.target.value)}>
                  <option value="">—</option>
                  {["Magro", "Magro muscoloso", "Normale", "Muscoloso", "Robusto", "Sovrappeso", "Obeso"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <MI label="IMC" fk="imc" sk="imc_status" ph="30.3" />
            <MI label="Massa grassa (%)" fk="massa_grassa" sk="massa_grassa_status" ph="31.3" />
            <MI label="Acqua (%)" fk="acqua" sk="acqua_status" ph="49.1" />
            <MI label="Grasso viscerale" fk="grasso_viscerale" sk="grasso_viscerale_status" ph="13" step="1" />
            <MI label="Muscoli (kg)" fk="muscoli" sk="muscoli_status" ph="56.62" step="0.01" />
            <MI label="Proteine (%)" fk="proteine" sk="proteine_status" ph="16.2" />
            <MI label="Metabolismo basale (kcal)" fk="metabolismo" sk="metabolismo_status" ph="1753" step="1" />
            <MI label="Massa ossea (kg)" fk="massa_ossea" sk="massa_ossea_status" ph="3.04" step="0.01" />

            <div className="st" style={{ marginTop: 4, marginBottom: 8 }}>FOTO CORPOREE <span style={{ fontSize: 10, color: "var(--mut)" }}>(OPZIONALE)</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[["foto_fronte", "FRONTE"], ["foto_retro", "RETRO"]].map(([key, lab]) => (
                <div key={key}>
                  <label className="lbl">{lab}</label>
                  <label style={{ display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed var(--bdr)", borderRadius: 8, cursor: "pointer", overflow: "hidden", minHeight: 90, background: "var(--sur)" }}>
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files[0] && handlePhoto(key, e.target.files[0])} />
                    {form[key] ? <img src={form[key]} alt={key} style={{ width: "100%", maxHeight: 130, objectFit: "cover" }} /> : <span style={{ fontSize: 26, color: "var(--mut)" }}>+</span>}
                  </label>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="lbl">Nota (opzionale)</label>
              <input className="inp" placeholder="es. mattina a digiuno" value={form.nota} onChange={e => set("nota", e.target.value)} />
            </div>

            <button className="btn btn-p btn-full" onClick={handleAdd} disabled={!form.valore || saving}>
              <IcPlus /> {saving ? "SALVATAGGIO…" : "SALVA RILEVAZIONE"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── PROFILO PERSONALE ────────────────────────────────────
function Profilo({ settings, peso, onSave, piani, logDieta, onOpenDietaLog, onLogout }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(fmtIso(new Date()));
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const fileInputRef = useRef(null);
  const [currentPhoto, setCurrentPhoto] = useState(settings.foto_profilo || null);

  useEffect(() => {
    setCurrentPhoto(settings.foto_profilo || null);
  }, [settings.foto_profilo]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Circonferenze corporee
  const [showCircModal, setShowCircModal] = useState(false);
  const [circForm, setCircForm] = useState({});
  const [circScanning, setCircScanning] = useState(false);

  const CIRC_FIELDS = [
    { key: "testa", label: "Testa", icon: "🧠" },
    { key: "torace", label: "Torace", icon: "🫁" },
    { key: "braccio_rilassato", label: "Braccio Rilassato", icon: "💪" },
    { key: "braccio_flesso", label: "Braccio Flesso", icon: "💪" },
    { key: "avambraccio", label: "Avambraccio", icon: "🦾" },
    { key: "polso", label: "Polso", icon: "⌚" },
    { key: "vita", label: "Vita", icon: "📏" },
    { key: "addome", label: "Addome", icon: "🔶" },
    { key: "fianchi", label: "Fianchi", icon: "🔸" },
    { key: "coscia_max", label: "Coscia Max", icon: "🦵" },
    { key: "coscia_med", label: "Coscia Media", icon: "🦵" },
    { key: "polpaccio", label: "Polpaccio", icon: "🦿" },
  ];

  const currentCirc = settings.circonferenze || null;

  const openCircModal = () => {
    const c = currentCirc || {};
    setCircForm({
      data: c.data || fmtIso(),
      testa: c.testa != null ? String(c.testa) : "",
      torace: c.torace != null ? String(c.torace) : "",
      braccio_rilassato: c.braccio_rilassato != null ? String(c.braccio_rilassato) : "",
      braccio_flesso: c.braccio_flesso != null ? String(c.braccio_flesso) : "",
      avambraccio: c.avambraccio != null ? String(c.avambraccio) : "",
      polso: c.polso != null ? String(c.polso) : "",
      vita: c.vita != null ? String(c.vita) : "",
      addome: c.addome != null ? String(c.addome) : "",
      fianchi: c.fianchi != null ? String(c.fianchi) : "",
      coscia_max: c.coscia_max != null ? String(c.coscia_max) : "",
      coscia_med: c.coscia_med != null ? String(c.coscia_med) : "",
      polpaccio: c.polpaccio != null ? String(c.polpaccio) : "",
    });
    setShowCircModal(true);
  };

  const scanCirc = async (file) => {
    const activeKey = GROQ_KEY || localStorage.getItem("groq_key") || "";
    if (!activeKey) { alert("Configura prima la Groq API key"); return; }
    setCircScanning(true);
    try {
      const b64 = await compressImg(file, 1200, 0.85);
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${activeKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [{ role: "user", content: [
            { type: "image_url", image_url: { url: b64 } },
            { type: "text", text: CIRC_PROMPT }
          ]}],
          temperature: 0, max_tokens: 512
        })
      });
      const json = await resp.json();
      const testo = json.choices?.[0]?.message?.content || "";
      const match = testo.match(/\{[\s\S]*\}/);
      if (match) {
        const d = JSON.parse(match[0]);
        const sv = (v) => v != null ? String(v) : "";
        setCircForm(f => ({
          ...f,
          data: d.data || f.data,
          testa: d.testa != null ? sv(d.testa) : f.testa,
          torace: d.torace != null ? sv(d.torace) : f.torace,
          braccio_rilassato: d.braccio_rilassato != null ? sv(d.braccio_rilassato) : f.braccio_rilassato,
          braccio_flesso: d.braccio_flesso != null ? sv(d.braccio_flesso) : f.braccio_flesso,
          avambraccio: d.avambraccio != null ? sv(d.avambraccio) : f.avambraccio,
          polso: d.polso != null ? sv(d.polso) : f.polso,
          vita: d.vita != null ? sv(d.vita) : f.vita,
          addome: d.addome != null ? sv(d.addome) : f.addome,
          fianchi: d.fianchi != null ? sv(d.fianchi) : f.fianchi,
          coscia_max: d.coscia_max != null ? sv(d.coscia_max) : f.coscia_max,
          coscia_med: d.coscia_med != null ? sv(d.coscia_med) : f.coscia_med,
          polpaccio: d.polpaccio != null ? sv(d.polpaccio) : f.polpaccio,
        }));
      } else { alert("Nessuna misura trovata nell'immagine."); }
    } catch (e) { alert("Errore scan: " + e.message); }
    setCircScanning(false);
  };

  const saveCirc = async () => {
    const nv = v => v !== "" && v != null ? +v : null;
    const circ = {
      data: circForm.data || fmtIso(),
      testa: nv(circForm.testa), torace: nv(circForm.torace),
      braccio_rilassato: nv(circForm.braccio_rilassato), braccio_flesso: nv(circForm.braccio_flesso),
      avambraccio: nv(circForm.avambraccio), polso: nv(circForm.polso),
      vita: nv(circForm.vita), addome: nv(circForm.addome), fianchi: nv(circForm.fianchi),
      coscia_max: nv(circForm.coscia_max), coscia_med: nv(circForm.coscia_med),
      polpaccio: nv(circForm.polpaccio),
    };
    await onSave({ ...settings, circonferenze: circ });
    setShowCircModal(false);
  };

  const openEdit = () => {
    setForm({
      nome: settings.nome || "",
      sesso: settings.sesso || "",
      eta: settings.eta || "",
      altezza: settings.altezza || "",
      foto_profilo: settings.foto_profilo || null,
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({ ...settings, ...form, eta: form.eta ? +form.eta : null, altezza: form.altezza ? +form.altezza : null });
    setSaving(false);
    setEditing(false);
  };

  const handleFotoProfilo = async (file) => {
    if (!file) return;
    const b64 = await compressImg(file, 400, 0.8);
    setCurrentPhoto(b64);
    onSave({ ...settings, foto_profilo: b64 });
  };

  // Ultimo peso con dati corpo
  const hasBody = p => p.imc != null || p.massa_grassa != null || p.acqua != null || p.muscoli != null || p.grasso_viscerale != null || p.proteine != null || p.metabolismo != null || p.massa_ossea != null;
  const ultimoPeso = [...peso].reverse().find(p => p.valore != null && (hasBody(p) || p.punteggio != null)) || [...peso].reverse()[0] || null;

  // Ultime foto corporee
  const ultimeFoto = [...peso].reverse().find(p => p.foto_fronte || p.foto_retro);

  // Bollino salute
  const computeHealth = (p) => {
    if (!p) return null;
    if (p.punteggio != null) {
      const s = +p.punteggio;
      if (s >= 70) return { color: "var(--ok)", bg: "rgba(48,209,88,.12)", label: "Ottimo", score: s };
      if (s >= 55) return { color: "#FF9500", bg: "rgba(255,149,0,.12)", label: "Nella media", score: s };
      return { color: "var(--dan)", bg: "rgba(255,59,48,.12)", label: "Da migliorare", score: s };
    }
    const BAD = ["molto alto", "insufficiente", "molto basso"];
    const WARN = ["alto", "basso"];
    const FIELDS = ["imc_status", "massa_grassa_status", "acqua_status", "grasso_viscerale_status"];
    let bad = 0, warn = 0;
    FIELDS.forEach(f => {
      const v = (p[f] || "").toLowerCase();
      if (BAD.some(b => v.includes(b))) bad++;
      else if (WARN.some(w => v === w)) warn++;
    });
    if (bad >= 2) return { color: "var(--dan)", bg: "rgba(255,59,48,.12)", label: "Da migliorare", score: null };
    if (bad === 1 || warn >= 2) return { color: "#FF9500", bg: "rgba(255,149,0,.12)", label: "Attenzione", score: null };
    if (bad === 0 && warn === 0 && (p.imc_status || p.massa_grassa_status)) return { color: "var(--ok)", bg: "rgba(48,209,88,.12)", label: "Buono", score: null };
    return null;
  };
  const health = computeHealth(ultimoPeso);

  const altezza = settings.altezza;
  const eta = settings.eta;
  const sesso = settings.sesso;
  const nome = settings.nome;

  // Metriche rilevanti dell'ultimo tracciamento
  const METRICHE = [
    { icon: "⚖️", label: "IMC", vk: "imc", sk: "imc_status", unit: "" },
    { icon: "🔸", label: "Massa grassa", vk: "massa_grassa", sk: "massa_grassa_status", unit: "%" },
    { icon: "💧", label: "Acqua", vk: "acqua", sk: "acqua_status", unit: "%" },
    { icon: "🔶", label: "Grasso viscerale", vk: "grasso_viscerale", sk: "grasso_viscerale_status", unit: "" },
    { icon: "💪", label: "Muscoli", vk: "muscoli", sk: "muscoli_status", unit: "kg" },
    { icon: "🥩", label: "Proteine", vk: "proteine", sk: "proteine_status", unit: "%" },
    { icon: "🔥", label: "Metabolismo", vk: "metabolismo", sk: "metabolismo_status", unit: "kcal" },
    { icon: "🦴", label: "Massa ossea", vk: "massa_ossea", sk: "massa_ossea_status", unit: "kg" },
  ];

  return (
    <>
      <div style={{ paddingTop: 20, paddingBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 className="pt">PROFILO<br />PERSONALE</h1>
          <p className="sub">Il tuo stato di forma attuale</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="bico" title="Esci" onClick={onLogout}>
            <Ico d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" size={18} />
          </button>
          <button className="bico" onClick={openEdit}><IcEdit /></button>
        </div>
      </div>

      {/* CARD PROFILO */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {/* Avatar */}
          <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", border: "2px solid var(--acc)", flexShrink: 0, background: "var(--sur)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "var(--mut)" }}>
            {currentPhoto
              ? <img src={currentPhoto} alt="profilo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : "👤"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 24, letterSpacing: ".05em", lineHeight: 1, marginBottom: 4 }}>
              {nome || "Il tuo profilo"}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {sesso && <span style={{ fontSize: 11, fontWeight: 700, background: "var(--bdr)", padding: "2px 8px", borderRadius: 20 }}>{sesso === "M" ? "♂ Uomo" : sesso === "F" ? "♀ Donna" : sesso}</span>}
              {eta && <span style={{ fontSize: 11, fontWeight: 700, background: "var(--bdr)", padding: "2px 8px", borderRadius: 20 }}>{eta} anni</span>}
              {altezza && <span style={{ fontSize: 11, fontWeight: 700, background: "var(--bdr)", padding: "2px 8px", borderRadius: 20 }}>{altezza} cm</span>}
            </div>
          </div>
        </div>

        {/* Dati mancanti prompt */}
        {(!nome || !sesso || !eta || !altezza) && (
          <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: "var(--acc2)", border: "1px solid var(--acc)", fontSize: 12, color: "var(--dim)" }}>
            ✏️ Completa il profilo con <b style={{ color: "var(--txt)" }}>{[!nome && "nome", !sesso && "sesso", !eta && "età", !altezza && "altezza"].filter(Boolean).join(", ")}</b>
          </div>
        )}
      </div>

      {/* DIETA - CALENDARIO SOLARE */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <div className="st">LOG DIETA</div>
            <div style={{ fontSize: 11, color: "var(--dim)" }}>Calendario solare dei log alimentari</div>
          </div>
          <button className="btn btn-s" style={{ fontSize: 11, padding: "8px 12px" }} onClick={onOpenDietaLog}>
            <IcApple /> APRI LOG DIETA
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <button className="bico" onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>◀</button>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{calendarMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</div>
          <button className="bico" onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>▶</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 6 }}>
          {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => <div key={d} style={{ fontSize: 11, textAlign: 'center', color: 'var(--dim)' }}>{d}</div>)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {Array.from({ length: (new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay() + 6) % 7 }, (_, i) => (
            <div key={"empty-" + i} />
          ))}
          {Array.from({ length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map(day => {
            const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
            const idate = fmtIso(date);
            const hasLog = (logDieta || []).some(l => l.data === idate);
            const isSelected = selectedCalendarDate === idate;
            return (
              <button
                key={idate}
                className={`dpb${hasLog ? ' log' : ''}${isSelected ? ' on' : ''}`}
                style={{ fontSize: 10, padding: '6px 2px', minHeight: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setSelectedCalendarDate(idate)}
              >
                <div>{day}</div>
                <div style={{ fontSize: 8, color: hasLog ? '#30D158' : 'var(--mut)' }}>{hasLog ? '●' : ''}</div>
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 10, padding: 10, border: '1px solid var(--bdr)', borderRadius: 10, background: 'var(--sur)' }}>
          <div style={{ fontSize: 12, marginBottom: 6, color: 'var(--dim)' }}>
            {new Date(selectedCalendarDate).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          {(logDieta || []).filter(l => l.data === selectedCalendarDate).length > 0 ? (
            (logDieta || []).filter(l => l.data === selectedCalendarDate).map(l => (
              <div key={l.id} style={{ fontSize: 12, marginBottom: 4, borderBottom: '1px solid var(--bdr)', paddingBottom: 4 }}>
                {l.pianoNome || 'Log dieta'} · Giorno {l.giornoNumero} · {l.totKcalConsumate} kcal
              </div>
            ))
          ) : (
            <div style={{ fontSize: 12, color: 'var(--mut)', fontStyle: 'italic' }}>Nessun log per questa data.</div>
          )}
        </div>
      </div>

      {/* BOLLINO SALUTE */}
      {ultimoPeso && (
        <div style={{ marginBottom: 12, padding: 16, borderRadius: 12, border: `1px solid ${health?.color || "var(--bdr)"}`, background: health?.bg || "var(--card)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div>
              <div className="st" style={{ marginBottom: 2 }}>STATO DI SALUTE</div>
              <div style={{ fontSize: 11, color: "var(--dim)" }}>Basato sull'ultima rilevazione · {fmtDate(ultimoPeso.data)}</div>
            </div>
            {health && (
              <div style={{ textAlign: "center" }}>
                {health.score != null && <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 36, color: health.color, lineHeight: 1 }}>{health.score}</div>}
                <div style={{ fontSize: 11, fontWeight: 700, color: health.color, textTransform: "uppercase", letterSpacing: ".08em", padding: "3px 10px", borderRadius: 20, background: `${health.color}22`, marginTop: 2 }}>{health.label}</div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--bdr)" }}>
            <div>
              <div style={{ fontSize: 10, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 700 }}>Peso attuale</div>
              <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 28, color: "var(--acc)", lineHeight: 1 }}>{ultimoPeso.valore} <span style={{ fontSize: 13, color: "var(--dim)", fontFamily: "'Barlow',sans-serif", fontWeight: 400 }}>kg</span></div>
            </div>
            {ultimoPeso.tipologia && <span style={{ fontSize: 12, fontWeight: 700, background: "var(--bdr)", padding: "4px 12px", borderRadius: 20 }}>{ultimoPeso.tipologia}</span>}
            {altezza && ultimoPeso.imc == null && (() => {
              const bmi = Math.round(ultimoPeso.valore / (altezza / 100) ** 2 * 10) / 10;
              return <div style={{ textAlign: "right" }}><div style={{ fontSize: 10, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 700 }}>BMI calc.</div><div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, color: "var(--acc)" }}>{bmi}</div></div>;
            })()}
          </div>

          {/* Metriche grid */}
          {METRICHE.some(m => ultimoPeso[m.vk] != null && ultimoPeso[m.vk] !== "") && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
              {METRICHE.filter(m => ultimoPeso[m.vk] != null && ultimoPeso[m.vk] !== "").map(m => (
                <div key={m.vk} style={{ background: "var(--card)", borderRadius: 8, padding: "8px 10px", border: "1px solid var(--bdr)" }}>
                  <div style={{ fontSize: 10, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 2 }}>{m.icon} {m.label}</div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 4 }}>
                    <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 20, color: "var(--txt)" }}>{ultimoPeso[m.vk]}<span style={{ fontSize: 10, color: "var(--dim)", marginLeft: 2 }}>{m.unit}</span></div>
                    <StatusBadge label={ultimoPeso[m.sk]} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TREND PESO */}
      {peso.length >= 2 && (() => {
        const sorted = [...peso].sort((a, b) => a.data.localeCompare(b.data));
        const first = sorted[0], last = sorted[sorted.length - 1];
        const diff = Math.round((+last.valore - +first.valore) * 10) / 10;
        const good = diff < 0;
        return (
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="st" style={{ marginBottom: 8 }}>ANDAMENTO PESO</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[[`${first.valore} kg`, "Inizio", null], [`${last.valore} kg`, "Attuale", "var(--acc)"], [`${diff > 0 ? "+" : ""}${diff} kg`, "Variazione", good ? "var(--ok)" : "var(--dan)"]].map(([v, l, c]) => (
                <div key={l} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, color: c || "var(--txt)", lineHeight: 1 }}>{v}</div>
                  <div style={{ fontSize: 10, color: "var(--mut)", textTransform: "uppercase", letterSpacing: ".07em", marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* MISURE CORPOREE */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: currentCirc ? 10 : 0 }}>
          <div>
            <div className="st">📐 MISURE CORPOREE</div>
            {currentCirc?.data && <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>Rilevate il {fmtDate(currentCirc.data)}</div>}
          </div>
          <button className="btn btn-s" style={{ fontSize: 11, padding: "8px 12px" }} onClick={openCircModal}>
            {currentCirc ? <><IcEdit /> MODIFICA</> : <><IcPlus /> AGGIUNGI</>}
          </button>
        </div>
        {currentCirc ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
            {CIRC_FIELDS.filter(f => currentCirc[f.key] != null && currentCirc[f.key] !== 0).map(f => {
              const st = getCircStatus(f.key, currentCirc[f.key], settings.sesso || "M");
              return (
                <div key={f.key} style={{ background: st?.bg || "var(--sur)", borderRadius: 8, padding: "8px 10px", border: `1px solid ${st?.color || "var(--bdr)"}` }}>
                  <div style={{ fontSize: 9, color: "var(--mut)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 2 }}>{f.icon} {f.label}</div>
                  <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 20, color: st?.color || "var(--acc)", letterSpacing: ".04em", lineHeight: 1 }}>
                    {currentCirc[f.key]} <span style={{ fontSize: 10, color: "var(--dim)", fontFamily: "'Barlow',sans-serif", fontWeight: 400 }}>cm</span>
                  </div>
                  {st && (
                    <div style={{ marginTop: 4 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: st.color, background: `${st.color}22`, borderRadius: 10, padding: "2px 7px", letterSpacing: ".06em", textTransform: "uppercase" }}>
                        {st.label}
                      </span>
                      <div style={{ fontSize: 9, color: "var(--mut)", marginTop: 3 }}>🎯 {st.target}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ paddingTop: 10, fontSize: 12, color: "var(--mut)", fontStyle: "italic" }}>
            Nessuna misura ancora. Carica una foto dal nutrizionista per importarle con l'AI.
          </div>
        )}
      </div>

      {/* FOTO PROGRESSO */}
      {ultimeFoto && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="st" style={{ marginBottom: 8 }}>ULTIME FOTO CORPOREE · {fmtDate(ultimeFoto.data)}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {ultimeFoto.foto_fronte && <div>
              <div style={{ fontSize: 10, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>FRONTE</div>
              <img src={ultimeFoto.foto_fronte} alt="Fronte" style={{ width: "100%", borderRadius: 8, cursor: "pointer", objectFit: "cover", maxHeight: 220 }} onClick={() => setLightbox(ultimeFoto.foto_fronte)} />
            </div>}
            {ultimeFoto.foto_retro && <div>
              <div style={{ fontSize: 10, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>RETRO</div>
              <img src={ultimeFoto.foto_retro} alt="Retro" style={{ width: "100%", borderRadius: 8, cursor: "pointer", objectFit: "cover", maxHeight: 220 }} onClick={() => setLightbox(ultimeFoto.foto_retro)} />
            </div>}
          </div>
        </div>
      )}

      {!ultimoPeso && (
        <div className="emp"><div className="emp-ic">📊</div><div className="emp-t">Nessuna rilevazione</div><div style={{ fontSize: 13, color: "var(--mut)" }}>Aggiungi una rilevazione nel tab PESO per vedere il tuo stato di salute.</div></div>
      )}

      {/* LIGHTBOX */}
      {lightbox && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.96)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="foto" style={{ maxWidth: "95%", maxHeight: "95vh", objectFit: "contain", borderRadius: 8 }} />
          <button style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,.15)", border: "none", color: "#fff", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", fontSize: 18 }} onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}

      {/* MISURE CORPOREE MODAL */}
      {showCircModal && (
        <div className="mov" onClick={e => { if (e.target === e.currentTarget) setShowCircModal(false); }}>
          <div className="mod" style={{ maxHeight: "88vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div className="wt">📐 MISURE CORPOREE</div>
              <button className="bico" onClick={() => setShowCircModal(false)}>✕</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="lbl" style={{ marginBottom: 6 }}>SCAN AI — CARICA FOTO DAL NUTRIZIONISTA</label>
              <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", border: "1px dashed var(--bdr)", borderRadius: 10, cursor: "pointer", color: circScanning ? "var(--acc)" : "var(--dim)", fontSize: 13, transition: "all .15s", background: circScanning ? "var(--acc2)" : "transparent" }}>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files[0] && scanCirc(e.target.files[0])} />
                <span style={{ fontSize: 20 }}>{circScanning ? "⏳" : "📸"}</span>
                <div>
                  <div style={{ fontWeight: 700 }}>{circScanning ? "Analisi AI in corso…" : "Carica screenshot misure"}</div>
                  <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 1 }}>L'AI legge le circonferenze e le compila automaticamente</div>
                </div>
              </label>
            </div>
            <div className="st" style={{ marginBottom: 8 }}>DATA RILEVAZIONE</div>
            <div style={{ marginBottom: 14 }}>
              <input className="inp" type="date" value={circForm.data || ""} onChange={e => setCircForm(f => ({ ...f, data: e.target.value }))} />
            </div>
            <div className="st" style={{ marginBottom: 10 }}>INSERISCI MISURE (cm)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {CIRC_FIELDS.map(f => (
                <div key={f.key}>
                  <label className="lbl" style={{ fontSize: 9 }}>{f.icon} {f.label}</label>
                  <input className="inp" type="number" step="0.1" min="0" placeholder="—"
                    value={circForm[f.key] || ""}
                    onChange={e => setCircForm(cf => ({ ...cf, [f.key]: e.target.value }))}
                    style={{ padding: "8px 10px", fontSize: 14 }}
                  />
                </div>
              ))}
            </div>
            <button className="btn btn-p btn-full" onClick={saveCirc}>
              <IcCheck /> SALVA MISURE
            </button>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editing && (
        <div className="mov" onClick={e => { if (e.target === e.currentTarget) setEditing(false); }}>
          <div className="mod">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div className="wt">MODIFICA PROFILO</div>
              <button className="bico" onClick={() => setEditing(false)}>✕</button>
            </div>

            {/* Foto profilo */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <label style={{ cursor: "pointer", position: "relative" }}>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files[0] && handleFotoProfilo(e.target.files[0])} />
                <div style={{ width: 80, height: 80, borderRadius: "50%", overflow: "hidden", border: "2px dashed var(--acc)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, color: "var(--mut)", background: "var(--sur)" }}>
                  {form.foto_profilo ? <img src={form.foto_profilo} alt="profilo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
                </div>
                <div style={{ position: "absolute", bottom: 0, right: 0, background: "var(--acc)", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✏️</div>
              </label>
            </div>

            <div className="ig"><label className="lbl">Nome</label><input className="inp" placeholder="Il tuo nome" value={form.nome} onChange={e => set("nome", e.target.value)} /></div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div>
                <label className="lbl">Sesso</label>
                <select className="inp" value={form.sesso} onChange={e => set("sesso", e.target.value)}>
                  <option value="">—</option>
                  <option value="M">♂ Uomo</option>
                  <option value="F">♀ Donna</option>
                </select>
              </div>
              <div><label className="lbl">Età</label><input className="inp" type="number" min="10" max="100" placeholder="30" value={form.eta} onChange={e => set("eta", e.target.value)} /></div>
              <div><label className="lbl">Altezza (cm)</label><input className="inp" type="number" min="100" max="250" placeholder="175" value={form.altezza} onChange={e => set("altezza", e.target.value)} /></div>
            </div>

            <button className="btn btn-p btn-full" onClick={handleSave} disabled={saving}>
              <IcCheck /> {saving ? "SALVATAGGIO…" : "SALVA PROFILO"}
            </button>
          </div>
        </div>
      )}

      {confirmState && <ConfirmModal message={confirmState.msg} onConfirm={() => { confirmState.onConfirm(); setConfirmState(null); }} onCancel={() => setConfirmState(null)} />}
    </>
  );
}

// ─── DIETA: PIANI ALIMENTARI ──────────────────────────────
function PianiAlimentari({ piani, logDieta, onNew, onEdit, onDelete, onLog, settings }) {
  const [stab, setStab] = useState("piani");
  const [confirmState, setConfirmState] = useState(null);

  return (
    <>
      <div style={{ paddingTop: 20, paddingBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 className="pt">DIETA &<br />NUTRIZIONE</h1>
          </div>
          {stab === "piani" && (
            <button className="btn btn-p" onClick={onNew}><IcPlus /> NUOVO</button>
          )}
        </div>
      </div>

      <div className="stab-row">
        <button className={`stab${stab === "piani" ? " on" : ""}`} onClick={() => setStab("piani")}>📋 PIANI</button>
        <button className={`stab${stab === "storico" ? " on" : ""}`} onClick={() => setStab("storico")}>📅 STORICO</button>
      </div>

      {stab === "piani" && (
        <>
          <button className="btn btn-p btn-full" style={{ marginBottom: 14 }} onClick={onLog}>
            🍽 LOG PASTO DI OGGI
          </button>

          {piani.length === 0 ? (
            <div className="emp">
              <div className="emp-ic">🥗</div>
              <div className="emp-t">Nessun piano</div>
              <p style={{ fontSize: 13 }}>Crea il tuo primo piano alimentare</p>
            </div>
          ) : piani.map(p => (
            <div key={p.id} className="card" style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, letterSpacing: ".05em" }}>{p.nome}</div>
                  <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 4 }}>
                    {p.durataGiorni || 0} giorni · {p.pasti?.length || 0} pasti/giorno
                  </div>
                </div>
                <div style={{ display: "flex", gap: 7 }}>
                  <button className="bico" onClick={() => onEdit(p)}><IcEdit /></button>
                  <button className="bico d" onClick={() => {
                    setConfirmState({ msg: `Eliminare "${p.nome}"?`, onConfirm: () => { onDelete(p.id); } });
                  }}><IcTrash /></button>
                </div>
              </div>
              {p.pasti?.length > 0 && (
                <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {p.pasti.map((pas, i) => (
                    <span key={i} className="tag tag-m">
                      {pas.nome}{pas.kcal ? ` · ${pas.kcal}kcal` : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {stab === "storico" && (
        <StoricoDieta logDieta={logDieta} piani={piani} onLog={onLog} targetKcal={settings?.targetKcal || 1420} />
      )}

      {confirmState && <ConfirmModal message={confirmState.msg} onConfirm={() => { confirmState.onConfirm(); setConfirmState(null); }} onCancel={() => setConfirmState(null)} />}
    </>
  );
}

function StoricoDieta({ logDieta, piani, onLog, targetKcal = 1420 }) {
  const [selDay, setSelDay] = useState(null);

  // Helpers per calcolare kcal in modo robusto anche per log vecchi/corrotti
  const safeNum = (v) => {
    if (v == null || v === "") return 0;
    const n = Number(String(v).replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const calcPastoKcal = (p) => {
    if (!p) return 0;
    // Se ho alimenti con flag mangiato, conto solo quelli true
    if (Array.isArray(p.alimenti) && p.alimenti.length > 0) {
      const tot = p.alimenti.reduce((a, al) => {
        const eaten = typeof al.mangiato === "boolean" ? al.mangiato : true;
        return eaten ? a + safeNum(al.kcal) : a;
      }, 0);
      if (tot > 0 && tot < 10000) return tot;
    }
    // Fallback su campo kcal del pasto
    const fromField = safeNum(p.kcal);
    return fromField > 0 && fromField < 10000 ? fromField : 0;
  };

  const calcEntryKcal = (entry) => {
    if (!entry) return 0;
    let tot = 0;
    if (Array.isArray(entry.pastiLog) && entry.pastiLog.length > 0) {
      entry.pastiLog.forEach(p => {
        tot += calcPastoKcal(p);
      });
    } else if (Array.isArray(entry.pasti) && entry.pasti.length > 0) {
      entry.pasti.forEach(p => {
        tot += calcPastoKcal(p);
      });
    }
    if (Array.isArray(entry.extra) && entry.extra.length > 0) {
      entry.extra.forEach(e => {
        if (e.mangiato === false) return;
        tot += safeNum(e.kcal);
      });
    }
    return tot > 0 && tot < 20000 ? tot : 0;
  };

  const giorni = useMemo(() => {
    const map = {};
    logDieta.forEach(entry => {
      const raw = entry.data || entry._created_at || "";
      const day = raw.slice(0, 10);
      if (!day) return;
      const existing = map[day];
      // tieni solo l'entry più recente per quel giorno (ultimo log salvato)
      if (!existing || (entry._created_at && existing._created_at && entry._created_at > existing._created_at)) {
        map[day] = {
          day,
          entries: [entry],
          kcalTot: calcEntryKcal(entry),
          _created_at: entry._created_at || existing?._created_at || raw
        };
      }
    });
    return Object.values(map).sort((a, b) => b.day.localeCompare(a.day));
  }, [logDieta]);

  const chartData = useMemo(() => {
    const map = {};
    giorni.forEach(g => { map[g.day] = g.kcalTot; });
    return Array.from({ length: 7 }, (_, i) => {
      const dt = new Date();
      dt.setDate(dt.getDate() - (6 - i));
      const key = dt.toISOString().slice(0, 10);
      return { y: map[key] || 0, label: dt.toLocaleDateString("it-IT", { day: "numeric", month: "numeric" }) };
    });
  }, [giorni]);

  const hasChart = chartData.some(d => d.y > 0);
  const kcalMedia = giorni.length
    ? Math.round(giorni.slice(0, 7).reduce((a, g) => a + (+g.kcalTot || 0), 0) / Math.min(giorni.length, 7))
    : 0;

  const giorniAsc = useMemo(
    () => [...giorni].sort((a, b) => a.day.localeCompare(b.day)),
    [giorni]
  );

  if (giorni.length === 0) {
    return (
      <div className="emp">
        <div className="emp-ic">📅</div>
        <div className="emp-t">Nessun log</div>
        <p style={{ fontSize: 13 }}>Inizia a loggare i pasti per vedere lo storico</p>
      </div>
    );
  }

  return (
    <>
      <div className="hg" style={{ marginBottom: 14 }}>
        {[
          [giorni.length, "Giorni loggati"],
          [`${kcalMedia}kcal`, "Media giornaliera"],
        ].map(([v, l]) => (
          <div key={l} className="hsc">
            <div className="hsv" style={{ fontSize: 26 }}>{v}</div>
            <div className="hsl">{l}</div>
          </div>
        ))}
      </div>

      {hasChart && (
        <>
          <div className="st">KCAL ULTIMI 7 GIORNI</div>
          <div className="chart-wrap" style={{ marginBottom: 16 }}>
            <LineChart data={chartData} color="#30D158" height={100} />
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 72, padding: "6px 4px", background: "var(--sur)", borderRadius: 8, border: "1px solid var(--bdr)", marginBottom: 16 }}>
            {chartData.map((d, i) => {
              const maxKcal = Math.max(...chartData.map(x => x.y), 1);
              const isToday = i === 6;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{ width: "100%", borderRadius: 3, background: isToday ? "var(--ok)" : d.y > 0 ? "rgba(48,209,88,0.5)" : "var(--bdr)", height: `${Math.max((d.y / maxKcal) * 48, d.y > 0 ? 4 : 0)}px`, transition: "height .3s" }} />
                  <div style={{ fontSize: 7, color: isToday ? "var(--ok)" : "var(--mut)", fontWeight: isToday ? 700 : 400 }}>{d.label}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="st">DETTAGLIO GIORNALIERO</div>
      {giorni.map(g => {
        const isOpen = selDay === g.day;
        const dt = new Date(g.day + "T12:00:00");
        const dateLabel = dt.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
        const todayLocal = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
        const isToday = g.day === todayLocal;

        const pastiDelGiorno = [];
        g.entries.forEach(entry => {
          const pasti =
            entry.pastiLog ||
            entry.pasti ||
            (entry.nomePasto ? [{ nome: entry.nomePasto, kcal: entry.kcal || 0 }] : []);
          pasti.forEach(p => pastiDelGiorno.push(p));
        });

        const kcalBar = Math.min((((+g.kcalTot) || 0) / (targetKcal || 1420)) * 100, 100);

        return (
          <div key={g.day} className="card" style={{ marginBottom: 10, padding: 0, overflow: "hidden", borderColor: isToday ? "var(--ok)" : "var(--bdr)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", cursor: "pointer" }} onClick={() => setSelDay(isOpen ? null : g.day)}>
              <div>
                <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 16, letterSpacing: ".05em", color: isToday ? "var(--ok)" : "var(--txt)" }}>
                  {isToday ? "🟢 OGGI — " : ""}{dateLabel}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                  <div style={{ width: 100, height: 4, background: "var(--bdr)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${kcalBar}%`, background: isToday ? "var(--ok)" : "var(--acc)", borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 12, color: "var(--dim)", fontWeight: 700 }}>
                    {g.kcalTot > 0 ? `${Math.round(g.kcalTot)} kcal` : "—"}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="tag tag-m">{pastiDelGiorno.length || g.entries.length} pasti</div>
                <span style={{ color: "var(--mut)", fontSize: 16 }}>{isOpen ? "▲" : "▼"}</span>
              </div>
            </div>

            {isOpen && (
              <div style={{ borderTop: "1px solid var(--bdr)", padding: "12px 16px", background: "var(--sur)" }}>
                <div style={{ background: "rgba(48,209,88,0.08)", border: "1px solid rgba(48,209,88,0.25)", borderRadius: 10, padding: "10px 14px", marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ok)", letterSpacing: ".06em", textTransform: "uppercase" }}>Totale giorno</span>
                    <span style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 28, color: "var(--ok)", letterSpacing: ".05em" }}>
                      {Math.round(+g.kcalTot || 0)} kcal
                    </span>
                  </div>
                  <div style={{ height: 4, background: "var(--bdr)", borderRadius: 2, overflow: "hidden", marginTop: 8 }}>
                    <div style={{ height: "100%", width: `${kcalBar}%`, background: "var(--ok)", borderRadius: 2, transition: "width .4s" }} />
                  </div>
                  <div style={{ fontSize: 10, color: "var(--mut)", marginTop: 4 }}>su ~{targetKcal || 1420} kcal obiettivo</div>

                  <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 11, color: "var(--dim)" }}>
                      {g.entries[0]?.pianoNome && (
                        <span>
                          Piano: <b style={{ color: "var(--txt)" }}>{g.entries[0].pianoNome}</b>
                        </span>
                      )}
                    </div>
                    {onLog && (
                      <button
                        className="btn btn-s"
                        style={{ fontSize: 11, padding: "6px 10px" }}
                        onClick={() => {
                          const pianoId = g.entries[0]?.pianoId || null;
                          onLog({ date: g.day, pianoId });
                        }}
                      >
                        <IcEdit /> MODIFICA GIORNATA
                      </button>
                    )}
                  </div>
                </div>

                {pastiDelGiorno.length > 0 ? (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", color: "var(--dim)", marginBottom: 8 }}>PASTI LOGGATI</div>
                    {pastiDelGiorno.map((p, i) => {
                      const hasAlimenti = Array.isArray(p.alimenti) && p.alimenti.length > 0;
                      const kcalPasto = calcPastoKcal(p);
                      return (
                        <div key={i} style={{ marginBottom: 10, borderBottom: "1px solid var(--bdr)", paddingBottom: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: hasAlimenti ? 6 : 0 }}>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 600 }}>{p.nome || p.name || "Pasto"}</div>
                              {p.orario && <div style={{ fontSize: 11, color: "var(--mut)" }}>{p.orario}</div>}
                            </div>
                            <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 18, color: "var(--ok)", flexShrink: 0 }}>
                              {kcalPasto ? `${kcalPasto} kcal` : ""}
                            </div>
                          </div>
                          {hasAlimenti && (
                            <div style={{ marginTop: 4 }}>
                              {p.alimenti.map((al, ai) => (
                                <div key={al.id || ai} className="frow">
                                  <FoodThumb nome={al.nome} groqKey={GROQ_KEY} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{al.nome}</div>
                                    {al.grammi && (
                                      <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 1 }}>
                                        {al.grammi}g
                                      </div>
                                    )}
                                  </div>
                                  <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 16, color: "var(--acc)", flexShrink: 0 }}>
                                    {al.kcal ? `${al.kcal} kcal` : ""}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                ) : (
                  g.entries.map((entry, i) => {
                    const kcalEntry = calcEntryKcal(entry);
                    const nomeEntry = entry.nomePasto ?? entry.pianoNome ?? entry.nome ?? `Log ${i + 1}`;
                    const dataEntry = entry.data ? entry.data.slice(0, 10) : (entry.createdat ? entry.createdat.slice(0, 10) : null);
                    const dataLabel = dataEntry ? new Date(dataEntry + 'T12:00:00').toLocaleDateString('it-IT', {day:'numeric', month:'short'}) : '';
                    return (
                      <div key={entry.id + i} className="frow">
                        <div style={{display:'flex', flexDirection:'column', gap:2}}>
                          <div style={{fontSize:14, fontWeight:600}}>{nomeEntry}</div>
                          {dataLabel ? <div style={{fontSize:11, color:'var(--dim)'}}>{dataLabel}</div> : null}
                        </div>
                        <div style={{fontFamily:'Bebas Neue,cursive', fontSize:18, color:'var(--ok)'}}>
                          {kcalEntry > 0 ? `${kcalEntry} kcal` : ''}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Lista giorni in ordine cronologico (dal più vecchio al più recente) */}
      <div className="st" style={{ marginTop: 18 }}>CRONOLOGIA COMPLETA</div>
      <div style={{ background: "var(--sur)", borderRadius: 10, border: "1px solid var(--bdr)", padding: "8px 10px", fontSize: 12 }}>
        {giorniAsc.map(g => {
          const dt = new Date(g.day + "T12:00:00");
          const label = dt.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" });
          return (
            <div key={g.day} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px solid var(--bdr)" }}>
              <span style={{ color: "var(--dim)" }}>{label}</span>
              <span style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 16, color: "var(--ok)" }}>
                {g.kcalTot > 0 ? `${Math.round(+g.kcalTot || 0)} kcal` : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── PIANO EDIT ───────────────────────────────────────────
function PianoEdit({ piano: init, onSave, onBack }) {
  const [nome, setNome] = useState(init.nome || "");
  const [giorno, setGiorno] = useState(1);
  const [alModal, setAlModal] = useState(null);
  const [pdfModal, setPdfModal] = useState(false);
  const [confirmState, setConfirmState] = useState(null);

  const initGP = () => {
    if (init.giorniPasti) return JSON.parse(JSON.stringify(init.giorniPasti));
    const gp = {};
    for (let i = 1; i <= 7; i++) gp[i] = (i === 1 && init.pasti?.length > 0) ? JSON.parse(JSON.stringify(init.pasti)) : [];
    return gp;
  };
  const [giorniPasti, setGiorniPasti] = useState(initGP);

  const pastiCorrente = giorniPasti[giorno] || [];
  const setPC = newPasti => setGiorniPasti(prev => ({ ...prev, [giorno]: newPasti }));

  const addPasto = () => {
    const n = prompt("Nome del pasto? (es. Colazione, Spuntino, Pranzo...)");
    if (n?.trim()) setPC([...pastiCorrente, { id: genId(), nome: n.trim(), alimenti: [], altGroupId: null }]);
  };

  const addAlternativa = (pi) => {
    const src = pastiCorrente[pi];
    const n = prompt(`Nome alternativa per "${src.nome}"? (es. Pranzo B, Opzione vegana...)`);
    if (!n?.trim()) return;
    const groupId = src.altGroupId || src.id;
    // Assicura che il pasto sorgente abbia altGroupId
    const updated = pastiCorrente.map((p, i) =>
      i === pi && !p.altGroupId ? { ...p, altGroupId: groupId } : p
    );
    setPC([...updated, { id: genId(), nome: n.trim(), alimenti: [], altGroupId: groupId }]);
  };

  const movePasto = (i, dir) => {
    const a = [...pastiCorrente], j = i + dir;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]]; setPC(a);
  };

  const delPasto = i => {
    setConfirmState({ msg: "Eliminare questo pasto?", onConfirm: () => { setPC(pastiCorrente.filter((_, j) => j !== i)); } });
  };

  const copyFromPrev = () => {
    if (giorno <= 1) return;
    const prev = giorniPasti[giorno - 1];
    if (!prev || prev.length === 0) return alert("Il giorno precedente non ha pasti da copiare");
    setConfirmState({ msg: `Copiare i pasti di ${GIORNI_LABEL[giorno - 1]}?`, onConfirm: () => {
      setPC(JSON.parse(JSON.stringify(prev)).map(p => ({
        ...p, id: genId(),
        alimenti: p.alimenti.map(a => ({ ...a, id: genId() }))
      })));
    } });
  };

  const saveAlimento = food => {
    if (!food.nome?.trim()) return alert("Inserisci il nome dell'alimento");
    let np = [...pastiCorrente];
    if (alModal.mode === "new") {
      np = np.map((pst, i) => i === alModal.pIdx ? { ...pst, alimenti: [...pst.alimenti, { ...food, id: genId() }] } : pst);
    } else {
      np = np.map((pst, i) => i === alModal.pIdx ? { ...pst, alimenti: pst.alimenti.map((a, j) => j === alModal.aIdx ? { ...food } : a) } : pst);
    }
    setPC(np);
    setAlModal(null);
  };

  const delAlim = (pi, ai) =>
    setPC(pastiCorrente.map((pst, i) => i === pi ? { ...pst, alimenti: pst.alimenti.filter((_, j) => j !== ai) } : pst));

  // Kcal giorno — conta solo il primo pasto di ogni gruppo alt
  const totKcalGiorno = useMemo(() => {
    const seen = new Set();
    return pastiCorrente.reduce((a, p) => {
      if (p.altGroupId && seen.has(p.altGroupId)) return a;
      if (p.altGroupId) seen.add(p.altGroupId);
      return a + p.alimenti.reduce((b, al) => b + (+al.kcal || 0), 0);
    }, 0);
  }, [pastiCorrente]);

  const totKcalSett = useMemo(() =>
    Object.values(giorniPasti).reduce((tot, pasti) => {
      const seen = new Set();
      return tot + pasti.reduce((a, p) => {
        if (p.altGroupId && seen.has(p.altGroupId)) return a;
        if (p.altGroupId) seen.add(p.altGroupId);
        return a + p.alimenti.reduce((b, al) => b + (+al.kcal || 0), 0);
      }, 0);
    }, 0),
    [giorniPasti]
  );

  // Raggruppa pasti per visualizzazione in edit
  const pastiGroupsEdit = useMemo(() => {
    const groups = [];
    const seen = new Set();
    pastiCorrente.forEach((pasto, idx) => {
      if (!pasto.altGroupId) {
        groups.push({ type: 'single', items: [{ pasto, idx }] });
      } else if (!seen.has(pasto.altGroupId)) {
        seen.add(pasto.altGroupId);
        const alts = pastiCorrente
          .map((p, i) => ({ pasto: p, idx: i }))
          .filter(({ pasto: p }) => p.altGroupId === pasto.altGroupId);
        groups.push({ type: 'alternative', groupId: pasto.altGroupId, items: alts });
      }
    });
    return groups;
  }, [pastiCorrente]);

  return (
    <>
      <div className="content fi" style={{ paddingBottom: 100 }}>
        <button className="bb" onClick={onBack}><IcChevL /> Indietro</button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <h1 className="pt">{init.id ? "MODIFICA" : "NUOVO"}<br />PIANO</h1>
          <button className="btn btn-s" style={{ marginTop: 6, fontSize: 11, gap: 5 }} onClick={() => setPdfModal(true)}><IcFile size={14} /> PDF AI</button>
        </div>

        <div className="ig">
          <label className="lbl">Nome del piano</label>
          <input className="inp" placeholder="es. Massa 2024, Definizione..." value={nome} onChange={e => setNome(e.target.value)} />
        </div>

        <div className="wh" style={{ borderColor: "#30D158", background: "rgba(48,209,88,.1)", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div className="st" style={{ color: "#30D158", marginBottom: 2 }}>CALORIE {GIORNI_LABEL[giorno].toUpperCase()}</div>
            <div className="wlv" style={{ color: "#30D158" }}>{totKcalGiorno} <span style={{ fontSize: 16 }}>kcal</span></div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="st">TOT. SETTIMANA</div>
            <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 24 }}>{totKcalSett} kcal</div>
          </div>
        </div>

        <div className="st">GIORNO DELLA SETTIMANA</div>
        <div className="day-pill">
          {[1, 2, 3, 4, 5, 6, 7].map(d => (
            <button key={d}
              className={`dpb${giorno === d ? " on" : ""}${giorniPasti[d]?.length > 0 && giorno !== d ? " log" : ""}`}
              onClick={() => setGiorno(d)}>
              <div>{GIORNI_SHORT[d]}</div>
              <div style={{ fontSize: 8, marginTop: 2 }}>G{d}</div>
            </button>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="st" style={{ margin: 0 }}>PASTI — {GIORNI_LABEL[giorno].toUpperCase()}</div>
          <div style={{ display: "flex", gap: 6 }}>
            {giorno > 1 && (
              <button className="btn btn-s" style={{ fontSize: 11, padding: "7px 10px" }} onClick={copyFromPrev}>
                Copia G{giorno - 1}
              </button>
            )}
            <button className="btn btn-s" onClick={addPasto}><IcPlus /> PASTO</button>
          </div>
        </div>

        {pastiGroupsEdit.length === 0 && (
          <div className="emp" style={{ padding: "24px 0" }}>
            <div style={{ fontSize: 13, color: "var(--dim)" }}>Nessun pasto per {GIORNI_LABEL[giorno]}</div>
            <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 4 }}>Aggiungi pasti o copia dal giorno precedente</div>
          </div>
        )}

        {pastiGroupsEdit.map((group, gi) => {
          if (group.type === 'single') {
            const { pasto: p, idx: pi } = group.items[0];
            return (
              <PastoEditCard key={p.id}
                pasto={p} pi={pi} isAlt={false}
                canMoveUp={pi > 0} canMoveDown={pi < pastiCorrente.length - 1}
                onMoveUp={() => movePasto(pi, -1)}
                onMoveDown={() => movePasto(pi, 1)}
                onDelete={() => delPasto(pi)}
                onAddAlim={() => setAlModal({ mode: "new", pIdx: pi, data: { nome: "", grammi: "", kcal: "" } })}
                onEditAlim={(ai) => setAlModal({ mode: "edit", pIdx: pi, aIdx: ai, data: { ...p.alimenti[ai] } })}
                onDelAlim={(ai) => delAlim(pi, ai)}
                onAddAlternativa={() => addAlternativa(pi)}
              />
            );
          } else {
            // Gruppo alternative — box arancione contenitore
            return (
              <div key={group.groupId} style={{
                border: "2px solid rgba(255,149,0,.4)", borderRadius: 12,
                padding: 10, marginBottom: 14, background: "rgba(255,149,0,.04)"
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: "#FF9500",
                  textTransform: "uppercase", letterSpacing: ".08em",
                  marginBottom: 10, display: "flex", alignItems: "center", gap: 6
                }}>
                  ⇄ PASTI ALTERNATIVI
                  <span style={{ fontSize: 9, color: "var(--mut)", fontWeight: 400, textTransform: "none" }}>
                    — nel tracking sceglierai quale hai mangiato
                  </span>
                </div>
                {group.items.map(({ pasto: p, idx: pi }, altI) => (
                  <PastoEditCard key={p.id}
                    pasto={p} pi={pi} isAlt={true} altIndex={altI}
                    canMoveUp={pi > 0} canMoveDown={pi < pastiCorrente.length - 1}
                    onMoveUp={() => movePasto(pi, -1)}
                    onMoveDown={() => movePasto(pi, 1)}
                    onDelete={() => delPasto(pi)}
                    onAddAlim={() => setAlModal({ mode: "new", pIdx: pi, data: { nome: "", grammi: "", kcal: "" } })}
                    onEditAlim={(ai) => setAlModal({ mode: "edit", pIdx: pi, aIdx: ai, data: { ...p.alimenti[ai] } })}
                    onDelAlim={(ai) => delAlim(pi, ai)}
                    onAddAlternativa={null}
                  />
                ))}
              </div>
            );
          }
        })}

        <div style={{ height: 20 }} />
        <button className="btn btn-p btn-full" style={{ background: "#30D158", padding: 16, fontSize: 15 }}
          onClick={() => {
            if (!nome.trim()) return alert("Dai un nome al piano");
            onSave({ ...init, nome: nome.trim(), durataGiorni: 7, pasti: giorniPasti[1] || [], giorniPasti });
          }}>
          <IcCheck /> SALVA PIANO
        </button>
      </div>

      {alModal && (
        <AlimentoModal
          init={alModal.data}
          mode={alModal.mode}
          onSave={saveAlimento}
          onClose={() => setAlModal(null)}
        />
      )}
      {pdfModal && (
        <PdfImportModal
          groqKey={GROQ_KEY}
          onApply={({ nomePiano, giorniPasti: gp }) => {
            if (nomePiano) setNome(nomePiano);
            setGiorniPasti(gp);
            setGiorno(1);
          }}
          onClose={() => setPdfModal(false)}
        />
      )}
      {confirmState && <ConfirmModal message={confirmState.msg} onConfirm={() => { confirmState.onConfirm(); setConfirmState(null); }} onCancel={() => setConfirmState(null)} />}
    </>
  );
}

// ─── PASTO EDIT CARD ──────────────────────────────────────
function PastoEditCard({ pasto: p, pi, isAlt, altIndex, canMoveUp, canMoveDown, onMoveUp, onMoveDown, onDelete, onAddAlim, onEditAlim, onDelAlim, onAddAlternativa }) {
  const kcalPasto = p.alimenti.reduce((a, al) => a + (+al.kcal || 0), 0);

  return (
    <div style={{
      background: "var(--card)",
      border: `1px solid ${isAlt ? "rgba(255,149,0,.35)" : "var(--bdr)"}`,
      borderRadius: 10, padding: 12, marginBottom: isAlt ? 8 : 12
    }}>
      {/* Header pasto */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 10, borderBottom: "1px solid var(--bdr)", paddingBottom: 8
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isAlt && (
            <span style={{
              fontSize: 11, fontWeight: 700, minWidth: 22, height: 22,
              background: "#FF9500", color: "#fff",
              borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0
            }}>
              {altIndex === 0 ? "A" : "B"}
            </span>
          )}
          <div style={{
            fontFamily: "'Bebas Neue',cursive", fontSize: 20, letterSpacing: ".05em",
            color: isAlt ? "#FF9500" : "#30D158"
          }}>
            {p.nome}
          </div>
          {kcalPasto > 0 && (
            <span style={{ fontSize: 11, color: "var(--dim)" }}>{kcalPasto} kcal</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="bico" style={{ padding: 5 }} onClick={onMoveUp} disabled={!canMoveUp}><IcArrowUp size={14} /></button>
          <button className="bico" style={{ padding: 5 }} onClick={onMoveDown} disabled={!canMoveDown}><IcArrowDown size={14} /></button>
          <button className="bico d" style={{ padding: 5 }} onClick={onDelete}><IcTrash size={14} /></button>
        </div>
      </div>

      {/* Lista alimenti */}
      {p.alimenti.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--mut)", marginBottom: 8, fontStyle: "italic" }}>Nessun alimento.</div>
      )}
      {p.alimenti.map((al, ai) => (
        <div key={al.id || ai} style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "var(--sur)", padding: "8px 10px", borderRadius: 8, marginBottom: 6
        }}>
          <FoodThumb nome={al.nome} groqKey={GROQ_KEY} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{al.nome}</div>
            <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>{al.grammi}g · {al.kcal} kcal</div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="bico" style={{ padding: 5, border: "none" }} onClick={() => onEditAlim(ai)}><IcEdit size={14} /></button>
            <button className="bico d" style={{ padding: 5, border: "none" }} onClick={() => onDelAlim(ai)}><IcTrash size={14} /></button>
          </div>
        </div>
      ))}

      {/* Bottoni azioni pasto */}
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button className="btn btn-s" style={{ flex: 1, fontSize: 11, padding: "8px" }} onClick={onAddAlim}>
          <IcPlus /> ALIMENTO
        </button>
        {onAddAlternativa && (
          <button
            className="btn btn-s"
            style={{ fontSize: 11, padding: "8px", color: "#FF9500", borderColor: "rgba(255,149,0,.4)" }}
            onClick={onAddAlternativa}>
            ⇄ ALTERNATIVA
          </button>
        )}
      </div>
    </div>
  );
}

// ─── DIETA LOG ────────────────────────────────────────────
function DietaLog({ piani, logDieta, onAdd, onDelete, onBack, initialDate, initialPianoId }) {
  const todayDow = ((new Date().getDay() + 6) % 7) + 1;
  const todayIso = fmtIso();
  const [selectedDate, setSelectedDate] = useState(initialDate || todayIso); // giornata solare selezionata (YYYY-MM-DD)
  const [selectedPianoId, setSelectedPianoId] = useState(initialPianoId || piani[0]?.id || "");
  const [mangiato, setMangiato] = useState({});
  const [selectedAlts, setSelectedAlts] = useState({}); // { groupId: pastoId }
  const [extra, setExtra] = useState([]);
  const [showAddExtra, setShowAddExtra] = useState(false);
  const [extraNome, setExtraNome] = useState("");
  const [extraKcal, setExtraKcal] = useState("");
  const [extraEstimating, setExtraEstimating] = useState(false);
  const [saved, setSaved] = useState(false);

  const selectedDay = useMemo(() => {
    const d = new Date(selectedDate + "T12:00:00");
    const dow = d.getDay();
    return dow === 0 ? 7 : dow; // 1=Lun ... 7=Dom
  }, [selectedDate]);

  const existingLog = useMemo(() =>
    logDieta.find(l => {
      const d = l.data ? l.data.slice(0, 10) : (l.createdat ? l.createdat.slice(0, 10) : null);
      return d === selectedDate && l.pianoId === selectedPianoId && l.giornoNumero === selectedDay;
    }),
    [logDieta, selectedDate, selectedPianoId, selectedDay]
  );

  const piano = piani.find(p => p.id === selectedPianoId);

  const pastiGiorno = useMemo(() => {
    if (!piano) return [];
    return piano.giorniPasti?.[selectedDay] || piano.pasti || [];
  }, [piano, selectedDay]);

  // Raggruppa: single o gruppi di alternative
  const pastiGroups = useMemo(() => {
    const groups = [];
    const seen = new Set();
    pastiGiorno.forEach((pasto, idx) => {
      if (!pasto.altGroupId) {
        groups.push({ type: 'single', items: [{ pasto, idx }] });
      } else if (!seen.has(pasto.altGroupId)) {
        seen.add(pasto.altGroupId);
        const alts = pastiGiorno
          .map((p, i) => ({ pasto: p, idx: i }))
          .filter(({ pasto: p }) => p.altGroupId === pasto.altGroupId);
        groups.push({ type: 'alternative', groupId: pasto.altGroupId, items: alts });
      }
    });
    return groups;
  }, [pastiGiorno]);

  // Pasto attualmente selezionato per un gruppo
  const getSelItem = (group) => {
    if (group.type === 'single') return group.items[0];
    const selId = selectedAlts[group.groupId];
    return group.items.find(i => i.pasto.id === selId) || group.items[0];
  };

  useEffect(() => {
    if (existingLog) {
      const m = {};
      existingLog.pastiLog?.forEach((pasto, pi) =>
        pasto.alimenti?.forEach((al, ai) => { if (al.mangiato) m[`${pi}_${ai}`] = true; })
      );
      setMangiato(m);
      setExtra(existingLog.extra || []);
      setSelectedAlts(existingLog.selectedAlts || {});
    } else {
      setMangiato({});
      setExtra([]);
      setSelectedAlts({});
    }
  }, [existingLog, selectedDay, selectedPianoId]);

  const toggleFood = (pi, ai) =>
    setMangiato(prev => ({ ...prev, [`${pi}_${ai}`]: !prev[`${pi}_${ai}`] }));

  const selectAlt = (groupId, pastoId) => {
    setSelectedAlts(prev => ({ ...prev, [groupId]: pastoId }));
    // Resetta flag del gruppo quando cambi alternativa
    const group = pastiGroups.find(g => g.groupId === groupId);
    if (group) {
      setMangiato(prev => {
        const next = { ...prev };
        group.items.forEach(({ idx, pasto }) =>
          pasto.alimenti.forEach((_, ai) => delete next[`${idx}_${ai}`])
        );
        return next;
      });
    }
  };

  const toggleExtra = id => setExtra(prev => prev.map(e => e.id === id ? { ...e, mangiato: !e.mangiato } : e));
  const delExtra = id => setExtra(prev => prev.filter(e => e.id !== id));

  const addExtra = async () => {
    const nome = extraNome.trim();
    if (!nome || extraEstimating) return;

    setExtraEstimating(true);
    try {
      const manualKcal = Number(extraKcal);
      const estimatedKcal = estimateKcalFromName(nome);

      let finalKcal;
      if (manualKcal > 0) {
        finalKcal = manualKcal;
      } else {
        const aiKcal = await estimateKcalFromAI(nome, GROQ_KEY);
        if (aiKcal && aiKcal > 0) {
          finalKcal = aiKcal;
        } else if (estimatedKcal > 0) {
          finalKcal = estimatedKcal;
        } else {
          finalKcal = 150; // fallback
        }
      }

      setExtra(prev => [...prev, {
        id: genId(),
        nome,
        kcal: Math.round(finalKcal),
        mangiato: true
      }]);

      setExtraNome("");
      setExtraKcal("");
      setShowAddExtra(false);
    } catch (e) {
      // AI non disponibile: aggiungi comunque con stima locale o fallback
      const nomeVal = extraNome.trim();
      const fallback = estimateKcalFromName(nomeVal) || 150;
      setExtra(prev => [...prev, { id: genId(), nome: nomeVal, kcal: Math.round(fallback), mangiato: true }]);
      setExtraNome("");
      setExtraKcal("");
      setShowAddExtra(false);
    } finally {
      setExtraEstimating(false);
    }
  };



  // ─── Calcoli kcal ─────────────────────────────────────
  // Target = kcal del pasto selezionato per ogni gruppo
  const totPreviste = useMemo(() =>
    pastiGroups.reduce((a, group) => {
      const sel = getSelItem(group);
      return a + sel.pasto.alimenti.reduce((b, al) => b + (+al.kcal || 0), 0);
    }, 0),
    [pastiGroups, selectedAlts]
  );

  const totConsumatePiano = useMemo(() =>
    pastiGroups.reduce((a, group) => {
      const sel = getSelItem(group);
      return a + sel.pasto.alimenti.reduce((b, al, ai) =>
        b + (mangiato[`${sel.idx}_${ai}`] ? (+al.kcal || 0) : 0), 0
      );
    }, 0),
    [pastiGroups, selectedAlts, mangiato]
  );

  const totConsumateExtra = extra.filter(e => e.mangiato).reduce((a, e) => a + (+e.kcal || 0), 0);
  const totConsumate = totConsumatePiano + totConsumateExtra;
  const delta = totConsumate - totPreviste;
  const percTarget = totPreviste > 0 ? Math.min(120, Math.round(totConsumate / totPreviste * 100)) : 0;

  const balanceColor = totPreviste === 0 ? 'var(--acc)'
    : delta > 200 ? 'var(--dan)'
      : delta > 0 ? '#FF9500'
        : delta > -200 ? 'var(--ok)'
          : '#FF9500';

  const balanceLabel = totPreviste === 0
    ? `${totConsumate} kcal totali`
    : delta > 200 ? `+${delta} kcal sopra il target ⚠️`
      : delta > 0 ? `+${delta} kcal — leggermente sopra`
        : delta === 0 ? `In target perfetto ✓`
          : delta > -200 ? `${delta} kcal — leggermente sotto`
            : `${delta} kcal sotto il target ⚠️`;

  const handleSave = async () => {
    if (!piano) return;
    if (existingLog) await onDelete(existingLog.id);

    // Calcola kcal consumate usando i gruppi (stesso metodo del display, alternativa-aware)
    const kcalConsumate = pastiGroups.reduce((tot, group) => {
      const sel = getSelItem(group);
      return tot + sel.pasto.alimenti.reduce((s, al, ai) =>
        s + (mangiato[`${sel.idx}_${ai}`] ? (al.kcal || 0) : 0), 0
      );
    }, 0);
    const kcalExtra = extra.filter(e => e.mangiato).reduce((a, e) => a + (e.kcal || 0), 0);
    const totKcal = kcalConsumate + kcalExtra;

    const log = {
      id: genId(),
      data: selectedDate,
      pianoId: piano.id,
      pianoNome: piano.nome,
      giornoNumero: selectedDay,
      totKcalPreviste: totPreviste,
      totKcalConsumate: totKcal,
      kcalTotale: totKcal,
      kcal: totKcal,
      extra,
      selectedAlts,
      pastiLog: pastiGiorno.map((p, pi) => ({
        nome: p.nome,
        kcal: p.alimenti.reduce((s, al, ai) => {
          const key = `${pi}_${ai}`;
          return s + (mangiato[key] ? (al.kcal || 0) : 0);
        }, 0),
        alimenti: p.alimenti.map((al, ai) => {
          const key = `${pi}_${ai}`;
          return { ...al, mangiato: !!mangiato[key] };
        }),
      })),
    };

    await onAdd(log);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <div className="content fi">
        <button className="bb" onClick={onBack}><IcChevL /> Indietro</button>
        <h1 className="pt" style={{ marginBottom: 6 }}>TRACKING<br />DIETA</h1>
        <p className="sub" style={{ marginBottom: 8 }}>
          {new Date(selectedDate + "T12:00:00").toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        {/* Selettore giorno solare */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <button
            className="bico"
            onClick={() => {
              const d = new Date(selectedDate + "T12:00:00");
              d.setDate(d.getDate() - 1);
              setSelectedDate(d.toISOString().slice(0, 10));
            }}
          >
            ◀
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
              Giorno solare
            </div>
            <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 20, letterSpacing: '.06em' }}>
              {GIORNI_LABEL[selectedDay]} · {selectedDate}
            </div>
          </div>
          <button
            className="bico"
            onClick={() => {
              const d = new Date(selectedDate + "T12:00:00");
              d.setDate(d.getDate() + 1);
              setSelectedDate(d.toISOString().slice(0, 10));
            }}
          >
            ▶
          </button>
        </div>

        {piani.length === 0 ? (
          <div className="emp"><div className="emp-ic">🍎</div><div className="emp-t">Nessun piano creato</div></div>
        ) : (
          <>
            {piani.length > 1 && (
              <div className="ig">
                <label className="lbl">Piano</label>
                <select className="inp" value={selectedPianoId} onChange={e => {
                  setSelectedPianoId(e.target.value); setMangiato({}); setExtra([]); setSelectedAlts({});
                }}>
                  {piani.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
            )}

            <div className="div" />
            <div className="st">GIORNO DEL PIANO</div>
            <div className="day-pill">
              {[1, 2, 3, 4, 5, 6, 7].map(d => (
                <button
                  key={d}
                  className={`dpb${selectedDay === d ? " on" : ""}`}
                  disabled
                  style={{ opacity: selectedDay === d ? 1 : 0.4, cursor: 'default' }}
                >
                  <div>{GIORNI_SHORT[d]}</div>
                  <div style={{ fontSize: 8, marginTop: 2 }}>G{d}</div>
                </button>
              ))}
            </div>

            {/* ─── Box kcal ─── */}
            <div style={{
              background: 'var(--card)', border: `2px solid ${balanceColor}`,
              borderRadius: 14, padding: 16, marginBottom: 16, transition: 'border-color .3s'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
                    Calorie giornata
                  </div>
                  <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 42, color: balanceColor, lineHeight: 1, transition: 'color .3s' }}>
                    {totConsumate}
                    <span style={{ fontSize: 16, color: 'var(--dim)', fontFamily: "'Barlow',sans-serif", fontWeight: 400, marginLeft: 6 }}>kcal</span>
                  </div>
                  {totPreviste > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 4 }}>target: {totPreviste} kcal</div>
                  )}
                </div>
                {totPreviste > 0 && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 28, color: balanceColor }}>{percTarget}%</div>
                    <div style={{ fontSize: 10, color: 'var(--dim)' }}>del target</div>
                  </div>
                )}
              </div>

              {totPreviste > 0 && (
                <div style={{ height: 6, background: 'var(--bdr)', borderRadius: 3, marginBottom: 8, position: 'relative' }}>
                  <div style={{
                    height: '100%', borderRadius: 3, transition: 'width .4s, background .3s',
                    width: `${Math.min(100, percTarget)}%`,
                    background: percTarget > 110 ? 'var(--dan)' : percTarget > 100 ? '#FF9500' : '#30D158'
                  }} />
                  <div style={{ position: 'absolute', top: -4, right: 0, width: 2, height: 14, background: 'var(--dim)', borderRadius: 1 }} />
                </div>
              )}

              <div style={{ fontSize: 12, fontWeight: 700, color: balanceColor }}>{balanceLabel}</div>

              {totConsumateExtra > 0 && (
                <div style={{ display: 'flex', gap: 16, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--bdr)' }}>
                  <div style={{ fontSize: 11, color: 'var(--dim)' }}>Piano: <b style={{ color: 'var(--txt)' }}>{totConsumatePiano} kcal</b></div>
                  <div style={{ fontSize: 11, color: 'var(--dim)' }}>Extra: <b style={{ color: '#FF9500' }}>{totConsumateExtra} kcal</b></div>
                </div>
              )}
            </div>

            {/* ─── Pasti ─── */}
            {pastiGroups.length === 0 ? (
              <div className="emp" style={{ padding: "24px 0" }}>
                <div style={{ fontSize: 13, color: "var(--dim)" }}>Nessun pasto pianificato per {GIORNI_LABEL[selectedDay]}</div>
              </div>
            ) : (
              <>
                <div className="st" style={{ marginBottom: 10 }}>PASTI — {GIORNI_LABEL[selectedDay].toUpperCase()}</div>

                {pastiGroups.map((group, gi) => {
                  const selItem = getSelItem(group);
                  const { pasto, idx: pi } = selItem;
                  const pastoKcal = pasto.alimenti.reduce((a, al) => a + (+al.kcal || 0), 0);
                  const pastoEaten = pasto.alimenti.reduce((a, al, ai) =>
                    a + (mangiato[`${pi}_${ai}`] ? (+al.kcal || 0) : 0), 0
                  );
                  const tuttiMangiati = pasto.alimenti.length > 0
                    && pasto.alimenti.every((_, ai) => mangiato[`${pi}_${ai}`]);
                  const nessuno = pasto.alimenti.length > 0
                    && pasto.alimenti.every((_, ai) => !mangiato[`${pi}_${ai}`]);

                  return (
                    <div key={gi} style={{
                      background: 'var(--sur)',
                      border: `1px solid ${tuttiMangiati ? '#30D158' : nessuno ? 'rgba(255,59,48,.35)' : 'var(--bdr)'}`,
                      borderRadius: 10, padding: 12, marginBottom: 12, transition: 'border-color .2s'
                    }}>
                      {/* Header */}
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--bdr)'
                      }}>
                        <div style={{
                          fontFamily: "'Bebas Neue',cursive", fontSize: 18, letterSpacing: '.05em',
                          color: tuttiMangiati ? '#30D158' : nessuno ? 'var(--dan)' : 'var(--txt)'
                        }}>
                          {pasto.nome} {tuttiMangiati ? '✓' : nessuno && group.type === 'single' ? '✗' : ''}
                        </div>
                        <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 15, color: 'var(--acc)' }}>
                          {pastoEaten > 0 ? `${pastoEaten} / ` : ''}{pastoKcal} kcal
                        </div>
                      </div>

                      {/* Pill selezione alternativa */}
                      {group.type === 'alternative' && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#FF9500', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>
                            ⇄ Quale hai mangiato oggi?
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {group.items.map(({ pasto: p }, altI) => {
                              const isSelected = p.id === selItem.pasto.id;
                              const kc = p.alimenti.reduce((a, al) => a + (+al.kcal || 0), 0);
                              return (
                                <button key={p.id} onClick={() => selectAlt(group.groupId, p.id)}
                                  style={{
                                    padding: '6px 14px', borderRadius: 20, border: 'none',
                                    cursor: 'pointer', fontSize: 12, fontWeight: 700,
                                    fontFamily: "'Barlow',sans-serif",
                                    background: isSelected ? '#FF9500' : 'var(--bdr)',
                                    color: isSelected ? '#fff' : 'var(--dim)',
                                    transition: 'all .15s'
                                  }}>
                                  {altI === 0 ? 'A' : 'B'} · {p.nome}
                                  <span style={{ fontSize: 10, opacity: .8, marginLeft: 5 }}>{kc} kcal</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Alimenti del pasto selezionato */}
                      {pasto.alimenti.map((al, ai) => {
                        const eaten = !!mangiato[`${pi}_${ai}`];
                        return (
                          <div key={al.id || ai} className="frow">
                            <FoodThumb nome={al.nome} groqKey={GROQ_KEY} />
                            <div style={{ flex: 1, opacity: eaten ? .45 : 1, transition: 'opacity .15s', minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 13, textDecoration: eaten ? 'line-through' : 'none' }}>{al.nome}</div>
                              <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 1 }}>{al.grammi}g</div>
                            </div>
                            <div style={{
                              fontFamily: "'Bebas Neue',cursive", fontSize: 16,
                              color: eaten ? 'var(--dim)' : 'var(--acc)', flexShrink: 0,
                              textDecoration: eaten ? 'line-through' : 'none'
                            }}>
                              {al.kcal} kcal
                            </div>
                            <button className={`fck${eaten ? ' ok' : ''}`} onClick={() => toggleFood(pi, ai)}>
                              {eaten && <Ico d="M20 6L9 17l-5-5" size={12} stroke="#fff" sw={2.5} />}
                            </button>
                          </div>
                        );
                      })}

                      {pasto.alimenti.length === 0 && (
                        <div style={{ fontSize: 12, color: 'var(--mut)', fontStyle: 'italic', padding: '4px 0' }}>
                          Nessun alimento configurato
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {/* ─── Extra ─── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 4 }}>
              <div className="st" style={{ margin: 0 }}>EXTRA / FUORI PIANO</div>
              <button className="btn btn-s" style={{ fontSize: 11, padding: '7px 10px', gap: 4 }}
                onClick={() => setShowAddExtra(v => !v)}>
                <IcPlus /> AGGIUNGI
              </button>
            </div>

            {showAddExtra && (
              <div style={{ background: 'var(--sur)', border: '1px solid var(--acc)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 8, marginBottom: 10 }}>
                  <div>
                    <label className="lbl">Alimento / Bevanda</label>
                    <input className="inp" placeholder="es. Gin Tonic, Tiramisù…" value={extraNome}
                      onChange={e => setExtraNome(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addExtra()} />
                    {extraNome.trim() && !extraKcal && (
                      <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 6 }}>
                        Kcal stimate: {estimateKcalFromName(extraNome.trim()) || '150'} kcal
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="lbl">Kcal (opzionale)</label>
                    <input className="inp" type="number" min="0" placeholder="150" value={extraKcal}
                      onChange={e => setExtraKcal(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addExtra()} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                  {extraEstimating && (
                    <div style={{ fontSize: 12, color: 'var(--acc)', marginBottom: 6 }}>
                      Calcolo kcal AI in corso...
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-s" style={{ flex: 1, fontSize: 12 }}
                      onClick={() => { setShowAddExtra(false); setExtraNome(''); setExtraKcal(''); }}>
                      ANNULLA
                    </button>
                    <button className="btn btn-p" style={{ flex: 2, fontSize: 12, background: '#FF9500' }}
                      onClick={addExtra} disabled={!extraNome.trim() || extraEstimating}>
                      <IcPlus /> AGGIUNGI
                    </button>
                  </div>
                </div>
              </div>
            )}

            {extra.length > 0 && (
              <div style={{ background: 'var(--sur)', border: '1px solid var(--bdr)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                {extra.map(e => (
                  <div key={e.id} className="frow" style={{ opacity: e.mangiato ? 1 : 0.45, transition: 'opacity .15s' }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 8,
                      background: e.mangiato ? 'rgba(255,149,0,.15)' : 'var(--bdr)',
                      border: `1px solid ${e.mangiato ? 'rgba(255,149,0,.4)' : 'var(--bdr)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, flexShrink: 0
                    }}>🍹</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, textDecoration: e.mangiato ? 'none' : 'line-through' }}>{e.nome}</div>
                      <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 1 }}>
                        {e.mangiato ? 'conteggiato' : 'escluso dal conteggio'}
                      </div>
                    </div>
                    <div style={{
                      fontFamily: "'Bebas Neue',cursive", fontSize: 16,
                      color: e.mangiato ? '#FF9500' : 'var(--mut)', flexShrink: 0,
                      textDecoration: e.mangiato ? 'none' : 'line-through'
                    }}>
                      {e.kcal} kcal
                    </div>
                    <button className={`fck${e.mangiato ? ' ok' : ''}`}
                      style={{ borderColor: e.mangiato ? '#30D158' : 'var(--bdr)' }}
                      onClick={() => toggleExtra(e.id)}>
                      {e.mangiato && <Ico d="M20 6L9 17l-5-5" size={12} stroke="#fff" sw={2.5} />}
                    </button>
                    <button className="bico d" style={{ padding: 5, border: 'none', marginLeft: 4 }} onClick={() => delExtra(e.id)}>
                      <IcTrash size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {extra.length === 0 && !showAddExtra && (
              <div style={{ fontSize: 12, color: 'var(--mut)', fontStyle: 'italic', marginBottom: 16, textAlign: 'center' }}>
                Hai mangiato qualcosa fuori piano? Aggiungilo sopra.
              </div>
            )}

            {existingLog && (
              <div style={{background:'rgba(255,59,48,0.12)', border:'1px solid #FF3B30', borderRadius:10, padding:'10px 14px', marginBottom:12, fontSize:13, color:'#FF3B30', fontWeight:700}}>
                ⚠️ Hai già un log per oggi con questo piano. Salvando sovrascriverai quello esistente.
              </div>
            )}
            <button className="btn btn-p btn-full" style={{background: saved ? '#30D158' : existingLog ? '#FF9500' : '#30D158', padding:16, fontSize:15}} onClick={handleSave}>
              {saved ? '✓ SALVATO' : existingLog ? 'AGGIORNA LOG' : 'SALVA LOG GIORNATA'}
            </button>
          </>
        )}
      </div>

    </>
  );
}

// ─── PDF IMPORT MODAL ─────────────────────────────────────



// ─── ALIMENTO MODAL ───────────────────────────────────────


