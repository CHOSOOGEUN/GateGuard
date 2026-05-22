"""add reason column to events and normalize status (dismissed → false_alarm)

Revision ID: c1a2b3d4e5f6
Revises: 3dfc3e213f69
Create Date: 2026-05-11 16:00:00.000000

- events.reason String NULL 컬럼 추가
- 기존 status='dismissed' 행을 'false_alarm' 으로 백필 (frontend 와 정렬)
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'c1a2b3d4e5f6'
down_revision: Union[str, None] = '3dfc3e213f69'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('events', sa.Column('reason', sa.String(), nullable=True))
    # frontend 가 'false_alarm' 을 기대 → 기존 'dismissed' 행 백필
    op.execute("UPDATE events SET status='false_alarm' WHERE status='dismissed'")


def downgrade() -> None:
    op.execute("UPDATE events SET status='dismissed' WHERE status='false_alarm'")
    op.drop_column('events', 'reason')
