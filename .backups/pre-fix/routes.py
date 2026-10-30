from flask import Blueprint, jsonify, request
from . import data
import json
from urllib.request import urlopen
from urllib.error import URLError

api = Blueprint("api", __name__)


def envelope(payload, mode="demo"):
    return {"mode": mode, "source": "demo-fixture", "data": payload}


@api.get("/health")
def health():
    return jsonify({"status": "ok", "service": "netpulse-api", "mode": "demo", "controller_connected": False})


@api.get("/topology")
def topology():
    return jsonify(envelope(data.TOPOLOGY))


@api.get("/links")
def links():
    return jsonify(envelope(data.TOPOLOGY["links"]))


@api.get("/metrics/summary")
def metrics_summary():
    links = data.TOPOLOGY["links"]
    active = [link for link in links if link["status"] == "up"]
    avg_util = round(sum(link["utilization_percent"] for link in active) / len(active), 1) if active else 0
    return jsonify(envelope({
        "links_total": len(links),
        "links_up": len(active),
        "average_link_utilization_percent": avg_util,
        "congested_links": [link["id"] for link in active if link["utilization_percent"] >= 85],
        "controller_connected": False,
    }))


@api.get("/alerts")
def alerts():
    alerts = [
        {"id": "ALT-001", "severity": "WARNING", "message": "L2 demo utilization is above the 85% threshold", "link_id": "L2", "acknowledged": False}
    ]
    return jsonify(envelope(alerts))


@api.get("/events")
def events():
    return jsonify(envelope(data.EVENTS))


@api.post("/traffic-engineering/optimize")
def optimize():
    body = request.get_json(silent=True) or {}
    source = body.get("source", "h1")
    destination = body.get("destination", "h2")
    if not isinstance(source, str) or not isinstance(destination, str) or not source or not destination:
        return jsonify({"error": "source and destination must be non-empty strings"}), 400
    # Intentionally do not simulate a successful route change. Actual OpenFlow
    # operations are enabled only after a controller adapter is implemented.
    return jsonify({
        "status": "not_connected",
        "message": "Traffic optimization is unavailable: no SDN controller is connected.",
        "source": source,
        "destination": destination,
        "openflow_rules_installed": False,
        "mode": "demo",
    }), 503


@api.get("/controller/status")
def controller_status():
    controller_url = "http://192.168.56.101:5001/api/monitoring/status"

    try:
        with urlopen(controller_url, timeout=3) as response:
            status = json.loads(response.read().decode("utf-8"))

        return jsonify({
            "mode": "live",
            "source": "ubuntu-sdn-controller",
            "data": status
        })

    except (URLError, TimeoutError, OSError, ValueError) as error:
        return jsonify({
            "mode": "disconnected",
            "source": "ubuntu-sdn-controller",
            "controller_connected": False,
            "message": str(error)
        }), 503


@api.get("/controller/traffic")
def controller_traffic():
    controller_url = "http://192.168.56.101:5001/api/monitoring/traffic"

    try:
        with urlopen(controller_url, timeout=5) as response:
            traffic = json.loads(response.read().decode("utf-8"))

        return jsonify({
            "mode": "live",
            "source": "ubuntu-sdn-controller",
            "data": traffic.get("data", {})
        })

    except (URLError, TimeoutError, OSError, ValueError) as error:
        return jsonify({
            "mode": "disconnected",
            "source": "ubuntu-sdn-controller",
            "message": str(error),
            "data": {
                "sample_count": 0,
                "samples": []
            }
        }), 503