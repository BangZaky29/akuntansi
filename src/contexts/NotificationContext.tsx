
// C:\codingVibes\nuansasolution\.subpath\akuntansi\src\contexts\NotificationContext.tsx
import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X, Loader2 } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info' | 'loading';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  notify: (message: string, type: NotificationType) => string;
  removeNotify: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

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

  return (
    <NotificationContext.Provider value={{ notify, removeNotify }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={`pointer-events-auto p-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[300px] border ${
                n.type === 'success' ? 'bg-white border-emerald-100 text-emerald-800' :
                n.type === 'error' ? 'bg-white border-rose-100 text-rose-800' :
                n.type === 'loading' ? 'bg-white border-blue-100 text-blue-800' :
                'bg-white border-slate-100 text-slate-800'
              }`}
            >
              <div className="shrink-0">
                {n.type === 'success' && <CheckCircle2 className="text-emerald-500" size={20} />}
                {n.type === 'error' && <AlertCircle className="text-rose-500" size={20} />}
                {n.type === 'info' && <Info className="text-blue-500" size={20} />}
                {n.type === 'loading' && <Loader2 className="text-blue-500 animate-spin" size={20} />}
              </div>
              <p className="text-sm font-semibold flex-1">{n.message}</p>
              <button onClick={() => removeNotify(n.id)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotify = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotify must be used within NotificationProvider');
  return context;
};
