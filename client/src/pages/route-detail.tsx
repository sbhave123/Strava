import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import type { Route, Amenity } from "@shared/schema";
import RouteMap from "@/components/route-map";
import ElevationProfile from "@/components/elevation-profile";
import {
  ArrowLeft, MapPin, Mountain, Zap, Lightbulb, Clock,
  Bath, Coffee, Droplets, Shield, Store, ChevronRight, AlertCircle, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

const AMENITY_ICONS: Record<string, any> = {
  restroom: Bath,
  coffee_shop: Coffee,
  water_fountain: Droplets,
  police_station: Shield,
  convenience_store: Store,
};

const AMENITY_COLORS: Record<string, string> = {
  restroom: "text-blue-500",
  coffee_shop: "text-violet-500",
  water_fountain: "text-cyan-500",
  police_station: "text-blue-700 dark:text-blue-400",
  convenience_store: "text-emerald-500",
};

const AMENITY_LABELS: Record<string, string> = {
  restroom: "Restroom",
  coffee_shop: "Coffee Shop",
  water_fountain: "Water Fountain",
  police_station: "Police Station",
  convenience_store: "Store",
};

export default function RouteDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [showLighting, setShowLighting] = useState(true);
  const [showAmenities, setShowAmenities] = useState(true);
  const [showLampPosts, setShowLampPosts] = useState(false);

  const { data: route, isLoading: routeLoading, isError: routeError, refetch: refetchRoute } = useQuery<Route>({
    queryKey: ["/api/routes", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/routes/${params.id}`);
      if (!res.ok) throw new Error("Route not found");
      return res.json();
    },
  });

  const { data: amenities = [], isLoading: amenitiesLoading } = useQuery<Amenity[]>({
    queryKey: ["/api/routes", params.id, "amenities"],
    queryFn: async () => {
      const res = await fetch(`/api/routes/${params.id}/amenities`);
      if (!res.ok) throw new Error("Failed to fetch amenities");
      return res.json();
    },
    enabled: !!route,
  });

  if (routeError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold" data-testid="text-route-error">Failed to load route</h2>
          <p className="text-sm text-muted-foreground mt-1">Something went wrong. Please try again.</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-back-error">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </Button>
            <Button onClick={() => refetchRoute()} data-testid="button-retry-route">
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (routeLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
          <div className="max-w-6xl mx-auto px-4 flex items-center gap-3 h-14">
            <Skeleton className="w-9 h-9 rounded-md" />
            <Skeleton className="h-5 w-48" />
          </div>
        </header>
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-[400px] rounded-md" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Route not found</h2>
          <p className="text-sm text-muted-foreground mt-1">This route doesn't exist or has been removed.</p>
          <Button variant="outline" className="mt-4" onClick={() => setLocation("/")}>
            Back to Routes
          </Button>
        </div>
      </div>
    );
  }

  const difficultyColor = {
    easy: "bg-green-500/10 text-green-700 dark:text-green-400",
    moderate: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    hard: "bg-red-500/10 text-red-700 dark:text-red-400",
  };

  const lightingColor = route.lightingScore >= 70
    ? "text-green-600 dark:text-green-400"
    : route.lightingScore >= 40
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-600 dark:text-red-400";

  const lightingBg = route.lightingScore >= 70
    ? "bg-green-500"
    : route.lightingScore >= 40
      ? "bg-amber-500"
      : "bg-red-500";

  const lightingLabel = route.lightingScore >= 70
    ? "Well Lit Route"
    : route.lightingScore >= 40
      ? "Partially Lit Route"
      : "Poorly Lit Route";

  const wellLitSegments = route.segments.filter(s => s.lighting === "well_lit").length;
  const partialSegments = route.segments.filter(s => s.lighting === "partial").length;
  const unlitSegments = route.segments.filter(s => s.lighting === "unlit").length;
  const totalSegments = route.segments.length;

  const amenityGroups = amenities.reduce((acc, a) => {
    if (!acc[a.type]) acc[a.type] = [];
    acc[a.type].push(a);
    return acc;
  }, {} as Record<string, Amenity[]>);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-3 h-14">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-sm truncate" data-testid="text-route-title">{route.name}</h1>
            <p className="text-xs text-muted-foreground">{route.city}</p>
          </div>
          <Badge variant="secondary" className={`${difficultyColor[route.difficulty]} shrink-0`}>
            {route.difficulty.charAt(0).toUpperCase() + route.difficulty.slice(1)}
          </Badge>
        </div>
      </header>

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px]">
          <div className="flex flex-col">
            <div className="relative">
              <RouteMap
                route={route}
                amenities={amenities}
                showLighting={showLighting}
                showAmenities={showAmenities}
                showLampPosts={showLampPosts}
                className="h-[50vh] lg:h-[60vh]"
              />

              <div className="absolute top-3 right-3 z-[1000]">
                <Card className="p-2.5 space-y-2 bg-background/95 backdrop-blur-sm min-w-[160px]">
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Map Layers</h4>
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-xs cursor-pointer flex items-center gap-1.5">
                      <div className="w-3 h-0.5 rounded-full bg-green-500" />
                      Lighting
                    </label>
                    <Switch
                      checked={showLighting}
                      onCheckedChange={setShowLighting}
                      data-testid="switch-lighting"
                      className="scale-75"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-xs cursor-pointer flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-amber-400 border border-amber-500" style={{ boxShadow: "0 0 4px rgba(251,191,36,0.5)" }} />
                      Lamp Posts
                    </label>
                    <Switch
                      checked={showLampPosts}
                      onCheckedChange={setShowLampPosts}
                      data-testid="switch-lampposts"
                      className="scale-75"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-xs cursor-pointer flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-blue-500" />
                      Facilities
                    </label>
                    <Switch
                      checked={showAmenities}
                      onCheckedChange={setShowAmenities}
                      data-testid="switch-amenities"
                      className="scale-75"
                    />
                  </div>
                </Card>
              </div>
            </div>

            <div className="px-4 py-3 border-t bg-card/50">
              <div className="flex items-center gap-1.5 mb-2">
                <Mountain className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Elevation Profile</span>
              </div>
              <ElevationProfile route={route} />
            </div>
          </div>

          <div className="border-l overflow-y-auto lg:h-[calc(100vh-56px)]">
            <div className="p-4 space-y-4">
              <div>
                <h2 className="text-lg font-bold" data-testid="text-detail-name">{route.name}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{route.description}</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Card className="p-3 text-center">
                  <MapPin className="w-4 h-4 mx-auto text-primary mb-1" />
                  <div className="text-sm font-bold" data-testid="text-detail-distance">{(route.distance / 1000).toFixed(1)}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">km</div>
                </Card>
                <Card className="p-3 text-center">
                  <Mountain className="w-4 h-4 mx-auto text-primary mb-1" />
                  <div className="text-sm font-bold" data-testid="text-detail-elevation">{route.elevationGain}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">m gain</div>
                </Card>
                <Card className="p-3 text-center">
                  <Zap className="w-4 h-4 mx-auto text-primary mb-1" />
                  <div className="text-sm font-bold capitalize">{route.type}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">type</div>
                </Card>
              </div>

              <Separator />

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className={`w-4 h-4 ${lightingColor}`} />
                  <h3 className="text-sm font-semibold">Lighting Analysis</h3>
                </div>

                <Card className="p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-sm font-semibold ${lightingColor}`} data-testid="text-lighting-label">{lightingLabel}</span>
                    <span className={`text-lg font-bold ${lightingColor}`} data-testid="text-lighting-score">{route.lightingScore}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${lightingBg}`}
                      style={{ width: `${route.lightingScore}%` }}
                    />
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                        Well Lit
                      </span>
                      <span className="text-muted-foreground">{wellLitSegments}/{totalSegments} segments</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        Partially Lit
                      </span>
                      <span className="text-muted-foreground">{partialSegments}/{totalSegments} segments</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        No Lighting
                      </span>
                      <span className="text-muted-foreground">{unlitSegments}/{totalSegments} segments</span>
                    </div>
                  </div>

                  <Separator className="my-2.5" />

                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Lightbulb className="w-3 h-3 text-amber-500" />
                      Street Lamps Detected
                    </span>
                    <span className="font-semibold" data-testid="text-lamp-count">{route.totalLampPosts}</span>
                  </div>
                </Card>
              </div>

              <Separator />

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Bath className="w-4 h-4 text-blue-500" />
                  <h3 className="text-sm font-semibold">Nearby Facilities</h3>
                  {!amenitiesLoading && (
                    <Badge variant="secondary" className="text-[10px] ml-auto">{amenities.length} found</Badge>
                  )}
                </div>

                {amenitiesLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : amenities.length === 0 ? (
                  <Card className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">No facilities found near this route</p>
                  </Card>
                ) : (
                  <div className="space-y-1.5">
                    {Object.entries(amenityGroups).map(([type, items]) => {
                      const Icon = AMENITY_ICONS[type] || Store;
                      const color = AMENITY_COLORS[type] || "text-muted-foreground";
                      const label = AMENITY_LABELS[type] || type;
                      return (
                        <Card key={type} className="p-2.5">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Icon className={`w-3.5 h-3.5 ${color}`} />
                            <span className="text-xs font-semibold">{label}s</span>
                            <Badge variant="secondary" className="text-[10px] ml-auto">{items.length}</Badge>
                          </div>
                          <div className="space-y-1">
                            {items.map((amenity) => (
                              <div key={amenity.id} className="flex items-center justify-between gap-2 text-xs pl-5">
                                <span className="truncate">{amenity.name}</span>
                                <span className="text-muted-foreground shrink-0 flex items-center gap-0.5">
                                  {amenity.distanceFromRoute}m
                                  <ChevronRight className="w-3 h-3" />
                                </span>
                              </div>
                            ))}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              <Separator />

              <Card className="p-3 bg-amber-500/5 border-amber-500/20">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400">Safety Tip</h4>
                    <p className="text-[11px] text-amber-600/80 dark:text-amber-400/70 mt-0.5 leading-relaxed">
                      {route.lightingScore < 50
                        ? "This route has limited lighting. Consider running during daylight hours or with a running buddy. Carry a personal light and share your location with someone."
                        : route.lightingScore < 70
                          ? "Parts of this route have limited lighting. Consider using a headlamp for darker segments and letting someone know your route."
                          : "This route is generally well-lit. Still consider sharing your live location and carrying a phone for emergencies."}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
