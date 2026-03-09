import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { Route } from "@shared/schema";
import { Search, MapPin, Mountain, Zap, SlidersHorizontal, Lightbulb, ChevronDown, X, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

function RouteCard({ route }: { route: Route }) {
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

  const lightingLabel = route.lightingScore >= 70
    ? "Well Lit"
    : route.lightingScore >= 40
      ? "Partially Lit"
      : "Poorly Lit";

  return (
    <Link href={`/route/${route.id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md">
    <Card
      data-testid={`card-route-${route.id}`}
      className="cursor-pointer transition-all duration-200 hover-elevate active-elevate-2 p-0"
    >
      <div className="relative h-40 bg-muted rounded-t-md overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 200 100" className="w-full h-full p-4 opacity-30">
            <polyline
              points={route.coordinates.slice(0, 20).map((c, i) => `${10 + i * 9},${50 + Math.sin(i * 0.8) * 25}`).join(" ")}
              fill="none"
              stroke="hsl(14, 100%, 50%)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
          <div>
            <h3 className="text-white font-semibold text-base leading-tight drop-shadow-md" data-testid={`text-route-name-${route.id}`}>
              {route.name}
            </h3>
            <p className="text-white/80 text-xs mt-0.5 drop-shadow-md">{route.city}</p>
          </div>
          <Badge variant="secondary" className={`text-[10px] shrink-0 ${difficultyColor[route.difficulty]}`}>
            {route.difficulty.charAt(0).toUpperCase() + route.difficulty.slice(1)}
          </Badge>
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1" data-testid={`text-distance-${route.id}`}>
              <MapPin className="w-3 h-3" />
              {(route.distance / 1000).toFixed(1)} km
            </span>
            <span className="flex items-center gap-1" data-testid={`text-elevation-${route.id}`}>
              <Mountain className="w-3 h-3" />
              {route.elevationGain}m
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {route.type.charAt(0).toUpperCase() + route.type.slice(1)}
            </span>
          </div>
        </div>

        <div className="mt-2.5 pt-2.5 border-t flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Lightbulb className={`w-3.5 h-3.5 ${lightingColor}`} />
            <span className={`text-xs font-medium ${lightingColor}`} data-testid={`text-lighting-${route.id}`}>
              {lightingLabel}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  route.lightingScore >= 70 ? "bg-green-500" : route.lightingScore >= 40 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${route.lightingScore}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">{route.lightingScore}%</span>
          </div>
        </div>
      </div>
    </Card>
    </Link>
  );
}

function RouteCardSkeleton() {
  return (
    <Card className="p-0">
      <Skeleton className="h-40 rounded-t-md rounded-b-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="pt-2 border-t">
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
    </Card>
  );
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [difficulty, setDifficulty] = useState<string>("all");
  const [activityType, setActivityType] = useState<string>("all");
  const [minLighting, setMinLighting] = useState<string>("0");

  const { data: routes, isLoading, isError, refetch } = useQuery<Route[]>({
    queryKey: ["/api/routes", { difficulty, activityType, minLighting, searchQuery }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (difficulty !== "all") params.set("difficulty", difficulty);
      if (activityType !== "all") params.set("type", activityType);
      if (minLighting !== "0") params.set("minLightingScore", minLighting);
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/routes?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch routes");
      return res.json();
    },
  });

  const hasActiveFilters = difficulty !== "all" || activityType !== "all" || minLighting !== "0";

  const clearFilters = () => {
    setDifficulty("all");
    setActivityType("all");
    setMinLighting("0");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between gap-3 h-14">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <Lightbulb className="w-4.5 h-4.5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg tracking-tight hidden sm:block" data-testid="text-app-name">SafeRoute</span>
            </div>

            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  data-testid="input-search"
                  type="search"
                  placeholder="Search routes by name or city..."
                  className="pl-8 h-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <Button
              data-testid="button-toggle-filters"
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "border-primary/30" : ""}
            >
              <SlidersHorizontal className="w-4 h-4 mr-1.5" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                  {[difficulty !== "all", activityType !== "all", minLighting !== "0"].filter(Boolean).length}
                </span>
              )}
              <ChevronDown className={`w-3 h-3 ml-0.5 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </Button>
          </div>

          {showFilters && (
            <div className="pb-3 flex flex-wrap items-end gap-3 animate-in slide-in-from-top-2 duration-200">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Difficulty</label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="w-32 h-8 text-xs" data-testid="select-difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Activity</label>
                <Select value={activityType} onValueChange={setActivityType}>
                  <SelectTrigger className="w-28 h-8 text-xs" data-testid="select-activity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="run">Run</SelectItem>
                    <SelectItem value="ride">Ride</SelectItem>
                    <SelectItem value="walk">Walk</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Min Lighting</label>
                <Select value={minLighting} onValueChange={setMinLighting}>
                  <SelectTrigger className="w-32 h-8 text-xs" data-testid="select-lighting">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Any</SelectItem>
                    <SelectItem value="40">40%+ (Partial)</SelectItem>
                    <SelectItem value="70">70%+ (Well Lit)</SelectItem>
                    <SelectItem value="90">90%+ (Excellent)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs" data-testid="button-clear-filters">
                  <X className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Explore Routes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Find safe, well-lit routes with nearby facilities for your next activity
          </p>
        </div>

        {isError ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7 text-destructive" />
            </div>
            <h3 className="font-semibold text-lg" data-testid="text-error">Something went wrong</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              We couldn't load the routes. Please try again.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()} data-testid="button-retry">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Retry
            </Button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <RouteCardSkeleton key={i} />
            ))}
          </div>
        ) : routes && routes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {routes.map((route) => (
              <RouteCard key={route.id} route={route} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg" data-testid="text-no-routes">No routes found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Try adjusting your filters or search for a different location
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters} data-testid="button-clear-filters-empty">
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
