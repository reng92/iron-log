import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { fmtIso } from "./utils";

const ACC = [30, 144, 255];
const DARK = [28, 28, 30];
const MUT = [120, 120, 128];

const num = v => {
  if (v == null || v === "" || isNaN(+v)) return "-";
  return (+v).toLocaleString("it-IT", { maximumFractionDigits: 2 });
};
const dataIt = d => d ? new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-";
const withStatus = (v, st, unit = "") => {
  const s = num(v);
  if (s === "-") return "-";
  return `${s}${unit}${st ? `\n${st}` : ""}`;
};

const CIRC_COLS = [
  ["braccio_rilassato", "Braccio ril."], ["braccio_flesso", "Braccio fl."], ["avambraccio", "Avambr."],
  ["polso", "Polso"], ["torace", "Torace"], ["vita", "Vita"], ["addome", "Addome"], ["fianchi", "Fianchi"],
  ["coscia_max", "Coscia max"], ["coscia_med", "Coscia med."], ["polpaccio", "Polpaccio"], ["testa", "Testa"],
];

function sezione(doc, titolo, y) {
  const pageH = doc.internal.pageSize.getHeight();
  if (y > pageH - 40) { doc.addPage(); y = 18; }
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...DARK);
  doc.text(titolo, 14, y);
  doc.setDrawColor(...ACC); doc.setLineWidth(0.6);
  doc.line(14, y + 1.8, 14 + doc.getTextWidth(titolo), y + 1.8);
  return y + 7;
}

function graficoPeso(doc, punti, x, y, w, h) {
  const vals = punti.map(p => p.v);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (max - min < 1) { min -= 0.5; max += 0.5; }
  const pad = (max - min) * 0.1; min -= pad; max += pad;
  const t0 = new Date(punti[0].d).getTime(), t1 = new Date(punti[punti.length - 1].d).getTime();
  const px = d => x + (t1 === t0 ? w / 2 : ((new Date(d).getTime() - t0) / (t1 - t0)) * w);
  const py = v => y + h - ((v - min) / (max - min)) * h;

  doc.setDrawColor(225, 225, 230); doc.setLineWidth(0.2);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...MUT);
  for (let i = 0; i <= 4; i++) {
    const v = min + ((max - min) * i) / 4, yy = py(v);
    doc.line(x, yy, x + w, yy);
    doc.text(num(+v.toFixed(1)), x - 2, yy + 1, { align: "right" });
  }
  doc.text(dataIt(punti[0].d), x, y + h + 5);
  doc.text(dataIt(punti[punti.length - 1].d), x + w, y + h + 5, { align: "right" });

  doc.setDrawColor(...ACC); doc.setLineWidth(0.7);
  for (let i = 1; i < punti.length; i++) doc.line(px(punti[i - 1].d), py(punti[i - 1].v), px(punti[i].d), py(punti[i].v));
  doc.setFillColor(...ACC);
  punti.forEach(p => doc.circle(px(p.d), py(p.v), 0.8, "F"));
}

export async function esportaStoricoPdf({ settings = {}, peso = [], misure = [] }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pesoOrd = [...peso].filter(p => p.data).sort((a, b) => a.data.localeCompare(b.data));
  const misureOrd = [...misure].filter(m => m.data).sort((a, b) => a.data.localeCompare(b.data));
  const tableBase = {
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 1.6, valign: "middle", halign: "center", lineColor: [225, 225, 230] },
    headStyles: { fillColor: ACC, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [246, 248, 252] },
    margin: { left: 14, right: 14, top: 16 },
  };

  // ── Intestazione ──
  doc.setFillColor(...DARK); doc.rect(0, 0, pageW, 26, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(20);
  doc.text("IRON LOG", 14, 13);
  doc.setFontSize(11); doc.setFont("helvetica", "normal");
  doc.text("Storico corporeo completo", 14, 20);
  doc.setFontSize(9);
  doc.text(`Generato il ${dataIt(new Date())}`, pageW - 14, 13, { align: "right" });
  if (settings.nome) doc.text(settings.nome, pageW - 14, 20, { align: "right" });

  // ── Profilo + riepilogo ──
  let y = sezione(doc, "Profilo", 36);
  const primo = pesoOrd.find(p => p.valore != null);
  const ultimo = [...pesoOrd].reverse().find(p => p.valore != null);
  const h = settings.altezza ? settings.altezza / 100 : null;
  const bmi = ultimo && h ? +(ultimo.valore / (h * h)).toFixed(1) : null;
  const diff = primo && ultimo ? +(ultimo.valore - primo.valore).toFixed(1) : null;
  const sessoLbl = settings.sesso === "M" ? "Uomo" : settings.sesso === "F" ? "Donna" : settings.sesso;
  autoTable(doc, {
    ...tableBase,
    startY: y,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 1.4 },
    columnStyles: { 0: { fontStyle: "bold", textColor: MUT, cellWidth: 45 }, 2: { fontStyle: "bold", textColor: MUT, cellWidth: 45 } },
    tableWidth: 200,
    body: [
      ["Nome", settings.nome || "-", "Peso attuale", ultimo ? `${num(ultimo.valore)} kg (${dataIt(ultimo.data)})` : "-"],
      ["Sesso", sessoLbl || "-", "Peso iniziale", primo ? `${num(primo.valore)} kg (${dataIt(primo.data)})` : "-"],
      ["Età",settings.eta ? `${settings.eta} anni` : "-", "Variazione", diff != null ? `${diff > 0 ? "+" : ""}${num(diff)} kg` : "-"],
      ["Altezza", settings.altezza ? `${settings.altezza} cm` : "-", "IMC attuale", bmi != null ? num(bmi) : "-"],
      ["Rilevazioni peso", String(pesoOrd.length), "Visite nutrizionista", String(misureOrd.length)],
    ],
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Grafico peso ──
  const punti = pesoOrd.filter(p => p.valore != null).map(p => ({ d: p.data, v: +p.valore }));
  if (punti.length >= 2) {
    y = sezione(doc, "Andamento peso (kg)", y);
    graficoPeso(doc, punti, 28, y + 2, pageW - 56, 55);
    y += 70;
  }

  // ── Storico peso e composizione corporea ──
  doc.addPage();
  y = sezione(doc, "Peso e composizione corporea", 18);
  if (pesoOrd.length) {
    autoTable(doc, {
      ...tableBase,
      startY: y,
      head: [["Data", "Peso", "Punteggio", "Tipologia", "IMC", "Massa grassa", "Acqua", "Grasso visc.", "Muscoli", "Proteine", "Metabolismo", "Massa ossea", "Nota"]],
      body: pesoOrd.map(p => [
        dataIt(p.data), withStatus(p.valore, null, " kg"), num(p.punteggio), p.tipologia || "-",
        withStatus(p.imc, p.imc_status), withStatus(p.massa_grassa, p.massa_grassa_status, "%"),
        withStatus(p.acqua, p.acqua_status, "%"), withStatus(p.grasso_viscerale, p.grasso_viscerale_status),
        withStatus(p.muscoli, p.muscoli_status, " kg"), withStatus(p.proteine, p.proteine_status, "%"),
        withStatus(p.metabolismo, p.metabolismo_status, " kcal"), withStatus(p.massa_ossea, p.massa_ossea_status, " kg"),
        p.nota || "",
      ]),
      columnStyles: { 0: { fontStyle: "bold" }, 12: { halign: "left", cellWidth: 34 } },
    });
    y = doc.lastAutoTable.finalY + 10;
  } else {
    doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(...MUT);
    doc.text("Nessuna rilevazione del peso.", 14, y + 2);
    y += 12;
  }

  // ── Visite nutrizionista (composizione) ──
  if (misureOrd.length) {
    y = sezione(doc, "Visite nutrizionista - composizione corporea", y);
    autoTable(doc, {
      ...tableBase,
      startY: y,
      head: [["Data", "Visita", "Peso (kg)", "FFM (kg)", "FM (kg)", "FM %", "BCM (kg)", "Note"]],
      body: misureOrd.map(m => [
        dataIt(m.data), m.visita_label || "-", num(m.peso), num(m.ffm), num(m.fm),
        m.fm != null && m.peso ? `${num(+(m.fm / m.peso * 100).toFixed(1))}%` : "-",
        num(m.bcm), m.note || "",
      ]),
      columnStyles: { 0: { fontStyle: "bold" }, 7: { halign: "left", cellWidth: 70 } },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // ── Circonferenze ──
  const righeCirc = misureOrd
    .filter(m => CIRC_COLS.some(([k]) => m[k] != null))
    .map(m => ({ label: dataIt(m.data), sub: m.visita_label, ...m }));
  const circProfilo = settings.circonferenze;
  if (circProfilo && CIRC_COLS.some(([k]) => circProfilo[k] != null))
    righeCirc.push({ label: dataIt(circProfilo.data), sub: "Profilo", ...circProfilo });
  righeCirc.sort((a, b) => (a.data || "").localeCompare(b.data || ""));
  if (righeCirc.length) {
    y = sezione(doc, "Circonferenze corporee (cm)", y);
    autoTable(doc, {
      ...tableBase,
      startY: y,
      head: [["Data", ...CIRC_COLS.map(([, l]) => l)]],
      body: righeCirc.map(r => [r.sub ? `${r.label}\n${r.sub}` : r.label, ...CIRC_COLS.map(([k]) => num(r[k]))]),
      columnStyles: { 0: { fontStyle: "bold" } },
    });
  }

  // ── Numeri di pagina ──
  const tot = doc.getNumberOfPages();
  for (let i = 1; i <= tot; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...MUT);
    doc.text(`Iron Log - pagina ${i} di ${tot}`, pageW - 14, doc.internal.pageSize.getHeight() - 7, { align: "right" });
  }

  const filename = `iron-log-storico-${fmtIso()}.pdf`;
  if (Capacitor.isNativePlatform()) {
    const data = doc.output("datauristring").split(",")[1];
    const { uri } = await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache });
    await Share.share({ title: "Storico Iron Log", url: uri, dialogTitle: "Esporta storico PDF" });
  } else {
    doc.save(filename);
  }
}
