import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LeafletMouseEvent } from 'leaflet';

import { useAppLocation } from '../location/LocationContext';
import type { AppLocation } from '../location/types';
import { getTimeZoneForLocation } from '../timezone';

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function formatCoord(n: number): string {
  return Number.isFinite(n) ? n.toFixed(5) : '';
}

function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      onPick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    // React-Leaflet's `MapContainer` center prop is only used on initial mount.
    // Keep the current zoom level; just pan/animate to the new center.
    map.setView(center, map.getZoom(), { animate: true });
  }, [map, center]);

  return null;
}

const PRESET_LOCATIONS: AppLocation[] = [
  { name: 'Makkah, Saudi Arabia', latitude: 21.3891, longitude: 39.8579 },
  { name: 'Riyadh, Saudi Arabia', latitude: 24.7136, longitude: 46.6753 },
  { name: 'Cairo, Egypt', latitude: 30.0444, longitude: 31.2357 },
  { name: 'Jerusalem (Al-Quds)', latitude: 31.7683, longitude: 35.2137 },
  { name: 'Istanbul, Türkiye', latitude: 41.0082, longitude: 28.9784 },
  { name: 'London, UK', latitude: 51.5072, longitude: -0.1276 },
  { name: 'New York, USA', latitude: 40.7128, longitude: -74.006 },
  { name: 'Jakarta, Indonesia', latitude: -6.2088, longitude: 106.8456 }
];

export default function LocationPicker() {
  const { t } = useTranslation();
  const { location, setLocation } = useAppLocation();
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const center = useMemo<[number, number]>(() => [location.latitude, location.longitude], [location]);
  const timeZone = useMemo(
    () => getTimeZoneForLocation(location.latitude, location.longitude),
    [location.latitude, location.longitude]
  );

  const pick = useCallback(
    (lat: number, lng: number) => {
      const next: AppLocation = {
        name: 'Custom',
        latitude: clamp(lat, -90, 90),
        longitude: clamp(lng, -180, 180)
      };
      setLocation(next);
    },
    [setLocation]
  );

  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError(t('location.geoErrorNotSupported'));
      return;
    }
    setIsLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setGeoError(null);
        pick(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setIsLocating(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGeoError(t('location.geoErrorDenied'));
            break;
          case err.POSITION_UNAVAILABLE:
            setGeoError(t('location.geoErrorUnavailable'));
            break;
          case err.TIMEOUT:
            setGeoError(t('location.geoErrorTimeout'));
            break;
          default:
            setGeoError(t('location.geoErrorUnknown'));
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60_000 }
    );
  }, [pick, t]);

  return (
    <section className="card">
      <div className="card-header flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <div className="card-title">{t('location.title')}</div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="control-sm min-w-0 flex-1 sm:w-56 sm:flex-none"
            value={location.name}
            onChange={(e) => {
              const v = e.target.value;
              const preset = PRESET_LOCATIONS.find((p) => p.name === v);
              if (preset) setLocation(preset);
            }}
            aria-label="Preset location"
          >
            {PRESET_LOCATIONS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="btn-sm whitespace-nowrap"
            onClick={useMyLocation}
            disabled={isLocating}
            aria-label={t('location.useMyLocation')}
            aria-busy={isLocating}
            title={t('location.useMyLocation')}
          >
            {isLocating ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="w-4 h-4 sm:mr-1 animate-spin" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
                <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 sm:mr-1"><path d="M12 8a4 4 0 100 8 4 4 0 000-8zm-8.95 3a8.96 8.96 0 017.95-7.95V1h2v2.05A8.96 8.96 0 0120.95 11H23v2h-2.05A8.96 8.96 0 0113 20.95V23h-2v-2.05A8.96 8.96 0 013.05 13H1v-2h2.05zM12 18a6 6 0 100-12 6 6 0 000 12z"/></svg>
            )}
            <span className="hidden sm:inline">{t('location.useMyLocation')}</span>
          </button>
        </div>
      </div>

      {geoError && (
        <div className="mx-3 mb-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 w-5 h-5 flex-shrink-0 text-amber-500"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/></svg>
          <span>{geoError}</span>
          <button type="button" onClick={() => setGeoError(null)} className="ml-auto text-amber-600 hover:text-amber-800">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/></svg>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2">
        <div className="text-sm">
          <div className="text-xs text-slate-600">{t('location.locationUsed')}</div>
          <div className="mt-1 font-medium">
            {location.name} ({formatCoord(location.latitude)}, {formatCoord(location.longitude)})
          </div>

          <div className="mt-1 text-xs text-slate-600">
            {t('location.timezone')}: {timeZone}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-700">
              {t('location.latitude')}
              <input
                className="control mt-1"
                inputMode="decimal"
                value={formatCoord(location.latitude)}
                onChange={(e) => pick(Number(e.target.value), location.longitude)}
              />
            </label>
            <label className="text-xs text-slate-700">
              {t('location.longitude')}
              <input
                className="control mt-1"
                inputMode="decimal"
                value={formatCoord(location.longitude)}
                onChange={(e) => pick(location.latitude, Number(e.target.value))}
              />
            </label>
          </div>

          <div className="mt-2 text-xs text-slate-600">{t('location.pickOnMap')}</div>
        </div>

        <div className="relative z-0 h-64 overflow-hidden rounded-md border border-slate-200">
          <MapContainer center={center} zoom={5} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <MapRecenter center={center} />
            <MapClickHandler onPick={pick} />
            <Marker position={center} />
          </MapContainer>
        </div>
      </div>
    </section>
  );
}
