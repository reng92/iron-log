export default function StatusBadge({ label }) {
  if (!label) return null;
  const l = label.toLowerCase();
  const [bg, col] = l.includes("molto alto") ? ["rgba(255,59,48,.15)", "var(--dan)"] :
    l.includes("alto") ? ["rgba(255,149,0,.15)", "#FF9500"] :
      l.includes("insufficiente") || l.includes("basso") ? ["rgba(255,59,48,.15)", "var(--dan)"] :
        ["rgba(48,209,88,.15)", "var(--ok)"];
  return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: bg, color: col, letterSpacing: ".05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{label}</span>;
}
