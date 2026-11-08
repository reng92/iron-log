export default function StatusBadge({ label }) {
  if (!label) return null;
  const l = label.toLowerCase();
  const [bg, col] = l.includes("molto alto") ? ["rgba(255,59,48,.15)", "var(--dan)"] :
    l.includes("alto") ? ["rgba(255,149,0,.15)", "var(--warn)"] :
      l.includes("insufficiente") || l.includes("basso") ? ["rgba(255,59,48,.15)", "var(--dan)"] :
        ["var(--acc2)", "var(--ok)"];
  return <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: bg, color: col, letterSpacing: ".05em", whiteSpace: "nowrap" }}>{label}</span>;
}
