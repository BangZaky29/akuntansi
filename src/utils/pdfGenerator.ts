import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportOptions {
    title: string;
    period: string;
    fileName: string;
    orientation?: 'portrait' | 'landscape';
    columns: string[];
    data: any[][];
    footer?: { label: string; value: string }[];
}

export const generatePDF = ({
    title,
    period,
    fileName,
    orientation = 'portrait',
    columns,
    data,
    footer
}: ReportOptions) => {
    const doc = new jsPDF(orientation, 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;

    // --- Header Section ---
    // Purple Background
    doc.setFillColor(98, 0, 238); // #6200EE
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Title in Header
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('AccountingPro', 15, 20);

    // Subtitle in Header
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistem Akuntansi Cloud Digital - Performa Bisnis Real-time', 15, 26);

    // Print Info in Header (Right aligned)
    doc.setFontSize(8);
    doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, pageWidth - 15, 18, { align: 'right' });
    doc.text('Verified By System', pageWidth - 15, 23, { align: 'right' });

    // --- Report Title Section ---
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), 15, 55);

    // Period
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`Periode: ${period}`, 15, 61);

    // Underline Title
    doc.setDrawColor(98, 0, 238);
    doc.setLineWidth(1);
    doc.line(15, 65, 45, 65);

    // --- Table ---
    autoTable(doc, {
        startY: 75,
        head: [columns],
        body: data,
        theme: 'grid',
        headStyles: {
            fillColor: [98, 0, 238],
            textColor: 255,
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'center'
        },
        styles: {
            fontSize: 9,
            cellPadding: 3,
            textColor: [51, 65, 85]
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        columnStyles: {
            0: { cellWidth: 30 }, // First column (e.g. Date) fixed width often helps
            // Add more specific styles if needed passed via options later
        },
        didDrawPage: (data) => {
            // Footer Page Number
            const pageCount = doc.getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(
                'Page ' + pageCount,
                data.settings.margin.left,
                doc.internal.pageSize.height - 10
            );
        }
    });

    // --- Summary Footer (Optional) ---
    if (footer) {
        const finalY = (doc as any).lastAutoTable.finalY + 10;

        // Check if we need a new page
        if (finalY > doc.internal.pageSize.height - 30) {
            doc.addPage();
            // Reset Y for new page
            // ...
        }

        let currentY = finalY;

        // Background for summary
        doc.setFillColor(248, 250, 252);
        doc.rect(15, currentY - 5, pageWidth - 30, (footer.length * 8) + 10, 'F');

        footer.forEach((item) => {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            doc.text(item.label, 20, currentY + 2);

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30);
            doc.text(item.value, pageWidth - 20, currentY + 2, { align: 'right' });

            currentY += 8;
        });
    }

    doc.save(`${fileName}_${Date.now()}.pdf`);
};
