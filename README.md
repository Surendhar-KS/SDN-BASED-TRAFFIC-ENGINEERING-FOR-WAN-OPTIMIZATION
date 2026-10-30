# NetPulse — SDN WAN Optimization NMS frontend

A dark-theme React + TypeScript dashboard starter for the Wipro SDN-Based Traffic Engineering for WAN Optimization project.

## Requirements
- Node.js 20.19+ or 22.12+
- npm
- VS Code (optional but recommended)

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually http://localhost:5173).

## Build production bundle

```bash
npm run build
npm run preview
```

## What is implemented
- Responsive dark NMS layout and navigation
- Overview KPIs, traffic chart, health panel and active alerts
- WAN topology SVG preview
- Link inventory with filtering and utilization bars
- Traffic engineering page with a local demonstration reroute action
- Congestion alerts, analytics, event log and settings screens
- Explicit demo-data indicators

## Important integration status
This is a **frontend prototype**. The charts, topology and link values are demonstration data held in the browser. The “Optimize traffic” action only changes local demo state; it does not contact an SDN controller or install OpenFlow rules.

## Planned backend integration
Create a Python Flask API that reads controller/exporter metrics and exposes endpoints such as:
- `GET /api/health`
- `GET /api/topology`
- `GET /api/links`
- `GET /api/metrics/traffic`
- `GET /api/alerts`
- `GET /api/events`
- `POST /api/traffic-engineering/optimize` (authenticated and audited)

The backend must validate path capacity and topology, install rules through the controller, verify the new path, and roll back safely on failure. Never let the browser talk directly to OpenFlow switches.
