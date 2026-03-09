import type { Route, Amenity, RouteSearch } from "@shared/schema";

export interface IStorage {
  getRoutes(search?: RouteSearch): Promise<Route[]>;
  getRouteById(id: string): Promise<Route | undefined>;
  getAmenitiesForRoute(routeId: string): Promise<Amenity[]>;
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

const sampleRoutes: Route[] = (() => {
  const sfEmbarcadero: [number, number][] = [
    [37.7955, -122.3937], [37.7960, -122.3920], [37.7968, -122.3900],
    [37.7975, -122.3882], [37.7983, -122.3864], [37.7990, -122.3845],
    [37.7997, -122.3828], [37.8005, -122.3810], [37.8012, -122.3792],
    [37.8020, -122.3775], [37.8028, -122.3757], [37.8035, -122.3740],
    [37.8042, -122.3722], [37.8050, -122.3705], [37.8058, -122.3688],
    [37.8065, -122.3670], [37.8072, -122.3652], [37.8080, -122.3635],
    [37.8087, -122.3618], [37.8095, -122.3600],
  ];

  const sfGoldenGate: [number, number][] = [
    [37.7694, -122.4862], [37.7705, -122.4870], [37.7718, -122.4878],
    [37.7730, -122.4885], [37.7745, -122.4890], [37.7758, -122.4895],
    [37.7770, -122.4898], [37.7785, -122.4900], [37.7800, -122.4903],
    [37.7815, -122.4905], [37.7830, -122.4908], [37.7845, -122.4910],
    [37.7860, -122.4912], [37.7875, -122.4915], [37.7890, -122.4918],
    [37.7905, -122.4920], [37.7920, -122.4922], [37.7935, -122.4925],
    [37.7950, -122.4928], [37.7960, -122.4930], [37.7972, -122.4932],
    [37.7985, -122.4935], [37.7998, -122.4937], [37.8010, -122.4940],
    [37.8022, -122.4942],
  ];

  const nycCentralPark: [number, number][] = [
    [40.7644, -73.9730], [40.7650, -73.9725], [40.7658, -73.9718],
    [40.7665, -73.9712], [40.7672, -73.9705], [40.7680, -73.9698],
    [40.7688, -73.9690], [40.7695, -73.9683], [40.7702, -73.9677],
    [40.7710, -73.9670], [40.7718, -73.9662], [40.7725, -73.9655],
    [40.7732, -73.9648], [40.7740, -73.9640], [40.7748, -73.9633],
    [40.7755, -73.9625], [40.7762, -73.9618], [40.7770, -73.9610],
    [40.7778, -73.9602], [40.7785, -73.9595],
  ];

  const nycBrooklyn: [number, number][] = [
    [40.6892, -73.9845], [40.6888, -73.9830], [40.6882, -73.9815],
    [40.6878, -73.9800], [40.6872, -73.9785], [40.6868, -73.9770],
    [40.6862, -73.9755], [40.6858, -73.9740], [40.6855, -73.9725],
    [40.6852, -73.9710], [40.6850, -73.9695], [40.6848, -73.9680],
    [40.6845, -73.9665], [40.6842, -73.9650], [40.6840, -73.9635],
    [40.6838, -73.9620], [40.6835, -73.9605], [40.6832, -73.9590],
  ];

  const chicagoLakefront: [number, number][] = [
    [41.8827, -87.6130], [41.8835, -87.6125], [41.8845, -87.6118],
    [41.8855, -87.6112], [41.8865, -87.6105], [41.8875, -87.6098],
    [41.8885, -87.6092], [41.8895, -87.6085], [41.8905, -87.6078],
    [41.8915, -87.6072], [41.8925, -87.6065], [41.8935, -87.6058],
    [41.8945, -87.6052], [41.8955, -87.6045], [41.8965, -87.6038],
    [41.8975, -87.6032], [41.8985, -87.6025], [41.8995, -87.6018],
    [41.9005, -87.6012], [41.9015, -87.6005], [41.9025, -87.5998],
    [41.9035, -87.5992],
  ];

  const seattleBurke: [number, number][] = [
    [47.6535, -122.3220], [47.6542, -122.3208], [47.6550, -122.3195],
    [47.6558, -122.3182], [47.6565, -122.3170], [47.6572, -122.3158],
    [47.6580, -122.3145], [47.6588, -122.3132], [47.6595, -122.3120],
    [47.6602, -122.3108], [47.6610, -122.3095], [47.6618, -122.3082],
    [47.6625, -122.3070], [47.6632, -122.3058], [47.6640, -122.3045],
    [47.6648, -122.3032],
  ];

  const portlandForest: [number, number][] = [
    [45.5100, -122.7160], [45.5108, -122.7175], [45.5115, -122.7190],
    [45.5122, -122.7205], [45.5130, -122.7220], [45.5138, -122.7235],
    [45.5145, -122.7250], [45.5152, -122.7265], [45.5160, -122.7280],
    [45.5168, -122.7295], [45.5175, -122.7310], [45.5182, -122.7325],
    [45.5190, -122.7340], [45.5198, -122.7355], [45.5205, -122.7370],
    [45.5212, -122.7385], [45.5220, -122.7400], [45.5228, -122.7415],
  ];

  const austinTownLake: [number, number][] = [
    [30.2630, -97.7510], [30.2635, -97.7495], [30.2640, -97.7480],
    [30.2645, -97.7465], [30.2650, -97.7450], [30.2655, -97.7435],
    [30.2660, -97.7420], [30.2665, -97.7405], [30.2670, -97.7390],
    [30.2675, -97.7375], [30.2680, -97.7360], [30.2685, -97.7345],
    [30.2690, -97.7330], [30.2695, -97.7315], [30.2700, -97.7300],
    [30.2705, -97.7285], [30.2710, -97.7270], [30.2715, -97.7255],
    [30.2720, -97.7240], [30.2725, -97.7225],
  ];

  const bostonCharles: [number, number][] = [
    [42.3555, -71.0800], [42.3560, -71.0788], [42.3568, -71.0775],
    [42.3575, -71.0762], [42.3582, -71.0750], [42.3590, -71.0738],
    [42.3598, -71.0725], [42.3605, -71.0712], [42.3612, -71.0700],
    [42.3620, -71.0688], [42.3628, -71.0675], [42.3635, -71.0662],
    [42.3642, -71.0650], [42.3650, -71.0638], [42.3658, -71.0625],
    [42.3665, -71.0612], [42.3672, -71.0600],
  ];

  const routes: Route[] = [];

  const seg1 = generateRouteSegments(sfEmbarcadero, ["well_lit", "well_lit", "well_lit", "partial"]);
  routes.push({
    id: "sf-embarcadero",
    name: "Embarcadero Waterfront Loop",
    description: "A scenic waterfront route along the Embarcadero with stunning bay views. Well-lit boardwalk with frequent lamp posts and city lighting.",
    distance: 5200,
    elevationGain: 25,
    difficulty: "easy",
    type: "run",
    city: "San Francisco, CA",
    coordinates: sfEmbarcadero,
    lightingScore: calculateLightingScore(seg1),
    totalLampPosts: 42,
    segments: seg1,
  });

  const seg2 = generateRouteSegments(sfGoldenGate, ["partial", "unlit", "unlit", "partial", "well_lit"]);
  routes.push({
    id: "sf-golden-gate",
    name: "Golden Gate Park Trail",
    description: "Wind through the western end of Golden Gate Park. Sections through wooded areas have limited lighting - best for daytime runs.",
    distance: 8400,
    elevationGain: 85,
    difficulty: "moderate",
    type: "run",
    city: "San Francisco, CA",
    coordinates: sfGoldenGate,
    lightingScore: calculateLightingScore(seg2),
    totalLampPosts: 12,
    segments: seg2,
  });

  const seg3 = generateRouteSegments(nycCentralPark, ["well_lit", "well_lit", "partial", "well_lit"]);
  routes.push({
    id: "nyc-central-park",
    name: "Central Park Reservoir Loop",
    description: "Classic NYC running route around the Jacqueline Kennedy Onassis Reservoir. Well-maintained paths with regular lamp posts throughout.",
    distance: 4100,
    elevationGain: 15,
    difficulty: "easy",
    type: "run",
    city: "New York, NY",
    coordinates: nycCentralPark,
    lightingScore: calculateLightingScore(seg3),
    totalLampPosts: 56,
    segments: seg3,
  });

  const seg4 = generateRouteSegments(nycBrooklyn, ["well_lit", "partial", "partial"]);
  routes.push({
    id: "nyc-brooklyn-bridge",
    name: "Brooklyn Bridge to DUMBO",
    description: "Cross the iconic Brooklyn Bridge and loop through DUMBO. Mix of bridge lighting and quieter waterfront sections.",
    distance: 6800,
    elevationGain: 45,
    difficulty: "moderate",
    type: "walk",
    city: "New York, NY",
    coordinates: nycBrooklyn,
    lightingScore: calculateLightingScore(seg4),
    totalLampPosts: 28,
    segments: seg4,
  });

  const seg5 = generateRouteSegments(chicagoLakefront, ["well_lit", "well_lit", "well_lit", "well_lit"]);
  routes.push({
    id: "chicago-lakefront",
    name: "Lakefront Trail North",
    description: "Follow the Chicago Lakefront Trail northward with spectacular skyline views. Excellently lit path popular with runners year-round.",
    distance: 7200,
    elevationGain: 10,
    difficulty: "easy",
    type: "ride",
    city: "Chicago, IL",
    coordinates: chicagoLakefront,
    lightingScore: calculateLightingScore(seg5),
    totalLampPosts: 68,
    segments: seg5,
  });

  const seg6 = generateRouteSegments(seattleBurke, ["well_lit", "partial", "unlit", "partial"]);
  routes.push({
    id: "seattle-burke",
    name: "Burke-Gilman Trail",
    description: "Popular multi-use trail through the University District. Varies from well-lit campus sections to darker wooded stretches.",
    distance: 9500,
    elevationGain: 55,
    difficulty: "moderate",
    type: "ride",
    city: "Seattle, WA",
    coordinates: seattleBurke,
    lightingScore: calculateLightingScore(seg6),
    totalLampPosts: 18,
    segments: seg6,
  });

  const seg7 = generateRouteSegments(portlandForest, ["unlit", "unlit", "unlit"]);
  routes.push({
    id: "portland-forest",
    name: "Forest Park Wildwood Trail",
    description: "Challenging trail through old-growth forest. No artificial lighting - strictly a daytime route. Beautiful but remote.",
    distance: 11200,
    elevationGain: 320,
    difficulty: "hard",
    type: "run",
    city: "Portland, OR",
    coordinates: portlandForest,
    lightingScore: calculateLightingScore(seg7),
    totalLampPosts: 0,
    segments: seg7,
  });

  const seg8 = generateRouteSegments(austinTownLake, ["well_lit", "well_lit", "partial", "well_lit"]);
  routes.push({
    id: "austin-town-lake",
    name: "Lady Bird Lake Trail",
    description: "Austin's most popular running trail around Lady Bird Lake. Mostly well-lit with some dimmer sections near the boardwalk area.",
    distance: 6100,
    elevationGain: 20,
    difficulty: "easy",
    type: "run",
    city: "Austin, TX",
    coordinates: austinTownLake,
    lightingScore: calculateLightingScore(seg8),
    totalLampPosts: 45,
    segments: seg8,
  });

  const seg9 = generateRouteSegments(bostonCharles, ["well_lit", "well_lit", "partial"]);
  routes.push({
    id: "boston-charles",
    name: "Charles River Esplanade",
    description: "Run along the Charles River with views of MIT and the Hatch Shell. Well-maintained path with good lighting along most of the route.",
    distance: 5800,
    elevationGain: 12,
    difficulty: "easy",
    type: "run",
    city: "Boston, MA",
    coordinates: bostonCharles,
    lightingScore: calculateLightingScore(seg9),
    totalLampPosts: 38,
    segments: seg9,
  });

  return routes;
})();

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

export class MemStorage implements IStorage {
  async getRoutes(search?: RouteSearch): Promise<Route[]> {
    let filtered = [...sampleRoutes];

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
    return sampleRoutes.find(r => r.id === id);
  }

  async getAmenitiesForRoute(routeId: string): Promise<Amenity[]> {
    return sampleAmenities[routeId] || [];
  }
}

export const storage = new MemStorage();
