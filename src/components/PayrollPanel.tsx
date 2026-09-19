import React, { useState, useEffect } from 'react';
import { 
  Wallet, Search, CheckCircle2, AlertCircle, RefreshCw, 
  Calendar, ArrowUpRight, ShieldAlert, FileSpreadsheet, 
  FileText, Activity, CreditCard, History, Check,
  Smartphone, Send, MessageSquare, ExternalLink, X, Sparkles
} from 'lucide-react';

interface PayrollEntry {
  id: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
  salary: number;
  incentives: number;
  deductions: number;
  totalPayout: number;
  status: 'Paid' | 'Processing' | 'Pending';
  month: string;
  disbursedDate: string;
  daysUntilNextDue?: number;
  nextDueDateStr?: string;
  cycleNotice?: string;
  lastResetDate?: string;
  breakdown: {
    confirmedCount: number;
    commission: number;
    productAdvanceCount?: number;
  };
}

interface PayrollHistoryEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  month: string;
  salaryAmount: number;
  incentiveAmount: number;
  totalPaid: number;
  payoutDate: string;
  status: 'Paid';
  notes?: string;
  phone?: string;
  recountFrom?: string;
}

interface CronLog {
  timestamp: string;
  type: string;
  message: string;
}

interface PayoutSuccessModalData {
  employeeName: string;
  role: string;
  totalPaid: number;
  salaryAmount: number;
  incentiveAmount: number;
  month: string;
  employeePhone: string;
  recountFrom: string;
  smsNotification: string;
  whatsappUrl: string;
}

const EXCLUDED_FROM_PAYROLL_AND_INCENTIVES = new Set([
  'hema',
  'shashikala',
  'shravya',
  'harika',
  'rani'
]);

function isExcluded(nameOrEmail?: string): boolean {
  if (!nameOrEmail) return false;
  const str = nameOrEmail.toLowerCase().trim();
  for (const ex of EXCLUDED_FROM_PAYROLL_AND_INCENTIVES) {
    if (str === ex || str.startsWith(ex)) return true;
  }
  return false;
}

export default function PayrollPanel() {
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [historyLogs, setHistoryLogs] = useState<PayrollHistoryEntry[]>([]);
  const [automationLogs, setAutomationLogs] = useState<CronLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState('July 2026');
  
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [payoutSuccessModal, setPayoutSuccessModal] = useState<PayoutSuccessModalData | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);

  // Fetch ledger and history
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/payroll?month=${filterMonth}`);
      const data = await res.json();
      if (data.payroll) {
        setEntries(data.payroll.filter((e: any) => !isExcluded(e.name) && !isExcluded(e.email)));
      }
      if (data.history) {
        setHistoryLogs(data.history.filter((h: any) => !isExcluded(h.employeeName)));
      }

      const logsRes = await fetch('/api/payroll/automation-status');
      const logsData = await logsRes.json();
      if (logsData.logs) {
        setAutomationLogs(logsData.logs);
      }
    } catch (err) {
      console.error('Failed to fetch payroll data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(async () => {
      try {
        const logsRes = await fetch('/api/payroll/automation-status');
        const logsData = await logsRes.json();
        if (logsData.logs) {
          setAutomationLogs(logsData.logs);
        }
      } catch (e) {}
    }, 15000);
    return () => clearInterval(interval);
  }, [filterMonth]);

  const formatLocalDateTime = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const getNextMinuteDate = () => {
    const now = new Date();
    return new Date(Math.floor(now.getTime() / 60000 + 1) * 60000);
  };

  // Handle individual salary approval
  const handleApproveIndividualSalary = async (entry: PayrollEntry) => {
    const nextMinuteDate = getNextMinuteDate();
    const defaultNextMinuteStr = formatLocalDateTime(nextMinuteDate);
    const customDate = window.prompt(
      `Approve monthly salary payout for ${entry.name} (${filterMonth}).\n\nOrder recounting will begin fresh from next minute: ${defaultNextMinuteStr}\n(You can edit if you need a specific custom date & time):`,
      defaultNextMinuteStr
    );
    if (!customDate) return;

    const finalDate = customDate.trim() || defaultNextMinuteStr;

    if (window.confirm(`Approve & process salary payout of ₹${entry.totalPayout.toLocaleString()} (Salary: ₹${entry.salary.toLocaleString()} + Incentives: ₹${entry.incentives.toLocaleString()}) for ${entry.name}?\n\n• Payout will be recorded\n• Order counter will start recounting fresh from: ${finalDate}`)) {
      try {
        setProcessingId(entry.id);
        const response = await fetch('/api/payroll/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: entry.id,
            employeeName: entry.name,
            role: entry.role,
            month: filterMonth,
            salaryAmount: entry.salary,
            incentiveAmount: entry.incentives,
            totalPaid: entry.totalPayout,
            date: finalDate,
            resetDate: finalDate,
            notes: `Salary disbursed for ${filterMonth} on ${finalDate}`
          })
        });
        const data = await response.json();
        if (data.success) {
          const empPhone = data.employeePhone || entry.phone || '';
          const recountFrom = data.recountFrom || finalDate;
          const smsText = data.smsNotification || `Dear ${entry.name}, your salary of ₹${entry.totalPayout.toLocaleString()} for ${filterMonth} has been credited successfully to your account. (Base Salary: ₹${entry.salary.toLocaleString()} + Incentives: ₹${entry.incentives.toLocaleString()}). Next cycle begins from ${recountFrom}. - Dappersfit Logistics`;

          let cleanPhone = empPhone.replace(/\D/g, '');
          if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
          const whatsapp = data.whatsappUrl || (cleanPhone ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(smsText)}` : '');

          setPayoutSuccessModal({
            employeeName: entry.name,
            role: entry.role,
            totalPaid: entry.totalPayout,
            salaryAmount: entry.salary,
            incentiveAmount: entry.incentives,
            month: filterMonth,
            employeePhone: empPhone,
            recountFrom: recountFrom,
            smsNotification: smsText,
            whatsappUrl: whatsapp
          });

          setSuccessMessage(`Your salary is credited successfully! ₹${entry.totalPayout.toLocaleString()} disbursed to ${entry.name}. Recounting starts fresh from ${recountFrom}.`);
          fetchData();
          setTimeout(() => setSuccessMessage(null), 8000);
        }
      } catch (err) {
        console.error('Individual salary approval failed:', err);
      } finally {
        setProcessingId(null);
      }
    }
  };

  const handleCustomResetDate = async (entry: PayrollEntry) => {
    const nextMinuteDate = getNextMinuteDate();
    const defaultNextMinuteStr = formatLocalDateTime(nextMinuteDate);
    const chosenDate = window.prompt(
      `Set custom salary & incentive cycle start date & time for ${entry.name}:\nOrders confirmed on or after this date will be counted for incentives & salary.\n(Default: Next minute ${defaultNextMinuteStr})`,
      defaultNextMinuteStr
    );
    if (!chosenDate) return;

    const finalDate = chosenDate.trim() || defaultNextMinuteStr;

    try {
      setProcessingId(entry.id);
      const res = await fetch('/api/employees/reset-date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: entry.id,
          resetDate: finalDate
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Cycle start date updated for ${entry.name}! Counts reset fresh starting from ${data.lastResetDate}.`);
        fetchData();
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (err) {
      console.error('Failed to update reset date:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const copySmsText = () => {
    if (payoutSuccessModal) {
      navigator.clipboard.writeText(payoutSuccessModal.smsNotification);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2500);
    }
  };

  // Compute stats
  const totalHistoricSalaryPaid = historyLogs.reduce((sum, h) => sum + h.totalPaid, 0);
  const pendingWagesCount = entries.filter(e => e.status === 'Pending').length;
  const pendingWagesAmount = entries.filter(e => e.status === 'Pending').reduce((sum, e) => sum + e.totalPayout, 0);
  const avgBaseSalary = entries.length > 0 
    ? Math.round(entries.reduce((sum, e) => sum + e.salary, 0) / entries.length)
    : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans text-slate-100" id="payroll-panel">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <span>Payroll & Monthly Salary Management</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Process and approve individual employee salaries, send mobile notifications, and start recounting fresh from the next minute.</p>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center gap-2 animate-in slide-in-from-top-4 duration-300 shadow-lg">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-xl flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Total Historic Salary Paid</span>
            <span className="text-2xl font-black font-mono text-white">₹{totalHistoricSalaryPaid.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-xl flex items-center space-x-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Pending Salary ({pendingWagesCount})</span>
            <span className="text-2xl font-black font-mono text-amber-400">₹{pendingWagesAmount.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-xl flex items-center space-x-4">
          <div className="p-3 bg-sky-500/10 text-sky-400 rounded-lg">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Average Base Salary</span>
            <span className="text-2xl font-black font-mono text-white">₹{avgBaseSalary.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Ledger Table Section */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
        <div className="px-6 py-4 bg-slate-900/60 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-sky-400" />
            <h3 className="font-extrabold text-sm text-slate-300 uppercase tracking-wider">Active Monthly Payroll Ledger</h3>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {['June 2026', 'July 2026', 'August 2026'].map(m => (
              <button
                key={m}
                onClick={() => setFilterMonth(m)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filterMonth === m ? 'bg-sky-500 text-slate-950 font-bold' : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex items-center justify-center space-x-2">
              <RefreshCw className="w-5 h-5 animate-spin text-sky-400" />
              <span>Loading payroll ledger...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              No active employees found in the monthly payroll ledger.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-700 text-xs font-mono uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Period</th>
                  <th className="px-6 py-4">Base Wage</th>
                  <th className="px-6 py-4">Active Weekly Incentives</th>
                  <th className="px-6 py-4">Total Net Pay</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Individual Approval Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700 text-slate-300 text-sm">
                {entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-700/30 transition duration-150">
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-200 block">{entry.name}</span>
                      <span className="text-xs text-slate-400 font-mono block mt-0.5">{entry.role}</span>
                      {entry.phone && (
                        <span className="text-[11px] text-emerald-400/90 font-mono block mt-0.5 flex items-center gap-1">
                          <Smartphone className="w-3 h-3" /> +91 {entry.phone}
                        </span>
                      )}
                      <span className="text-[10px] text-sky-400 font-mono block mt-0.5">Cycle: {entry.lastResetDate}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{entry.month}</td>
                    <td className="px-6 py-4 font-mono font-semibold">₹{entry.salary.toLocaleString()}</td>
                    <td className="px-6 py-4 font-mono text-emerald-400">
                      +₹{entry.incentives.toLocaleString()}
                      <span className="text-[10px] text-slate-400 block font-sans">
                        {entry.breakdown.confirmedCount} order{entry.breakdown.confirmedCount !== 1 ? 's' : ''} in active cycle
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-white text-base">₹{entry.totalPayout.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2.5 py-0.5 text-[10px] font-mono border font-semibold rounded-full uppercase tracking-wider w-fit ${
                          entry.status === 'Paid' 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                        }`}>
                          {entry.status === 'Paid' ? `PAID (${entry.disbursedDate})` : 'PAYMENT DUE'}
                        </span>
                        {entry.cycleNotice && (
                          <span className="text-[11px] text-slate-400 font-sans leading-tight">
                            {entry.cycleNotice}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleCustomResetDate(entry)}
                          title="Set custom date & time to reset counter"
                          className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg transition border border-slate-600 flex items-center space-x-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3 text-sky-400" />
                          <span>Reset Cycle</span>
                        </button>
                        <button
                          onClick={() => handleApproveIndividualSalary(entry)}
                          disabled={processingId === entry.id}
                          className={`px-4 py-2 font-extrabold text-xs rounded-xl shadow-lg transition flex items-center space-x-1.5 cursor-pointer ${
                            entry.status === 'Paid'
                              ? 'bg-slate-700 hover:bg-slate-600 text-emerald-400 border border-emerald-500/30'
                              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                          }`}
                        >
                          {processingId === entry.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CreditCard className="w-3.5 h-3.5" />
                          )}
                          <span>{entry.status === 'Paid' ? 'Re-Approve / Reset' : 'Approve & Pay Salary'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Salary Payout History Log */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-white uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-sky-400" />
            <span>Salary Payout History Log</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">{historyLogs.length} Records</span>
        </div>

        <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-700 text-xs font-mono uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Period</th>
                  <th className="px-6 py-4">Base Salary</th>
                  <th className="px-6 py-4">Incentives</th>
                  <th className="px-6 py-4">Total Paid</th>
                  <th className="px-6 py-4">Payout Date</th>
                  <th className="px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700 text-slate-300 text-sm">
                {historyLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                      No previous salary payout logs recorded yet. Approve a monthly salary above to save history.
                    </td>
                  </tr>
                ) : (
                  historyLogs.map(item => (
                    <tr key={item.id} className="hover:bg-slate-700/30 transition duration-150">
                      <td className="px-6 py-4 font-bold text-slate-200">
                        <span>{item.employeeName}</span>
                        <span className="text-[10px] font-mono text-slate-400 block">{item.role}</span>
                        {item.phone && (
                          <span className="text-[10px] font-mono text-slate-400 block">+91 {item.phone}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-300">{item.month}</td>
                      <td className="px-6 py-4 font-mono text-slate-300">₹{item.salaryAmount.toLocaleString()}</td>
                      <td className="px-6 py-4 font-mono text-emerald-400">+₹{item.incentiveAmount.toLocaleString()}</td>
                      <td className="px-6 py-4 font-mono font-bold text-emerald-400">₹{item.totalPaid.toLocaleString()}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">{item.payoutDate}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="px-2.5 py-0.5 text-[10px] font-mono border font-semibold rounded-full uppercase tracking-wider bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Cron Automation Status Section */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-850 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#d4af37]" />
            <h3 className="font-extrabold text-base text-white">Live Automation & System Logs</h3>
          </div>
          <span className="px-2.5 py-1 text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-lg flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active Sync Listener</span>
          </span>
        </div>

        <div className="bg-slate-950 rounded-xl p-4 border border-slate-850/80 font-mono text-xs text-slate-300 max-h-48 overflow-y-auto space-y-2">
          {automationLogs.length === 0 ? (
            <div className="text-center text-slate-500 py-4">Loading background logging logs...</div>
          ) : (
            automationLogs.map((log, idx) => (
              <div key={idx} className="flex gap-4 border-b border-slate-900/50 pb-1.5 last:border-0 hover:bg-slate-900/10 p-1 rounded">
                <span className="text-slate-500 shrink-0">[{log.timestamp.slice(11, 19)}]</span>
                <span className={`font-bold shrink-0 ${log.type === 'Weekly Incentives' ? 'text-sky-400' : 'text-emerald-400'}`}>
                  {log.type}
                </span>
                <span className="text-slate-300 leading-relaxed">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Payout Success & Mobile SMS Notification Modal */}
      {payoutSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-5 text-left animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <span>Salary Credited Successfully!</span>
                  </h3>
                  <p className="text-xs text-emerald-400 font-medium">Your salary is credited successfully</p>
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
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div>
                  <span className="text-xs text-slate-400 block">Employee</span>
                  <span className="text-base font-bold text-white">{payoutSuccessModal.employeeName}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Total Credited</span>
                  <span className="text-xl font-black font-mono text-emerald-400">₹{payoutSuccessModal.totalPaid.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block">Base Salary</span>
                  <span className="text-slate-200 font-bold">₹{payoutSuccessModal.salaryAmount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Performance Bonus</span>
                  <span className="text-emerald-400 font-bold">+₹{payoutSuccessModal.incentiveAmount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Period</span>
                  <span className="text-slate-300">{payoutSuccessModal.month}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Recounting Starts</span>
                  <span className="text-sky-400 font-bold">{payoutSuccessModal.recountFrom}</span>
                </div>
              </div>
            </div>

            {/* Mobile SMS Notification Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                  <span>Mobile Notification (+91 {payoutSuccessModal.employeePhone || 'Registered Mobile'})</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">Ready to Send</span>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono leading-relaxed select-all">
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
                  <span>Send Message to Mobile (WhatsApp)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                onClick={copySmsText}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedMessage ? <Check className="w-4 h-4 text-emerald-400" /> : <Send className="w-4 h-4 text-sky-400" />}
                <span>{copiedMessage ? 'Copied Message!' : 'Copy SMS Text'}</span>
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
