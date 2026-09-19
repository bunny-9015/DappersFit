/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Plus, User, Mail, ShieldAlert, BadgeCheck, Phone, 
  MapPin, Edit, Trash2, Key, Lock, Check, X, Eye, EyeOff, Clipboard 
} from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: 'Active' | 'On Leave' | 'Inactive';
  joiningDate: string;
  payoutRate: number;
  username?: string;
  password?: string;
}

const INITIAL_EMPLOYEES: Employee[] = [];

interface EmployeesPanelProps {
  currentUser?: { name: string; email: string; role: 'admin' | 'employee' } | null;
}

export default function EmployeesPanel({ currentUser }: EmployeesPanelProps) {
  const filterOutDeleted = (list: any[]) => {
    if (!Array.isArray(list)) return [];
    return list.filter((e: any) => {
      if (!e || !e.name) return false;
      const lowerName = String(e.name).toLowerCase().trim();
      const lowerEmail = String(e.email || '').toLowerCase().trim();
      const lowerUsername = String(e.username || '').toLowerCase().trim();
      return !(
        lowerName === 'harika' ||
        lowerName === 'rani' ||
        lowerEmail.includes('harika') ||
        lowerEmail.includes('esterranirani585') ||
        lowerUsername.includes('harika') ||
        lowerUsername.includes('esterranirani585')
      );
    });
  };

  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('dappersfit_employees');
    return saved ? filterOutDeleted(JSON.parse(saved)) : INITIAL_EMPLOYEES;
  });
  
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add Employee Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Fulfillment Executive');
  const [payoutRate, setPayoutRate] = useState(35000);
  const [empUsername, setEmpUsername] = useState('');
  const [empPassword, setEmpPassword] = useState('');

  // Edit Employee Form State
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPayoutRate, setEditPayoutRate] = useState(35000);
  const [editStatus, setEditStatus] = useState<'Active' | 'On Leave' | 'Inactive'>('Active');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');

  // Fetch employees from backend database on mount
  useEffect(() => {
    async function fetchEmployees() {
      try {
        const res = await fetch('/api/employees');
        const data = await res.json();
        if (data.employees) {
          setEmployees(filterOutDeleted(data.employees));
        }
      } catch (err) {
        console.error('Failed to load employees from server:', err);
      }
    }
    fetchEmployees();
  }, []);

  // Save employees to localStorage whenever they are updated
  useEffect(() => {
    localStorage.setItem('dappersfit_employees', JSON.stringify(employees));
  }, [employees]);

  // Pre-fill Edit form when entering edit mode
  useEffect(() => {
    if (selectedEmp) {
      setEditName(selectedEmp.name);
      setEditEmail(selectedEmp.email);
      setEditPhone(selectedEmp.phone);
      setEditRole(selectedEmp.role);
      setEditPayoutRate(selectedEmp.payoutRate);
      setEditStatus(selectedEmp.status);
      setEditUsername(selectedEmp.username || selectedEmp.email);
      setEditPassword(selectedEmp.password || 'Password@123');
    }
  }, [selectedEmp, isEditing]);

  const filtered = employees.filter(e => 
    (e.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (e.role || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone) return;

    const newEmp: Employee = {
      id: `emp-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      name,
      email,
      phone,
      role,
      status: 'Active',
      joiningDate: new Date().toISOString().slice(0, 10),
      payoutRate: Number(payoutRate),
      username: empUsername || email,
      password: empPassword || 'Password@123'
    };

    setEmployees([...employees, newEmp]);
    setShowAdd(false);

    fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEmp)
    }).catch(err => console.error('Failed to save employee on server:', err));
    
    // Reset form
    setName('');
    setEmail('');
    setPhone('');
    setRole('Fulfillment Executive');
    setPayoutRate(35000);
    setEmpUsername('');
    setEmpPassword('');
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;

    const updatedEmp = {
      ...selectedEmp,
      name: editName,
      email: editEmail,
      phone: editPhone,
      role: editRole,
      payoutRate: Number(editPayoutRate),
      status: editStatus,
      username: editUsername,
      password: editPassword
    };

    const updatedList = employees.map(emp => emp.id === selectedEmp.id ? updatedEmp : emp);

    setEmployees(updatedList);
    setIsEditing(false);
    
    // Update selectedEmp state with updated values
    setSelectedEmp(updatedEmp);

    fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedEmp)
    }).catch(err => console.error('Failed to update employee on server:', err));
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to terminate/delete this employee profile? All login credentials will be immediately revoked.')) {
      setEmployees(employees.filter(e => e.id !== id));
      setSelectedEmp(null);
      setIsEditing(false);

      try {
        await fetch(`/api/employees/${id}`, {
          method: 'DELETE'
        });
      } catch (err) {
        console.error('Failed to delete employee on server:', err);
      }
    }
  };

  const handleCopyCredentials = (text: string, type: 'username' | 'password') => {
    navigator.clipboard.writeText(text);
    const key = `${selectedEmp?.id}-${type}`;
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 font-sans text-slate-100" id="employees-panel">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Employee Directory</h1>
          <p className="text-sm text-slate-400 mt-1">Manage platform dispatch workers, roles, payroll base tier rates, and account status.</p>
        </div>
        <button
          onClick={() => {
            setShowAdd(true);
            setEmpUsername('');
            setEmpPassword('');
          }}
          className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm rounded-xl flex items-center space-x-1.5 transition self-start shadow-lg"
          id="add-emp-btn"
        >
          <Plus className="w-4 h-4" />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-xl flex items-center space-x-4">
          <div className="p-3 bg-sky-500/10 text-sky-400 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Active Employees</span>
            <span className="text-2xl font-black font-mono text-white">{employees.filter(e => e.status === 'Active').length}</span>
          </div>
        </div>

        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-xl flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <BadgeCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Attendance Rate</span>
            <span className="text-2xl font-black font-mono text-white">98.4%</span>
          </div>
        </div>

        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-xl flex items-center space-x-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Total Registered</span>
            <span className="text-2xl font-black font-mono text-white">{employees.length}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-xl items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee by name, email or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-750 rounded-lg text-sm bg-slate-900/60 text-slate-100 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none transition"
          />
        </div>
      </div>

      {/* Grid of employees */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-700 text-xs font-mono uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Role / Title</th>
                <th className="px-6 py-4">Joining Date</th>
                <th className="px-6 py-4">Salary Tier Base</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 text-slate-300 text-sm">
              {filtered.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-700/30 transition duration-150">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center font-bold text-sky-400 text-xs">
                        {emp.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <span className="font-bold text-slate-200 block">{emp.name}</span>
                        <span className="text-xs text-slate-400 font-mono flex items-center space-x-1.5">
                          <Mail className="w-3 h-3 text-slate-500" />
                          <span>{emp.email}</span>
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-300">{emp.role}</td>
                  <td className="px-6 py-4 font-mono text-xs">{emp.joiningDate}</td>
                  <td className="px-6 py-4 font-mono font-bold text-white">₹{emp.payoutRate.toLocaleString()}/mo</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-[10px] font-mono border font-semibold rounded-full uppercase tracking-wider ${
                      emp.status === 'Active' 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : emp.status === 'On Leave'
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    }`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedEmp(emp);
                          setIsEditing(false);
                          setShowPassword(false);
                        }}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-sky-400 hover:text-white transition"
                      >
                        View Profile
                      </button>
                      {currentUser?.role === 'admin' ? (
                        <button
                          onClick={() => handleDelete(emp.id)}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 rounded-lg transition"
                          title="Delete Employee"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          disabled
                          className="p-1.5 bg-slate-800 text-slate-600 border border-slate-750 rounded-lg cursor-not-allowed"
                          title="Admin access required to delete employees"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500 font-mono text-xs">
                    No matching employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAdd} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Add New Employee Profile</h3>
              <button 
                type="button" 
                onClick={() => setShowAdd(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm outline-none focus:border-sky-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Email Address</label>
              <input
                type="email"
                required
                placeholder="e.g. ramesh@dapperfit.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  // Default username to email
                  if (!empUsername) setEmpUsername(e.target.value);
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm outline-none focus:border-sky-400 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Phone Number</label>
              <input
                type="text"
                required
                placeholder="10-digit number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm outline-none focus:border-sky-400 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Role Title</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-300 text-sm outline-none focus:border-sky-400"
                >
                  <option value="Fulfillment Executive">Fulfillment Exec</option>
                  <option value="Inventory Lead">Inventory Lead</option>
                  <option value="Dispatch Clerk">Dispatch Clerk</option>
                  <option value="Operations Manager">Operations Mgr</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Salary Base (₹/mo)</label>
                <input
                  type="number"
                  required
                  value={payoutRate}
                  onChange={(e) => setPayoutRate(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm outline-none focus:border-sky-400 font-mono"
                />
              </div>
            </div>

            {/* Login Credentials Section */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-sky-400 flex items-center space-x-1 font-mono">
                <Key className="w-3.5 h-3.5" />
                <span>LOGIN CREDENTIALS</span>
              </span>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-500 block uppercase">Login Username/Email</label>
                <input
                  type="text"
                  placeholder="Defaults to Email"
                  value={empUsername}
                  onChange={(e) => setEmpUsername(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 text-xs outline-none focus:border-sky-400 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-500 block uppercase">Assign Password</label>
                <input
                  type="text"
                  placeholder="Defaults to Password@123"
                  value={empPassword}
                  onChange={(e) => setEmpPassword(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 text-xs outline-none focus:border-sky-400 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 border border-slate-700 rounded-xl text-xs font-bold hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl shadow"
              >
                Onboard Employee
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Employee Detail Modal View & Edit Form */}
      {selectedEmp && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg space-y-6 shadow-2xl relative overflow-hidden">
            
            {/* Top Close */}
            <button
              onClick={() => {
                setSelectedEmp(null);
                setIsEditing(false);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            {!isEditing ? (
              /* VIEW PROFILE PANEL */
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 font-extrabold text-xl">
                      {selectedEmp.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>{selectedEmp.name}</span>
                        <span className={`text-[9px] font-mono border font-semibold rounded-full px-2 py-0.5 uppercase tracking-wider ${
                          selectedEmp.status === 'Active' 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        }`}>
                          {selectedEmp.status}
                        </span>
                      </h3>
                      <p className="text-sm text-sky-400 font-semibold">{selectedEmp.role}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm font-mono border-t border-b border-slate-800 py-4">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">EMAIL ADDRESS</span>
                    <span className="text-slate-200 font-semibold block mt-1 break-all">{selectedEmp.email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">CONTACT PHONE</span>
                    <span className="text-slate-200 font-semibold block mt-1">+91 {selectedEmp.phone}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">BASE MONTHLY PAYOUT</span>
                    <span className="text-emerald-400 font-extrabold block mt-1">₹{selectedEmp.payoutRate.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">JOINING REGISTRATION</span>
                    <span className="text-slate-200 font-semibold block mt-1">{selectedEmp.joiningDate}</span>
                  </div>
                </div>

                {/* Login Credentials Subsection */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-400 flex items-center space-x-1.5 font-mono">
                      <Key className="w-4 h-4 text-sky-400" />
                      <span>LOGIN CREDENTIALS</span>
                    </span>
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-white flex items-center space-x-1 font-mono text-[10px]"
                    >
                      {showPassword ? (
                        <>
                          <EyeOff className="w-3 h-3" />
                          <span>Hide Details</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" />
                          <span>Show Details</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-slate-500 block">LOGIN EMAIL/USERNAME</span>
                        <span className="text-slate-200 font-semibold block">{selectedEmp.username || selectedEmp.email}</span>
                      </div>
                      <button
                        onClick={() => handleCopyCredentials(selectedEmp.username || selectedEmp.email, 'username')}
                        className="p-1.5 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 text-slate-400 hover:text-white transition"
                        title="Copy Username"
                      >
                        {copiedId === `${selectedEmp.id}-username` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                        ) : (
                          <Clipboard className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-slate-500 block">SYSTEM LOGIN PASSWORD</span>
                        <span className="text-slate-200 font-semibold block font-mono">
                          {showPassword ? (selectedEmp.password || 'Password@123') : '••••••••••••'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopyCredentials(selectedEmp.password || 'Password@123', 'password')}
                        className="p-1.5 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 text-slate-400 hover:text-white transition"
                        title="Copy Password"
                      >
                        {copiedId === `${selectedEmp.id}-password` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                        ) : (
                          <Clipboard className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Logistical Shift Performance Score</h4>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between font-mono">
                      <span>SLA Shipping Punctuality</span>
                      <span className="font-bold text-sky-400">99.1%</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span>Scanning & Labelling Errors</span>
                      <span className="font-bold text-emerald-400">0%</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span>Packages Dispatched This Month</span>
                      <span className="font-bold text-white">418 packets</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-800">
                  {currentUser?.role === 'admin' ? (
                    <button
                      onClick={() => handleDelete(selectedEmp.id)}
                      className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-white border border-rose-500/20 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Profile</span>
                    </button>
                  ) : (
                    <button
                      disabled
                      className="px-4 py-2 bg-slate-800 text-slate-500 border border-slate-750 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-not-allowed"
                      title="Admin access required to delete employees"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Profile (Admin Only)</span>
                    </button>
                  )}

                  <div className="flex space-x-2">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/45 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit Profile</span>
                    </button>
                    <button
                      onClick={() => setSelectedEmp(null)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* EDIT PROFILE FORM */
              <form onSubmit={handleUpdate} className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-850">
                  <Edit className="w-5 h-5 text-sky-400" />
                  <span>Edit Employee Profile</span>
                </h3>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm outline-none focus:border-sky-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Email Address</label>
                    <input
                      type="email"
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs outline-none focus:border-sky-400 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Phone Number</label>
                    <input
                      type="text"
                      required
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs outline-none focus:border-sky-400 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1 col-span-2">
                    <label className="text-xs font-semibold text-slate-400">Role Title</label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-300 text-xs outline-none focus:border-sky-400"
                    >
                      <option value="Fulfillment Executive">Fulfillment Exec</option>
                      <option value="Inventory Lead">Inventory Lead</option>
                      <option value="Dispatch Clerk">Dispatch Clerk</option>
                      <option value="Operations Manager">Operations Mgr</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-300 text-xs outline-none focus:border-sky-400"
                    >
                      <option value="Active">Active</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Salary Base (₹/mo)</label>
                  <input
                    type="number"
                    required
                    value={editPayoutRate}
                    onChange={(e) => setEditPayoutRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm outline-none focus:border-sky-400 font-mono"
                  />
                </div>

                {/* Edit Login Credentials Subsection */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-sky-400 flex items-center space-x-1.5 font-mono">
                    <Key className="w-4 h-4 text-sky-400" />
                    <span>MANAGE CREDENTIALS</span>
                  </span>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-500 block uppercase">Username/Email</label>
                      <input
                        type="text"
                        required
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 text-xs outline-none focus:border-sky-400 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-500 block uppercase">Assign Password</label>
                      <input
                        type="text"
                        required
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 text-xs outline-none focus:border-sky-400 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-slate-700 rounded-xl text-xs font-bold hover:bg-slate-800"
                  >
                    Discard Changes
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow"
                  >
                    Save & Apply
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
