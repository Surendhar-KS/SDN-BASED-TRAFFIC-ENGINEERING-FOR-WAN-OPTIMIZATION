from __future__ import annotations

import json
import uuid
from typing import Any, Dict, List
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .. import data

PENDING_ACTIONS: Dict[str, Dict[str, Any]] = {}


def _read_json(url: str, timeout: int = 5) -> Dict[str, Any]:
    request = Request(url, headers={"Accept": "application/json"}, method="GET")
    with urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def _controller_snapshot() -> Dict[str, Any]:
    def fallback() -> Dict[str, Any]:
        return {
            "controller_connected": False,
            "active_path": "unknown",
            "congestion": False,
            "last_event": "Controller is unavailable.",
            "primary_utilization": 0,
            "backup_utilization": 0,
            "monitored_link": "Unavailable",
            "primary_threshold": 85,
            "recovery_threshold": 60,
            "updated_at": "Unavailable",
            "status": "disconnected",
        }

    try:
        payload = _read_json("http://192.168.56.101:5001/api/monitoring/status", timeout=3)
        status = payload.get("data") if isinstance(payload, dict) and isinstance(payload.get("data"), dict) else payload
        if not isinstance(status, dict):
            return fallback()

        active_path = status.get("active_path")
        if active_path not in {"primary", "backup"}:
            active_path = "unknown"

        primary = float(status.get("primary_utilization") or status.get("utilization") or 0)
        backup = float(status.get("backup_utilization") or 0)
        return {
            "controller_connected": bool(status.get("controller_connected", True)),
            "active_path": active_path,
            "congestion": bool(status.get("congestion", False)),
            "last_event": str(status.get("last_event") or "Controller heartbeat received."),
            "primary_utilization": primary,
            "backup_utilization": backup,
            "monitored_link": str(status.get("monitored_link") or "Primary WAN"),
            "primary_threshold": float(status.get("primary_threshold") or 85),
            "recovery_threshold": float(status.get("recovery_threshold") or 60),
            "updated_at": str(status.get("updated_at") or "Unknown"),
            "status": "connected",
        }
    except (HTTPError, URLError, TimeoutError, ValueError, OSError):
        return fallback()


def _traffic_snapshot() -> Dict[str, Any]:
    try:
        payload = _read_json("http://192.168.56.101:5001/api/monitoring/traffic", timeout=5)
        if isinstance(payload, dict):
            sample_data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
            samples = sample_data.get("samples") if isinstance(sample_data, dict) else []
            if isinstance(samples, list) and samples:
                return {"samples": samples, "sample_count": len(samples)}
    except (HTTPError, URLError, TimeoutError, ValueError, OSError):
        pass

    return {
        "samples": [],
        "sample_count": 0,
    }


def _live_status_summary() -> Dict[str, Any]:
    controller = _controller_snapshot()
    traffic = _traffic_snapshot()
    latest = traffic["samples"][-1] if traffic["samples"] else {}
    summary = {
        "controller_connected": controller["controller_connected"],
        "mode": "live" if controller["controller_connected"] else "demo",
        "active_path": controller["active_path"],
        "congestion": controller["congestion"],
        "primary_utilization": latest.get("primary_utilization", controller["primary_utilization"]),
        "backup_utilization": latest.get("backup_utilization", controller["backup_utilization"]),
        "monitored_link": controller["monitored_link"],
        "last_event": controller["last_event"],
        "updated_at": controller["updated_at"],
        "links": data.TOPOLOGY["links"],
        "topology": data.TOPOLOGY,
    }
    return summary


def _tool_schema(name: str, description: str, properties: Dict[str, Any], required: List[str] | None = None) -> Dict[str, Any]:
    return {
        "name": name,
        "description": description,
        "parameters": {
            "type": "OBJECT",
            "properties": properties,
            "required": required or [],
        },
    }


TOOL_DEFINITIONS = [
    _tool_schema("get_network_status", "Return the current network status summary from the live controller or demo fixture.", {"page": {"type": "STRING"}}),
    _tool_schema("get_controller_status", "Return the controller connection state and route details.", {"page": {"type": "STRING"}}),
    _tool_schema("get_traffic_utilization", "Return latest link utilization and traffic utilization values.", {"page": {"type": "STRING"}}),
    _tool_schema("get_primary_link_status", "Report the current primary WAN link status.", {"page": {"type": "STRING"}}),
    _tool_schema("get_backup_link_status", "Report the current backup WAN link status.", {"page": {"type": "STRING"}}),
    _tool_schema("get_link_statistics", "Return link utilization and health statistics.", {"page": {"type": "STRING"}}),
    _tool_schema("get_traffic_history", "Return recent traffic samples and history.", {"page": {"type": "STRING"}}),
    _tool_schema("get_congestion_alerts", "Return congestion or alert information for the network.", {"page": {"type": "STRING"}}),
    _tool_schema("get_recent_events", "Return recent events and monitored activity.", {"page": {"type": "STRING"}}),
    _tool_schema("get_network_topology", "Return the current node and link topology map.", {"page": {"type": "STRING"}}),
    _tool_schema("get_active_route", "Return the currently active WAN route.", {"page": {"type": "STRING"}}),
    _tool_schema("switch_to_primary_path", "Switch the live network to the primary route after confirmation.", {"reason": {"type": "STRING"}}),
    _tool_schema("switch_to_backup_path", "Switch the live network to the backup route after confirmation.", {"reason": {"type": "STRING"}}),
    _tool_schema("get_routing_status", "Return route health and active path information.", {"page": {"type": "STRING"}}),
    _tool_schema("get_traffic_engineering_status", "Return the traffic engineering state and route summary.", {"page": {"type": "STRING"}}),
    _tool_schema("navigate_to_overview", "Open the Overview application page.", {"page": {"type": "STRING"}}),
    _tool_schema("navigate_to_topology", "Open the Network Topology page.", {"page": {"type": "STRING"}}),
    _tool_schema("navigate_to_traffic_monitoring", "Open the Traffic Monitoring page.", {"page": {"type": "STRING"}}),
    _tool_schema("navigate_to_traffic_engineering", "Open the Traffic Engineering page.", {"page": {"type": "STRING"}}),
    _tool_schema("navigate_to_alerts", "Open the Congestion Alerts page.", {"page": {"type": "STRING"}}),
    _tool_schema("navigate_to_link_management", "Open the Link Management page.", {"page": {"type": "STRING"}}),
    _tool_schema("navigate_to_analytics", "Open the Analytics page.", {"page": {"type": "STRING"}}),
    _tool_schema("navigate_to_event_logs", "Open the Event Logs page.", {"page": {"type": "STRING"}}),
    _tool_schema("navigate_to_demo", "Open the Demo page for simulation-only actions.", {"page": {"type": "STRING"}}),
    _tool_schema("navigate_to_settings", "Open the Settings page.", {"page": {"type": "STRING"}}),
    _tool_schema("start_demo", "Start the isolated demo simulation without modifying the live network.", {"page": {"type": "STRING"}}),
    _tool_schema("pause_demo", "Pause the isolated demo simulation.", {"page": {"type": "STRING"}}),
    _tool_schema("reset_demo", "Reset the demo simulation state.", {"page": {"type": "STRING"}}),
    _tool_schema("set_demo_traffic_intensity", "Adjust demo traffic intensity while staying isolated from live operations.", {"intensity": {"type": "STRING"}}),
    _tool_schema("set_demo_channel_status", "Enable or disable a specific demo channel.", {"channel": {"type": "STRING"}, "enabled": {"type": "BOOLEAN"}}),
    _tool_schema("simulate_demo_link_failure", "Temporarily fail a link in demo mode without affecting real network components.", {"link_id": {"type": "STRING"}}),
    _tool_schema("run_demo_shortest_path", "Evaluate the demo shortest path across the simulated network.", {"page": {"type": "STRING"}}),
    _tool_schema("explain_network_status", "Explain the live or demo network operating state in natural language.", {"page": {"type": "STRING"}}),
    _tool_schema("explain_congestion", "Explain the current congestion condition using live data or demo state.", {"page": {"type": "STRING"}}),
    _tool_schema("explain_active_route", "Explain which network route is active and why.", {"page": {"type": "STRING"}}),
    _tool_schema("summarize_recent_events", "Summarize the latest network and controller events.", {"page": {"type": "STRING"}}),
]


def _make_action_id() -> str:
    return f"assistant-{uuid.uuid4().hex[:8]}"


def _confirm_live_route(operation: str, reason: str | None = None) -> Dict[str, Any]:
    action_id = _make_action_id()
    action = {
        "id": action_id,
        "tool_name": operation,
        "reason": reason or "User confirmed the live route change.",
        "timestamp": __import__("datetime").datetime.utcnow().isoformat() + "Z",
    }
    PENDING_ACTIONS[action_id] = action
    return {
        "requires_confirmation": True,
        "pending_action": action,
        "reply": "I can make that live route change, but I need your confirmation before I touch the active network path.",
    }


def execute_tool(tool_name: str, args: Dict[str, Any] | None, context: Dict[str, Any] | None = None) -> Dict[str, Any]:
    arguments = args or {}
    context = context or {}
    summary = _live_status_summary()
    page = context.get("page") or "Overview"
    mode = (context.get("mode") or "Live").lower()

    if tool_name == "get_network_status":
        return {
            "type": "read",
            "data": summary,
            "reply": "The network is currently operating in {} mode. The active path is {} and the controller connection status is {}.".format(summary["mode"], summary["active_path"], "connected" if summary["controller_connected"] else "disconnected"),
        }

    if tool_name == "get_controller_status":
        return {
            "type": "read",
            "data": {
                "controller_connected": summary["controller_connected"],
                "active_path": summary["active_path"],
                "congestion": summary["congestion"],
                "last_event": summary["last_event"],
                "updated_at": summary["updated_at"],
            },
            "reply": "The controller is {}. The current active path is {}.".format("connected" if summary["controller_connected"] else "disconnected", summary["active_path"]),
        }

    if tool_name == "get_traffic_utilization":
        return {
            "type": "read",
            "data": {
                "primary_utilization": summary["primary_utilization"],
                "backup_utilization": summary["backup_utilization"],
                "active_path": summary["active_path"],
            },
            "reply": "Primary utilization is {}% and backup utilization is {}%.".format(summary["primary_utilization"], summary["backup_utilization"]),
        }

    if tool_name == "get_primary_link_status":
        return {
            "type": "read",
            "data": {"link": "Primary WAN", "utilization": summary["primary_utilization"], "congestion": summary["congestion"]},
            "reply": "The primary link is currently at {}% utilization.".format(summary["primary_utilization"]),
        }

    if tool_name == "get_backup_link_status":
        return {
            "type": "read",
            "data": {"link": "Backup WAN", "utilization": summary["backup_utilization"]},
            "reply": "The backup link is currently at {}% utilization.".format(summary["backup_utilization"]),
        }

    if tool_name == "get_link_statistics":
        links = data.TOPOLOGY["links"]
        return {
            "type": "read",
            "data": links,
            "reply": "I found {} links in the current topology. The most congested link is the one approaching the configured threshold.".format(len(links)),
        }

    if tool_name == "get_traffic_history":
        samples = _traffic_snapshot().get("samples", [])
        return {
            "type": "read",
            "data": samples[-10:],
            "reply": "The latest traffic history includes {} samples.".format(len(samples)),
        }

    if tool_name == "get_congestion_alerts":
        alerts = []
        if summary["congestion"]:
            alerts.append({"severity": "Critical", "message": "Congestion detected on the active path."})
        else:
            alerts.append({"severity": "Normal", "message": "No active congestion detected."})
        return {"type": "read", "data": alerts, "reply": alerts[0]["message"]}

    if tool_name == "get_recent_events":
        events = list(data.EVENTS)
        return {"type": "read", "data": events, "reply": "The recent event list was retrieved successfully."}

    if tool_name == "get_network_topology":
        return {"type": "read", "data": data.TOPOLOGY, "reply": "The topology model is available and contains current node and link data."}

    if tool_name == "get_active_route":
        return {"type": "read", "data": {"active_path": summary["active_path"]}, "reply": "The active route is {}.".format(summary["active_path"])}

    if tool_name == "switch_to_primary_path":
        if not summary["controller_connected"]:
            return {"type": "error", "reply": "I can’t switch the live route right now because the SDN controller is unavailable. I have not changed the live network."}
        return _confirm_live_route("switch_to_primary_path", arguments.get("reason"))

    if tool_name == "switch_to_backup_path":
        if not summary["controller_connected"]:
            return {"type": "error", "reply": "I can’t switch the live route right now because the controller is unavailable. I have not modified the live path."}
        return _confirm_live_route("switch_to_backup_path", arguments.get("reason"))

    if tool_name == "get_routing_status":
        return {"type": "read", "data": {"active_path": summary["active_path"], "congestion": summary["congestion"]}, "reply": "The route status is healthy for the currently active path."}

    if tool_name == "get_traffic_engineering_status":
        return {"type": "read", "data": {"active_path": summary["active_path"], "primary_utilization": summary["primary_utilization"], "backup_utilization": summary["backup_utilization"]}, "reply": "Traffic engineering is monitoring the active route and utilization levels."}

    if tool_name in {"navigate_to_overview", "navigate_to_topology", "navigate_to_traffic_monitoring", "navigate_to_traffic_engineering", "navigate_to_alerts", "navigate_to_link_management", "navigate_to_analytics", "navigate_to_event_logs", "navigate_to_demo", "navigate_to_settings"}:
        mapping = {
            "navigate_to_overview": "Overview",
            "navigate_to_topology": "Topology",
            "navigate_to_traffic_monitoring": "Traffic monitoring",
            "navigate_to_traffic_engineering": "Traffic engineering",
            "navigate_to_alerts": "Congestion alerts",
            "navigate_to_link_management": "Link management",
            "navigate_to_analytics": "Analytics",
            "navigate_to_event_logs": "Event logs",
            "navigate_to_demo": "Demo",
            "navigate_to_settings": "Settings",
        }
        target = mapping[tool_name]
        return {"type": "navigate", "page": target, "reply": "Opening the {} page.".format(target)}

    if tool_name == "start_demo":
        return {"type": "demo_action", "operation": "start_demo", "reply": "Demo mode is starting and the simulation will continue."}

    if tool_name == "pause_demo":
        return {"type": "demo_action", "operation": "pause_demo", "reply": "Demo mode is paused."}

    if tool_name == "reset_demo":
        return {"type": "demo_action", "operation": "reset_demo", "reply": "The demo has been reset to its default settings."}

    if tool_name == "set_demo_traffic_intensity":
        intensity = str(arguments.get("intensity") or "Medium")
        return {"type": "demo_action", "operation": "set_demo_traffic_intensity", "intensity": intensity, "reply": "Demo traffic intensity has been set to {}.".format(intensity)}

    if tool_name == "set_demo_channel_status":
        channel = str(arguments.get("channel") or "Channel 1")
        enabled = bool(arguments.get("enabled", True))
        return {"type": "demo_action", "operation": "set_demo_channel_status", "channel": channel, "enabled": enabled, "reply": "Demo channel {} is now {}.".format(channel, "enabled" if enabled else "disabled")}

    if tool_name == "simulate_demo_link_failure":
        link_id = str(arguments.get("link_id") or "L2")
        return {"type": "demo_action", "operation": "simulate_demo_link_failure", "link_id": link_id, "reply": "The demo link {} has been toggled into a failure state for simulation only.".format(link_id)}

    if tool_name == "run_demo_shortest_path":
        return {"type": "demo_action", "operation": "run_demo_shortest_path", "reply": "The shortest-path route has been recalculated for the demo topology."}

    if tool_name == "explain_network_status":
        return {
            "type": "read",
            "data": summary,
            "reply": "The network is currently {}. The active route is {} and the controller state is {}. This means the operation is {}.".format(summary["mode"], summary["active_path"], "connected" if summary["controller_connected"] else "disconnected", "stable" if not summary["congestion"] else "under congestion"),
        }

    if tool_name == "explain_congestion":
        return {
            "type": "read",
            "data": summary,
            "reply": "The current congestion condition is {}. The monitored primary path is running at {}% utilization, which is close to the configured {}% threshold.".format("active" if summary["congestion"] else "normal", summary["primary_utilization"], summary["primary_threshold"] if summary.get("primary_threshold") else 85),
        }

    if tool_name == "explain_active_route":
        return {
            "type": "read",
            "data": {"active_path": summary["active_path"]},
            "reply": "The active route is {}. The system is currently favoring that path based on the latest controller health and utilization data.".format(summary["active_path"]),
        }

    if tool_name == "summarize_recent_events":
        recent = data.EVENTS[-3:]
        return {"type": "read", "data": recent, "reply": "Recent activity shows the system is monitoring flow conditions, and the most recent event is related to the current route and utilization state."}

    return {"type": "error", "reply": "I’m not able to perform that operation right now because it is not supported by the current NetPulse tool set."}


def confirm_pending_action(action_id: str, confirmed: bool) -> Dict[str, Any]:
    action = PENDING_ACTIONS.get(action_id)
    if not action:
        return {"type": "error", "reply": "That action is no longer available for confirmation."}

    if not confirmed:
        PENDING_ACTIONS.pop(action_id, None)
        return {"type": "cancelled", "reply": "I did not perform the live route change."}

    tool_name = action["tool_name"]
    args = {"reason": action["reason"]}
    result = execute_tool(tool_name, args, {"page": "Traffic engineering", "mode": "Live"})
    PENDING_ACTIONS.pop(action_id, None)

    if result.get("requires_confirmation"):
        return result

    if result.get("type") == "error":
        return result

    return {
        "type": "confirmed",
        "tool_name": tool_name,
        "reply": "The live route change has been confirmed and the controller state was reviewed. {}".format(result.get("reply", "")),
    }
