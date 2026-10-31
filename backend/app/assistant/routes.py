from __future__ import annotations

from flask import Blueprint, jsonify, request

from .assistant_context import build_context
from .gemini_service import generate_assistant_response
from .tool_registry import confirm_pending_action, execute_tool

assistant_bp = Blueprint("assistant", __name__)


@assistant_bp.get("/health")
@assistant_bp.get("/assistant/health")
def health():
    return jsonify({"status": "ok", "service": "netpulse-assistant", "mode": "live"})


@assistant_bp.post("/chat")
@assistant_bp.post("/assistant/chat")
def chat():
    payload = request.get_json(silent=True) or {}
    context = build_context(payload)
    message = context.get("message")

    if not message:
        return jsonify({"reply": "Please send a message so I can help with the network."}), 400

    response = generate_assistant_response(
        message=message,
        page=context.get("page", "Overview"),
        mode=context.get("mode", "Live"),
        conversation=payload.get("conversation", []),
    )

    if response.get("error") and response.get("error") == "missing_api_key":
        return jsonify({
            "reply": response["reply"],
            "tool_result": None,
            "requires_confirmation": False,
            "frontend_action": None,
        })

    tool_call = response.get("tool_call")
    if tool_call:
        tool_name = tool_call.get("name")
        args = tool_call.get("arguments") or {}
        tool_result = execute_tool(tool_name, args, context)
        return jsonify({
            "reply": tool_result.get("reply", response.get("reply", "I’ve checked that for you.")),
            "tool_result": tool_result,
            "requires_confirmation": bool(tool_result.get("requires_confirmation")),
            "pending_action": tool_result.get("pending_action"),
            "frontend_action": tool_result if tool_result.get("type") in {"navigate", "demo_action"} else None,
        })

    return jsonify({
        "reply": response.get("reply", "I’m here to help with NetPulse."),
        "tool_result": None,
        "requires_confirmation": False,
        "frontend_action": None,
    })


@assistant_bp.post("/confirm")
@assistant_bp.post("/assistant/confirm")
def confirm():
    payload = request.get_json(silent=True) or {}
    action_id = payload.get("action_id")
    confirmed = bool(payload.get("confirmed", False))

    if not action_id:
        return jsonify({"reply": "There isn’t an active route change waiting for confirmation.", "confirmed": False}), 400

    result = confirm_pending_action(action_id, confirmed)
    return jsonify({
        "reply": result.get("reply", "Action updated."),
        "confirmed": confirmed,
        "tool_result": result,
        "frontend_action": result if result.get("type") in {"confirmed", "cancelled"} else None,
    })
