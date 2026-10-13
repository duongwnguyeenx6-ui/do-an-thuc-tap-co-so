import time
from datetime import date

from flask import Blueprint, g, jsonify, request

from database import execute, fetch_all, fetch_one
from security import hash_password, login_required, new_token, serialize_user, sessions


auth_api = Blueprint("auth_api", __name__, url_prefix="/api")


def body():
    return request.get_json(silent=True) or {}


@auth_api.post("/auth/register")
def register():
    data = body()
    username, email, password = data.get("username"), data.get("email"), data.get("password")
    if not username or not email or not password:
        return jsonify(message="Thiếu username, email hoặc password."), 400
    role = str(data.get("role") or "reader").strip().lower()
    if role == "admin":
        return jsonify(message="Hệ thống không cho phép tạo tài khoản admin."), 403
    role = "author" if role == "author" else "reader"
    username, email = str(username).strip(), str(email).strip().lower()
    existing = fetch_one(
        "SELECT id FROM users WHERE LOWER(email) = LOWER(%s) OR LOWER(username) = LOWER(%s)",
        (email, username),
    )
    if existing:
        return jsonify(message="Username hoặc email đã tồn tại."), 409
    birthday = data.get("dateOfBirth") or None
    try:
        if birthday:
            birthday = date.fromisoformat(str(birthday)).isoformat()
    except ValueError:
        return jsonify(message="Ngày sinh không hợp lệ."), 400
    user = execute(
        """INSERT INTO users (username, email, password, role, full_name, date_of_birth)
           VALUES (%s, %s, %s, %s, %s, %s) RETURNING *""",
        (username, email, hash_password(str(password)), role,
         str(data.get("fullName") or username).strip() or None, birthday),
    )
    return jsonify(message="Đăng ký thành công.", user=serialize_user(user)), 201


@auth_api.post("/auth/login")
def login():
    data = body()
    email, password = data.get("email"), data.get("password")
    if not email or not password:
        return jsonify(message="Thiếu email hoặc password."), 400
    identifier = str(email).strip()
    user = fetch_one(
        "SELECT * FROM users WHERE LOWER(email) = LOWER(%s) OR LOWER(username) = LOWER(%s) LIMIT 1",
        (identifier, identifier),
    )
    if not user or user["password"] != hash_password(str(password)):
        return jsonify(message="Thông tin đăng nhập không đúng."), 401
    token = new_token()
    user_info = serialize_user(user)
    sessions[token] = user_info
    return jsonify(message="Đăng nhập thành công.", token=token, user=user_info)


@auth_api.post("/auth/logout")
@login_required
def logout():
    sessions.pop(g.session_token, None)
    return jsonify(message="Đã đăng xuất.")


@auth_api.get("/account")
@login_required
def account():
    user = fetch_one("SELECT * FROM users WHERE id = %s LIMIT 1", (g.user["id"],))
    if not user:
        return jsonify(message="Không tìm thấy tài khoản."), 404
    purchases = fetch_all(
        """SELECT p.id, p.amount, p.created_at, s.title AS story_title
           FROM purchases p LEFT JOIN stories s ON s.id = p.story_id
           WHERE p.user_id = %s ORDER BY p.created_at DESC, p.id DESC""",
        (g.user["id"],),
    )
    return jsonify(
        user=serialize_user(user),
        purchases=[
            {"id": int(row["id"]), "storyTitle": row["story_title"] or "Truyện không xác định",
             "amount": float(row["amount"] or 0), "createdAt": row["created_at"].isoformat() if row["created_at"] else None}
            for row in purchases
        ],
    )


@auth_api.put("/account")
@login_required
def update_account():
    data = body()
    username = str(data.get("username") or "").strip()
    email = str(data.get("email") or "").strip().lower()
    full_name = str(data.get("fullName") or "").strip()
    birthday_value = str(data.get("dateOfBirth") or "").strip()

    if not username or not email or not full_name:
        return jsonify(message="Họ tên, tên đăng nhập và email không được để trống."), 400

    try:
        birthday = date.fromisoformat(birthday_value) if birthday_value else None
    except ValueError:
        return jsonify(message="Ngày sinh không hợp lệ."), 400

    duplicate = fetch_one(
        """SELECT id FROM users
           WHERE id <> %s AND (LOWER(email) = LOWER(%s) OR LOWER(username) = LOWER(%s))
           LIMIT 1""",
        (g.user["id"], email, username),
    )
    if duplicate:
        return jsonify(message="Email hoặc tên đăng nhập đã được sử dụng."), 409

    updated = execute(
        """UPDATE users SET username = %s, email = %s, full_name = %s, date_of_birth = %s
           WHERE id = %s RETURNING *""",
        (username, email, full_name, birthday, g.user["id"]),
    )
    if not updated:
        return jsonify(message="Không tìm thấy tài khoản."), 404

    user_info = serialize_user(updated)
    sessions[g.session_token] = user_info
    return jsonify(message="Đã cập nhật thông tin cá nhân.", user=user_info)


@auth_api.post("/auth/forgot-password")
def forgot_password():
    email = body().get("email")
    if not email:
        return jsonify(message="Thiếu email."), 400
    token = new_token()
    user = execute(
        """UPDATE users SET reset_token = %s, reset_token_expires = %s
           WHERE LOWER(email) = LOWER(%s) RETURNING id""",
        (token, int(time.time() * 1000) + 60 * 60 * 1000, str(email).strip()),
    )
    if not user:
        return jsonify(message="Email không tồn tại trong hệ thống."), 404
    return jsonify(message="Yêu cầu đặt lại mật khẩu đã được tạo.", resetToken=token, expiresIn=3600)


@auth_api.post("/auth/reset-password")
def reset_password():
    data = body()
    token, password = data.get("token"), data.get("password")
    if not token or not password:
        return jsonify(message="Thiếu token hoặc mật khẩu mới."), 400
    user = execute(
        """UPDATE users SET password = %s, reset_token = NULL, reset_token_expires = NULL
           WHERE reset_token = %s AND reset_token_expires > %s RETURNING id""",
        (hash_password(str(password)), token, int(time.time() * 1000)),
    )
    if not user:
        return jsonify(message="Token không hợp lệ hoặc đã hết hạn."), 400
    return jsonify(message="Mật khẩu đã được đặt lại thành công.")