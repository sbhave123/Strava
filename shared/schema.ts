import { z } from "zod";
import { pgTable, text, integer, real, jsonb, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

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
  isUserCreated: z.boolean().optional(),
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

export const userRoutes = pgTable("user_routes", {
  id: serial("id").primaryKey(),
  routeId: text("route_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  distance: real("distance").notNull(),
  elevationGain: real("elevation_gain").notNull(),
  difficulty: text("difficulty").notNull(),
  type: text("type").notNull(),
  city: text("city").notNull(),
  coordinates: jsonb("coordinates").notNull(),
  lightingScore: integer("lighting_score").notNull(),
  totalLampPosts: integer("total_lamp_posts").notNull(),
  segments: jsonb("segments").notNull(),
});

export const userAmenities = pgTable("user_amenities", {
  id: serial("id").primaryKey(),
  routeId: text("route_id").notNull(),
  amenityId: text("amenity_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  openHours: text("open_hours"),
  distanceFromRoute: real("distance_from_route").notNull(),
});

export const cachedRouteGeometry = pgTable("cached_route_geometry", {
  id: serial("id").primaryKey(),
  routeId: text("route_id").notNull().unique(),
  coordinates: jsonb("coordinates").notNull(),
  distance: real("distance"),
});

export const insertUserRouteSchema = createInsertSchema(userRoutes).omit({ id: true });
export const insertUserAmenitySchema = createInsertSchema(userAmenities).omit({ id: true });

export type InsertUserRoute = z.infer<typeof insertUserRouteSchema>;
export type InsertUserAmenity = z.infer<typeof insertUserAmenitySchema>;
export type UserRoute = typeof userRoutes.$inferSelect;
export type UserAmenity = typeof userAmenities.$inferSelect;
