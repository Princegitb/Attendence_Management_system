import React from 'react';
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  UserSquare2,
  MapPin,
  Clock,
  UserCheck,
  FileSpreadsheet,
  History
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'attendance', label: 'Attendance Monitor', icon: ClipboardCheck },
    { id: 'guards', label: 'Guard Roster & Bulk Import', icon: Users },
    { id: 'officers', label: 'Field Officers', icon: UserSquare2 },
    { id: 'posts', label: 'Posts & Leaflet Map', icon: MapPin },
    { id: 'assignments', label: 'Officer Assignments', icon: UserCheck },
    { id: 'shifts', label: 'Shift Setup', icon: Clock },
    { id: 'reports', label: 'Reports Export', icon: FileSpreadsheet },
    { id: 'audit', label: 'Audit Log Trail', icon: History },
  ];

  return (
    <aside className="w-64 bg-slate-800/60 border-r border-slate-700/60 p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-1">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-3">
          Main Menu
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20 font-semibold'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-slate-900/80 rounded-xl p-3.5 border border-slate-700/50 text-xs space-y-1.5">
        <div className="flex items-center space-x-2 text-emerald-400 font-semibold">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <span>System Active</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Geo-fence validation & OpenStreetMap active. PostgreSQL database connected.
        </p>
      </div>
    </aside>
  );
}
