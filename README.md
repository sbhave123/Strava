# Strava Safe Route Finder -- https://StravaRoutes.replit.app

## The Problem

Runners, cyclists, and walkers who exercise during early morning or late evening hours face a real safety concern: they don't know which stretches of their route are well-lit and which leave them in the dark. Most mapping tools show you *where* to go but tell you nothing about *how safe* it is to be there after sunset. Meanwhile, knowing where the nearest restroom, coffee shop, or water fountain is along a 10-mile route is the kind of practical information that's surprisingly hard to find on a single screen.

This is especially acute for solo female runners, people new to a city, and anyone training through winter months when daylight disappears by 5 PM. Strava already tracks *what you did* — this tool helps you decide *where you should go*.

## The Solution

This is a web app that overlays street lighting data and nearby facilities onto running, cycling, and walking routes. Users can:

- **Browse curated routes** across 9 US cities, each snapped to real road geometry via OSRM, with color-coded lighting segments (green for well-lit, amber for partial, red for unlit)
- **Toggle safety layers** on an interactive Leaflet map: lighting overlays, individual lamp post markers, and facility icons (restrooms, coffee shops, water fountains, police stations, convenience stores)
- **Create custom routes** through a 4-step wizard: click the map to place waypoints, snap them to real roads, assign lighting levels per segment, drop facility markers, then save
- **Filter and search** routes by activity type, difficulty, city, or minimum lighting score

The core interaction is visual — you look at a route on the map and immediately see which sections are safe to run in the dark.

## Tradeoffs and Decisions

**OSRM demo server vs. paid routing API.** Route paths needed to follow real roads rather than draw straight lines between points. I chose the free OSRM demo server (`router.project-osrm.org`) over paid alternatives like Google Directions or Mapbox. The tradeoff is rate limits and no SLA — the demo server can be slow or temporarily unavailable. To mitigate this, I cache all snapped geometry in PostgreSQL so routes only hit OSRM once, and the app degrades gracefully with error states and retry buttons when the service is unreachable. For a production app with real users, switching to a self-hosted OSRM instance would be the right move, but for a prototype, free and functional beats paid and perfect.

**Leaflet via dynamic import vs. react-leaflet.** The natural choice for a React app would be `react-leaflet`, but it requires React 19 and this project uses React 18. Rather than upgrading React (which would risk breaking other dependencies), I load Leaflet directly through dynamic `import("leaflet")` inside `useEffect` hooks. This means more manual DOM management — creating markers, attaching click handlers, cleaning up on unmount — but it keeps the dependency tree stable and gives full control over map behavior. The main cost is that map state lives in refs rather than React state, which can make debugging trickier.

## What I Learned

Async initialization and React effects don't mix well without explicit synchronization. The route creation map was broken because the Leaflet map loads asynchronously (dynamic import), but the `useEffect` that attaches click handlers ran synchronously on mount — before the map existed. The handler checked `mapInstanceRef.current`, found `null`, and silently did nothing. No error, no crash, just a map that ignored clicks. The fix was adding a `mapReady` state flag set after initialization and including it in the effect's dependency array, forcing the handler to re-attach once the map actually exists. This pattern — "async resource + effect that depends on it = you need a readiness signal" — comes up constantly with maps, WebSocket connections, and any resource that isn't available on first render. The lesson isn't about Leaflet specifically; it's that silent failures from null refs are harder to debug than crashes, and a boolean readiness flag is the cheapest insurance against them.
