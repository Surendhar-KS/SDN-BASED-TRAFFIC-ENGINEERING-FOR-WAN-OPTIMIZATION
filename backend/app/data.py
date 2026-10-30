"""Temporary, explicitly labelled lab fixture data.

Replace this provider with controller/Prometheus adapters after the API smoke test.
Nothing in this module represents a live enterprise WAN.
"""

TOPOLOGY = {
    "mode": "demo",
    "nodes": [
        {"id": "h1", "label": "Branch A", "type": "host", "ip": "10.0.0.1"},
        {"id": "s1", "label": "Edge Switch", "type": "switch", "dpid": "0000000000000001"},
        {"id": "s2", "label": "Primary Core", "type": "switch", "dpid": "0000000000000002"},
        {"id": "s3", "label": "Backup Core", "type": "switch", "dpid": "0000000000000003"},
        {"id": "s4", "label": "Data Centre Gateway", "type": "switch", "dpid": "0000000000000004"},
        {"id": "h2", "label": "Data Centre", "type": "host", "ip": "10.0.0.2"},
    ],
    "links": [
        {"id": "L1", "source": "h1", "target": "s1", "capacity_mbps": 100, "utilization_percent": 12, "latency_ms": 2, "status": "up"},
        {"id": "L2", "source": "s1", "target": "s2", "capacity_mbps": 10, "utilization_percent": 86, "latency_ms": 42, "status": "up"},
        {"id": "L3", "source": "s2", "target": "s4", "capacity_mbps": 100, "utilization_percent": 34, "latency_ms": 18, "status": "up"},
        {"id": "L4", "source": "s1", "target": "s3", "capacity_mbps": 20, "utilization_percent": 28, "latency_ms": 24, "status": "up"},
        {"id": "L5", "source": "s3", "target": "s4", "capacity_mbps": 20, "utilization_percent": 19, "latency_ms": 21, "status": "up"},
        {"id": "L6", "source": "s4", "target": "h2", "capacity_mbps": 100, "utilization_percent": 10, "latency_ms": 2, "status": "up"},
    ],
}

EVENTS = [
    {"id": "EVT-001", "type": "SYSTEM", "severity": "INFO", "message": "Backend API started in demo mode", "source": "backend"},
    {"id": "EVT-002", "type": "CONGESTION", "severity": "WARNING", "message": "Fixture link L2 is configured at 86% utilization", "source": "demo-provider"},
]
