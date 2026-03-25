# SNAP 프로젝트 - 서버 배포 및 운영 가이드

> 최태양님용 서버 구성 및 배포 가이드

---

## 목차
1. [인프라 개요](#인프라-개요)
2. [AWS EC2 설정](#aws-ec2-설정)
3. [Nginx 설정](#nginx-설정)
4. [애플리케이션 배포](#애플리케이션-배포)
5. [모니터링 및 로깅](#모니터링-및-로깅)
6. [보안 설정](#보안-설정)

---

## 인프라 개요

```
사용자
  ↓
Nginx (포트 80, 443)
  ↓
FastAPI (포트 8000)
  ├─ API 서버
  ├─ Celery Worker (비동기 작업)
  └─ Redis (캐시 & 메시지 큐)
  ↓
PostgreSQL (데이터베이스)
AWS S3 (이미지 저장소)
```

**서버 사양 (추천):**
- **EC2 인스턴스**: t3.medium 이상 (2vCPU, 4GB RAM)
- **스토리지**: 50GB EBS (gp3)
- **네트워크**: 퍼블릭 IP + 탄력적 IP 할당

---

## AWS EC2 설정

### 1. 인스턴스 생성

```bash
# AMI: Ubuntu 22.04 LTS
# 인스턴스 타입: t3.medium
# 키페어: 새로 생성 또는 기존 사용
# 보안 그룹: 아래 규칙 참조
```

### 2. 보안 그룹 규칙

| 포트 | 프로토콜 | 소스 | 설명 |
|------|--------|------|------|
| 80 | TCP | 0.0.0.0/0 | HTTP 트래픽 |
| 443 | TCP | 0.0.0.0/0 | HTTPS 트래픽 |
| 22 | TCP | YOUR_IP/32 | SSH (본인 IP만) |
| 3306 | TCP | 인스턴스 SG만 | (필요시) RDS 접근 |

### 3. 초기 세팅

```bash
# SSH 접속
ssh -i your-key.pem ubuntu@your-ec2-public-ip

# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 필수 패키지 설치
sudo apt install -y curl wget git python3-pip python3-venv nginx docker.io docker-compose

# 사용자 docker 권한 설정
sudo usermod -aG docker ubuntu
newgrp docker
```

### 4. 프로젝트 디렉토리 구조

```
/opt/snap/
├── backend/           # FastAPI 애플리케이션
├── .env               # 환경변수 (절대 git에 커밋 금지!)
├── docker-compose.yml # 컨테이너 오케스트레이션
└── logs/              # 로그 파일
```

---

## Nginx 설정

### 1. Nginx 설치 및 활성화

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 2. 리버스 프록시 설정

`/etc/nginx/sites-available/snap` 파일 생성:

```nginx
upstream fastapi_backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # HTTP → HTTPS 리다이렉트 (SSL 적용 후)
    # return 301 https://$server_name$request_uri;

    client_max_body_size 50M;  # 이미지 업로드 제한 (50MB)

    location / {
        proxy_pass http://fastapi_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 타임아웃 설정
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 정적 파일 (있는 경우)
    location /static/ {
        alias /opt/snap/static/;
        expires 30d;
    }

    # 헬스 체크
    location /health {
        access_log off;
        proxy_pass http://fastapi_backend;
    }
}
```

### 3. Nginx 활성화

```bash
sudo ln -s /etc/nginx/sites-available/snap /etc/nginx/sites-enabled/snap
sudo rm /etc/nginx/sites-enabled/default  # 기본 설정 제거
sudo nginx -t  # 문법 검사
sudo systemctl restart nginx
```

### 4. SSL/TLS 설정 (Let's Encrypt)

```bash
# Certbot 설치
sudo apt install -y certbot python3-certbot-nginx

# 인증서 발급
sudo certbot certonly --nginx -d your-domain.com -d www.your-domain.com

# Nginx 설정에 HTTPS 추가
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 자동 갱신 활성화
sudo systemctl enable certbot.timer
```

---

## 애플리케이션 배포

### 1. 환경변수 설정

`/opt/snap/.env` 파일 생성:

```env
# Database
DATABASE_URL=postgresql://snap_user:password@localhost:5432/snap_db

# Redis
REDIS_URL=redis://localhost:6379

# AWS
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=snap-bucket
AWS_REGION=ap-northeast-2

# JWT
SECRET_KEY=your-super-secret-key-change-this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Naver SENS (SMS)
NAVER_SENS_SERVICE_ID=your-service-id
NAVER_SENS_ACCESS_KEY=your-access-key
NAVER_SENS_SECRET_KEY=your-secret-key

# 환경
ENVIRONMENT=production
DEBUG=false
```

### 2. Docker Compose 실행

```bash
cd /opt/snap
docker-compose up -d

# 로그 확인
docker-compose logs -f backend
```

### 3. 데이터베이스 마이그레이션

```bash
# PostgreSQL 접속
docker-compose exec postgres psql -U snap_user -d snap_db

# 마이그레이션 실행 (Alembic 사용 시)
docker-compose exec backend alembic upgrade head
```

### 4. 수동 배포 (GitHub Actions 전 임시)

```bash
cd /opt/snap
git pull origin main
docker-compose down
docker-compose up -d --build
docker-compose exec backend python -c "from app.database import init_db; init_db()"
```

---

## 모니터링 및 로깅

### 1. 로그 위치

```
FastAPI: /opt/snap/logs/app.log
Nginx: /var/log/nginx/access.log, /var/log/nginx/error.log
Docker: docker logs snap-backend-1
```

### 2. 로그 확인

```bash
# 실시간 로그
docker-compose logs -f backend

# Nginx 에러 로그
sudo tail -f /var/log/nginx/error.log

# 시스템 상태
docker stats
docker-compose ps
```

### 3. 헬스 체크

```bash
# API 헬스 체크
curl -X GET http://localhost:8000/health

# Nginx를 통한 헬스 체크
curl -X GET http://your-domain.com/health
```

### 4. 자동 재시작 설정

```bash
# Docker 자동 재시작
docker-compose down
docker-compose up -d --restart unless-stopped

# Systemd 서비스 (선택사항)
# 별도로 작성 가능
```

---

## 보안 설정

### 1. SSH 보안 강화

```bash
# SSH 키 기반 인증만 허용
sudo sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

### 2. 방화벽 설정 (UFW)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 3. 환경변수 보안

```bash
# .env 파일 권한 제한
chmod 600 /opt/snap/.env

# 절대 git에 커밋 금지 (.gitignore 확인)
echo ".env" >> /opt/snap/.gitignore
```

### 4. 정기 백업

```bash
# PostgreSQL 백업 (매일 자정)
0 0 * * * docker-compose -f /opt/snap/docker-compose.yml exec -T postgres pg_dump -U snap_user snap_db > /opt/snap/backups/backup_$(date +\%Y\%m\%d).sql

# S3 동기화 (기존 백업)
aws s3 sync /opt/snap/backups s3://snap-backup-bucket/ --delete
```

### 5. DDoS 방어

```nginx
# Nginx 설정에 추가
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;

server {
    location /api/ {
        limit_req zone=api burst=50 nodelay;
        ...
    }

    location / {
        limit_req zone=general burst=20 nodelay;
        ...
    }
}
```

---

## 트러블슈팅

| 증상 | 원인 | 해결방법 |
|------|------|--------|
| 502 Bad Gateway | FastAPI 서버 다운 | `docker-compose logs backend` 확인 |
| 업로드 실패 (413) | 파일 크기 제한 | `client_max_body_size` 증가 |
| 느린 응답 | 리소스 부족 | `docker stats` 확인, 인스턴스 업그레이드 |
| DB 연결 안 됨 | 환경변수 오류 | `.env` 파일과 DATABASE_URL 확인 |
| SSL 인증서 만료 | Certbot 갱신 실패 | `certbot renew --dry-run` 테스트 |

---

## 배포 체크리스트

- [ ] EC2 인스턴스 생성 및 초기 세팅
- [ ] 보안 그룹 규칙 설정 (SSH, HTTP, HTTPS)
- [ ] Nginx 설치 및 리버스 프록시 설정
- [ ] SSL/TLS 인증서 발급 (Let's Encrypt)
- [ ] `.env` 파일 생성 및 환경변수 설정
- [ ] Docker & Docker Compose 설치
- [ ] PostgreSQL, Redis 컨테이너 실행
- [ ] FastAPI 백엔드 빌드 및 실행
- [ ] 데이터베이스 마이그레이션
- [ ] 헬스 체크 테스트 (`/health` 엔드포인트)
- [ ] 로그 확인 및 모니터링 설정
- [ ] 백업 및 자동 재시작 설정
- [ ] 보안 강화 (SSH, UFW, 환경변수 권한)
- [ ] GitHub Actions CI/CD 파이프라인 (다음 단계)

---

**작성자**: 조수근
**최종 수정**: 2026.03.25
**버전**: v1.0
