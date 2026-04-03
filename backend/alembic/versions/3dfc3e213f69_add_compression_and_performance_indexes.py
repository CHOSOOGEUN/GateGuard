"""add_compression_and_performance_indexes

Revision ID: 3dfc3e213f69
Revises: 9f79ef3630c6
Create Date: 2026-03-31 10:59:41.856207

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3dfc3e213f69'
down_revision: Union[str, None] = '9f79ef3630c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. TimescaleDB 압축 활성화 (7일 이상 데이터 대상)
    # camera_id로 세그먼트를 나누어 저장 효율과 쿼리 성능을 동시에 잡습니다.
    op.execute("""
        ALTER TABLE events SET (
            timescaledb.compress,
            timescaledb.compress_segmentby = 'camera_id',
            timescaledb.compress_orderby = 'timestamp DESC'
        );
    """)
    op.execute("SELECT add_compression_policy('events', INTERVAL '7 days');")

    # 2. 고성능 쿼리용 복합 인덱스 추가
    # 대시보드에서 카메라별 최신 이벤트를 조회할 때 사용됩니다.
    op.create_index('ix_events_camera_time', 'events', ['camera_id', 'timestamp'], postgresql_using='btree')
    # 특정 타입(jump 등) 무임승차 조회를 최적화합니다.
    op.create_index('ix_events_type_time', 'events', ['event_type', 'timestamp'], postgresql_using='btree')


def downgrade() -> None:
    op.drop_index('ix_events_type_time', table_name='events')
    op.drop_index('ix_events_camera_time', table_name='events')
    op.execute("SELECT remove_compression_policy('events');")
    op.execute("ALTER TABLE events SET (timescaledb.compress = false);")
