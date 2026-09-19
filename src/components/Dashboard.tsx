/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  BarChart, Bar, Cell, Legend, PieChart, Pie 
} from 'recharts';
import { 
  TrendingUp, ClipboardCheck, Truck, Clock, DollarSign, RefreshCw, 
  AlertTriangle, CheckCircle, Package, ArrowRight, Ban, Users, Award, Sparkles, Bell, ShieldAlert
} from 'lucide-react';
import { Order } from '../types';

interface DashboardProps {
  orders: Order[];
  onReloadOrders: () => void;
  isSimulated: boolean;
  onNavigateToOrders?: (filterStatus?: string) => void;
  user?: { name: string; email: string; role: 'admin' | 'employee' } | null;
}

export default function Dashboard({ orders, onReloadOrders, isSimulated, onNavigateToOrders, user }: DashboardProps) {
  const isAdmin = !user || user.role === 'admin';

  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dappersfit_dismissed_alerts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleDismissAlert = (orderId: string) => {
    const updated = [...dismissedAlerts, orderId];
    setDismissedAlerts(updated);
    try {
      localStorage.setItem('dappersfit_dismissed_alerts', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  // Employee created orders stats
  const employeeStats = useMemo(() => {
    const employeeOrders = orders.filter(o => 
      o.createdByEmployeeId && 
      o.createdByEmployeeId !== 'System' && 
      !o.createdByEmployeeId.toLowerCase().includes('admin')
    );
    const count = employeeOrders.length;
    const totalValue = employeeOrders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.totalAmount : 0), 0);
    
    // Calculate leaderboard/contributions
    const contributions: Record<string, { count: number; value: number; email: string }> = {};
    employeeOrders.forEach(o => {
      const name = o.createdByEmployeeName || "Unknown Employee";
      const email = o.createdByEmployeeId || "Unknown";
      if (!contributions[name]) {
        contributions[name] = { count: 0, value: 0, email };
      }
      contributions[name].count += 1;
      contributions[name].value += o.status !== 'cancelled' ? o.totalAmount : 0;
    });

    const leaderboard = Object.entries(contributions).map(([name, stats]) => ({
      name,
      createdByEmployeeId: stats.email,
      count: stats.count,
      value: stats.value
    })).sort((a, b) => b.count - a.count);

    return { employeeOrders, count, totalValue, leaderboard };
  }, [orders]);

  // Aggregate statistics
  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const booked = orders.filter(o => o.status === 'booked' || o.status === 'awb_assigned').length;
    const shipped = orders.filter(o => o.status === 'shipped').length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;

    // Estimate simulated charges (approx 5% of order total, or randomized charges)
    const shippingCharges = orders.reduce((sum, o) => {
      if (o.status === 'pending' || o.status === 'cancelled') return sum;
      // standard weight-based calculation simulation
      const weight = typeof o.weight === 'number' && !isNaN(o.weight) && o.weight > 0 ? o.weight : 0.5;
      const base = 45;
      const weightSurcharge = Math.ceil(weight * 2) * 35;
      return sum + base + weightSurcharge;
    }, 0);

    const totalRevenue = orders.reduce((sum, o) => {
      return sum + (o.status !== 'cancelled' ? o.totalAmount : 0);
    }, 0);

    return { total, pending, booked, shipped, delivered, cancelled, shippingCharges, totalRevenue };
  }, [orders]);

  // Status breakdown for Pie Chart
  const statusChartData = useMemo(() => {
    return [
      { name: 'Pending', value: stats.pending, color: '#fbbf24' },
      { name: 'Booked', value: stats.booked, color: '#38bdf8' },
      { name: 'Shipped', value: stats.shipped, color: '#818cf8' },
      { name: 'Delivered', value: stats.delivered, color: '#34d399' },
      { name: 'Cancelled', value: stats.cancelled, color: '#f87171' },
    ].filter(item => item.value > 0);
  }, [stats]);

  // Courier Share breakdown
  const courierShareData = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => {
      if (o.courierName) {
        counts[o.courierName] = (counts[o.courierName] || 0) + 1;
      }
    });
    
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value
    }));
  }, [orders]);

  // Past 7 Days financial trend simulation
  const financialTrendData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    // Distribute stats over 7 days in a clean visual trend
    return days.map((day, idx) => {
      const scale = 0.5 + (idx * 0.15) + (Math.sin(idx) * 0.1);
      return {
        day,
        revenue: Math.round((stats.totalRevenue / 7) * scale),
        shipping: Math.round((stats.shippingCharges / 7) * scale * 1.1)
      };
    });
  }, [stats]);

  const COLORS = ['#fbbf24', '#38bdf8', '#818cf8', '#34d399', '#f87171'];

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto" id="dashboard-root">
      
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4" id="dashboard-header">
        <div>
          <h1 className="font-sans font-extrabold text-3xl tracking-tight text-white" id="dash-main-title">
            Fulfillment Cockpit
          </h1>
          <p className="text-sm text-slate-400 font-sans mt-1">
            Real-time Shiprocket integrations, delivery tracking & parsing metrics.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            id="reload-orders-button"
            onClick={onReloadOrders}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-850 hover:bg-slate-700 text-sky-400 hover:text-white border border-slate-700 rounded-lg text-sm font-semibold transition shadow-md"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload Orders</span>
          </button>
        </div>
      </div>

      {/* Live Staff Alerts Banner / Board (Admin Only) */}
      {isAdmin && employeeStats.employeeOrders.length > 0 && (
        <div className="space-y-3" id="staff-alerts-container">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono tracking-wider uppercase text-amber-400 font-bold flex items-center space-x-1.5">
              <span className="relative flex h-2 w-2 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span>Live Staff Order Submissions ({employeeStats.employeeOrders.filter(o => !dismissedAlerts.includes(o.id)).length} Active)</span>
            </h3>
            {dismissedAlerts.length > 0 && (
              <button 
                onClick={() => {
                  setDismissedAlerts([]);
                  localStorage.removeItem('dappersfit_dismissed_alerts');
                }}
                className="text-[10px] text-slate-500 hover:text-slate-300 font-mono transition"
              >
                Reset Dismissed Alerts
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="staff-alerts-grid">
            {employeeStats.employeeOrders
              .filter(o => !dismissedAlerts.includes(o.id))
              .map(order => (
                <div 
                  key={order.id} 
                  className="bg-amber-500/5 border border-amber-500/10 hover:border-amber-500/20 p-4 rounded-xl flex flex-col justify-between space-y-3 shadow-md transition-all duration-250 animate-fade-in"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 text-[10px] font-mono font-bold uppercase">
                          Staff Created
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-200">
                          {order.orderNumber}
                        </span>
                      </div>
                      <p className="text-xs text-slate-350 font-sans">
                        <strong>{order.createdByEmployeeName || 'Employee'}</strong> created an order for <strong>{order.customerName}</strong>.
                      </p>
                    </div>
                    <button 
                      onClick={() => handleDismissAlert(order.id)}
                      className="text-slate-500 hover:text-slate-300 text-xs font-sans px-1.5 py-0.5 bg-white/5 hover:bg-white/10 rounded transition"
                      title="Dismiss Alert"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between pt-1.5 border-t border-amber-500/10 text-[11px] font-mono">
                    <span className="text-slate-400">Amt: <strong className="text-slate-200">₹{order.totalAmount}</strong></span>
                    <span className="text-slate-400 font-semibold text-amber-400 uppercase">{order.status}</span>
                  </div>
                </div>
              ))}
              
            {employeeStats.employeeOrders.filter(o => !dismissedAlerts.includes(o.id)).length === 0 && (
              <div className="col-span-full bg-slate-900/40 border border-slate-800 p-4 rounded-xl text-center text-xs text-slate-500 font-sans">
                All employee submissions have been acknowledged.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" id="dashboard-metrics-grid">
        {/* Total Orders Card */}
        <div 
          onClick={() => onNavigateToOrders?.('all')}
          className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl flex items-start justify-between group transition hover:border-sky-500/55 cursor-pointer active:scale-98 duration-150" 
          id="metric-total-orders"
        >
          <div className="space-y-2">
            <span className="text-xs font-mono tracking-wider uppercase text-slate-400 font-semibold block">Total Ingested</span>
            <span className="text-3xl font-extrabold text-white block font-mono">{stats.total}</span>
            <div className="flex items-center text-emerald-400 text-xs font-medium space-x-1 font-mono">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+18% this week</span>
            </div>
          </div>
          <div className="bg-slate-900 text-slate-300 p-3 rounded-xl group-hover:bg-slate-900/80 transition">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Shipped / Active Shipments Card */}
        <div 
          onClick={() => onNavigateToOrders?.('active')}
          className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl flex items-start justify-between group transition hover:border-sky-500/55 cursor-pointer active:scale-98 duration-150" 
          id="metric-shipped"
        >
          <div className="space-y-2">
            <span className="text-xs font-mono tracking-wider uppercase text-slate-400 font-semibold block">Transit & Shipped</span>
            <span className="text-3xl font-extrabold text-white block font-mono">{stats.shipped + stats.booked}</span>
            <div className="flex items-center text-sky-400 text-xs font-medium space-x-1 font-mono">
              <Truck className="w-3.5 h-3.5" />
              <span>{stats.delivered} Completed</span>
            </div>
          </div>
          <div className="bg-sky-950/40 text-sky-400 p-3 rounded-xl transition">
            <ClipboardCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Shipping Charges Card */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl flex items-start justify-between group transition hover:border-slate-600" id="metric-charges">
          <div className="space-y-2">
            <span className="text-xs font-mono tracking-wider uppercase text-slate-400 font-semibold block">Est. Shipping Costs</span>
            <span className="text-3xl font-extrabold text-white block font-mono">₹{stats.shippingCharges.toLocaleString()}</span>
            <div className="flex items-center text-indigo-400 text-xs font-medium space-x-1 font-mono">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Avg ₹{stats.booked + stats.shipped + stats.delivered > 0 ? Math.round(stats.shippingCharges / (stats.booked + stats.shipped + stats.delivered)) : 95} per order</span>
            </div>
          </div>
          <div className="bg-indigo-950/40 text-indigo-400 p-3 rounded-xl transition">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Avg SLA Delivery Card */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl flex items-start justify-between group transition hover:border-slate-600" id="metric-sla">
          <div className="space-y-2">
            <span className="text-xs font-mono tracking-wider uppercase text-slate-400 font-semibold block">SLA Transit Avg</span>
            <span className="text-3xl font-extrabold text-white block font-mono">2.8 Days</span>
            <div className="flex items-center text-amber-400 text-xs font-medium space-x-1 font-mono">
              <Clock className="w-3.5 h-3.5" />
              <span>94.2% on-time delivery</span>
            </div>
          </div>
          <div className="bg-amber-950/40 text-amber-400 p-3 rounded-xl transition">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-charts-grid">
        
        {/* Left Side: Past 7 Days Logistics Trend */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl lg:col-span-2 space-y-6 flex flex-col" id="chart-logistics-trend">
          <div>
            <h3 className="font-sans font-bold text-lg text-white">Revenue & Shipping Cost Projections</h3>
            <p className="text-xs text-slate-400 mt-1 font-sans">Simulating Dappersfit last 7 days of logistics invoicing.</p>
          </div>
          
          <div className="h-64 w-full flex-1" id="revenue-trend-chart-container">
            {stats.total === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 font-sans space-y-2">
                <Package className="w-8 h-8 opacity-40 animate-bounce" />
                <span className="text-sm">No data to display. Click Reload Orders or place a new order.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financialTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorShipping" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', color: '#fff' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Area type="monotone" name="Invoiced Revenue" dataKey="revenue" stroke="#38bdf8" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                  <Area type="monotone" name="Shipping Costs" dataKey="shipping" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#colorShipping)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right Side: Order Status Distribution */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl flex flex-col justify-between" id="chart-status-pie">
          <div>
            <h3 className="font-sans font-bold text-lg text-white">Fulfillment Stages</h3>
            <p className="text-xs text-slate-400 mt-1 font-sans">Ingestion lifecycle share for current orders.</p>
          </div>

          <div className="h-48 w-full flex items-center justify-center relative my-4" id="pie-chart-container">
            {statusChartData.length === 0 ? (
              <span className="text-sm text-slate-500 font-sans">No data</span>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-2xl font-black font-mono text-white">{stats.total}</span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Total</span>
                </div>
              </>
            )}
          </div>

          {/* Color Indicators */}
          <div className="grid grid-cols-2 gap-2 text-xs" id="pie-color-indicators">
            {statusChartData.map((item, idx) => (
              <div key={item.name} className="flex items-center space-x-1.5 text-slate-300 font-sans">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                <span className="font-medium">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Courier Services Share & Recent logs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="dashboard-row-3">
        {/* Courier Share Bar Chart */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl space-y-6 flex flex-col" id="chart-courier-bars">
          <div>
            <h3 className="font-sans font-bold text-lg text-white">Shiprocket Courier Split</h3>
            <p className="text-xs text-slate-400 mt-1 font-sans">Order distribution among active express couriers.</p>
          </div>
          
          <div className="h-48 w-full flex-1" id="courier-bar-chart-container">
            {courierShareData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs font-sans">
                No courier assigned yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courierShareData} margin={{ top: 10, right: 0, left: -30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', color: '#fff' }}
                  />
                  <Bar dataKey="value" fill="#38bdf8" radius={[4, 4, 0, 0]}>
                    {courierShareData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Live Shipment Monitor / Activity Feed */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl md:col-span-2 flex flex-col justify-between" id="activity-monitor">
          <div className="mb-4">
            <h3 className="font-sans font-bold text-lg text-white">Fulfillment Monitor</h3>
            <p className="text-xs text-slate-400 mt-1 font-sans">Live updates on Shiprocket tracking webhooks & states.</p>
          </div>

          <div className="space-y-4 overflow-y-auto max-h-48 pr-1 flex-1" id="monitor-events-list">
            {orders.filter(o => o.status !== 'pending').slice(0, 4).map((order) => {
              let icon = <Clock className="w-4 h-4 text-amber-400" />;
              let text = '';
              let badgeColor = 'bg-amber-500/10 border-amber-500/20 text-amber-400';

              if (order.status === 'booked') {
                icon = <Package className="w-4 h-4 text-sky-400" />;
                text = `Created on Shiprocket. ID: ${order.shiprocketOrderId}`;
                badgeColor = 'bg-sky-500/10 border-sky-500/20 text-sky-400';
              } else if (order.status === 'awb_assigned') {
                icon = <CheckCircle className="w-4 h-4 text-indigo-400" />;
                text = `AWB ${order.awbCode} assigned via ${order.courierName}`;
                badgeColor = 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400';
              } else if (order.status === 'shipped') {
                icon = <Truck className="w-4 h-4 text-purple-400" />;
                text = `In transit via ${order.courierName}. Out for delivery soon.`;
                badgeColor = 'bg-purple-500/10 border-purple-500/20 text-purple-400';
              } else if (order.status === 'delivered') {
                icon = <CheckCircle className="w-4 h-4 text-emerald-400" />;
                text = `Successfully delivered to ${order.address?.city || 'Customer'}`;
                badgeColor = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
              } else if (order.status === 'cancelled') {
                icon = <Ban className="w-4 h-4 text-red-400" />;
                text = `Cancelled on Shiprocket.`;
                badgeColor = 'bg-red-500/10 border-red-500/20 text-red-400';
              }

              return (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-700 bg-slate-900/40 hover:bg-slate-900/80 transition" id={`feed-order-${order.id}`}>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-slate-800 shadow-sm border border-slate-700">
                      {icon}
                    </div>
                    <div>
                      <span className="text-xs font-mono font-bold text-slate-100">{order.orderNumber}</span>
                      <p className="text-xs text-slate-400 font-sans mt-0.5">{text}</p>
                    </div>
                  </div>
                  <div className={`text-[10px] font-mono border font-semibold px-2 py-1 rounded-full ${badgeColor}`}>
                    {order.status.toUpperCase()}
                  </div>
                </div>
              );
            })}

            {orders.filter(o => o.status !== 'pending').length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 py-8 font-sans space-y-1.5">
                <AlertTriangle className="w-6 h-6 text-slate-600" />
                <span className="text-xs">No active shipments in transit yet.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Staff-Created Orders Oversight Panel */}
      {isAdmin && (
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl space-y-6 flex flex-col" id="staff-oversight-section">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-sans font-bold text-lg text-white flex items-center space-x-2">
                <Users className="w-5 h-5 text-[#b8862f]" />
                <span>Staff Ingestion & Performance Tracking</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                Detailed oversight of client orders generated, placed, and processed by registered employees.
              </p>
            </div>
            
            {/* Quick Summary Badges */}
            <div className="flex items-center space-x-3 text-xs font-mono">
              <div className="bg-[#b8862f]/10 border border-[#b8862f]/20 px-3 py-1.5 rounded-xl text-slate-200">
                Staff Orders: <span className="font-bold text-[#b8862f]">{employeeStats.count}</span>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-slate-200">
                Staff Volume: <span className="font-bold text-emerald-400">₹{employeeStats.totalValue.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="staff-oversight-layout">
            {/* Leaderboard / Contributions list */}
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-750 space-y-4" id="staff-leaderboard">
              <h4 className="text-xs font-mono tracking-wider uppercase text-slate-400 font-bold flex items-center space-x-1">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Staff Contributions</span>
              </h4>
              
              <div className="space-y-3">
                {employeeStats.leaderboard.map((leader, idx) => (
                  <div key={leader.name} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-slate-850 text-[#b8862f] border border-slate-700 flex items-center justify-center text-xs font-bold font-mono">
                        {idx + 1}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-200 block">{leader.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono text-slate-400">ID: {leader.createdByEmployeeId || 'Unknown'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-200 font-mono block">{leader.count} {leader.count === 1 ? 'Order' : 'Orders'}</span>
                      <span className="text-[10px] text-emerald-400 font-mono">₹{leader.value.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                
                {employeeStats.leaderboard.length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-xs font-sans">
                    No staff contributions registered yet.
                  </div>
                )}
              </div>
            </div>

            {/* List of orders created by employees */}
            <div className="lg:col-span-2 bg-slate-900/50 p-4 rounded-xl border border-slate-750 space-y-4" id="staff-orders-table">
              <h4 className="text-xs font-mono tracking-wider uppercase text-slate-400 font-bold flex items-center space-x-1">
                <Sparkles className="w-4 h-4 text-[#b8862f]" />
                <span>Staff Ingested Order Logs</span>
              </h4>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono">
                      <th className="pb-2.5 font-bold uppercase">Order #</th>
                      <th className="pb-2.5 font-bold uppercase">Created By</th>
                      <th className="pb-2.5 font-bold uppercase">Customer</th>
                      <th className="pb-2.5 font-bold uppercase">Total</th>
                      <th className="pb-2.5 font-bold uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans text-slate-200">
                    {employeeStats.employeeOrders.map((order) => {
                      let statusBadge = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
                      if (order.status === 'booked' || order.status === 'awb_assigned') {
                        statusBadge = 'bg-sky-500/10 border-sky-500/20 text-sky-400';
                      } else if (order.status === 'shipped') {
                        statusBadge = 'bg-purple-500/10 border-purple-500/20 text-purple-400';
                      } else if (order.status === 'delivered') {
                        statusBadge = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                      } else if (order.status === 'cancelled') {
                        statusBadge = 'bg-red-500/10 border-red-500/20 text-red-400';
                      }

                      return (
                        <tr key={order.id} className="hover:bg-slate-900/40 transition">
                          <td className="py-3 font-mono font-bold text-slate-200 text-slate-200">
                            {order.orderNumber}
                          </td>
                          <td className="py-3 font-medium text-slate-250 text-slate-200">
                            {order.createdByEmployeeName || 'Employee'}
                          </td>
                          <td className="py-3 text-slate-400">
                            {order.customerName}
                          </td>
                          <td className="py-3 font-mono font-bold text-slate-200">
                            ₹{order.totalAmount}
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-mono font-semibold uppercase ${statusBadge}`}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {employeeStats.employeeOrders.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-500 text-xs">
                          No orders created by employees yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
