import React, { useEffect, useRef, useState, useMemo } from "react";
import type { DrawMode, StepSnapshot } from "../../core/types";

type Props = Readonly<{
  startLatLng: { lat: number; lng: number } | null;
  goalLatLng: { lat: number; lng: number } | null;
  step: StepSnapshot | null;
  finalPath?: ReadonlyArray<{ x: number; y: number }>; // Final path from trace
  drawMode: DrawMode;
  onStartChange: (lat: number, lng: number) => void;
  onGoalChange: (lat: number, lng: number) => void;
  onMapReady?: (map: any) => void;
}>;

export function GoogleMapsCanvas({
  startLatLng,
  goalLatLng,
  step,
  finalPath,
  drawMode,
  onStartChange,
  onGoalChange,
  onMapReady
}: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{
    start: any;
    goal: any;
  }>({ start: null, goal: null });
  const pathPolylineRef = useRef<any>(null);
  const visitedPolylineRef = useRef<any[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Default center (can be made configurable)
  const defaultCenter = useMemo(() => ({ lat: 37.7749, lng: -122.4194 }), []); // San Francisco

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) return; // Already initialized

    let checkInterval: number | null = null;

    const initMap = () => {
      if (!window.google?.maps || !mapRef.current) {
        return false;
      }

      try {
        const map = new window.google.maps.Map(mapRef.current, {
          center: startLatLng || goalLatLng || defaultCenter,
          zoom: startLatLng && goalLatLng ? 12 : 13,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false
        });

        mapInstanceRef.current = map;
        setIsMapLoaded(true);
        setMapError(null);
        if (onMapReady) onMapReady(map);
        return true;
      } catch (err: any) {
        console.error("Failed to initialize Google Map:", err);
        setMapError(err?.message || "Failed to load Google Maps. Check API key and billing.");
        return false;
      }
    };

    // Try immediately
    if (window.google?.maps) {
      const success = initMap();
      if (!success) {
        console.error("Map initialization failed - check API key and billing");
      }
    } else {
      // Wait for script to load
      let attempts = 0;
      checkInterval = window.setInterval(() => {
        attempts++;
        if (window.google?.maps) {
          if (checkInterval) window.clearInterval(checkInterval);
          const success = initMap();
          if (!success) {
            console.error("Map initialization failed - check API key and billing");
          }
        } else if (attempts > 100) {
          // 10 seconds timeout
          if (checkInterval) window.clearInterval(checkInterval);
          setMapError(
            "Google Maps API failed to load. Check: 1) API key is valid, 2) Maps JavaScript API is enabled, 3) Billing is enabled, 4) No domain restrictions"
          );
          console.error("Google Maps API failed to load after 10 seconds");
        }
      }, 100);
    }

    return () => {
      if (checkInterval) window.clearInterval(checkInterval);
    };
  }, []); // Only run once on mount

  // Update click listener when drawMode changes
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapLoaded || !window.google?.maps) return;

    const map = mapInstanceRef.current;
    let clickListener: any = null;

    // Remove old listener if exists
    if ((map as any)._clickListener) {
      try {
        window.google.maps.event.removeListener((map as any)._clickListener);
      } catch (e) {
        // Ignore if already removed
      }
    }

    // Always add click listener - it will check drawMode inside
    clickListener = map.addListener("click", (e: any) => {
      if (!e.latLng) {
        console.warn("Click event missing latLng");
        return;
      }
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      console.log("Map clicked at:", lat, lng, "drawMode:", drawMode);

      // Only act if in start/goal mode
      if (drawMode === "start") {
        console.log("✓ Setting start at:", lat, lng);
        onStartChange(lat, lng);
      } else if (drawMode === "goal") {
        console.log("✓ Setting goal at:", lat, lng);
        onGoalChange(lat, lng);
      } else {
        console.log("ℹ Click ignored - set 'Set Start' or 'Set Goal' mode first");
      }
    });

    // Store listener reference
    (map as any)._clickListener = clickListener;

    return () => {
      if (clickListener && window.google?.maps?.event) {
        try {
          window.google.maps.event.removeListener(clickListener);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [drawMode, onStartChange, onGoalChange, isMapLoaded]);

  // Update markers
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapLoaded) return;

    const map = mapInstanceRef.current;

    // Start marker
    if (startLatLng) {
      if (!markersRef.current.start) {
        markersRef.current.start = new window.google.maps.Marker({
          position: startLatLng,
          map,
          label: "S",
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#40c057",
            fillOpacity: 1,
            strokeColor: "#000",
            strokeWeight: 2
          },
          title: "Start"
        });
      } else {
        markersRef.current.start.setPosition(startLatLng);
      }
    } else if (markersRef.current.start) {
      markersRef.current.start.setMap(null);
      markersRef.current.start = null;
    }

    // Goal marker
    if (goalLatLng) {
      if (!markersRef.current.goal) {
        markersRef.current.goal = new window.google.maps.Marker({
          position: goalLatLng,
          map,
          label: "G",
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#ff6b6b",
            fillOpacity: 1,
            strokeColor: "#000",
            strokeWeight: 2
          },
          title: "Goal"
        });
      } else {
        markersRef.current.goal.setPosition(goalLatLng);
      }
    } else if (markersRef.current.goal) {
      markersRef.current.goal.setMap(null);
      markersRef.current.goal = null;
    }

    // Fit bounds if both markers exist
    if (startLatLng && goalLatLng && markersRef.current.start && markersRef.current.goal) {
      try {
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(startLatLng);
        bounds.extend(goalLatLng);
        map.fitBounds(bounds, { padding: 50 });
      } catch (e) {
        // Ignore bounds errors
      }
    } else if (startLatLng && markersRef.current.start) {
      map.setCenter(startLatLng);
      map.setZoom(15);
    } else if (goalLatLng && markersRef.current.goal) {
      map.setCenter(goalLatLng);
      map.setZoom(15);
    }
  }, [startLatLng, goalLatLng, isMapLoaded]);

  // Draw visited/closed nodes and path from step
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapLoaded || !step) return;

    // Clear previous visited markers
    visitedPolylineRef.current.forEach((m) => {
      if (m.setMap) m.setMap(null);
    });
    visitedPolylineRef.current = [];

    // Draw visited nodes (yellow circles)
    if (step.visited && step.visited.size > 0) {
      step.visited.forEach((nodeKey) => {
        // We need to get the coordinate for this node key
        // For now, we'll skip individual node visualization and just show the path
        // This would require access to the graph structure
      });
    }

    // Draw path - prefer step.path, fallback to finalPath
    const pathToDraw = step?.path && step.path.length > 0 ? step.path : (finalPath || []);
    
    if (pathToDraw.length > 0) {
      // Convert path coordinates to LatLng
      // Coordinates are stored as: x = lng * 100, y = lat * 100
      const pathLatLngs = pathToDraw.map((p) => {
        if ("x" in p && "y" in p) {
          // Convert back: lat = y / 100, lng = x / 100
          return new window.google.maps.LatLng(p.y / 100, p.x / 100);
        }
        return new window.google.maps.LatLng((p as any).lat || 0, (p as any).lng || 0);
      });

      if (pathLatLngs.length > 0) {
        if (pathPolylineRef.current) {
          pathPolylineRef.current.setPath(pathLatLngs);
        } else {
          pathPolylineRef.current = new window.google.maps.Polyline({
            path: pathLatLngs,
            geodesic: true,
            strokeColor: "#00d4ff",
            strokeOpacity: 1.0,
            strokeWeight: 5,
            map: mapInstanceRef.current,
            zIndex: 1000
          });
        }
        
        // Fit map to show the path
        if (pathLatLngs.length > 1) {
          const bounds = new window.google.maps.LatLngBounds();
          pathLatLngs.forEach((ll) => bounds.extend(ll));
          mapInstanceRef.current.fitBounds(bounds, { padding: 50 });
        }
      }
    } else if (finalPath && finalPath.length > 0) {
      // Draw final path even if step doesn't have path
      const pathLatLngs = finalPath.map((p) => {
        if ("x" in p && "y" in p) {
          return new window.google.maps.LatLng(p.y / 100, p.x / 100);
        }
        return new window.google.maps.LatLng((p as any).lat || 0, (p as any).lng || 0);
      });

      if (pathLatLngs.length > 0) {
        if (pathPolylineRef.current) {
          pathPolylineRef.current.setPath(pathLatLngs);
        } else {
          pathPolylineRef.current = new window.google.maps.Polyline({
            path: pathLatLngs,
            geodesic: true,
            strokeColor: "#00d4ff",
            strokeOpacity: 1.0,
            strokeWeight: 5,
            map: mapInstanceRef.current,
            zIndex: 1000
          });
        }
        
        // Fit map to show the path
        if (pathLatLngs.length > 1) {
          const bounds = new window.google.maps.LatLngBounds();
          pathLatLngs.forEach((ll) => bounds.extend(ll));
          mapInstanceRef.current.fitBounds(bounds, { padding: 50 });
        }
      }
    } else {
      // Clear path if no path available
      if (pathPolylineRef.current) {
        pathPolylineRef.current.setMap(null);
        pathPolylineRef.current = null;
      }
    }

    // Debug logging
    if (step?.phase === "found") {
      console.log("✓ Path found! Path length:", step.path?.length || 0, "nodes");
    }
    if (step?.phase === "exhausted") {
      console.warn("⚠ Search exhausted:", step.warnings);
    }
    if (finalPath && finalPath.length > 0) {
      console.log("Final path from trace:", finalPath.length, "nodes");
    }
  }, [step, finalPath, isMapLoaded]);

  return (
    <div>
      <div className="controlsRow" style={{ justifyContent: "space-between", marginBottom: 10 }}>
        <span className="small">
          Click on the map to set Start/Goal, then run algorithms to see pathfinding on real roads.
        </span>
        <span className="pill">
          <span className="mono">Mode</span>
          <span className="mono">{drawMode}</span>
        </span>
      </div>
      <div
        ref={mapRef}
        style={{
          width: "100%",
          minHeight: 400,
          height: "min(520px, 60vh)",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          overflow: "hidden",
          position: "relative",
          backgroundColor: "rgba(255,255,255,0.02)"
        }}
      />
      {mapError && (
        <div className="warning" style={{ marginTop: 10, background: "rgba(255,107,107,0.15)", borderColor: "rgba(255,107,107,0.3)" }}>
          {mapError}
        </div>
      )}
      {!isMapLoaded && !mapError && (
        <div className="warning" style={{ marginTop: 10 }}>
          {!window.google
            ? "Loading Google Maps API..."
            : "Initializing map..."}
        </div>
      )}
      {isMapLoaded && (drawMode === "start" || drawMode === "goal") && (
        <div className="warning" style={{ marginTop: 10, background: "rgba(124,92,255,0.15)", borderColor: "rgba(124,92,255,0.3)" }}>
          ✓ Map ready! Click anywhere on the map to set {drawMode === "start" ? "Start" : "Goal"} point
        </div>
      )}
    </div>
  );
}
