import React, { useState, useEffect } from 'react';
import { 
  Gift, Zap, TrendingUp, Award, CheckCircle2, ChevronRight, 
  Calculator, RefreshCw, History, CreditCard, Smartphone, 
  Send, MessageSquare, ExternalLink, X, Check
} from 'lucide-react';
import { Order } from '../types';

interface IncentiveHistoryLog {
  id: string;
  employeeId: string;
  employeeName: string;
  paidAmount: number;
  orderCount: number;
  payoutDate: string;
  status: 'Paid';
  phone?: string;
  recountFrom?: string;
}

interface IncentiveSuccessModalData {
  employeeName: string;
  amount: number;
  orderCount: number;
  employeePhone: string;
  recountFrom: string;
  smsNotification: string;
  whatsappUrl: string;
}

const SCHEMES = [
  { id: 's0', title: 'Per-Order Confirmation Commission', desc: 'Incentive received for every order confirmed under the employee account during the active 1-week cycle. Earns ₹50 if Product Advance is checked, otherwise ₹30.', reward: '₹30 or ₹50 per order' }
];

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

interface IncentivesPanelProps {
  orders?: Order[];
}

export default function IncentivesPanel({ orders = [] }: IncentivesPanelProps) {
  const [employeesData, setEmployeesData] = useState<any[]>([]);
  const [historyLogs, setHistoryLogs] = useState<IncentiveHistoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [incentiveSuccessModal, setIncentiveSuccessModal] = useState<IncentiveSuccessModalData | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const fetchIncentivesData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/incentives');
      const data = await res.json();
      if (data.employees) {
        setEmployeesData(data.employees.filter((e: any) => !isExcluded(e.name) && !isExcluded(e.email)));
      }
      if (data.history) {
        setHistoryLogs(data.history.filter((h: any) => !isExcluded(h.employeeName)));
      }
    } catch (err) {
      console.error('Failed to load incentives data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncentivesData();
  }, []);

  const formatLocalDateTime = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const getNextMinuteDate = () => {
    const now = new Date();
    return new Date(Math.floor(now.getTime() / 60000 + 1) * 60000);
  };

  const handlePayIncentive = async (emp: any) => {
    const nextMinuteDate = getNextMinuteDate();
    const defaultNextMinuteStr = formatLocalDateTime(nextMinuteDate);

    if (emp.confirmedCount === 0 && emp.commission === 0) {
      if (!window.confirm(`Employee ${emp.name} currently has 0 orders in this weekly cycle. Do you still want to approve a ₹0 payout and reset the counter to recount fresh from the next minute (${defaultNextMinuteStr})?`)) {
        return;
      }
    }

    const chosenResetDate = window.prompt(
      `Approve weekly incentive payout for ${emp.name}.\n\nOrder recounting starts fresh from the NEXT MINUTE:\n${defaultNextMinuteStr}\n\n(You can edit this if you need a specific custom date & time):`,
      defaultNextMinuteStr
    );
    if (chosenResetDate === null) return;

    const finalResetDate = chosenResetDate.trim() || defaultNextMinuteStr;

    if (window.confirm(`Approve & pay weekly incentive of ₹${emp.commission.toLocaleString()} (${emp.confirmedCount} orders) for ${emp.name}?\n\n• Payout is recorded to history\n• Active counter resets and recounting begins fresh from: ${finalResetDate}`)) {
      try {
        setProcessingId(emp.id);
        const res = await fetch('/api/incentives/pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: emp.id,
            employeeName: emp.name,
            amount: emp.commission,
            orderCount: emp.confirmedCount,
            resetDate: finalResetDate
          })
        });
        const data = await res.json();
        if (data.success) {
          const empPhone = data.employeePhone || emp.phone || '';
          const recountFrom = data.recountFrom || finalResetDate;
          const smsText = data.smsNotification || `Dear ${emp.name}, your weekly incentive of ₹${emp.commission.toLocaleString()} (${emp.confirmedCount} orders) has been credited successfully to your account. Performance cycle begins fresh from ${recountFrom}. - Dappersfit Logistics`;

          let cleanPhone = empPhone.replace(/\D/g, '');
          if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
          const whatsapp = data.whatsappUrl || (cleanPhone ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(smsText)}` : '');

          setIncentiveSuccessModal({
            employeeName: emp.name,
            amount: emp.commission,
            orderCount: emp.confirmedCount,
            employeePhone: empPhone,
            recountFrom: recountFrom,
            smsNotification: smsText,
            whatsappUrl: whatsapp
          });

          setSuccessMessage(`Weekly incentive of ₹${emp.commission.toLocaleString()} approved for ${emp.name}! Order recounting starts fresh from ${recountFrom}.`);
          fetchIncentivesData();
          setTimeout(() => setSuccessMessage(null), 8000);
        }
      } catch (err) {
        console.error('Failed to pay incentive:', err);
      } finally {
        setProcessingId(null);
      }
    }
  };

  const handleCustomResetDate = async (emp: any) => {
    const nextMinuteDate = getNextMinuteDate();
    const defaultNextMinuteStr = formatLocalDateTime(nextMinuteDate);
    const chosenDate = window.prompt(
      `Set incentive cycle start date & time for ${emp.name}:\nOrders created/confirmed on or after this timestamp will be recounted.\n(Default: Next minute ${defaultNextMinuteStr})`,
      defaultNextMinuteStr
    );
    if (!chosenDate) return;

    try {
      setProcessingId(emp.id);
      const res = await fetch('/api/employees/reset-date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: emp.id,
          resetDate: chosenDate.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Incentive counter updated for ${emp.name}! Recounting fresh from ${data.lastResetDate}.`);
        fetchIncentivesData();
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (err) {
      console.error('Failed to update reset date:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const copySmsText = () => {
    if (incentiveSuccessModal) {
      navigator.clipboard.writeText(incentiveSuccessModal.smsNotification);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2500);
    }
  };

  const totalIncentivesDisbursed = historyLogs.reduce((sum, item) => sum + item.paidAmount, 0);
  const totalActiveCycleCommission = employeesData.reduce((sum, item) => sum + item.commission, 0);
  const totalActiveConfirmedOrders = employeesData.reduce((sum, item) => sum + item.confirmedCount, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans text-slate-100" id="incentives-panel">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Weekly Incentives & Commission Engine</h1>
        <p className="text-sm text-slate-400 mt-1">Track 1-week order fulfillment cycles per employee, approve individual payouts, and store historical incentive logs.</p>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center gap-2 animate-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-xl flex items-center space-x-4">
          <div className="p-3 bg-sky-500/10 text-sky-400 rounded-lg">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Total Historic Incentives Disbursed</span>
            <span className="text-2xl font-black font-mono text-white">₹{totalIncentivesDisbursed.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-xl flex items-center space-x-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Active Cycle Unpaid Bonus</span>
            <span className="text-2xl font-black font-mono text-amber-400">₹{totalActiveCycleCommission.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-xl flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Active Cycle Confirmed Orders</span>
            <span className="text-2xl font-black font-mono text-white">{totalActiveConfirmedOrders} orders</span>
          </div>
        </div>
      </div>

      {/* Real-time Weekly Commission Registry & Individual Approval */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden" id="employee-commission-registry">
        <div className="bg-slate-900/60 px-6 py-5 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-white">Active Weekly Cycle - Employee Commission Registry</h3>
            <p className="text-xs text-slate-400 mt-1">Calculates ₹30 (or ₹50 if Product Advance is checked) per confirmed order. Click "Pay / Approve Incentive" to disburse and reset active count to 0.</p>
          </div>
          <span className="px-3 py-1 text-xs font-bold font-mono text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-full flex items-center gap-1.5 self-start">
            <CheckCircle2 className="w-3.5 h-3.5" />
            1-Week Cycle Active
          </span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex items-center justify-center space-x-2">
              <RefreshCw className="w-5 h-5 animate-spin text-sky-400" />
              <span>Computing active weekly commissions...</span>
            </div>
          ) : employeesData.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              No active employees found to compute commission.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/40 border-b border-slate-700 text-xs font-mono uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Employee Name</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4 text-center">Active Cycle Orders</th>
                  <th className="px-6 py-4">Commission Breakdown</th>
                  <th className="px-6 py-4">Active Bonus Earned</th>
                  <th className="px-6 py-4 text-right">Approval Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700 text-slate-300 text-sm">
                {employeesData.map(item => (
                  <tr key={item.id} className="hover:bg-slate-700/20 transition">
                    <td className="px-6 py-4 font-bold text-slate-200">
                      <span>{item.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{item.lastResetDate}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{item.role}</td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-white">
                      <span className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-sm">
                        {item.confirmedCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      <div className="flex flex-col gap-0.5">
                        <span>{item.standardCount || 0} Standard × ₹30</span>
                        {item.productAdvanceCount > 0 && (
                          <span className="text-sky-400 font-sans font-semibold">
                            + {item.productAdvanceCount} Advance × ₹50
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-black text-emerald-400 text-base">
                      ₹{(item.commission).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleCustomResetDate(item)}
                          title="Set custom date & time to reset counter"
                          className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg transition border border-slate-600 flex items-center space-x-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3 text-sky-400" />
                          <span>Reset Date</span>
                        </button>
                        <button
                          onClick={() => handlePayIncentive(item)}
                          disabled={processingId === item.id}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition flex items-center space-x-1.5 cursor-pointer"
                        >
                          {processingId === item.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CreditCard className="w-3.5 h-3.5" />
                          )}
                          <span>Pay / Approve Incentive</span>
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

      {/* Grid Layout: Schemes & Incentives History Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Active schemes */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="font-bold text-base text-white uppercase tracking-wider">Active Incentive Rules</h3>
          <div className="space-y-4">
            {SCHEMES.map(scheme => (
              <div key={scheme.id} className="bg-slate-800/80 p-5 rounded-xl border border-slate-700/60 space-y-2 relative overflow-hidden group hover:border-slate-600 transition">
                <div className="absolute top-0 right-0 p-3 text-sky-400/20 group-hover:text-sky-400/40 transition">
                  <Calculator className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-sm text-slate-200">{scheme.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">{scheme.desc}</p>
                <div className="pt-2 border-t border-slate-750/50 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500 font-semibold uppercase">Reward Rate</span>
                  <span className="text-xs font-bold text-sky-400 font-mono">{scheme.reward}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: Incentives History Log */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-white uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-sky-400" />
              <span>Incentives History Log</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">{historyLogs.length} Records</span>
          </div>

          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-700 text-xs font-mono uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Orders Fulfilled</th>
                    <th className="px-6 py-4">Amount Paid</th>
                    <th className="px-6 py-4">Payout Date & Time</th>
                    <th className="px-6 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 text-slate-300 text-sm">
                  {historyLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                        No previous paid incentive records. Approve an incentive payout above to record history.
                      </td>
                    </tr>
                  ) : (
                    historyLogs.map(item => (
                      <tr key={item.id} className="hover:bg-slate-700/30 transition duration-150">
                        <td className="px-6 py-4 font-bold text-slate-200">
                          <span>{item.employeeName}</span>
                          {item.phone && (
                            <span className="text-[10px] font-mono text-slate-400 block">+91 {item.phone}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-300">{item.orderCount} orders</td>
                        <td className="px-6 py-4 font-mono font-bold text-emerald-400">₹{item.paidAmount.toLocaleString()}</td>
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

      </div>

      {/* Incentive Success & Mobile Notification Modal */}
      {incentiveSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-5 text-left animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Weekly Incentive Approved!</h3>
                  <p className="text-xs text-emerald-400 font-medium">Your incentive is credited successfully</p>
                </div>
              </div>
              <button 
                onClick={() => setIncentiveSuccessModal(null)}
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
                  <span className="text-base font-bold text-white">{incentiveSuccessModal.employeeName}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Incentive Credited</span>
                  <span className="text-xl font-black font-mono text-emerald-400">₹{incentiveSuccessModal.amount.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block">Fulfilled Orders</span>
                  <span className="text-slate-200 font-bold">{incentiveSuccessModal.orderCount} orders</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Recounting Starts</span>
                  <span className="text-sky-400 font-bold">{incentiveSuccessModal.recountFrom}</span>
                </div>
              </div>
            </div>

            {/* Mobile SMS Notification Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                  <span>Mobile Notification (+91 {incentiveSuccessModal.employeePhone || 'Registered Mobile'})</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">Ready to Send</span>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono leading-relaxed select-all">
                {incentiveSuccessModal.smsNotification}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {incentiveSuccessModal.whatsappUrl && (
                <a
                  href={incentiveSuccessModal.whatsappUrl}
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
                onClick={() => setIncentiveSuccessModal(null)}
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
