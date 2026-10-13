import hmac
import os
import re
import secrets
from decimal import Decimal, InvalidOperation
from datetime import datetime
from urllib.parse import urlencode

from flask import Blueprint, g, jsonify, request
from psycopg2.errors import UniqueViolation
from psycopg2.extras import RealDictCursor

from database import connect, execute, fetch_all, fetch_one
from cover_routes import save_cover
from security import current_user, login_required, roles_required, story_author_required, story_owner_required


story_api = Blueprint("story_api", __name__, url_prefix="/api")


def body():
    return request.get_json(silent=True) or {}


def payment_configuration():
    return {
        "bank_code": os.getenv("PAYMENT_BANK_CODE", "").strip(),
        "account_number": os.getenv("PAYMENT_ACCOUNT_NUMBER", "").strip(),
        "account_name": os.getenv("PAYMENT_ACCOUNT_NAME", "").strip(),
    }


def payment_order_response(order):
    configuration = payment_configuration()
    demo_mode = os.getenv("PAYMENT_DEMO_MODE", "").strip().lower() in {"1", "true", "yes"}
    qr_url = ""
    if not demo_mode:
        qr_url = "https://vietqr.app/img?" + urlencode({
            "acc": configuration["account_number"],
            "bank": configuration["bank_code"],
            "amount": int(Decimal(str(order["amount"]))),
            "des": order["payment_code"],
            "template": "compact",
            "showinfo": "true",
            "holder": configuration["account_name"],
        })
    return {
        "id": int(order["id"]),
        "storyId": int(order["story_id"]),
        "amount": float(order["amount"]),
        "paymentCode": order["payment_code"],
        "status": order["status"],
        "confirmationMethod": order["confirmation_method"],
        "createdAt": order["created_at"].isoformat() if order.get("created_at") else None,
        "paidAt": order["paid_at"].isoformat() if order.get("paid_at") else None,
        "qrUrl": qr_url,
        "bankCode": "" if demo_mode else configuration["bank_code"],
        "accountNumber": "" if demo_mode else configuration["account_number"],
        "accountName": "" if demo_mode else configuration["account_name"],
        "demo": demo_mode,
    }


def payment_setup_complete():
    if os.getenv("PAYMENT_DEMO_MODE", "").strip().lower() in {"1", "true", "yes"}:
        return True
    configuration = payment_configuration()
    return all(configuration.values())


def complete_payment(
    cursor,
    order,
    method,
    transaction_id=None,
    gateway=None,
    account_number=None,
    transfer_amount=None,
    transaction_date=None,
    reference_code=None,
    content=None,
    admin_id=None,
):
    cursor.execute(
        """UPDATE payment_orders SET status = 'paid', confirmation_method = %s,
                  sepay_transaction_id = %s, sepay_gateway = %s,
                  sepay_account_number = %s, sepay_transfer_amount = %s,
                  sepay_transaction_date = %s, sepay_reference_code = %s,
                  transfer_content = %s, confirmed_by = %s, paid_at = NOW()
           WHERE id = %s AND status = 'pending' RETURNING id""",
        (
            method, transaction_id, gateway, account_number, transfer_amount,
            transaction_date, reference_code, content, admin_id, order["id"],
        ),
    )
    if cursor.fetchone():
        cursor.execute(
            "INSERT INTO purchases (user_id, story_id, amount) VALUES (%s, %s, %s)",
            (order["user_id"], order["story_id"], order["amount"]),
        )
        cursor.execute(
            "UPDATE stories SET revenue = COALESCE(revenue, 0) + %s WHERE id = %s",
            (order["amount"], order["story_id"]),
        )
        cursor.execute("SELECT * FROM payment_orders WHERE id = %s", (order["id"],))
        return cursor.fetchone()
    return False


def can_read_story(user, story):
    if user and user["role"] == "admin":
        return True
    if user and story.get("owner_id") is not None and int(story["owner_id"]) == int(user["id"]):
        return True
    if float(story.get("price") or 0) <= 0:
        return True
    if not user:
        return False
    return bool(fetch_one(
        "SELECT 1 FROM purchases WHERE user_id = %s AND story_id = %s LIMIT 1",
        (user["id"], story["id"]),
    ))


def serialize_story(story, chapters, can_read=True):
    updated = story.get("updated_at")
    return {
        "maTruyen": int(story["id"]), "tieuDe": story["title"], "tacGia": story["author"],
        "theLoai": story["genre"], "trangThai": story["status"],
        "capNhat": updated.strftime("%d/%m/%Y, %H:%M:%S") if updated else "Vừa cập nhật",
        "moTa": story.get("description") or "", "coverImage": story.get("cover_image") or "",
        "isPremium": bool(story.get("is_premium")), "gia": float(story.get("price") or 0),
        "doanhThu": float(story.get("revenue") or 0),
        "ownerId": int(story["owner_id"]) if story.get("owner_id") is not None else None,
        "canRead": can_read,
        "danhSachChuong": [{
            "id": int(chapter["id"]), "tieuDe": chapter["title"], "noiDung": chapter["content"],
            "soThuTu": chapter["chapter_number"],
        } for chapter in chapters] if can_read else [],
    }


def load_story(story_id, user=None):
    story = fetch_one("SELECT * FROM stories WHERE id = %s", (story_id,))
    if not story:
        return None
    chapters = fetch_all(
        "SELECT * FROM chapters WHERE story_id = %s ORDER BY chapter_number ASC", (story_id,)
    )
    return serialize_story(story, chapters, can_read_story(user, story))


def load_stories(user=None):
    stories = fetch_all("SELECT * FROM stories ORDER BY updated_at DESC, id DESC")
    result = []
    for story in stories:
        chapters = fetch_all(
            "SELECT * FROM chapters WHERE story_id = %s ORDER BY chapter_number ASC", (story["id"],)
        )
        result.append(serialize_story(story, chapters, can_read_story(user, story)))
    return result


@story_api.get("/stories")
def list_stories():
    return jsonify(load_stories(current_user()))


@story_api.get("/stories/<int:story_id>")
def story_detail(story_id):
    story = load_story(story_id, current_user())
    if not story:
        return jsonify(message="Không tìm thấy truyện."), 404
    return jsonify(story)


def serialize_review(review):
    return {
        "id": int(review["id"]),
        "username": review["username"],
        "rating": int(review["rating"]),
        "comment": review["comment"],
        "createdAt": review["created_at"].isoformat(),
        "updatedAt": review["updated_at"].isoformat(),
    }


@story_api.get("/stories/<int:story_id>/reviews")
def list_story_reviews(story_id):
    if not fetch_one("SELECT id FROM stories WHERE id = %s", (story_id,)):
        return jsonify(message="Không tìm thấy truyện."), 404

    summary = fetch_one(
        """SELECT COUNT(*) AS review_count, COALESCE(AVG(rating), 0) AS average_rating
           FROM story_reviews WHERE story_id = %s""",
        (story_id,),
    )
    reviews = fetch_all(
        """SELECT r.id, r.rating, r.comment, r.created_at, r.updated_at, u.username
           FROM story_reviews r JOIN users u ON u.id = r.user_id
           WHERE r.story_id = %s ORDER BY r.created_at DESC, r.id DESC""",
        (story_id,),
    )
    return jsonify(
        averageRating=round(float(summary["average_rating"]), 1),
        reviewCount=int(summary["review_count"]),
        reviews=[serialize_review(review) for review in reviews],
    )


@story_api.post("/stories/<int:story_id>/reviews")
@login_required
def save_story_review(story_id):
    if not fetch_one("SELECT id FROM stories WHERE id = %s", (story_id,)):
        return jsonify(message="Không tìm thấy truyện."), 404

    data = body()
    rating_value = data.get("rating")
    if isinstance(rating_value, bool) or not isinstance(rating_value, (int, str)):
        return jsonify(message="Vui lòng chọn số sao từ 1 đến 5."), 400
    try:
        rating = int(rating_value)
    except (TypeError, ValueError):
        return jsonify(message="Vui lòng chọn số sao từ 1 đến 5."), 400
    if not 1 <= rating <= 5:
        return jsonify(message="Số sao phải từ 1 đến 5."), 400

    comment = str(data.get("comment") or "").strip()
    if not comment:
        return jsonify(message="Vui lòng nhập bình luận."), 400
    if len(comment) > 2000:
        return jsonify(message="Bình luận không được vượt quá 2000 ký tự."), 400

    review = execute(
        """INSERT INTO story_reviews (story_id, user_id, rating, comment)
           VALUES (%s, %s, %s, %s)
           RETURNING id, rating, comment, created_at, updated_at""",
        (story_id, g.user["id"], rating, comment),
    )
    return jsonify(message="Đã lưu đánh giá.", review={
        "id": int(review["id"]),
        "rating": int(review["rating"]),
        "comment": review["comment"],
        "createdAt": review["created_at"].isoformat(),
        "updatedAt": review["updated_at"].isoformat(),
    })


@story_api.post("/stories")
@roles_required("author", "admin")
def create_story():
    data = body()
    title, author, genre = data.get("tieuDe"), data.get("tacGia"), data.get("theLoai")
    if not title or not author or not genre:
        return jsonify(message="Thiếu thông tin bắt buộc."), 400
    image = save_cover(data.get("coverImage") or data.get("cover_image"))
    price = float(data.get("price") or 0)
    owner_id = int(data["ownerId"]) if g.user["role"] == "admin" and data.get("ownerId") else int(g.user["id"])
    story = execute(
        """INSERT INTO stories (title, author, genre, status, description, cover_image,
           owner_id, is_premium, price, revenue)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 0) RETURNING *""",
        (str(title).strip(), str(author).strip(), str(genre).strip(), data.get("trangThai") or "Full",
         data.get("moTa") or "Truyện mới được thêm vào hệ thống.", image or None, owner_id,
         bool(data.get("isPremium") or price > 0), price),
    )
    return jsonify(serialize_story(story, [])), 201


@story_api.put("/stories/<int:story_id>")
@story_author_required
def update_story(story_id):
    data = body()
    title, author, genre = data.get("tieuDe"), data.get("tacGia"), data.get("theLoai")
    if not title or not author or not genre:
        return jsonify(message="Thiếu thông tin bắt buộc."), 400
    previous = fetch_one("SELECT cover_image FROM stories WHERE id = %s", (story_id,))
    image = save_cover(data.get("coverImage") or data.get("cover_image") or previous["cover_image"])
    price = float(data.get("price") or 0)
    owner_id = g.story_owner_id
    updated = execute(
        """UPDATE stories SET title = %s, author = %s, genre = %s, status = %s,
           description = %s, cover_image = %s, owner_id = %s, is_premium = %s,
           price = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING id""",
        (str(title).strip(), str(author).strip(), str(genre).strip(), data.get("trangThai") or "New",
         str(data.get("moTa") or "").strip(), image or previous["cover_image"], owner_id,
         bool(data.get("isPremium") or price > 0), price, story_id),
    )
    if not updated:
        return jsonify(message="Không tìm thấy truyện."), 404
    return jsonify(load_story(story_id))


@story_api.delete("/stories/<int:story_id>")
@story_owner_required
def delete_story(story_id):
    deleted = execute("DELETE FROM stories WHERE id = %s RETURNING id", (story_id,))
    if not deleted:
        return jsonify(message="Không tìm thấy truyện."), 404
    return jsonify(message="Đã xóa truyện", maTruyen=int(deleted["id"]))


@story_api.get("/admin/summary")
@roles_required("admin")
def admin_summary():
    revenue = fetch_one("SELECT COALESCE(SUM(amount), 0) AS total FROM purchases")
    top_stories = fetch_all(
        """SELECT s.id, s.title, s.author, COALESCE(SUM(p.amount), 0) AS revenue,
                  COUNT(p.id) AS sales FROM stories s LEFT JOIN purchases p ON p.story_id = s.id
           GROUP BY s.id, s.title, s.author ORDER BY revenue DESC, sales DESC LIMIT 10"""
    )
    sales = fetch_one("SELECT COUNT(*) AS total FROM purchases")
    return jsonify(
        totalRevenue=float(revenue["total"] or 0), totalSales=int(sales["total"] or 0),
        topStories=[{"maTruyen": int(row["id"]), "tieuDe": row["title"], "tacGia": row["author"],
                     "total": float(row["revenue"] or 0), "sales": int(row["sales"] or 0)} for row in top_stories],
    )


@story_api.get("/rankings")
def rankings():
    most_read = fetch_all(
        """SELECT s.id, s.title, s.author, s.cover_image, COUNT(r.id) AS reads
           FROM stories s JOIN story_reads r ON r.story_id = s.id
           GROUP BY s.id ORDER BY reads DESC, s.title ASC LIMIT 3"""
    )
    best_selling = fetch_all(
        """SELECT s.id, s.title, s.author, s.cover_image, COUNT(p.id) AS sales,
                  COALESCE(SUM(p.amount), 0) AS revenue
           FROM stories s JOIN purchases p ON p.story_id = s.id
           GROUP BY s.id ORDER BY sales DESC, revenue DESC, s.title ASC LIMIT 3"""
    )

    def serialize_ranked_stories(rows, metric):
        return [{
            "maTruyen": int(row["id"]),
            "tieuDe": row["title"],
            "tacGia": row["author"],
            "coverImage": row["cover_image"] or "",
            metric: int(row[metric] or 0),
            **({"doanhThu": float(row["revenue"] or 0)} if metric == "sales" else {}),
        } for row in rows]

    return jsonify(
        mostRead=serialize_ranked_stories(most_read, "reads"),
        bestSelling=serialize_ranked_stories(best_selling, "sales"),
    )


@story_api.post("/stories/<int:story_id>/reads")
def record_story_read(story_id):
    story = fetch_one("SELECT * FROM stories WHERE id = %s", (story_id,))
    if not story:
        return jsonify(message="Không tìm thấy truyện."), 404

    user = current_user()
    if not can_read_story(user, story):
        return jsonify(message="Bạn cần mua truyện để đọc chương này."), 403

    data = body()
    try:
        chapter_number = int(data.get("chapterNumber"))
    except (TypeError, ValueError):
        return jsonify(message="Thiếu số chương hợp lệ."), 400

    chapter = fetch_one(
        "SELECT 1 FROM chapters WHERE story_id = %s AND chapter_number = %s",
        (story_id, chapter_number),
    )
    if not chapter:
        return jsonify(message="Không tìm thấy chương."), 404

    execute(
        "INSERT INTO story_reads (story_id, user_id, chapter_number) VALUES (%s, %s, %s)",
        (story_id, user["id"] if user else None, chapter_number),
    )
    return jsonify(message="Đã ghi nhận lượt đọc."), 201


@story_api.post("/stories/<int:story_id>/purchase")
@login_required
def purchase_story(story_id):
    if not payment_setup_complete():
        return jsonify(message=(
            "Chưa cấu hình tài khoản nhận QR. Hãy thiết lập PAYMENT_BANK_CODE, "
            "PAYMENT_ACCOUNT_NUMBER và PAYMENT_ACCOUNT_NAME trong file .env."
        )), 503

    with connect() as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("SELECT * FROM stories WHERE id = %s FOR UPDATE", (story_id,))
            story = cursor.fetchone()
            if not story:
                return jsonify(message="Không tìm thấy truyện."), 404
            try:
                price = Decimal(str(story.get("price") or 0))
            except InvalidOperation:
                return jsonify(message="Giá truyện không hợp lệ."), 400
            if not price.is_finite() or price <= 0 or price != price.to_integral_value():
                return jsonify(message="Truyện này không bán."), 400
            cursor.execute("SELECT id FROM purchases WHERE user_id = %s AND story_id = %s LIMIT 1", (g.user["id"], story_id))
            if cursor.fetchone():
                return jsonify(message="Bạn đã mua truyện này rồi."), 409

            cursor.execute(
                """SELECT * FROM payment_orders
                   WHERE user_id = %s AND story_id = %s AND status = 'pending'
                   ORDER BY created_at DESC LIMIT 1 FOR UPDATE""",
                (g.user["id"], story_id),
            )
            existing_order = cursor.fetchone()
            if existing_order:
                return jsonify(
                    message="Đơn thanh toán đang chờ xử lý.",
                    paymentOrder=payment_order_response(existing_order),
                )

            payment_code = f"ST{secrets.token_hex(5).upper()}"
            cursor.execute(
                """INSERT INTO payment_orders (user_id, story_id, amount, payment_code)
                   VALUES (%s, %s, %s, %s) RETURNING *""",
                (g.user["id"], story_id, price, payment_code),
            )
            order = cursor.fetchone()
    return jsonify(
        message="Quét mã QR để thanh toán. Truyện sẽ được mở khóa sau khi xác nhận.",
        paymentOrder=payment_order_response(order),
    ), 201


@story_api.get("/payment-orders/<int:order_id>")
@login_required
def get_payment_order(order_id):
    order = fetch_one(
        "SELECT * FROM payment_orders WHERE id = %s AND user_id = %s",
        (order_id, g.user["id"]),
    )
    if not order:
        return jsonify(message="Không tìm thấy đơn thanh toán."), 404
    return jsonify(paymentOrder=payment_order_response(order))


@story_api.post("/payment-orders/<int:order_id>/demo-confirm")
@login_required
def confirm_demo_payment_order(order_id):
    demo_mode = os.getenv("PAYMENT_DEMO_MODE", "").strip().lower() in {"1", "true", "yes"}
    if not demo_mode or request.remote_addr not in {"127.0.0.1", "::1"}:
        return jsonify(message="Demo thanh toán chỉ được bật trên máy local."), 404

    with connect() as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                "SELECT * FROM payment_orders WHERE id = %s AND user_id = %s FOR UPDATE",
                (order_id, g.user["id"]),
            )
            order = cursor.fetchone()
            if not order:
                return jsonify(message="Không tìm thấy đơn thanh toán."), 404
            if order["status"] != "pending":
                return jsonify(message="Đơn thanh toán này đã được xử lý."), 409
            updated_order = complete_payment(
                cursor,
                order,
                "demo_simulation",
                content="DEMO_SIMULATED",
            )
    return jsonify(
        message="Đã mô phỏng thanh toán thành công. Đây không phải giao dịch ngân hàng thật.",
        paymentOrder=payment_order_response(updated_order),
    )


@story_api.get("/admin/payment-orders")
@roles_required("admin")
def admin_payment_orders():
    orders = fetch_all(
        """SELECT po.*, u.username, u.email, s.title AS story_title
           FROM payment_orders po
           JOIN users u ON u.id = po.user_id
           JOIN stories s ON s.id = po.story_id
           WHERE po.status = 'pending'
           ORDER BY po.created_at ASC, po.id ASC"""
    )
    return jsonify(paymentOrders=[{
        **payment_order_response(order),
        "username": order["username"],
        "email": order["email"],
        "storyTitle": order["story_title"],
    } for order in orders])


@story_api.post("/admin/payment-orders/<int:order_id>/confirm")
@roles_required("admin")
def confirm_payment_order(order_id):
    with connect() as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("SELECT * FROM payment_orders WHERE id = %s FOR UPDATE", (order_id,))
            order = cursor.fetchone()
            if not order:
                return jsonify(message="Không tìm thấy đơn thanh toán."), 404
            if order["status"] != "pending":
                return jsonify(message="Đơn thanh toán này đã được xử lý."), 409
            updated_order = complete_payment(cursor, order, "admin_manual", admin_id=g.user["id"])
    return jsonify(
        message="Đã xác nhận giao dịch thủ công.",
        paymentOrder=payment_order_response(updated_order),
    )


@story_api.post("/payments/sepay/webhook")
def sepay_webhook():
    expected_key = os.getenv("SEPAY_WEBHOOK_API_KEY", "")
    authorization = request.headers.get("Authorization", "")
    supplied_key = re.fullmatch(r"Apikey\s+(.+)", authorization, re.IGNORECASE)
    if not expected_key or not supplied_key or not hmac.compare_digest(supplied_key.group(1), expected_key):
        return jsonify(success=False, message="Webhook authorization failed."), 401

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(success=False, message="Invalid webhook payload."), 400

    try:
        transaction_id = int(data["id"])
        transfer_amount = Decimal(str(data["transferAmount"]))
    except (KeyError, TypeError, ValueError, InvalidOperation):
        return jsonify(success=False, message="Missing transaction id or transfer amount."), 400
    if transaction_id <= 0 or not transfer_amount.is_finite():
        return jsonify(success=False, message="Invalid transfer amount."), 400
    if data.get("transferType") != "in" or transfer_amount <= 0:
        return jsonify(success=True, message="Transaction ignored.")

    account_number = payment_configuration()["account_number"]
    if account_number and str(data.get("accountNumber") or "").strip() != account_number:
        return jsonify(success=True, message="Transaction account does not match.")

    transfer_text = " ".join(str(data.get(field) or "") for field in ("content", "description", "code"))
    code_match = re.search(r"(?<![A-Z0-9])ST[A-F0-9]{10}(?![A-Z0-9])", transfer_text.upper())
    if not code_match:
        return jsonify(success=True, message="No matching payment code.")

    with connect() as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                "SELECT * FROM payment_orders WHERE payment_code = %s FOR UPDATE",
                (code_match.group(0),),
            )
            order = cursor.fetchone()
            if not order or order["status"] != "pending":
                return jsonify(success=True, message="Payment order already processed or not found.")
            if transfer_amount != Decimal(str(order["amount"])):
                return jsonify(success=True, message="Transfer amount does not exactly match the order.")

            transaction_date = None
            if data.get("transactionDate"):
                try:
                    transaction_date = datetime.fromisoformat(
                        str(data["transactionDate"]).replace("Z", "+00:00")
                    )
                except ValueError:
                    transaction_date = None

            try:
                updated_order = complete_payment(
                    cursor,
                    order,
                    "sepay_webhook",
                    transaction_id=transaction_id,
                    gateway=str(data.get("gateway") or "") or None,
                    account_number=str(data.get("accountNumber") or "") or None,
                    transfer_amount=transfer_amount,
                    transaction_date=transaction_date,
                    reference_code=str(data.get("referenceCode") or "") or None,
                    content=transfer_text,
                )
            except UniqueViolation:
                connection.rollback()
                return jsonify(success=True, message="SePay transaction already processed.")

    return jsonify(success=True, message="Payment confirmed." if updated_order else "Payment already processed.")


@story_api.post("/stories/<int:story_id>/chapters")
@story_author_required
def create_chapter(story_id):
    data = body()
    title, content = data.get("tieuDe"), data.get("noiDung")
    if not title or not content:
        return jsonify(message="Thiếu tiêu đề hoặc nội dung chương."), 400
    with connect() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT COALESCE(MAX(chapter_number), 0) + 1 FROM chapters WHERE story_id = %s", (story_id,))
            chapter_number = cursor.fetchone()[0]
            cursor.execute(
                """INSERT INTO chapters (story_id, title, content, chapter_number)
                   VALUES (%s, %s, %s, %s) RETURNING title, content""",
                (story_id, str(title).strip(), str(content).strip(), chapter_number),
            )
            chapter = cursor.fetchone()
            cursor.execute("UPDATE stories SET updated_at = CURRENT_TIMESTAMP WHERE id = %s", (story_id,))
    return jsonify(tieuDe=chapter[0], noiDung=chapter[1]), 201


@story_api.put("/stories/<int:story_id>/chapters/<int:chapter_index>")
@story_author_required
def update_chapter(story_id, chapter_index):
    data = body()
    title, content = data.get("tieuDe"), data.get("noiDung")
    if not title or not content:
        return jsonify(message="Thiếu tiêu đề hoặc nội dung chương."), 400
    chapter = execute(
        """UPDATE chapters SET title = %s, content = %s
           WHERE story_id = %s AND chapter_number = %s RETURNING title, content""",
        (str(title).strip(), str(content).strip(), story_id, chapter_index + 1),
    )
    if not chapter:
        return jsonify(message="Không tìm thấy chương."), 404
    execute("UPDATE stories SET updated_at = CURRENT_TIMESTAMP WHERE id = %s", (story_id,))
    return jsonify(tieuDe=chapter["title"], noiDung=chapter["content"])


@story_api.delete("/stories/<int:story_id>/chapters/<int:chapter_index>")
@story_author_required
def delete_chapter(story_id, chapter_index):
    chapter = execute(
        "DELETE FROM chapters WHERE story_id = %s AND chapter_number = %s RETURNING id",
        (story_id, chapter_index + 1),
    )
    if not chapter:
        return jsonify(message="Không tìm thấy chương."), 404
    execute("UPDATE stories SET updated_at = CURRENT_TIMESTAMP WHERE id = %s", (story_id,))
    return jsonify(message="Đã xóa chương.")