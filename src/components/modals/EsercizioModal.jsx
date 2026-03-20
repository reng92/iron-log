import { useState } from "react";
import { IcClose, IcCheck } from "../Icons";

export default function EsercizioModal({ init, mode, onSave, onClose }) {
  const [d, setD] = useState({ ...init });
  const upd = (k, v) => setD(p => ({ ...p, [k]: v }));

  return (
    <div className="mov" onClick={onClose}>
      <div className="mod" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <span style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, letterSpacing: ".05em", color: "#30D158" }}>
            {mode === "new" ? "NUOVO ESERCIZIO" : "MODIFICA"}
          </span>
          <button className="bico" onClick={onClose}><IcClose /></button>
        </div>
        <div className="ig">
          <label className="lbl">Nome *</label>
          <input className="inp" placeholder="es. Panca Piana, Squat…" value={d.nome} onChange={e => upd("nome", e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 9, marginBottom: 14 }}>
          <div><label className="lbl">Serie</label><input className="inp" type="number" min="1" value={d.serie} onChange={e => upd("serie", +e.target.value)} /></div>
          <div><label className="lbl">Reps</label><input className="inp" placeholder="10" value={d.ripetizioni} onChange={e => upd("ripetizioni", e.target.value)} /></div>
          <div><label className="lbl">Pausa (s)</label><input className="inp" type="number" min="0" value={d.pausa} onChange={e => upd("pausa", +e.target.value)} /></div>
        </div>
        <div className="ig">
          <label className="lbl">Note / tecnica</label>
          <textarea className="inp" rows={2} value={d.note} onChange={e => upd("note", e.target.value)} placeholder="Indicazioni tecniche…" />
        </div>
        <button className="btn btn-p btn-full" onClick={() => onSave(d)}>
          <IcCheck /> {mode === "new" ? "AGGIUNGI" : "SALVA"}
        </button>
      </div>
    </div>
  );
}
