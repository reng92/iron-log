import { genId, pianoAttivo, pastiPerGiorno } from "./utils";

const dowOf = iso => { const d = new Date(iso + "T12:00:00").getDay(); return d === 0 ? 7 : d; };
const mid = r => (r && (r.min != null || r.max != null) ? Math.round(((+r.min || +r.max) + (+r.max || +r.min)) / 2) : null);

// Gruppi pasto (singoli o alternative) come in DietaLog: idx = indice in pastiGiorno, usato da pastiLog
function gruppi(pastiGiorno, selectedAlts = {}) {
  const out = [];
  const visti = new Set();
  pastiGiorno.forEach((p, idx) => {
    if (!p.altGroupId) { out.push({ idx, pasto: p }); return; }
    if (visti.has(p.altGroupId)) return;
    visti.add(p.altGroupId);
    const alts = pastiGiorno.map((x, i) => ({ pasto: x, idx: i })).filter(x => x.pasto.altGroupId === p.altGroupId);
    out.push(alts.find(a => a.pasto.id === selectedAlts[p.altGroupId]) || alts[0]);
  });
  return out;
}

const logDelGiorno = (logDieta, iso) => logDieta.find(l => (l.data || "").slice(0, 10) === iso);

// Stato dieta di una data: pasti con flag mangiato, kcal e proteine rispetto al piano
export function statoDieta(piani, logDieta, iso, fallbackKcal = 1420) {
  const log = logDelGiorno(logDieta, iso);
  const piano = (log && piani.find(p => p.id === log.pianoId)) || pianoAttivo(piani, iso);
  const dow = dowOf(iso);
  const tipo = log?.tipoGiorno || piano?.giorniTipo?.[dow] || null;
  const pastiGiorno = piano ? pastiPerGiorno(piano, dow, tipo) : [];
  const pasti = gruppi(pastiGiorno, log?.selectedAlts).map(({ idx, pasto }) => {
    const al = log?.pastiLog?.[idx]?.alimenti || [];
    const nMang = al.filter(a => a.mangiato).length;
    const tot = (pasto.alimenti || []).length;
    return { idx, pasto, mangiato: tot > 0 && nMang >= tot, parziale: nMang > 0 && nMang < tot };
  });

  const target = piano?.target?.[tipo] || null;
  const kcalTarget = mid(target?.kcal) || null;
  const kcal = log ? (log.totKcalConsumate || log.kcalTotale || log.kcal || 0) : 0;

  const protTarget = mid(target?.proteine_g);
  const conProt = pastiGiorno.some(p => (p.alimenti || []).some(a => +a.proteine > 0));
  let prot = 0;
  log?.pastiLog?.forEach(p => p.alimenti?.forEach(a => { if (a.mangiato) prot += +a.proteine || 0; }));

  return {
    piano, tipo, log, pasti,
    kcal, kcalTarget: kcalTarget || fallbackKcal, kcalDalPiano: !!kcalTarget,
    prot: Math.round(prot), protTarget, protNoti: conProt,
  };
}

// Prossimo pasto: il primo non mangiato, preferendo quelli con orario non ancora passato
export function prossimoPasto(stato, ora = new Date()) {
  const hm = `${String(ora.getHours()).padStart(2, "0")}:${String(ora.getMinutes()).padStart(2, "0")}`;
  const aperti = stato.pasti.filter(p => !p.mangiato);
  if (!aperti.length) return null;
  return aperti.find(p => p.pasto.orario && p.pasto.orario >= hm) || aperti[0];
}

// Segna tutti gli alimenti di un pasto come mangiati; ritorna { oldId, log } nel formato di DietaLog
export function segnaPastoMangiato(piani, logDieta, iso, idx) {
  const old = logDelGiorno(logDieta, iso);
  const piano = (old && piani.find(p => p.id === old.pianoId)) || pianoAttivo(piani, iso);
  if (!piano) return null;
  const dow = dowOf(iso);
  const tipo = old?.tipoGiorno || piano.giorniTipo?.[dow] || null;
  const pastiGiorno = pastiPerGiorno(piano, dow, tipo);
  const selectedAlts = { ...(old?.selectedAlts || {}) };
  const p = pastiGiorno[idx];
  if (p?.altGroupId && !selectedAlts[p.altGroupId]) selectedAlts[p.altGroupId] = p.id;

  const mang = (pi, ai) => pi === idx || !!old?.pastiLog?.[pi]?.alimenti?.[ai]?.mangiato;
  const pastiLog = pastiGiorno.map((pa, pi) => ({
    nome: pa.nome,
    kcal: (pa.alimenti || []).reduce((s, al, ai) => s + (mang(pi, ai) ? (+al.kcal || 0) : 0), 0),
    alimenti: (pa.alimenti || []).map((al, ai) => ({ ...al, mangiato: mang(pi, ai) })),
  }));
  const extra = old?.extra || [];
  const kcalPiano = gruppi(pastiGiorno, selectedAlts).reduce((s, g) => s + pastiLog[g.idx].kcal, 0);
  const tot = kcalPiano + extra.filter(e => e.mangiato).reduce((s, e) => s + (+e.kcal || 0), 0);
  const previste = gruppi(pastiGiorno, selectedAlts).reduce((s, g) => s + (g.pasto.alimenti || []).reduce((b, al) => b + (+al.kcal || 0), 0), 0);

  return {
    oldId: old?.id || null,
    log: {
      id: genId(), data: iso, pianoId: piano.id, pianoNome: piano.nome, giornoNumero: dow, tipoGiorno: tipo,
      totKcalPreviste: previste, totKcalConsumate: tot, kcalTotale: tot, kcal: tot,
      extra, selectedAlts, pastiLog,
    },
  };
}
