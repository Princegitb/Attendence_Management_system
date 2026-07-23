import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LoginView from './views/LoginView';
import OverviewView from './views/OverviewView';
import AttendanceView from './views/AttendanceView';
import GuardsView from './views/GuardsView';
import OfficersView from './views/OfficersView';
import PostsView from './views/PostsView';
import AssignmentsView from './views/AssignmentsView';
import ShiftsView from './views/ShiftsView';
import ReportsView from './views/ReportsView';
import { getCurrentUser, logout } from './services/api';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  if (!user) {
    return <LoginView onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100 selection:bg-sky-500 selection:text-white">
      <Navbar user={user} onLogout={handleLogout} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-6 overflow-y-auto bg-slate-950">
          {activeTab === 'overview' && <OverviewView onNavigate={(tab) => setActiveTab(tab)} />}
          {activeTab === 'attendance' && <AttendanceView />}
          {activeTab === 'guards' && <GuardsView />}
          {activeTab === 'officers' && <OfficersView />}
          {activeTab === 'posts' && <PostsView />}
          {activeTab === 'assignments' && <AssignmentsView />}
          {activeTab === 'shifts' && <ShiftsView />}
          {activeTab === 'reports' && <ReportsView />}
        </main>
      </div>
    </div>
  );
}
