import polyline from "@mapbox/polyline";

const OSRM_BASE = "https://router.project-osrm.org";

type OSRMProfile = "foot" | "bike" | "car";

interface SnapResult {
  coordinates: [number, number][];
  distance: number;
}

function routeTypeToProfile(type: "run" | "ride" | "walk"): OSRMProfile {
  switch (type) {
    case "run":
    case "walk":
      return "foot";
    case "ride":
      return "bike";
    default:
      return "foot";
  }
}

async function trySnapWithProfile(
  coords: string,
  profile: OSRMProfile
): Promise<SnapResult | null> {
  const url = `${OSRM_BASE}/route/v1/${profile}/${coords}?overview=full&geometries=polyline`;

  const response = await fetch(url);
  if (!response.ok) return null;

  const data = await response.json();
  if (data.code !== "Ok" || !data.routes || data.routes.length === 0) return null;

  const route = data.routes[0];
  const decoded = polyline.decode(route.geometry);
  const snappedCoordinates: [number, number][] = decoded.map(
    ([lat, lng]: [number, number]) => [lat, lng]
  );

  return {
    coordinates: snappedCoordinates,
    distance: route.distance,
  };
}

export async function snapToRoads(
  waypoints: [number, number][],
  routeType: "run" | "ride" | "walk" = "run"
): Promise<SnapResult> {
  if (waypoints.length < 2) {
    throw new Error("At least 2 waypoints are required");
  }

  const coords = waypoints
    .map(([lat, lng]) => `${lng},${lat}`)
    .join(";");

  const profile = routeTypeToProfile(routeType);
  const result = await trySnapWithProfile(coords, profile);
  if (result) return result;

  const fallbackProfiles: OSRMProfile[] = ["foot", "bike", "car"].filter(p => p !== profile) as OSRMProfile[];
  for (const fallback of fallbackProfiles) {
    const fallbackResult = await trySnapWithProfile(coords, fallback);
    if (fallbackResult) return fallbackResult;
  }

  throw new Error("OSRM routing failed with all profiles");
}

export function splitCoordinatesIntoSegments(
  coordinates: [number, number][],
  segmentCount: number
): [number, number][][] {
  const segments: [number, number][][] = [];
  const coordsPerSegment = Math.ceil(coordinates.length / segmentCount);

  for (let i = 0; i < segmentCount; i++) {
    const start = i * coordsPerSegment;
    const end = Math.min(start + coordsPerSegment + 1, coordinates.length);
    if (start < coordinates.length) {
      segments.push(coordinates.slice(start, end));
    }
  }

  return segments;
}
