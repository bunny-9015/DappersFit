/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ScrollText, Search, ShieldAlert, Cpu, Calendar, Clock, 
  Terminal, ShieldCheck, RefreshCw, Zap, Server, Trash2 
} from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

interface ShiprocketApiLog {
  id: string;
  timestamp: string;
  actor: string;
  type: 'internal' | 'external';
  action: string;
  ip: string;
  target: string;
  details: string;
}

const INITIAL_SYSTEM_LOGS: AuditLog[] = [
  { id: 'l1', timestamp: '2026-07-10 10:42:15 AM', actor: 'System (AI Parser)', action: 'PARSE_ORDER_SUCCESS', details: 'Extructured order ord_1783658993467 for customer BANDARU VENKATESH.', severity: 'INFO' },
  { id: 'l2', timestamp: '2026-07-10 10:43:02 AM', actor: 'Fulfillment Engine', action: 'SHIPROCKET_ORDER_BOOKED', details: 'Booked shipment ID 1439633746 on Shiprocket for Delhivery Surface.', severity: 'INFO' },
  { id: 'l3', timestamp: '2026-07-10 10:43:08 AM', actor: 'System (Shiprocket API)', action: 'ASSIGN_AWB_SUCCESS', details: 'Assigned AWB 1904193592071 to shipment ID 1439633746.', severity: 'INFO' },
  { id: 'l4', timestamp: '2026-07-09 05:12:44 PM', actor: 'Inventory Manager', action: 'STOCK_LEVEL_ADJUST', details: 'Adjusted stock quantity of Drone 4K Action Camera Ultra HD from 50 to 80.', severity: 'INFO' },
  { id: 'l5', timestamp: '2026-07-09 02:18:11 PM', actor: 'System (Live Gateway)', action: 'SHIPROCKET_AUTH_REFRESH', details: 'Successfully refreshed Shiprocket access token via OAuth secure storage.', severity: 'INFO' },
  { id: 'l6', timestamp: '2026-07-08 11:20:00 AM', actor: 'Administrator', action: 'ONBOARD_EMPLOYEE', details: 'Onboarded new fulfillment agent into the Fulfillment Executive role.', severity: 'INFO' }
];

const SEED_SHIPROCKET_LOGS: ShiprocketApiLog[] = [
  {
    id: 'sr-1',
    timestamp: 'Jul 10, 2026, 8:01 PM',
    actor: 'API USER',
    type: 'external',
    action: 'SR_SECURITY_LOGGING',
    ip: '-',
    target: 'label',
    details: 'Shipment IDs: SM-41092418'
  },
  {
    id: 'sr-2',
    timestamp: 'Jul 10, 2026, 7:53 PM',
    actor: 'API USER',
    type: 'external',
    action: 'SR_SECURITY_LOGGING',
    ip: '-',
    target: 'label',
    details: 'Shipment IDs: SM-94812391'
  },
  {
    id: 'sr-3',
    timestamp: 'Jul 10, 2026, 2:47 PM',
    actor: 'Dappers fit',
    type: 'internal',
    action: 'SR_SECURITY_LOGGING',
    ip: '-',
    target: 'label',
    details: 'Shipment IDs: 1440233100'
  }
];

export default function AuditLogsPanel() {
  const [activeTab, setActiveTab] = useState<'shiprocket' | 'system'>('shiprocket');
  const [systemLogs, setSystemLogs] = useState<AuditLog[]>(INITIAL_SYSTEM_LOGS);
  
  // Shiprocket logs state synced with localStorage
  const [shiprocketLogs, setShiprocketLogs] = useState<ShiprocketApiLog[]>([]);
  const [search, setSearch] = useState('');
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'internal' | 'external'>('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  useEffect(() => {
    const saved = localStorage.getItem('shiprocket_gateway_logs');
    if (saved) {
      setShiprocketLogs(JSON.parse(saved));
    } else {
      setShiprocketLogs(SEED_SHIPROCKET_LOGS);
      localStorage.setItem('shiprocket_gateway_logs', JSON.stringify(SEED_SHIPROCKET_LOGS));
    }
  }, []);

  // Format Helper for Logs
  const formatTimestamp = (date: Date = new Date()) => {
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return date.toLocaleString('en-US', options);
  };

  // Simulate external Shiprocket developer API call
  const handleSimulateExternalCall = () => {
    const mockShipmentId = `SM-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const newLog: ShiprocketApiLog = {
      id: `sr-sim-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      timestamp: formatTimestamp(),
      actor: 'API USER',
      type: 'external',
      action: 'SR_SECURITY_LOGGING',
      ip: '-',
      target: 'label',
      details: `Shipment IDs: ${mockShipmentId}`
    };

    const updated = [newLog, ...shiprocketLogs];
    setShiprocketLogs(updated);
    localStorage.setItem('shiprocket_gateway_logs', JSON.stringify(updated));
  };

  // Reset Shiprocket logs back to seed state
  const handleResetShiprocketLogs = () => {
    setShiprocketLogs(SEED_SHIPROCKET_LOGS);
    localStorage.setItem('shiprocket_gateway_logs', JSON.stringify(SEED_SHIPROCKET_LOGS));
  };

  // Filters for Shiprocket Logs
  const filteredShiprocketLogs = shiprocketLogs.filter(log => {
    const matchesSearch = 
      log.details.toLowerCase().includes(search.toLowerCase()) || 
      log.actor.toLowerCase().includes(search.toLowerCase()) ||
      log.target.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'ALL' || log.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Filters for System Logs
  const filteredSystemLogs = systemLogs.filter(log => {
    const matchesSearch = 
      log.details.toLowerCase().includes(search.toLowerCase()) || 
      log.actor.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase());
    const matchesSev = severityFilter === 'ALL' || log.severity === severityFilter;
    return matchesSearch && matchesSev;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 font-sans text-slate-100" id="audit-logs-panel">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center space-x-2">
            <Terminal className="w-8 h-8 text-sky-400" />
            <span>Developer API Gateway & Audit Logs</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Monitor real-time internal app events, token refreshes, and third-party API gateway telemetry.
          </p>
        </div>

        {activeTab === 'shiprocket' && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSimulateExternalCall}
              className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg flex items-center space-x-1.5 transition shadow-lg shadow-sky-500/15"
              id="simulate-external-api-btn"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Simulate External API Request</span>
            </button>
            <button
              onClick={handleResetShiprocketLogs}
              className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Reset Logs to Initial Demo Seed"
              id="reset-shiprocket-logs-btn"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Tabs Layout */}
      <div className="flex border-b border-slate-800" id="logs-tabs-selector">
        <button
          onClick={() => { setActiveTab('shiprocket'); setSearch(''); }}
          className={`py-3 px-6 font-bold text-sm tracking-wide border-b-2 transition duration-150 flex items-center space-x-2 ${
            activeTab === 'shiprocket'
              ? 'border-sky-400 text-sky-400 bg-sky-400/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Shiprocket API Gateway Logs</span>
          <span className="ml-1.5 px-1.5 py-0.5 bg-slate-800 text-slate-400 text-[10px] rounded-full font-mono font-bold">
            {shiprocketLogs.length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('system'); setSearch(''); }}
          className={`py-3 px-6 font-bold text-sm tracking-wide border-b-2 transition duration-150 flex items-center space-x-2 ${
            activeTab === 'system'
              ? 'border-sky-400 text-sky-400 bg-sky-400/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Application Activity Logs</span>
          <span className="ml-1.5 px-1.5 py-0.5 bg-slate-800 text-slate-400 text-[10px] rounded-full font-mono font-bold">
            {systemLogs.length}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-xl">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              activeTab === 'shiprocket' 
                ? "Search by Shipment ID or Actor..." 
                : "Search system logs by keyword..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-700 rounded-lg text-sm bg-slate-900/60 text-slate-100 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none transition"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          {activeTab === 'shiprocket' ? (
            // Filters for Shiprocket Logs
            <div className="flex space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-750">
              {(['ALL', 'internal', 'external'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition ${
                    typeFilter === type
                      ? 'bg-sky-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          ) : (
            // Filters for System Logs
            <div className="flex space-x-1">
              {['ALL', 'INFO', 'WARNING', 'CRITICAL'].map(sev => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase border transition ${
                    severityFilter === sev
                      ? 'bg-sky-500 border-sky-500 text-slate-950'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-850'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Render Table views based on Active Tab */}
      {activeTab === 'shiprocket' ? (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden" id="shiprocket-logs-container">
          <div className="p-4 bg-slate-900/80 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Server className="w-5 h-5 text-sky-400 animate-pulse" />
              <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wider">Shiprocket developer logs log</h3>
            </div>
            <span className="text-xs text-slate-450 font-mono">Channel Registry: Gateway API v2</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono" id="shiprocket-telemetry-table">
              <thead>
                <tr className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-750">
                  <th className="px-6 py-3.5 font-bold">Date & Time</th>
                  <th className="px-6 py-3.5 font-bold">Actor</th>
                  <th className="px-6 py-3.5 font-bold text-center">Type</th>
                  <th className="px-6 py-3.5 font-bold">Security Module</th>
                  <th className="px-4 py-3.5 font-bold text-center">IP</th>
                  <th className="px-6 py-3.5 font-bold text-center">Target</th>
                  <th className="px-6 py-3.5 font-bold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-750 text-slate-300">
                {filteredShiprocketLogs.map((log, index) => (
                  <tr 
                    key={`${log.id}-${index}`} 
                    className="hover:bg-slate-700/25 transition duration-100"
                    id={`sr-log-row-${log.id}-${index}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-slate-400">
                      {log.timestamp}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-white">
                      {log.actor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.type === 'internal' 
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                          : 'bg-violet-500/10 border border-violet-500/20 text-violet-400'
                      }`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-400 font-bold">
                      {log.action}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-slate-500 font-bold">
                      {log.ip}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center font-bold">
                      <span className="px-1.5 py-0.5 bg-slate-950 rounded text-sky-400">
                        {log.target}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-sans font-semibold text-slate-200">
                      {log.details}
                    </td>
                  </tr>
                ))}

                {filteredShiprocketLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-500 font-sans">
                      No matching Shiprocket Gateway logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Application Audit Log view */
        <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden" id="system-logs-container">
          <div className="p-4 bg-slate-900/80 border-b border-slate-700 flex items-center space-x-2">
            <ScrollText className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-sm text-slate-300 uppercase tracking-wider">Live System Logs Log</h3>
          </div>

          <div className="divide-y divide-slate-750 font-mono text-xs">
            {filteredSystemLogs.map((log, index) => {
              const isCritical = log.severity === 'CRITICAL';
              const isWarning = log.severity === 'WARNING';
              
              return (
                <div key={`${log.id}-${index}`} className="p-4 flex flex-col md:flex-row md:items-start md:space-x-4 hover:bg-slate-700/20 transition duration-100">
                  <div className="w-full md:w-48 shrink-0 space-y-1">
                    <div className="flex items-center space-x-1.5 text-slate-400 text-[10px]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{log.timestamp}</span>
                    </div>
                    <span className={`inline-block px-2 py-0.5 text-[9px] font-black rounded border ${
                      isCritical 
                        ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                        : isWarning 
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                          : 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                    }`}>
                      {log.severity}
                    </span>
                  </div>

                  <div className="flex-1 mt-2 md:mt-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-slate-400 font-sans font-bold">Actor:</span>
                      <span className="text-white font-bold bg-slate-900 px-1.5 py-0.5 rounded text-[10px]">{log.actor}</span>
                      <span className="text-slate-400 font-sans font-bold ml-2">Action:</span>
                      <span className="text-sky-300 font-bold">{log.action}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-xs font-sans mt-1">
                      {log.details}
                    </p>
                  </div>
                </div>
              );
            })}

            {filteredSystemLogs.length === 0 && (
              <div className="p-12 text-center text-slate-500 font-sans">
                No matching system logs found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

