/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Wallet, Search, CheckCircle2, AlertCircle, RefreshCw, 
  Calendar, ArrowUpRight, ShieldAlert, FileSpreadsheet, 
  CreditCard, History, Check, Smartphone, Send, MessageSquare, 
  ExternalLink, X, Sparkles, Filter, ChevronRight, Lock, 
  Clock, IndianRupee, HelpCircle, Layers, ArrowDownRight, UserCheck
} from 'lucide-react';
import { AuthUser, EmployeePayrollSummary, PayoutTransaction } from '../types';

interface PayrollPanelProps {
  currentUser?: AuthUser | null;
}

export default function PayrollPanel({ currentUser }: PayrollPanelProps) {
  const [employees, setEmployees] = useState<EmployeePayrollSummary[]>([]);
  const [historyLogs, setHistoryLogs] = useState<PayoutTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'due' | 'active'>('all');

  // Partial Payout Modal State
  const [selectedEmpForPayout, setSelectedEmpForPayout] = useState<EmployeePayrollSummary | null>(null);
  const [payoutInputAmount, setPayoutInputAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer / NEFT');
  const [payoutNotes, setPayoutNotes] = useState<string>('');
  const [overpaymentError, setOverpaymentError] = useState<string | null>(null);
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);

  // View Payment History for an Employee Modal
  const [viewHistoryEmp, setViewHistoryEmp] = useState<EmployeePayrollSummary | null>(null);

  // Success Confirmation Modal State
  const [payoutSuccessModal, setPayoutSuccessModal] = useState<{
    employeeName: string;
    role: string;
    payoutAmount: number;
    payoutType: string;
    previousBalance: number;
    remainingBalance: number;
    cycleNumber: number;
    cycleDateRange: string;
    employeePhone: string;
    smsNotification: string;
    whatsappUrl: string;
  } | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Role-Based Access Validation
  const userRole = (currentUser?.role || '').toLowerCase();
  const empRole = (currentUser?.employeeRole || '').toLowerCase();
  const isAuthorized = userRole === 'admin' || userRole === 'manager' || empRole.includes('manager') || !currentUser;

  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/payroll', {
        headers: {
          'x-user-role': currentUser?.role || 'admin',
          'x-user-email': currentUser?.email || '',
          'x-user-name': currentUser?.name || 'Administrator'
        }
      });
      const data = await res.json();
      if (data.payroll) {
        setEmployees(data.payroll);
      }
      if (data.history) {
        setHistoryLogs(data.history);
      }
    } catch (err) {
      console.error('Failed to load payroll data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchPayrollData();
    }
  }, [isAuthorized]);

  // Open Payout Modal
  const handleOpenPayout = (emp: EmployeePayrollSummary) => {
    setSelectedEmpForPayout(emp);
    // Pre-fill with current due balance
    setPayoutInputAmount(String(emp.totalDueBalance));
    setPayoutNotes(`Disbursement for 30-Day Cycle #${emp.currentCycle.cycleNumber}`);
    setOverpaymentError(null);
  };

  // Live input validation on amount changes (Strictly prevent overpayment)
  const handleAmountChange = (val: string) => {
    setPayoutInputAmount(val);
    if (!selectedEmpForPayout) return;

    const num = Number(val);
    if (isNaN(num) || num <= 0) {
      setOverpaymentError('Please enter a valid payout amount greater than zero.');
    } else if (num > selectedEmpForPayout.totalDueBalance) {
      setOverpaymentError(
        `Overpayment Blocked: Payout of ₹${num.toLocaleString()} cannot exceed the employee's current total due balance of ₹${selectedEmpForPayout.totalDueBalance.toLocaleString()}.`
      );
    } else {
      setOverpaymentError(null);
    }
  };

  // Percentage Quick Presets
  const handleQuickPreset = (percent: number) => {
    if (!selectedEmpForPayout) return;
    const calc = Math.round((selectedEmpForPayout.totalDueBalance * percent) / 100);
    setPayoutInputAmount(String(calc));
    setOverpaymentError(null);
  };

  // Process Custom Partial Payout Submission
  const handleSubmitPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpForPayout) return;

    const amount = Number(payoutInputAmount);
    if (isNaN(amount) || amount <= 0) {
      setOverpaymentError('Please enter an amount greater than zero.');
      return;
    }

    // Strict Overpayment Check
    if (amount > selectedEmpForPayout.totalDueBalance) {
      setOverpaymentError(
        `Overpayment blocked: Requested payout (₹${amount.toLocaleString()}) exceeds total due balance of ₹${selectedEmpForPayout.totalDueBalance.toLocaleString()}.`
      );
      return;
    }

    setIsSubmittingPayout(true);
    try {
      const response = await fetch('/api/payroll/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser?.role || 'admin',
          'x-user-email': currentUser?.email || '',
          'x-user-name': currentUser?.name || 'Admin'
        },
        body: JSON.stringify({
          employeeId: selectedEmpForPayout.id,
          payoutAmount: amount,
          paymentMethod,
          notes: payoutNotes,
          processedBy: currentUser?.name || 'Administrator',
          userRole: currentUser?.role || 'admin',
          userEmail: currentUser?.email || ''
        })
      });

      const data = await response.json();
      if (data.success && data.transaction) {
        setSuccessBanner(data.message || `Payout of ₹${amount.toLocaleString()} processed successfully.`);
        setSelectedEmpForPayout(null);

        // Open Success Notification Preview Modal
        setPayoutSuccessModal({
          employeeName: selectedEmpForPayout.name,
          role: selectedEmpForPayout.role,
          payoutAmount: amount,
          payoutType: data.transaction.payoutType,
          previousBalance: data.transaction.previousDueBalance,
          remainingBalance: data.transaction.remainingDueBalance,
          cycleNumber: data.transaction.cycleNumber || selectedEmpForPayout.currentCycle.cycleNumber,
          cycleDateRange: data.transaction.cycleDateRange || `${selectedEmpForPayout.currentCycle.startDateFormatted} – ${selectedEmpForPayout.currentCycle.endDateFormatted}`,
          employeePhone: selectedEmpForPayout.phone,
          smsNotification: data.smsNotification,
          whatsappUrl: data.whatsappUrl
        });

        fetchPayrollData();
        setTimeout(() => setSuccessBanner(null), 8000);
      } else {
        setOverpaymentError(data.error || 'Failed to process payout. Please try again.');
      }
    } catch (err) {
      console.error('Payout failed:', err);
      setOverpaymentError('Network error while processing payout transaction.');
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  // Copy SMS Notification helper
  const copySmsText = () => {
    if (payoutSuccessModal) {
      navigator.clipboard.writeText(payoutSuccessModal.smsNotification);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2500);
    }
  };

  // If user is neither Admin nor Manager, render restricted screen
  if (!isAuthorized) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6 text-center text-slate-100" id="payroll-restricted">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 shadow-2xl space-y-4">
          <div className="w-16 h-16 mx-auto bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-400">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white">Access Restricted: Admin & Manager Only</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Payout viewing, salary approval, and partial payout execution permissions are strictly restricted to <span className="text-sky-400 font-bold">Admin</span> and <span className="text-amber-400 font-bold">Manager</span> roles.
          </p>
          <div className="pt-2 text-xs font-mono text-slate-500">
            Current Session: {currentUser?.name} ({currentUser?.role})
          </div>
        </div>
      </div>
    );
  }

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    if (statusFilter === 'due') return emp.settlementStatus === 'Settlement Due' || emp.totalDueBalance > 0;
    if (statusFilter === 'active') return emp.currentCycle.daysRemaining > 0;
    return true;
  });

  // Financial aggregates
  const totalDueAll = employees.reduce((sum, e) => sum + e.totalDueBalance, 0);
  const totalBaseAll = employees.reduce((sum, e) => sum + e.accumulatedBaseSalary, 0);
  const totalIncentivesAll = employees.reduce((sum, e) => sum + e.accumulatedLiveIncentives, 0);
  const totalHistoricPaid = historyLogs.reduce((sum, h) => sum + (Number(h.payoutAmount || h.totalPaid) || 0), 0);
  const settlementDueCount = employees.filter(e => e.settlementStatus === 'Settlement Due').length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans text-slate-100" id="payroll-panel">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#b8862f]/10 border border-[#b8862f]/20 rounded-xl text-[#b8862f]">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                <span>Employee Payroll & Partial Payout Management</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-full uppercase">
                  Admin & Manager Access
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Centralized 30-day salary cycle tracking, live incentive balances, partial payout engine, and ledger history.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchPayrollData}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-sm flex items-center gap-3 animate-in slide-in-from-top-3 duration-300 shadow-xl">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="font-semibold">{successBanner}</span>
        </div>
      )}

      {/* Financial Overview Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1c1b1a] p-5 rounded-2xl border border-[#2a2826] shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Due Balance</span>
            <span className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-amber-400">
            ₹{totalDueAll.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400">
            Pending disbursements across {employees.length} active staff
          </p>
        </div>

        <div className="bg-[#1c1b1a] p-5 rounded-2xl border border-[#2a2826] shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Accumulated Base Salaries</span>
            <span className="p-1.5 bg-sky-500/10 text-sky-400 rounded-lg">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-white">
            ₹{totalBaseAll.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400">
            Across ongoing 30-day salary cycles
          </p>
        </div>

        <div className="bg-[#1c1b1a] p-5 rounded-2xl border border-[#2a2826] shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Live Incentives Earned</span>
            <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-400">
            ₹{totalIncentivesAll.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400">
            From verified orders (+₹50 products / +₹30 pending)
          </p>
        </div>

        <div className="bg-[#1c1b1a] p-5 rounded-2xl border border-[#2a2826] shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Historical Disbursements</span>
            <span className="p-1.5 bg-[#b8862f]/10 text-[#b8862f] rounded-lg">
              <History className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-white">
            ₹{totalHistoricPaid.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400">
            Recorded in ledger ({historyLogs.length} transactions)
          </p>
        </div>
      </div>

      {/* Centralized Employee Directory & 30-Day Cycle Table Section */}
      <div className="bg-[#1c1b1a] rounded-3xl border border-[#2a2826] shadow-2xl overflow-hidden space-y-4">
        {/* Table Controls Header */}
        <div className="p-6 border-b border-[#2a2826] flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#141312]/60">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#b8862f]" />
              <span>Centralized Staff Salary & Incentive Directory</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Each employee salary cycle initiates on their joining date and recurs in exact 30-day windows.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search employee or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#b8862f] w-56 font-mono"
              />
            </div>

            {/* Filter Toggle */}
            <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  statusFilter === 'all' ? 'bg-[#b8862f] text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({employees.length})
              </button>
              <button
                onClick={() => setStatusFilter('due')}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  statusFilter === 'due' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Settlement Due ({settlementDueCount})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  statusFilter === 'active' ? 'bg-sky-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Active Cycles
              </button>
            </div>
          </div>
        </div>

        {/* Centralized Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-16 text-center text-slate-400 flex items-center justify-center space-x-3">
              <RefreshCw className="w-6 h-6 animate-spin text-[#b8862f]" />
              <span className="text-sm font-semibold">Calculating 30-day salary cycles & live incentives...</span>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-16 text-center text-slate-500">
              No employees match the selected criteria.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#141312] border-b border-[#2a2826] text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Employee & Role</th>
                  <th className="px-6 py-4">Joining Date</th>
                  <th className="px-6 py-4">Current 30-Day Cycle</th>
                  <th className="px-6 py-4">Accumulated Base</th>
                  <th className="px-6 py-4">Live Incentives</th>
                  <th className="px-6 py-4">Total Due Balance</th>
                  <th className="px-6 py-4 text-right">Payout Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2826] text-slate-300 text-sm">
                {filteredEmployees.map(emp => {
                  const hasOverdue = emp.settlementStatus === 'Settlement Due';
                  const cycleProgressPercent = Math.min(100, Math.round((emp.currentCycle.daysElapsed / 30) * 100));

                  return (
                    <tr key={emp.id} className="hover:bg-white/[0.02] transition duration-150">
                      {/* 1. Employee Name & Contact */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#b8862f]/10 border border-[#b8862f]/20 flex items-center justify-center text-[#b8862f] font-bold text-sm shrink-0">
                            {emp.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-white block text-sm">{emp.name}</span>
                            <span className="text-xs text-slate-400 font-mono block">
                              {emp.role}
                            </span>
                            {emp.phone && (
                              <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                <Smartphone className="w-3 h-3 text-slate-400" /> +91 {emp.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Mandatory Joining Date */}
                      <td className="px-6 py-4 font-mono text-xs">
                        <span className="text-slate-200 font-bold block">{emp.joining_date}</span>
                        <span className="text-[10px] text-slate-500 block">Cycle Baseline</span>
                      </td>

                      {/* 3. 30-Day Recurring Cycle Dates & Progress */}
                      <td className="px-6 py-4">
                        <div className="space-y-1.5 min-w-[210px]">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-sky-400 font-mono">
                              Cycle #{emp.currentCycle.cycleNumber}
                            </span>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold ${
                              hasOverdue 
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            }`}>
                              {hasOverdue ? 'Settlement Due' : `${emp.currentCycle.daysRemaining} days left`}
                            </span>
                          </div>

                          <div className="text-[11px] font-mono text-slate-300">
                            {emp.currentCycle.startDateFormatted} – {emp.currentCycle.endDateFormatted}
                          </div>

                          {/* Progress bar of current 30-day window */}
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                hasOverdue ? 'bg-amber-400' : 'bg-sky-400'
                              }`} 
                              style={{ width: `${cycleProgressPercent}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            Day {emp.currentCycle.daysElapsed} of 30 elapsed
                          </span>
                        </div>
                      </td>

                      {/* 4. Accumulated Base Salary */}
                      <td className="px-6 py-4 font-mono text-xs">
                        <span className="text-base font-bold text-white block">
                          ₹{emp.accumulatedBaseSalary.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Rate: ₹{emp.baseSalaryRate.toLocaleString()} / 30d
                        </span>
                      </td>

                      {/* 5. Accumulated Live Incentives */}
                      <td className="px-6 py-4 font-mono text-xs">
                        <span className="text-base font-bold text-emerald-400 block">
                          +₹{emp.accumulatedLiveIncentives.toLocaleString()}
                        </span>
                        <div className="text-[10px] text-slate-400 space-y-0.5 mt-0.5 font-sans">
                          <span className="block text-slate-300">
                            {emp.liveIncentivesBreakdown.immediateProductCount} orders w/ products (+₹{emp.liveIncentivesBreakdown.immediateProductAmount})
                          </span>
                          <span className="block text-slate-400">
                            {emp.liveIncentivesBreakdown.pendingItemCount} pending/advance orders (+₹{emp.liveIncentivesBreakdown.pendingItemAmount})
                          </span>
                        </div>
                      </td>

                      {/* 6. Current Total Due Balance */}
                      <td className="px-6 py-4 font-mono">
                        <div className="space-y-0.5">
                          <span className={`text-lg font-black block ${
                            emp.totalDueBalance > 0 ? 'text-amber-400' : 'text-slate-400'
                          }`}>
                            ₹{emp.totalDueBalance.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-500 block font-sans">
                            Gross: ₹{emp.totalGrossEarned.toLocaleString()} • Paid: ₹{emp.totalPastPaid.toLocaleString()}
                          </span>
                        </div>
                      </td>

                      {/* 7. Action Buttons */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewHistoryEmp(emp)}
                            title="View past payment history logs"
                            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded-xl border border-slate-700/80 transition flex items-center gap-1 cursor-pointer"
                          >
                            <History className="w-3.5 h-3.5 text-sky-400" />
                            <span>Logs</span>
                          </button>

                          <button
                            onClick={() => handleOpenPayout(emp)}
                            disabled={emp.totalDueBalance <= 0}
                            className={`px-3.5 py-2 font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer ${
                              emp.totalDueBalance <= 0
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/40'
                                : hasOverdue
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
                                : 'bg-[#b8862f] hover:bg-[#a37628] text-white'
                            }`}
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>{emp.totalDueBalance <= 0 ? 'Settled' : 'Process Payout'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Centralized Past Payment Logs Ledger Table */}
      <div className="bg-[#1c1b1a] rounded-3xl border border-[#2a2826] shadow-xl overflow-hidden space-y-4">
        <div className="p-6 border-b border-[#2a2826] flex items-center justify-between bg-[#141312]/60">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-sky-400" />
              <span>Centralized Payout & Partial Payment Ledger Logs</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Historical transaction log tracking all full and partial disbursements with audit timestamps.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
            {historyLogs.length} Transactions
          </span>
        </div>

        <div className="overflow-x-auto">
          {historyLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No payout transactions recorded in the ledger yet.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#141312] border-b border-[#2a2826] text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Transaction ID</th>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Payout Amount</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Balance Deduction</th>
                  <th className="px-6 py-4">Cycle Reference</th>
                  <th className="px-6 py-4">Timestamp & Date</th>
                  <th className="px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2826] text-slate-300 text-xs">
                {historyLogs.map(item => {
                  const amt = Number(item.payoutAmount !== undefined ? item.payoutAmount : item.totalPaid) || 0;
                  const prev = item.previousDueBalance !== undefined ? item.previousDueBalance : (amt + (item.remainingDueBalance || 0));
                  const rem = item.remainingDueBalance !== undefined ? item.remainingDueBalance : 0;

                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition">
                      <td className="px-6 py-4 font-mono text-slate-400 text-[11px]">
                        {item.id}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-white block">{item.employeeName}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">{item.role}</span>
                      </td>
                      <td className="px-6 py-4 font-mono font-black text-emerald-400 text-sm">
                        ₹{amt.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-mono">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          item.payoutType === 'Partial Payout'
                            ? 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        }`}>
                          {item.payoutType || 'Settlement'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-[11px]">
                        <span className="text-slate-400 block">From: ₹{prev.toLocaleString()}</span>
                        <span className="text-amber-400 font-bold block">Remaining: ₹{rem.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-[11px] text-slate-300">
                        {item.cycleDateRange || item.month || '30-Day Window'}
                      </td>
                      <td className="px-6 py-4 font-mono text-[11px] text-slate-400">
                        {item.payoutDate}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          PAID
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* CUSTOM PARTIAL PAYOUT MODAL WITH STRICT OVERPAYMENT VALIDATION */}
      {/* ------------------------------------------------------------- */}
      {selectedEmpForPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#1c1b1a] border border-[#2a2826] w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-150 text-left">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#2a2826] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#b8862f]/10 border border-[#b8862f]/20 rounded-2xl text-[#b8862f]">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">
                    Process Payout: {selectedEmpForPayout.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {selectedEmpForPayout.role} • 30-Day Cycle #{selectedEmpForPayout.currentCycle.cycleNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmpForPayout(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Financial Summary Card */}
            <div className="bg-[#141312] border border-[#2a2826] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#2a2826] pb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Current Total Due Balance
                </span>
                <span className="text-2xl font-black font-mono text-amber-400">
                  ₹{selectedEmpForPayout.totalDueBalance.toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block">Accumulated Base</span>
                  <span className="text-white font-bold">₹{selectedEmpForPayout.accumulatedBaseSalary.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Live Incentives</span>
                  <span className="text-emerald-400 font-bold">+₹{selectedEmpForPayout.accumulatedLiveIncentives.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Historical Paid</span>
                  <span className="text-slate-300">₹{selectedEmpForPayout.totalPastPaid.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Cycle Window</span>
                  <span className="text-sky-400">{selectedEmpForPayout.currentCycle.startDateFormatted} – {selectedEmpForPayout.currentCycle.endDateFormatted}</span>
                </div>
              </div>
            </div>

            {/* Custom Partial Amount Input Form */}
            <form onSubmit={handleSubmitPayout} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                  <span>Custom Payout Amount (₹)</span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Max: ₹{selectedEmpForPayout.totalDueBalance.toLocaleString()}
                  </span>
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-lg font-bold">₹</span>
                  <input
                    type="number"
                    min="1"
                    max={selectedEmpForPayout.totalDueBalance}
                    required
                    value={payoutInputAmount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 bg-[#141312] border border-[#2a2826] focus:border-[#b8862f] rounded-2xl text-xl font-mono font-black text-white focus:outline-none transition"
                    placeholder="Enter custom amount..."
                  />
                </div>

                {/* Quick Percentage Presets */}
                <div className="flex gap-2 pt-1">
                  {[25, 50, 75, 100].map(pct => (
                    <button
                      type="button"
                      key={pct}
                      onClick={() => handleQuickPreset(pct)}
                      className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono font-bold rounded-xl border border-slate-800 transition cursor-pointer"
                    >
                      {pct === 100 ? 'Full Settlement' : `${pct}%`}
                    </button>
                  ))}
                </div>

                {/* Overpayment Strict Validation Alert */}
                {overpaymentError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2 animate-in fade-in duration-200">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{overpaymentError}</span>
                  </div>
                )}
              </div>

              {/* Dynamic Balance Deduction Preview */}
              {Number(payoutInputAmount) > 0 && Number(payoutInputAmount) <= selectedEmpForPayout.totalDueBalance && (
                <div className="p-3.5 bg-sky-500/10 border border-sky-500/20 rounded-2xl text-xs font-mono space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span>Due Balance Before:</span>
                    <span className="text-white">₹{selectedEmpForPayout.totalDueBalance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>Deduction (Paying Now):</span>
                    <span>-₹{Number(payoutInputAmount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-amber-400 font-bold border-t border-sky-500/20 pt-1">
                    <span>Remaining Due Balance:</span>
                    <span>₹{(selectedEmpForPayout.totalDueBalance - Number(payoutInputAmount)).toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Payment Method Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Payment Channel</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#141312] border border-[#2a2826] rounded-xl text-xs text-white outline-none focus:border-[#b8862f]"
                >
                  <option value="Bank Transfer / NEFT">Bank Transfer / NEFT</option>
                  <option value="UPI / PhonePe / GPay">UPI / PhonePe / GPay</option>
                  <option value="IMPS Express">IMPS Express Transfer</option>
                  <option value="Cash Disbursement">Cash Disbursement</option>
                  <option value="Company Cheque">Company Cheque</option>
                </select>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Transaction Notes / Reference</label>
                <input
                  type="text"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  placeholder="e.g. Cycle partial settlement"
                  className="w-full px-4 py-2 bg-[#141312] border border-[#2a2826] rounded-xl text-xs text-white outline-none focus:border-[#b8862f] font-mono"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedEmpForPayout(null)}
                  className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayout || Boolean(overpaymentError) || Number(payoutInputAmount) <= 0}
                  className="flex-1 px-4 py-3 bg-[#b8862f] hover:bg-[#a37628] disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmittingPayout ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Confirm & Disburse ₹{Number(payoutInputAmount || 0).toLocaleString()}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* EMPLOYEE PAST PAYMENT LOGS DRAWER / MODAL */}
      {/* ------------------------------------------------------------- */}
      {viewHistoryEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#1c1b1a] border border-[#2a2826] w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center justify-between border-b border-[#2a2826] pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-sky-400" />
                  <span>Payment History: {viewHistoryEmp.name}</span>
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Joined {viewHistoryEmp.joining_date} • Rate: ₹{viewHistoryEmp.baseSalaryRate.toLocaleString()}/30d
                </p>
              </div>
              <button
                onClick={() => setViewHistoryEmp(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {viewHistoryEmp.payoutLogs && viewHistoryEmp.payoutLogs.length > 0 ? (
                viewHistoryEmp.payoutLogs.map(log => {
                  const amt = Number(log.payoutAmount !== undefined ? log.payoutAmount : log.totalPaid) || 0;
                  return (
                    <div key={log.id} className="p-4 bg-[#141312] border border-[#2a2826] rounded-2xl flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white font-mono">₹{amt.toLocaleString()}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-md">
                            {log.payoutType || 'Payment'}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 block font-mono">
                          {log.payoutDate} • via {log.paymentMethod || 'Transfer'}
                        </span>
                        {log.notes && (
                          <span className="text-[11px] text-slate-500 block italic">"{log.notes}"</span>
                        )}
                      </div>
                      <div className="text-right font-mono text-xs">
                        <span className="text-slate-500 block text-[10px]">Remaining Due</span>
                        <span className="text-amber-400 font-bold">
                          ₹{Number(log.remainingDueBalance || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center text-slate-500 text-xs">
                  No previous disbursements recorded for this employee.
                </div>
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setViewHistoryEmp(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PAYOUT SUCCESS & MOBILE SMS / WHATSAPP NOTIFICATION MODAL */}
      {/* ------------------------------------------------------------- */}
      {payoutSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#1c1b1a] border border-[#2a2826] w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 text-left animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">
                    Payout Disbursed Successfully!
                  </h3>
                  <p className="text-xs text-emerald-400 font-medium font-mono">
                    {payoutSuccessModal.payoutType}: ₹{payoutSuccessModal.payoutAmount.toLocaleString()} credited
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setPayoutSuccessModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payout Details Card */}
            <div className="bg-[#141312] border border-[#2a2826] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#2a2826] pb-2">
                <div>
                  <span className="text-xs text-slate-400 block">Beneficiary</span>
                  <span className="text-base font-bold text-white">{payoutSuccessModal.employeeName}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Amount Paid</span>
                  <span className="text-xl font-black font-mono text-emerald-400">
                    ₹{payoutSuccessModal.payoutAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block">Previous Balance</span>
                  <span className="text-slate-300 font-bold">₹{payoutSuccessModal.previousBalance.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">New Remaining Balance</span>
                  <span className="text-amber-400 font-bold">₹{payoutSuccessModal.remainingBalance.toLocaleString()}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">30-Day Cycle Reference</span>
                  <span className="text-sky-400">Cycle #{payoutSuccessModal.cycleNumber} ({payoutSuccessModal.cycleDateRange})</span>
                </div>
              </div>
            </div>

            {/* Mobile SMS Notification Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                  <span>SMS Notification (+91 {payoutSuccessModal.employeePhone || 'Mobile'})</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">Ready to Dispatch</span>
              </div>
              <div className="bg-[#141312] p-3.5 rounded-2xl border border-[#2a2826] text-xs text-slate-300 font-mono leading-relaxed select-all">
                {payoutSuccessModal.smsNotification}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {payoutSuccessModal.whatsappUrl && (
                <a
                  href={payoutSuccessModal.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send via WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                onClick={copySmsText}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedMessage ? <Check className="w-4 h-4 text-emerald-400" /> : <Send className="w-4 h-4 text-sky-400" />}
                <span>{copiedMessage ? 'Copied Text!' : 'Copy SMS'}</span>
              </button>
              <button
                onClick={() => setPayoutSuccessModal(null)}
                className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
