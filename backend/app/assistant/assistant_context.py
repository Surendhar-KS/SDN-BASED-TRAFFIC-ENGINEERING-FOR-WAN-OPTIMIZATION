from __future__ import annotations

from typing import Any, Dict


def build_context(payload: Dict[str, Any] | None) -> Dict[str, Any]:
    data = payload or {}
    page = data.get("page") or "Overview"
    mode = data.get("mode") or "Live"
    conversation = data.get("conversation") or []
    message = (data.get("message") or "").strip()

    return {
        "page": str(page),
        "mode": str(mode),
        "message": message,
        "conversation_count": len(conversation) if isinstance(conversation, list) else 0,
    }
