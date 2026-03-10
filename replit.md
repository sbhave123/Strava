# Strava - Route Safety Companion

## Overview
A Strava companion web app that enhances route planning with street lighting data (lamp posts, artificial lighting) and safety amenity markers (restrooms, coffee shops, water fountains, police stations, convenience stores). Designed to help athletes, especially those running in early morning or evening hours, find well-lit routes with convenient facilities.

## Architecture
- **Frontend**: React SPA with Tailwind CSS, Shadcn UI components, Leaflet maps, Recharts for elevation profiles
- **Backend**: Express.js API server with PostgreSQL (Drizzle ORM), OSRM routing
- **Routing**: wouter for client-side routing
- **Data Fetching**: TanStack React Query
- **Road Snapping**: OSRM demo API (router.project-osrm.org) — free, no API key needed

## Key Features
1. **Route Explorer** - Browse routes with search, filter by difficulty/activity/lighting score
2. **Interactive Map** - Leaflet map with color-coded lighting segments (green=well-lit, amber=partial, red=unlit)
3. **Lamp Post Markers** - Toggle to show individual street lamp locations on map
4. **Facility Markers** - Public restrooms, coffee shops, water fountains, police stations, stores
5. **Elevation Profile** - Recharts area chart synced with lighting data
6. **Safety Analysis Panel** - Lighting score, segment breakdown, lamp count, safety tips
7. **Route Creation** - 4-step flow: place waypoints on map → snap to roads → set lighting/facilities → save
8. **User Route Management** - Create, view, and delete user-created routes

## Project Structure
```
client/src/
  pages/
    home.tsx          - Route list/search page
    route-detail.tsx  - Single route view with map + safety panel + delete for user routes
    create-route.tsx  - 4-step route creation wizard
  components/
    route-map.tsx     - Leaflet map with lighting/amenity overlays
    elevation-profile.tsx - Elevation chart component
shared/
  schema.ts           - Drizzle tables (user_routes, user_amenities, cached_route_geometry) + Zod schemas
server/
  routes.ts           - API endpoints
  storage.ts          - Storage with sample routes + DB-backed user routes
  osrm.ts             - OSRM road-snapping service
  db.ts               - Drizzle PostgreSQL connection
  types/              - TypeScript declarations (@mapbox/polyline)
```

## Theme
- Strava orange (#FC4C02) as primary color (hsl 14 100% 50%)
- Clean white/dark mode design with Open Sans font
- Safety-oriented color coding: green (safe), amber (caution), red (warning)

## API Endpoints
- `GET /api/routes` - List routes with optional filters (search, difficulty, type, minLightingScore)
- `GET /api/routes/:id` - Single route detail (sample + user-created)
- `GET /api/routes/:id/amenities` - Amenities near a route
- `POST /api/routes` - Create a user route
- `DELETE /api/routes/:id` - Delete a user-created route
- `POST /api/routes/snap` - Snap waypoints to real roads via OSRM
