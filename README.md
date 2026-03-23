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

## Estimated Impact
 
These are directional estimates built from public signals — not invented numbers. Every assumption is stated explicitly so the model can be stress-tested.
 
### Sizing the addressable user base
 
Strava has 180 million registered users as of 2025, with approximately 32% female — roughly 58 million women on the platform. Using these as the foundation:
 
```
Primary segment — safety-conscious low-light users:
180M users × 32% female = ~58M women on Strava
 
Solo female runners training in low-light hours
(early morning / post-5pm winter): conservative 15% of segment
= ~8.7M directly addressable users
 
Broader segment — all users who train in low-light conditions:
180M × ~20% = ~36M users who benefit from the feature
```
 
### Crowdsourced tagging network effect
 
The route tagging system — where users contribute real-world lighting, restroom, and amenity data — compounds in value as the contributor base grows:
 
```
Strava users upload ~2M activities/day
If 0.5% of active users contribute route tags per month:
180M × 0.5% = 900K tagged contributions/month
At ~3 tags per contribution = ~2.7M amenity data points/month
 
Each tagged route is reusable by every runner in that city —
a single well-tagged loop in Austin benefits every new runner,
every tourist, every winter runner who doesn't know the lit streets
```
 
This directly addresses Strava's documented heatmap problem: sparse, demographically biased data in non-dense cities. Crowdsourced tagging fills the gaps that APIs and heatmaps miss organically.
 
### Subscription conversion model
 
```
Strava estimated paid subscribers: ~10–15% of 180M base
= ~18–27M subscribers at $80/year
 
If the safety routing feature converts 1% of non-paying
low-light users to paid subscribers:
36M × 1% = 360K new subscribers × $80 = ~$28.8M incremental ARR
 
Advanced filtering (lighting-only routes, night-safe tag,
restrooms within 2mi) scoped as a premium feature — a natural
paywall that adds value rather than removing it, directly
addressing Strava's documented paywall resentment problem

### Assumptions & caveats
 
These numbers are intentionally directional. The actual calibration would require Strava's internal data on activity timestamps (to validate the 20% low-light training estimate), churn rates by engagement tier, and observed conversion rates from free to paid. The value of this model is the reasoning structure — each assumption is a hypothesis that would be validated in the first weeks of an instrumented rollout.

