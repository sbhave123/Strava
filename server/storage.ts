import type { Route, Amenity, RouteSearch } from "@shared/schema";
import { userRoutes, userAmenities, cachedRouteGeometry } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { snapToRoads, splitCoordinatesIntoSegments } from "./osrm";

export interface IStorage {
  getRoutes(search?: RouteSearch): Promise<Route[]>;
  getRouteById(id: string): Promise<Route | undefined>;
  getAmenitiesForRoute(routeId: string): Promise<Amenity[]>;
  createRoute(route: Route, amenities: Amenity[]): Promise<Route>;
  deleteRoute(id: string): Promise<boolean>;
  initializeSampleRoutes(): Promise<void>;
}

function generateRouteSegments(coordinates: [number, number][], lightingPattern: string[]): Route["segments"] {
  const segments: Route["segments"] = [];
  const segCount = lightingPattern.length;
  const coordsPerSeg = Math.ceil(coordinates.length / segCount);

  for (let i = 0; i < segCount; i++) {
    const start = i * coordsPerSeg;
    const end = Math.min(start + coordsPerSeg + 1, coordinates.length);
    segments.push({
      coordinates: coordinates.slice(start, end),
      lighting: lightingPattern[i] as "well_lit" | "partial" | "unlit",
    });
  }
  return segments;
}

function calculateLightingScore(segments: Route["segments"]): number {
  const totalCoords = segments.reduce((sum, s) => sum + s.coordinates.length, 0);
  const litCoords = segments.reduce((sum, s) => {
    if (s.lighting === "well_lit") return sum + s.coordinates.length;
    if (s.lighting === "partial") return sum + s.coordinates.length * 0.5;
    return sum;
  }, 0);
  return Math.round((litCoords / totalCoords) * 100);
}

interface SampleRouteDef {
  id: string;
  name: string;
  description: string;
  distance: number;
  elevationGain: number;
  difficulty: "easy" | "moderate" | "hard";
  type: "run" | "ride" | "walk";
  city: string;
  waypoints: [number, number][];
  lightingPattern: string[];
  totalLampPosts: number;
}

const sampleRouteDefs: SampleRouteDef[] = [
  {
    id: "sf-embarcadero",
    name: "Embarcadero Waterfront Loop",
    description: "A scenic waterfront route along the Embarcadero with stunning bay views. Well-lit boardwalk with frequent lamp posts and city lighting.",
    distance: 5200,
    elevationGain: 25,
    difficulty: "easy",
    type: "run",
    city: "San Francisco, CA",
    waypoints: [
      [37.7955, -122.3937], [37.7990, -122.3845],
      [37.8028, -122.3757], [37.8065, -122.3670], [37.8095, -122.3600],
    ],
    lightingPattern: ["well_lit", "well_lit", "well_lit", "partial"],
    totalLampPosts: 42,
  },
  {
    id: "sf-golden-gate",
    name: "Golden Gate Park Trail",
    description: "Wind through the western end of Golden Gate Park. Sections through wooded areas have limited lighting - best for daytime runs.",
    distance: 8400,
    elevationGain: 85,
    difficulty: "moderate",
    type: "run",
    city: "San Francisco, CA",
    waypoints: [
      [37.7694, -122.4862], [37.7745, -122.4890],
      [37.7800, -122.4903], [37.7860, -122.4912],
      [37.7920, -122.4922], [37.7985, -122.4935], [37.8022, -122.4942],
    ],
    lightingPattern: ["partial", "unlit", "unlit", "partial", "well_lit"],
    totalLampPosts: 12,
  },
  {
    id: "nyc-central-park",
    name: "Central Park Reservoir Loop",
    description: "Classic NYC running route around the Jacqueline Kennedy Onassis Reservoir. Well-maintained paths with regular lamp posts throughout.",
    distance: 4100,
    elevationGain: 15,
    difficulty: "easy",
    type: "run",
    city: "New York, NY",
    waypoints: [
      [40.7644, -73.9730], [40.7680, -73.9698],
      [40.7718, -73.9662], [40.7755, -73.9625], [40.7785, -73.9595],
    ],
    lightingPattern: ["well_lit", "well_lit", "partial", "well_lit"],
    totalLampPosts: 56,
  },
  {
    id: "nyc-brooklyn-bridge",
    name: "Brooklyn Bridge to DUMBO",
    description: "Cross the iconic Brooklyn Bridge and loop through DUMBO. Mix of bridge lighting and quieter waterfront sections.",
    distance: 6800,
    elevationGain: 45,
    difficulty: "moderate",
    type: "walk",
    city: "New York, NY",
    waypoints: [
      [40.7128, -74.0060], [40.7058, -73.9968],
      [40.6980, -73.9880], [40.6892, -73.9845],
    ],
    lightingPattern: ["well_lit", "partial", "partial"],
    totalLampPosts: 28,
  },
  {
    id: "chicago-lakefront",
    name: "Lakefront Trail North",
    description: "Follow the Chicago Lakefront Trail northward with spectacular skyline views. Excellently lit path popular with runners year-round.",
    distance: 7200,
    elevationGain: 10,
    difficulty: "easy",
    type: "ride",
    city: "Chicago, IL",
    waypoints: [
      [41.8827, -87.6130], [41.8885, -87.6092],
      [41.8945, -87.6052], [41.9005, -87.6012], [41.9035, -87.5992],
    ],
    lightingPattern: ["well_lit", "well_lit", "well_lit", "well_lit"],
    totalLampPosts: 68,
  },
  {
    id: "seattle-burke",
    name: "Burke-Gilman Trail",
    description: "Popular multi-use trail through the University District. Varies from well-lit campus sections to darker wooded stretches.",
    distance: 9500,
    elevationGain: 55,
    difficulty: "moderate",
    type: "ride",
    city: "Seattle, WA",
    waypoints: [
      [47.6535, -122.3220], [47.6565, -122.3170],
      [47.6595, -122.3120], [47.6625, -122.3070], [47.6648, -122.3032],
    ],
    lightingPattern: ["well_lit", "partial", "unlit", "partial"],
    totalLampPosts: 18,
  },
  {
    id: "portland-forest",
    name: "Forest Park Wildwood Trail",
    description: "Challenging trail through old-growth forest. No artificial lighting - strictly a daytime route. Beautiful but remote.",
    distance: 11200,
    elevationGain: 320,
    difficulty: "hard",
    type: "run",
    city: "Portland, OR",
    waypoints: [
      [45.5100, -122.7160], [45.5145, -122.7250],
      [45.5190, -122.7340], [45.5228, -122.7415],
    ],
    lightingPattern: ["unlit", "unlit", "unlit"],
    totalLampPosts: 0,
  },
  {
    id: "austin-town-lake",
    name: "Lady Bird Lake Trail",
    description: "Austin's most popular running trail around Lady Bird Lake. Mostly well-lit with some dimmer sections near the boardwalk area.",
    distance: 6100,
    elevationGain: 20,
    difficulty: "easy",
    type: "run",
    city: "Austin, TX",
    waypoints: [
      [30.2630, -97.7510], [30.2655, -97.7435],
      [30.2680, -97.7360], [30.2705, -97.7285], [30.2725, -97.7225],
    ],
    lightingPattern: ["well_lit", "well_lit", "partial", "well_lit"],
    totalLampPosts: 45,
  },
  {
    id: "boston-charles",
    name: "Charles River Esplanade",
    description: "Run along the Charles River with views of MIT and the Hatch Shell. Well-maintained path with good lighting along most of the route.",
    distance: 5800,
    elevationGain: 12,
    difficulty: "easy",
    type: "run",
    city: "Boston, MA",
    waypoints: [
      [42.3555, -71.0800], [42.3590, -71.0738],
      [42.3628, -71.0675], [42.3658, -71.0625], [42.3672, -71.0600],
    ],
    lightingPattern: ["well_lit", "well_lit", "partial"],
    totalLampPosts: 38,
  },
];

const sampleAmenities: Record<string, Amenity[]> = {
  "sf-embarcadero": [
    { id: "a1", name: "Ferry Building Restrooms", type: "restroom", lat: 37.7955, lng: -122.3935, openHours: "6am - 10pm", distanceFromRoute: 15 },
    { id: "a2", name: "Blue Bottle Coffee", type: "coffee_shop", lat: 37.7960, lng: -122.3915, openHours: "6am - 7pm", distanceFromRoute: 30 },
    { id: "a3", name: "Peet's Coffee", type: "coffee_shop", lat: 37.7990, lng: -122.3840, openHours: "5:30am - 8pm", distanceFromRoute: 45 },
    { id: "a4", name: "Pier 39 Public Restroom", type: "restroom", lat: 37.8085, lng: -122.3625, openHours: "24 hours", distanceFromRoute: 60 },
    { id: "a5", name: "Embarcadero Water Fountain", type: "water_fountain", lat: 37.8020, lng: -122.3770, distanceFromRoute: 5 },
    { id: "a6", name: "Walgreens Embarcadero", type: "convenience_store", lat: 37.7965, lng: -122.3910, openHours: "7am - 10pm", distanceFromRoute: 50 },
  ],
  "sf-golden-gate": [
    { id: "a7", name: "Park Chalet Restrooms", type: "restroom", lat: 37.7700, lng: -122.4860, openHours: "6am - 9pm", distanceFromRoute: 25 },
    { id: "a8", name: "Andytown Coffee", type: "coffee_shop", lat: 37.7710, lng: -122.4850, openHours: "7am - 6pm", distanceFromRoute: 80 },
    { id: "a9", name: "Spreckels Lake Fountain", type: "water_fountain", lat: 37.7780, lng: -122.4898, distanceFromRoute: 10 },
  ],
  "nyc-central-park": [
    { id: "a10", name: "Central Park Restroom (90th St)", type: "restroom", lat: 40.7700, lng: -73.9700, openHours: "7am - dusk", distanceFromRoute: 20 },
    { id: "a11", name: "Le Pain Quotidien", type: "coffee_shop", lat: 40.7680, lng: -73.9698, openHours: "7am - 9pm", distanceFromRoute: 120 },
    { id: "a12", name: "NYPD Central Park Precinct", type: "police_station", lat: 40.7730, lng: -73.9650, openHours: "24 hours", distanceFromRoute: 200 },
    { id: "a13", name: "Reservoir Drinking Fountain", type: "water_fountain", lat: 40.7660, lng: -73.9715, distanceFromRoute: 5 },
    { id: "a14", name: "Engineers Gate Restroom", type: "restroom", lat: 40.7750, lng: -73.9630, openHours: "6am - midnight", distanceFromRoute: 40 },
  ],
  "nyc-brooklyn-bridge": [
    { id: "a15", name: "Brooklyn Bridge Park Restroom", type: "restroom", lat: 40.6890, lng: -73.9840, openHours: "6am - 1am", distanceFromRoute: 30 },
    { id: "a16", name: "Almondine Bakery", type: "coffee_shop", lat: 40.6885, lng: -73.9825, openHours: "7am - 7pm", distanceFromRoute: 85 },
    { id: "a17", name: "DUMBO Water Fountain", type: "water_fountain", lat: 40.6870, lng: -73.9790, distanceFromRoute: 15 },
  ],
  "chicago-lakefront": [
    { id: "a18", name: "North Avenue Beach House", type: "restroom", lat: 41.9100, lng: -87.6245, openHours: "6am - 11pm", distanceFromRoute: 25 },
    { id: "a19", name: "Colectivo Coffee", type: "coffee_shop", lat: 41.8850, lng: -87.6115, openHours: "6am - 8pm", distanceFromRoute: 95 },
    { id: "a20", name: "Oak Street Beach Fountain", type: "water_fountain", lat: 41.9035, lng: -87.6235, distanceFromRoute: 10 },
    { id: "a21", name: "Grant Park Restrooms", type: "restroom", lat: 41.8830, lng: -87.6130, openHours: "6am - 11pm", distanceFromRoute: 20 },
    { id: "a22", name: "Intelligentsia Coffee", type: "coffee_shop", lat: 41.8920, lng: -87.6060, openHours: "6am - 9pm", distanceFromRoute: 150 },
    { id: "a23", name: "CPD Lakefront Station", type: "police_station", lat: 41.8860, lng: -87.6098, openHours: "24 hours", distanceFromRoute: 180 },
  ],
  "seattle-burke": [
    { id: "a24", name: "UW Campus Restroom", type: "restroom", lat: 47.6550, lng: -122.3190, openHours: "7am - 10pm", distanceFromRoute: 40 },
    { id: "a25", name: "Elm Coffee Roasters", type: "coffee_shop", lat: 47.6570, lng: -122.3165, openHours: "6:30am - 6pm", distanceFromRoute: 120 },
    { id: "a26", name: "Gas Works Park Fountain", type: "water_fountain", lat: 47.6455, lng: -122.3340, distanceFromRoute: 15 },
  ],
  "portland-forest": [
    { id: "a27", name: "Lower Macleay Trailhead Restroom", type: "restroom", lat: 45.5105, lng: -122.7165, openHours: "Dawn - Dusk", distanceFromRoute: 100 },
  ],
  "austin-town-lake": [
    { id: "a28", name: "Zilker Park Restroom", type: "restroom", lat: 30.2665, lng: -97.7700, openHours: "5am - 10pm", distanceFromRoute: 20 },
    { id: "a29", name: "Jo's Coffee", type: "coffee_shop", lat: 30.2555, lng: -97.7495, openHours: "6am - 9pm", distanceFromRoute: 110 },
    { id: "a30", name: "Boardwalk Water Station", type: "water_fountain", lat: 30.2640, lng: -97.7470, distanceFromRoute: 5 },
    { id: "a31", name: "Austin PD Lakeshore", type: "police_station", lat: 30.2610, lng: -97.7530, openHours: "24 hours", distanceFromRoute: 250 },
    { id: "a32", name: "7-Eleven South Lamar", type: "convenience_store", lat: 30.2560, lng: -97.7540, openHours: "24 hours", distanceFromRoute: 200 },
  ],
  "boston-charles": [
    { id: "a33", name: "Hatch Shell Restrooms", type: "restroom", lat: 42.3555, lng: -71.0795, openHours: "6am - 10pm", distanceFromRoute: 20 },
    { id: "a34", name: "Thinking Cup", type: "coffee_shop", lat: 42.3568, lng: -71.0770, openHours: "7am - 9pm", distanceFromRoute: 130 },
    { id: "a35", name: "Esplanade Water Fountain", type: "water_fountain", lat: 42.3590, lng: -71.0735, distanceFromRoute: 8 },
    { id: "a36", name: "Community Boating Restroom", type: "restroom", lat: 42.3620, lng: -71.0690, openHours: "7am - 9pm", distanceFromRoute: 35 },
  ],
};

async function getCachedGeometry(routeId: string): Promise<[number, number][] | null> {
  const result = await db.select().from(cachedRouteGeometry).where(eq(cachedRouteGeometry.routeId, routeId));
  if (result.length > 0) {
    return result[0].coordinates as [number, number][];
  }
  return null;
}

async function cacheGeometry(routeId: string, coordinates: [number, number][], distance: number | null): Promise<void> {
  await db.insert(cachedRouteGeometry).values({
    routeId,
    coordinates: coordinates as any,
    distance,
  }).onConflictDoUpdate({
    target: cachedRouteGeometry.routeId,
    set: { coordinates: coordinates as any, distance },
  });
}

async function buildSampleRoute(def: SampleRouteDef): Promise<Route> {
  let coordinates: [number, number][];

  const cached = await getCachedGeometry(def.id);
  if (cached) {
    coordinates = cached;
  } else {
    try {
      const result = await snapToRoads(def.waypoints, def.type);
      coordinates = result.coordinates;
      await cacheGeometry(def.id, coordinates, result.distance);
    } catch (err) {
      console.warn(`OSRM snap failed for ${def.id}, using waypoints as fallback:`, err);
      coordinates = def.waypoints;
    }
  }

  const segments = generateRouteSegments(coordinates, def.lightingPattern);

  return {
    id: def.id,
    name: def.name,
    description: def.description,
    distance: def.distance,
    elevationGain: def.elevationGain,
    difficulty: def.difficulty,
    type: def.type,
    city: def.city,
    coordinates,
    lightingScore: calculateLightingScore(segments),
    totalLampPosts: def.totalLampPosts,
    segments,
  };
}

export class MemStorage implements IStorage {
  private sampleRoutes: Route[] = [];
  private initialized = false;

  async initializeSampleRoutes(): Promise<void> {
    if (this.initialized) return;

    const results = await Promise.allSettled(
      sampleRouteDefs.map(def => buildSampleRoute(def))
    );

    this.sampleRoutes = results
      .filter((r): r is PromiseFulfilledResult<Route> => r.status === "fulfilled")
      .map(r => r.value);

    this.initialized = true;
    console.log(`Initialized ${this.sampleRoutes.length} sample routes with road-snapped coordinates`);
  }

  async getRoutes(search?: RouteSearch): Promise<Route[]> {
    await this.initializeSampleRoutes();

    const dbRoutes = await db.select().from(userRoutes);
    const userRoutesList: Route[] = dbRoutes.map(r => ({
      id: r.routeId,
      name: r.name,
      description: r.description,
      distance: r.distance,
      elevationGain: r.elevationGain,
      difficulty: r.difficulty as Route["difficulty"],
      type: r.type as Route["type"],
      city: r.city,
      coordinates: r.coordinates as [number, number][],
      lightingScore: r.lightingScore,
      totalLampPosts: r.totalLampPosts,
      segments: r.segments as Route["segments"],
      isUserCreated: true,
    }));

    let filtered = [...this.sampleRoutes, ...userRoutesList];

    if (search?.difficulty) {
      filtered = filtered.filter(r => r.difficulty === search.difficulty);
    }
    if (search?.type) {
      filtered = filtered.filter(r => r.type === search.type);
    }
    if (search?.minLightingScore) {
      filtered = filtered.filter(r => r.lightingScore >= search.minLightingScore!);
    }
    if (search?.city) {
      const query = search.city.toLowerCase();
      filtered = filtered.filter(r =>
        r.city.toLowerCase().includes(query) ||
        r.name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }

  async getRouteById(id: string): Promise<Route | undefined> {
    await this.initializeSampleRoutes();

    const sample = this.sampleRoutes.find(r => r.id === id);
    if (sample) return sample;

    const result = await db.select().from(userRoutes).where(eq(userRoutes.routeId, id));
    if (result.length > 0) {
      const r = result[0];
      return {
        id: r.routeId,
        name: r.name,
        description: r.description,
        distance: r.distance,
        elevationGain: r.elevationGain,
        difficulty: r.difficulty as Route["difficulty"],
        type: r.type as Route["type"],
        city: r.city,
        coordinates: r.coordinates as [number, number][],
        lightingScore: r.lightingScore,
        totalLampPosts: r.totalLampPosts,
        segments: r.segments as Route["segments"],
        isUserCreated: true,
      };
    }

    return undefined;
  }

  async getAmenitiesForRoute(routeId: string): Promise<Amenity[]> {
    if (sampleAmenities[routeId]) {
      return sampleAmenities[routeId];
    }

    const result = await db.select().from(userAmenities).where(eq(userAmenities.routeId, routeId));
    return result.map(a => ({
      id: a.amenityId,
      name: a.name,
      type: a.type as Amenity["type"],
      lat: a.lat,
      lng: a.lng,
      openHours: a.openHours || undefined,
      distanceFromRoute: a.distanceFromRoute,
    }));
  }

  async createRoute(route: Route, amenities: Amenity[]): Promise<Route> {
    await db.insert(userRoutes).values({
      routeId: route.id,
      name: route.name,
      description: route.description,
      distance: route.distance,
      elevationGain: route.elevationGain,
      difficulty: route.difficulty,
      type: route.type,
      city: route.city,
      coordinates: route.coordinates as any,
      lightingScore: route.lightingScore,
      totalLampPosts: route.totalLampPosts,
      segments: route.segments as any,
    });

    if (amenities.length > 0) {
      await db.insert(userAmenities).values(
        amenities.map(a => ({
          routeId: route.id,
          amenityId: a.id,
          name: a.name,
          type: a.type,
          lat: a.lat,
          lng: a.lng,
          openHours: a.openHours || null,
          distanceFromRoute: a.distanceFromRoute,
        }))
      );
    }

    return { ...route, isUserCreated: true };
  }

  async deleteRoute(id: string): Promise<boolean> {
    const isSample = sampleRouteDefs.some(r => r.id === id);
    if (isSample) return false;

    await db.delete(userAmenities).where(eq(userAmenities.routeId, id));
    const result = await db.delete(userRoutes).where(eq(userRoutes.routeId, id));
    return (result.rowCount ?? 0) > 0;
  }
}

export const storage = new MemStorage();
