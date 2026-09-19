/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, ClipboardList, Wand2, Boxes, Users, UserCheck, 
  Wallet, Gift, BarChart3, Truck, ScrollText, Settings, LogOut, KeyRound, UserRound, PackageCheck,
  ArrowRightLeft 
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSimulated: boolean;
  user: { name: string; email: string; role: 'admin' | 'employee' } | null;
  onSignOut: () => void;
  onOpenProfile?: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, isSimulated, user, onSignOut, onOpenProfile }: SidebarProps) {
  const isAdmin = user?.role === 'admin';

  // Base navigation items for all roles (WITHOUT AI WhatsApp Parser tab)
  const baseItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', name: 'Orders', icon: ClipboardList },
    { id: 'courier-booking', name: 'Courier Booking', icon: PackageCheck },
    { id: 'products', name: 'Products', icon: Boxes },
    { id: 'replacements', name: 'Replacements', icon: ArrowRightLeft },
    { id: 'customers', name: 'Customers', icon: UserCheck },
    { id: 'shipping', name: 'Shipping', icon: Truck },
    { id: 'reports', name: 'Reports', icon: BarChart3 },
  ];

  // Admin-only management panels
  const adminItems = [
    { id: 'employees', name: 'Employees', icon: Users },
    { id: 'payroll', name: 'Payroll', icon: Wallet },
    { id: 'incentives', name: 'Incentives', icon: Gift },
    { id: 'audit-logs', name: 'Audit Logs', icon: ScrollText },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  const menuItems = isAdmin ? [...baseItems, ...adminItems] : baseItems;

  const userInitials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'US';

  return (
    <div className="w-64 bg-[#1c1b1a] border-r border-[#2a2826] text-slate-200 flex flex-col h-full shrink-0" id="sidebar-container">
      {/* Brand Header */}
      <div className="p-6 border-b border-[#2a2826] shrink-0" id="brand-header">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#b8862f] flex items-center justify-center text-white font-sans font-black text-lg shadow-sm">
            D
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-white df-display">
              Dapper Fit
            </div>
            <span className="text-[9px] font-mono font-medium text-slate-500 block uppercase tracking-wider">ORDER SYSTEM</span>
          </div>
        </div>
      </div>

      {/* Connection Status Badge */}
      <div className="px-5 py-4 shrink-0" id="connection-status">
        <div className={`flex items-center space-x-2 px-3 py-2 rounded-xl border text-xs font-mono font-semibold tracking-wide ${
          isSimulated 
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}>
          <div className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isSimulated ? 'bg-amber-400' : 'bg-emerald-400'
            }`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              isSimulated ? 'bg-amber-500' : 'bg-emerald-500'
            }`}></span>
          </div>
          <span>
            {isSimulated ? 'SIMULATOR MODE' : 'SHIPROCKET LIVE'}
          </span>
        </div>
      </div>

      {/* Navigation Links - Scrollable to prevent overflow */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto" id="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 text-xs transition-all duration-150 group relative ${
                isActive
                  ? 'bg-[#b8862f] text-white font-bold rounded-lg shadow-md'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white rounded-lg'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${
                isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
              }`} />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Profile & Controls Footer */}
      <div className="p-4 border-t border-[#2a2826] bg-[#141312] shrink-0 space-y-3" id="sidebar-profile-footer">
        <div className="flex items-center space-x-3 px-1">
          <div className="w-9 h-9 rounded-full bg-[#b8862f]/10 border border-[#b8862f]/20 flex items-center justify-center text-[#b8862f] font-bold text-sm shrink-0">
            {userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-white block truncate">{user?.name || 'Dappersfit Admin'}</span>
            <span className="text-[10px] text-slate-500 block truncate">{user?.email || 'dappersfit@gmail.com'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#2a2826]/60">
          <button 
            onClick={onOpenProfile ? onOpenProfile : () => setActiveTab(isAdmin ? 'settings' : 'dashboard')}
            className="flex items-center justify-center space-x-1.5 py-1.5 px-2 bg-white/5 hover:bg-white/10 text-[10px] font-bold text-slate-350 rounded-lg border border-white/5 transition"
            title="Session Details"
          >
            <KeyRound className="w-3.5 h-3.5 text-slate-400" />
            <span>Profile</span>
          </button>
          <button 
            onClick={onSignOut}
            className="flex items-center justify-center space-x-1.5 py-1.5 px-2 bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-[10px] font-bold text-slate-350 rounded-lg border border-white/5 transition"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
        <div className="text-[9px] text-center font-mono text-slate-600 uppercase tracking-widest pt-1">
          ORDER MANAGEMENT SYSTEM
        </div>
      </div>
    </div>
  );
}
