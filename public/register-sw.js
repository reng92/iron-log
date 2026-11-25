// Registrazione del service worker (file separato: la CSP non permette script inline).
// Nell'app Android (Capacitor) i file sono già locali, quindi non serve.
if ("serviceWorker" in navigator && !(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function (err) { console.error("Service worker non registrato", err); });
  });
}
