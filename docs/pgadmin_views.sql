-- Readable, read-only views for the application's eight public tables.
-- Run this file in pgAdmin Query Tool while connected to the application's database.
-- The original tables and their data are not changed.

CREATE OR REPLACE VIEW public.vw_users_readable AS
SELECT
    u.id AS user_id,
    u.username,
    u.full_name,
    u.email,
    u.role AS role_code,
    CASE u.role
        WHEN 'admin' THEN 'Quản trị viên'
        WHEN 'author' THEN 'Tác giả'
        ELSE 'Độc giả'
    END AS role_name,
    u.date_of_birth,
    u.created_at
FROM public.users AS u;

CREATE OR REPLACE VIEW public.vw_stories_readable AS
SELECT
    s.id AS story_id,
    s.title AS story_title,
    s.author AS pen_name,
    s.genre AS genre,
    s.status AS story_status,
    s.description,
    s.is_premium,
    s.price,
    s.revenue,
    s.owner_id,
    u.username AS owner_username,
    u.full_name AS owner_full_name,
    s.cover_image,
    s.updated_at
FROM public.stories AS s
LEFT JOIN public.users AS u ON u.id = s.owner_id;

CREATE OR REPLACE VIEW public.vw_chapters_readable AS
SELECT
    c.id AS chapter_id,
    c.story_id,
    s.title AS story_title,
    c.chapter_number,
    c.title AS chapter_title,
    c.content AS chapter_content
FROM public.chapters AS c
JOIN public.stories AS s ON s.id = c.story_id;

CREATE OR REPLACE VIEW public.vw_favorites_readable AS
SELECT
    f.user_id,
    u.username,
    u.full_name,
    f.story_id,
    s.title AS story_title,
    s.author AS story_author,
    f.created_at AS favorited_at
FROM public.favorites AS f
JOIN public.users AS u ON u.id = f.user_id
JOIN public.stories AS s ON s.id = f.story_id;

CREATE OR REPLACE VIEW public.vw_purchases_readable AS
SELECT
    p.user_id,
    u.username,
    u.full_name,
    p.story_id,
    s.title AS story_title,
    p.amount AS amount_paid,
    p.created_at AS purchased_at
FROM public.purchases AS p
JOIN public.users AS u ON u.id = p.user_id
JOIN public.stories AS s ON s.id = p.story_id;

CREATE OR REPLACE VIEW public.vw_story_reads_readable AS
SELECT
    r.id AS read_id,
    r.story_id,
    s.title AS story_title,
    r.chapter_number,
    r.user_id,
    u.username,
    u.full_name,
    r.created_at AS read_at
FROM public.story_reads AS r
JOIN public.stories AS s ON s.id = r.story_id
LEFT JOIN public.users AS u ON u.id = r.user_id;

CREATE OR REPLACE VIEW public.vw_story_reviews_readable AS
SELECT
    r.id AS review_id,
    r.story_id,
    s.title AS story_title,
    r.user_id,
    u.username,
    u.full_name,
    r.rating AS stars,
    r.comment AS review_comment,
    r.created_at AS reviewed_at,
    r.updated_at AS last_edited_at
FROM public.story_reviews AS r
JOIN public.stories AS s ON s.id = r.story_id
JOIN public.users AS u ON u.id = r.user_id;

CREATE OR REPLACE VIEW public.vw_payment_orders_readable AS
SELECT
    po.id AS payment_order_id,
    po.user_id,
    u.username,
    u.full_name,
    u.email,
    po.story_id,
    s.title AS story_title,
    po.amount AS amount_due,
    po.payment_code,
    po.status AS status_code,
    CASE po.status
        WHEN 'paid' THEN 'Đã thanh toán'
        ELSE 'Đang chờ thanh toán'
    END AS payment_status,
    po.confirmation_method AS confirmation_method_code,
    CASE po.confirmation_method
        WHEN 'sepay_webhook' THEN 'SePay tự xác nhận'
        WHEN 'admin_manual' THEN 'Quản trị viên xác nhận'
        WHEN 'demo_simulation' THEN 'Thanh toán mô phỏng'
        ELSE 'Chưa xác nhận'
    END AS confirmation_method,
    po.sepay_transaction_id,
    po.sepay_gateway,
    po.sepay_transfer_amount,
    po.sepay_transaction_date,
    po.sepay_reference_code,
    po.transfer_content,
    po.confirmed_by AS confirmed_by_user_id,
    admin.username AS confirmed_by_username,
    po.created_at AS ordered_at,
    po.paid_at
FROM public.payment_orders AS po
JOIN public.users AS u ON u.id = po.user_id
JOIN public.stories AS s ON s.id = po.story_id
LEFT JOIN public.users AS admin ON admin.id = po.confirmed_by;

COMMENT ON VIEW public.vw_users_readable IS 'Thông tin người dùng dễ đọc; không hiển thị mật khẩu.';
COMMENT ON VIEW public.vw_stories_readable IS 'Truyện kèm tên tài khoản chủ sở hữu.';
COMMENT ON VIEW public.vw_chapters_readable IS 'Chương kèm tên truyện.';
COMMENT ON VIEW public.vw_favorites_readable IS 'Danh sách yêu thích kèm tên người dùng và truyện.';
COMMENT ON VIEW public.vw_purchases_readable IS 'Lịch sử mua truyện kèm tên người mua và truyện.';
COMMENT ON VIEW public.vw_story_reads_readable IS 'Lượt đọc kèm tên người đọc, truyện và số chương.';
COMMENT ON VIEW public.vw_story_reviews_readable IS 'Đánh giá kèm tên người đánh giá và truyện.';
COMMENT ON VIEW public.vw_payment_orders_readable IS 'Đơn thanh toán kèm người mua, truyện và trạng thái dễ đọc.';
