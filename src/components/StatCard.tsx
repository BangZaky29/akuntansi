
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { formatCurrency } from '../utils/accounting';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color: string;
}

export default function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  const isPositive = value >= 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{title}</p>
        <p className="text-lg font-bold text-slate-900">{formatCurrency(value)}</p>
      </div>
    </motion.div>
  );
}
