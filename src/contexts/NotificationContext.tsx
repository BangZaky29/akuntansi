
// C:\codingVibes\nuansasolution\.subpath\akuntansi\src\contexts\NotificationContext.tsx
import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X, Loader2 } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info' | 'loading';

interface ToastNotification {
  id: string;
  message: string;
  type: NotificationType;
}

interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'primary';
}

interface ConfirmRequest {
  id: string;
  message: string;
  options?: ConfirmOptions;
  resolve: (value: boolean) => void;
}

interface NotificationContextType {
  notify: (message: string, type: NotificationType) => string;
  removeNotify: (id: string) => void;
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);

  const notify = (message: string, type: NotificationType): string => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, message, type }]);

    if (type !== 'loading') {
      setTimeout(() => removeNotify(id), 5000);
    }
    return id;
  };

  const removeNotify = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const confirm = (message: string, options?: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmRequest({
        id: Math.random().toString(36).substring(2, 9),
        message,
        options,
        resolve
      });
    });
  };

  const handleConfirmResponse = (response: boolean) => {
    if (confirmRequest) {
      confirmRequest.resolve(response);
      setConfirmRequest(null);
    }
  };

  return (
    <NotificationContext.Provider value={{ notify, removeNotify, confirm }}>
      {children}

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-[10000] flex flex-col gap-3 pointer-events-none w-full md:w-auto items-center md:items-end px-4 md:px-0 mb-[70px] md:mb-0">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className={`pointer-events-auto p-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex items-center gap-3 w-full max-w-[350px] md:min-w-[320px] border backdrop-blur-md ${n.type === 'success' ? 'bg-white/90 border-emerald-100/50 text-emerald-900' :
                n.type === 'error' ? 'bg-white/90 border-rose-100/50 text-rose-900' :
                  n.type === 'loading' ? 'bg-white/90 border-purple-100/50 text-purple-900' :
                    'bg-white/90 border-slate-100/50 text-slate-900'
                }`}
            >
              <div className="shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center bg-slate-50">
                {n.type === 'success' && <CheckCircle2 className="text-emerald-500" size={20} />}
                {n.type === 'error' && <AlertCircle className="text-rose-500" size={20} />}
                {n.type === 'info' && <Info className="text-purple-500" size={20} />}
                {n.type === 'loading' && <Loader2 className="text-purple-500 animate-spin" size={20} />}
              </div>
              <p className="text-xs font-black tracking-tight flex-1">{n.message}</p>
              <button
                onClick={() => removeNotify(n.id)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Modern Confirmation Modal */}
      <AnimatePresence>
        {confirmRequest && (
          <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => handleConfirmResponse(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 text-center border border-white/20"
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${confirmRequest.options?.type === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'
                }`}>
                {confirmRequest.options?.type === 'danger' ? <AlertCircle size={32} /> : <Info size={32} />}
              </div>

              <h2 className="text-xl font-black text-slate-900 mb-2">
                {confirmRequest.options?.title || 'Konfirmasi'}
              </h2>
              <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">
                {confirmRequest.message}
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleConfirmResponse(true)}
                  className={`w-full font-black py-4 rounded-2xl transition-all shadow-lg uppercase tracking-widest text-[10px] ${confirmRequest.options?.type === 'danger'
                    ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-100'
                    : 'bg-[#6200EE] text-white hover:bg-[#5000C7] shadow-purple-100'
                    }`}
                >
                  {confirmRequest.options?.confirmLabel || 'Ya, Lanjutkan'}
                </button>
                <button
                  onClick={() => handleConfirmResponse(false)}
                  className="w-full bg-slate-100 text-slate-600 font-black py-4 rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest text-[10px]"
                >
                  {confirmRequest.options?.cancelLabel || 'Batal'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
};

export const useNotify = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotify must be used within NotificationProvider');
  return context;
};
