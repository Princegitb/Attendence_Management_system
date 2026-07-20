import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function LocationPickerMap({ lat, lng, radius, onLocationSelect }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  const defaultLat = lat || 28.613939;
  const defaultLng = lng || 77.209021;
  const defaultRadius = radius || 100;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      // Initialize Leaflet Map
      const map = L.map(mapContainerRef.current).setView([defaultLat, defaultLng], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      const marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map);
      const circle = L.circle([defaultLat, defaultLng], {
        color: '#0284c7',
        fillColor: '#38bdf8',
        fillOpacity: 0.2,
        radius: defaultRadius
      }).addTo(map);

      // On map click
      map.on('click', (e) => {
        const { lat: newLat, lng: newLng } = e.latlng;
        const roundLat = Math.round(newLat * 1000000) / 1000000;
        const roundLng = Math.round(newLng * 1000000) / 1000000;

        marker.setLatLng([roundLat, roundLng]);
        circle.setLatLng([roundLat, roundLng]);
        onLocationSelect(roundLat, roundLng);
      });

      // On marker drag end
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        const roundLat = Math.round(pos.lat * 1000000) / 1000000;
        const roundLng = Math.round(pos.lng * 1000000) / 1000000;

        circle.setLatLng([roundLat, roundLng]);
        onLocationSelect(roundLat, roundLng);
      });

      mapRef.current = map;
      markerRef.current = marker;
      circleRef.current = circle;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync position updates if props change
  useEffect(() => {
    if (mapRef.current && markerRef.current && circleRef.current && lat && lng) {
      const newPos = [lat, lng];
      markerRef.current.setLatLng(newPos);
      circleRef.current.setLatLng(newPos);
      circleRef.current.setRadius(radius || 100);
      mapRef.current.panTo(newPos);
    }
  }, [lat, lng, radius]);

  return (
    <div className="space-y-3">
      <div className="relative w-full h-64 rounded-xl border border-slate-700 overflow-hidden shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full"></div>
      </div>
      <div className="text-[11px] text-sky-400 flex items-center justify-between px-1">
        <span>💡 Click on OpenStreetMap or drag the blue pin to auto-fill GPS coordinates.</span>
        <span>Allowed Radius: {radius || 100}m</span>
      </div>
    </div>
  );
}
