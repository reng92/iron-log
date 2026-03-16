import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { genId } from "../utils";

// ─── UTILS ───────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtPace(mPerSec) {
  if (!mPerSec || mPerSec < 0.2) return "--:--";
  const secPerKm = 1000 / mPerSec;
  const m = Math.floor(secPerKm / 60);
  const s = Math.floor(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Canvas roundRect polyfill (Android WebView < 99)
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── LEAFLET LOADER (CDN, no npm) ───────────────────────
let lfPromise = null;
function loadLeaflet() {
  if (lfPromise) return lfPromise;
  lfPromise = new Promise(resolve => {
    if (window.L) { resolve(window.L); return; }
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
    const js = document.createElement("script");
    js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    js.onload = () => resolve(window.L);
    document.head.appendChild(js);
  });
  return lfPromise;
}

// ─── MAIN COMPONENT ──────────────────────────────────────
export default function CorsaTracker({ onBack, onSave, dark }) {
  const [stato, setStato] = useState("idle"); // idle | running | paused | finished
  const [tipo, setTipo] = useState("corsa");
  const [punti, setPunti] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const [distanza, setDistanza] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [gpsErr, setGpsErr] = useState(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [nota, setNota] = useState("");
  const [saving, setSaving] = useState(false);
  const [accuracy, setAccuracy] = useState(null);

  const mapDivRef = useRef(null);
  const mapInst = useRef(null);
  const polyRef = useRef(null);
  const markerRef = useRef(null);
  const watchId = useRef(null);
  const timerId = useRef(null);
  const puntiRef = useRef([]);
  const distRef = useRef(0);
  const gpsCallback = useRef(null);

  // ─── Computed stats ──────────────────────────────────
  const distKm = distanza / 1000;
  const paceAvg = elapsed > 10 && distanza > 10 ? distanza / elapsed : 0;
  const speedKmh = elapsed > 10 && distanza > 10 ? distKm / (elapsed / 3600) : 0;

  const elevGain = useMemo(() => {
    let gain = 0;
    for (let i = 1; i < punti.length; i++) {
      const d = (punti[i].alt || 0) - (punti[i - 1].alt || 0);
      if (d > 0.5) gain += d;
    }
    return Math.round(gain);
  }, [punti]);

  const calories = Math.round((tipo === "corsa" ? 0.85 : 0.5) * 70 * distKm);

  // ─── Load Leaflet ────────────────────────────────────
  useEffect(() => {
    loadLeaflet().then(() => setLeafletReady(true));
    return () => {
      clearInterval(timerId.current);
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  // ─── Init map ────────────────────────────────────────
  useEffect(() => {
    if (!leafletReady || !mapDivRef.current || mapInst.current) return;
    const L = window.L;

    const map = L.map(mapDivRef.current, {
      center: [41.9, 12.5], zoom: 15,
      zoomControl: false,
      attributionControl: false
    });

    // Dark tiles via CartoDB (free, no key)
    const tileUrl = dark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);

    polyRef.current = L.polyline([], {
      color: "#1E90FF", weight: 5, opacity: 0.95,
      lineCap: "round", lineJoin: "round"
    }).addTo(map);

    mapInst.current = map;

    // Center on user
    navigator.geolocation.getCurrentPosition(
      pos => map.setView([pos.coords.latitude, pos.coords.longitude], 16),
      () => {},
      { timeout: 6000, enableHighAccuracy: true }
    );
  }, [leafletReady, dark]);

  // ─── Invalidate map on stato change (container resize) ─
  useEffect(() => {
    if (mapInst.current) {
      setTimeout(() => mapInst.current.invalidateSize(), 150);
    }
  }, [stato]);

  // ─── GPS callback ref (always fresh) ─────────────────
  useEffect(() => {
    gpsCallback.current = (pos) => {
      const { latitude: lat, longitude: lon, altitude: alt, speed: spd, accuracy: acc } = pos.coords;
      setAccuracy(Math.round(acc));
      if (acc > 60) return; // skip inaccurate readings

      if (spd !== null && spd >= 0) setCurrentSpeed(spd);

      const newPoint = { lat, lon, alt: alt || 0, t: Date.now() };

      setPunti(prev => {
        const pts = [...prev, newPoint];
        puntiRef.current = pts;

        if (prev.length > 0) {
          const last = prev[prev.length - 1];
          const d = haversine(last.lat, last.lon, lat, lon);
          // anti-noise: min 2m, max 200m per step
          if (d >= 2 && d < 200) {
            distRef.current += d;
            setDistanza(distRef.current);
          }
        }

        // Update Leaflet
        const L = window.L;
        if (polyRef.current) polyRef.current.addLatLng([lat, lon]);
        if (mapInst.current) {
          mapInst.current.setView([lat, lon]);
          if (!markerRef.current) {
            const icon = L.divIcon({
              className: "",
              html: `<div style="width:20px;height:20px;border-radius:50%;background:#1E90FF;border:3px solid #fff;box-shadow:0 0 12px rgba(30,144,255,0.7);"></div>`,
              iconSize: [20, 20], iconAnchor: [10, 10]
            });
            markerRef.current = L.marker([lat, lon], { icon }).addTo(mapInst.current);
          } else {
            markerRef.current.setLatLng([lat, lon]);
          }
        }
        return pts;
      });
    };
  });

  // ─── Controls ────────────────────────────────────────
  const startGPS = () => {
    watchId.current = navigator.geolocation.watchPosition(
      pos => gpsCallback.current?.(pos),
      err => setGpsErr(err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const startTracking = () => {
    if (!navigator.geolocation) { setGpsErr("GPS non disponibile su questo dispositivo"); return; }
    setGpsErr(null);
    setStato("running");
    timerId.current = setInterval(() => setElapsed(p => p + 1), 1000);
    startGPS();
  };

  const pauseTracking = () => {
    clearInterval(timerId.current);
    navigator.geolocation.clearWatch(watchId.current);
    setStato("paused");
  };

  const resumeTracking = () => {
    setStato("running");
    timerId.current = setInterval(() => setElapsed(p => p + 1), 1000);
    startGPS();
  };

  const finishTracking = () => {
    clearInterval(timerId.current);
    navigator.geolocation.clearWatch(watchId.current);
    setStato("finished");

    const L = window.L;
    const pts = puntiRef.current;

    // Fit map to full route
    if (mapInst.current && pts.length > 1) {
      const bounds = L.latLngBounds(pts.map(p => [p.lat, p.lon]));
      setTimeout(() => mapInst.current.fitBounds(bounds, { padding: [40, 40], animate: true }), 200);
    }

    // Replace live marker with start/end dots
    if (markerRef.current && mapInst.current) {
      mapInst.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    if (pts.length > 0 && mapInst.current) {
      const mkIcon = (color, letter) => L.divIcon({
        className: "",
        html: `<div style="width:22px;height:22px;border-radius:50%;background:${color};border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:#fff;box-shadow:0 2px 6px rgba(0,0,0,0.4);">${letter}</div>`,
        iconSize: [22, 22], iconAnchor: [11, 11]
      });
      L.marker([pts[0].lat, pts[0].lon], { icon: mkIcon("#30D158", "S") }).addTo(mapInst.current);
      L.marker([pts[pts.length - 1].lat, pts[pts.length - 1].lon], { icon: mkIcon("#FF3B30", "F") }).addTo(mapInst.current);
    }
  };

  // ─── Export Canvas Image ──────────────────────────────
  const exportImage = useCallback(() => {
    const pts = puntiRef.current;
    if (pts.length < 2) { alert("Percorso troppo breve per l'export"); return; }

    const W = 1080, H = 1920;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");

    // ── Background ──
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#07090f");
    bg.addColorStop(1, "#0d1117");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // Grain
    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.012})`;
      ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
    }

    // ── Header ──
    ctx.fillStyle = "#1E90FF";
    ctx.font = "bold 42px -apple-system, Arial, sans-serif";
    ctx.fillText("⚡ IRON LOG", 70, 108);

    const dateStr = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "28px -apple-system, Arial, sans-serif";
    ctx.fillText(dateStr, 70, 152);

    const tipoLabel = tipo === "corsa" ? "🏃 CORSA" : "🚶 CAMMINATA";
    ctx.fillStyle = "rgba(30,144,255,0.9)";
    ctx.font = "bold 26px -apple-system, Arial, sans-serif";
    ctx.fillText(tipoLabel, 70, 196);

    // Accent bar
    const barGrad = ctx.createLinearGradient(70, 0, 500, 0);
    barGrad.addColorStop(0, "#1E90FF");
    barGrad.addColorStop(1, "transparent");
    ctx.fillStyle = barGrad;
    ctx.fillRect(70, 214, 400, 3);

    // ── Map area ──
    const MAP_X = 40, MAP_Y = 240, MAP_W = W - 80, MAP_H = 820;

    ctx.fillStyle = "#0a0d16";
    rrect(ctx, MAP_X, MAP_Y, MAP_W, MAP_H, 28);
    ctx.fill();

    // Grid inside map
    ctx.save();
    rrect(ctx, MAP_X, MAP_Y, MAP_W, MAP_H, 28);
    ctx.clip();

    ctx.strokeStyle = "rgba(30,144,255,0.07)";
    ctx.lineWidth = 1;
    for (let x = MAP_X; x < MAP_X + MAP_W; x += 70) {
      ctx.beginPath(); ctx.moveTo(x, MAP_Y); ctx.lineTo(x, MAP_Y + MAP_H); ctx.stroke();
    }
    for (let y = MAP_Y; y < MAP_Y + MAP_H; y += 70) {
      ctx.beginPath(); ctx.moveTo(MAP_X, y); ctx.lineTo(MAP_X + MAP_W, y); ctx.stroke();
    }

    // ── Route ──
    const lats = pts.map(p => p.lat), lons = pts.map(p => p.lon);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    const latRng = maxLat - minLat || 0.001;
    const lonRng = maxLon - minLon || 0.001;
    const PAD = 90;
    const mW = MAP_W - PAD * 2, mH = MAP_H - PAD * 2;

    // Maintain aspect ratio
    const aspect = lonRng / latRng;
    let drawW = mW, drawH = mH;
    if (aspect > mW / mH) { drawH = mW / aspect; } else { drawW = mH * aspect; }
    const offX = MAP_X + (MAP_W - drawW) / 2;
    const offY = MAP_Y + (MAP_H - drawH) / 2;

    const toX = lon => offX + ((lon - minLon) / lonRng) * drawW;
    const toY = lat => offY + (1 - (lat - minLat) / latRng) * drawH;

    // Glow halo
    ctx.shadowColor = "#1E90FF"; ctx.shadowBlur = 40;
    ctx.strokeStyle = "rgba(30,144,255,0.25)";
    ctx.lineWidth = 22; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(toX(p.lon), toY(p.lat)) : ctx.lineTo(toX(p.lon), toY(p.lat)));
    ctx.stroke();

    // Main route gradient
    const rg = ctx.createLinearGradient(toX(pts[0].lon), toY(pts[0].lat), toX(pts[pts.length - 1].lon), toY(pts[pts.length - 1].lat));
    rg.addColorStop(0, "#30D158");
    rg.addColorStop(0.5, "#1E90FF");
    rg.addColorStop(1, "#FF9F0A");
    ctx.strokeStyle = rg; ctx.lineWidth = 9; ctx.shadowBlur = 0;
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(toX(p.lon), toY(p.lat)) : ctx.lineTo(toX(p.lon), toY(p.lat)));
    ctx.stroke();

    // Start dot
    const sx = toX(pts[0].lon), sy = toY(pts[0].lat);
    ctx.fillStyle = "#30D158"; ctx.shadowColor = "#30D158"; ctx.shadowBlur = 24;
    ctx.beginPath(); ctx.arc(sx, sy, 18, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff"; ctx.font = "bold 16px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("S", sx, sy);

    // End dot
    const ex = toX(pts[pts.length - 1].lon), ey = toY(pts[pts.length - 1].lat);
    ctx.fillStyle = "#FF3B30"; ctx.shadowColor = "#FF3B30"; ctx.shadowBlur = 24;
    ctx.beginPath(); ctx.arc(ex, ey, 18, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff";
    ctx.fillText("F", ex, ey);

    ctx.restore();
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";

    // ── Stats grid (2x3) ──
    const STATS_Y = MAP_Y + MAP_H + 44;
    const statsData = [
      { icon: "📍", label: "DISTANZA", value: distKm >= 1 ? distKm.toFixed(2) : Math.round(distanza).toString(), unit: distKm >= 1 ? "km" : "m" },
      { icon: "⏱", label: "TEMPO", value: fmtTime(elapsed), unit: "" },
      { icon: "🏃", label: "PASSO MEDIO", value: fmtPace(paceAvg), unit: "/km" },
      { icon: "💨", label: "VELOCITÀ MEDIA", value: speedKmh.toFixed(1), unit: "km/h" },
      { icon: "🔥", label: "CALORIE", value: String(calories), unit: "kcal" },
      { icon: "⛰", label: "DISLIVELLO", value: String(elevGain), unit: "m" },
    ];

    const COLS = 2;
    const cellW = (W - 80) / COLS;
    const cellH = 182;

    statsData.forEach((s, i) => {
      const col = i % COLS, row = Math.floor(i / COLS);
      const cx = 40 + col * cellW, cy = STATS_Y + row * cellH;

      // Card
      ctx.fillStyle = col === 0 ? "rgba(30,144,255,0.1)" : "rgba(255,255,255,0.05)";
      rrect(ctx, cx + 8, cy, cellW - 16, cellH - 12, 18);
      ctx.fill();

      // Accent left border
      ctx.fillStyle = col === 0 ? "#1E90FF" : "#30D158";
      ctx.fillRect(cx + 8, cy + 20, 4, cellH - 52);

      // Icon
      ctx.font = "32px Arial"; ctx.fillStyle = "#fff";
      ctx.fillText(s.icon, cx + 28, cy + 54);

      // Label
      ctx.fillStyle = "rgba(255,255,255,0.38)";
      ctx.font = "bold 18px -apple-system, Arial, sans-serif";
      ctx.fillText(s.label, cx + 28, cy + 84);

      // Value
      ctx.fillStyle = "#F0F0F0";
      ctx.font = "bold 62px -apple-system, Arial, sans-serif";
      ctx.fillText(s.value, cx + 28, cy + 158);

      // Unit
      if (s.unit) {
        const vw = ctx.measureText(s.value).width;
        ctx.fillStyle = "#1E90FF";
        ctx.font = "bold 22px -apple-system, Arial, sans-serif";
        ctx.fillText(s.unit, cx + 28 + vw + 6, cy + 158);
      }
    });

    // ── Footer ──
    const footerY = STATS_Y + 3 * cellH + 24;
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.font = "22px -apple-system, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("iron-log-eight.vercel.app", W / 2, footerY);
    ctx.fillStyle = "rgba(30,144,255,0.5)";
    ctx.font = "bold 18px -apple-system, Arial, sans-serif";
    ctx.fillText("Tracked with Iron Log ⚡", W / 2, footerY + 30);

    // ── Download ──
    const link = document.createElement("a");
    link.download = `iron-log-${tipo}-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL("image/png", 0.95);
    link.click();
  }, [punti, elapsed, distKm, distanza, paceAvg, speedKmh, calories, elevGain, tipo]);

  // ─── Save to Supabase ────────────────────────────────
  const salva = async () => {
    setSaving(true);
    try {
      await onSave({
        id: genId(),
        tipo, distanza: distKm, durata: elapsed,
        punti: puntiRef.current,
        calorie: calories, dislivello: elevGain,
        nota, data: new Date().toISOString()
      });
      onBack();
    } catch (e) {
      alert("Errore salvataggio: " + e.message);
      setSaving(false);
    }
  };

  // ─── RENDER ──────────────────────────────────────────
  const isActive = stato === "running" || stato === "paused";

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", display: "flex", flexDirection: "column", zIndex: 200, overflow: "hidden", fontFamily: "'Barlow', sans-serif" }}>

      {/* ── HEADER ── */}
      <div style={{ flexShrink: 0, padding: "12px 16px 10px", background: "var(--sur)", borderBottom: "1px solid var(--bdr)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={() => { if (isActive && !window.confirm("Interrompere l'attività in corso?")) return; onBack(); }}
          style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", fontSize: 13, fontFamily: "'Barlow',sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", padding: 0 }}>
          ‹ INDIETRO
        </button>
        <span style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, letterSpacing: ".1em", color: stato === "running" ? "var(--acc)" : stato === "paused" ? "#FF9F0A" : stato === "finished" ? "var(--ok)" : "var(--txt)" }}>
          {stato === "idle" && "NUOVA ATTIVITÀ"}
          {stato === "running" && "● LIVE"}
          {stato === "paused" && "⏸ PAUSA"}
          {stato === "finished" && "✓ COMPLETATA"}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: !accuracy ? "transparent" : accuracy < 20 ? "var(--ok)" : accuracy < 50 ? "#FF9500" : "var(--dan)", minWidth: 48, textAlign: "right" }}>
          {accuracy ? `GPS ${accuracy}m` : ""}
        </span>
      </div>

      {/* ── TIPO SELECTOR (idle) ── */}
      {stato === "idle" && (
        <div style={{ flexShrink: 0, padding: "12px 16px 8px" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {[["corsa", "🏃", "CORSA"], ["camminata", "🚶", "CAMMINATA"]].map(([t, ic, label]) => (
              <button key={t} onClick={() => setTipo(t)} style={{
                flex: 1, padding: "12px 8px", borderRadius: 12,
                border: `2px solid ${tipo === t ? "var(--acc)" : "var(--bdr)"}`,
                background: tipo === t ? "var(--acc2)" : "var(--card)",
                color: tipo === t ? "var(--acc)" : "var(--dim)",
                fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: 14,
                cursor: "pointer", letterSpacing: ".05em", transition: "all .15s"
              }}>
                {ic} {label}
              </button>
            ))}
          </div>
          {gpsErr && (
            <div style={{ marginTop: 8, padding: "8px 12px", background: "var(--dan2)", color: "var(--dan)", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
              ⚠ {gpsErr}
            </div>
          )}
        </div>
      )}

      {/* ── LIVE STATS BAR (running/paused) ── */}
      {isActive && (
        <div style={{ flexShrink: 0, padding: "10px 16px", background: "var(--sur)", borderBottom: "1px solid var(--bdr)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {[
              { l: "DISTANZA", v: distKm >= 1 ? `${distKm.toFixed(2)}km` : `${Math.round(distanza)}m` },
              { l: "TEMPO", v: fmtTime(elapsed) },
              { l: "PASSO", v: fmtPace(paceAvg) },
            ].map(({ l, v }) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "var(--mut)", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" }}>{l}</div>
                <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 30, color: "var(--acc)", letterSpacing: ".05em", lineHeight: 1.1 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MAP (always in DOM, height changes) ── */}
      <div
        ref={mapDivRef}
        style={{
          flexShrink: stato === "finished" ? 0 : undefined,
          flex: stato !== "finished" ? 1 : undefined,
          height: stato === "finished" ? 300 : undefined,
          minHeight: stato === "finished" ? 300 : 180,
          position: "relative",
          zIndex: 1
        }}
      />

      {/* ── FINISHED: Stats + Actions ── */}
      {stato === "finished" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 24px", background: "var(--bg)" }}>
          {/* 6 stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
            {[
              ["DISTANZA", distKm >= 1 ? `${distKm.toFixed(2)}km` : `${Math.round(distanza)}m`],
              ["TEMPO", fmtTime(elapsed)],
              ["PASSO", fmtPace(paceAvg)],
              ["VELOCITÀ", `${speedKmh.toFixed(1)}km/h`],
              ["CALORIE", `${calories}kcal`],
              ["DISLIVELLO", `${elevGain}m`],
            ].map(([label, value]) => (
              <div key={label} style={{ background: "var(--card)", border: "1px solid var(--bdr)", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "var(--mut)", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
                <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 20, color: "var(--acc)", letterSpacing: ".05em", lineHeight: 1 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", color: "var(--dim)", marginBottom: 5 }}>Note</label>
            <textarea
              className="inp" rows={2}
              placeholder="Come ti sei sentito? Condizioni meteo…"
              value={nota} onChange={e => setNota(e.target.value)}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button onClick={exportImage} style={{
              padding: "14px", borderRadius: 12, border: "2px solid var(--bdr)",
              background: "var(--card)", color: "var(--txt)",
              fontFamily: "'Bebas Neue',cursive", fontSize: 17, letterSpacing: ".08em",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8
            }}>
              📸 EXPORT IMG
            </button>
            <button onClick={salva} disabled={saving} style={{
              padding: "14px", borderRadius: 12, border: "none",
              background: "var(--acc)", color: "#fff",
              fontFamily: "'Bebas Neue',cursive", fontSize: 17, letterSpacing: ".08em",
              cursor: "pointer", opacity: saving ? 0.7 : 1
            }}>
              {saving ? "..." : "💾 SALVA"}
            </button>
          </div>
        </div>
      )}

      {/* ── CONTROLS (idle / running / paused) ── */}
      {stato !== "finished" && (
        <div style={{ flexShrink: 0, padding: "12px 16px 24px", background: "var(--sur)", borderTop: "1px solid var(--bdr)" }}>
          {stato === "idle" && (
            <button onClick={startTracking} style={{
              width: "100%", padding: "18px", borderRadius: 14, border: "none",
              background: "var(--acc)", color: "#fff",
              fontFamily: "'Bebas Neue',cursive", fontSize: 24, letterSpacing: ".1em",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10
            }}>
              ▶ INIZIA {tipo === "corsa" ? "CORSA" : "CAMMINATA"}
            </button>
          )}
          {stato === "running" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={pauseTracking} style={{
                padding: "16px", borderRadius: 12, border: "2px solid var(--bdr)",
                background: "var(--card)", color: "var(--txt)",
                fontFamily: "'Bebas Neue',cursive", fontSize: 20, letterSpacing: ".08em", cursor: "pointer"
              }}>⏸ PAUSA</button>
              <button onClick={finishTracking} style={{
                padding: "16px", borderRadius: 12, border: "none",
                background: "var(--dan)", color: "#fff",
                fontFamily: "'Bebas Neue',cursive", fontSize: 20, letterSpacing: ".08em", cursor: "pointer"
              }}>■ TERMINA</button>
            </div>
          )}
          {stato === "paused" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={resumeTracking} style={{
                padding: "16px", borderRadius: 12, border: "none",
                background: "var(--acc)", color: "#fff",
                fontFamily: "'Bebas Neue',cursive", fontSize: 20, letterSpacing: ".08em", cursor: "pointer"
              }}>▶ RIPRENDI</button>
              <button onClick={finishTracking} style={{
                padding: "16px", borderRadius: 12, border: "none",
                background: "var(--dan)", color: "#fff",
                fontFamily: "'Bebas Neue',cursive", fontSize: 20, letterSpacing: ".08em", cursor: "pointer"
              }}>■ TERMINA</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}