import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface GeocodeResult {
  lat: number;
  lon: number;
  display: string;
}

@Injectable({ providedIn: 'root' })
export class MapService {
  private readonly isBrowser: boolean;
  private map?: any;
  private marker?: any;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  async loadLeafletAssets(): Promise<void> {
    if (!this.isBrowser) return;
    const cssId = 'leaflet-css';
    const jsId = 'leaflet-js';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (!document.getElementById(jsId)) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.id = jsId;
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => resolve();
        script.onerror = () => reject();
        document.body.appendChild(script);
      });
    }
  }

  initMap(container: HTMLElement, onCoordsChanged?: (lat: number, lon: number) => void): void {
    if (!this.isBrowser) return;
    const L = (window as any).L;
    if (!L || !container) return;
    this.map = L.map(container, { zoomControl: true }).setView([45.9432, 24.9668], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.marker = L.marker([45.9432, 24.9668], { draggable: true }).addTo(this.map);
    this.marker.on('dragend', () => {
      const pos = this.marker.getLatLng();
      onCoordsChanged?.(pos.lat, pos.lng);
    });
    this.map.on('click', (e: any) => {
      onCoordsChanged?.(e.latlng.lat, e.latlng.lng);
    });
  }

  setPosition(lat: number, lon: number): void {
    if (!this.isBrowser) return;
    const L = (window as any).L;
    if (this.map) this.map.setView([lat, lon], Math.max(this.map.getZoom(), 14));
    if (this.marker && L) {
      this.marker.setLatLng([lat, lon]);
    }
  }

  async forwardGeocode(query: string): Promise<GeocodeResult | null> {
    if (!this.isBrowser) return null;
    if (!query || query.trim().length < 3) return null;
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=1`, {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'PadelBookingAppFe/1.0 (contact@example.com)' }
      });
      const data = await resp.json();
      if (Array.isArray(data) && data[0]) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        const display = data[0].display_name as string;
        return { lat, lon, display };
      }
    } catch (e) {
      console.warn('Geocoding failed', e);
    }
    return null;
  }

  async reverseGeocode(lat: number, lon: number): Promise<string> {
    if (!this.isBrowser) return `${lat}, ${lon}`;
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`, {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'PadelBookingAppFe/1.0 (contact@example.com)' }
      });
      const data = await resp.json();
      return data?.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    } catch (e) {
      console.warn('Reverse geocoding failed', e);
      return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    }
  }

  tryInitFromGeolocation(onCoords?: (lat: number, lon: number) => void): void {
    if (!this.isBrowser) return;
    if (!('geolocation' in navigator)) return;
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          this.setPosition(lat, lon);
          onCoords?.(lat, lon);
        },
        (err) => {
          console.warn('Geolocation error', err);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
      );
    } catch (e) {
      console.warn('Geolocation not available', e);
    }
  }

  destroy(): void {
    if (!this.isBrowser) return;
    try {
      if (this.map) {
        this.map.remove();
      }
    } catch {}
    this.map = undefined;
    this.marker = undefined;
  }
}
