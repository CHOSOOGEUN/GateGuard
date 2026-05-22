#!/bin/bash

# 🛡️ GateGuard Backend Test Automation Script
# 작성자: 조수근 (백엔드 팀장)

set -e

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[m'

echo -e "${BLUE}🚀 GateGuard 백엔드 테스트 자동화 시작...${NC}"

# 1. 의존성 체크
echo -e "\n${BLUE}📦 [1/3] 의존성 설치 확인${NC}"
cd backend
pip install -q -r requirements.txt
pip install -q pytest pytest-asyncio httpx pytest-cov

# 2. Lint 체크 (선택 사항이나 권장)
echo -e "\n${BLUE}🧹 [2/3] 코드 스타일 체크 (Lint)${NC}"
if command -v flake8 &> /dev/null; then
    flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
    echo -e "${GREEN}✅ Lint 체크 통과!${NC}"
else
    echo -e "⚠️ flake8이 설치되어 있지 않아 Lint 체크를 건너뜁니다."
fi

# 3. 테스트 실행 및 커버리지 리포트
echo -e "\n${BLUE}🧪 [3/3] Pytest 실행 및 커버리지 분석${NC}"
export DATABASE_URL="postgresql+asyncpg://gateguard:gateguard@localhost:5432/gateguard_test"
export REDIS_URL="redis://localhost:6379/0"
export SECRET_KEY="test-secret-key"
export ALGORITHM="HS256"

# 테스트 실행 (커버리지 포함)
pytest --cov=app tests/ -v --cov-report=term-missing

echo -e "\n${GREEN}🎉 모든 테스트가 성공적으로 완료되었습니다!${NC}"
