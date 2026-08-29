// FILE BARU: lib/pdf/exportFinancialReportPdf.ts
//
// Util generate PDF client-side pakai jsPDF + jspdf-autotable.
// Dipakai oleh components/admin/FinancialReports.tsx untuk tombol
// "Unduh PDF" di tiap laporan (Deposito Mitra, Pendapatan Mitra,
// Fee Platform).
//
// Warna header tabel diambil otomatis dari class Tailwind "text-bay-deep"
// yang sudah dipakai di project (bukan hex yang ditebak) -- jadi kalau
// warna brand berubah di tailwind.config, PDF ikut menyesuaikan.

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface SummaryLine {
  label: string;
  value: string;
}

interface ExportFinancialReportPdfOptions {
  title: string;
  periodLabel: string;
  summary: SummaryLine[];
  columns: string[];
  rows: (string | number)[][];
  fileName: string;
  note?: string;
}

/** Baca warna hasil render class Tailwind tertentu, fallback ke navy gelap. */
function getComputedColorRGB(twClassName: string): [number, number, number] {
  if (typeof document === "undefined") return [18, 32, 42];
  const el = document.createElement("div");
  el.className = twClassName;
  el.style.position = "fixed";
  el.style.top = "-9999px";
  el.style.left = "-9999px";
  document.body.appendChild(el);
  const computed = getComputedStyle(el).color; // format: "rgb(r, g, b)"
  document.body.removeChild(el);
  const match = computed.match(/\d+/g);
  if (!match || match.length < 3) return [18, 32, 42];
  return [Number(match[0]), Number(match[1]), Number(match[2])];
}

export function exportFinancialReportPdf({
  title,
  periodLabel,
  summary,
  columns,
  rows,
  fileName,
  note,
}: ExportFinancialReportPdfOptions) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const accentColor = getComputedColorRGB("text-bay-deep");

  const generatedAt = new Date().toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  });

  // --- Kop laporan ---
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...accentColor);
  doc.text("Kerjaku.click", 14, 18);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 90, 90);
  doc.text("PT. Kerjaku Bangun Negeri", 14, 23);

  doc.setDrawColor(...accentColor);
  doc.setLineWidth(0.5);
  doc.line(14, 27, 196, 27);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
  doc.text(title, 14, 35);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 90, 90);
  doc.text(`Periode: ${periodLabel}`, 14, 41);
  doc.text(`Dicetak: ${generatedAt}`, 14, 46);

  let cursorY = 53;

  // --- Ringkasan angka ---
  if (summary.length > 0) {
    doc.setFontSize(10);
    summary.forEach((s) => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(20, 20, 20);
      doc.text(`${s.label}:`, 14, cursorY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...accentColor);
      doc.text(s.value, 80, cursorY);
      cursorY += 6;
    });
    cursorY += 3;
  }

  // --- Tabel detail ---
  autoTable(doc, {
    startY: cursorY,
    head: [columns],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: accentColor, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [246, 247, 248] },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Halaman ${data.pageNumber} dari ${pageCount}`, 196, 290, {
        align: "right",
      });
    },
  });

  // --- Catatan kaki opsional ---
  if (note) {
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120, 120, 120);
    doc.text(note, 14, finalY + 8, { maxWidth: 182 });
  }

  doc.save(fileName);
}
