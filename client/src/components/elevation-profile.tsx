import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { Route } from "@shared/schema";

interface ElevationProfileProps {
  route: Route;
  className?: string;
}

export default function ElevationProfile({ route, className = "" }: ElevationProfileProps) {
  const data = useMemo(() => {
    let cumulativeDistance = 0;
    const points: { distance: number; elevation: number; lighting: string }[] = [];

    let segmentIdx = 0;
    let coordInSegment = 0;

    for (let i = 0; i < route.coordinates.length; i++) {
      if (i > 0) {
        const [lat1, lng1] = route.coordinates[i - 1];
        const [lat2, lng2] = route.coordinates[i];
        const R = 6371000;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLng = ((lng2 - lng1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        cumulativeDistance += R * c;
      }

      let lighting = "unlit";
      if (segmentIdx < route.segments.length) {
        lighting = route.segments[segmentIdx].lighting;
        coordInSegment++;
        if (coordInSegment >= route.segments[segmentIdx].coordinates.length && segmentIdx < route.segments.length - 1) {
          segmentIdx++;
          coordInSegment = 0;
        }
      }

      const baseElevation = 50;
      const elevation = baseElevation + Math.sin(i * 0.3) * 15 + Math.sin(i * 0.7) * 8 + (i / route.coordinates.length) * route.elevationGain * 0.3;

      points.push({
        distance: Math.round(cumulativeDistance),
        elevation: Math.round(elevation),
        lighting,
      });
    }

    return points;
  }, [route]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;
    const point = payload[0].payload;
    const lightingLabel = point.lighting === "well_lit" ? "Well Lit" : point.lighting === "partial" ? "Partially Lit" : "No Lighting";
    const lightingColor = point.lighting === "well_lit" ? "#22c55e" : point.lighting === "partial" ? "#f59e0b" : "#ef4444";

    return (
      <div className="bg-card border rounded-md px-3 py-2 text-xs shadow-lg">
        <div className="font-medium">{(point.distance / 1000).toFixed(2)} km</div>
        <div className="text-muted-foreground">{point.elevation}m elevation</div>
        <div className="flex items-center gap-1.5 mt-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: lightingColor }} />
          <span style={{ color: lightingColor }}>{lightingLabel}</span>
        </div>
      </div>
    );
  };

  return (
    <div className={className} data-testid="elevation-profile">
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(14, 100%, 50%)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(14, 100%, 50%)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="distance"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(v) => `${(v / 1000).toFixed(1)}km`}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(v) => `${v}m`}
            axisLine={false}
            tickLine={false}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="elevation"
            stroke="hsl(14, 100%, 50%)"
            strokeWidth={2}
            fill="url(#elevGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
