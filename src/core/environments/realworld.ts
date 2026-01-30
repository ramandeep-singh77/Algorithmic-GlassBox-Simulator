import type { Coord, Graph, GraphNode, LatLng } from "../types";

export function latLngToCoord(ll: LatLng): Coord {
  // For display purposes, scale lat/lng to reasonable x/y values
  // This is a simple mapping - in production you'd use proper projection
  return { x: ll.lng * 100, y: ll.lat * 100 };
}

export function coordToLatLng(c: Coord): LatLng {
  return { lat: c.y / 100, lng: c.x / 100 };
}

export async function createGraphFromRoute(
  start: LatLng,
  goal: LatLng
): Promise<{ graph: Graph; startKey: string; goalKey: string }> {
  return new Promise((resolve, reject) => {
    if (!window.google) {
      reject(new Error("Google Maps API not loaded"));
      return;
    }

    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin: start,
        destination: goal,
        travelMode: window.google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false
      },
      (
        result: any,
        status: any
      ) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          const nodes: GraphNode[] = [];
          const edges: Array<{ from: string; to: string; cost: number }> = [];
          const nodeMap = new Map<string, GraphNode>();

          // Extract waypoints from route
          const route = result.routes[0];
          if (!route) {
            reject(new Error("No route found"));
            return;
          }

          let nodeId = 0;
          const addNode = (ll: LatLng, label?: string): string => {
            const key = `n${nodeId++}`;
            const coord = latLngToCoord(ll);
            const node: GraphNode = {
              id: key,
              at: coord,
              label: label || key
            };
            nodes.push(node);
            nodeMap.set(key, node);
            return key;
          };

          const dist = (a: LatLng, b: LatLng) => {
            return window.google.maps.geometry.spherical.computeDistanceBetween(
              new window.google.maps.LatLng(a.lat, a.lng),
              new window.google.maps.LatLng(b.lat, b.lng)
            );
          };

          // Extract path from route overview_polyline
          const path = route.overview_path || [];
          if (path.length === 0) {
            // Fallback: use leg endpoints
            route.legs.forEach((leg: any) => {
              const startLL = { lat: leg.start_location.lat(), lng: leg.start_location.lng() };
              const endLL = { lat: leg.end_location.lat(), lng: leg.end_location.lng() };
              if (nodes.length === 0) {
                addNode(startLL, "Start");
              }
              addNode(endLL, nodes.length === 0 ? "Start" : leg === route.legs[route.legs.length - 1] ? "Goal" : undefined);
            });
          } else {
            // Sample points from path - use more points for better pathfinding visualization
            // Aim for 20-50 nodes depending on route length
            const targetNodes = Math.min(50, Math.max(20, Math.floor(path.length / 5)));
            const sampleRate = Math.max(1, Math.floor(path.length / targetNodes));
            
            for (let i = 0; i < path.length; i += sampleRate) {
              const ll = { lat: path[i].lat(), lng: path[i].lng() };
              const label = i === 0 ? "Start" : undefined;
              addNode(ll, label);
            }
            // Always add the last point as Goal
            if (path.length > 0) {
              const lastLL = { lat: path[path.length - 1].lat(), lng: path[path.length - 1].lng() };
              const lastNode = nodes[nodes.length - 1];
              if (!lastNode || Math.abs(lastNode.at.x - lastLL.lng * 100) > 0.1 || Math.abs(lastNode.at.y - lastLL.lat * 100) > 0.1) {
                const goalKey = addNode(lastLL, "Goal");
                // Update the last node's label if it's close to goal
                if (nodes.length > 1) {
                  const prevNode = nodes[nodes.length - 2];
                  if (prevNode && Math.abs(prevNode.at.x - lastLL.lng * 100) < 0.1 && Math.abs(prevNode.at.y - lastLL.lat * 100) < 0.1) {
                    nodes[nodes.length - 2] = { ...prevNode, label: "Goal" };
                    nodes.pop(); // Remove duplicate
                  }
                }
              } else {
                nodes[nodes.length - 1] = { ...lastNode, label: "Goal" };
              }
            }
          }

          // Create edges between consecutive nodes (bidirectional for pathfinding)
          for (let i = 0; i < nodes.length - 1; i++) {
            const fromNode = nodes[i]!;
            const toNode = nodes[i + 1]!;
            const fromLL = coordToLatLng(fromNode.at);
            const toLL = coordToLatLng(toNode.at);
            const cost = dist(fromLL, toLL) / 1000; // km, convert meters to km
            // Add forward edge
            edges.push({ from: fromNode.id, to: toNode.id, cost });
            // Add backward edge for undirected graph behavior (allows pathfinding in both directions)
            edges.push({ from: toNode.id, to: fromNode.id, cost });
          }
          
          console.log(`[createGraphFromRoute] Created graph with ${nodes.length} nodes and ${edges.length} edges`);
          console.log(`[createGraphFromRoute] Start: ${nodes[0]?.id}, Goal: ${nodes[nodes.length - 1]?.id}`);
          
          // Verify graph connectivity
          const edgeMap = new Map<string, string[]>();
          edges.forEach(e => {
            const arr = edgeMap.get(e.from) || [];
            arr.push(e.to);
            edgeMap.set(e.from, arr);
          });
          const startKey = nodes[0]?.id;
          const goalKey = nodes[nodes.length - 1]?.id;
          if (startKey) {
            console.log(`[createGraphFromRoute] Start node edges:`, edgeMap.get(startKey) || []);
          }
          if (goalKey) {
            console.log(`[createGraphFromRoute] Goal node edges:`, edgeMap.get(goalKey) || []);
          }

          // Ensure we have at least start and goal
          if (nodes.length === 0) {
            const startKey = addNode(start, "Start");
            const goalKey = addNode(goal, "Goal");
            const cost = dist(start, goal) / 1000;
            edges.push({ from: startKey, to: goalKey, cost });
            edges.push({ from: goalKey, to: startKey, cost }); // Bidirectional
            resolve({ graph: { directed: false, nodes, edges }, startKey, goalKey });
          } else {
            const startKey = nodes[0]!.id;
            const goalKey = nodes[nodes.length - 1]!.id;
            // Make graph undirected for better pathfinding (edges go both ways)
            resolve({ graph: { directed: false, nodes, edges }, startKey, goalKey });
          }
        } else {
          reject(new Error(`Directions request failed: ${status}`));
        }
      }
    );
  });
}
