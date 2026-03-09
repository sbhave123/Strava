import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, MapPin, Plus, Trash2, Loader2, Navigation,
  Lightbulb, Coffee, Bath, Droplets, Shield, Store, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type CreationStep = "waypoints" | "lighting" | "amenities" | "details";

interface WaypointData {
  lat: number;
  lng: number;
}

interface SegmentData {
  coordinates: [number, number][];
  lighting: "well_lit" | "partial" | "unlit";
}

interface AmenityData {
  name: string;
  type: "restroom" | "coffee_shop" | "water_fountain" | "police_station" | "convenience_store";
  lat: number;
  lng: number;
  openHours: string;
  distanceFromRoute: number;
}

const AMENITY_TYPES = [
  { value: "restroom", label: "Public Restroom", icon: Bath },
  { value: "coffee_shop", label: "Coffee Shop", icon: Coffee },
  { value: "water_fountain", label: "Water Fountain", icon: Droplets },
  { value: "police_station", label: "Police Station", icon: Shield },
  { value: "convenience_store", label: "Convenience Store", icon: Store },
] as const;

const LIGHTING_OPTIONS = [
  { value: "well_lit", label: "Well Lit", color: "#22c55e" },
  { value: "partial", label: "Partially Lit", color: "#f59e0b" },
  { value: "unlit", label: "No Lighting", color: "#ef4444" },
] as const;

export default function CreateRoute() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const amenityMarkersRef = useRef<any[]>([]);

  const [step, setStep] = useState<CreationStep>("waypoints");
  const [waypoints, setWaypoints] = useState<WaypointData[]>([]);
  const [snappedCoordinates, setSnappedCoordinates] = useState<[number, number][]>([]);
  const [segments, setSegments] = useState<SegmentData[]>([]);
  const [amenities, setAmenities] = useState<AmenityData[]>([]);
  const [placingAmenity, setPlacingAmenity] = useState(false);
  const [totalLampPosts, setTotalLampPosts] = useState(0);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "moderate" | "hard">("easy");
  const [routeType, setRouteType] = useState<"run" | "ride" | "walk">("run");
  const [elevationGain, setElevationGain] = useState(0);

  const [isSnapping, setIsSnapping] = useState(false);

  const snapMutation = useMutation({
    mutationFn: async (data: { waypoints: [number, number][]; type: string }) => {
      const res = await apiRequest("POST", "/api/routes/snap", data);
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/routes", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
      toast({ title: "Route created!", description: "Your route has been saved successfully." });
      setLocation(`/route/${data.id}`);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create route", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!mapRef.current || typeof window === "undefined") return;

    const loadMap = async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const map = L.map(mapRef.current!, {
        center: [39.8283, -98.5795],
        zoom: 4,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      map.on("click", (e: any) => {
        if (step === "amenities" && placingAmenity) {
          return;
        }
      });
    };

    loadMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const updateMapMarkers = useCallback(async () => {
    const L = await import("leaflet");
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    polylinesRef.current.forEach(p => map.removeLayer(p));
    polylinesRef.current = [];

    waypoints.forEach((wp, i) => {
      const isFirst = i === 0;
      const isLast = i === waypoints.length - 1 && waypoints.length > 1;
      const color = isFirst ? "#22c55e" : isLast ? "#ef4444" : "#FC4C02";
      const label = isFirst ? "S" : isLast ? "F" : `${i + 1}`;

      const icon = L.divIcon({
        className: "custom-marker",
        html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:11px;font-family:Inter,sans-serif;">${label}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([wp.lat, wp.lng], { icon, draggable: step === "waypoints" }).addTo(map);
      marker.on("dragend", (e: any) => {
        const pos = e.target.getLatLng();
        setWaypoints(prev => prev.map((w, idx) => idx === i ? { lat: pos.lat, lng: pos.lng } : w));
      });
      markersRef.current.push(marker);
    });

    if (snappedCoordinates.length > 0 && segments.length > 0) {
      segments.forEach(seg => {
        const color = seg.lighting === "well_lit" ? "#22c55e" : seg.lighting === "partial" ? "#f59e0b" : "#ef4444";
        const polyline = L.polyline(seg.coordinates, {
          color,
          weight: 5,
          opacity: 0.85,
        }).addTo(map);
        polylinesRef.current.push(polyline);
      });
    } else if (snappedCoordinates.length > 0) {
      const polyline = L.polyline(snappedCoordinates, {
        color: "#FC4C02",
        weight: 4,
        opacity: 0.9,
      }).addTo(map);
      polylinesRef.current.push(polyline);
    } else if (waypoints.length >= 2) {
      const polyline = L.polyline(
        waypoints.map(w => [w.lat, w.lng] as [number, number]),
        { color: "#FC4C02", weight: 3, opacity: 0.6, dashArray: "8, 8" }
      ).addTo(map);
      polylinesRef.current.push(polyline);
    }
  }, [waypoints, snappedCoordinates, segments, step]);

  useEffect(() => {
    updateMapMarkers();
  }, [updateMapMarkers]);

  const updateAmenityMarkers = useCallback(async () => {
    const L = await import("leaflet");
    const map = mapInstanceRef.current;
    if (!map) return;

    amenityMarkersRef.current.forEach(m => map.removeLayer(m));
    amenityMarkersRef.current = [];

    const typeConfig: Record<string, { icon: string; color: string }> = {
      restroom: { icon: "WC", color: "#3b82f6" },
      coffee_shop: { icon: "C", color: "#8b5cf6" },
      water_fountain: { icon: "W", color: "#06b6d4" },
      police_station: { icon: "P", color: "#1d4ed8" },
      convenience_store: { icon: "S", color: "#10b981" },
    };

    amenities.forEach((a) => {
      const cfg = typeConfig[a.type] || { icon: "?", color: "#6b7280" };
      const icon = L.divIcon({
        className: "custom-marker",
        html: `<div style="width:28px;height:28px;border-radius:6px;background:${cfg.color};border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:11px;">${cfg.icon}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const marker = L.marker([a.lat, a.lng], { icon }).addTo(map);
      marker.bindPopup(`<strong>${a.name || "New Amenity"}</strong><br/>${a.type.replace("_", " ")}`);
      amenityMarkersRef.current.push(marker);
    });
  }, [amenities]);

  useEffect(() => {
    updateAmenityMarkers();
  }, [updateAmenityMarkers]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handler = (e: any) => {
      if (step === "waypoints") {
        setWaypoints(prev => [...prev, { lat: e.latlng.lat, lng: e.latlng.lng }]);
      } else if (step === "amenities" && placingAmenity) {
        setAmenities(prev => [...prev, {
          name: "",
          type: "restroom",
          lat: e.latlng.lat,
          lng: e.latlng.lng,
          openHours: "",
          distanceFromRoute: 0,
        }]);
        setPlacingAmenity(false);
      }
    };

    map.on("click", handler);
    return () => { map.off("click", handler); };
  }, [step, placingAmenity]);

  const handleSnapToRoads = async () => {
    if (waypoints.length < 2) return;
    setIsSnapping(true);

    try {
      const result = await snapMutation.mutateAsync({
        waypoints: waypoints.map(w => [w.lat, w.lng] as [number, number]),
        type: routeType,
      });

      setSnappedCoordinates(result.coordinates);

      const segCount = Math.max(2, Math.min(6, Math.ceil(result.coordinates.length / 50)));
      const coordsPerSeg = Math.ceil(result.coordinates.length / segCount);
      const newSegments: SegmentData[] = [];
      for (let i = 0; i < segCount; i++) {
        const start = i * coordsPerSeg;
        const end = Math.min(start + coordsPerSeg + 1, result.coordinates.length);
        newSegments.push({
          coordinates: result.coordinates.slice(start, end),
          lighting: "well_lit",
        });
      }
      setSegments(newSegments);

      const L = await import("leaflet");
      const map = mapInstanceRef.current;
      if (map) {
        const bounds = L.latLngBounds(result.coordinates);
        map.fitBounds(bounds, { padding: [40, 40] });
      }

      toast({ title: "Route snapped!", description: `Route follows real roads (${(result.distance / 1000).toFixed(1)}km)` });
      setStep("lighting");
    } catch (err: any) {
      toast({ title: "Snap failed", description: err.message || "Could not snap route to roads", variant: "destructive" });
    } finally {
      setIsSnapping(false);
    }
  };

  const handleSubmit = () => {
    if (!name || !city || !description) {
      toast({ title: "Missing fields", description: "Please fill in name, city, and description", variant: "destructive" });
      return;
    }

    createMutation.mutate({
      name,
      description,
      elevationGain,
      difficulty,
      type: routeType,
      city,
      coordinates: snappedCoordinates,
      totalLampPosts,
      segments: segments.map(s => ({
        coordinates: s.coordinates,
        lighting: s.lighting,
      })),
      amenities: amenities.filter(a => a.name).map(a => ({
        name: a.name,
        type: a.type,
        lat: a.lat,
        lng: a.lng,
        openHours: a.openHours || undefined,
        distanceFromRoute: a.distanceFromRoute,
      })),
    });
  };

  const lightingScore = segments.length > 0 ? (() => {
    const total = segments.reduce((s, seg) => s + seg.coordinates.length, 0);
    const lit = segments.reduce((s, seg) => {
      if (seg.lighting === "well_lit") return s + seg.coordinates.length;
      if (seg.lighting === "partial") return s + seg.coordinates.length * 0.5;
      return s;
    }, 0);
    return Math.round((lit / total) * 100);
  })() : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
              data-testid="button-back-create"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold" data-testid="text-create-title">Create Route</h1>
          </div>
          <div className="flex items-center gap-2">
            {["waypoints", "lighting", "amenities", "details"].map((s, i) => (
              <Badge
                key={s}
                variant={step === s ? "default" : "outline"}
                className={`text-xs cursor-pointer ${step === s ? "" : "opacity-60"}`}
                onClick={() => {
                  if (s === "waypoints") setStep("waypoints");
                  else if (s === "lighting" && snappedCoordinates.length > 0) setStep("lighting");
                  else if (s === "amenities" && snappedCoordinates.length > 0) setStep("amenities");
                  else if (s === "details" && snappedCoordinates.length > 0) setStep("details");
                }}
                data-testid={`badge-step-${s}`}
              >
                {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
              </Badge>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div
              ref={mapRef}
              className="w-full rounded-lg overflow-hidden border"
              style={{ height: "500px" }}
              data-testid="map-create-container"
            />
            {step === "waypoints" && (
              <p className="text-sm text-muted-foreground mt-2">
                Click the map to place waypoints. Drag markers to adjust positions.
              </p>
            )}
            {step === "amenities" && placingAmenity && (
              <p className="text-sm text-primary mt-2 font-medium">
                Click the map to place the amenity marker.
              </p>
            )}
          </div>

          <div className="space-y-4">
            {step === "waypoints" && (
              <Card className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Waypoints ({waypoints.length})
                  </h3>
                  {waypoints.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setWaypoints([]);
                        setSnappedCoordinates([]);
                        setSegments([]);
                      }}
                      data-testid="button-clear-waypoints"
                    >
                      Clear All
                    </Button>
                  )}
                </div>

                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {waypoints.map((wp, i) => (
                    <div key={i} className="flex items-center justify-between text-sm p-1.5 rounded bg-muted/50">
                      <span className="text-muted-foreground">
                        {i === 0 ? "Start" : i === waypoints.length - 1 && waypoints.length > 1 ? "End" : `Point ${i + 1}`}:
                        {" "}{wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setWaypoints(prev => prev.filter((_, idx) => idx !== i))}
                        data-testid={`button-remove-waypoint-${i}`}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div>
                  <Label className="text-sm">Route Type</Label>
                  <Select value={routeType} onValueChange={(v) => setRouteType(v as any)}>
                    <SelectTrigger data-testid="select-route-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="run">Run</SelectItem>
                      <SelectItem value="ride">Ride</SelectItem>
                      <SelectItem value="walk">Walk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full"
                  onClick={handleSnapToRoads}
                  disabled={waypoints.length < 2 || isSnapping}
                  data-testid="button-snap-roads"
                >
                  {isSnapping ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Snapping to roads...
                    </>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4 mr-2" />
                      Snap to Roads
                    </>
                  )}
                </Button>
              </Card>
            )}

            {step === "lighting" && (
              <Card className="p-4 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Segment Lighting
                </h3>
                <p className="text-sm text-muted-foreground">
                  Set the lighting level for each segment of your route.
                </p>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {segments.map((seg, i) => (
                    <div key={i} className="p-3 rounded-lg border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Segment {i + 1}</span>
                        <span className="text-xs text-muted-foreground">{seg.coordinates.length} points</span>
                      </div>
                      <div className="flex gap-1">
                        {LIGHTING_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            className={`flex-1 text-xs py-1.5 px-2 rounded-md border transition-all ${
                              seg.lighting === opt.value
                                ? "border-2 font-semibold"
                                : "opacity-60 hover:opacity-80"
                            }`}
                            style={{
                              borderColor: seg.lighting === opt.value ? opt.color : undefined,
                              color: opt.color,
                              backgroundColor: seg.lighting === opt.value ? `${opt.color}15` : undefined,
                            }}
                            onClick={() => {
                              setSegments(prev => prev.map((s, idx) =>
                                idx === i ? { ...s, lighting: opt.value } : s
                              ));
                            }}
                            data-testid={`button-lighting-${i}-${opt.value}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <Label className="text-sm">Total Lamp Posts</Label>
                  <Input
                    type="number"
                    min={0}
                    value={totalLampPosts}
                    onChange={(e) => setTotalLampPosts(Number(e.target.value))}
                    data-testid="input-lamp-posts"
                  />
                </div>

                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <span className="text-sm text-muted-foreground">Lighting Score: </span>
                  <span className={`font-bold ${lightingScore >= 70 ? "text-green-600" : lightingScore >= 40 ? "text-amber-600" : "text-red-600"}`}>
                    {lightingScore}%
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep("waypoints")} data-testid="button-back-to-waypoints">
                    Back
                  </Button>
                  <Button className="flex-1" onClick={() => setStep("amenities")} data-testid="button-next-amenities">
                    Next: Amenities
                  </Button>
                </div>
              </Card>
            )}

            {step === "amenities" && (
              <Card className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Coffee className="w-4 h-4" />
                    Nearby Facilities ({amenities.length})
                  </h3>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setPlacingAmenity(true)}
                  disabled={placingAmenity}
                  data-testid="button-add-amenity"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {placingAmenity ? "Click map to place..." : "Add Facility"}
                </Button>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {amenities.map((amenity, i) => (
                    <div key={i} className="p-3 rounded-lg border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Facility {i + 1}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setAmenities(prev => prev.filter((_, idx) => idx !== i))}
                          data-testid={`button-remove-amenity-${i}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <Input
                        placeholder="Name (e.g. Central Park Restroom)"
                        value={amenity.name}
                        onChange={(e) => setAmenities(prev => prev.map((a, idx) =>
                          idx === i ? { ...a, name: e.target.value } : a
                        ))}
                        data-testid={`input-amenity-name-${i}`}
                      />
                      <Select
                        value={amenity.type}
                        onValueChange={(v) => setAmenities(prev => prev.map((a, idx) =>
                          idx === i ? { ...a, type: v as AmenityData["type"] } : a
                        ))}
                      >
                        <SelectTrigger data-testid={`select-amenity-type-${i}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AMENITY_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Hours (e.g. 6am - 10pm)"
                        value={amenity.openHours}
                        onChange={(e) => setAmenities(prev => prev.map((a, idx) =>
                          idx === i ? { ...a, openHours: e.target.value } : a
                        ))}
                        data-testid={`input-amenity-hours-${i}`}
                      />
                      <Input
                        placeholder="Distance from route (meters)"
                        type="number"
                        min={0}
                        value={amenity.distanceFromRoute}
                        onChange={(e) => setAmenities(prev => prev.map((a, idx) =>
                          idx === i ? { ...a, distanceFromRoute: Number(e.target.value) } : a
                        ))}
                        data-testid={`input-amenity-distance-${i}`}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep("lighting")} data-testid="button-back-to-lighting">
                    Back
                  </Button>
                  <Button className="flex-1" onClick={() => setStep("details")} data-testid="button-next-details">
                    Next: Details
                  </Button>
                </div>
              </Card>
            )}

            {step === "details" && (
              <Card className="p-4 space-y-4">
                <h3 className="font-semibold">Route Details</h3>

                <div>
                  <Label className="text-sm">Route Name</Label>
                  <Input
                    placeholder="e.g. Morning Waterfront Run"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    data-testid="input-route-name"
                  />
                </div>

                <div>
                  <Label className="text-sm">City</Label>
                  <Input
                    placeholder="e.g. San Francisco, CA"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    data-testid="input-route-city"
                  />
                </div>

                <div>
                  <Label className="text-sm">Description</Label>
                  <Textarea
                    placeholder="Describe the route, key features, and safety notes..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    data-testid="input-route-description"
                  />
                </div>

                <div>
                  <Label className="text-sm">Difficulty</Label>
                  <Select value={difficulty} onValueChange={(v) => setDifficulty(v as any)}>
                    <SelectTrigger data-testid="select-difficulty">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm">Elevation Gain (meters)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={elevationGain}
                    onChange={(e) => setElevationGain(Number(e.target.value))}
                    data-testid="input-elevation-gain"
                  />
                </div>

                <div className="p-3 rounded-lg bg-muted/50 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Coordinates</span>
                    <span>{snappedCoordinates.length} points</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Segments</span>
                    <span>{segments.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lighting Score</span>
                    <span className={lightingScore >= 70 ? "text-green-600" : lightingScore >= 40 ? "text-amber-600" : "text-red-600"}>
                      {lightingScore}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Facilities</span>
                    <span>{amenities.filter(a => a.name).length}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep("amenities")} data-testid="button-back-to-amenities">
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSubmit}
                    disabled={createMutation.isPending || !name || !city || !description}
                    data-testid="button-submit-route"
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Route"
                    )}
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
