import React from 'react';
import { Shield, LogOut, UserCheck, Calendar } from 'lucide-react';

export default function Navbar({ user, onLogout }) {
  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <header className="bg-slate-800/90 backdrop-blur border-b border-slate-700/60 sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between shadow-lg">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            Guard Attendance <span className="text-xs bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full font-medium">Manager Dashboard</span>
          </h1>
          <p className="text-xs text-slate-400">Security Workforce Operations & Verification</p>
        </div>
      </div>

      <div className="flex items-center space-x-5">
        <div className="hidden md:flex items-center space-x-2 text-xs text-slate-300 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-700/50">
          <Calendar className="w-4 h-4 text-sky-400" />
          <span>{todayStr}</span>
        </div>

        <div className="flex items-center space-x-3 border-l border-slate-700 pl-4">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-200 font-bold text-xs">
            {user?.name?.[0]?.toUpperCase() || 'M'}
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-semibold text-slate-200">{user?.name || 'Admin Manager'}</div>
            <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
              <UserCheck className="w-3 h-3" /> Manager Role
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Log Out"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
