export default function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="mov" onClick={onCancel}>
      <div className="mod" onClick={e => e.stopPropagation()} style={{ maxHeight: "40vh" }}>
        <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 20, letterSpacing: ".05em", marginBottom: 14 }}>
          CONFERMA
        </div>
        <p style={{ fontSize: 14, color: "var(--dim)", marginBottom: 24 }}>{message}</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-s" style={{ flex: 1 }} onClick={onCancel}>ANNULLA</button>
          <button className="btn btn-p" style={{ flex: 1, background: "var(--dan)" }} onClick={onConfirm}>CONFERMA</button>
        </div>
      </div>
    </div>
  );
}
