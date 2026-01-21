#!/usr/bin/env python3
"""
Database Backup Script for Productify Pro

This script handles:
1. PostgreSQL database backups (production)
2. SQLite database backups (development)
3. Optional upload to cloud storage (S3/GCS)
4. Backup rotation (keeps last N backups)

Usage:
    python scripts/backup.py                    # Create backup
    python scripts/backup.py --list             # List existing backups
    python scripts/backup.py --restore FILE     # Restore from backup
    python scripts/backup.py --cleanup          # Remove old backups

Environment variables:
    DATABASE_URL or SUPABASE_DB_URL - PostgreSQL connection string
    USE_SQLITE - Set to "true" for SQLite backups
    BACKUP_S3_BUCKET - S3 bucket for cloud backups (optional)
    AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY - AWS credentials (optional)
"""

import os
import sys
import subprocess
import gzip
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List
import argparse

# Configuration
BACKUP_DIR = Path(os.getenv("BACKUP_DIR", "./backups"))
BACKUP_RETENTION_DAYS = int(os.getenv("BACKUP_RETENTION_DAYS", "30"))
MAX_BACKUPS = int(os.getenv("MAX_BACKUPS", "10"))


def get_database_config() -> dict:
    """Get database configuration from environment."""
    use_sqlite = os.getenv("USE_SQLITE", "false").lower() == "true"

    if use_sqlite:
        db_path = os.getenv("DATABASE_PATH", "./data/productify.db")
        return {
            "type": "sqlite",
            "path": db_path,
        }

    # PostgreSQL configuration
    db_url = os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL")
    if not db_url:
        raise ValueError("No database URL configured. Set SUPABASE_DB_URL or DATABASE_URL")

    # Parse connection string
    # Format: postgresql://user:password@host:port/database
    if db_url.startswith("postgresql://"):
        db_url = db_url[13:]  # Remove prefix
    elif db_url.startswith("postgresql+asyncpg://"):
        db_url = db_url[21:]  # Remove async prefix

    # Split user:pass@host:port/database
    auth, rest = db_url.split("@")
    user, password = auth.split(":")
    host_port, database = rest.split("/")

    if ":" in host_port:
        host, port = host_port.split(":")
    else:
        host = host_port
        port = "5432"

    return {
        "type": "postgresql",
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "database": database,
    }


def create_backup_dir():
    """Ensure backup directory exists."""
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)


def generate_backup_filename(db_type: str) -> str:
    """Generate a timestamped backup filename."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    ext = "db" if db_type == "sqlite" else "sql"
    return f"backup_{timestamp}.{ext}.gz"


def backup_sqlite(db_path: str) -> Optional[Path]:
    """Create a backup of SQLite database."""
    if not Path(db_path).exists():
        print(f"❌ SQLite database not found: {db_path}")
        return None

    filename = generate_backup_filename("sqlite")
    backup_path = BACKUP_DIR / filename

    print(f"📦 Backing up SQLite database: {db_path}")

    # Copy and compress
    with open(db_path, "rb") as f_in:
        with gzip.open(backup_path, "wb") as f_out:
            shutil.copyfileobj(f_in, f_out)

    size_mb = backup_path.stat().st_size / (1024 * 1024)
    print(f"✅ Backup created: {backup_path} ({size_mb:.2f} MB)")
    return backup_path


def backup_postgresql(config: dict) -> Optional[Path]:
    """Create a backup of PostgreSQL database using pg_dump."""
    filename = generate_backup_filename("postgresql")
    backup_path = BACKUP_DIR / filename
    temp_path = BACKUP_DIR / filename.replace(".gz", "")

    print(f"📦 Backing up PostgreSQL database: {config['database']}@{config['host']}")

    # Set password for pg_dump
    env = os.environ.copy()
    env["PGPASSWORD"] = config["password"]

    try:
        # Run pg_dump
        result = subprocess.run(
            [
                "pg_dump",
                "-h", config["host"],
                "-p", config["port"],
                "-U", config["user"],
                "-d", config["database"],
                "-f", str(temp_path),
                "--no-owner",
                "--no-acl",
            ],
            env=env,
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            print(f"❌ pg_dump failed: {result.stderr}")
            return None

        # Compress
        with open(temp_path, "rb") as f_in:
            with gzip.open(backup_path, "wb") as f_out:
                shutil.copyfileobj(f_in, f_out)

        # Remove uncompressed file
        temp_path.unlink()

        size_mb = backup_path.stat().st_size / (1024 * 1024)
        print(f"✅ Backup created: {backup_path} ({size_mb:.2f} MB)")
        return backup_path

    except FileNotFoundError:
        print("❌ pg_dump not found. Please install PostgreSQL client tools.")
        return None


def upload_to_s3(backup_path: Path) -> bool:
    """Upload backup to S3 bucket."""
    bucket = os.getenv("BACKUP_S3_BUCKET")
    if not bucket:
        print("ℹ️  No S3 bucket configured, skipping cloud upload")
        return False

    try:
        import boto3
        from botocore.exceptions import NoCredentialsError, ClientError

        s3 = boto3.client("s3")
        key = f"backups/{backup_path.name}"

        print(f"☁️  Uploading to S3: s3://{bucket}/{key}")
        s3.upload_file(str(backup_path), bucket, key)
        print(f"✅ Uploaded to S3 successfully")
        return True

    except ImportError:
        print("⚠️  boto3 not installed, skipping S3 upload")
        return False
    except (NoCredentialsError, ClientError) as e:
        print(f"❌ S3 upload failed: {e}")
        return False


def list_backups() -> List[Path]:
    """List all existing backups."""
    if not BACKUP_DIR.exists():
        return []

    backups = sorted(BACKUP_DIR.glob("backup_*.gz"), reverse=True)
    return backups


def cleanup_old_backups():
    """Remove backups older than retention period or exceeding max count."""
    backups = list_backups()

    if not backups:
        print("ℹ️  No backups found")
        return

    cutoff_date = datetime.now() - timedelta(days=BACKUP_RETENTION_DAYS)
    removed = 0

    for i, backup in enumerate(backups):
        # Keep minimum backups regardless of age
        if i >= MAX_BACKUPS:
            backup.unlink()
            removed += 1
            continue

        # Check age
        backup_time = datetime.fromtimestamp(backup.stat().st_mtime)
        if backup_time < cutoff_date:
            backup.unlink()
            removed += 1

    if removed:
        print(f"🗑️  Removed {removed} old backup(s)")
    else:
        print(f"ℹ️  No old backups to remove (keeping {len(backups)} backups)")


def restore_backup(backup_file: str) -> bool:
    """Restore database from backup."""
    backup_path = Path(backup_file)

    if not backup_path.exists():
        # Try looking in backup directory
        backup_path = BACKUP_DIR / backup_file
        if not backup_path.exists():
            print(f"❌ Backup file not found: {backup_file}")
            return False

    config = get_database_config()

    print(f"⚠️  WARNING: This will overwrite the current database!")
    confirm = input("Type 'yes' to confirm: ")
    if confirm.lower() != "yes":
        print("Restore cancelled")
        return False

    if config["type"] == "sqlite":
        return restore_sqlite(backup_path, config["path"])
    else:
        return restore_postgresql(backup_path, config)


def restore_sqlite(backup_path: Path, db_path: str) -> bool:
    """Restore SQLite database from backup."""
    print(f"📦 Restoring SQLite database from: {backup_path}")

    # Decompress and restore
    with gzip.open(backup_path, "rb") as f_in:
        with open(db_path, "wb") as f_out:
            shutil.copyfileobj(f_in, f_out)

    print(f"✅ Database restored successfully")
    return True


def restore_postgresql(backup_path: Path, config: dict) -> bool:
    """Restore PostgreSQL database from backup."""
    print(f"📦 Restoring PostgreSQL database from: {backup_path}")

    # Decompress to temp file
    temp_path = backup_path.with_suffix("")
    with gzip.open(backup_path, "rb") as f_in:
        with open(temp_path, "wb") as f_out:
            shutil.copyfileobj(f_in, f_out)

    env = os.environ.copy()
    env["PGPASSWORD"] = config["password"]

    try:
        result = subprocess.run(
            [
                "psql",
                "-h", config["host"],
                "-p", config["port"],
                "-U", config["user"],
                "-d", config["database"],
                "-f", str(temp_path),
            ],
            env=env,
            capture_output=True,
            text=True,
        )

        temp_path.unlink()

        if result.returncode != 0:
            print(f"❌ Restore failed: {result.stderr}")
            return False

        print(f"✅ Database restored successfully")
        return True

    except FileNotFoundError:
        print("❌ psql not found. Please install PostgreSQL client tools.")
        temp_path.unlink()
        return False


def main():
    parser = argparse.ArgumentParser(description="Database backup utility")
    parser.add_argument("--list", action="store_true", help="List existing backups")
    parser.add_argument("--restore", metavar="FILE", help="Restore from backup file")
    parser.add_argument("--cleanup", action="store_true", help="Remove old backups")
    parser.add_argument("--no-upload", action="store_true", help="Skip cloud upload")

    args = parser.parse_args()

    create_backup_dir()

    if args.list:
        backups = list_backups()
        if not backups:
            print("No backups found")
        else:
            print(f"Found {len(backups)} backup(s):")
            for backup in backups:
                size_mb = backup.stat().st_size / (1024 * 1024)
                mtime = datetime.fromtimestamp(backup.stat().st_mtime)
                print(f"  {backup.name} ({size_mb:.2f} MB) - {mtime.strftime('%Y-%m-%d %H:%M:%S')}")
        return

    if args.restore:
        restore_backup(args.restore)
        return

    if args.cleanup:
        cleanup_old_backups()
        return

    # Default: Create backup
    try:
        config = get_database_config()
    except ValueError as e:
        print(f"❌ {e}")
        sys.exit(1)

    print(f"🔧 Database type: {config['type']}")

    if config["type"] == "sqlite":
        backup_path = backup_sqlite(config["path"])
    else:
        backup_path = backup_postgresql(config)

    if backup_path:
        # Upload to cloud if configured
        if not args.no_upload:
            upload_to_s3(backup_path)

        # Cleanup old backups
        cleanup_old_backups()

        print("\n✅ Backup completed successfully!")
    else:
        print("\n❌ Backup failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()
