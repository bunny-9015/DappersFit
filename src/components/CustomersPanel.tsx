/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, UserCheck, Phone, MapPin, Mail, ShoppingBag, Trash2 } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  ordersCount: number;
  totalSpent: number;
}

const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'BANDARU VENKATESH', phone: '8019566202', email: 'bandaru.venk@gmail.com', city: 'Chemakurti', state: 'Andhra Pradesh', ordersCount: 1, totalSpent: 2200 },
  { id: 'c2', name: 'Lokesh Kamath', phone: '9041935824', email: 'lokesh.kamath@gmail.com', city: 'Bangalore', state: 'Karnataka', ordersCount: 1, totalSpent: 2000 },
  { id: 'c3', name: 'BUNNY', phone: '7071799145', email: 'bunny.style@gmail.com', city: 'Kolkata', state: 'West Bengal', ordersCount: 1, totalSpent: 2400 },
  { id: 'c4', name: 'Aarav Sharma', phone: '9876543211', email: 'aarav.sharma@gmail.com', city: 'Pune', state: 'Maharashtra', ordersCount: 2, totalSpent: 4297 },
  { id: 'c5', name: 'Ananya Iyer', phone: '8765432109', email: 'ananya.iyer@gmail.com', city: 'Bengaluru', state: 'Karnataka', ordersCount: 1, totalSpent: 3298 }
];

interface CustomersPanelProps {
  currentUser?: { name: string; email: string; role: 'admin' | 'employee' } | null;
}

export default function CustomersPanel({ currentUser }: CustomersPanelProps) {
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [search, setSearch] = useState('');

  // Fetch customers from backend database on mount
  useEffect(() => {
    async function fetchCustomers() {
      try {
        const res = await fetch('/api/customers');
        const data = await res.json();
        if (data.customers) {
          setCustomers(data.customers);
        }
      } catch (err) {
        console.error('Failed to load customers from server:', err);
      }
    }
    fetchCustomers();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this customer profile? This action is irreversible.')) {
      setCustomers(customers.filter(c => c.id !== id));
      try {
        await fetch(`/api/customers/${id}`, {
          method: 'DELETE'
        });
      } catch (err) {
        console.error('Failed to delete customer on server:', err);
      }
    }
  };

  const filtered = customers.filter(c => 
    (c.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (c.city || '').toLowerCase().includes(search.toLowerCase()) || 
    (c.phone || '').includes(search)
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 font-sans text-slate-100" id="customers-panel">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Customers Database</h1>
        <p className="text-sm text-slate-400 mt-1">Review customer delivery profiles, contact phone numbers, total invoice history, and locations.</p>
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-xl flex items-center space-x-4">
          <div className="p-3 bg-sky-500/10 text-sky-400 rounded-lg">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Registered Accounts</span>
            <span className="text-2xl font-black font-mono text-white">{customers.length}</span>
          </div>
        </div>

        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-xl flex items-center space-x-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Avg Order Count</span>
            <span className="text-2xl font-black font-mono text-white">1.2 orders</span>
          </div>
        </div>

        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-xl flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Customer LTV</span>
            <span className="text-2xl font-black font-mono text-white">₹2,839 avg</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-xl items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, phone, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-750 rounded-lg text-sm bg-slate-900/60 text-slate-100 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none transition"
          />
        </div>
      </div>

      {/* Table list */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-700 text-xs font-mono uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Contact Phone</th>
                <th className="px-6 py-4">Delivery Location</th>
                <th className="px-6 py-4">Total Orders</th>
                <th className="px-6 py-4">LTV Billing</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 text-slate-300 text-sm">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-700/30 transition duration-150">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center font-bold text-sky-400 text-sm">
                        {c.name.split(' ').slice(0, 2).map(n => n[0]).join('')}
                      </div>
                      <div>
                        <span className="font-bold text-slate-200 block">{c.name}</span>
                        <span className="text-xs text-slate-400 font-mono flex items-center space-x-1.5 mt-0.5">
                          <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{c.email}</span>
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-300 font-semibold">{c.phone}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-450 font-mono flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{c.city}, {c.state}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-slate-100">{c.ordersCount} orders</td>
                  <td className="px-6 py-4 font-bold font-mono text-emerald-400">₹{c.totalSpent.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">
                    {currentUser?.role === 'admin' ? (
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 rounded-lg transition inline-flex items-center"
                        title="Delete Customer Profile"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        disabled
                        className="p-1.5 bg-slate-800 text-slate-600 border border-slate-750 rounded-lg cursor-not-allowed inline-flex items-center"
                        title="Admin access required to delete customers"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500 font-mono text-xs">
                    No matching customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
