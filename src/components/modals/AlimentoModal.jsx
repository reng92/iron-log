import { useState } from "react";
import { IcClose, IcCheck } from "../Icons";

export default function AlimentoModal({ init, mode, onSave, onClose }) {
  const [d, setD] = useState({ ...init });
  const upd = (k, v) => setD(p => ({ ...p, [k]: v }));

  return (
    <div className="mov" onClick={onClose}>
      <div className="mod" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <span className="lab-t" style={{ fontSize: 24 }}>
            {mode === "new" ? "Nuovo alimento" : "Modifica alimento"}
          </span>
          <button className="bico" onClick={onClose}><IcClose /></button>
        </div>
        <div className="ig">
          <label className="lbl">Nome alimento *</label>
          <input className="inp" placeholder="es. Pollo, Riso Basmati, Uova..." value={d.nome} onChange={e => upd("nome", e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div><label className="lbl">Grammi</label><input className="inp" type="number" inputMode="numeric" min="0" placeholder="100" value={d.grammi} onChange={e => upd("grammi", e.target.value)} /></div>
          <div><label className="lbl">Kcal</label><input className="inp" type="number" inputMode="numeric" min="0" placeholder="350" value={d.kcal} onChange={e => upd("kcal", e.target.value)} /></div>
          <div><label className="lbl">Proteine g</label><input className="inp" type="number" inputMode="decimal" min="0" step="0.1" placeholder="25" value={d.proteine ?? ""} onChange={e => upd("proteine", e.target.value)} /></div>
        </div>
        <p style={{ fontSize: 11, color: "var(--mut)", marginBottom: 18, fontStyle: "italic" }}>
          Kcal e proteine si riferiscono alla porzione indicata, non a 100 g.
        </p>
        <button className="btn btn-p btn-full" onClick={() => onSave(d)}>
          <IcCheck /> {mode === "new" ? "Aggiungi" : "Salva"}
        </button>
      </div>
    </div>
  );
}
