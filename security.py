import hashlib
import re
import secrets
from datetime import date, datetime
from functools import wraps

from flask import g, jsonify, request

from database import fetch_one


sessions = {}


def hash_password(password):
    # Existing accounts use this hash format; keep it compatible.
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def new_token():
    return secrets.token_hex(32)


def iso_value(value):
    return value.isoformat() if isinstance(value, (date, datetime)) else value


def serialize_user(user):
    return {
        "id": int(user["id"]),
        "username": user["username"],
        "email": user["email"],
        "role": user.get("role") or "reader",
        "fullName": user.get("full_name") or user.get("fullName") or user["username"],
        "dateOfBirth": iso_value(user.get("date_of_birth") or user.get("dateOfBirth")),
        "createdAt": iso_value(user.get("created_at") or user.get("createdAt")),
    }


def current_user():
    match = re.match(r"^Bearer\s+(.+)$", request.headers.get("Authorization", ""), re.I)
    return sessions.get(match.group(1)) if match else None


def login_required(handler):
    @wraps(handler)
    def wrapped(*args, **kwargs):
        match = re.match(r"^Bearer\s+(.+)$", request.headers.get("Authorization", ""), re.I)
        user = sessions.get(match.group(1)) if match else None
        if not user:
            return jsonify(message="Vui lòng đăng nhập để tiếp tục."), 401
        g.user = user
        g.session_token = match.group(1)
        return handler(*args, **kwargs)

    return wrapped


def roles_required(*roles):
    def decorate(handler):
        @wraps(handler)
        @login_required
        def wrapped(*args, **kwargs):
            if g.user.get("role") not in roles:
                return jsonify(message="Tài khoản không có quyền thực hiện thao tác này."), 403
            return handler(*args, **kwargs)

        return wrapped

    return decorate


def story_owner_required(handler):
    @wraps(handler)
    @login_required
    def wrapped(story_id, *args, **kwargs):
        story = fetch_one("SELECT owner_id FROM stories WHERE id = %s", (story_id,))
        if not story:
            return jsonify(message="Không tìm thấy truyện."), 404
        owner_id = story["owner_id"]
        owns_story = owner_id is not None and int(owner_id) == int(g.user["id"])
        if g.user["role"] != "admin" and not (g.user["role"] == "author" and owns_story):
            return jsonify(message="Bạn chỉ được sửa truyện do mình sở hữu."), 403
        g.story_owner_id = int(owner_id) if owner_id is not None else None
        return handler(story_id, *args, **kwargs)

    return wrapped


def story_author_required(handler):
    @wraps(handler)
    @login_required
    def wrapped(story_id, *args, **kwargs):
        story = fetch_one("SELECT owner_id FROM stories WHERE id = %s", (story_id,))
        if not story:
            return jsonify(message="Không tìm thấy truyện."), 404
        owner_id = story["owner_id"]
        owns_story = owner_id is not None and int(owner_id) == int(g.user["id"])
        if g.user.get("role") not in {"author", "admin"} or not owns_story:
            return jsonify(message="Chỉ người đăng sở hữu truyện mới được sửa nội dung."), 403
        g.story_owner_id = int(owner_id)
        return handler(story_id, *args, **kwargs)

    return wrapped