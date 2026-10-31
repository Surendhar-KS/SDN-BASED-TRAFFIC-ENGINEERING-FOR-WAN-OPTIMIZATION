"""NetPulse NMS backend package."""

import os

from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS

load_dotenv()

from .assistant.routes import assistant_bp
from .routes import api


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": "*",
                "methods": ["GET", "POST", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"],
            }
        },
    )
    app.register_blueprint(api, url_prefix="/api")
    app.register_blueprint(assistant_bp, url_prefix="/api")

    @app.errorhandler(404)
    def not_found(_error):
        return jsonify({"error": "API endpoint not found"}), 404

    @app.errorhandler(500)
    def internal_error(_error):
        return jsonify({"error": "Internal server error"}), 500

    return app


app = create_app()
