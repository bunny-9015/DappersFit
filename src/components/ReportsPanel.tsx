/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, LineChart, Line 
} from 'recharts';
import { BarChart3, TrendingUp, Calendar, Zap, AlertCircle, Clock } from 'lucide-react';
import { Order } from '../types';
import { getTodayDateString, getYesterdayDateString } from '../utils/dateUtils';

interface ReportsPanelProps {
  orders: Order[];
  dateFilter: string;
  setDateFilter: (filter: string) => void;
  customDate: string;
  setCustomDate: (date: string) => void;
}

const COLORS = ['#38bdf8', '#818cf8', '#34d399', '#fbbf24', '#f87171'];

export default function ReportsPanel({ 
  orders, 
  dateFilter, 
  setDateFilter, 
  customDate, 
  setCustomDate 
}: ReportsPanelProps) {
  
  // 1. Filter orders based on synchronized date filter
  const filteredOrders = useMemo(() => {
    const todayStr = getTodayDateString();
    const yesterdayStr = getYesterdayDateString();
    return orders.filter(order => {
      if (dateFilter === 'today') {
        return order.date === todayStr;
      }
      if (dateFilter === 'yesterday') {
        return order.date === yesterdayStr;
      }
      if (dateFilter === 'custom') {
        return order.date === customDate;
      }
      return true; // all dates
    });
  }, [orders, dateFilter, customDate]);

  // 2. Aggregate courier expenses dynamically based on active filtered orders
  const courierCostData = useMemo(() => {
    const data: Record<string, { name: string; cost: number; shipments: number }> = {};
    filteredOrders.forEach(o => {
      if (o.status !== 'pending' && o.status !== 'cancelled' && o.courierName) {
        if (!data[o.courierName]) {
          data[o.courierName] = { name: o.courierName, cost: 0, shipments: 0 };
        }
        // Calculation based on cargo dimensions/weight
        const weight = typeof o.weight === 'number' && !isNaN(o.weight) && o.weight > 0 ? o.weight : 0.5;
        data[o.courierName].cost += Math.ceil(weight * 2) * 35 + 45;
        data[o.courierName].shipments += 1;
      }
    });

    if (Object.keys(data).length === 0) {
      return [
        { name: 'Delhivery Surface', cost: 0, shipments: 0 },
        { name: 'BlueDart Air', cost: 0, shipments: 0 },
        { name: 'Xpressbees', cost: 0, shipments: 0 }
      ];
    }
    
    return Object.values(data);
  }, [filteredOrders]);

  // Aggregate stats cards dynamically
  const totalFinancialVolume = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.totalAmount : 0), 0);
  }, [filteredOrders]);

  const activeShipmentsCount = useMemo(() => {
    return filteredOrders.filter(o => ['booked', 'awb_assigned', 'shipped', 'delivered'].includes(o.status)).length;
  }, [filteredOrders]);

  const monthlyGrowthData = [
    { month: 'Jan', revenue: 45000, shipments: 24 },
    { month: 'Feb', revenue: 58000, shipments: 31 },
    { month: 'Mar', revenue: 72000, shipments: 40 },
    { month: 'Apr', revenue: 91000, shipments: 52 },
    { month: 'May', revenue: 110000, shipments: 65 },
    { month: 'Jun', revenue: 145000, shipments: 88 },
    { month: 'Jul', revenue: 180000, shipments: 112 }
  ];

  const selectedDateLabel = () => {
    if (dateFilter === 'today') return '10 Jul 2026 (Today)';
    if (dateFilter === 'yesterday') return '09 Jul 2026 (Yesterday)';
    if (dateFilter === 'custom') return customDate;
    return 'All Historic Dates';
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 font-sans text-slate-100" id="reports-panel">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Logistics Reports & Analytics</h1>
        <p className="text-sm text-slate-400 mt-1">Review aggregated billing invoices, delivery margins, courier dispatch performance & SLA reports.</p>
      </div>

      {/* Synchronized Date Filter Tabs - Symmetrical with Orders screen */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 p-1 rounded-xl border border-slate-800/40" id="reports-date-filters">
        <div className="flex flex-wrap items-center gap-2" id="reports-date-tabs">
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'custom', label: 'Custom' },
            { id: 'all', label: 'All Dates' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setDateFilter(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                dateFilter === tab.id
                  ? 'bg-sky-500 text-slate-950 font-black shadow-lg shadow-sky-500/10'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-755'
              }`}
              id={`reports-date-tab-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}

          {/* Inline Custom Date Picker */}
          {dateFilter === 'custom' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-white rounded-lg text-xs outline-none focus:border-sky-400 font-mono"
              id="reports-custom-date-picker"
            />
          )}
        </div>

        <div className="text-xs text-slate-450 font-mono flex items-center gap-2 pr-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <span>Synchronized with Orders filtering</span>
        </div>
      </div>

      {/* Dynamic Summary Cards for Selected Date */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="reports-summary-cards">
        <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 shadow-xl space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Financial Volume ({dateFilter})</span>
          <span className="text-2xl font-black text-sky-400 block font-mono">₹{totalFinancialVolume.toLocaleString()}</span>
          <p className="text-[11px] text-slate-500">Combined payment value from orders in filtered scope.</p>
        </div>
        <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 shadow-xl space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Dispatched Shipments</span>
          <span className="text-2xl font-black text-indigo-400 block font-mono">{activeShipmentsCount} Parcels</span>
          <p className="text-[11px] text-slate-500">Shipped/booked orders currently registered on courier gateway.</p>
        </div>
        <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 shadow-xl space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Date Context</span>
          <span className="text-base font-black text-emerald-400 block mt-1.5 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
            {selectedDateLabel()}
          </span>
          <p className="text-[11px] text-slate-500">Aggregates only data matching this specific day.</p>
        </div>
      </div>

      {/* Grid of Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Cost per Courier Chart */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl space-y-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-lg text-white">Courier Expense Breakdown</h3>
          </div>
          <p className="text-xs text-slate-400">Total estimated shipping charges across booking providers for {selectedDateLabel()}.</p>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={courierCostData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', color: '#fff' }}
                />
                <Bar name="Est Shipping Cost (₹)" dataKey="cost" fill="#38bdf8" radius={[4, 4, 0, 0]}>
                  {courierCostData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Growth Trend */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl space-y-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-lg text-white">Month-over-Month Fulfillment Volume</h3>
          </div>
          <p className="text-xs text-slate-400">Growth trend showing both financial volume and total dispatched parcels.</p>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyGrowthData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" stroke="#38bdf8" fontSize={11} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#818cf8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', color: '#fff' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Line yAxisId="left" type="monotone" name="Monthly Sales Volume (₹)" dataKey="revenue" stroke="#38bdf8" strokeWidth={2.5} activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="monotone" name="Dispatched Parcels" dataKey="shipments" stroke="#818cf8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* SLA Adherence Report details */}
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl space-y-4">
        <h3 className="font-bold text-lg text-white">Fulfillment SLA Adherence Matrix</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center font-mono">
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-750">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">AI Parsing Correctness</span>
            <span className="text-2xl font-black text-emerald-400 block mt-1">99.7%</span>
          </div>
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-750">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Warehouse Dispatch SLA</span>
            <span className="text-2xl font-black text-sky-400 block mt-1">4.2 Hours</span>
          </div>
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-750">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Transit Timeliness</span>
            <span className="text-2xl font-black text-emerald-400 block mt-1">94.8%</span>
          </div>
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-750">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">RTO Return Percentage</span>
            <span className="text-2xl font-black text-rose-400 block mt-1">2.4%</span>
          </div>
        </div>
      </div>

    </div>
  );
}
