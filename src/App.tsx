import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Root Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import VerificationSuccess from './pages/VerificationSuccess';

export const ENABLE_DEV_COPY = true; // Toggle this to enable/disable developer copy buttons

import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';

// Data Pages
import Contacts from './pages/data/Contacts';
import Accounts from './pages/data/Accounts';

// Transaksi Pages
import InitialBalance from './pages/transaksi/InitialBalance';
import JournalEntry from './pages/transaksi/JournalEntry';

// Transaksi Khusus Pages
import Income from './pages/transaksiKhusus/Income';
import Expense from './pages/transaksiKhusus/Expense';
import Capital from './pages/transaksiKhusus/Capital';
import Receivables from './pages/transaksiKhusus/Receivables';
import Payables from './pages/transaksiKhusus/Payables';

// Laporan Pages
import Journal from './pages/laporan/Journal';
import Ledger from './pages/laporan/Ledger';
import TrialBalance from './pages/laporan/TrialBalance';
import Reports from './pages/laporan/Reports';
import CashFlow from './pages/laporan/CashFlow';
import EquityChange from './pages/laporan/EquityChange';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verification-success" element={<VerificationSuccess />} />

        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        {/* Data */}
        <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
        <Route path="/accounts" element={<ProtectedRoute><Accounts /></ProtectedRoute>} />

        {/* Transaksi */}
        <Route path="/initial-balance" element={<ProtectedRoute><InitialBalance /></ProtectedRoute>} />
        <Route path="/journal-entry" element={<ProtectedRoute><JournalEntry /></ProtectedRoute>} />

        {/* Transaksi Khusus */}
        <Route path="/capital" element={<ProtectedRoute><Capital /></ProtectedRoute>} />
        <Route path="/income" element={<ProtectedRoute><Income /></ProtectedRoute>} />
        <Route path="/expense" element={<ProtectedRoute><Expense /></ProtectedRoute>} />
        <Route path="/receivables" element={<ProtectedRoute><Receivables /></ProtectedRoute>} />
        <Route path="/payables" element={<ProtectedRoute><Payables /></ProtectedRoute>} />

        {/* Laporan */}
        <Route path="/journal" element={<ProtectedRoute><Journal /></ProtectedRoute>} />
        <Route path="/ledger" element={<ProtectedRoute><Ledger /></ProtectedRoute>} />
        <Route path="/trial-balance" element={<ProtectedRoute><TrialBalance /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/cash-flow" element={<ProtectedRoute><CashFlow /></ProtectedRoute>} />
        <Route path="/equity-change" element={<ProtectedRoute><EquityChange /></ProtectedRoute>} />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
