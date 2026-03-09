import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { snapToRoads, splitCoordinatesIntoSegments } from "./osrm";
import { routeSchema, amenitySchema } from "@shared/schema";
import { z } from "zod";

const VALID_DIFFICULTIES = ["easy", "moderate", "hard"] as const;
const VALID_TYPES = ["run", "ride", "walk"] as const;

const snapRequestSchema = z.object({
  waypoints: z.array(z.tuple([z.number(), z.number()])).min(2),
  type: z.enum(["run", "ride", "walk"]).default("run"),
});

const createRouteSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  elevationGain: z.number().min(0),
  difficulty: z.enum(["easy", "moderate", "hard"]),
  type: z.enum(["run", "ride", "walk"]),
  city: z.string().min(1).max(200),
  coordinates: z.array(z.tuple([z.number(), z.number()])).min(2),
  totalLampPosts: z.number().min(0),
  segments: z.array(z.object({
    coordinates: z.array(z.tuple([z.number(), z.number()])),
    lighting: z.enum(["well_lit", "partial", "unlit"]),
  })).min(1),
  amenities: z.array(z.object({
    name: z.string().min(1),
    type: z.enum(["restroom", "coffee_shop", "water_fountain", "police_station", "convenience_store"]),
    lat: z.number(),
    lng: z.number(),
    openHours: z.string().optional(),
    distanceFromRoute: z.number().min(0),
  })).default([]),
});

function calculateLightingScore(segments: { coordinates: [number, number][]; lighting: string }[]): number {
  const totalCoords = segments.reduce((sum, s) => sum + s.coordinates.length, 0);
  const litCoords = segments.reduce((sum, s) => {
    if (s.lighting === "well_lit") return sum + s.coordinates.length;
    if (s.lighting === "partial") return sum + s.coordinates.length * 0.5;
    return sum;
  }, 0);
  return Math.round((litCoords / totalCoords) * 100);
}

function calculateDistance(coordinates: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const [lat1, lng1] = coordinates[i - 1];
    const [lat2, lng2] = coordinates[i];
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return Math.round(total);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/routes", async (req, res) => {
    try {
      const difficultyParam = req.query.difficulty as string | undefined;
      const typeParam = req.query.type as string | undefined;
      const minLightingParam = req.query.minLightingScore as string | undefined;

      const difficulty = difficultyParam && VALID_DIFFICULTIES.includes(difficultyParam as any)
        ? (difficultyParam as "easy" | "moderate" | "hard")
        : undefined;

      const type = typeParam && VALID_TYPES.includes(typeParam as any)
        ? (typeParam as "run" | "ride" | "walk")
        : undefined;

      const minLightingScore = minLightingParam
        ? (isNaN(Number(minLightingParam)) ? undefined : Math.max(0, Math.min(100, Number(minLightingParam))))
        : undefined;

      const search = {
        city: req.query.search as string | undefined,
        difficulty,
        type,
        minLightingScore,
      };
      const routes = await storage.getRoutes(search);
      res.json(routes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch routes" });
    }
  });

  app.get("/api/routes/:id", async (req, res) => {
    try {
      const route = await storage.getRouteById(req.params.id);
      if (!route) {
        return res.status(404).json({ error: "Route not found" });
      }
      res.json(route);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch route" });
    }
  });

  app.get("/api/routes/:id/amenities", async (req, res) => {
    try {
      const route = await storage.getRouteById(req.params.id);
      if (!route) {
        return res.status(404).json({ error: "Route not found" });
      }
      const amenities = await storage.getAmenitiesForRoute(req.params.id);
      res.json(amenities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch amenities" });
    }
  });

  app.post("/api/routes/snap", async (req, res) => {
    try {
      const parsed = snapRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
      }

      const { waypoints, type } = parsed.data;
      const result = await snapToRoads(waypoints, type);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to snap route to roads" });
    }
  });

  app.post("/api/routes", async (req, res) => {
    try {
      const parsed = createRouteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
      }

      const data = parsed.data;
      const lightingScore = calculateLightingScore(data.segments);
      const distance = calculateDistance(data.coordinates);
      const routeId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const route = {
        id: routeId,
        name: data.name,
        description: data.description,
        distance,
        elevationGain: data.elevationGain,
        difficulty: data.difficulty,
        type: data.type,
        city: data.city,
        coordinates: data.coordinates,
        lightingScore,
        totalLampPosts: data.totalLampPosts,
        segments: data.segments,
        isUserCreated: true,
      };

      const amenities = data.amenities.map((a, i) => ({
        id: `${routeId}-amenity-${i}`,
        name: a.name,
        type: a.type,
        lat: a.lat,
        lng: a.lng,
        openHours: a.openHours,
        distanceFromRoute: a.distanceFromRoute,
      }));

      const created = await storage.createRoute(route, amenities);
      res.status(201).json(created);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to create route" });
    }
  });

  app.delete("/api/routes/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteRoute(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Route not found or cannot be deleted" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete route" });
    }
  });

  return httpServer;
}
