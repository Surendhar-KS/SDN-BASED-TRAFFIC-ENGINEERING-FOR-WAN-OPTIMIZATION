export type TrafficIntensity = 'Low' | 'Medium' | 'High' | 'Extreme';

export type DemoChannel = {
  id: string;
  label: string;
  enabled: boolean;
  capacity: number;
  assignedTraffic: number;
  utilization: number;
  processingLatency: number;
  queueLength: number;
  status: 'online' | 'warning' | 'offline';
};

export type DemoLink = {
  id: string;
  source: string;
  target: string;
  latency: number;
  bandwidth: number;
  utilization: number;
  congestion: number;
  available: boolean;
};

export type DemoNode = {
  id: string;
  label: string;
  available: boolean;
};

export type RouteEvaluation = {
  path: string[];
  totalLatency: number;
  cost: number;
};
