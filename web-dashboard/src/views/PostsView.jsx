import React, { useEffect, useState } from 'react';
import { MapPin, Plus, Edit2 } from 'lucide-react';
import { api } from '../services/api';
import LocationPickerMap from '../components/LocationPickerMap';

export default function PostsView() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: 28.613939,
    longitude: 77.209021,
    allowed_radius_metres: 100,
    status: 'ACTIVE'
  });

  const [error, setError] = useState('');

  const loadPosts = async () => {
    setLoading(true);
    try {
      const res = await api.getPosts();
      if (res.success) setPosts(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleOpenCreate = () => {
    setEditingPost(null);
    setFormData({
      name: '',
      address: '',
      latitude: 28.613939,
      longitude: 77.209021,
      allowed_radius_metres: 100,
      status: 'ACTIVE'
    });
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (post) => {
    setEditingPost(post);
    setFormData({
      name: post.name,
      address: post.address,
      latitude: parseFloat(post.latitude),
      longitude: parseFloat(post.longitude),
      allowed_radius_metres: parseInt(post.allowed_radius_metres || 100),
      status: post.status
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || formData.latitude === undefined || formData.longitude === undefined || isNaN(formData.latitude) || isNaN(formData.longitude)) {
      setError('Post name, valid latitude, and longitude are required.');
      return;
    }

    try {
      let res;
      if (editingPost) {
        res = await api.updatePost(editingPost.id, formData);
      } else {
        res = await api.createPost(formData);
      }

      if (res.success) {
        setShowModal(false);
        loadPosts();
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Posts & Locations (Geo-Fence Setup) <MapPin className="w-5 h-5 text-sky-400" />
          </h2>
          <p className="text-xs text-slate-400">Configure security posts and GPS geo-fence radiuses for guard verification.</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-semibold shadow-lg shadow-sky-500/20 flex items-center gap-1.5 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Security Post
        </button>
      </div>

      {/* Posts Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-6 text-center text-slate-400">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="col-span-full p-6 text-center text-slate-500">No security posts configured. Add your first post location above.</div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-3 shadow-lg relative group">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{post.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{post.address || 'No address specified'}</p>
                </div>
                <button
                  onClick={() => handleOpenEdit(post)}
                  className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/50 text-xs space-y-1.5">
                <div className="flex justify-between font-mono text-slate-300">
                  <span className="text-slate-500">Latitude:</span>
                  <span>{post.latitude}</span>
                </div>
                <div className="flex justify-between font-mono text-slate-300">
                  <span className="text-slate-500">Longitude:</span>
                  <span>{post.longitude}</span>
                </div>
                <div className="flex justify-between font-mono text-emerald-400 font-semibold border-t border-slate-800 pt-1">
                  <span>Geo-fence Radius:</span>
                  <span>{post.allowed_radius_metres} meters</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Post Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white">
              {editingPost ? 'Edit Security Post Details' : 'Create New Security Post'}
            </h3>

            {error && <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Post Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Main Gate - HQ"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Allowed Radius (Meters)</label>
                  <input
                    type="number"
                    value={formData.allowed_radius_metres}
                    onChange={(e) => setFormData({ ...formData, allowed_radius_metres: parseInt(e.target.value) || 100 })}
                    placeholder="e.g. 100"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Address / Location Description</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. Central Business District, Gate A"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Card-Free Location & Coordinates Picker */}
              <div>
                <LocationPickerMap
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  radius={formData.allowed_radius_metres}
                  onLocationSelect={({ latitude, longitude, address }) => {
                    setFormData(prev => ({
                      ...prev,
                      latitude: parseFloat(latitude),
                      longitude: parseFloat(longitude),
                      address: address ? address.split(',')[0] : prev.address
                    }));
                  }}
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-semibold"
                >
                  Save Post Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
