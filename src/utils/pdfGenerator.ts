import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReportSignature {
    city: string;
    date: string;
    signatoryName: string;
    signatureImage?: string; // base64
    stampImage?: string;     // base64
}

interface ReportOptions {
    title: string;
    period: string;
    fileName: string;
    orientation?: 'portrait' | 'landscape';
    columns: string[];
    data: any[][];
    footer?: { label: string; value: string }[];
    signature?: ReportSignature;
}

export const generatePDF = ({
    title,
    period,
    fileName,
    orientation = 'portrait',
    columns,
    data,
    footer,
    signature
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

    // --- Signature Section (Optional) ---
    if (signature) {
        // Increase offset to 35 to prevent overlap with table footer
        let finalY = (doc as any).lastAutoTable.finalY + 35;
        const blockWidth = 80;
        const rightMargin = 15;
        const startX = pageWidth - blockWidth - rightMargin;
        const blockCenterX = startX + (blockWidth / 2);

        // Check for page overflow
        if (finalY > doc.internal.pageSize.height - 70) {
            doc.addPage();
            finalY = 30;
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30);

        // 1. "City, Date" (Top)
        doc.text(`${signature.city}, ${signature.date}`, blockCenterX, finalY, { align: 'center' });

        // 2. "Mengetahui," (Middle)
        doc.text("Mengetahui,", blockCenterX, finalY + 7, { align: 'center' });

        const sigY = finalY + 10;
        const sigHeight = 25;

        // 3. Signature & Stamp (Stamp first so it appears behind signature)
        if (signature.stampImage) {
            try {
                // Stamp significantly overlapping with signature (startX + 22 creates tighter distance)
                doc.addImage(signature.stampImage, 'PNG', startX + 22, sigY + 2, 35, 30);
            } catch (e) {
                console.error("Stamp image failed:", e);
            }
        }

        if (signature.signatureImage) {
            try {
                // Signature on the left, drawn after stamp so it appears on top
                doc.addImage(signature.signatureImage, 'PNG', startX + 5, sigY, 40, sigHeight);
            } catch (e) {
                console.error("Signature image failed:", e);
            }
        }

        // 4. (Signatory Name) - Bold and Underlined
        const nameY = sigY + sigHeight + 12;
        doc.setFont('helvetica', 'bold');
        const nameText = `( ${signature.signatoryName || '____________________'} )`;
        doc.text(nameText, blockCenterX, nameY, { align: 'center' });

        // Add underline under the name
        const textWidth = doc.getTextWidth(nameText);
        doc.setDrawColor(30);
        doc.setLineWidth(0.5);
        doc.line(blockCenterX - (textWidth / 2) + 2, nameY + 1, blockCenterX + (textWidth / 2) - 2, nameY + 1);
    }

    doc.save(`${fileName}_${Date.now()}.pdf`);
};
