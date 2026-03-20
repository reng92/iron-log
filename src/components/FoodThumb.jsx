import { useState, useEffect } from "react";
import { fetchMealImg } from "../utils";

const imgCache = new Map();

export default function FoodThumb({ nome, groqKey }) {
  const [src, setSrc] = useState(null);
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    if (imgCache.has(nome)) {
      setSrc(imgCache.get(nome));
      setLoading(false);
      return;
    }
    fetchMealImg(nome, groqKey).then(u => {
      if (active) {
        imgCache.set(nome, u);
        setSrc(u);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [nome]);

  return (
    <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", background: "var(--sur)", flexShrink: 0, border: "1px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {loading ? (
        <span style={{ fontSize: 10, opacity: 0.5 }}>...</span>
      ) : (src && !err) ? (
        <img src={src} alt={nome} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setErr(true)} />
      ) : <div style={{ fontSize: 16 }}>🍎</div>}
    </div>
  );
}
