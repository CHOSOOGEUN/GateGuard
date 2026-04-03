"""Create hourly_event_stats materialized view

Revision ID: 93cde590b2fc
Revises: f44abc650fea
Create Date: 2026-03-31 10:38:59.543675

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '93cde590b2fc'
down_revision: Union[str, None] = 'f44abc650fea'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # [GateGuard] Continuous Aggregate 생성은 트랜잭션 밖에서 실행되어야 함
    with op.get_context().autocommit_block():
        # [GateGuard] TimescaleDB Continuous Aggregate 생성
        # 실시간으로 데이터가 집계되며 대시보드 로딩 속도를 비약적으로 향상시킵니다.
        op.execute("""
            CREATE MATERIALIZED VIEW hourly_event_stats
            WITH (timescaledb.continuous) AS
            SELECT 
                c.station_name,
                e.event_type,
                time_bucket('1 hour', e.timestamp) as hour,
                count(*) as event_count
            FROM events e
            JOIN cameras c ON e.camera_id = c.id
            GROUP BY c.station_name, e.event_type, hour;
        """)
        
        # [GateGuard] 자동 갱신 정책 추가 (최근 24시간 데이터를 30분마다 갱신)
        op.execute("""
            SELECT add_continuous_aggregate_policy('hourly_event_stats',
                start_offset => INTERVAL '24 hours',
                end_offset => INTERVAL '1 hour',
                schedule_interval => INTERVAL '30 minutes');
        """)


def downgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("DROP MATERIALIZED VIEW IF EXISTS hourly_event_stats CASCADE;")
