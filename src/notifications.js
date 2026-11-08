import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { fmtIso, pianoAttivo, pastiPerGiorno } from './utils';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform();

// Range di ID: ogni tipo ha il suo blocco, così il sync cancella solo ciò che gestisce
const DAILY_ID = 1;
const TEST_BASE = 90;            // 90-99 test manuali
const WATER_BASE = 1000;         // 1000 + giorno*100 + slot
const MEAL_BASE = 2000;          // 2000 + giorno
const GIORNI_AVANTI = isNative ? 7 : 1; // sul web i timer vivono solo finché la pagina è aperta
const SMALL_ICON = 'ic_stat_ironlog';

const managed = id => id === DAILY_ID || (id >= WATER_BASE && id < MEAL_BASE + 100);

// Default impostazioni (letti da settings)
export const NOTIF_DEFAULTS = {
  acqua_obiettivo: 2000,
  acqua_extra_palestra: 500,
  acqua_borraccia: 750,
  acqua_notif: false,
  acqua_dalle: '09:00',
  acqua_alle: '21:00',
  acqua_ogni: 120,
  pasti_notif: false,
  pasti_orario: '21:00',
  pasti_pasto: 'pranzo',
};
export const cfg = (settings, k) => settings?.[k] ?? NOTIF_DEFAULTS[k];

const hm = s => { const [h, m] = (s || '00:00').split(':').map(Number); return [h || 0, m || 0]; };
const atDay = (offset, h, m) => { const d = new Date(); d.setDate(d.getDate() + offset); d.setHours(h, m, 0, 0); return d; };
const dowOf = d => ((d.getDay() + 6) % 7) + 1; // 1=Lun..7=Dom

// ─── Acqua: obiettivo del giorno ───
// Giorno palestra = sessione registrata quella data, oppure tipo dal log dieta / dal piano attivo
export function obiettivoAcqua(settings, iso, { piani = [], sessioni = [], logDieta = [] } = {}) {
  const base = +cfg(settings, 'acqua_obiettivo') || 2000;
  const extra = +cfg(settings, 'acqua_extra_palestra') || 0;
  if (!extra) return { ml: base, palestra: false };
  const allenato = sessioni.some(s => s.data && fmtIso(s.data) === iso);
  const log = logDieta.find(l => (l.data || '').slice(0, 10) === iso);
  const plan = pianoAttivo(piani, iso);
  const tipo = log?.tipoGiorno || plan?.giorniTipo?.[dowOf(new Date(iso + 'T12:00'))];
  const palestra = allenato || tipo === 'palestra';
  return { ml: base + (palestra ? extra : 0), palestra };
}

// ─── Pasti: testo del pasto da preparare per una data ───
export function pastoDaPreparare(piani, iso, nomePasto = 'pranzo') {
  const plan = pianoAttivo(piani, iso);
  if (!plan) return null;
  const pasti = pastiPerGiorno(plan, dowOf(new Date(iso + 'T12:00')));
  const q = nomePasto.trim().toLowerCase();
  const p = pasti.find(x => (x.nome || '').toLowerCase().includes(q));
  if (!p) return null;
  const alim = (p.alimenti || []).filter(a => a.nome).map(a => `${a.nome}${+a.grammi > 0 ? ' ' + a.grammi + 'g' : ''}`);
  return { nome: p.nome, alimenti: alim, kcal: p.kcal };
}

function testoPasto(piani, iso, nomePasto) {
  const p = pastoDaPreparare(piani, iso, nomePasto);
  const label = nomePasto.charAt(0).toUpperCase() + nomePasto.slice(1);
  if (!p) return { title: `🍱 Prepara il ${nomePasto} di domani`, body: 'Controlla il piano e prepara il pasto per domani.' };
  const lista = p.alimenti.length ? p.alimenti.join(', ') : 'vedi piano';
  return {
    title: `🍱 Domani a ${nomePasto}: ${p.nome}`,
    body: lista,
    largeBody: `${label} di domani${p.kcal ? ` (${p.kcal} kcal)` : ''}:\n• ${p.alimenti.join('\n• ') || 'vedi piano'}`,
  };
}

const MSG_ACQUA = [
  'Un sorso adesso, la borraccia ringrazia 💧',
  'Pausa idratazione: bevi un bicchiere',
  'I muscoli sono ~75% acqua. Bevi!',
  'Ricordati la borraccia 🚰',
  'Idratazione = performance. Bevi un po\'',
];

function testoAcqua(settings, bevuti, obiettivo) {
  const borr = +cfg(settings, 'acqua_borraccia') || 750;
  if (bevuti == null) return { title: '💧 Ora di bere', body: `${MSG_ACQUA[Math.floor(Math.random() * MSG_ACQUA.length)]} · obiettivo ${(obiettivo / 1000).toLocaleString('it-IT')} L` };
  const manca = Math.max(0, obiettivo - bevuti);
  const borracce = (manca / borr).toLocaleString('it-IT', { maximumFractionDigits: 1 });
  return { title: '💧 Ora di bere', body: `Sei a ${bevuti}/${obiettivo} ml · mancano ${manca} ml (~${borracce} borracce)` };
}

// ─── Permessi / setup ───
export async function requestNotifPermission() {
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  } catch {
    return false;
  }
}

let setupDone = false;
async function setupNative(settings) {
  if (!isNative) return;
  const borr = +cfg(settings, 'acqua_borraccia') || 750;
  try {
    if (!setupDone) {
      await LocalNotifications.createChannel({ id: 'promemoria', name: 'Promemoria', description: 'Promemoria giornaliero', importance: 3 });
      await LocalNotifications.createChannel({ id: 'acqua', name: 'Acqua', description: 'Promemoria per bere', importance: 4, vibration: true });
      await LocalNotifications.createChannel({ id: 'pasti', name: 'Preparazione pasti', description: 'Preparazione pasti del giorno dopo', importance: 4, vibration: true });
      setupDone = true;
    }
    // Riregistrato a ogni sync: il titolo segue la dimensione della borraccia
    await LocalNotifications.registerActionTypes({
      types: [{ id: 'ACQUA', actions: [
        { id: 'acqua_borraccia', title: `+${borr} ml` },
        { id: 'acqua_250', title: '+250 ml' },
      ] }],
    });
  } catch (e) { console.warn('setupNative', e); }
}

// ─── Costruzione notifiche ───
function buildWater(settings, ctx) {
  if (!cfg(settings, 'acqua_notif')) return [];
  const [h1, m1] = hm(cfg(settings, 'acqua_dalle'));
  const [h2, m2] = hm(cfg(settings, 'acqua_alle'));
  const ogni = Math.max(30, +cfg(settings, 'acqua_ogni') || 120);
  const now = Date.now();
  const out = [];
  for (let d = 0; d < GIORNI_AVANTI; d++) {
    const iso = fmtIso(atDay(d, 12, 0));
    const { ml: obiettivo } = obiettivoAcqua(settings, iso, ctx);
    const bevuti = d === 0 ? (ctx.acquaOggi || 0) : null;
    if (d === 0 && bevuti >= obiettivo) continue; // obiettivo raggiunto: niente più promemoria oggi
    const start = atDay(d, h1, m1).getTime();
    const end = atDay(d, h2, m2).getTime();
    for (let t = start, slot = 0; t <= end && slot < 100; t += ogni * 60000, slot++) {
      if (t <= now + 30000) continue;
      out.push({
        id: WATER_BASE + d * 100 + slot,
        ...testoAcqua(settings, bevuti, obiettivo),
        schedule: { at: new Date(t), allowWhileIdle: true },
        channelId: 'acqua',
        actionTypeId: 'ACQUA',
        extra: { tipo: 'acqua' },
      });
    }
  }
  return out;
}

function buildMeal(settings, ctx) {
  if (!cfg(settings, 'pasti_notif')) return [];
  const [h, m] = hm(cfg(settings, 'pasti_orario'));
  const pasto = cfg(settings, 'pasti_pasto');
  const now = Date.now();
  const out = [];
  for (let d = 0; d < GIORNI_AVANTI; d++) {
    const at = atDay(d, h, m);
    if (at.getTime() <= now + 30000) continue;
    const domani = fmtIso(atDay(d + 1, 12, 0));
    out.push({
      id: MEAL_BASE + d,
      ...testoPasto(ctx.piani || [], domani, pasto),
      schedule: { at, allowWhileIdle: true },
      channelId: 'pasti',
      extra: { tipo: 'pasti', data: domani },
    });
  }
  return out;
}

function buildDaily(settings) {
  if (!settings?.notifiche_attive) return [];
  const [h, m] = hm(settings.notifiche_orario || '08:00');
  const base = { id: DAILY_ID, title: 'Iron Log 💪', body: 'Ricordati di loggare l\'allenamento e la dieta di oggi', channelId: 'promemoria', extra: { tipo: 'promemoria' } };
  if (isNative) return [{ ...base, schedule: { on: { hour: h, minute: m }, allowWhileIdle: true } }];
  const at = atDay(0, h, m);
  return at.getTime() > Date.now() ? [{ ...base, schedule: { at } }] : [];
}

// ─── Sync: cancella e rischedula tutto ciò che gestiamo ───
// ctx = { piani, sessioni, logDieta, acquaOggi }
let syncChain = Promise.resolve();
export function syncNotifiche(settings, ctx = {}) {
  syncChain = syncChain.then(() => doSync(settings, ctx)).catch(e => console.warn('syncNotifiche', e));
  return syncChain;
}

async function doSync(settings, ctx) {
  const lista = [...buildDaily(settings), ...buildWater(settings, ctx), ...buildMeal(settings, ctx)];
  const { notifications: pend } = await LocalNotifications.getPending().catch(() => ({ notifications: [] }));
  const daCancellare = pend.filter(n => managed(+n.id)).map(n => ({ id: +n.id }));
  if (daCancellare.length) await LocalNotifications.cancel({ notifications: daCancellare });
  if (!lista.length) return { scheduled: 0 };
  const { display } = await LocalNotifications.checkPermissions();
  if (display !== 'granted' && !(await requestNotifPermission())) return { scheduled: 0, denied: true };
  await setupNative(settings);
  const withIcon = lista.map(n => (isNative ? { smallIcon: SMALL_ICON, iconColor: '#1E90FF', ...n } : n));
  await LocalNotifications.schedule({ notifications: withIcon });
  return { scheduled: lista.length };
}

// ─── Test e diagnostica ───
export async function testNotifica(tipo = 'generica', settings = {}, ctx = {}, delaySec = 5) {
  try {
    if (!(await requestNotifPermission())) return { ok: false, error: 'Permesso notifiche negato' };
    await setupNative(settings);
    const at = new Date(Date.now() + delaySec * 1000);
    let n;
    if (tipo === 'acqua') {
      const iso = fmtIso();
      n = { ...testoAcqua(settings, ctx.acquaOggi || 0, obiettivoAcqua(settings, iso, ctx).ml), channelId: 'acqua', actionTypeId: 'ACQUA', extra: { tipo: 'acqua' } };
    } else if (tipo === 'pasti') {
      const domani = fmtIso(atDay(1, 12, 0));
      n = { ...testoPasto(ctx.piani || [], domani, cfg(settings, 'pasti_pasto')), channelId: 'pasti', extra: { tipo: 'pasti', data: domani } };
    } else {
      n = { title: 'Iron Log 💪', body: 'Test notifica funzionante!', channelId: 'promemoria', extra: { tipo: 'promemoria' } };
    }
    const id = TEST_BASE + ({ generica: 0, acqua: 1, pasti: 2 }[tipo] ?? 9);
    await LocalNotifications.cancel({ notifications: [{ id }] }).catch(() => {});
    await LocalNotifications.schedule({ notifications: [{ id, ...n, ...(isNative ? { smallIcon: SMALL_ICON, iconColor: '#1E90FF' } : {}), schedule: { at, allowWhileIdle: true } }] });
    return { ok: true };
  } catch (e) {
    console.warn('testNotifica', e);
    return { ok: false, error: e.message || String(e) };
  }
}

export async function diagnostica() {
  const r = { platform, permesso: '?', esatti: null, pending: [] };
  try { r.permesso = (await LocalNotifications.checkPermissions()).display; } catch {}
  if (platform === 'android') {
    try { r.esatti = (await LocalNotifications.checkExactNotificationSetting()).exact_alarm; } catch {}
  }
  try {
    const { notifications } = await LocalNotifications.getPending();
    r.pending = notifications
      .map(n => ({ id: +n.id, title: n.title, body: n.body, at: n.schedule?.at ? new Date(n.schedule.at) : null, on: n.schedule?.on }))
      .sort((a, b) => (a.at?.getTime() ?? 0) - (b.at?.getTime() ?? 0));
  } catch {}
  return r;
}

export async function apriImpostazioniAllarmiEsatti() {
  try { return (await LocalNotifications.changeExactNotificationSetting()).exact_alarm; } catch { return null; }
}

export async function cancellaTutte() {
  const { notifications } = await LocalNotifications.getPending().catch(() => ({ notifications: [] }));
  if (notifications.length) await LocalNotifications.cancel({ notifications: notifications.map(n => ({ id: +n.id })) });
}

// Listener tap/azioni: ritorna funzione di cleanup
export function onNotificaAzione(cb) {
  let handle;
  LocalNotifications.addListener('localNotificationActionPerformed', e => cb(e.actionId, e.notification?.extra || {}))
    .then(h => { handle = h; }).catch(() => {});
  return () => handle?.remove();
}
