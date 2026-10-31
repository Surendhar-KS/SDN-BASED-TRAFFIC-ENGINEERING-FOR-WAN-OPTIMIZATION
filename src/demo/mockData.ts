import type { DemoLink, DemoNode, TrafficIntensity } from './types';

export const trafficIntensityOptions: TrafficIntensity[] = ['Low', 'Medium', 'High', 'Extreme'];

export const trafficIntensityScale: Record<TrafficIntensity, number> = {
  Low: 0.8,
  Medium: 1,
  High: 1.5,
  Extreme: 2.2,
};

export const defaultNodes: DemoNode[] = [
  { id: 'Source', label: 'Source', available: true },
  { id: 'B', label: 'Node B', available: true },
  { id: 'C', label: 'Node C', available: true },
  { id: 'D', label: 'Node D', available: true },
  { id: 'E', label: 'Node E', available: true },
  { id: 'Destination', label: 'Destination', available: true },
];

export const initialRouteLinks: DemoLink[] = [
  { id: 'S-B', source: 'Source', target: 'B', latency: 4, bandwidth: 180, utilization: 32, congestion: 18, available: true },
  { id: 'B-D', source: 'B', target: 'Destination', latency: 8, bandwidth: 160, utilization: 42, congestion: 22, available: true },
  { id: 'S-C', source: 'Source', target: 'C', latency: 8, bandwidth: 170, utilization: 55, congestion: 36, available: true },
  { id: 'C-D', source: 'C', target: 'D', latency: 7, bandwidth: 165, utilization: 58, congestion: 41, available: true },
  { id: 'D-Destination', source: 'D', target: 'Destination', latency: 5, bandwidth: 200, utilization: 34, congestion: 20, available: true },
  { id: 'S-D', source: 'Source', target: 'D', latency: 10, bandwidth: 150, utilization: 68, congestion: 52, available: true },
  { id: 'D-E', source: 'D', target: 'E', latency: 7, bandwidth: 130, utilization: 72, congestion: 58, available: true },
  { id: 'E-Destination', source: 'E', target: 'Destination', latency: 11, bandwidth: 140, utilization: 60, congestion: 45, available: true },
];

export const demoNodeLayout: Record<string, { x: number; y: number }> = {
  Source: { x: 80, y: 170 },
  B: { x: 260, y: 90 },
  C: { x: 260, y: 250 },
  D: { x: 430, y: 170 },
  E: { x: 590, y: 250 },
  Destination: { x: 760, y: 170 },
};

export const routeDescriptions = {
  A: 'Source → Node B → Destination',
  B: 'Source → Node C → Node D → Destination',
  C: 'Source → Node D → Node E → Destination',
};
