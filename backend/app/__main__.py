import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from .routes import api

load_dotenv()
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

@app.errorhandler(404)
def not_found(_error):
    return jsonify({"error": "API endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(_error):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == "__main__":
    app.run(
        host=os.getenv("FLASK_HOST", "0.0.0.0"),
        port=int(os.getenv("FLASK_PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG", "true").lower() == "true",
    )
