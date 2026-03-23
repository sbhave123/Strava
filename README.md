# Strava Safe Route Finder -- https://StravaRoutes.replit.app

## The Problem

Runners, cyclists, and walkers who exercise during early morning or late evening hours face a real safety concern: they don't know which stretches of their route are well-lit and which leave them in the dark. Most mapping tools show you *where* to go but tell you nothing about *how safe* it is to be there after sunset. Meanwhile, knowing where the nearest restroom, coffee shop, or water fountain is along a 10-mile route is the kind of practical information that's surprisingly hard to find on a single screen.

This is especially acute for solo female runners, people new to a city, and anyone training through winter months when daylight disappears by 5 PM. 

## The Solution

This is a web app that overlays street lighting data and nearby facilities onto running, cycling, and walking routes. Users can:

- **Browse curated routes** across 9 US cities, each snapped to real road geometry via OSRM, with color-coded lighting segments (green for well-lit, amber for partial, red for unlit)
- **Toggle safety layers** on an interactive Leaflet map: lighting overlays, individual lamp post markers, and facility icons (restrooms, coffee shops, water fountains, police stations, convenience stores)
- **Create custom routes** through a 4-step wizard: click the map to place waypoints, snap them to real roads, assign lighting levels per segment, drop facility markers, then save
- **Filter and search** routes by activity type, difficulty, city, or minimum lighting score

The core interaction is visual. You look at a route on the map and immediately see which sections are safe to run in the dark.

Home Page & Route Details

<img width="1421" height="764" alt="Screenshot 2026-03-13 at 4 46 27 PM" src="https://github.com/user-attachments/assets/23d4a8e8-612e-4c80-80d3-e95ece8a1e43" />
<img width="1422" height="765" alt="Screenshot 2026-03-13 at 4 47 03 PM" src="https://github.com/user-attachments/assets/286df156-4b36-47e9-983d-b1812a2954e3" />


Custom Route Creation
<img width="1172" height="618" alt="Screenshot 2026-03-13 at 4 47 25 PM" src="https://github.com/user-attachments/assets/ed3f4352-f042-4943-a372-b3de7bf55deb" />
<img width="1421" height="765" alt="Screenshot 2026-03-13 at 4 47 56 PM" src="https://github.com/user-attachments/assets/64c3ccbb-5210-442c-aff1-029dc8c42bda" />
<img width="1421" height="761" alt="Screenshot 2026-03-13 at 4 48 17 PM" src="https://github.com/user-attachments/assets/ce1f6888-9331-42a6-8d69-4a46b9f25cca" />
<img width="1421" height="763" alt="Screenshot 2026-03-13 at 4 48 46 PM" src="https://github.com/user-attachments/assets/8e6bfd40-095e-4c4d-9976-425df36b89b6" />
<img width="1419" height="762" alt="Screenshot 2026-03-13 at 4 49 17 PM" src="https://github.com/user-attachments/assets/cf920200-cf44-479a-a76f-12e803a2d522" />
<img width="1413" height="767" alt="Screenshot 2026-03-13 at 4 49 28 PM" src="https://github.com/user-attachments/assets/633313a8-5749-41eb-8eb3-34c3ae2e10a0" />

