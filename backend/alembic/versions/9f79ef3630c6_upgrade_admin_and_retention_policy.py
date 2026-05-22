"""upgrade_admin_and_retention_policy

Revision ID: 9f79ef3630c6
Revises: 93cde590b2fc
Create Date: 2026-03-31 10:53:40.939094

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9f79ef3630c6'
down_revision: Union[str, None] = '93cde590b2fc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # [GateGuard] 관리자 권한 및 소속 관리 필드 추가
    op.add_column('admins', sa.Column('role', sa.String(), nullable=False, server_default='viewer'))
    op.add_column('admins', sa.Column('station_name', sa.String(), nullable=True))
    op.add_column('admins', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'))
    
    # [GateGuard] 시계열 데이터 관리: 90일 이상된 이벤트 자동 아카이빙/삭제 정책 수립
    op.execute("SELECT add_retention_policy('events', INTERVAL '90 days', if_not_exists => true);")


def downgrade() -> None:
    # [GateGuard] 보관 정책 해제
    op.execute("SELECT remove_retention_policy('events', if_exists => true);")
    
    op.drop_column('admins', 'is_active')
    op.drop_column('admins', 'station_name')
    op.drop_column('admins', 'role')
