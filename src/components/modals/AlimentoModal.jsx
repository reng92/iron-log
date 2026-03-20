import { useState } from "react";
import { IcClose, IcCheck } from "../Icons";

export default function AlimentoModal({ init, mode, onSave, onClose }) {
  const [d, setD] = useState({ ...init });
  const upd = (k, v) => setD(p => ({ ...p, [k]: v }));

  return (
    <div className="mov" onClick={onClose}>
      <div className="mod" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <span style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, letterSpacing: ".05em", color: "#30D158" }}>
            {mode === "new" ? "NUOVO ALIMENTO" : "MODIFICA"}
          </span>
          <button className="bico" onClick={onClose}><IcClose /></button>
        </div>
        <div className="ig">
          <label className="lbl">Nome alimento *</label>
          <input className="inp" placeholder="es. Pollo, Riso Basmati, Uova..." value={d.nome} onChange={e => upd("nome", e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div><label className="lbl">Grammi / Qtà</label><input className="inp" type="number" min="0" placeholder="100" value={d.grammi} onChange={e => upd("grammi", e.target.value)} /></div>
          <div><label className="lbl">Kcal Totali</label><input className="inp" type="number" min="0" placeholder="350" value={d.kcal} onChange={e => upd("kcal", e.target.value)} /></div>
        </div>
        <p style={{ fontSize: 11, color: "var(--mut)", marginBottom: 18, fontStyle: "italic" }}>
          Inserisci le Kcal totali relative alla porzione indicata.
        </p>
        <button className="btn btn-p btn-full" style={{ background: "#30D158" }} onClick={() => onSave(d)}>
          <IcCheck /> {mode === "new" ? "AGGIUNGI" : "SALVA"}
        </button>
      </div>
    </div>
  );
}
