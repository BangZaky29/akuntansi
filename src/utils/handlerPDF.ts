
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './accounting';
import { type DashboardStats, VERSION } from '../types';

console.debug(`PDF Handler init with Types Version: ${VERSION}`);

const drawModernHeader = (doc: jsPDF, title: string, subtitle: string) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header Branding - Deep Purple
  doc.setFillColor(98, 0, 238);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  // Logo / Brand Name
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("AccountingPro", 20, 20);
  
  // Tagline
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 255);
  doc.text("Sistem Akuntansi Cloud Digital - Performa Bisnis Real-time", 20, 27);
  
  // Right metadata
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, pageWidth - 20, 20, { align: 'right' });
  doc.text(`Verified By System`, pageWidth - 20, 25, { align: 'right' });

  // Report Main Title Section
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(title.toUpperCase(), 20, 60);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(subtitle, 20, 67);

  // Decorative Line
  doc.setDrawColor(98, 0, 238);
  doc.setLineWidth(0.8);
  doc.line(20, 72, 60, 72);

  return 85; // Next Y position
};

const drawFooter = (doc: jsPDF) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text("Halaman ini dihasilkan secara otomatis oleh Cloud AccountingPro.", pageWidth / 2, pageHeight - 15, { align: 'center' });
  doc.text("Dokumen Sah Tanpa Tanda Tangan Basah", pageWidth / 2, pageHeight - 10, { align: 'center' });
};

export const exportChartToPDF = async (stats: DashboardStats, title: string) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = drawModernHeader(doc, title, "Analisis Performa Keuangan Konsolidasi");

  const rows = [
    ['Total Saldo Kas & Bank', formatCurrency(stats.kas)],
    ['Total Piutang Usaha', formatCurrency(stats.piutang)],
    ['Total Hutang Usaha', formatCurrency(stats.hutang)],
    ['Total Modal Disetor', formatCurrency(stats.modal)],
    ['Laba / Rugi Bersih', formatCurrency(stats.laba)],
  ];

  autoTable(doc, {
    startY: startY,
    head: [['Elemen Keuangan', 'Nilai Saldo']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [98, 0, 238], textColor: [255, 255, 255], fontStyle: 'bold', cellPadding: 5 },
    bodyStyles: { fontSize: 10, cellPadding: 5 },
    columnStyles: {
      1: { halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 20, right: 20 }
  });

  drawFooter(doc);
  doc.save(`Analisis_Dashboard_${new Date().getTime()}.pdf`);
};

export interface ReportOptions {
  title: string;
  subtitle: string;
  filename: string;
  columns: string[];
  rows: any[][];
}

export const generateA4Report = (options: ReportOptions) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = drawModernHeader(doc, options.title, options.subtitle);

  autoTable(doc, {
    startY: startY,
    head: [options.columns],
    body: options.rows,
    theme: 'striped',
    headStyles: { 
      fillColor: [98, 0, 238], 
      textColor: [255, 255, 255], 
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4
    },
    bodyStyles: { 
      fontSize: 8,
      cellPadding: 4,
      textColor: [50, 50, 50]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      // Logic for last column alignment
      [options.columns.length - 1]: { halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 20, right: 20 },
    didParseCell: (data) => {
      // Bold if row contains 'TOTAL'
      if (typeof data.cell.raw === 'string' && 
         (data.cell.raw.includes('TOTAL') || data.cell.raw.includes('LABA') || data.cell.raw.includes('RUGI'))) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
      }
    }
  });

  drawFooter(doc);
  return doc;
};

export const downloadPDF = (doc: jsPDF, filename: string) => {
  doc.save(`${filename}_${new Date().getTime()}.pdf`);
};
