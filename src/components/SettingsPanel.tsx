/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Key, Sliders, MapPin, MessageSquare, Mail, ShieldAlert, CheckCircle, Save, HelpCircle, RefreshCw, Wifi, AlertTriangle,
  ChevronLeft, MoreHorizontal, Search, FileText, Braces, Info, SlidersHorizontal, Settings
} from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsPanelProps {
  settings: AppSettings;
  onSaveSettings: (updatedSettings: AppSettings) => void;
  isSimulated: boolean;
}

export default function SettingsPanel({ settings, onSaveSettings, isSimulated }: SettingsPanelProps) {
  // Navigation section
  const [activeSection, setActiveSection] = useState<'api' | 'logistics'>('api');

  // Retool States
  const [authMethod, setAuthMethod] = useState<'credentials' | 'token'>(settings.shiprocketToken ? 'token' : 'credentials');
  const [email, setEmail] = useState<string>(settings.shiprocketEmail || '');
  const [password, setPassword] = useState<string>(settings.shiprocketPassword || '');
  const [token, setToken] = useState<string>(settings.shiprocketToken || '');
  
  // Logistics States
  const [pincode, setPincode] = useState<string>(settings.defaultPickupPincode);
  const [city, setCity] = useState<string>(settings.defaultPickupCity);
  const [state, setState] = useState<string>(settings.defaultPickupState);
  const [weight, setWeight] = useState<number>(settings.defaultWeight);
  const [whatsapp, setWhatsapp] = useState<string>(settings.whatsappTemplate);
  const [mail, setMail] = useState<string>(settings.emailTemplate);
  
  // Status feedback states
  const [saved, setSaved] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Connection testing helper
  const handleTestConnection = async () => {
    if (authMethod === 'credentials') {
      if (!email || !password) {
        setTestResult({ success: false, message: 'Please enter both your email and password first.' });
        return;
      }
    } else {
      if (!token) {
        setTestResult({ success: false, message: 'Please paste your Bearer Token first.' });
        return;
      }
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/shiprocket/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          authMethod === 'credentials'
            ? { email, password }
            : { token }
        )
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || 'Successfully connected to Shiprocket API!'
        });
        // Save state immediately on successful verification
        onSaveSettings({
          shiprocketEmail: authMethod === 'credentials' ? email : '',
          shiprocketPassword: authMethod === 'credentials' ? password : '',
          shiprocketToken: authMethod === 'token' ? token : '',
          defaultPickupPincode: pincode,
          defaultPickupCity: city,
          defaultPickupState: state,
          defaultWeight: weight,
          whatsappTemplate: whatsapp,
          emailTemplate: mail,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Connection failed. Please check credentials.'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network error while attempting to connect.'
      });
    } finally {
      setTesting(false);
    }
  };

  // Environment switching orchestration
  const handleToggleEnvironment = (mode: 'production' | 'staging') => {
    setTestResult(null);
    if (mode === 'staging') {
      // Clear live settings to force simulated fallback mode
      onSaveSettings({
        shiprocketEmail: '',
        shiprocketPassword: '',
        shiprocketToken: '',
        defaultPickupPincode: pincode,
        defaultPickupCity: city,
        defaultPickupState: state,
        defaultWeight: weight,
        whatsappTemplate: whatsapp,
        emailTemplate: mail,
      });
      setEmail('');
      setPassword('');
      setToken('');
    } else {
      // Direct user to configure credentials to go live
      setAuthMethod('token');
    }
  };

  // Form submit handler
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSaveSettings({
      shiprocketEmail: authMethod === 'credentials' ? email : '',
      shiprocketPassword: authMethod === 'credentials' ? password : '',
      shiprocketToken: authMethod === 'token' ? token : '',
      defaultPickupPincode: pincode,
      defaultPickupCity: city,
      defaultPickupState: state,
      defaultWeight: weight,
      whatsappTemplate: whatsapp,
      emailTemplate: mail,
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // Database wipe state & handler
  const [wiping, setWiping] = useState<boolean>(false);
  const handleWipeAllData = async () => {
    if (!window.confirm("WARNING: Are you absolutely sure you want to permanently delete all employees, orders, products, and customer databases? This action cannot be undone.")) {
      return;
    }
    
    setWiping(true);
    try {
      const response = await fetch('/api/admin/wipe-all', { method: 'POST' });
      const data = await response.json();
      if (response.ok && data.success) {
        alert("Success: All database tables successfully wiped and reset to clean empty state!");
        window.location.reload();
      } else {
        alert("Error: " + (data.error || "Wipe failed. Please check server logs."));
      }
    } catch (err: any) {
      alert("Error: " + (err.message || "Failed to contact database reset engine."));
    } finally {
      setWiping(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6 font-sans overflow-y-auto h-full" id="settings-root">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-5" id="settings-header">
        <div>
          <h1 className="font-sans font-extrabold text-3xl tracking-tight text-white flex items-center gap-2">
            <Settings className="w-8 h-8 text-[#b8862f]" />
            <span>System Configurations</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure live Shiprocket API connections, map warehouse postcodes, and customize automated notifications.
          </p>
        </div>

        {/* Tab section selector (Dark custom styling) */}
        <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-xl" id="settings-tab-selector">
          <button
            type="button"
            onClick={() => setActiveSection('api')}
            className={`px-4 py-2.5 text-xs font-bold rounded-lg flex items-center space-x-2 transition-all ${
              activeSection === 'api'
                ? 'bg-[#b8862f] text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Braces className="w-4 h-4 shrink-0" />
            <span>Retool API Resource</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('logistics')}
            className={`px-4 py-2.5 text-xs font-bold rounded-lg flex items-center space-x-2 transition-all ${
              activeSection === 'logistics'
                ? 'bg-[#b8862f] text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0" />
            <span>Logistics & Templates</span>
          </button>
        </div>
      </div>

      {activeSection === 'api' ? (
        /* ==================== RETOOL DESIGN SPEC ==================== */
        <div className="space-y-4 animate-in fade-in duration-200" id="retool-panel-container">
          
          {/* Status banner on save */}
          {saved && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl text-emerald-400 text-xs font-mono flex items-center space-x-2 animate-bounce">
              <CheckCircle className="w-4 h-4" />
              <span>[SYSTEM SUCCESS] Shiprocket API Resource credentials successfully updated and synced with Node server.</span>
            </div>
          )}

          {/* Retool Mock Frame Wrapper */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xl flex flex-col" id="retool-workspace-frame">
            
            {/* Top Retool Dark Navigation Header */}
            <div className="bg-[#0e1012] text-slate-300 h-12 px-4 flex items-center justify-between font-sans border-b border-slate-800 shrink-0" id="retool-nav">
              <div className="flex items-center space-x-6">
                {/* Logo */}
                <div className="flex items-center space-x-2">
                  <div className="flex flex-col space-y-0.5 justify-center items-center w-5 h-5 bg-[#3b82f6] rounded">
                    <div className="w-2.5 h-0.5 bg-white rounded-full"></div>
                    <div className="w-2.5 h-0.5 bg-white rounded-full"></div>
                    <div className="w-2.5 h-0.5 bg-white rounded-full"></div>
                  </div>
                  <span className="font-sans font-black text-sm tracking-tight text-white">retool</span>
                </div>

                {/* Navigation Options */}
                <div className="hidden lg:flex items-center space-x-1 text-xs font-medium">
                  <button type="button" className="px-3 py-1.5 rounded-md text-slate-400 hover:text-slate-250 transition">Apps</button>
                  <button type="button" className="px-3 py-1.5 rounded-md bg-white/10 text-white font-semibold shadow-inner">Resources</button>
                  <button type="button" className="px-3 py-1.5 rounded-md text-slate-400 hover:text-slate-250 transition">Database</button>
                  <button type="button" className="px-3 py-1.5 rounded-md text-slate-400 hover:text-slate-250 transition">Query Library</button>
                  <button type="button" className="px-3 py-1.5 rounded-md text-slate-400 hover:text-slate-250 transition">Workflows</button>
                  <div className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-slate-400 hover:text-slate-250 transition cursor-not-allowed">
                    <span>Agents</span>
                    <span className="text-[9px] bg-purple-600/30 text-purple-400 font-bold px-1 rounded uppercase">Beta</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <button type="button" className="px-3 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold rounded-md transition-all shadow-sm">Book a demo</button>
                <button type="button" className="text-slate-400 hover:text-white transition" title="Search"><Search className="w-4 h-4" /></button>
                <div className="flex items-center space-x-1 cursor-pointer">
                  <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow">
                    B
                  </div>
                  <span className="text-[9px] text-slate-500">▼</span>
                </div>
              </div>
            </div>

            {/* Retool Light Resource Section Header */}
            <div className="bg-white px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0" id="retool-resource-header">
              <div className="flex items-center space-x-3.5">
                {/* Back button */}
                <button type="button" className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 border border-slate-200 bg-white transition active:scale-95 shadow-sm">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {/* Resource gradient logo */}
                <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-[#ea580c] to-[#f97316] flex items-center justify-center text-white shadow-md shadow-orange-500/10">
                  <Braces className="w-5 h-5 text-white" />
                </div>
                {/* Resource Name and Spec */}
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">shiprocket</h2>
                  <div className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-widest block">REST API</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                <button type="button" className="p-2 hover:bg-slate-100 text-slate-400 rounded-lg border border-slate-200 bg-white transition shadow-sm" title="More options">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-xs uppercase tracking-wider rounded-md transition shadow-md shadow-blue-500/25 active:scale-95 flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save changes</span>
                </button>
              </div>
            </div>

            {/* Connection Tab bar */}
            <div className="bg-white border-b border-slate-200 px-6 flex space-x-6 shrink-0" id="retool-tab-bar">
              <button type="button" className="py-3 border-b-2 border-[#2563eb] text-[#2563eb] text-xs font-black uppercase tracking-wider">
                Connection details
              </button>
              <button type="button" className="py-3 text-slate-400 hover:text-slate-600 text-xs font-bold tracking-wide flex items-center space-x-1.5 transition">
                <span>Usage</span>
                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">1</span>
              </button>
            </div>

            {/* Main Interactive Form with Side panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 bg-[#f8fafc]" id="retool-workspace-grid">
              
              {/* Left Column Form */}
              <div className="lg:col-span-8 p-6 sm:p-8 space-y-6 lg:border-r lg:border-slate-200" id="retool-form-col">
                
                {/* General Header */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block">General</span>
                  <div className="h-px bg-slate-200 w-full"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name field */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-0.5">
                      <span>Name</span>
                      <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value="shiprocket"
                      disabled
                      className="w-full p-2 border border-slate-300 bg-slate-100 text-slate-400 font-mono text-xs rounded outline-none shadow-inner"
                    />
                  </div>

                  {/* Description field */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Description</label>
                    <input
                      type="text"
                      placeholder="Enter a description to help users and Assist know how to use this resource."
                      className="w-full p-2 border border-slate-300 text-slate-800 text-xs rounded outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition"
                    />
                  </div>
                </div>

                {/* API Spec Selection Toggles */}
                <div className="space-y-4">
                  
                  {/* Option 1: API Spec (Disabled/Inactive) */}
                  <div className="p-4 border border-slate-200 rounded-lg bg-white/70 opacity-60 flex items-start space-x-3 shadow-sm select-none">
                    <div className="w-4 h-4 rounded-full border border-slate-300 mt-0.5 shrink-0 flex items-center justify-center bg-slate-50"></div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-700">Use an API spec</h4>
                      <p className="text-[11px] text-slate-450 mt-1 leading-relaxed">
                        Adding a Swagger/OpenAPI spec will allow autocompletion of endpoints and properties when writing queries, and will allow Assist to more effectively use this data source.
                      </p>
                    </div>
                  </div>

                  {/* Option 2: Manual Queries (Active) */}
                  <div className="p-4 border-2 border-[#2563eb] rounded-lg bg-white flex items-start space-x-3 shadow-sm">
                    <div className="w-4 h-4 rounded-full border-4 border-[#2563eb] mt-0.5 shrink-0 flex items-center justify-center bg-white"></div>
                    <div className="flex-1">
                      <h4 className="text-xs font-extrabold text-slate-900">Manual Queries</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        If your API vendor does not provide a spec, you can structure queries from scratch.
                      </p>

                      {/* Base URL Input Nested */}
                      <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
                        <label className="text-xs font-bold text-slate-700 block">Base URL</label>
                        <p className="text-[10px] text-slate-400">Use the absolute URL (e.g. https://example.com).</p>
                        <input
                          type="text"
                          required
                          disabled
                          value="https://apiv2.shiprocket.in/v1/internal"
                          className="w-full p-2 border border-slate-300 bg-slate-100 text-slate-800 font-mono text-xs rounded outline-none font-bold"
                        />
                      </div>
                    </div>
                  </div>

                </div>

                {/* Credentials Header */}
                <div className="space-y-1 pt-4">
                  <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block">Credentials</span>
                  <div className="h-px bg-slate-200 w-full"></div>
                </div>

                {/* Credentials configurations (Interlocks with Shiprocket login state) */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-sm" id="retool-credentials-card">
                  
                  {/* Selector for Bearer Token or Credentials */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <Key className="w-4 h-4 text-slate-500" />
                      <h4 className="text-xs font-bold text-slate-800">Authentication Scheme</h4>
                    </div>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200" id="retool-auth-tabs">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMethod('token');
                          setTestResult(null);
                        }}
                        className={`px-3 py-1.5 text-[11px] font-extrabold rounded-md transition ${
                          authMethod === 'token'
                            ? 'bg-white text-slate-900 shadow-sm font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Bearer Token
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMethod('credentials');
                          setTestResult(null);
                        }}
                        className={`px-3 py-1.5 text-[11px] font-extrabold rounded-md transition ${
                          authMethod === 'credentials'
                            ? 'bg-white text-slate-900 shadow-sm font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Email & Password
                      </button>
                    </div>
                  </div>

                  {authMethod === 'token' ? (
                    <div className="space-y-3" id="retool-bearer-table">
                      <label className="text-[11px] font-bold text-slate-500 block uppercase tracking-wide">Automatic Outgoing Request Headers</label>
                      
                      <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                        {/* Headers Header row */}
                        <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-200 p-2.5 font-bold text-slate-600">
                          <div className="col-span-4">Header Key</div>
                          <div className="col-span-8">Header Value</div>
                        </div>

                        {/* Content-type row */}
                        <div className="grid grid-cols-12 border-b border-slate-100 p-2.5 bg-slate-50/50 items-center">
                          <div className="col-span-4 font-mono text-[11px] text-slate-400 select-none">Content-Type</div>
                          <div className="col-span-8 font-mono text-[11px] text-slate-400 select-none">application/json</div>
                        </div>

                        {/* Authorization row */}
                        <div className="grid grid-cols-12 p-2.5 items-center bg-white">
                          <div className="col-span-4 font-mono text-[11px] font-black text-slate-800">Authorization</div>
                          <div className="col-span-8">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono text-[11px] text-slate-400 shrink-0 font-bold">Bearer </span>
                              <input
                                type="text"
                                placeholder="Paste authorization Bearer token JWT..."
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                className="flex-1 p-1.5 border border-slate-300 rounded font-mono text-[11px] text-slate-800 focus:border-blue-500 outline-none focus:ring-1 focus:ring-blue-100 transition"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="retool-credentials-inputs">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Account Username / Email</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="developer@dappersfit.com"
                          className="w-full p-2 border border-slate-300 text-slate-800 text-xs rounded outline-none font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Password</label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••••"
                          className="w-full p-2 border border-slate-300 text-slate-800 text-xs rounded outline-none font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Interactive Test Connection Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testing}
                      className={`px-4 py-2 text-xs font-bold rounded-md border flex items-center space-x-2 transition-all duration-150 ${
                        testing
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm active:scale-95'
                      }`}
                    >
                      {testing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                          <span>Verifying with Shiprocket...</span>
                        </>
                      ) : (
                        <>
                          <Wifi className="w-3.5 h-3.5 text-[#2563eb]" />
                          <span>Test connection</span>
                        </>
                      )}
                    </button>

                    {testResult && (
                      <div className={`text-xs px-3 py-2 rounded-lg border font-mono flex items-center space-x-1.5 max-w-full ${
                        testResult.success
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-rose-50 border-rose-200 text-rose-700'
                      }`} id="retool-test-result">
                        {testResult.success ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                        )}
                        <div className="truncate">
                          <span className="font-bold">{testResult.success ? 'Success: ' : 'Failed: '}</span>
                          <span>{testResult.message}</span>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

              </div>

              {/* Right Sidebar */}
              <div className="lg:col-span-4 p-6 sm:p-8 bg-[#f1f5f9]/50 flex flex-col justify-between" id="retool-sidebar-col">
                <div className="space-y-6">
                  
                  {/* Environments panel */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block">Environments (1/2)</span>
                    
                    <div className="space-y-2">
                      {/* production */}
                      <div 
                        onClick={() => handleToggleEnvironment('production')}
                        className={`p-3 rounded-lg border transition cursor-pointer flex items-center justify-between shadow-sm ${
                          !isSimulated 
                            ? 'bg-blue-50 border-blue-200 text-blue-800 font-bold' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                        title="Configure Live Production API Calls"
                      >
                        <div className="flex items-center space-x-2.5">
                          <div className={`w-2.5 h-2.5 rounded-full ${!isSimulated ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                          <span className="text-xs">production</span>
                        </div>
                        {!isSimulated && (
                          <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-black uppercase tracking-wide">Active</span>
                        )}
                      </div>

                      {/* staging */}
                      <div 
                        onClick={() => handleToggleEnvironment('staging')}
                        className={`p-3 rounded-lg border transition cursor-pointer flex items-center justify-between shadow-sm ${
                          isSimulated 
                            ? 'bg-amber-50/70 border-amber-200 text-amber-800 font-bold' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                        title="Configure Failsafe Simulator Fallback Mode"
                      >
                        <div className="flex items-center space-x-2.5">
                          <div className={`w-2.5 h-2.5 rounded-full ${isSimulated ? 'bg-amber-600 animate-pulse' : 'bg-slate-300'}`}></div>
                          <span className="text-xs">staging</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[9px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded font-bold tracking-wide">Business</span>
                          {isSimulated && (
                            <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black uppercase tracking-wide">Active</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-[10px] text-slate-400 italic leading-relaxed pt-1">
                      Production operates real shipping calls (AWB lock, routing label). Staging bypasses and simulates operations using local databases safely.
                    </p>
                  </div>

                  {/* Need Help Card */}
                  <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-3 shadow-sm" id="retool-help-card">
                    <h4 className="text-xs font-bold text-slate-800">Need help?</h4>
                    <div className="space-y-2 text-xs">
                      <a href="https://docs.shiprocket.in" target="_blank" rel="noreferrer" className="flex items-center space-x-2 text-slate-600 hover:text-blue-600 transition">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>REST API guide</span>
                      </a>
                      <a href="https://support.shiprocket.in" target="_blank" rel="noreferrer" className="flex items-center space-x-2 text-slate-600 hover:text-blue-600 transition">
                        <Info className="w-3.5 h-3.5 text-slate-400" />
                        <span>Troubleshoot connections</span>
                      </a>
                      <button type="button" className="flex items-center space-x-2 text-slate-600 hover:text-blue-600 transition text-left" onClick={() => alert('Feedback submitted! Thanks for co-creating Dappersfit.')}>
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                        <span>Share feedback</span>
                      </button>
                    </div>
                  </div>

                </div>

                {/* Footer label */}
                <div className="pt-6 text-center border-t border-slate-200 mt-6 lg:mt-0">
                  <span className="text-[9px] font-mono text-slate-400 block uppercase tracking-wider">DAPPER FIT INTEGRATION GATEWAY</span>
                </div>
              </div>

            </div>

          </div>

          {/* Failsafe Banner Indicator */}
          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-400 flex items-start space-x-2.5 font-mono leading-relaxed" id="api-status-warning">
            <ShieldAlert className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
            <div>
              <span className="font-bold uppercase tracking-wide block">Failsafe Simulator Integration</span>
              <p className="mt-0.5 text-[11px] text-slate-400">
                To switch Dapper Fit to live carrier execution, toggle the environment to <span className="text-blue-400 font-bold">production</span> and save your Bearer Token or Credentials. If empty, the system runs inside sandbox simulator fallback automatically.
              </p>
            </div>
          </div>

        </div>
      ) : (
        /* ==================== LOGISTICS & AUTOMATION ==================== */
        <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-200" id="logistics-form">
          
          {/* Status banner on save */}
          {saved && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl text-emerald-400 text-xs font-mono flex items-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span>Logistics parameters and templates updated successfully.</span>
            </div>
          )}

          {/* Warehouse pickup defaults */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4" id="section-warehouse">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
              <div className="p-1.5 rounded-lg bg-[#b8862f]/10 text-[#b8862f]">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Warehouse Dispatch Logistics</h3>
                <p className="text-[11px] text-slate-400">Default dispatch coordinates used for courier serviceability SLA checks.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-400">Pickup Pincode *</label>
                <input
                  type="text"
                  required
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="411037"
                  className="w-full p-2.5 border border-slate-700 rounded-lg text-sm bg-slate-950/60 text-slate-100 focus:border-[#b8862f] outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-400">Pickup City *</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Pune"
                  className="w-full p-2.5 border border-slate-700 rounded-lg text-sm bg-slate-950/60 text-slate-100 focus:border-[#b8862f] outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-400">Pickup State *</label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Maharashtra"
                  className="w-full p-2.5 border border-slate-700 rounded-lg text-sm bg-slate-950/60 text-slate-100 focus:border-[#b8862f] outline-none"
                />
              </div>
            </div>

            <div className="space-y-1 max-w-xs font-mono text-xs pt-1">
              <label className="font-semibold text-slate-400">Default Parcel Weight (kg) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                placeholder="0.5"
                className="w-full p-2.5 border border-slate-700 rounded-lg text-sm bg-slate-950/60 text-slate-100 focus:border-[#b8862f] outline-none"
              />
            </div>
          </div>

          {/* Automation Templates */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4" id="section-templates">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Automated Messaging Templates</h3>
                <p className="text-[11px] text-slate-400">
                  Write dynamic notifications. Placeholders: <code className="text-amber-400 font-mono">{"{{name}}"}</code>, <code className="text-amber-400 font-mono">{"{{id}}"}</code>, <code className="text-amber-400 font-mono">{"{{courier}}"}</code>, <code className="text-amber-400 font-mono">{"{{awb}}"}</code>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* WhatsApp Template */}
              <div className="space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-mono">
                  <MessageSquare className="w-4 h-4 text-emerald-450" />
                  <span className="font-bold text-slate-300">WhatsApp dispatch template</span>
                </div>
                <textarea
                  rows={4}
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full p-3 border border-slate-700 rounded-xl text-xs bg-slate-950/60 text-slate-100 focus:border-[#b8862f] outline-none font-mono resize-none leading-relaxed"
                />
              </div>

              {/* Email Template */}
              <div className="space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-mono">
                  <Mail className="w-4 h-4 text-sky-400" />
                  <span className="font-bold text-slate-300">Email dispatch template</span>
                </div>
                <textarea
                  rows={4}
                  value={mail}
                  onChange={(e) => setMail(e.target.value)}
                  className="w-full p-3 border border-slate-700 rounded-xl text-xs bg-slate-950/60 text-slate-100 focus:border-[#b8862f] outline-none font-mono resize-none leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Save button footer */}
          <div className="flex items-center justify-end" id="section-submit">
            <button
              type="submit"
              className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center space-x-2 transition-all ${
                saved 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-[#b8862f] hover:bg-[#a67527] text-white shadow-lg'
              }`}
            >
              {saved ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Configurations Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Logistics & Automation</span>
                </>
              )}
            </button>
          </div>

        </form>
      )}

      {/* Database Reset Operations Card */}
      <div className="bg-red-950/25 border border-red-900/40 p-6 rounded-2xl space-y-4 mt-6" id="database-operations">
        <div className="flex items-start space-x-3.5">
          <div className="p-2.5 rounded-lg bg-red-500/10 text-red-400">
            <ShieldAlert className="w-5 h-5 shrink-0" />
          </div>
          <div>
            <h3 className="font-bold text-red-400 text-sm">Database & Reset Operations (Danger Zone)</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Need to clear or start fresh? Trigger a complete clean-slate purge of all local collections. This permanently wipes out all **orders, employees, customers, and product databases** instantly. This action is irreversible.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-red-900/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="text-[10px] font-mono text-red-400/80">
            ⚠ HIGH PRIORITY ACTION • ACTIVE FILESYSTEM STORES RE-INITIALIZED TO EMPTY LISTS
          </span>
          <button
            type="button"
            onClick={handleWipeAllData}
            disabled={wiping}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-red-900/50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow shadow-red-500/15 flex items-center space-x-2 shrink-0 self-end sm:self-auto"
          >
            {wiping ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Purging databases...</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4" />
                <span>Wipe All Data</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
