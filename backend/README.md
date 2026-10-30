# NetPulse Flask API (Phase 2 starter)

This backend currently runs in **demo mode**. It provides a stable API contract and clearly labels fixture data. It does not connect to Mininet, Open vSwitch, OS-Ken/Ryu, or Prometheus yet. The optimize endpoint returns HTTP 503 until a real controller adapter exists; it never pretends to reroute traffic.

## Windows PowerShell setup

From this `backend` directory:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
python -m app
```

If PowerShell blocks activation, run this once in the current terminal:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

API base URL: `http://127.0.0.1:5000/api`

## Endpoints

- `GET /api/health`
- `GET /api/topology`
- `GET /api/links`
- `GET /api/metrics/summary`
- `GET /api/alerts`
- `GET /api/events`
- `POST /api/traffic-engineering/optimize` — deliberately returns `503` until a controller is connected.

## Test

```powershell
python -m unittest discover -s tests -v
```

## Next integration work

1. Add a controller adapter that consumes real topology and OpenFlow port/flow statistics.
2. Calculate throughput from counter deltas and timestamps; handle counter resets and stale samples.
3. Add Prometheus scraping/export and data freshness indicators.
4. Implement capacity-aware path calculation, hysteresis and cooldown.
5. Install rules through the controller, verify traffic on the new path, and roll back on failure.

Never expose OpenFlow switch management directly to the browser. Keep controller access server-side.
