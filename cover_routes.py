import base64
import mimetypes
import re
import secrets
from pathlib import Path

from flask import Blueprint, Response, jsonify, send_from_directory

from database import execute, fetch_all, fetch_one


BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = BASE_DIR / "public"
COVER_DIR = PUBLIC_DIR / "uploads" / "covers"
ALLOWED_IMAGES = {
    "image/png": (".png", b"\x89PNG\r\n\x1a\n"),
    "image/jpeg": (".jpg", b"\xff\xd8\xff"),
    "image/gif": (".gif", b"GIF"),
    "image/webp": (".webp", b"RIFF"),
}
cover_api = Blueprint("cover_api", __name__)


def detect_image_type(image_data):
    if image_data.startswith(ALLOWED_IMAGES["image/png"][1]):
        return "image/png"
    if image_data.startswith(ALLOWED_IMAGES["image/jpeg"][1]):
        return "image/jpeg"
    if image_data.startswith(ALLOWED_IMAGES["image/gif"][1]):
        return "image/gif"
    if image_data.startswith(b"RIFF") and image_data[8:12] == b"WEBP":
        return "image/webp"
    return None


def save_cover(value):
    image_value = str(value or "").strip()
    if not image_value.startswith("data:"):
        return image_value
    match = re.fullmatch(
        r"data:(image/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]+={0,2})",
        image_value,
    )
    if not match:
        raise ValueError("Ảnh tải lên phải là PNG, JPG, WEBP hoặc GIF hợp lệ.")
    image_data = base64.b64decode(match.group(2), validate=True)
    if len(image_data) > 10 * 1024 * 1024:
        raise ValueError("Ảnh không được lớn hơn 10 MB.")
    content_type = detect_image_type(image_data)
    if not content_type:
        raise ValueError("Không nhận diện được định dạng ảnh tải lên.")
    filename = f"{secrets.token_hex(16)}{ALLOWED_IMAGES[content_type][0]}"
    COVER_DIR.mkdir(parents=True, exist_ok=True)
    (COVER_DIR / filename).write_bytes(image_data)
    return f"/uploads/covers/{filename}"


def migrate_legacy_covers():
    COVER_DIR.mkdir(parents=True, exist_ok=True)
    stories = fetch_all(
        "SELECT id, cover_image FROM stories WHERE cover_image LIKE %s",
        ("data:image/%;base64,%",),
    )
    for story in stories:
        match = re.fullmatch(
            r"data:image/(?:png|jpeg|webp|gif);base64,([A-Za-z0-9+/]+={0,2})",
            story["cover_image"] or "",
        )
        if not match:
            continue
        image_data = base64.b64decode(match.group(1), validate=True)
        content_type = detect_image_type(image_data)
        if not content_type:
            continue
        filename = f"story-{story['id']}{ALLOWED_IMAGES[content_type][0]}"
        (COVER_DIR / filename).write_bytes(image_data)
        execute("UPDATE stories SET cover_image = %s WHERE id = %s", (f"/uploads/covers/{filename}", story["id"]))


@cover_api.get("/api/covers")
def list_covers():
    COVER_DIR.mkdir(parents=True, exist_ok=True)
    covers = []
    for file_path in COVER_DIR.iterdir():
        content_type, _ = mimetypes.guess_type(file_path.name)
        if file_path.is_file() and content_type in ALLOWED_IMAGES:
            covers.append({"title": file_path.stem, "url": f"/uploads/covers/{file_path.name}"})
    return jsonify(sorted(covers, key=lambda cover: cover["title"].casefold()))


@cover_api.get("/api/covers/<int:cover_id>/image")
def get_cover_asset(cover_id):
    cover = fetch_one("SELECT content_type, image_data FROM cover_assets WHERE id = %s", (cover_id,))
    if not cover:
        return jsonify(message="Không tìm thấy ảnh."), 404
    response = Response(bytes(cover["image_data"]), mimetype=cover["content_type"])
    response.headers["Cache-Control"] = "public, max-age=86400"
    return response


@cover_api.get("/uploads/covers/<path:filename>")
def uploaded_cover(filename):
    return send_from_directory(COVER_DIR, filename)