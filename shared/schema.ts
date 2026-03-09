import { z } from "zod";

export const routeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  distance: z.number(),
  elevationGain: z.number(),
  difficulty: z.enum(["easy", "moderate", "hard"]),
  type: z.enum(["run", "ride", "walk"]),
  city: z.string(),
  coordinates: z.array(z.tuple([z.number(), z.number()])),
  lightingScore: z.number().min(0).max(100),
  totalLampPosts: z.number(),
  segments: z.array(z.object({
    coordinates: z.array(z.tuple([z.number(), z.number()])),
    lighting: z.enum(["well_lit", "partial", "unlit"]),
  })),
});

export const amenitySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["restroom", "coffee_shop", "water_fountain", "police_station", "convenience_store"]),
  lat: z.number(),
  lng: z.number(),
  openHours: z.string().optional(),
  distanceFromRoute: z.number(),
});

export const routeSearchSchema = z.object({
  city: z.string().optional(),
  minDistance: z.number().optional(),
  maxDistance: z.number().optional(),
  difficulty: z.enum(["easy", "moderate", "hard"]).optional(),
  type: z.enum(["run", "ride", "walk"]).optional(),
  minLightingScore: z.number().optional(),
});

export type Route = z.infer<typeof routeSchema>;
export type Amenity = z.infer<typeof amenitySchema>;
export type RouteSearch = z.infer<typeof routeSearchSchema>;
