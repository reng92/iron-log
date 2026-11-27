// Markdown minimale e sicuro per le risposte dell'AI: costruisce elementi React (niente HTML grezzo,
// quindi niente rischio XSS). Supporta: titoli, grassetto, corsivo, codice inline, elenchi puntati e
// numerati, tabelle, separatori e paragrafi.
import { Fragment } from "react";

// **grassetto**, *corsivo* / _corsivo_, `codice`
function inline(testo, key = "i") {
  const out = [];
  const re = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|_[^_\s][^_]*_|`[^`]+`)/g;
  let last = 0, m, n = 0;
  while ((m = re.exec(testo))) {
    if (m.index > last) out.push(testo.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**") || t.startsWith("__")) out.push(<strong key={`${key}${n++}`}>{inline(t.slice(2, -2), `${key}b${n}`)}</strong>);
    else if (t.startsWith("`")) out.push(<code key={`${key}${n++}`} className="md-code">{t.slice(1, -1)}</code>);
    else out.push(<em key={`${key}${n++}`}>{inline(t.slice(1, -1), `${key}e${n}`)}</em>);
    last = m.index + t.length;
  }
  if (last < testo.length) out.push(testo.slice(last));
  return out;
}

const cella = s => s.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(c => c.trim());
const isSeparatore = s => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(s || "");
const isSpeciale = (r, next) => /^(#{1,6})\s|^\s*[-*•]\s+|^\s*\d+[.)]\s+/.test(r) || (r.includes("|") && isSeparatore(next));

export default function Markdown({ testo = "" }) {
  const righe = String(testo).replace(/\r/g, "").split("\n");
  const blocchi = [];
  let i = 0;
  while (i < righe.length) {
    const r = righe[i];
    if (!r.trim()) { i++; continue; }

    // tabella: riga con | seguita da separatore ---
    if (r.includes("|") && isSeparatore(righe[i + 1])) {
      const head = cella(r);
      const body = [];
      i += 2;
      while (i < righe.length && righe[i].includes("|") && righe[i].trim()) { body.push(cella(righe[i])); i++; }
      blocchi.push(
        <div className="md-table" key={blocchi.length}>
          <table>
            <thead><tr>{head.map((h, k) => <th key={k}>{inline(h, `h${k}`)}</th>)}</tr></thead>
            <tbody>{body.map((row, ri) => <tr key={ri}>{head.map((_, k) => <td key={k}>{inline(row[k] || "", `c${ri}${k}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      continue;
    }

    const h = r.match(/^(#{1,6})\s+(.*)$/);
    if (h) { blocchi.push(<div key={blocchi.length} className={`md-h md-h${Math.min(h[1].length, 4)}`}>{inline(h[2], `t${i}`)}</div>); i++; continue; }

    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(r)) { blocchi.push(<hr key={blocchi.length} className="md-hr" />); i++; continue; }

    if (/^\s*[-*•]\s+/.test(r)) {
      const items = [];
      while (i < righe.length && /^\s*[-*•]\s+/.test(righe[i])) { items.push(righe[i].replace(/^\s*[-*•]\s+/, "")); i++; }
      blocchi.push(<ul key={blocchi.length} className="md-list">{items.map((t, k) => <li key={k}>{inline(t, `u${i}${k}`)}</li>)}</ul>);
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(r)) {
      const items = [];
      while (i < righe.length && /^\s*\d+[.)]\s+/.test(righe[i])) { items.push(righe[i].replace(/^\s*\d+[.)]\s+/, "")); i++; }
      blocchi.push(<ol key={blocchi.length} className="md-list">{items.map((t, k) => <li key={k}>{inline(t, `o${i}${k}`)}</li>)}</ol>);
      continue;
    }

    // paragrafo: righe consecutive non speciali
    const par = [];
    while (i < righe.length && righe[i].trim() && !isSpeciale(righe[i], righe[i + 1])) { par.push(righe[i].trim()); i++; }
    if (!par.length) { par.push(righe[i].trim()); i++; }
    blocchi.push(<p key={blocchi.length} className="md-p">{par.map((t, k) => <Fragment key={k}>{k > 0 && <br />}{inline(t, `p${i}${k}`)}</Fragment>)}</p>);
  }
  return <div className="md">{blocchi}</div>;
}
