import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { ENABLE_DEV_COPY } from '../App';
import { useNotify } from '../contexts/NotificationContext';

interface CopyToClipboardButtonProps {
    label?: string;
    data: any[];
    headers?: string[];
    title?: string;
}

export default function CopyToClipboardButton({ label = 'Copy Data', data, headers, title }: CopyToClipboardButtonProps) {
    const { notify } = useNotify();
    const [copied, setCopied] = useState(false);

    if (!ENABLE_DEV_COPY) return null;

    const handleCopy = () => {
        try {
            let text = '';
            if (title) text += `[ ${title} ]\n\n`;

            if (headers) {
                text += headers.join('\t') + '\n';
            }

            data.forEach(row => {
                if (Array.isArray(row)) {
                    text += row.join('\t') + '\n';
                } else if (typeof row === 'object') {
                    text += Object.values(row).join('\t') + '\n';
                } else {
                    text += String(row) + '\n';
                }
            });

            navigator.clipboard.writeText(text);
            setCopied(true);
            notify('Data disalin ke clipboard (Dev Mode)', 'success');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            notify('Gagal menyalin data', 'error');
        }
    };

    return (
        <button
            onClick={handleCopy}
            className="flex items-center gap-2 bg-slate-800 text-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-700 transition-all shadow-lg border border-slate-700"
            title="Developer Tool: Copy Table Data"
        >
            {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
            {label}
        </button>
    );
}
