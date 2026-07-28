import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Link2, CheckCircle2, XCircle, Trash2, ShieldAlert, Award, FileText, ToggleLeft } from 'lucide-react';
import { api } from '../services/api';

export default function HolidaysView() {
  const [activeSubTab, setActiveSubTab] = useState('calendars'); // 'calendars' | 'events' | 'requests'
  
  // Data lists
  const [calendars, setCalendars] = useState([]);
  const [posts, setPosts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);

  // Selected calendar for event management
  const [selectedCalendarId, setSelectedCalendarId] = useState('');

  // Form States
  const [newCalendarName, setNewCalendarName] = useState('');
  const [newCalendarYear, setNewCalendarYear] = useState(new Date().getFullYear());
  const [selectedWeeklyOffs, setSelectedWeeklyOffs] = useState(['Sunday']);
  const [saturdayPolicy, setSaturdayPolicy] = useState('ALL_WORKING');
  const [sandwichPolicy, setSandwichPolicy] = useState(false);

  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayType, setHolidayType] = useState('REGULAR');

  const [linkPostId, setLinkPostId] = useState('');
  const [linkCalendarId, setLinkCalendarId] = useState('');

  const weekdaysList = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const loadCalendarsAndPosts = async () => {
    setLoading(true);
    try {
      const calRes = await api.getHolidayCalendars();
      if (calRes.success) setCalendars(calRes.data || []);

      // We need to fetch all posts to link them
      const postRes = await api.getPosts();
      if (postRes.success) setPosts(postRes.data || []);
      
      const reqRes = await api.getFloatingHolidayRequests();
      if (reqRes.success) setRequests(reqRes.data || []);
    } catch (err) {
      console.error('Failed to load holiday dependencies:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadHolidaysForCalendar = async (id) => {
    if (!id) return;
    try {
      const res = await api.getCalendarHolidays(id);
      if (res.success) {
        setHolidays(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load holidays:', err);
    }
  };

  useEffect(() => {
    loadCalendarsAndPosts();
  }, []);

  useEffect(() => {
    if (selectedCalendarId) {
      loadHolidaysForCalendar(selectedCalendarId);
    } else {
      setHolidays([]);
    }
  }, [selectedCalendarId]);

  const handleCreateCalendar = async (e) => {
    e.preventDefault();
    if (!newCalendarName) return;
    try {
      const res = await api.createHolidayCalendar({
        name: newCalendarName,
        year: parseInt(newCalendarYear, 10),
        weekly_offs: selectedWeeklyOffs,
        saturday_policy: saturdayPolicy,
        sandwich_policy: sandwichPolicy
      });
      if (res.success) {
        alert('Holiday Calendar created successfully!');
        setNewCalendarName('');
        loadCalendarsAndPosts();
      } else {
        alert(res.message || 'Failed to create calendar');
      }
    } catch (err) {
      alert(err.message || 'Error occurred');
    }
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!selectedCalendarId || !holidayName || !holidayDate) {
      alert('Please fill out all holiday fields.');
      return;
    }
    try {
      const res = await api.addCalendarHoliday({
        calendar_id: parseInt(selectedCalendarId, 10),
        date: holidayDate,
        name: holidayName,
        type: holidayType
      });
      if (res.success) {
        alert('Holiday added successfully!');
        setHolidayName('');
        setHolidayDate('');
        loadHolidaysForCalendar(selectedCalendarId);
      } else {
        alert(res.message || 'Failed to add holiday');
      }
    } catch (err) {
      alert(err.message || 'Error adding holiday');
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!window.confirm('Are you sure you want to delete this holiday event?')) return;
    try {
      const res = await api.deleteCalendarHoliday(id);
      if (res.success) {
        loadHolidaysForCalendar(selectedCalendarId);
      } else {
        alert(res.message || 'Failed to delete');
      }
    } catch (err) {
      alert(err.message || 'Error occurred');
    }
  };

  const handlePublishCalendar = async (id) => {
    if (!window.confirm('Are you sure you want to publish this calendar? Once published, it cannot be modified.')) return;
    try {
      const res = await api.publishHolidayCalendar(id);
      if (res.success) {
        alert('Calendar published successfully!');
        loadCalendarsAndPosts();
      } else {
        alert(res.message || 'Failed to publish');
      }
    } catch (err) {
      alert(err.message || 'Error occurred');
    }
  };

  const handleLinkPost = async (e) => {
    e.preventDefault();
    if (!linkPostId) return;
    try {
      const res = await api.linkPostToCalendar({
        post_id: parseInt(linkPostId, 10),
        holiday_calendar_id: linkCalendarId ? parseInt(linkCalendarId, 10) : null
      });
      if (res.success) {
        alert('Location calendar policy updated successfully!');
        loadCalendarsAndPosts();
      } else {
        alert(res.message || 'Failed to link');
      }
    } catch (err) {
      alert(err.message || 'Error linking location');
    }
  };

  const handleApproveRequest = async (id, status) => {
    if (!window.confirm(`Are you sure you want to mark this request as ${status}?`)) return;
    try {
      const res = await api.approveFloatingHoliday(id, status);
      if (res.success) {
        alert(`Request ${status.toLowerCase()} successfully.`);
        loadCalendarsAndPosts();
      } else {
        alert(res.message || 'Failed to process request');
      }
    } catch (err) {
      alert(err.message || 'Error occurred');
    }
  };

  const handleWeeklyOffToggle = (day) => {
    if (selectedWeeklyOffs.includes(day)) {
      setSelectedWeeklyOffs(selectedWeeklyOffs.filter(d => d !== day));
    } else {
      setSelectedWeeklyOffs([...selectedWeeklyOffs, day]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Weekly Off & Holiday Manager <Calendar className="w-5 h-5 text-sky-400" />
          </h2>
          <p className="text-xs text-slate-400">Configure weekly rest days, sandwich policies, national holidays, and location calendars in clicks.</p>
        </div>

        <div className="flex gap-2 self-start md:self-auto">
          <button
            onClick={() => setActiveSubTab('calendars')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'calendars' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ToggleLeft className="w-4 h-4" /> Setup Policies
          </button>
          <button
            onClick={() => setActiveSubTab('events')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'events' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Calendar className="w-4 h-4" /> Holiday Events
          </button>
          <button
            onClick={() => setActiveSubTab('requests')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'requests' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Award className="w-4 h-4" /> Floating Requests ({requests.filter(r => r.status === 'PENDING').length})
          </button>
        </div>
      </div>

      {activeSubTab === 'calendars' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Creator form */}
          <div className="lg:col-span-1 space-y-6">
            <form onSubmit={handleCreateCalendar} className="bg-slate-850/80 p-5 rounded-3xl border border-slate-700/50 space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-sky-400" /> Create Policy Calendar
              </h3>
              
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Calendar Name</label>
                <input
                  type="text"
                  placeholder="e.g. Delhi Security Guard Policy"
                  value={newCalendarName}
                  onChange={e => setNewCalendarName(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Calendar Year</label>
                <select
                  value={newCalendarYear}
                  onChange={e => setNewCalendarYear(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                  <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Weekly Off Days</label>
                <div className="flex flex-wrap gap-2">
                  {weekdaysList.map(day => {
                    const isChecked = selectedWeeklyOffs.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => handleWeeklyOffToggle(day)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                          isChecked ? 'bg-sky-500/10 text-sky-400 border-sky-500/40' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        {day.substring(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Saturday Policy</label>
                <select
                  value={saturdayPolicy}
                  onChange={e => setSaturdayPolicy(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="ALL_WORKING">ALL SATURDAYS WORKING</option>
                  <option value="2ND_4TH_OFF">2ND & 4TH SATURDAYS OFF</option>
                  <option value="ALL_OFF">ALL SATURDAYS OFF</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1.5">
                <input
                  type="checkbox"
                  id="sandwichPolicy"
                  checked={sandwichPolicy}
                  onChange={e => setSandwichPolicy(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-500 bg-slate-900 border-slate-700 focus:ring-0 focus:ring-offset-0"
                />
                <label htmlFor="sandwichPolicy" className="text-xs font-semibold text-slate-300 cursor-pointer select-none">
                  Enable Sandwich Policy Offs
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                Create Calendar
              </button>
            </form>

            <form onSubmit={handleLinkPost} className="bg-slate-850/80 p-5 rounded-3xl border border-slate-700/50 space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Link2 className="w-4 h-4 text-sky-400" /> Link Location Policy
              </h3>
              <p className="text-[10px] text-slate-400">Apply a specific holiday calendar ruleset to an active duty site location.</p>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Duty Location (Post)</label>
                <select
                  value={linkPostId}
                  onChange={e => setLinkPostId(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="">-- SELECT LOCATION --</option>
                  {posts.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.address})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Holiday Calendar Policy</label>
                <select
                  value={linkCalendarId}
                  onChange={e => setLinkCalendarId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="">-- NO CALENDAR (NO PAID OFFS) --</option>
                  {calendars.filter(c => c.is_published).map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.year})</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md"
              >
                Apply Calendar to Location
              </button>
            </form>
          </div>

          {/* List panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-700/40 bg-slate-900/40">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Holiday Calendars Ledger</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="p-4">Name</th>
                      <th className="p-4">Year</th>
                      <th className="p-4">Weekly Offs</th>
                      <th className="p-4">Saturday Rule</th>
                      <th className="p-4">Sandwich</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {calendars.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-500">No holiday calendars created yet.</td>
                      </tr>
                    ) : (
                      calendars.map(c => (
                        <tr key={c.id} className="hover:bg-slate-700/20">
                          <td className="p-4 font-semibold text-white">{c.name}</td>
                          <td className="p-4 font-mono">{c.year}</td>
                          <td className="p-4">
                            <span className="text-[10px] text-slate-400">
                              {c.weekly_offs && Array.isArray(c.weekly_offs) ? c.weekly_offs.join(', ') : 'None'}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-[10px]">
                            {c.saturday_policy === 'ALL_WORKING' ? 'Working' : c.saturday_policy === '2ND_4TH_OFF' ? '2nd/4th Off' : 'Off'}
                          </td>
                          <td className="p-4">
                            <span className={c.sandwich_policy ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                              {c.sandwich_policy ? 'ENABLED' : 'DISABLED'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {c.is_published ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                ACTIVE & PUBLISHED
                              </span>
                            ) : (
                              <button
                                onClick={() => handlePublishCalendar(c.id)}
                                className="px-2.5 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-lg text-[10px] font-semibold"
                              >
                                Publish Calendar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-700/40 bg-slate-900/40">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Active Location Policies</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="p-4">Duty Site (Post)</th>
                      <th className="p-4">Address</th>
                      <th className="p-4">Linked Calendar Policy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {posts.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-6 text-center text-slate-500">No duty locations configured.</td>
                      </tr>
                    ) : (
                      posts.map(p => {
                        const linkedCal = calendars.find(c => c.id === p.holiday_calendar_id);
                        return (
                          <tr key={p.id} className="hover:bg-slate-700/20">
                            <td className="p-4 font-semibold text-white">{p.name}</td>
                            <td className="p-4 text-slate-400">{p.address}</td>
                            <td className="p-4">
                              {linkedCal ? (
                                <span className="text-sky-400 font-bold">{linkedCal.name} ({linkedCal.year})</span>
                              ) : (
                                <span className="text-slate-500 italic">No calendar linked (No paid offs)</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'events' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <form onSubmit={handleAddHoliday} className="bg-slate-850/80 p-5 rounded-3xl border border-slate-700/50 space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-sky-400" /> Add Holiday Event
              </h3>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Target Calendar</label>
                <select
                  value={selectedCalendarId}
                  onChange={e => setSelectedCalendarId(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="">-- SELECT CALENDAR --</option>
                  {calendars.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.year}) {c.is_published ? '[Published]' : '[Draft]'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Holiday Name</label>
                <input
                  type="text"
                  placeholder="e.g. Independence Day"
                  value={holidayName}
                  onChange={e => setHolidayName(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Holiday Date</label>
                <input
                  type="date"
                  value={holidayDate}
                  onChange={e => setHolidayDate(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Holiday Type</label>
                <select
                  value={holidayType}
                  onChange={e => setHolidayType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="REGULAR">REGULAR PAID HOLIDAY</option>
                  <option value="NATIONAL">NATIONAL HOLIDAY</option>
                  <option value="RESTRICTED">RESTRICTED / FLOATING</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={!selectedCalendarId}
                className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                Add Holiday Event
              </button>
            </form>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-700/40 bg-slate-900/40 flex justify-between items-center">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Holidays List</h3>
                <span className="text-[10px] text-slate-400">Select a calendar on the left to load events.</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="p-4">Holiday Name</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Type</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {!selectedCalendarId ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-500">Please select a calendar from the dropdown to see holiday events.</td>
                      </tr>
                    ) : holidays.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-500">No holiday events added to this calendar yet.</td>
                      </tr>
                    ) : (
                      holidays.map(h => (
                        <tr key={h.id} className="hover:bg-slate-700/20">
                          <td className="p-4 font-semibold text-white">{h.name}</td>
                          <td className="p-4 font-mono">{new Date(h.date).toLocaleDateString([], {dateStyle: 'medium'})}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                              h.type === 'NATIONAL'
                                ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                                : h.type === 'RESTRICTED'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-slate-700/10 text-slate-400 border-slate-700/20'
                            }`}>
                              {h.type}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleDeleteHoliday(h.id)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg"
                              title="Delete Holiday"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'requests' && (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-700/40 bg-slate-900/40">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Floating/Restricted Holiday Approvals</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="p-4">Guard Name</th>
                  <th className="p-4">Mobile</th>
                  <th className="p-4">Holiday Event</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">No floating holiday requests found.</td>
                  </tr>
                ) : (
                  requests.map(r => (
                    <tr key={r.id} className="hover:bg-slate-700/20">
                      <td className="p-4 font-semibold text-white">{r.guard_name}</td>
                      <td className="p-4 font-mono text-slate-400">{r.guard_mobile}</td>
                      <td className="p-4">{r.holiday_name}</td>
                      <td className="p-4 font-mono">{new Date(r.date).toLocaleDateString([], {dateStyle: 'medium'})}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          r.status === 'APPROVED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : r.status === 'REJECTED'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {r.status === 'PENDING' ? (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleApproveRequest(r.id, 'APPROVED')}
                              className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-lg inline-flex items-center gap-1 text-[10px] font-bold"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => handleApproveRequest(r.id, 'REJECTED')}
                              className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 rounded-lg inline-flex items-center gap-1 text-[10px] font-bold"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic font-medium">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
