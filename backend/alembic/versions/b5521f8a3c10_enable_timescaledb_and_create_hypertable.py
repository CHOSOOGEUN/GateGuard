"""
Enable TimescaleDB and create hypertable for events
Revision ID: b5521f8a3c10
Revises: a4437e459dcf
Create Date: 2026-03-28 17:00:00.000000
"""

from typing import Sequence, Union

from alembic import op

revision: str = "b5521f8a3c10"
down_revision: Union[str, None] = "a4437e459dcf"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;")
    op.execute("ALTER TABLE notifications DROP CONSTRAINT notifications_event_id_fkey;")
    op.execute("ALTER TABLE events DROP CONSTRAINT events_pkey;")
    op.execute("ALTER TABLE events ADD PRIMARY KEY (id, timestamp);")
    op.execute(
        "SELECT create_hypertable('events', 'timestamp', "
        "chunk_time_interval => INTERVAL '7 days', "
        "migrate_data => true, "
        "if_not_exists => true);"
    )

    op.execute("CREATE INDEX IF NOT EXISTS ix_notifications_event_id ON notifications (event_id);")


def downgrade() -> None:
    op.execute("ALTER TABLE events DROP CONSTRAINT events_pkey;")
    op.execute("ALTER TABLE events ADD PRIMARY KEY (id);")
    op.execute("DROP EXTENSION IF EXISTS timescaledb CASCADE;")
