from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional
from urllib import error, request

from .tool_registry import TOOL_DEFINITIONS


def _get_gemini_api_key() -> str:
    return os.getenv("GEMINI_API_KEY", "")


def _get_gemini_model() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-3.8-flash")


def _build_system_instruction() -> str:
    return (
        "You are NetPulse AI Assistant, a helpful network operations assistant. "
        "Use the available application tools when the user asks for network status, navigation, or route changes. "
        "Never claim a live network change succeeded unless the controller status confirms it. "
        "Always remain concise and natural in English. "
        "When a live route change is requested, ask or confirm before making the change. "
        "Demo actions must never affect the live network. "
        "If a tool is unavailable, say so honestly without fabricating a result."
    )


def _build_tool_payload() -> List[Dict[str, Any]]:
    tools: List[Dict[str, Any]] = []
    for item in TOOL_DEFINITIONS:
        tools.append({
            "functionDeclarations": [{
                "name": item["name"],
                "description": item["description"],
                "parameters": item["parameters"],
            }]
        })
    return tools


def _safe_text_from_response(data: Dict[str, Any]) -> str:
    try:
        candidates = data.get("candidates") or []
        for candidate in candidates:
            for part in candidate.get("content", {}).get("parts", []):
                if "text" in part:
                    return str(part["text"]).strip()
                if "functionCall" in part:
                    function_call = part.get("functionCall") or {}
                    return f"I’m checking the {function_call.get('name', 'requested action')} now."
    except Exception:
        return "I’m checking that for you now."
    return "I’m checking that for you now."


def generate_assistant_response(message: str, page: str, mode: str, conversation: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    history = conversation or []
    prompt_parts: List[str] = []
    for entry in history[-10:]:
        role = entry.get("role", "user")
        text = str(entry.get("text", "")).strip()
        if text:
            prompt_parts.append(f"{role}: {text}")
    prompt_parts.append(f"user: {message}")
    prompt_parts.append(f"context: current_page={page}; mode={mode}")

    payload = {
        "contents": [{
            "role": "user",
            "parts": [{"text": "\n".join(prompt_parts)}],
        }],
        "system_instruction": {
            "parts": [{"text": _build_system_instruction()}],
        },
        "tools": _build_tool_payload(),
        "toolConfig": {"functionCallingConfig": {"mode": "AUTO"}},
    }

    gemini_api_key = _get_gemini_api_key()
    gemini_model = _get_gemini_model()

    if not gemini_api_key:
        return {
            "reply": "I’m ready to help, but the Gemini API key is not configured in the backend environment yet.",
            "error": "missing_api_key",
        }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:generateContent?key={gemini_api_key}"
    request_body = json.dumps(payload).encode("utf-8")
    req = request.Request(url, data=request_body, headers={"Content-Type": "application/json"}, method="POST")

    try:
        with request.urlopen(req, timeout=60) as response:
            data = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        payload_error = exc.read().decode("utf-8", errors="ignore")
        try:
            body = json.loads(payload_error)
            message_text = body.get("error", {}).get("message", "Gemini rejected the request.")
        except Exception:
            message_text = payload_error or "Gemini rejected the request."
        return {"reply": "The AI service is temporarily unavailable. " + message_text, "error": "gemini_request_failed"}
    except Exception as exc:  # pragma: no cover - defensive path
        return {"reply": "I couldn’t reach the AI service at the moment. Please try again in a moment.", "error": str(exc)}

    candidate = (data.get("candidates") or [{}])[0]
    parts = candidate.get("content", {}).get("parts", [])

    for part in parts:
        if "functionCall" in part:
            function_call = part.get("functionCall") or {}
            return {
                "tool_call": {
                    "name": function_call.get("name"),
                    "arguments": function_call.get("args", {}),
                },
                "reply": _safe_text_from_response(data),
            }

    reply = _safe_text_from_response(data)
    return {"reply": reply, "error": None}
