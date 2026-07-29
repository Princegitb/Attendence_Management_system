import React, { useState } from 'react';
import { MapPin, Navigation, CheckCircle2 } from 'lucide-react';

export default function LocationPickerMap({
  latitude,
  longitude,
  onLocationSelect
}) {
  const [searching, setSearching] = useState(false);
  const [currentPos, setCurrentPos] = useState({
    lat: latitude ? parseFloat(latitude) : 28.613939,
    lng: longitude ? parseFloat(longitude) : 77.209021,
    address: ''
  });

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
          disabled={searching}
          className="px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
        >
          <Navigation className="w-3.5 h-3.5" /> {searching ? 'Detecting...' : 'Detect My GPS'}
        </button>
      </div>

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
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setCurrentPos(prev => ({ ...prev, lat: val }));
                if (!isNaN(val)) onLocationSelect({ latitude: val, longitude: currentPos.lng });
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
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setCurrentPos(prev => ({ ...prev, lng: val }));
                if (!isNaN(val)) onLocationSelect({ latitude: currentPos.lat, longitude: val });
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
