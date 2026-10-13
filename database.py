import os
from contextlib import contextmanager
from pathlib import Path

import psycopg2
from dotenv import load_dotenv
from psycopg2.extras import RealDictCursor


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


@contextmanager
def connect():
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        connection = psycopg2.connect(database_url)
    else:
        connection = psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", "5432")),
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
        )
    try:
        with connection:
            yield connection
    finally:
        connection.close()


def fetch_one(sql, params=()):
    with connect() as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(sql, params)
            return cursor.fetchone()


def fetch_all(sql, params=()):
    with connect() as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(sql, params)
            return cursor.fetchall()


def execute(sql, params=()):
    with connect() as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(sql, params)
            return cursor.fetchone() if cursor.description else None


def initialize_schema():
    with connect() as connection:
        with connection.cursor() as cursor:
            cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255)")
            cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE")
            cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()")
            cursor.execute("UPDATE users SET created_at = COALESCE(created_at, NOW()) WHERE created_at IS NULL")
            cursor.execute(
                """CREATE TABLE IF NOT EXISTS story_reads (
                       id BIGSERIAL PRIMARY KEY,
                       story_id BIGINT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
                       user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
                       chapter_number INTEGER NOT NULL,
                       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                   )"""
            )
            cursor.execute(
                """CREATE TABLE IF NOT EXISTS story_reviews (
                       id BIGSERIAL PRIMARY KEY,
                       story_id BIGINT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
                       user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                       rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
                       comment TEXT NOT NULL CHECK (length(trim(comment)) BETWEEN 1 AND 2000),
                       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                       updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                   )"""
            )
            cursor.execute(
                """CREATE TABLE IF NOT EXISTS favorites (
                       user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                       story_id BIGINT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
                       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                       PRIMARY KEY (user_id, story_id)
                   )"""
            )
            cursor.execute(
                """ALTER TABLE story_reviews
                   DROP CONSTRAINT IF EXISTS story_reviews_story_id_user_id_key"""
            )
            cursor.execute(
                """CREATE TABLE IF NOT EXISTS payment_orders (
                       id BIGSERIAL PRIMARY KEY,
                       user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                       story_id BIGINT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
                       amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
                       payment_code VARCHAR(40) NOT NULL UNIQUE,
                       status VARCHAR(20) NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'paid')),
                       confirmation_method VARCHAR(20) NOT NULL DEFAULT 'pending'
                           CONSTRAINT payment_orders_confirmation_method_check
                           CHECK (confirmation_method IN ('pending', 'sepay_webhook', 'admin_manual', 'demo_simulation')),
                       sepay_transaction_id BIGINT UNIQUE,
                       sepay_gateway VARCHAR(100),
                       sepay_account_number VARCHAR(100),
                       sepay_transfer_amount NUMERIC(12, 2),
                       sepay_transaction_date TIMESTAMPTZ,
                       sepay_reference_code VARCHAR(255),
                       transfer_content TEXT,
                       confirmed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
                       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                       paid_at TIMESTAMPTZ
                   )"""
            )
            cursor.execute(
                """ALTER TABLE payment_orders
                   DROP CONSTRAINT IF EXISTS payment_orders_confirmation_method_check"""
            )
            cursor.execute(
                """ALTER TABLE payment_orders
                   ADD CONSTRAINT payment_orders_confirmation_method_check
                   CHECK (confirmation_method IN ('pending', 'sepay_webhook', 'admin_manual', 'demo_simulation'))"""
            )
            cursor.execute("ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS sepay_gateway VARCHAR(100)")
            cursor.execute("ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS sepay_account_number VARCHAR(100)")
            cursor.execute("ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS sepay_transfer_amount NUMERIC(12, 2)")
            cursor.execute("ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS sepay_transaction_date TIMESTAMPTZ")