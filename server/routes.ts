import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

const VALID_DIFFICULTIES = ["easy", "moderate", "hard"] as const;
const VALID_TYPES = ["run", "ride", "walk"] as const;

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

  return httpServer;
}
