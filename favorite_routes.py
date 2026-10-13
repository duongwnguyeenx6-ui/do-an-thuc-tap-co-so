from flask import Blueprint, g, jsonify

from database import execute, fetch_all, fetch_one
from security import login_required


favorite_api = Blueprint("favorite_api", __name__, url_prefix="/api")


def load_favorites(user_id):
    rows = fetch_all(
        """SELECT story_id FROM favorites
           WHERE user_id = %s
           ORDER BY created_at DESC, story_id DESC""",
        (user_id,),
    )
    return [int(row["story_id"]) for row in rows]


@favorite_api.get("/favorites")
@login_required
def list_favorites():
    return jsonify(favorites=load_favorites(g.user["id"]))


@favorite_api.post("/favorites/<int:story_id>")
@login_required
def add_favorite(story_id):
    if not fetch_one("SELECT id FROM stories WHERE id = %s", (story_id,)):
        return jsonify(message="Không tìm thấy truyện."), 404

    execute(
        """INSERT INTO favorites (user_id, story_id)
           VALUES (%s, %s)
           ON CONFLICT (user_id, story_id) DO NOTHING""",
        (g.user["id"], story_id),
    )
    return jsonify(
        message="Đã lưu truyện yêu thích.",
        favorites=load_favorites(g.user["id"]),
    )


@favorite_api.delete("/favorites/<int:story_id>")
@login_required
def remove_favorite(story_id):
    execute(
        "DELETE FROM favorites WHERE user_id = %s AND story_id = %s",
        (g.user["id"], story_id),
    )
    return jsonify(
        message="Đã bỏ lưu truyện.",
        favorites=load_favorites(g.user["id"]),
    )
