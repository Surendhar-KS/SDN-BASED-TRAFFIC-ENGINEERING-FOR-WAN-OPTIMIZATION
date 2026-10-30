
const resolveApiBaseUrl = (): string => {
  const candidates = [
    import.meta.env.VITE_API_BASE_URL,
    "http://127.0.0.1:5000/api",
    "http://localhost:5000/api",
  ].filter((value, index, array) => Boolean(value) && array.indexOf(value) === index);

  if (typeof window !== "undefined") {
    const currentHost = window.location.hostname;
    const browserCandidates = [
      `http://${currentHost}:5000/api`,
      `http://127.0.0.1:5000/api`,
      `http://localhost:5000/api`,
    ];

    for (const candidate of browserCandidates) {
      if (!candidates.includes(candidate)) candidates.push(candidate);
    }
  }

  return candidates[0] || "http://127.0.0.1:5000/api";
};

const API_BASE_URL = resolveApiBaseUrl();

export interface ApiResponse<T> {
  mode: string;
  source: string;
  data: T;
}

export interface HealthResponse {
  status: string;
  service: string;
  mode: string;
  controller_connected: boolean;
}

export interface ApiLink {
  id: string;
  source: string;
  target: string;
  capacity_mbps: number;
  utilization_percent: number;
  latency_ms: number;
  status: "up" | "down";
}

export interface ApiEvent {
  id: string;
  type: string;
  severity: string;
  message: string;
  source: string;
}

export interface ApiAlert {
  id: string;
  severity: string;
  message: string;
  link_id: string;
  acknowledged: boolean;
}

export interface MetricsSummary {
  links_total: number;
  links_up: number;
  average_link_utilization_percent: number;
  congested_links: string[];
  controller_connected: boolean;
}

async function getJson<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `API request failed: ${endpoint} (${response.status})`
    );
  }

  return response.json() as Promise<T>;
}

export const api = {
  health: () =>
    getJson<HealthResponse>("/health"),

  topology: () =>
    getJson<ApiResponse<{
      nodes: Array<{
        id: string;
        label: string;
        type: string;
        ip?: string;
        dpid?: string;
      }>;
      links: ApiLink[];
    }>>("/topology"),

  links: () =>
    getJson<ApiResponse<ApiLink[]>>("/links"),

  metrics: () =>
    getJson<ApiResponse<MetricsSummary>>("/metrics/summary"),

  alerts: () =>
    getJson<ApiResponse<ApiAlert[]>>("/alerts"),

  events: () =>
    getJson<ApiResponse<ApiEvent[]>>("/events"),

  optimize: (source = "h1", destination = "h2") =>
    fetch(`${API_BASE_URL}/traffic-engineering/optimize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ source, destination }),
    }),
};
