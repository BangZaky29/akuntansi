
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './accounting';
import { type DashboardStats, VERSION } from '../types';

console.debug(`PDF Handler init with Types Version: ${VERSION}`);

export const exportChartToPDF = async (stats: DashboardStats, title: string) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  
  // Header Branding - Modern Style
  doc.setFillColor(98, 0, 238); // Brand Purple
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("AccountingPro", margin, 20);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(210, 210, 255);
  doc.text("Laporan Analisis Dashboard Keuangan", margin, 28);
  
  doc.setFontSize(8);
  doc.text(`Periode: ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`, pageWidth - margin - 40, 20);
  doc.text(`Waktu Cetak: ${new Date().toLocaleTimeString('id-ID')}`, pageWidth - margin - 40, 25);

  // Content Header
  let currentY = 60;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(title.toUpperCase(), margin, currentY);
  
  currentY += 4;
  doc.setDrawColor(98, 0, 238);
  doc.setLineWidth(1);
  doc.line(margin, currentY, 50, currentY);

  currentY += 12;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Berikut adalah ringkasan performa finansial berdasarkan entri jurnal sistem:", margin, currentY);

  // Stats Table
  const rows = [
    ['Total Saldo Kas & Bank', formatCurrency(stats.kas)],
    ['Total Piutang Usaha', formatCurrency(stats.piutang)],
    ['Total Hutang Usaha', formatCurrency(stats.hutang)],
    ['Total Modal Disetor', formatCurrency(stats.modal)],
    ['Laba / Rugi Bersih', formatCurrency(stats.laba)],
  ];

  autoTable(doc, {
    startY: currentY + 8,
    head: [['Elemen Keuangan', 'Nilai Saldo']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [98, 0, 238], textColor: [255, 255, 255], fontStyle: 'bold' },
    bodyStyles: { fontSize: 10, cellPadding: 6 },
    columnStyles: {
      1: { halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: margin, right: margin }
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;

  // Financial Ratio Summary
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Analisis Singkat Kondisi Keuangan", margin, currentY);
  
  currentY += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  
  const statusLabel = stats.laba >= 0 ? "SURPLUS" : "DEFISIT";
  const healthMsg = stats.kas > stats.hutang 
    ? "Bisnis memiliki likuiditas yang cukup untuk menutupi kewajiban jangka pendek." 
    : "PERHATIAN: Saldo kas berada di bawah total hutang yang ada.";

  doc.text(`1. Posisi Laba/Rugi: Saat ini bisnis berada dalam kondisi ${statusLabel}.`, margin, currentY);
  doc.text(`2. Likuiditas: ${healthMsg}`, margin, currentY + 6);
  doc.text(`3. Investasi: Total modal terkumpul sebesar ${formatCurrency(stats.modal)}.`, margin, currentY + 12);

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(180);
  doc.text("Laporan ini sah secara sistem dan dihasilkan oleh Cloud AccountingPro Digital.", pageWidth / 2, pageHeight - 15, { align: 'center' });

  doc.save(`Analisis_Keuangan_${new Date().getTime()}.pdf`);
};

export const generateA4Report = (options: any) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  // Implementation of general reports (Trial Balance, etc.)
  return doc;
};

export const downloadPDF = (doc: jsPDF, filename: string) => {
  doc.save(`${filename}.pdf`);
};
