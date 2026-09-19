import React, { useState } from 'react';
import { X, Save, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';

interface ProfileModalProps {
  user: any;
  onClose: () => void;
}

export default function ProfileModal({ user, onClose }: ProfileModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: user?.role,
          userId: user?.id,
          email: user?.email,
          oldPassword: currentPassword,
          newPassword: newPassword
        })
      });
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(data.error || 'Failed to update password.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1c1b1a] w-full max-w-md rounded-2xl shadow-2xl border border-[#2a2826] flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-[#2a2826] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#b8862f]/10 rounded-xl border border-[#b8862f]/20">
              <KeyRound className="w-5 h-5 text-[#b8862f]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Your Profile</h2>
              <p className="text-sm text-slate-400">View details & change password</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {/* User Details */}
          <div className="mb-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="text-sm font-medium text-slate-400">Name</div>
              <div className="text-sm font-bold text-white">{user?.name || 'Dappersfit Admin'}</div>
            </div>
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="text-sm font-medium text-slate-400">Email</div>
              <div className="text-sm font-bold text-white">{user?.email || 'dappersfit@gmail.com'}</div>
            </div>
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="text-sm font-medium text-slate-400">Role</div>
              <div className="text-sm font-bold text-white capitalize">{user?.role || 'User'}</div>
            </div>
          </div>

          <div className="h-px w-full bg-[#2a2826] my-6" />

          {/* Change Password Form */}
          <h3 className="text-lg font-bold text-white mb-4">Change Password</h3>
          
          {success && (
            <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center space-x-3 text-green-400">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">{success}</p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-3 text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-[#141312] border border-[#2a2826] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#b8862f] focus:ring-1 focus:ring-[#b8862f] transition"
                placeholder="Enter current password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#141312] border border-[#2a2826] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#b8862f] focus:ring-1 focus:ring-[#b8862f] transition"
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#141312] border border-[#2a2826] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#b8862f] focus:ring-1 focus:ring-[#b8862f] transition"
                placeholder="Confirm new password"
              />
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-6 bg-[#b8862f] hover:bg-[#a07428] text-white font-bold py-3.5 px-4 rounded-xl transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              <span>{isSubmitting ? 'Updating...' : 'Update Password'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
