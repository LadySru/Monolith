#!/usr/bin/env python3
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

def migrate_database():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("[MIGRATION] Starting database migration...")
        cur.execute('CREATE INDEX IF NOT EXISTS idx_member_stats_guild ON member_stats(guild_id)')
        cur.execute('CREATE INDEX IF NOT EXISTS idx_voice_sessions_user ON voice_sessions(user_id)')
        cur.execute('CREATE INDEX IF NOT EXISTS idx_voice_sessions_guild ON voice_sessions(guild_id)')
        conn.commit()
        print("[MIGRATION] ✓ Migration completed successfully!")
    except Exception as e:
        conn.rollback()
        print(f"[MIGRATION] ✗ Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate_database()
