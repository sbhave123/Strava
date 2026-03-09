# SafeRoute - Strava Route Safety Companion

## Overview
A Strava companion web app that enhances route planning with street lighting data (lamp posts, artificial lighting) and safety amenity markers (restrooms, coffee shops, water fountains, police stations, convenience stores). Designed to help athletes, especially those running in early morning or evening hours, find well-lit routes with convenient facilities.

## Architecture
- **Frontend**: React SPA with Tailwind CSS, Shadcn UI components, Leaflet maps, Recharts for elevation profiles
- **Backend**: Express.js API server with in-memory storage of sample route data
- **Routing**: wouter for client-side routing
- **Data Fetching**: TanStack React Query

## Key Features
1. **Route Explorer** - Browse routes with search, filter by difficulty/activity/lighting score
2. **Interactive Map** - Leaflet map with color-coded lighting segments (green=well-lit, amber=partial, red=unlit)
3. **Lamp Post Markers** - Toggle to show individual street lamp locations on map
4. **Facility Markers** - Public restrooms, coffee shops, water fountains, police stations, stores
5. **Elevation Profile** - Recharts area chart synced with lighting data
6. **Safety Analysis Panel** - Lighting score, segment breakdown, lamp count, safety tips

## Project Structure
```
client/src/
  pages/
    home.tsx          - Route list/search page
    route-detail.tsx  - Single route view with map + safety panel
  components/
    route-map.tsx     - Leaflet map with lighting/amenity overlays
    elevation-profile.tsx - Elevation chart component
shared/
  schema.ts           - Zod schemas for Route, Amenity, RouteSearch
server/
  routes.ts           - API endpoints (/api/routes, /api/routes/:id, /api/routes/:id/amenities)
  storage.ts          - In-memory storage with 9 sample routes across US cities
```

## Theme
- Strava orange (#FC4C02) as primary color (hsl 14 100% 50%)
- Clean white/dark mode design with Open Sans font
- Safety-oriented color coding: green (safe), amber (caution), red (warning)

## API Endpoints
- `GET /api/routes` - List routes with optional filters (search, difficulty, type, minLightingScore)
- `GET /api/routes/:id` - Single route detail
- `GET /api/routes/:id/amenities` - Amenities near a route
