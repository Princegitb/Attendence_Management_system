import React, { useState } from 'react';
import { MapPin, Search, Navigation, CheckCircle2, Loader2 } from 'lucide-react';

export default function LocationPickerMap({
  latitude,
  longitude,
  radius = 100,
  onLocationSelect
}) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [currentPos, setCurrentPos] = useState({
    lat: latitude ? parseFloat(latitude) : 28.613939,
    lng: longitude ? parseFloat(longitude) : 77.209021,
    address: ''
  });

  const performSearch = async (searchQuery) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);

    try {
      // High-speed OpenStreetMap Photon geocoder (Zero Card / Zero API Key Required)
      const res = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      const data = await res.json();

      const results = (data.features || []).map((f) => {
        const props = f.properties;
        const nameParts = [
          props.name,
          props.street,
          props.district || props.city || props.county,
          props.state,
          props.country
        ].filter(Boolean);

        return {
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
          display_name: nameParts.join(', ')
        };
      });

      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    performSearch(val);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    performSearch(query);
  };

  const handleSelectResult = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const address = item.display_name;

    setCurrentPos({ lat, lng, address });
    setSearchResults([]);
    setQuery(item.display_name);

    onLocationSelect({
      latitude: lat,
      longitude: lng,
      address
    });
  };

  const handleDetectCurrentLocation = () => {
    if (navigator.geolocation) {
      setSearching(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const address = `Live GPS Location (${lat.toFixed(6)}, ${lng.toFixed(6)})`;

          setCurrentPos({ lat, lng, address });
          setSearching(false);

          onLocationSelect({
            latitude: lat,
            longitude: lng,
            address
          });
        },
        (err) => {
          setSearching(false);
          alert('Could not detect location: ' + err.message);
        }
      );
    }
  };

  return (
    <div className="space-y-4 bg-slate-900 border border-slate-700/80 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-white flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-sky-400" /> Post Location & Coordinates
        </label>

        <button
          type="button"
          onClick={handleDetectCurrentLocation}
          className="px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
        >
          <Navigation className="w-3.5 h-3.5" /> Detect My GPS
        </button>
      </div>

      {/* Instant Live Search Bar */}
      <form onSubmit={handleFormSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Search landmark or city (e.g. Cyber City, Noida, Mumbai)..."
          className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-24 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
        />
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />

        <button
          type="submit"
          disabled={searching}
          className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
        >
          {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
        </button>
      </form>

      {/* Live Search Results Dropdown */}
      {searchResults.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden divide-y divide-slate-700/60 max-h-48 overflow-y-auto shadow-2xl">
          {searchResults.map((item, idx) => (
            <div
              key={idx}
              onClick={() => handleSelectResult(item)}
              className="p-2.5 hover:bg-slate-700/80 cursor-pointer text-xs text-slate-300 transition-colors flex items-start gap-2"
            >
              <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{item.display_name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Selected Location Details Display */}
      <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-2">
        {currentPos.address && (
          <p className="text-[11px] text-sky-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" /> {currentPos.address}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Latitude</label>
            <input
              type="number"
              step="any"
              value={currentPos.lat}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setCurrentPos(prev => ({ ...prev, lat: val }));
                onLocationSelect({ latitude: val, longitude: currentPos.lng });
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Longitude</label>
            <input
              type="number"
              step="any"
              value={currentPos.lng}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setCurrentPos(prev => ({ ...prev, lng: val }));
                onLocationSelect({ latitude: currentPos.lat, longitude: val });
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
