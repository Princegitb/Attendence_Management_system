import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ShieldAlert, Users, Wand2, CheckCircle2, ChevronRight } from 'lucide-react';

export default function SmartRosterView() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [suggesting, setSuggesting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFulfillment();
  }, []);

  const loadFulfillment = async () => {
    setLoading(true);
    try {
      const res = await api.getFulfillmentStatus();
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggest = async () => {
    setSuggesting(true);
    try {
      const res = await api.getRosterSuggestions();
      if (res.success) {
        setSuggestions(res.data);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSuggesting(false);
    }
  };

  const handleApply = async () => {
    if (!suggestions || suggestions.suggestions.length === 0) return;
    
    setApplying(true);
    try {
      const res = await api.applyRosterSuggestions(suggestions.suggestions);
      if (res.success) {
        alert('Roster suggestions applied successfully!');
        setSuggestions(null);
        loadFulfillment();
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  };

  if (loading) return <div className="p-6 text-slate-400">Loading smart roster data...</div>;
  if (error) return <div className="p-6 text-rose-400">Error: {error}</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Smart Roster & Fulfillment <Wand2 className="w-5 h-5 text-purple-400" />
          </h2>
          <p className="text-xs text-slate-400">Automatically fulfill understaffed posts using available unassigned guards.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-lg">
          <div className="text-xs text-slate-400 font-semibold mb-1">Understaffed Posts</div>
          <div className="text-3xl font-bold text-rose-400">{data.summary.understaffed_posts}</div>
        </div>
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-lg">
          <div className="text-xs text-slate-400 font-semibold mb-1">Total Active Posts</div>
          <div className="text-3xl font-bold text-sky-400">{data.summary.total_posts}</div>
        </div>
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-lg">
          <div className="text-xs text-slate-400 font-semibold mb-1">Unassigned Guards Available</div>
          <div className="text-3xl font-bold text-emerald-400">{data.summary.unassigned_guards_available}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Posts Fulfillment List */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-lg space-y-4 h-[600px] flex flex-col">
          <h3 className="text-sm font-bold text-white border-b border-slate-700 pb-2">Post Fulfillment Status</h3>
          <div className="overflow-y-auto flex-1 pr-2 space-y-3">
            {data.posts.map(post => (
              <div key={post.post_id} className={`p-3 rounded-xl border ${post.fulfillment_status === 'UNDERSTAFFED' ? 'bg-rose-500/10 border-rose-500/30' : post.fulfillment_status === 'OVERSTAFFED' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold text-sm text-white">{post.post_name}</div>
                  {post.fulfillment_status === 'UNDERSTAFFED' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> SHORTAGE
                    </span>
                  )}
                  {post.fulfillment_status === 'OVERSTAFFED' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">
                      SURPLUS
                    </span>
                  )}
                  {post.fulfillment_status === 'FULFILLED' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                      FULFILLED
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Assigned: <strong className="text-slate-200">{post.assigned_guards}</strong> / {post.required_guards}</span>
                  {post.shortage > 0 && <span className="text-rose-400 font-medium">Needs {post.shortage} more</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Suggestion Engine */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-lg space-y-4 flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-700 pb-2">
            <h3 className="text-sm font-bold text-white">Intelligent Suggestions</h3>
            <button
              onClick={handleSuggest}
              disabled={suggesting || data.summary.understaffed_posts === 0 || data.summary.unassigned_guards_available === 0}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-500/20 flex items-center gap-1.5 transition-all"
            >
              <Wand2 className={`w-4 h-4 ${suggesting ? 'animate-pulse' : ''}`} /> 
              {suggesting ? 'Analyzing...' : 'Generate Suggestions'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {!suggestions ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3">
                <Wand2 className="w-12 h-12 opacity-20" />
                <p className="text-xs text-center max-w-[250px]">
                  {data.summary.understaffed_posts === 0 
                    ? "All posts are fulfilled! No suggestions needed." 
                    : data.summary.unassigned_guards_available === 0 
                      ? "You have understaffed posts but no unassigned guards available. Add more guards first."
                      : "Click generate to intelligently match your unassigned guards to understaffed posts."}
                </p>
              </div>
            ) : suggestions.suggestions.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs">No suitable matches could be found.</div>
            ) : (
              <div className="space-y-4">
                <div className="bg-sky-500/10 border border-sky-500/30 p-3 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-semibold text-sky-400">Found {suggestions.suggestions.length} optimal assignments</span>
                  <button
                    onClick={handleApply}
                    disabled={applying}
                    className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    {applying ? 'Applying...' : <><CheckCircle2 className="w-3.5 h-3.5"/> Apply All</>}
                  </button>
                </div>
                
                <div className="space-y-2">
                  {suggestions.suggestions.map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700 text-xs">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <div>
                          <div className="font-semibold text-slate-200">{s.guard_name}</div>
                          <div className="text-slate-500">{s.guard_mobile}</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 mx-2" />
                      <div className="flex flex-col items-end">
                        <div className="font-semibold text-sky-400">{s.post_name}</div>
                        <div className="text-slate-500 text-[10px]">New Assignment</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
