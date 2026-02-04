
import { useState } from 'react';
import { generatePDF } from '../utils/pdfGenerator';
import type { ReportSignature } from '../utils/pdfGenerator';
import { useNotify } from '../contexts/NotificationContext';

interface PrintOptions {
    title: string;
    period: string;
    fileName: string;
    columns: string[];
    data: any[][];
    footer?: { label: string; value: string }[];
    orientation?: 'portrait' | 'landscape';
}

export function useReportPrint() {
    const { notify } = useNotify();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [options, setOptions] = useState<PrintOptions | null>(null);

    const handlePrintRequest = (printOptions: PrintOptions) => {
        setOptions(printOptions);
        setIsModalOpen(true);
    };

    const confirmPrint = (signature?: ReportSignature) => {
        if (!options) return;

        generatePDF({
            ...options,
            signature
        });

        setIsModalOpen(false);
        setOptions(null);
        notify('Laporan berhasil diunduh', 'success');
    };

    const skipSignature = () => {
        confirmPrint(undefined);
    };

    return {
        isModalOpen,
        setIsModalOpen,
        handlePrintRequest,
        confirmPrint,
        skipSignature
    };
}
