import { useEffect, useRef } from "react";
import type { Route, Amenity } from "@shared/schema";

const LIGHTING_COLORS = {
  well_lit: "#22c55e",
  partial: "#f59e0b",
  unlit: "#ef4444",
};

const AMENITY_ICONS: Record<string, { icon: string; color: string }> = {
  restroom: { icon: "WC", color: "#3b82f6" },
  coffee_shop: { icon: "C", color: "#8b5cf6" },
  water_fountain: { icon: "W", color: "#06b6d4" },
  police_station: { icon: "P", color: "#1d4ed8" },
  convenience_store: { icon: "S", color: "#10b981" },
};

interface RouteMapProps {
  route: Route;
  amenities: Amenity[];
  showLighting: boolean;
  showAmenities: boolean;
  showLampPosts: boolean;
  className?: string;
}

export default function RouteMap({ route, amenities, showLighting, showAmenities, showLampPosts, className = "" }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapRef.current || typeof window === "undefined") return;

    const loadMap = async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const center = route.coordinates[Math.floor(route.coordinates.length / 2)];
      const map = L.map(mapRef.current!, {
        center: [center[0], center[1]],
        zoom: 14,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      const bounds = L.latLngBounds(route.coordinates.map(c => [c[0], c[1]] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40] });

      updateLayers(L, map);
    };

    loadMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [route.id]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const loadAndUpdate = async () => {
      const L = await import("leaflet");
      updateLayers(L, mapInstanceRef.current);
    };
    loadAndUpdate();
  }, [showLighting, showAmenities, showLampPosts, amenities]);

  const updateLayers = (L: any, map: any) => {
    layersRef.current.forEach(layer => {
      if (map.hasLayer(layer)) map.removeLayer(layer);
    });
    layersRef.current = [];

    if (showLighting) {
      route.segments.forEach((segment) => {
        const polyline = L.polyline(
          segment.coordinates.map((c: [number, number]) => [c[0], c[1]]),
          {
            color: LIGHTING_COLORS[segment.lighting],
            weight: 5,
            opacity: 0.85,
            lineCap: "round",
            lineJoin: "round",
          }
        ).addTo(map);

        const label = segment.lighting === "well_lit" ? "Well Lit" : segment.lighting === "partial" ? "Partially Lit" : "No Lighting";
        polyline.bindPopup(`<div style="font-family: Inter, sans-serif; padding: 2px 0;"><strong style="color: ${LIGHTING_COLORS[segment.lighting]}">${label}</strong><br/><span style="color: #666; font-size: 12px;">Segment lighting status</span></div>`);
        layersRef.current.push(polyline);
      });
    } else {
      const polyline = L.polyline(
        route.coordinates.map(c => [c[0], c[1]]),
        {
          color: "#FC4C02",
          weight: 4,
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round",
        }
      ).addTo(map);
      layersRef.current.push(polyline);
    }

    const startIcon = L.divIcon({
      className: "custom-marker",
      html: `<div style="width:24px;height:24px;border-radius:50%;background:#22c55e;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const endIcon = L.divIcon({
      className: "custom-marker",
      html: `<div style="width:24px;height:24px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
      </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const start = route.coordinates[0];
    const end = route.coordinates[route.coordinates.length - 1];
    const startMarker = L.marker([start[0], start[1]], { icon: startIcon }).addTo(map).bindPopup("Start");
    const endMarker = L.marker([end[0], end[1]], { icon: endIcon }).addTo(map).bindPopup("Finish");
    layersRef.current.push(startMarker, endMarker);

    if (showLampPosts) {
      route.segments.forEach((segment) => {
        if (segment.lighting === "well_lit" || segment.lighting === "partial") {
          const step = Math.max(1, Math.floor(segment.coordinates.length / 4));
          for (let i = 0; i < segment.coordinates.length; i += step) {
            const coord = segment.coordinates[i];
            const lampIcon = L.divIcon({
              className: "custom-marker",
              html: `<div style="width:16px;height:16px;border-radius:50%;background:#fbbf24;border:2px solid #f59e0b;box-shadow:0 0 6px rgba(251,191,36,0.5);display:flex;align-items:center;justify-content:center;">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="#f59e0b" stroke="none"><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/><rect x="9" y="19" width="6" height="2" rx="1"/></svg>
              </div>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            });
            const marker = L.marker([coord[0], coord[1]], { icon: lampIcon }).addTo(map);
            marker.bindPopup('<div style="font-family: Inter, sans-serif;"><strong>Street Lamp</strong><br/><span style="color: #666; font-size: 12px;">Artificial lighting source</span></div>');
            layersRef.current.push(marker);
          }
        }
      });
    }

    if (showAmenities && amenities.length > 0) {
      amenities.forEach((amenity) => {
        const config = AMENITY_ICONS[amenity.type] || { icon: "?", color: "#6b7280" };
        const amenityIcon = L.divIcon({
          className: "custom-marker",
          html: `<div style="width:28px;height:28px;border-radius:6px;background:${config.color};border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:11px;font-family:Inter,sans-serif;">${config.icon}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const typeLabels: Record<string, string> = {
          restroom: "Public Restroom",
          coffee_shop: "Coffee Shop",
          water_fountain: "Water Fountain",
          police_station: "Police Station",
          convenience_store: "Convenience Store",
        };

        const marker = L.marker([amenity.lat, amenity.lng], { icon: amenityIcon }).addTo(map);
        marker.bindPopup(`<div style="font-family: Inter, sans-serif; min-width: 140px;">
          <strong>${amenity.name}</strong><br/>
          <span style="color: ${config.color}; font-size: 12px;">${typeLabels[amenity.type] || amenity.type}</span>
          ${amenity.openHours ? `<br/><span style="color: #666; font-size: 11px;">Hours: ${amenity.openHours}</span>` : ""}
          <br/><span style="color: #999; font-size: 11px;">${amenity.distanceFromRoute}m from route</span>
        </div>`);
        layersRef.current.push(marker);
      });
    }
  };

  return <div ref={mapRef} className={`w-full ${className}`} style={{ minHeight: "400px" }} data-testid="map-container" />;
}
