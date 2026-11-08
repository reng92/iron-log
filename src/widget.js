import { Capacitor, registerPlugin } from '@capacitor/core';

// Plugin nativo definito in android/app/src/main/java/com/ironlog/app/WidgetBridgePlugin.java
const WidgetBridge = registerPlugin('WidgetBridge');
const attivo = Capacitor.getPlatform() === 'android';

export async function aggiornaWidget(dati) {
  if (!attivo) return;
  try { await WidgetBridge.update(dati); } catch (e) { console.warn('aggiornaWidget', e); }
}

// Aggiunte d'acqua fatte dal widget mentre l'app era chiusa: [{ date, ml, ora }]
export async function consumaAggiunteWidget() {
  if (!attivo) return [];
  try { return (await WidgetBridge.consumePending()).adds || []; } catch { return []; }
}

export function onAppResume(cb) {
  if (!attivo) return () => {};
  let h;
  WidgetBridge.addListener('resume', cb).then(x => { h = x; }).catch(() => {});
  return () => h?.remove();
}
