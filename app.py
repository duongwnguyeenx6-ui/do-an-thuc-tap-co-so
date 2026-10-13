import os
import threading
import webbrowser

from flask import Flask, jsonify, request, send_from_directory
from werkzeug.exceptions import HTTPException

from auth_routes import auth_api
from cover_routes import COVER_DIR, cover_api, migrate_legacy_covers
from database import BASE_DIR, initialize_schema
from favorite_routes import favorite_api
from story_routes import story_api


app = Flask(__name__, static_folder=str(BASE_DIR / "public"), static_url_path="")
app.config["MAX_CONTENT_LENGTH"] = 15 * 1024 * 1024
app.register_blueprint(auth_api)
app.register_blueprint(cover_api)
app.register_blueprint(favorite_api)
app.register_blueprint(story_api)


@app.errorhandler(HTTPException)
def handle_http_error(error):
    if error.code == 404 and not request.path.startswith("/api/"):
        return send_from_directory(BASE_DIR / "public", "index.html")
    if request.path.startswith("/api/"):
        return jsonify(message=error.description), error.code
    return error


@app.errorhandler(Exception)
def handle_unexpected_error(error):
    if isinstance(error, HTTPException):
        return handle_http_error(error)
    app.logger.exception("Unhandled request error")
    if request.path.startswith("/api/"):
        return jsonify(message="Đã xảy ra lỗi máy chủ.", error=str(error)), 500
    return "Internal Server Error", 500


@app.get("/")
def index():
    return send_from_directory(BASE_DIR / "public", "index.html")


@app.get("/<path:filename>")
def static_files(filename):
    return send_from_directory(BASE_DIR / "public", filename)


def initialize_app():
    initialize_schema()
    COVER_DIR.mkdir(parents=True, exist_ok=True)
    migrate_legacy_covers()


if __name__ == "__main__":
    initialize_app()
    port = int(os.getenv("PORT", "3000"))
    if os.getenv("OPEN_BROWSER", "1").lower() not in {"0", "false", "no"}:
        threading.Timer(1, webbrowser.open, args=(f"http://127.0.0.1:{port}",), kwargs={"new": 2}).start()
    app.run(host="0.0.0.0", port=port, debug=False)