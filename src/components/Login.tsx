/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, User, Lock, ArrowRight, ShieldAlert } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: { name: string; email: string; role: 'admin' | 'employee' }) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
    const [role, setRole] = useState<'admin' | 'employee'>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });
      const data = await response.json();
      
      if (data.success && data.user) {
        onLoginSuccess(data.user);
      } else {
        setError(data.error || 'Invalid credentials. Please verify your details.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error during login. Please ensure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden" id="login-container">
      {/* Background radial highlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6"
        id="login-card"
      >
        {/* Brand */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black tracking-widest text-sky-400 font-sans">
            DAPPERS<span className="text-slate-100 font-normal">FIT</span>
          </h1>
          <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">
            Shipping Label Management System
          </p>
        </div>

        {/* Role Toggle Selector */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800" id="role-selector">
          <button
            type="button"
            onClick={() => { setRole('admin'); setError(null); }}
            className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 ${
              role === 'admin'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Administrator</span>
          </button>
          <button
            type="button"
            onClick={() => { setRole('employee'); setError(null); }}
            className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 ${
              role === 'employee'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Fulfillment Staff</span>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-start space-x-2"
          >
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" id="login-form">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Email Address</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dappersfit@gmail.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-sm py-3.5 rounded-xl flex items-center justify-center space-x-2 transition shadow-lg shadow-sky-500/10 disabled:opacity-50"
            id="login-submit-btn"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Secure Session Login</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
