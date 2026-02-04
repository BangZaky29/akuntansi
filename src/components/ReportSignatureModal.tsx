
import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Eraser, MapPin, Calendar, PenTool, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';

export interface SignatureData {
    city: string;
    date: string;
    signatoryName: string;
    signatureImage?: string;
    stampImage?: string;
}

interface ReportSignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: SignatureData) => void;
    onSkip: () => void;
}

export default function ReportSignatureModal({ isOpen, onClose, onConfirm, onSkip }: ReportSignatureModalProps) {
    const sigCanvas = useRef<SignatureCanvas>(null);
    const [useUpload, setUseUpload] = useState(false);
    const [city, setCity] = useState('Bogor');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [signatoryName, setSignatoryName] = useState('Penanggung Jawab');
    const [signatureImage, setSignatureImage] = useState<string | undefined>(undefined);
    const [stampImage, setStampImage] = useState<string | undefined>(undefined);

    const clearSignature = () => {
        sigCanvas.current?.clear();
        setSignatureImage(undefined);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setter(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleConfirm = () => {
        let finalSig = signatureImage;
        if (!useUpload && sigCanvas.current && !sigCanvas.current.isEmpty()) {
            finalSig = sigCanvas.current.toDataURL('image/png');
        }

        onConfirm({
            city,
            date,
            signatoryName,
            signatureImage: finalSig,
            stampImage
        });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-8 md:p-10 max-h-[90vh] overflow-y-auto custom-scrollbar"
                    >
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Otentikasi Laporan</h2>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Lengkapi tanda tangan dan stempel (Opsional)</p>
                            </div>
                            <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest flex items-center gap-2">
                                    <MapPin size={12} /> Tempat Pembuatan
                                </label>
                                <input
                                    type="text"
                                    placeholder="Misal: Bogor"
                                    className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100 font-bold focus:border-[#6200EE]/20 transition-all text-sm"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest flex items-center gap-2">
                                    <Calendar size={12} /> Tanggal Laporan
                                </label>
                                <input
                                    type="date"
                                    className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100 font-bold text-sm"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2 mb-8">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest flex items-center gap-2">
                                <CheckCircle2 size={12} /> Nama Penandatangan
                            </label>
                            <input
                                type="text"
                                placeholder="Nama Lengkap"
                                className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100 font-bold focus:border-[#6200EE]/20 transition-all text-sm"
                                value={signatoryName}
                                onChange={(e) => setSignatoryName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <PenTool size={12} /> Tanda Tangan
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setUseUpload(false)}
                                            className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter transition-all ${!useUpload ? 'bg-[#6200EE] text-white' : 'bg-slate-100 text-slate-400'}`}
                                        >
                                            Coret
                                        </button>
                                        <button
                                            onClick={() => setUseUpload(true)}
                                            className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter transition-all ${useUpload ? 'bg-[#6200EE] text-white' : 'bg-slate-100 text-slate-400'}`}
                                        >
                                            Upload
                                        </button>
                                    </div>
                                </div>

                                {!useUpload ? (
                                    <div className="relative bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl overflow-hidden group">
                                        <SignatureCanvas
                                            ref={sigCanvas}
                                            penColor="#1e293b"
                                            canvasProps={{ className: 'w-full h-40 cursor-crosshair' }}
                                        />
                                        <button
                                            onClick={clearSignature}
                                            className="absolute bottom-3 right-3 p-2 bg-white/80 backdrop-blur shadow-sm rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                                            title="Hapus"
                                        >
                                            <Eraser size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative group">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            id="sig-upload"
                                            onChange={(e) => handleFileUpload(e, setSignatureImage)}
                                        />
                                        <label
                                            htmlFor="sig-upload"
                                            className="flex flex-col items-center justify-center h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:border-[#6200EE]/30 transition-all p-4"
                                        >
                                            {signatureImage ? (
                                                <div className="relative w-full h-full flex items-center justify-center">
                                                    <img src={signatureImage} alt="Signature" className="max-h-full max-w-full object-contain" />
                                                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                                                        <p className="text-white text-[10px] font-black uppercase tracking-widest">Ganti Gambar</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <Upload size={24} className="text-slate-300 mb-2" />
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upload PNG/JPG</p>
                                                </>
                                            )}
                                        </label>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest flex items-center gap-2">
                                    <ImageIcon size={12} /> Stempel Perusahaan
                                </label>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        id="stamp-upload"
                                        onChange={(e) => handleFileUpload(e, setStampImage)}
                                    />
                                    <label
                                        htmlFor="stamp-upload"
                                        className="flex flex-col items-center justify-center h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:border-[#6200EE]/30 transition-all p-4"
                                    >
                                        {stampImage ? (
                                            <div className="relative w-full h-full flex items-center justify-center">
                                                <img src={stampImage} alt="Stamp" className="max-h-full max-w-full object-contain" />
                                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                                                    <p className="text-white text-[10px] font-black uppercase tracking-widest">Ganti Stempel</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload size={20} className="text-slate-300 mb-2" />
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upload Stempel</p>
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-10">
                            <button
                                onClick={onSkip}
                                className="py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                            >
                                Lanjut tanpa ttd
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="bg-[#6200EE] text-white py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-purple-100 flex items-center justify-center gap-3 transition-all active:scale-95"
                            >
                                Konfirmasi & Cetak
                                <CheckCircle2 size={16} />
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
